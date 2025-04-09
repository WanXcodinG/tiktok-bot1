const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs-extra");

// Set the FFmpeg executable path (update if yours is in a different location)
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

async function editAnimeVideo(inputPath, outputName = "anime-edited.mp4", options = {}) {
  const { startTime = "00:00:03", duration = 30, audio = false } = options;

  // Make sure input path exists
  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("❌ Input video file does not exist.");
  }

  // Project root directory (one level up from this script)
  const projectRoot = path.resolve(__dirname, "..");
  const editedVideosDir = path.join(projectRoot, "videos", "edited");

  // Ensure output directory exists
  if (!fs.existsSync(editedVideosDir)) {
    fs.mkdirSync(editedVideosDir, { recursive: true });
  }

  // Clean output name (only filename, no extra folder paths)
  const cleanedOutputName = path.basename(outputName);

  // Final output path
  const outputPath = path.join(editedVideosDir, cleanedOutputName);

  console.log("📁 Saving to path:", outputPath);

  // Delete existing file if it already exists
  if (fs.existsSync(outputPath)) {
    fs.removeSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .videoCodec("libx264")
      .size("720x1280");

    if (!audio) {
      command.noAudio();
    }

    command
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`⏳ Processing: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on("end", () => {
        console.log("✅ Anime video edited and saved to:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("❌ Error during video processing:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = editAnimeVideo;
