const inquirer = require("inquirer");
const chalk = require("chalk");
const ytDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');
const ffmpeg = require("fluent-ffmpeg");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Set FFmpeg path
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

/**
 * Multi-Platform Downloader Class - FIXED
 */
class MultiPlatformDownloader {
  constructor() {
    this.ytDlp = new ytDlpWrap();
    this.outputDir = path.join(__dirname, 'videos/raw');
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
    
    fs.ensureDirSync(this.outputDir);
  }

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

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  getSupportedPlatforms() {
    return [...new Set(Object.values(this.supportedPlatforms))];
  }

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

  async downloadVideo(url, options = {}) {
    try {
      if (!this.isValidUrl(url)) {
        throw new Error('Invalid URL provided for download');
      }
      
      const platform = this.detectPlatform(url);
      console.log(chalk.cyan(`📥 Downloading from ${platform}...`));
      
      const videoInfo = await this.getVideoInfo(url);
      const videoId = videoInfo.id;
      
      const timestamp = Date.now();
      const outputFilename = `${platform.toLowerCase()}_${videoId}_${timestamp}.%(ext)s`;
      const outputTemplate = path.join(this.outputDir, outputFilename);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      
      const downloadOptions = this.getDownloadOptions(platform, options);
      
      const command = [
        url,
        '-o', outputTemplate,
        ...downloadOptions
      ];
      
      const cleanCommand = this.cleanCommandArray(command);
      
      console.log(chalk.gray(`🔧 Command: yt-dlp ${cleanCommand.join(' ')}`));
      
      try {
        await this.ytDlp.exec(cleanCommand);
      } catch (ytDlpError) {
        console.error(chalk.red(`❌ yt-dlp error: ${ytDlpError.message}`));
        throw new Error(`Download failed: ${ytDlpError.message}`);
      }
      
      const downloadedFile = await this.findDownloadedFile(videoId, platform, timestamp);
      
      if (downloadedFile && fs.existsSync(downloadedFile)) {
        const stats = fs.statSync(downloadedFile);
        console.log(chalk.green(`✅ Downloaded successfully! Size: ${(stats.size / 1024 / 1024).toFixed(2)}MB`));
        
        const finalFilename = `${platform.toLowerCase()}_${videoId}.mp4`;
        const finalPath = path.join(this.outputDir, finalFilename);
        
        if (downloadedFile !== finalPath) {
          try {
            await fs.move(downloadedFile, finalPath, { overwrite: true });
            console.log(chalk.blue(`📝 Renamed to: ${finalFilename}`));
          } catch (renameErr) {
            console.log(chalk.yellow(`⚠️ Could not rename file: ${renameErr.message}`));
          }
        }
        
        return {
          ...videoInfo,
          localPath: fs.existsSync(finalPath) ? finalPath : downloadedFile,
          fileSize: stats.size,
          alreadyExists: false,
          actualVideoId: videoId
        };
      } else {
        throw new Error('Download completed but file not found');
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Download failed: ${err.message}`));
      throw err;
    }
  }

  async findDownloadedFile(videoId, platform, timestamp) {
    try {
      const files = fs.readdirSync(this.outputDir);
      
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
      
      const videoIdMatches = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerVideoId = videoId.toLowerCase();
        
        return lowerFile.includes(lowerVideoId) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (videoIdMatches.length > 0) {
        const sortedFiles = videoIdMatches.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        return sortedFiles[0].path;
      }
      
      const platformMatches = files.filter(file => {
        const lowerFile = file.toLowerCase();
        const lowerPlatform = platform.toLowerCase();
        
        return lowerFile.includes(lowerPlatform) &&
               (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv'));
      });
      
      if (platformMatches.length > 0) {
        const sortedFiles = platformMatches.map(file => ({
          name: file,
          path: path.join(this.outputDir, file),
          stats: fs.statSync(path.join(this.outputDir, file))
        })).sort((a, b) => b.stats.mtime - a.stats.mtime);
        
        console.log(chalk.yellow(`⚠️ Using most recent ${platform} file: ${sortedFiles[0].name}`));
        return sortedFiles[0].path;
      }
      
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

  cleanCommandArray(command) {
    const cleanedCommand = [];
    const seenOptions = new Set();
    
    for (let i = 0; i < command.length; i++) {
      const current = command[i];
      
      if (!current || current.trim() === '') {
        continue;
      }
      
      if (current.startsWith('--')) {
        if (!seenOptions.has(current)) {
          seenOptions.add(current);
          cleanedCommand.push(current);
          
          if (i + 1 < command.length && !command[i + 1].startsWith('--')) {
            cleanedCommand.push(command[i + 1]);
            i++;
          }
        } else {
          if (i + 1 < command.length && !command[i + 1].startsWith('--')) {
            i++;
          }
        }
      } else {
        cleanedCommand.push(current);
      }
    }
    
    return cleanedCommand;
  }

  getDownloadOptions(platform, userOptions = {}) {
    const baseOptions = [
      '--merge-output-format', 'mp4',
      '--no-playlist',
      '--no-warnings',
      '--ignore-errors',
      '--no-check-certificate'
    ];

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

    let options = [...baseOptions];
    
    if (platformOptions[platform]) {
      options.push(...platformOptions[platform]);
    } else {
      options.push('--format', 'best[height<=1080]/best');
    }

    if (userOptions.quality) {
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

  async downloadMultiple(urls, options = {}) {
    const results = [];
    
    for (const url of urls) {
      try {
        if (!this.isValidUrl(url)) {
          throw new Error('Invalid URL format');
        }
        
        const result = await this.downloadVideo(url, options);
        results.push(result);
        
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

  // FIXED: Enhanced search with proper error handling
  async searchAndDownload(query, platform = 'YouTube', limit = 1) {
    try {
      if (!query || typeof query !== 'string' || query.trim().length === 0) {
        throw new Error('Invalid search query provided');
      }
      
      console.log(chalk.blue(`🔍 Searching ${platform} for: "${query}"`));
      
      if (platform.toLowerCase() !== 'youtube') {
        throw new Error(`Search only supported for YouTube. For other platforms, please provide direct URLs.`);
      }

      const searchResults = await yts(query);
      
      if (!searchResults || !searchResults.videos || searchResults.videos.length === 0) {
        throw new Error(`No videos found for query: ${query}`);
      }

      // FIXED: Enhanced search with proper filtering
      const videos = this.enhancedVideoFilter(searchResults.videos, query, limit);

      if (!videos || videos.length === 0) {
        console.log(chalk.yellow('⚠️ Enhanced search found no matches, using top results'));
        // Fallback to top results
        const fallbackVideos = searchResults.videos.slice(0, limit);
        return await this.downloadVideosFromResults(fallbackVideos);
      }

      console.log(chalk.green(`🎯 Found ${videos.length} relevant video(s)`));
      return await this.downloadVideosFromResults(videos);

    } catch (err) {
      console.error(chalk.red(`❌ Search and download failed: ${err.message}`));
      throw err;
    }
  }

  // FIXED: Enhanced video filtering with proper error handling
  enhancedVideoFilter(videos, query, limit) {
    try {
      const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
      
      const scoredVideos = videos.map(video => {
        let score = 0;
        const title = (video.title || '').toLowerCase();
        const description = (video.description || '').toLowerCase();
        
        // Title matching (higher weight)
        queryWords.forEach(word => {
          if (title.includes(word)) score += 3;
          if (description.includes(word)) score += 1;
        });
        
        // Duration filter (prefer 30s - 10min videos)
        const duration = video.duration?.seconds || 0;
        if (duration >= 30 && duration <= 600) {
          score += 2;
        }
        
        // Views filter - FIXED: Handle different view formats
        let viewCount = 0;
        if (video.views) {
          if (typeof video.views === 'string') {
            // Handle string views like "1.2M views", "500K views", etc.
            const viewStr = video.views.toLowerCase().replace(/[^0-9.kmb]/g, '');
            if (viewStr.includes('k')) {
              viewCount = parseFloat(viewStr) * 1000;
            } else if (viewStr.includes('m')) {
              viewCount = parseFloat(viewStr) * 1000000;
            } else if (viewStr.includes('b')) {
              viewCount = parseFloat(viewStr) * 1000000000;
            } else {
              viewCount = parseFloat(viewStr) || 0;
            }
          } else if (typeof video.views === 'number') {
            viewCount = video.views;
          }
        }
        
        // Prefer videos with decent view count
        if (viewCount > 1000) score += 1;
        if (viewCount > 100000) score += 2;
        
        return { ...video, relevanceScore: score };
      });
      
      // Sort by relevance score and return top results
      const sortedVideos = scoredVideos
        .filter(video => video.relevanceScore > 0)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, limit);
      
      console.log(chalk.blue(`📊 Top matches:`));
      sortedVideos.forEach((video, index) => {
        console.log(chalk.gray(`   ${index + 1}. ${video.title} (Score: ${video.relevanceScore})`));
      });
      
      return sortedVideos;
    } catch (err) {
      console.error(chalk.red(`❌ Error in enhanced filtering: ${err.message}`));
      // Return original videos as fallback
      return videos.slice(0, limit);
    }
  }

  async downloadVideosFromResults(videos) {
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
  }
}

/**
 * Video Analyzer Class
 */
class VideoAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.tempDir = path.join(__dirname, 'temp');
    fs.ensureDirSync(this.tempDir);
  }

  async extractFrames(videoPath, frameCount = 10) {
    try {
      console.log(chalk.cyan(`📸 Extracting ${frameCount} frames for analysis...`));
      
      const frames = [];
      const frameInterval = 100 / frameCount; // Distribute frames across video
      
      for (let i = 0; i < frameCount; i++) {
        const timestamp = `${i * frameInterval}%`;
        const framePath = path.join(this.tempDir, `frame_${i}.jpg`);
        
        await new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .seekInput(timestamp)
            .frames(1)
            .output(framePath)
            .on('end', resolve)
            .on('error', reject)
            .run();
        });
        
        if (fs.existsSync(framePath)) {
          const frameData = fs.readFileSync(framePath);
          frames.push({
            data: frameData.toString('base64'),
            mimeType: 'image/jpeg',
            timestamp: timestamp
          });
        }
      }
      
      console.log(chalk.green(`✅ Extracted ${frames.length} frames`));
      return frames;
    } catch (err) {
      console.error(chalk.red(`❌ Frame extraction failed: ${err.message}`));
      return [];
    }
  }

  async analyzeVideoContent(videoPath, videoTitle = '', videoDescription = '') {
    try {
      if (!this.genAI) {
        console.log(chalk.yellow('⚠️ No Gemini API key, using fallback analysis'));
        return this.getFallbackAnalysis(videoTitle, videoDescription);
      }

      console.log(chalk.cyan('🤖 Analyzing video content with Gemini AI...'));
      
      const frames = await this.extractFrames(videoPath, 10);
      
      if (frames.length === 0) {
        console.log(chalk.yellow('⚠️ No frames extracted, using text-only analysis'));
        return await this.analyzeTextOnly(videoTitle, videoDescription);
      }

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this video content and generate TikTok-optimized metadata.

Video Information:
- Title: "${videoTitle}"
- Description: "${videoDescription}"
- Frames: ${frames.length} frames extracted

Please analyze the visual content and provide:

1. **Title**: Catchy, viral-worthy title (max 60 chars)
2. **Description**: Engaging description (max 100 chars)  
3. **Tags**: 8-10 relevant hashtags for TikTok
4. **Category**: Main content category (anime/tech/horror/music/dance/comedy/etc)

Format your response as JSON:
{
  "title": "...",
  "description": "...", 
  "tags": ["tag1", "tag2", ...],
  "category": "..."
}`;

      const imageParts = frames.map(frame => ({
        inlineData: {
          data: frame.data,
          mimeType: frame.mimeType
        }
      }));

      const result = await model.generateContent([prompt, ...imageParts]);
      const response = await result.response;
      const text = response.text();
      
      try {
        const analysis = JSON.parse(text);
        console.log(chalk.green('✅ Multi-frame AI analysis completed!'));
        return analysis;
      } catch (parseErr) {
        console.log(chalk.yellow('⚠️ AI response parsing failed, extracting data manually'));
        return this.parseAIResponse(text);
      }

    } catch (err) {
      console.error(chalk.red(`❌ AI analysis failed: ${err.message}`));
      return this.getFallbackAnalysis(videoTitle, videoDescription);
    } finally {
      // Cleanup temp frames
      this.cleanupTempFrames();
    }
  }

  async analyzeTextOnly(videoTitle, videoDescription) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Based on this video title and description, generate TikTok metadata:

Title: "${videoTitle}"
Description: "${videoDescription}"

Generate:
1. Catchy TikTok title (max 60 chars)
2. Engaging description (max 100 chars)
3. 8-10 relevant hashtags
4. Content category

Return as JSON:
{
  "title": "...",
  "description": "...",
  "tags": ["tag1", "tag2", ...],
  "category": "..."
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      try {
        return JSON.parse(text);
      } catch (parseErr) {
        return this.parseAIResponse(text);
      }
    } catch (err) {
      console.error(chalk.red(`❌ Text-only analysis failed: ${err.message}`));
      return this.getFallbackAnalysis(videoTitle, videoDescription);
    }
  }

  parseAIResponse(text) {
    try {
      const lines = text.split('\n');
      const analysis = {
        title: '',
        description: '',
        tags: [],
        category: 'general'
      };

      lines.forEach(line => {
        const lower = line.toLowerCase();
        if (lower.includes('title') && lower.includes(':')) {
          analysis.title = line.split(':')[1].trim().replace(/['"]/g, '');
        } else if (lower.includes('description') && lower.includes(':')) {
          analysis.description = line.split(':')[1].trim().replace(/['"]/g, '');
        } else if (lower.includes('category') && lower.includes(':')) {
          analysis.category = line.split(':')[1].trim().replace(/['"]/g, '');
        } else if (line.includes('#')) {
          const hashtags = line.match(/#\w+/g);
          if (hashtags) {
            analysis.tags.push(...hashtags.map(tag => tag.replace('#', '')));
          }
        }
      });

      return analysis;
    } catch (err) {
      console.error(chalk.red(`❌ Response parsing failed: ${err.message}`));
      return this.getFallbackAnalysis('', '');
    }
  }

  getFallbackAnalysis(videoTitle, videoDescription) {
    const text = `${videoTitle} ${videoDescription}`.toLowerCase();
    
    let category = 'general';
    let tags = ['viral', 'fyp', 'trending'];
    
    if (text.includes('anime') || text.includes('manga')) {
      category = 'anime';
      tags = ['anime', 'edit', 'amv', 'manga', 'otaku', 'viral', 'fyp'];
    } else if (text.includes('tech') || text.includes('ai') || text.includes('robot')) {
      category = 'tech';
      tags = ['tech', 'ai', 'technology', 'gadget', 'innovation', 'viral', 'fyp'];
    } else if (text.includes('horror') || text.includes('scary')) {
      category = 'horror';
      tags = ['horror', 'scary', 'creepy', 'thriller', 'nightmare', 'viral', 'fyp'];
    } else if (text.includes('music') || text.includes('song') || text.includes('dj')) {
      category = 'music';
      tags = ['music', 'song', 'beat', 'dj', 'dance', 'viral', 'fyp'];
    }

    return {
      title: videoTitle || 'Amazing Video Content!',
      description: videoDescription || 'Check out this incredible video!',
      tags: tags,
      category: category
    };
  }

  cleanupTempFrames() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        files.forEach(file => {
          if (file.startsWith('frame_')) {
            fs.removeSync(path.join(this.tempDir, file));
          }
        });
      }
    } catch (err) {
      console.error(chalk.red(`❌ Temp cleanup failed: ${err.message}`));
    }
  }
}

/**
 * Video Cleanup Class
 */
class VideoCleanup {
  constructor() {
    this.rawDir = path.join(__dirname, 'videos/raw');
    this.editedDir = path.join(__dirname, 'videos/edited');
    this.tempDir = path.join(__dirname, 'temp');
    
    fs.ensureDirSync(this.rawDir);
    fs.ensureDirSync(this.editedDir);
    fs.ensureDirSync(this.tempDir);
    
    this.protectedFiles = new Set();
    this.protectionTimers = new Map();
  }

  protectFile(filePath, durationMinutes = 60) {
    try {
      const absolutePath = path.resolve(filePath);
      this.protectedFiles.add(absolutePath);
      
      console.log(chalk.blue(`🛡️ Protected file from cleanup: ${path.basename(filePath)} (${durationMinutes}min)`));
      
      // Clear existing timer if any
      if (this.protectionTimers.has(absolutePath)) {
        clearTimeout(this.protectionTimers.get(absolutePath));
      }
      
      // Set new timer
      const timer = setTimeout(() => {
        this.protectedFiles.delete(absolutePath);
        this.protectionTimers.delete(absolutePath);
        console.log(chalk.gray(`🔓 File protection expired: ${path.basename(filePath)}`));
      }, durationMinutes * 60 * 1000);
      
      this.protectionTimers.set(absolutePath, timer);
    } catch (err) {
      console.error(chalk.red(`❌ Error protecting file: ${err.message}`));
    }
  }

  isFileProtected(filePath) {
    const absolutePath = path.resolve(filePath);
    return this.protectedFiles.has(absolutePath);
  }

  async cleanupOldFilesExceptCurrent(currentVideoPath = '', maxAgeHours = 2) {
    try {
      console.log(chalk.cyan('🧹 Performing cleanup of old files...'));
      
      const now = Date.now();
      const maxAge = maxAgeHours * 60 * 60 * 1000;
      
      const directories = [this.rawDir, this.editedDir, this.tempDir];
      let totalRemoved = 0;
      
      for (const dir of directories) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          
          // Skip if file is protected
          if (this.isFileProtected(filePath)) {
            console.log(chalk.blue(`🛡️ Skipping protected file: ${file}`));
            continue;
          }
          
          // Skip current video file
          if (currentVideoPath && filePath === path.resolve(currentVideoPath)) {
            console.log(chalk.blue(`📹 Skipping current video: ${file}`));
            continue;
          }
          
          try {
            const stats = fs.statSync(filePath);
            const fileAge = now - stats.mtime.getTime();
            
            if (fileAge > maxAge) {
              await fs.remove(filePath);
              console.log(chalk.gray(`🗑️ Removed old file: ${file} (${Math.round(fileAge / (60 * 60 * 1000))}h old)`));
              totalRemoved++;
            }
          } catch (err) {
            console.error(chalk.red(`❌ Error processing file ${filePath}: ${err.message}`));
          }
        }
      }
      
      if (totalRemoved > 0) {
        console.log(chalk.green(`✅ Cleaned up ${totalRemoved} old file(s)`));
      } else {
        console.log(chalk.gray(`✅ No old files to clean`));
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Cleanup error: ${err.message}`));
    }
  }

  async getStorageStats() {
    try {
      const stats = {
        raw: { count: 0, size: 0 },
        edited: { count: 0, size: 0 },
        temp: { count: 0, size: 0 },
        total: { count: 0, size: 0 }
      };
      
      const directories = [
        { key: 'raw', path: this.rawDir },
        { key: 'edited', path: this.editedDir },
        { key: 'temp', path: this.tempDir }
      ];
      
      for (const { key, path: dirPath } of directories) {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath);
          
          for (const file of files) {
            const filePath = path.join(dirPath, file);
            const fileStats = fs.statSync(filePath);
            
            if (fileStats.isFile()) {
              stats[key].count++;
              stats[key].size += fileStats.size;
              stats.total.count++;
              stats.total.size += fileStats.size;
            }
          }
        }
      }
      
      Object.keys(stats).forEach(key => {
        stats[key].sizeMB = (stats[key].size / (1024 * 1024)).toFixed(2);
      });
      
      return stats;
    } catch (err) {
      console.error(chalk.red(`❌ Error getting storage stats: ${err.message}`));
      return null;
    }
  }
}

/**
 * Edit Video Function
 */
async function editVideo(inputPath, outputName = "edited.mp4", options = {}) {
  const { startTime = "00:00:03", duration = 30, audio = true } = options;

  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("❌ Input video file does not exist.");
  }

  const editedVideosDir = path.join(__dirname, "videos", "edited");
  fs.ensureDirSync(editedVideosDir);

  const cleanedOutputName = path.basename(outputName);
  const outputPath = path.join(editedVideosDir, cleanedOutputName);

  console.log("📁 Saving to path:", outputPath);

  if (fs.existsSync(outputPath)) {
    fs.removeSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .videoCodec("libx264")
      .size("720x1280");

    if (!audio) {
      command.noAudio();
    }

    command
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`⏳ Processing: ${progress.percent.toFixed(1)}%`);
        }
      })
      .on("end", () => {
        console.log("✅ Video edited and saved to:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("❌ Error during video processing:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

/**
 * Process Video Audio Function
 */
async function processVideoAudio(videoPath, outputPath) {
  try {
    console.log(chalk.cyan(`🎵 Processing video with original audio...`));
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec('copy')
        .audioCodec('aac')
        .audioBitrate('128k')
        .on('end', () => {
          console.log(chalk.green(`✅ Audio processing completed: ${outputPath}`));
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(chalk.red(`❌ Error processing audio: ${err.message}`));
          reject(err);
        })
        .save(outputPath);
    });
    
  } catch (err) {
    console.error(chalk.red(`❌ Error in processVideoAudio: ${err.message}`));
    throw err;
  }
}

/**
 * Upload to TikTok Function
 */
async function uploadToTikTok(videoPath, caption = "#bot #foryou #edit #fyp") {
  const cookiesPath = path.join(__dirname, "cookies.json");

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  let loggedInWithCookies = false;
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath));
      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        loggedInWithCookies = true;
        console.log("🍪 Loaded saved cookies.");
      }
    } catch (err) {
      console.log("⚠️ Failed to load cookies:", err.message);
    }
  }

  try {
    console.log("🌐 Navigating to TikTok upload page...");
    await page.goto("https://www.tiktok.com/upload", { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    let isLoggedIn = false;
    try {
      await page.waitForSelector("input[type='file']", { timeout: 15000 });
      console.log("✅ Already logged in.");
      isLoggedIn = true;
    } catch {
      if (loggedInWithCookies) {
        console.error("❌ Saved cookies failed. Try logging in manually once.");
        await browser.close();
        return;
      }

      console.log("🧾 No saved cookies. Please log in manually (QR or password)...");

      try {
        await page.waitForSelector("input[type='file']", { timeout: 180000 });
        console.log("✅ Login successful!");
        isLoggedIn = true;

        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log("💾 Cookies saved.");
      } catch (e) {
        console.error("❌ Login timeout. Try again.");
        await browser.close();
        return;
      }
    }

    if (!isLoggedIn) {
      console.error("❌ Could not log in to TikTok");
      await browser.close();
      return;
    }

    const inputUploadHandle = await page.$("input[type='file']");
    if (!inputUploadHandle) {
      console.error("❌ Upload input not found");
      await browser.close();
      return;
    }

    const absoluteVideoPath = path.resolve(videoPath);
    if (!fs.existsSync(absoluteVideoPath)) {
      console.error("❌ Video not found:", absoluteVideoPath);
      await browser.close();
      return;
    }

    await inputUploadHandle.uploadFile(absoluteVideoPath);
    console.log("📤 Video uploaded:", videoPath);

    console.log("⏳ Waiting for video to process...");
    await new Promise(resolve => setTimeout(resolve, 8000));

    try {
      console.log("✍️ Adding caption...");
      
      const captionSelectors = [
        "div[contenteditable='true']",
        "div[data-text='true']",
        "textarea[placeholder*='caption']",
        "div[role='textbox']",
        "[data-e2e='editor']",
        ".public-DraftEditor-content"
      ];

      let captionInput = null;
      for (const selector of captionSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          captionInput = await page.$(selector);
          if (captionInput) {
            console.log(`✅ Found caption input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (captionInput) {
        await captionInput.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        
        await page.keyboard.type(caption);
        console.log("✍️ Caption added:", caption);
      } else {
        console.warn("⚠️ Could not find caption input field.");
      }
    } catch (err) {
      console.warn("⚠️ Could not add caption:", err.message);
    }

    await new Promise(resolve => setTimeout(resolve, 3000));

    try {
      console.log("🚀 Looking for Post button...");
      let posted = false;
      
      try {
        const specificSelector = "#root > div > div > div.css-fsbw52.ep9i2zp0 > div.css-86gjln.edss2sz5 > div > div > div > div.jsx-3335848873.footer > div > button.Button__root.Button__root--shape-default.Button__root--size-large.Button__root--type-primary.Button__root--loading-false > div.Button__content.Button__content--shape-default.Button__content--size-large.Button__content--type-primary.Button__content--loading-false";
        
        console.log("🎯 Trying specific selector...");
        await page.waitForSelector(specificSelector, { timeout: 10000 });
        const specificButton = await page.$(specificSelector);
        
        if (specificButton) {
          await specificButton.click();
          console.log("🚀 Posted to TikTok! (Strategy 1: Specific selector)");
          posted = true;
        }
      } catch (e) {
        console.log("Specific selector failed, trying alternative strategies...");
      }
      
      if (!posted) {
        try {
          const publishButton = await page.$('button[data-e2e="publish-button"]');
          if (publishButton) {
            await publishButton.click();
            console.log("🚀 Posted to TikTok! (Strategy 2: data-e2e)");
            posted = true;
          }
        } catch (e) {
          console.log("Strategy 2 failed, trying strategy 3...");
        }
      }
      
      if (!posted) {
        try {
          const postButton = await page.evaluateHandle(() => {
            const buttons = Array.from(document.querySelectorAll('button'));
            
            let targetButton = buttons.find(btn => {
              const classes = btn.className;
              return classes.includes('Button__root--type-primary') && 
                     classes.includes('Button__root--size-large');
            });
            
            if (!targetButton) {
              targetButton = buttons.find(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('post') || text.includes('publish') || text.includes('share');
              });
            }
            
            return targetButton;
          });
          
          if (postButton && postButton.asElement) {
            await postButton.asElement().click();
            console.log("🚀 Posted to TikTok! (Strategy 3: class + text search)");
            posted = true;
          }
        } catch (e) {
          console.log("Strategy 3 failed, trying strategy 4...");
        }
      }
      
      if (!posted) {
        const buttonSelectors = [
          'button[type="submit"]',
          'div[role="button"]',
          '.btn-post',
          '.publish-btn',
          'button.Button__root--type-primary'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await page.evaluate(el => el.textContent, element);
              if (text && (text.toLowerCase().includes('post') || text.toLowerCase().includes('publish'))) {
                await element.click();
                console.log(`🚀 Posted to TikTok! (Strategy 4: ${selector})`);
                posted = true;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!posted) {
        console.warn("⚠️ Could not find or click post button automatically");
        console.log("📝 Video uploaded and caption added. Please click 'Post' manually.");
        console.log("🔍 The browser will stay open for 30 seconds for manual posting...");
        await new Promise(resolve => setTimeout(resolve, 30000));
      } else {
        console.log("⏳ Waiting for post to complete...");
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      
    } catch (err) {
      console.warn("⚠️ Error with post button:", err.message);
      console.log("📝 Video uploaded but may need manual posting");
    }

    console.log("✅ TikTok upload process completed!");
    
  } catch (err) {
    console.error("❌ Error during TikTok upload:", err.message);
  } finally {
    await browser.close();
  }
}

/**
 * Generate Caption Function
 */
async function generateCaption(analysis) {
  try {
    console.log('📋 Generating TikTok caption...');
    
    const { title, description, tags, category } = analysis;
    
    // Create hashtags string
    const hashtagString = tags.map(tag => `#${tag}`).join(' ');
    
    // Generate caption
    let caption = '';
    
    if (title && title.length > 0) {
      caption += `🔥 ${title}\n\n`;
    }
    
    if (description && description.length > 0) {
      caption += `${description}\n\n`;
    }
    
    caption += hashtagString;
    
    // Ensure caption is not too long (TikTok limit is around 300 chars)
    if (caption.length > 280) {
      caption = caption.substring(0, 280) + '...';
    }
    
    console.log(chalk.green('✅ Caption generated successfully!'));
    return caption;
    
  } catch (err) {
    console.error(chalk.red(`❌ Caption generation failed: ${err.message}`));
    
    // Fallback caption
    const fallbackCaption = "🔥 Amazing content! Drop a ❤️ if you're vibing! #viral #fyp #trending #foryou";
    console.log(chalk.yellow('🔄 Using fallback caption'));
    return fallbackCaption;
  }
}

/**
 * Get Multi-Platform Videos Function
 */
async function getMultiPlatformVideos(sources, options = {}) {
  const downloader = new MultiPlatformDownloader();
  const results = [];

  console.log(chalk.cyan('🌐 Multi-Platform Video Fetcher Started'));
  console.log(chalk.gray(`Supported platforms: ${downloader.getSupportedPlatforms().join(', ')}`));

  try {
    if (typeof sources === 'string') {
      if (!sources || sources.trim().length === 0) {
        throw new Error('Empty search query or URL provided');
      }
      
      if (downloader.isValidUrl(sources)) {
        console.log(chalk.blue(`📥 Downloading from URL: ${sources}`));
        const result = await downloader.downloadVideo(sources, options);
        results.push(result);
      } else {
        console.log(chalk.blue(`🔍 Searching for: "${sources}"`));
        const searchResults = await downloader.searchAndDownload(
          sources, 
          options.platform || 'YouTube', 
          options.limit || 1
        );
        results.push(...searchResults);
      }
    } else if (Array.isArray(sources)) {
      if (sources.length === 0) {
        throw new Error('Empty URL array provided');
      }
      
      console.log(chalk.blue(`📥 Downloading ${sources.length} videos...`));
      const downloadResults = await downloader.downloadMultiple(sources, options);
      results.push(...downloadResults);
    } else {
      throw new Error('Invalid sources format. Provide URL string or array of URLs.');
    }

    const successful = results.filter(r => r.localPath && !r.error);
    const failed = results.filter(r => r.error);

    console.log(chalk.green(`✅ Successfully downloaded: ${successful.length} videos`));
    if (failed.length > 0) {
      console.log(chalk.red(`❌ Failed downloads: ${failed.length} videos`));
    }

    return successful;

  } catch (err) {
    console.error(chalk.red(`❌ Multi-platform download error: ${err.message}`));
    throw err;
  }
}

/**
 * Main TikTok Bot Function
 */
async function runTikTokBot() {
  console.log(chalk.blueBright("📱 TikTok All-in-One Bot"));
  console.log(chalk.gray("All functions integrated in one script!"));
  console.log(chalk.magenta("🎯 Enhanced Search & AI Analysis!"));
  console.log(chalk.green("🤖 Multi-frame Video Analysis with Gemini!"));

  const { inputType } = await inquirer.prompt([
    {
      type: "list",
      name: "inputType",
      message: "How do you want to get videos?",
      choices: [
        "🔗 Provide direct URLs",
        "🔍 Search by keyword (Enhanced Matching)"
      ],
    },
  ]);

  let results = [];
  let videoAnalysis = null;

  if (inputType === "🔗 Provide direct URLs") {
    const { urls } = await inquirer.prompt([
      {
        type: "input",
        name: "urls",
        message: "Enter video URLs (comma-separated for multiple):",
        validate: input => input.trim().length > 0 || "Please enter at least one URL"
      },
    ]);

    const urlList = urls.split(',').map(url => url.trim()).filter(url => url);
    
    try {
      results = await getMultiPlatformVideos(urlList, { quality: 1080 });
    } catch (err) {
      console.error(chalk.red(`❌ Failed to download videos: ${err.message}`));
      return;
    }

  } else if (inputType === "🔍 Search by keyword (Enhanced Matching)") {
    const { searchQuery } = await inquirer.prompt([
      {
        type: "input",
        name: "searchQuery",
        message: "Enter search keywords (be specific for better results):",
        validate: input => input.trim().length > 0 || "Please enter search keywords"
      },
    ]);

    console.log(chalk.cyan(`🎯 Searching for videos that match: "${searchQuery}"`));
    console.log(chalk.gray('💡 Tip: Use specific keywords for better matching'));
    
    try {
      results = await getMultiPlatformVideos(searchQuery, {
        platform: "YouTube",
        limit: 1,
        quality: 1080
      });
    } catch (err) {
      console.error(chalk.red(`❌ Failed to search and download: ${err.message}`));
      return;
    }
  }

  if (!results || results.length === 0) {
    console.error(chalk.red("❌ No videos found to process"));
    return;
  }

  // Initialize cleanup utility
  const videoCleanup = new VideoCleanup();
  
  // Process the first video
  const video = results[0];
  const videoId = video.videoId || video.actualVideoId || video.id;
  
  // Protect the current video file from cleanup
  videoCleanup.protectFile(video.localPath, 60); // Protect for 60 minutes
  
  // Perform cleanup of old files (but not the current one)
  console.log(chalk.cyan("🧹 Performing cleanup of old files..."));
  await videoCleanup.cleanupOldFilesExceptCurrent(video.localPath, 2);

  console.log(chalk.cyan(`🎬 Processing: ${video.title}`));
  console.log(chalk.gray(`📱 Platform: ${video.platform}`));
  console.log(chalk.gray(`📁 File: ${video.localPath}`));
  console.log(chalk.gray(`🆔 Video ID: ${videoId}`));

  let uploadSuccess = false;

  try {
    const rawPath = video.localPath;
    
    if (!fs.existsSync(rawPath)) {
      throw new Error(`❌ Input video file does not exist: ${rawPath}`);
    }
    
    const editedPath = path.join(__dirname, 'videos/edited', `${videoId}-edited.mp4`);
    const finalPath = path.join(__dirname, 'videos/edited', `${videoId}-final.mp4`);

    console.log(chalk.yellow("🎬 Editing video..."));
    await editVideo(rawPath, `${videoId}-edited.mp4`);

    console.log(chalk.yellow("🎵 Processing video with original audio..."));
    await processVideoAudio(editedPath, finalPath);

    // AI Video Analysis
    console.log(chalk.yellow("🤖 Analyzing video content with Gemini AI..."));
    const videoAnalyzer = new VideoAnalyzer();
    videoAnalysis = await videoAnalyzer.analyzeVideoContent(
      finalPath, 
      video.title || '', 
      video.description || ''
    );

    console.log(chalk.yellow("📝 Generating TikTok caption..."));
    const caption = await generateCaption(videoAnalysis);

    // Display final caption
    console.log(chalk.cyan('📋 Final TikTok Caption:'));
    console.log(chalk.gray('──────────────────────────────────────'));
    console.log(chalk.white(caption));
    console.log(chalk.gray('──────────────────────────────────────'));

    console.log(chalk.yellow("📤 Uploading to TikTok..."));
    await uploadToTikTok(finalPath, caption);

    uploadSuccess = true;
    console.log(chalk.green("🚀 Video posted successfully!"));
    
    // Display summary
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.gray(`   Title: ${video.title}`));
    console.log(chalk.gray(`   Platform: ${video.platform}`));
    console.log(chalk.gray(`   Category: ${videoAnalysis?.category || 'Unknown'}`));
    console.log(chalk.gray(`   Caption: ${caption}`));

  } catch (err) {
    uploadSuccess = false;
    console.error(chalk.red(`❌ Error processing video: ${err.message}`));
  } finally {
    // Cleanup after processing
    console.log(chalk.cyan("🧹 Performing post-processing cleanup..."));
    await videoCleanup.cleanupOldFilesExceptCurrent('', 0); // Clean all old files
    
    // Show final storage stats
    const finalStats = await videoCleanup.getStorageStats();
    if (finalStats) {
      console.log(chalk.cyan(`📊 Storage Usage:`));
      console.log(chalk.gray(`   Raw videos: ${finalStats.raw.count} files (${finalStats.raw.sizeMB}MB)`));
      console.log(chalk.gray(`   Edited videos: ${finalStats.edited.count} files (${finalStats.edited.sizeMB}MB)`));
      console.log(chalk.gray(`   Total: ${finalStats.total.count} files (${finalStats.total.sizeMB}MB)`));
    }
  }
}

/**
 * Main Function
 */
async function main() {
  console.log(chalk.blueBright("🤖 TikTok All-in-One Bot"));
  console.log(chalk.gray("All functions integrated in one script!"));

  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "What do you want to do?",
      choices: [
        "🎬 Process videos now (Interactive)",
        "🧹 Cleanup files only",
        "❌ Exit"
      ],
    },
  ]);

  try {
    switch (mode) {
      case "🎬 Process videos now (Interactive)":
        console.log(chalk.cyan("🎬 Starting interactive video processing..."));
        await runTikTokBot();
        break;
        
      case "🧹 Cleanup files only":
        console.log(chalk.cyan("🧹 Starting cleanup..."));
        const cleanup = new VideoCleanup();
        await cleanup.cleanupOldFilesExceptCurrent('', 0);
        console.log(chalk.green("✅ Cleanup completed!"));
        break;
        
      case "❌ Exit":
        console.log(chalk.gray("👋 Goodbye!"));
        process.exit(0);
        break;
        
      default:
        console.log(chalk.red("❌ Invalid option selected"));
        process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
    process.exit(1);
  }
}

// Export classes and functions for external use
module.exports = {
  main,
  runTikTokBot,
  MultiPlatformDownloader,
  VideoAnalyzer,
  VideoCleanup,
  editVideo,
  processVideoAudio,
  uploadToTikTok,
  generateCaption,
  getMultiPlatformVideos
};

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal error: ${err.message}`));
    process.exit(1);
  });
}