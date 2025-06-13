const fetchMusic = require("../utils/fetchMusic");
const AudioDetector = require("../utils/audioDetector");
const ffmpeg = require("fluent-ffmpeg");
const chalk = require("chalk");
const path = require("path");
const fs = require("fs");

async function addMusicToVideo(videoPath, outputPath, category = "anime", videoInfo = {}) {
  try {
    console.log(chalk.cyan(`🎵 Adding music to video with smart detection...`));
    
    // Check if video file exists
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    // Initialize audio detector
    const audioDetector = new AudioDetector();
    
    // Detect appropriate audio category based on video content
    let detectedCategory = category;
    try {
      console.log(chalk.yellow('🔍 Analyzing video content for audio matching...'));
      detectedCategory = await audioDetector.detectAudioCategory(
        videoPath, 
        videoInfo.title || '', 
        videoInfo.description || ''
      );
      
      console.log(chalk.green(`🎯 Detected audio category: ${detectedCategory}`));
      
      // Get audio recommendations
      const recommendations = audioDetector.getAudioRecommendations(detectedCategory);
      console.log(chalk.blue(`🎼 Audio mood: ${recommendations.mood}`));
      console.log(chalk.gray(`🎵 Genres: ${recommendations.genres.join(', ')}`));
      
    } catch (err) {
      console.log(chalk.yellow(`⚠️ Audio detection failed, using default: ${err.message}`));
      detectedCategory = category;
    }
    
    // Try to get music based on detected category
    let musicPath;
    try {
      musicPath = await fetchMusic(detectedCategory);
    } catch (err) {
      console.log(chalk.yellow(`⚠️ Failed to fetch ${detectedCategory} music: ${err.message}`));
      
      // Try fallback with original category
      if (detectedCategory !== category) {
        try {
          console.log(chalk.blue(`🔄 Trying fallback category: ${category}`));
          musicPath = await fetchMusic(category);
        } catch (fallbackErr) {
          console.log(chalk.yellow(`⚠️ Fallback music also failed: ${fallbackErr.message}`));
          musicPath = null;
        }
      } else {
        musicPath = null;
      }
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
    
    console.log(chalk.blue(`🎶 Using ${detectedCategory} music: ${path.basename(musicPath)}`));
    
    return new Promise((resolve, reject) => {
      // Enhanced audio mixing approach
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
          '-af', 'volume=0.7',  // Reduce music volume slightly
          '-y'                  // Overwrite output file
        ])
        .on('start', (commandLine) => {
          console.log(chalk.gray(`🔧 FFmpeg command: ${commandLine}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(chalk.blue(`🎵 Adding ${detectedCategory} music: ${progress.percent.toFixed(1)}%`));
          }
        })
        .on('end', () => {
          console.log(chalk.green(`✅ ${detectedCategory} music added successfully: ${outputPath}`));
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