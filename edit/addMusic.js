const ffmpeg = require("fluent-ffmpeg");
const chalk = require("chalk");
const fs = require("fs");

async function processVideoAudio(videoPath, outputPath) {
  try {
    console.log(chalk.cyan(`🎵 Processing video with original audio...`));
    
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    console.log(chalk.blue(`🎶 Keeping original video audio`));
    
    return new Promise((resolve, reject) => {
      // Simply copy the video with original audio, ensuring proper encoding
      ffmpeg(videoPath)
        .videoCodec('copy')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-movflags', '+faststart'
        ])
        .on('start', (commandLine) => {
          console.log(chalk.gray(`🔧 FFmpeg command: ${commandLine}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(chalk.blue(`🎵 Processing audio: ${progress.percent.toFixed(1)}%`));
          }
        })
        .on('end', () => {
          console.log(chalk.green(`✅ Video processed with original audio: ${outputPath}`));
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(chalk.red(`❌ Error processing video: ${err.message}`));
          reject(err);
        })
        .save(outputPath);
    });
    
  } catch (err) {
    console.error(chalk.red(`❌ Error in processVideoAudio: ${err.message}`));
    throw err;
  }
}

module.exports = processVideoAudio;