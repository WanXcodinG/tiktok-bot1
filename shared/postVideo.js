const generateCaption = require("../utils/generateCaption");
const editAnimeVideo = require("../edit/animeEditor");
const addMusicToVideo = require("../edit/addMusic");
const uploadToTikTok = require("../upload/tiktokUploader");

async function postVideo(category, fetchFn, hashtags) {
  try {
    console.log(`🎬 Starting ${category} video processing...`);
    
    const results = await fetchFn(1);
    if (!results || results.length === 0) {
      throw new Error("No videos found to process");
    }
    
    const videoId = results[0].videoId;
    console.log(`📹 Processing video ID: ${videoId}`);

    const rawPath = `./videos/raw/${videoId}.mp4`;
    const editedPath = `./videos/edited/${videoId}-edited.mp4`;
    const finalPath = `./videos/edited/${videoId}-final.mp4`;

    // Check if raw video exists
    const fs = require('fs');
    if (!fs.existsSync(rawPath)) {
      throw new Error(`Raw video not found: ${rawPath}`);
    }

    console.log("🎬 Editing video...");
    await editAnimeVideo(rawPath, editedPath);
    
    console.log("🎵 Adding music...");
    const musicCategory = category.toLowerCase().includes('anime') ? 'anime' : 
                         category.toLowerCase().includes('tech') ? 'tech' :
                         category.toLowerCase().includes('horror') ? 'horror' : 'anime';
    await addMusicToVideo(editedPath, finalPath, musicCategory);

    console.log("📝 Generating caption...");
    const caption = await generateCaption(hashtags);
    
    console.log("📤 Uploading to TikTok...");
    await uploadToTikTok(finalPath, caption);
    
    console.log(`✅ ${category} video posted successfully!`);
    
  } catch (err) {
    console.error(`❌ Error posting ${category} video:`, err.message);
    throw err;
  }
}

module.exports = postVideo;