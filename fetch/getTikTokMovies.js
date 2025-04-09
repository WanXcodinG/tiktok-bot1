const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ytdl = require("@distube/ytdl-core"); // Updated import

async function getTikTokMovies(limit = 1) {
  try {
    // Search for TikTok short movies or stories made on a phone
    const results = await yts("TikTok short movie story made on phone");
    const selected = results.videos.slice(0, limit);

    // Create the directory for saving videos if it doesn't exist
    const videoDir = path.join(__dirname, "../videos/raw");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Download selected videos
    for (let video of selected) {
      const outputPath = path.join(videoDir, `${video.videoId}.mp4`);
      
      // Check if the file already exists, and skip downloading if true
      if (fs.existsSync(outputPath)) {
        console.log(`📂 Video already exists: ${outputPath}`);
        continue; // Skip if the file exists
      }

      // Download the video using ytdl-core
      await new Promise((resolve, reject) => {
        console.log(`⬇️ Downloading video: ${video.title}`);
        ytdl(video.url, { quality: "highest" })
          .pipe(fs.createWriteStream(outputPath))
          .on("finish", () => {
            console.log(`✅ Video downloaded: ${outputPath}`);
            resolve(); // Resolve when download finishes
          })
          .on("error", (err) => {
            console.error(`❌ Failed to download video: ${video.title}`, err.message);
            reject(err); // Reject on error
          });
      });
    }

    return selected; // Return selected video metadata

  } catch (err) {
    console.error("❌ Error fetching TikTok movies:", err.message);
    throw err; // Propagate the error to the caller
  }
}

module.exports = getTikTokMovies;
