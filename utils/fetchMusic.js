const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Predefined music categories with specific search terms
const musicCategories = {
  anime: [
    'anime background music no copyright',
    'japanese instrumental music',
    'anime OST instrumental',
    'epic anime music',
    'anime phonk music'
  ],
  tech: [
    'tech background music no copyright',
    'electronic music instrumental',
    'cyberpunk music',
    'futuristic background music',
    'tech house music'
  ],
  horror: [
    'horror background music no copyright',
    'dark ambient music',
    'scary music instrumental',
    'creepy background music',
    'horror movie music'
  ],
  general: [
    'background music no copyright',
    'royalty free music',
    'instrumental music',
    'upbeat background music',
    'trending background music'
  ]
};

async function fetchMusic(category = 'anime') {
  try {
    console.log(chalk.cyan(`🎵 Fetching ${category} music...`));
    
    // Ensure music directory exists
    const musicDir = path.join(__dirname, '../assets/music');
    fs.ensureDirSync(musicDir);
    
    // Get search terms for category
    const searchTerms = musicCategories[category] || musicCategories.general;
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    console.log(chalk.blue(`🔍 Searching for: "${randomTerm}"`));
    
    // Search for music videos
    const searchResults = await yts(randomTerm);
    
    // Filter for shorter videos (background music is usually shorter)
    const musicVideos = searchResults.videos.filter(video => {
      const duration = video.duration?.seconds || 0;
      return duration > 30 && duration < 300; // Between 30 seconds and 5 minutes
    });
    
    if (!musicVideos || musicVideos.length === 0) {
      console.log(chalk.yellow('⚠️ No suitable music found, using fallback'));
      return await useFallbackMusic(category);
    }
    
    // Select a random music video
    const selectedMusic = musicVideos[Math.floor(Math.random() * Math.min(musicVideos.length, 3))];
    const musicId = selectedMusic.videoId;
    const outputPath = path.join(musicDir, `${musicId}.mp3`);
    
    // Check if already downloaded
    if (fs.existsSync(outputPath)) {
      console.log(chalk.green(`✅ Music already exists: ${selectedMusic.title}`));
      return outputPath;
    }
    
    console.log(chalk.yellow(`⬇️ Downloading music: ${selectedMusic.title}`));
    console.log(chalk.gray(`📁 Duration: ${selectedMusic.duration.timestamp}`));
    
    // Download audio using ytdl-core
    const stream = ytdl(selectedMusic.url, { 
      filter: 'audioonly',
      quality: 'highestaudio'
    });
    
    // Save to file
    await new Promise((resolve, reject) => {
      const writeStream = fs.createWriteStream(outputPath);
      
      stream.pipe(writeStream);
      
      stream.on('error', (err) => {
        console.error(chalk.red(`❌ Stream error: ${err.message}`));
        reject(err);
      });
      
      writeStream.on('finish', () => {
        console.log(chalk.green(`✅ Music downloaded: ${selectedMusic.title}`));
        resolve();
      });
      
      writeStream.on('error', (err) => {
        console.error(chalk.red(`❌ Write error: ${err.message}`));
        reject(err);
      });
    });
    
    return outputPath;
    
  } catch (err) {
    console.error(chalk.red(`❌ Error fetching music: ${err.message}`));
    return await useFallbackMusic(category);
  }
}

/**
 * Use existing music files as fallback
 */
async function useFallbackMusic(category) {
  try {
    const musicDir = path.join(__dirname, '../assets/music');
    
    // Check if music directory exists and has files
    if (fs.existsSync(musicDir)) {
      const musicFiles = fs.readdirSync(musicDir).filter(file => 
        file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')
      );
      
      if (musicFiles.length > 0) {
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
        const musicPath = path.join(musicDir, randomMusic);
        console.log(chalk.green(`🎵 Using existing music: ${randomMusic}`));
        return musicPath;
      }
    }
    
    // If no existing music, create a silent audio file
    console.log(chalk.yellow('⚠️ No music available, video will use original audio'));
    return null;
    
  } catch (err) {
    console.error(chalk.red(`❌ Fallback music error: ${err.message}`));
    return null;
  }
}

/**
 * Get random music from existing files
 */
function getRandomExistingMusic() {
  try {
    const musicDir = path.join(__dirname, '../assets/music');
    
    if (!fs.existsSync(musicDir)) {
      return null;
    }
    
    const musicFiles = fs.readdirSync(musicDir).filter(file => 
      file.endsWith('.mp3') || file.endsWith('.wav') || file.endsWith('.m4a')
    );
    
    if (musicFiles.length === 0) {
      return null;
    }
    
    const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
    return path.join(musicDir, randomMusic);
    
  } catch (err) {
    console.error(chalk.red(`❌ Error getting existing music: ${err.message}`));
    return null;
  }
}

module.exports = fetchMusic;
module.exports.getRandomExistingMusic = getRandomExistingMusic;
module.exports.useFallbackMusic = useFallbackMusic;