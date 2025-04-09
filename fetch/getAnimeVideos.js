const axios = require("axios");
const fs = require("fs-extra");
const ytdl = require("@distube/ytdl-core"); // ✅ Updated package
const yts = require("yt-search");
const path = require("path");

async function getAnimeVideos(count = 1) {
  console.log("🔎 Searching YouTube for anime edits...");

  // Search YouTube for anime edits using yt-search
  const { videos } = await yts("anime edit AMV");
  const selectedVideos = videos.slice(0, count); // Select the first 'count' videos

  // Loop through each selected video to download
  for (const video of selectedVideos) {
    const outputPath = path.join(__dirname, "../videos/raw", `${video.videoId}.mp4`);

    // Skip download if video is already downloaded
    if (fs.existsSync(outputPath)) {
      console.log(`✔️ Video already downloaded: ${video.title}`);
      continue;
    }

    console.log(`📥 Downloading: ${video.title}`);
    try {
      // Download the video with both audio and video
      const stream = ytdl(video.url, {
        quality: "highest", // Use the highest quality available
        filter: (format) => format.container === "mp4" && format.hasAudio && format.hasVideo, // Ensure it has both audio and video
      });

      // Pipe the video stream to a file
      await new Promise((resolve, reject) => {
        stream.pipe(fs.createWriteStream(outputPath))
          .on("finish", resolve) // Resolve when download is complete
          .on("error", reject); // Reject if an error occurs
      });

      console.log(`✅ Saved to: ${outputPath}`);
    } catch (err) {
      console.error(`❌ Failed to download ${video.title}:`, err.message);
      if (fs.existsSync(outputPath)) {
        fs.removeSync(outputPath); // Remove any partially downloaded files
      }
    }
  }

  return selectedVideos; // Return the list of selected videos
}

module.exports = getAnimeVideos;
