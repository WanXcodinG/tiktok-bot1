const generateCaption = require("../utils/generateCaption");
const editAnimeVideo = require("../edit/animeEditor");
const addMusicToVideo = require("../edit/addMusic");
const uploadToTikTok = require("../upload/tiktokUploader");
const { getVideosByCategory } = require("../fetch/getMultiPlatformVideos");
const VideoCleanup = require("../utils/videoCleanup");
const chalk = require("chalk");

async function postVideo(category, fetchFn, hashtags) {
  const videoCleanup = new VideoCleanup();
  let videoId = null;
  let uploadSuccess = false;

  try {
    console.log(chalk.cyan(`🎬 Starting ${category} video processing...`));
    
    // Perform initial cleanup
    await videoCleanup.performFullCleanup();
    
    let results;
    
    // Use new multi-platform system if available
    if (typeof fetchFn === 'string') {
      // If fetchFn is a string, treat it as a category
      results = await getVideosByCategory(fetchFn, 1);
    } else {
      // Use legacy fetch function
      results = await fetchFn(1);
    }
    
    if (!results || results.length === 0) {
      throw new Error("No videos found to process");
    }
    
    const video = results[0];
    videoId = video.videoId || video.id;
    console.log(chalk.blue(`📹 Processing video: ${video.title || videoId}`));
    console.log(chalk.gray(`📱 Platform: ${video.platform || 'Unknown'}`));
    console.log(chalk.gray(`🆔 Video ID: ${videoId}`));

    // Determine paths
    const rawPath = video.localPath || `./videos/raw/${videoId}.mp4`;
    const editedPath = `./videos/edited/${videoId}-edited.mp4`;
    const finalPath = `./videos/edited/${videoId}-final.mp4`;

    // Check if raw video exists
    const fs = require('fs');
    if (!fs.existsSync(rawPath)) {
      throw new Error(`Raw video not found: ${rawPath}`);
    }

    console.log(chalk.yellow("🎬 Editing video..."));
    await editAnimeVideo(rawPath, editedPath);
    
    console.log(chalk.yellow("🎵 Adding smart audio detection..."));
    const musicCategory = category.toLowerCase().includes('anime') ? 'anime' : 
                         category.toLowerCase().includes('tech') ? 'tech' :
                         category.toLowerCase().includes('horror') ? 'horror' : 'anime';
    
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
    console.log(chalk.green(`✅ ${category} video posted successfully!`));
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.gray(`   Title: ${video.title || 'Unknown'}`));
    console.log(chalk.gray(`   Platform: ${video.platform || 'Unknown'}`));
    console.log(chalk.gray(`   Category: ${category}`));
    console.log(chalk.gray(`   Caption: ${caption}`));
    
  } catch (err) {
    uploadSuccess = false;
    console.error(chalk.red(`❌ Error posting ${category} video: ${err.message}`));
    throw err;
  } finally {
    // Always perform cleanup after processing
    if (videoId) {
      console.log(chalk.cyan("🧹 Performing post-processing cleanup..."));
      await videoCleanup.cleanupAfterUpload(videoId, uploadSuccess);
      
      // Show storage stats
      const stats = await videoCleanup.getStorageStats();
      if (stats) {
        console.log(chalk.gray(`📊 Storage: ${stats.total.count} files (${stats.total.sizeMB}MB)`));
      }
    }
  }
}

module.exports = postVideo;