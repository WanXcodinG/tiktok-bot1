const yts = require('yt-search');
const ytdl = require('@distube/ytdl-core');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');

// Enhanced music categories with more specific search terms
const musicCategories = {
  anime: [
    'anime phonk music no copyright',
    'anime AMV background music',
    'japanese instrumental epic',
    'anime fight scene music',
    'phonk anime edit music',
    'epic anime OST instrumental'
  ],
  tech: [
    'tech background music no copyright',
    'cyberpunk electronic music',
    'futuristic synthwave music',
    'tech house instrumental',
    'AI technology background music',
    'electronic tech music'
  ],
  horror: [
    'horror background music no copyright',
    'dark ambient horror music',
    'scary instrumental music',
    'creepy background music',
    'horror movie soundtrack',
    'dark atmospheric music'
  ],
  chill: [
    'chill lo-fi background music',
    'relaxing instrumental music',
    'calm ambient music',
    'peaceful background music',
    'soft instrumental music',
    'meditation background music'
  ],
  energetic: [
    'upbeat background music no copyright',
    'energetic electronic music',
    'motivational background music',
    'dance electronic music',
    'workout background music',
    'high energy instrumental'
  ],
  cinematic: [
    'cinematic background music',
    'epic orchestral music',
    'dramatic instrumental music',
    'movie soundtrack music',
    'epic cinematic music',
    'orchestral background music'
  ],
  general: [
    'background music no copyright',
    'royalty free music',
    'instrumental music trending',
    'upbeat background music',
    'popular instrumental music',
    'viral background music'
  ]
};

async function fetchMusic(category = 'anime') {
  try {
    console.log(chalk.cyan(`🎵 Fetching ${category} music...`));
    
    // Ensure music directory exists
    const musicDir = path.join(__dirname, '../assets/music');
    fs.ensureDirSync(musicDir);
    
    // First, try to use existing music of the same category
    const existingMusic = getRandomExistingMusic(category);
    if (existingMusic) {
      console.log(chalk.green(`🎵 Using existing ${category} music: ${path.basename(existingMusic)}`));
      return existingMusic;
    }
    
    // If no existing music, try to download new one
    const searchTerms = musicCategories[category] || musicCategories.general;
    const randomTerm = searchTerms[Math.floor(Math.random() * searchTerms.length)];
    
    console.log(chalk.blue(`🔍 Searching for: "${randomTerm}"`));
    
    // Search for music videos
    const searchResults = await yts(randomTerm);
    
    // Filter for suitable music videos
    const musicVideos = searchResults.videos.filter(video => {
      const duration = video.duration?.seconds || 0;
      const title = video.title.toLowerCase();
      
      // Filter criteria
      const isGoodDuration = duration > 30 && duration < 600; // 30 seconds to 10 minutes
      const hasGoodKeywords = title.includes('music') || title.includes('instrumental') || 
                             title.includes('background') || title.includes('no copyright');
      const notLivestream = !title.includes('live') && !title.includes('stream');
      
      return isGoodDuration && hasGoodKeywords && notLivestream;
    });
    
    if (!musicVideos || musicVideos.length === 0) {
      console.log(chalk.yellow('⚠️ No suitable music found, using fallback'));
      return await useFallbackMusic(category);
    }
    
    // Select a random music video from top results
    const selectedMusic = musicVideos[Math.floor(Math.random() * Math.min(musicVideos.length, 5))];
    const musicId = selectedMusic.videoId;
    const outputPath = path.join(musicDir, `${category}_${musicId}.mp3`);
    
    // Check if already downloaded
    if (fs.existsSync(outputPath)) {
      console.log(chalk.green(`✅ Music already exists: ${selectedMusic.title}`));
      return outputPath;
    }
    
    console.log(chalk.yellow(`⬇️ Downloading ${category} music: ${selectedMusic.title}`));
    console.log(chalk.gray(`📁 Duration: ${selectedMusic.duration.timestamp}`));
    
    try {
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
          console.log(chalk.green(`✅ ${category} music downloaded: ${selectedMusic.title}`));
          resolve();
        });
        
        writeStream.on('error', (err) => {
          console.error(chalk.red(`❌ Write error: ${err.message}`));
          reject(err);
        });
      });
      
      return outputPath;
    } catch (downloadErr) {
      console.error(chalk.red(`❌ Failed to download music: ${downloadErr.message}`));
      return await useFallbackMusic(category);
    }
    
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
        // Try to find music of the same category first
        const categoryMusic = musicFiles.filter(file => 
          file.toLowerCase().includes(category.toLowerCase())
        );
        
        if (categoryMusic.length > 0) {
          const randomMusic = categoryMusic[Math.floor(Math.random() * categoryMusic.length)];
          const musicPath = path.join(musicDir, randomMusic);
          console.log(chalk.green(`🎵 Using existing ${category} music: ${randomMusic}`));
          return musicPath;
        }
        
        // If no category-specific music, use any available music
        const randomMusic = musicFiles[Math.floor(Math.random() * musicFiles.length)];
        const musicPath = path.join(musicDir, randomMusic);
        console.log(chalk.green(`🎵 Using existing music: ${randomMusic}`));
        return musicPath;
      }
    }
    
    // If no existing music, return null (video will use original audio)
    console.log(chalk.yellow('⚠️ No music available, video will use original audio'));
    return null;
    
  } catch (err) {
    console.error(chalk.red(`❌ Fallback music error: ${err.message}`));
    return null;
  }
}

/**
 * Get random music from existing files, preferring category match
 */
function getRandomExistingMusic(category = 'anime') {
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
    
    // Try to find music of the same category first
    const categoryMusic = musicFiles.filter(file => 
      file.toLowerCase().includes(category.toLowerCase())
    );
    
    if (categoryMusic.length > 0) {
      const randomMusic = categoryMusic[Math.floor(Math.random() * categoryMusic.length)];
      return path.join(musicDir, randomMusic);
    }
    
    // If no category-specific music, use any available music
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