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
   * Download video from any supported platform
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
      
      // Create output filename with platform prefix
      const outputFilename = `${platform.toLowerCase()}_${videoId}.%(ext)s`;
      const outputTemplate = path.join(this.outputDir, outputFilename);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      console.log(chalk.gray(`📁 Output template: ${outputTemplate}`));
      
      // Download options based on platform
      const downloadOptions = this.getDownloadOptions(platform, options);
      
      // Execute download with proper error handling
      const command = [
        url,
        '-o', outputTemplate,
        ...downloadOptions
      ];
      
      console.log(chalk.gray(`🔧 Command: yt-dlp ${command.join(' ')}`));
      
      try {
        await this.ytDlp.exec(command);
      } catch (ytDlpError) {
        console.error(chalk.red(`❌ yt-dlp error: ${ytDlpError.message}`));
        throw new Error(`Download failed: ${ytDlpError.message}`);
      }
      
      // Find the downloaded file
      const downloadedFile = await this.findDownloadedFile(videoId, platform);
      
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        const stats = fs.statSync(downloadedFile);
        console.log(chalk.green(`✅ Downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`));
        console.log(chalk.green(`📁 File location: ${downloadedFile}`));
        
        return {
          ...videoInfo,
          localPath: downloadedFile,
          fileSize: stats.size,
          alreadyExists: false
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
   * Find downloaded file by searching for files with video ID
   */
  async findDownloadedFile(videoId, platform) {
    try {
      const files = fs.readdirSync(this.outputDir);
      
      // Look for files containing the video ID
      const matchingFiles = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerVideoId = videoId.toLowerCase();
        const lowerPlatform = platform.toLowerCase();
        
        return (lowerFile.includes(lowerVideoId) || 
                lowerFile.includes(lowerPlatform)) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (matchingFiles.length > 0) {
        // Return the most recent file
        const sortedFiles = matchingFiles.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
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
   * Get platform-specific download options
   */
  getDownloadOptions(platform, userOptions = {}) {
    const baseOptions = [
      '--format', 'best[height<=1080]/best',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--ignore-errors',
      '--no-check-certificate'
    ];

    const platformOptions = {
      'YouTube': [
        '--format', 'best[ext=mp4][height<=1080]/best[ext=mp4]/best',
        '--embed-subs',
        '--write-auto-sub'
      ],
      'TikTok': [
        '--format', 'best',
        '--no-check-certificate',
        '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      ],
      'Instagram': [
        '--format', 'best',
        '--no-check-certificate'
      ],
      'Facebook': [
        '--format', 'best',
        '--no-check-certificate'
      ],
      'Twitter': [
        '--format', 'best',
        '--no-check-certificate'
      ]
    };

    let options = [...baseOptions];
    
    if (platformOptions[platform]) {
      // Replace base format option with platform-specific one
      options = options.filter(opt => opt !== 'best[height<=1080]/best');
      options.push(...platformOptions[platform]);
    }

    // Add user-specified options
    if (userOptions.quality) {
      options = options.filter(opt => !opt.includes('height<='));
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