const inquirer = require("inquirer");
const chalk = require("chalk");
require("dotenv").config();
const VideoCleanup = require("./utils/videoCleanup");
const { getMultiPlatformVideos } = require("./fetch/getMultiPlatformVideos");

async function runInteractiveBot() {
  console.log(chalk.blueBright("📱 TikTok Multi-Platform Content Bot"));
  console.log(chalk.gray("Supports: YouTube, TikTok, Instagram, Facebook, Twitter"));

  const { inputType } = await inquirer.prompt([
    {
      type: "list",
      name: "inputType",
      message: "How do you want to get videos?",
      choices: [
        "🔗 Provide direct URLs",
        "🔍 Search by keyword"
      ],
    },
  ]);

  let results = [];
  let hashtags = "";

  if (inputType === "🔗 Provide direct URLs") {
    const { urls } = await inquirer.prompt([
      {
        type: "input",
        name: "urls",
        message: "Enter video URLs (comma-separated for multiple):",
        validate: input => input.trim().length > 0 || "Please enter at least one URL"
      },
    ]);

    const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
    
    try {
      results = await getMultiPlatformVideos(urlList, { quality: 1080 });
      
      // Add video ID
      results = results.map(result => ({
        ...result,
        videoId: result.actualVideoId || result.id || result.videoId
      }));

      hashtags = "viral, fyp, trending, content";
      
    } catch (err) {
      console.error(chalk.red(`❌ Failed to download videos: ${err.message}`));
      return;
    }

  } else if (inputType === "🔍 Search by keyword") {
    const { searchQuery } = await inquirer.prompt([
      {
        type: "input",
        name: "searchQuery",
        message: "Enter search keywords:",
        validate: input => input.trim().length > 0 || "Please enter search keywords"
      },
    ]);

    try {
      results = await getMultiPlatformVideos(searchQuery, {
        platform: "YouTube",
        limit: 1,
        quality: 1080
      });

      // Add video ID
      results = results.map(result => ({
        ...result,
        videoId: result.actualVideoId || result.id || result.videoId
      }));

      hashtags = "viral, fyp, trending, content";
      
    } catch (err) {
      console.error(chalk.red(`❌ Failed to search and download: ${err.message}`));
      return;
    }
  }

  if (!results || results.length === 0) {
    console.error(chalk.red("❌ No videos found to process"));
    return;
  }

  // Initialize cleanup utility
  const videoCleanup = new VideoCleanup();
  
  // Process the first video
  const video = results[0];
  const videoId = video.videoId || video.actualVideoId || video.id;
  console.log(chalk.cyan(`🎬 Processing: ${video.title}`));
  console.log(chalk.gray(`📱 Platform: ${video.platform}`));
  console.log(chalk.gray(`📁 File: ${video.localPath}`));
  console.log(chalk.gray(`🆔 Video ID: ${videoId}`));

  // PROTECT THE DOWNLOADED FILE FROM CLEANUP
  if (video.localPath) {
    videoCleanup.protectFile(video.localPath, 60); // Protect for 60 minutes
  }

  // Perform initial cleanup AFTER protecting the file
  console.log(chalk.cyan("🧹 Performing initial cleanup..."));
  await videoCleanup.performFullCleanup();

  // Import processing modules
  const generateCaption = require("./utils/generateCaption");
  const editVideo = require("./edit/videoEditor");
  const processVideoAudio = require("./edit/addMusic");
  const uploadToTikTok = require("./upload/tiktokUploader");

  let uploadSuccess = false;

  try {
    const rawPath = video.localPath;
    
    // Verify the raw file exists
    const fs = require('fs');
    if (!fs.existsSync(rawPath)) {
      console.error(chalk.red(`❌ Input video file does not exist: ${rawPath}`));
      
      // Try to find the file with different patterns
      console.log(chalk.yellow('🔍 Searching for video file with different patterns...'));
      const path = require('path');
      const videoDir = path.dirname(rawPath);
      
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir).filter(file => 
          !file.endsWith('.part') && // Skip partial downloads
          (file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv'))
        );
        console.log(chalk.gray(`📁 Files in directory: ${files.join(', ')}`));
        
        // Look for files containing the video ID
        const matchingFiles = files.filter(file => {
          const lowerFile = file.toLowerCase();
          const lowerVideoId = videoId.toLowerCase();
          return lowerFile.includes(lowerVideoId);
        });
        
        if (matchingFiles.length > 0) {
          const foundFile = path.join(videoDir, matchingFiles[0]);
          console.log(chalk.green(`✅ Found matching file: ${foundFile}`));
          video.localPath = foundFile; // Update the path
          
          // Protect the found file too
          videoCleanup.protectFile(foundFile, 60);
        } else {
          throw new Error(`❌ No video file found for ID: ${videoId}`);
        }
      } else {
        throw new Error(`❌ Video directory does not exist: ${videoDir}`);
      }
    }
    
    const editedPath = `./videos/edited/${videoId}-edited.mp4`;
    const finalPath = `./videos/edited/${videoId}-final.mp4`;

    console.log(chalk.yellow("🎬 Editing video..."));
    await editVideo(video.localPath, editedPath);

    console.log(chalk.yellow("🎵 Processing video audio..."));
    await processVideoAudio(editedPath, finalPath);

    console.log(chalk.yellow("📝 Generating caption..."));
    const caption = await generateCaption(hashtags);

    console.log(chalk.yellow("📤 Uploading to TikTok..."));
    await uploadToTikTok(finalPath, caption);

    uploadSuccess = true;
    console.log(chalk.green("🚀 Video posted successfully!"));
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.gray(`   Title: ${video.title}`));
    console.log(chalk.gray(`   Platform: ${video.platform}`));
    console.log(chalk.gray(`   Caption: ${caption}`));

  } catch (err) {
    uploadSuccess = false;
    console.error(chalk.red(`❌ Error processing video: ${err.message}`));
  } finally {
    // Always perform cleanup after processing
    console.log(chalk.cyan("🧹 Performing post-processing cleanup..."));
    await videoCleanup.cleanupAfterUpload(videoId, uploadSuccess);
    
    // Show final storage stats
    const finalStats = await videoCleanup.getStorageStats();
    if (finalStats) {
      console.log(chalk.cyan(`📊 Storage Usage:`));
      console.log(chalk.gray(`   Raw videos: ${finalStats.raw.count} files (${finalStats.raw.sizeMB}MB)`));
      console.log(chalk.gray(`   Edited videos: ${finalStats.edited.count} files (${finalStats.edited.sizeMB}MB)`));
      console.log(chalk.gray(`   Total: ${finalStats.total.count} files (${finalStats.total.sizeMB}MB)`));
    }
  }
}

module.exports = runInteractiveBot;