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
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace('www.', '').replace('m.', '');
      
      for (const [domain, platform] of Object.entries(this.supportedPlatforms)) {
        if (hostname.includes(domain.replace('.com', ''))) {
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
      throw err;
    }
  }

  /**
   * Download video from any supported platform
   */
  async downloadVideo(url, options = {}) {
    try {
      const platform = this.detectPlatform(url);
      console.log(chalk.cyan(`📥 Downloading from ${platform}...`));
      
      // Get video info first
      const videoInfo = await this.getVideoInfo(url);
      const videoId = videoInfo.id;
      const outputPath = path.join(this.outputDir, `${videoId}.mp4`);
      
      // Check if already downloaded
      if (fs.existsSync(outputPath)) {
        console.log(chalk.green(`✅ Video already exists: ${videoInfo.title}`));
        return {
          ...videoInfo,
          localPath: outputPath,
          alreadyExists: true
        };
      }

      // Download options based on platform
      const downloadOptions = this.getDownloadOptions(platform, options);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      console.log(chalk.gray(`📁 Saving to: ${outputPath}`));
      
      // Download the video
      await this.ytDlp.exec([
        url,
        '-o', outputPath,
        ...downloadOptions
      ]);

      // Verify download
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(chalk.green(`✅ Downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`));
        
        return {
          ...videoInfo,
          localPath: outputPath,
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
   * Get platform-specific download options
   */
  getDownloadOptions(platform, userOptions = {}) {
    const baseOptions = [
      '--format', 'best[height<=1080]',
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings'
    ];

    const platformOptions = {
      'YouTube': [
        '--format', 'best[ext=mp4][height<=1080]',
        '--embed-subs',
        '--write-auto-sub'
      ],
      'TikTok': [
        '--format', 'best',
        '--no-check-certificate'
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

    const options = [...baseOptions];
    
    if (platformOptions[platform]) {
      options.push(...platformOptions[platform]);
    }

    // Add user-specified options
    if (userOptions.quality) {
      options.push('--format', `best[height<=${userOptions.quality}]`);
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
        const result = await this.downloadVideo(url, options);
        results.push(result);
        
        // Add delay between downloads to be respectful
        if (urls.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
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