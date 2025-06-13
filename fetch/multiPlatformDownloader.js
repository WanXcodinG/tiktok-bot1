const ytDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const yts = require('yt-search');

class MultiPlatformDownloader {
  constructor() {
    this.ytDlp = new ytDlpWrap();
    this.outputDir = path.join(__dirname, '../videos/raw');
    this.supportedPlatforms = {
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
      'tiktok.com': 'TikTok',
      'vm.tiktok.com': 'TikTok',
      'vt.tiktok.com': 'TikTok',
      'instagram.com': 'Instagram',
      'facebook.com': 'Facebook',
      'fb.watch': 'Facebook',
      'twitter.com': 'Twitter',
      'x.com': 'Twitter'
    };
    
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Detect platform from URL
   */
  detectPlatform(url) {
    try {
      if (!url || typeof url !== 'string') {
        return 'Invalid URL';
      }
      
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');
      
      for (const [domain, platform] of Object.entries(this.supportedPlatforms)) {
        if (hostname.includes(domain.replace('.com', '')) || hostname === domain) {
          return platform;
        }
      }
      return 'Unknown';
    } catch (err) {
      return 'Invalid URL';
    }
  }

  /**
   * Get video info without downloading
   */
  async getVideoInfo(url) {
    try {
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided');
      }
      
      console.log(chalk.blue(`🔍 Getting video info from: ${this.detectPlatform(url)}`));
      
      const info = await this.ytDlp.getVideoInfo(url);
      
      return {
        id: info.id || this.generateId(),
        title: info.title || 'Unknown Title',
        duration: info.duration || 0,
        uploader: info.uploader || 'Unknown',
        platform: this.detectPlatform(url),
        url: url,
        thumbnail: info.thumbnail,
        description: info.description || ''
      };
    } catch (err) {
      console.error(chalk.red(`❌ Failed to get video info: ${err.message}`));
      // Return basic info even if getVideoInfo fails
      return {
        id: this.generateId(),
        title: 'Downloaded Video',
        duration: 0,
        uploader: 'Unknown',
        platform: this.detectPlatform(url),
        url: url,
        thumbnail: null,
        description: ''
      };
    }
  }

  /**
   * Download video from any supported platform - FIXED
   */
  async downloadVideo(url, options = {}) {
    try {
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided for download');
      }
      
      const platform = this.detectPlatform(url);
      console.log(chalk.cyan(`📥 Downloading from ${platform}...`));
      
      // Get video info first (with fallback)
      const videoInfo = await this.getVideoInfo(url);
      const videoId = videoInfo.id;
      
      // Create unique filename with timestamp to avoid conflicts
      const timestamp = Date.now();
      const outputFilename = `${platform.toLowerCase()}_${videoId}_${timestamp}.%(ext)s`;
      const outputTemplate = path.join(this.outputDir, outputFilename);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      console.log(chalk.gray(`📁 Output template: ${outputTemplate}`));
      
      // Download options based on platform - FIXED: Remove duplicates
      const downloadOptions = this.getDownloadOptions(platform, options);
      
      // Execute download with proper error handling - FIXED: Clean command array
      const command = [
        url,
        '-o', outputTemplate,
        ...downloadOptions
      ];
      
      // Remove any duplicate options
      const cleanCommand = this.cleanCommandArray(command);
      
      console.log(chalk.gray(`🔧 Command: yt-dlp ${cleanCommand.join(' ')}`));
      
      try {
        await this.ytDlp.exec(cleanCommand);
      } catch (ytDlpError) {
        console.error(chalk.red(`❌ yt-dlp error: ${ytDlpError.message}`));
        throw new Error(`Download failed: ${ytDlpError.message}`);
      }
      
      // Find the downloaded file - IMPROVED
      const downloadedFile = await this.findDownloadedFile(videoId, platform, timestamp);
      
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        const stats = fs.statSync(downloadedFile);
        console.log(chalk.green(`✅ Downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`));
        console.log(chalk.green(`📁 File location: ${downloadedFile}`));
        
        // Create a consistent filename for easier reference
        const finalFilename = `${platform.toLowerCase()}_${videoId}.mp4`;
        const finalPath = path.join(this.outputDir, finalFilename);
        
        // If the downloaded file has a different name, rename it
        if (downloadedFile !== finalPath) {
          try {
            await fs.move(downloadedFile, finalPath, { overwrite: true });
            console.log(chalk.blue(`📝 Renamed to: ${finalFilename}`));
          } catch (renameErr) {
            console.log(chalk.yellow(`⚠️ Could not rename file: ${renameErr.message}`));
            // Use the original downloaded file path
          }
        }
        
        return {
          ...videoInfo,
          localPath: fs.existsSync(finalPath) ? finalPath : downloadedFile,
          fileSize: stats.size,
          alreadyExists: false,
          actualVideoId: videoId // Store the actual video ID used
        };
      } else {
        throw new Error('Download completed but file not found');
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Download failed: ${err.message}`));
      throw err;
    }
  }

  /**
   * Find downloaded file by searching for files with video ID - IMPROVED
   */
  async findDownloadedFile(videoId, platform, timestamp) {
    try {
      const files = fs.readdirSync(this.outputDir);
      
      // Look for files with the exact pattern first
      const exactMatches = files.filter(file => {
        const lowerFile = file.toLowerCase();
        return lowerFile.includes(videoId.toLowerCase()) && 
               lowerFile.includes(timestamp.toString()) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (exactMatches.length > 0) {
        return path.join(this.outputDir, exactMatches[0]);
      }
      
      // Look for files containing the video ID
      const videoIdMatches = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerVideoId = videoId.toLowerCase();
        
        return lowerFile.includes(lowerVideoId) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (videoIdMatches.length > 0) {
        // Return the most recent file
        const sortedFiles = videoIdMatches.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        return sortedFiles[0].path;
      }
      
      // Look for files with platform prefix
      const platformMatches = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerPlatform = platform.toLowerCase();
        
        return lowerFile.includes(lowerPlatform) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (platformMatches.length > 0) {
        // Return the most recent file
        const sortedFiles = platformMatches.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        console.log(chalk.yellow(`⚠️ Using most recent ${platform} file: ${sortedFiles[0].name}`));
        return sortedFiles[0].path;
      }
      
      // If no matching files, return the most recent video file
      const videoFiles = files.filter(file => 
        file.endsWith('.mp4') || file.endsWith('.webm') || file.endsWith('.mkv')
      );
      
      if (videoFiles.length > 0) {
        const sortedFiles = videoFiles.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        console.log(chalk.yellow(`⚠️ Using most recent video file: ${sortedFiles[0].name}`));
        return sortedFiles[0].path;
      }
      
      return null;
    } catch (err) {
      console.error(chalk.red(`❌ Error finding downloaded file: ${err.message}`));
      return null;
    }
  }

  /**
   * Clean command array to remove duplicates and invalid options
   */
  cleanCommandArray(command) {
    const cleanedCommand = [];
    const seenOptions = new Set();
    
    for (let i = 0; i < command.length; i++) {
      const current = command[i];
      
      // Skip empty or invalid entries
      if (!current || current.trim() === '') {
        continue;
      }
      
      // Handle option-value pairs
      if (current.startsWith('--')) {
        if (!seenOptions.has(current)) {
          seenOptions.add(current);
          cleanedCommand.push(current);
          
          // Check if next item is a value for this option
          if (i + 1 < command.length && !command[i + 1].startsWith('--')) {
            cleanedCommand.push(command[i + 1]);
            i++; // Skip the value in next iteration
          }
        } else {
          // Skip duplicate option and its value if present
          if (i + 1 < command.length && !command[i + 1].startsWith('--')) {
            i++; // Skip the value too
          }
        }
      } else {
        // Non-option arguments (URL, output path, etc.)
        cleanedCommand.push(current);
      }
    }
    
    return cleanedCommand;
  }

  /**
   * Get platform-specific download options - FIXED: No duplicates
   */
  getDownloadOptions(platform, userOptions = {}) {
    // Base options that apply to all platforms
    const baseOptions = [
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--ignore-errors',
      '--no-check-certificate'
    ];

    // Platform-specific options
    const platformOptions = {
      'YouTube': [
        '--format', 'best[ext=mp4][height<=1080]/best[ext=mp4]/best'
      ],
      'TikTok': [
        '--format', 'best',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ],
      'Instagram': [
        '--format', 'best'
      ],
      'Facebook': [
        '--format', 'best'
      ],
      'Twitter': [
        '--format', 'best'
      ]
    };

    // Start with base options
    let options = [...baseOptions];
    
    // Add platform-specific options
    if (platformOptions[platform]) {
      options.push(...platformOptions[platform]);
    } else {
      // Default format for unknown platforms
      options.push('--format', 'best[height<=1080]/best');
    }

    // Add user-specified options
    if (userOptions.quality) {
      // Remove existing format options and add custom quality
      options = options.filter(opt => !opt.includes('--format') && !opt.includes('best'));
      options.push('--format', `best[height<=${userOptions.quality}]/best`);
    }
    
    if (userOptions.audioOnly) {
      options.push('--format', 'bestaudio');
      options.push('--extract-audio');
      options.push('--audio-format', 'mp3');
    }

    return options;
  }

  /**
   * Download multiple videos from URLs
   */
  async downloadMultiple(urls, options = {}) {
    const results = [];
    
    for (const url of urls) {
      try {
        if (!this.isValidUrl(url)) {
          throw new Error('Invalid URL format');
        }
        
        const result = await this.downloadVideo(url, options);
        results.push(result);
        
        // Add delay between downloads to be respectful
        if (urls.length > 1) {
          console.log(chalk.gray('⏳ Waiting 3 seconds before next download...'));
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
      } catch (err) {
        console.error(chalk.red(`❌ Failed to download ${url}: ${err.message}`));
        results.push({
          url,
          error: err.message,
          success: false
        });
      }
    }
    
    return results;
  }

  /**
   * Search and download from YouTube using yt-search
   */
  async searchAndDownload(query, platform = 'YouTube', limit = 1) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Invalid search query provided');
      }
      
      console.log(chalk.blue(`🔍 Searching ${platform} for: "${query}"`));
      
      if (platform.toLowerCase() !== 'youtube') {
        throw new Error(`Search only supported for YouTube. For other platforms, please provide direct URLs.`);
      }

      // Use yt-search for YouTube search
      const searchResults = await yts(query);
      const videos = searchResults.videos.slice(0, limit);

      if (!videos || videos.length === 0) {
        throw new Error(`No videos found for query: ${query}`);
      }

      console.log(chalk.green(`🎯 Found ${videos.length} video(s)`));

      const downloadResults = [];
      for (const video of videos) {
        try {
          console.log(chalk.cyan(`📥 Processing: ${video.title}`));
          const downloadResult = await this.downloadVideo(video.url);
          downloadResults.push(downloadResult);
        } catch (err) {
          console.error(chalk.red(`❌ Failed to download ${video.title}: ${err.message}`));
          downloadResults.push({
            url: video.url,
            title: video.title,
            error: err.message,
            success: false
          });
        }
      }

      return downloadResults.filter(result => !result.error);
    } catch (err) {
      console.error(chalk.red(`❌ Search and download failed: ${err.message}`));
      throw err;
    }
  }

  /**
   * Generate random ID for videos without ID
   */
  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * Get supported platforms list
   */
  getSupportedPlatforms() {
    return [...new Set(Object.values(this.supportedPlatforms))];
  }

  /**
   * Validate URL
   */
  isValidUrl(url) {
    try {
      if (!url || typeof url !== 'string') {
        return false;
      }
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if platform is supported
   */
  isPlatformSupported(url) {
    const platform = this.detectPlatform(url);
    return platform !== 'Unknown' && platform !== 'Invalid URL';
  }
}

module.exports = MultiPlatformDownloader;