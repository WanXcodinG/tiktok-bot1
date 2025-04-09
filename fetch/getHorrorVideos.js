const yts = require("yt-search");
const fs = require("fs");
const path = require("path");
const ytdl = require("@distube/ytdl-core"); // Updated import

async function getHorrorVideos(limit = 1) {
  try {
    // Search for horror short films or scary shorts on YouTube
    const results = await yts("horror short film scary shorts");
    const selected = results.videos.slice(0, limit);

    // Create the directory for saving videos if it doesn't exist
    const videoDir = path.join(__dirname, "../videos/raw");
    if (!fs.existsSync(videoDir)) {
      fs.mkdirSync(videoDir, { recursive: true });
    }

    // Loop through selected videos to download them
    for (let video of selected) {
      const outputPath = path.join(videoDir, `${video.videoId}.mp4`);

      // Skip downloading if the video already exists
      if (fs.existsSync(outputPath)) {
        console.log(`📂 Video already exists: ${outputPath}`);
        continue; // Skip if the file already exists
      }

      // Download the video using ytdl-core
      await new Promise((resolve, reject) => {
        console.log(`⬇️ Downloading horror video: ${video.title}`);
        ytdl(video.url, { quality: "highest" })
          .pipe(fs.createWriteStream(outputPath))
          .on("finish", () => {
            console.log(`✅ Video downloaded: ${outputPath}`);
            resolve(); // Resolve once the download is complete
          })
          .on("error", (err) => {
            console.error(`❌ Failed to download video: ${video.title}`, err.message);
            reject(err); // Reject on error to handle the failure
          });
      });
    }

    return selected; // Return metadata of selected videos

  } catch (err) {
    console.error("❌ Error fetching horror videos:", err.message);
    throw err; // Propagate the error for handling by the caller
  }
}

module.exports = getHorrorVideos;
