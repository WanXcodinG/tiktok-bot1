// bot.js
const inquirer = require("inquirer");
const chalk = require("chalk");
require("dotenv").config();
const cron = require("node-cron");
const cleanup = require("./utils/cleanupOldVideos");
const VideoCleanup = require("./utils/videoCleanup");
const { getMultiPlatformVideos, getVideosByCategory } = require("./fetch/getMultiPlatformVideos");

cron.schedule("0 3 * * *", cleanup); // 🕒 runs daily at 3:00 AM

async function main() {
  console.log(chalk.blueBright("📱 TikTok Multi-Platform Content Bot"));
  console.log(chalk.gray("Supports: YouTube, TikTok, Instagram, Facebook, Twitter"));
  console.log(chalk.magenta("🎲 Now with Random Search & Smart Audio Detection!"));
  console.log(chalk.green("🧹 Auto-cleanup & Duplicate Management Enabled!"));

  const { inputType } = await inquirer.prompt([
    {
      type: "list",
      name: "inputType",
      message: "How do you want to get videos?",
      choices: [
        "📂 Choose from categories (Random Search)",
        "🔗 Provide direct URLs",
        "🔍 Search by keyword"
      ],
    },
  ]);

  let results = [];
  let category = "";
  let hashtags = "";

  if (inputType === "📂 Choose from categories (Random Search)") {
    const { selectedCategory } = await inquirer.prompt([
      {
        type: "list",
        name: "selectedCategory",
        message: "What type of content do you want to post?",
        choices: [
          "Anime Edited Videos",
          "Tech Shorts", 
          "Horror Clips",
          "Made-Up TikTok Movies",
          "TikTok Viral",
          "Instagram Reels"
        ],
      },
    ]);

    category = selectedCategory;
    console.log(chalk.green(`> You selected: ${category}`));
    console.log(chalk.cyan(`🎲 Using random search with AI-powered audio detection!`));

    try {
      results = await getVideosByCategory(category, 1);
      hashtags = results[0]?.hashtags || "viral, fyp, trending";
    } catch (err) {
      console.error(chalk.red(`❌ Failed to get ${category} videos: ${err.message}`));
      return;
    }

  } else if (inputType === "🔗 Provide direct URLs") {
    const { urls } = await inquirer.prompt([
      {
        type: "input",
        name: "urls",
        message: "Enter video URLs (comma-separated for multiple):",
        validate: input => input.trim().length > 0 || "Please enter at least one URL"
      },
    ]);

    const { videoCategory } = await inquirer.prompt([
      {
        type: "list",
        name: "videoCategory",
        message: "What category best describes these videos?",
        choices: [
          "Anime Edited Videos",
          "Tech Shorts",
          "Horror Clips", 
          "Made-Up TikTok Movies",
          "General/Other"
        ],
      },
    ]);

    const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
    category = videoCategory;
    
    try {
      results = await getMultiPlatformVideos(urlList, { quality: 1080 });
      
      // Add category info
      results = results.map(result => ({
        ...result,
        category: category,
        videoId: result.id
      }));

      // Set hashtags based on category
      const categoryHashtags = {
        "Anime Edited Videos": "anime edit, fight scenes, Japanese animation",
        "Tech Shorts": "tech, ai, gadgets, programming", 
        "Horror Clips": "horror, scary, thriller, creepy",
        "Made-Up TikTok Movies": "shortfilm, storytime, acting, movie",
        "General/Other": "viral, fyp, trending, content"
      };
      
      hashtags = categoryHashtags[category] || "viral, fyp, trending";
      
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

    const { platform } = await inquirer.prompt([
      {
        type: "list",
        name: "platform",
        message: "Which platform to search?",
        choices: ["YouTube", "All Platforms"],
      },
    ]);

    const { videoCategory } = await inquirer.prompt([
      {
        type: "list", 
        name: "videoCategory",
        message: "What category best describes this search?",
        choices: [
          "Anime Edited Videos",
          "Tech Shorts",
          "Horror Clips",
          "Made-Up TikTok Movies", 
          "General/Other"
        ],
      },
    ]);

    category = videoCategory;
    
    try {
      results = await getMultiPlatformVideos(searchQuery, {
        platform: platform === "All Platforms" ? "YouTube" : platform,
        limit: 1,
        quality: 1080
      });

      // Add category info
      results = results.map(result => ({
        ...result,
        category: category,
        videoId: result.id
      }));

      // Set hashtags based on category
      const categoryHashtags = {
        "Anime Edited Videos": "anime edit, fight scenes, Japanese animation",
        "Tech Shorts": "tech, ai, gadgets, programming",
        "Horror Clips": "horror, scary, thriller, creepy", 
        "Made-Up TikTok Movies": "shortfilm, storytime, acting, movie",
        "General/Other": "viral, fyp, trending, content"
      };
      
      hashtags = categoryHashtags[category] || "viral, fyp, trending";
      
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
  
  // Perform initial cleanup to remove duplicates and old files
  console.log(chalk.cyan("🧹 Performing initial cleanup..."));
  await videoCleanup.performFullCleanup();

  // Process the first video
  const video = results[0];
  const videoId = video.videoId || video.id;
  console.log(chalk.cyan(`🎬 Processing: ${video.title}`));
  console.log(chalk.gray(`📱 Platform: ${video.platform}`));
  console.log(chalk.gray(`📁 File: ${video.localPath}`));
  console.log(chalk.gray(`🆔 Video ID: ${videoId}`));
  
  if (video.searchTerm) {
    console.log(chalk.magenta(`🎲 Random search used: "${video.searchTerm}"`));
  }

  // Import processing modules
  const generateCaption = require("./utils/generateCaption");
  const editAnimeVideo = require("./edit/animeEditor");
  const addMusicToVideo = require("./edit/addMusic");
  const uploadToTikTok = require("./upload/tiktokUploader");

  let uploadSuccess = false;

  try {
    const rawPath = video.localPath;
    const editedPath = `./videos/edited/${videoId}-edited.mp4`;
    const finalPath = `./videos/edited/${videoId}-final.mp4`;

    console.log(chalk.yellow("🎬 Editing video..."));
    await editAnimeVideo(rawPath, editedPath);

    console.log(chalk.yellow("🎵 Adding smart audio detection..."));
    const musicCategory = category.toLowerCase().includes('anime') ? 'anime' : 
                         category.toLowerCase().includes('tech') ? 'tech' :
                         category.toLowerCase().includes('horror') ? 'horror' : 'anime';
    
    // Pass video info for better audio detection
    await addMusicToVideo(editedPath, finalPath, musicCategory, {
      title: video.title,
      description: video.description || '',
      platform: video.platform,
      category: category
    });

    console.log(chalk.yellow("📝 Generating caption..."));
    const caption = await generateCaption(hashtags);

    console.log(chalk.yellow("📤 Uploading to TikTok..."));
    await uploadToTikTok(finalPath, caption);

    uploadSuccess = true;
    console.log(chalk.green("🚀 Video posted successfully!"));
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.gray(`   Title: ${video.title}`));
    console.log(chalk.gray(`   Platform: ${video.platform}`));
    console.log(chalk.gray(`   Category: ${category}`));
    if (video.searchTerm) {
      console.log(chalk.gray(`   Search Term: ${video.searchTerm}`));
    }
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
      console.log(chalk.gray(`   Music files: ${finalStats.music.count} files (${finalStats.music.sizeMB}MB)`));
      console.log(chalk.gray(`   Total: ${finalStats.total.count} files (${finalStats.total.sizeMB}MB)`));
    }
  }
}

// main();
module.exports = main;