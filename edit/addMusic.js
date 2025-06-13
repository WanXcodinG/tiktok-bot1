const fetchMusic = require("../utils/fetchMusic");
const ffmpeg = require("fluent-ffmpeg");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

async function addMusicToVideo(videoPath, outputPath, category = "anime") {
  try {
    console.log(chalk.cyan(`🎵 Adding ${category} music to video...`));
    
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    // Try to get music
    let musicPath;
    try {
      musicPath = await fetchMusic(category);
    } catch (err) {
      console.log(chalk.yellow(`⚠️ Failed to fetch new music: ${err.message}`));
      musicPath = null;
    }
    
    // If no music available, just copy the video
    if (!musicPath || !fs.existsSync(musicPath)) {
      console.log(chalk.yellow('⚠️ No music available, keeping original audio'));
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .videoCodec('copy')
          .audioCodec('aac')
          .audioBitrate('128k')
          .on('end', () => {
            console.log(chalk.green(`✅ Video processed (no music added): ${outputPath}`));
            resolve(outputPath);
          })
          .on('error', (err) => {
            console.error(chalk.red(`❌ Error copying video: ${err.message}`));
            reject(err);
          })
          .save(outputPath);
      });
    }
    
    console.log(chalk.blue(`🎶 Using music: ${path.basename(musicPath)}`));
    
    return new Promise((resolve, reject) => {
      // Simple approach: replace audio with music
      ffmpeg()
        .addInput(videoPath)
        .addInput(musicPath)
        .outputOptions([
          '-shortest',           // End when shortest input ends
          '-map', '0:v:0',      // Map video from first input
          '-map', '1:a:0',      // Map audio from second input (music)
          '-c:v', 'copy',       // Copy video codec (no re-encoding)
          '-c:a', 'aac',        // Use AAC audio codec
          '-b:a', '128k',       // Audio bitrate
          '-y'                  // Overwrite output file
        ])
        .on('start', (commandLine) => {
          console.log(chalk.gray(`🔧 FFmpeg command: ${commandLine}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(chalk.blue(`🎵 Adding music: ${progress.percent.toFixed(1)}%`));
          }
        })
        .on('end', () => {
          console.log(chalk.green(`✅ Music added successfully: ${outputPath}`));
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(chalk.red(`❌ Error adding music: ${err.message}`));
          
          // Fallback: just copy the original video
          console.log(chalk.yellow('🔄 Falling back to original video...'));
          ffmpeg(videoPath)
            .videoCodec('copy')
            .audioCodec('aac')
            .audioBitrate('128k')
            .on('end', () => {
              console.log(chalk.green(`✅ Fallback completed: ${outputPath}`));
              resolve(outputPath);
            })
            .on('error', (fallbackErr) => {
              console.error(chalk.red(`❌ Fallback also failed: ${fallbackErr.message}`));
              reject(fallbackErr);
            })
            .save(outputPath);
        })
        .save(outputPath);
    });
    
  } catch (err) {
    console.error(chalk.red(`❌ Error in addMusicToVideo: ${err.message}`));
    throw err;
  }
}

module.exports = addMusicToVideo;