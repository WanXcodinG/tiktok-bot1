const ffmpeg = require("fluent-ffmpeg");
const path = require("path");
const fs = require("fs-extra");
const chalk = require("chalk");

// Set the FFmpeg executable path (update if yours is in a different location)
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

async function editVideo(inputPath, outputName = "edited-video.mp4", options = {}) {
  const { startTime = "00:00:03", duration = 30 } = options;

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

  console.log(chalk.blue("📁 Saving to path:"), outputPath);

  // Delete existing file if it already exists
  if (fs.existsSync(outputPath)) {
    fs.removeSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("720x1280")
      .outputOptions([
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart'
      ]);

    command
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(chalk.yellow(`⏳ Processing: ${progress.percent.toFixed(1)}%`));
        }
      })
      .on("end", () => {
        console.log(chalk.green("✅ Video edited and saved to:"), outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(chalk.red("❌ Error during video processing:"), err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = editVideo;