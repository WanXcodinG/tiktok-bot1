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
   * Download video from any supported platform - SIMPLIFIED & FIXED
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
      
      // SIMPLIFIED: Just count files before and after
      const filesBefore = this.getVideoFileNames();
      console.log(chalk.gray(`📁 Files before download: ${filesBefore.length}`));
      
      // Create simple filename without timestamp complications
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
      
      // Remove any duplicate options
      const cleanCommand = this.cleanCommandArray(command);
      
      console.log(chalk.gray(`🔧 Command: yt-dlp ${cleanCommand.join(' ')}`));
      
      try {
        await this.ytDlp.exec(cleanCommand);
      } catch (ytDlpError) {
        console.error(chalk.red(`❌ yt-dlp error: ${ytDlpError.message}`));
        throw new Error(`Download failed: ${ytDlpError.message}`);
      }
      
      // Wait for file system to update
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // SIMPLIFIED: Get files after download
      const filesAfter = this.getVideoFileNames();
      console.log(chalk.gray(`📁 Files after download: ${filesAfter.length}`));
      
      // Find the new file - MUCH SIMPLER APPROACH
      let downloadedFile = null;
      
      // Strategy 1: Look for exact filename match
      const expectedFilename = `${platform.toLowerCase()}_${videoId}.mp4`;
      const expectedPath = path.join(this.outputDir, expectedFilename);
      
      if (fs.existsSync(expectedPath)) {
        downloadedFile = expectedPath;
        console.log(chalk.green(`✅ Found expected file: ${expectedFilename}`));
      } else {
        // Strategy 2: Look for any file with the video ID
        const matchingFiles = filesAfter.filter(file => 
          file.toLowerCase().includes(videoId.toLowerCase())
        );
        
        if (matchingFiles.length > 0) {
          // Use the first matching file
          downloadedFile = path.join(this.outputDir, matchingFiles[0]);
          console.log(chalk.blue(`🔍 Found matching file: ${matchingFiles[0]}`));
          
          // Rename to expected format
          try {
            if (downloadedFile !== expectedPath) {
              await fs.move(downloadedFile, expectedPath, { overwrite: true });
              downloadedFile = expectedPath;
              console.log(chalk.blue(`📝 Renamed to: ${expectedFilename}`));
            }
          } catch (renameErr) {
            console.log(chalk.yellow(`⚠️ Could not rename: ${renameErr.message}`));
          }
        } else {
          // Strategy 3: Look for new files (files that weren't there before)
          const newFiles = filesAfter.filter(file => !filesBefore.includes(file));
          
          if (newFiles.length > 0) {
            // Use the first new file
            downloadedFile = path.join(this.outputDir, newFiles[0]);
            console.log(chalk.blue(`🆕 Found new file: ${newFiles[0]}`));
            
            // Try to rename to expected format
            try {
              await fs.move(downloadedFile, expectedPath, { overwrite: true });
              downloadedFile = expectedPath;
              console.log(chalk.blue(`📝 Renamed to: ${expectedFilename}`));
            } catch (renameErr) {
              console.log(chalk.yellow(`⚠️ Could not rename: ${renameErr.message}`));
            }
          } else {
            // Strategy 4: Use most recent file as last resort
            const allFiles = this.getDetailedVideoFiles();
            if (allFiles.length > 0) {
              const mostRecent = allFiles[0]; // Already sorted by newest first
              downloadedFile = mostRecent.path;
              console.log(chalk.yellow(`⚠️ Using most recent file: ${mostRecent.name}`));
              
              // Try to rename to expected format
              try {
                await fs.move(downloadedFile, expectedPath, { overwrite: true });
                downloadedFile = expectedPath;
                console.log(chalk.blue(`📝 Renamed to: ${expectedFilename}`));
              } catch (renameErr) {
                console.log(chalk.yellow(`⚠️ Could not rename: ${renameErr.message}`));
              }
            }
          }
        }
      }
      
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        const stats = fs.statSync(downloadedFile);
        console.log(chalk.green(`✅ Downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`));
        console.log(chalk.green(`📁 File location: ${downloadedFile}`));
        
        return {
          ...videoInfo,
          localPath: downloadedFile,
          fileSize: stats.size,
          alreadyExists: false,
          actualVideoId: videoId
        };
      } else {
        // Enhanced error reporting
        console.error(chalk.red(`❌ No file found after download for video ID: ${videoId}`));
        
        // Debug: List all files in directory
        const allFiles = this.getDetailedVideoFiles();
        console.log(chalk.gray(`📁 Available files after download:`));
        allFiles.forEach(file => {
          const ageMinutes = Math.round((Date.now() - file.mtime) / (60 * 1000));
          console.log(chalk.gray(`   - ${file.name} (${ageMinutes}min ago, ${(file.size / 1024 / 1024).toFixed(2)}MB)`));
        });
        
        throw new Error('Download completed but file not found');
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Download failed: ${err.message}`));
      throw err;
    }
  }

  /**
   * Get simple list of video file names
   */
  getVideoFileNames() {
    try {
      if (!fs.existsSync(this.outputDir)) {
        return [];
      }
      
      return fs.readdirSync(this.outputDir).filter(file => {
        const lowerFile = file.toLowerCase();
        return (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv') ||
                lowerFile.endsWith('.avi') ||
                lowerFile.endsWith('.mov')) &&
               !lowerFile.endsWith('.part') && // Skip partial downloads
               !lowerFile.includes('.tmp'); // Skip temp files
      });
    } catch (err) {
      console.error(chalk.red(`❌ Error getting video file names: ${err.message}`));
      return [];
    }
  }

  /**
   * Get all video files with detailed information (name, path, mtime, size)
   */
  getDetailedVideoFiles() {
    try {
      if (!fs.existsSync(this.outputDir)) {
        return [];
      }
      
      const files = this.getVideoFileNames();
      
      return files.map(file => {
        const filePath = path.join(this.outputDir, file);
        const stats = fs.statSync(filePath);
        return {
          name: file,
          path: filePath,
          mtime: stats.mtime.getTime(),
          size: stats.size
        };
      }).sort((a, b) => b.mtime - a.mtime); // Sort by newest first
      
    } catch (err) {
      console.error(chalk.red(`❌ Error getting detailed video files: ${err.message}`));
      return [];
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
   * Get platform-specific download options
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
   * Search and download from YouTube - IMPROVED SEARCH ACCURACY
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

      // Use yt-search for YouTube search with improved filtering
      const searchResults = await yts(query);
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        throw new Error(`No videos found for query: ${query}`);
      }

      console.log(chalk.cyan(`🎯 Found ${searchResults.videos.length} total results`));

      // IMPROVED: Filter videos to match search intent better
      const filteredVideos = this.filterSearchResults(searchResults.videos, query, limit);
      
      if (filteredVideos.length === 0) {
        console.log(chalk.yellow('⚠️ No videos matched the search criteria, using top results'));
        // Fallback to top results if filtering is too strict
        const fallbackVideos = searchResults.videos.slice(0, limit);
        return await this.downloadFilteredVideos(fallbackVideos, query);
      }

      console.log(chalk.green(`✅ Selected ${filteredVideos.length} video(s) matching: "${query}"`));
      
      return await this.downloadFilteredVideos(filteredVideos, query);

    } catch (err) {
      console.error(chalk.red(`❌ Search and download failed: ${err.message}`));
      throw err;
    }
  }

  /**
   * Filter search results to better match user intent - NEW METHOD
   */
  filterSearchResults(videos, query, limit) {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    
    // Score videos based on relevance
    const scoredVideos = videos.map(video => {
      const title = video.title.toLowerCase();
      const description = (video.description || '').toLowerCase();
      const uploader = video.author?.name?.toLowerCase() || '';
      
      let score = 0;
      
      // Title matching (highest weight)
      queryWords.forEach(word => {
        if (title.includes(word)) {
          score += 10;
        }
        // Partial matches
        if (title.includes(word.substring(0, Math.max(3, word.length - 1)))) {
          score += 5;
        }
      });
      
      // Description matching (medium weight)
      queryWords.forEach(word => {
        if (description.includes(word)) {
          score += 3;
        }
      });
      
      // Uploader matching (low weight)
      queryWords.forEach(word => {
        if (uploader.includes(word)) {
          score += 1;
        }
      });
      
      // Bonus for exact phrase match
      if (title.includes(query.toLowerCase())) {
        score += 20;
      }
      
      // Penalty for very long videos (over 30 minutes)
      const duration = video.duration?.seconds || 0;
      if (duration > 1800) {
        score -= 5;
      }
      
      // Bonus for reasonable duration (1-20 minutes)
      if (duration >= 60 && duration <= 1200) {
        score += 2;
      }
      
      return {
        ...video,
        relevanceScore: score
      };
    });
    
    // Sort by relevance score and take top results
    const sortedVideos = scoredVideos
      .filter(video => video.relevanceScore > 0) // Only videos with some relevance
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    // Log the selection process
    console.log(chalk.gray(`📊 Top matches:`));
    sortedVideos.slice(0, 3).forEach((video, index) => {
      console.log(chalk.gray(`   ${index + 1}. "${video.title}" (Score: ${video.relevanceScore})`));
    });
    
    return sortedVideos;
  }

  /**
   * Download filtered videos - NEW METHOD
   */
  async downloadFilteredVideos(videos, originalQuery) {
    const downloadResults = [];
    
    for (const video of videos) {
      try {
        console.log(chalk.cyan(`📥 Processing: ${video.title}`));
        console.log(chalk.gray(`🎯 Relevance score: ${video.relevanceScore || 'N/A'}`));
        console.log(chalk.gray(`⏱️ Duration: ${video.duration?.timestamp || 'Unknown'}`));
        
        const downloadResult = await this.downloadVideo(video.url);
        
        // Add search metadata
        downloadResult.searchQuery = originalQuery;
        downloadResult.relevanceScore = video.relevanceScore;
        downloadResult.searchRank = videos.indexOf(video) + 1;
        
        downloadResults.push(downloadResult);
      } catch (err) {
        console.error(chalk.red(`❌ Failed to download ${video.title}: ${err.message}`));
        downloadResults.push({
          url: video.url,
          title: video.title,
          error: err.message,
          success: false,
          searchQuery: originalQuery
        });
      }
    }

    return downloadResults.filter(result => !result.error);
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