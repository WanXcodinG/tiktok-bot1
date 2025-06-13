// ============================================================================
// 🤖 TikTok All-in-One Bot - Complete Script
// ============================================================================
// Semua fungsi dalam satu file: Download, Edit, AI Analysis, Upload
// Author: Cyber_Jay
// Version: 2.0.0
// ============================================================================

const inquirer = require("inquirer");
const chalk = require("chalk");
const puppeteer = require("puppeteer");
const ytDlpWrap = require('yt-dlp-wrap').default;
const yts = require('yt-search');
const ffmpeg = require("fluent-ffmpeg");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs-extra');
const path = require('path');
const crypto = require('crypto');
require("dotenv").config();

// ============================================================================
// 🔧 CONFIGURATION
// ============================================================================

// Set FFmpeg path (update sesuai lokasi FFmpeg Anda)
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

// Directories
const DIRS = {
  raw: path.join(__dirname, 'videos/raw'),
  edited: path.join(__dirname, 'videos/edited'),
  temp: path.join(__dirname, 'temp'),
  cookies: path.join(__dirname, 'cookies.json')
};

// Ensure directories exist
Object.values(DIRS).forEach(dir => {
  if (dir !== DIRS.cookies) {
    fs.ensureDirSync(dir);
  }
});

// ============================================================================
// 🌐 MULTI-PLATFORM DOWNLOADER CLASS
// ============================================================================

class MultiPlatformDownloader {
  constructor() {
    this.ytDlp = new ytDlpWrap();
    this.outputDir = DIRS.raw;
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
  }

  detectPlatform(url) {
    try {
      if (!url || typeof url !== 'string') return 'Invalid URL';
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

  async getVideoInfo(url) {
    try {
      if (!this.isValidUrl(url)) throw new Error('Invalid URL provided');
      
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
      if (!this.isValidUrl(url)) throw new Error('Invalid URL provided for download');
      
      const platform = this.detectPlatform(url);
      console.log(chalk.cyan(`📥 Downloading from ${platform}...`));
      
      const videoInfo = await this.getVideoInfo(url);
      const videoId = videoInfo.id;
      
      const timestamp = Date.now();
      const outputFilename = `${platform.toLowerCase()}_${videoId}_${timestamp}.%(ext)s`;
      const outputTemplate = path.join(this.outputDir, outputFilename);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      console.log(chalk.gray(`📁 Output template: ${outputTemplate}`));
      
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
        console.log(chalk.green(`📁 File location: ${downloadedFile}`));
        
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
      
      if (!current || current.trim() === '') continue;
      
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
      'YouTube': ['--format', 'best[ext=mp4][height<=1080]/best[ext=mp4]/best'],
      'TikTok': ['--format', 'best', '--user-agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'],
      'Instagram': ['--format', 'best'],
      'Facebook': ['--format', 'best'],
      'Twitter': ['--format', 'best']
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

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  isValidUrl(url) {
    try {
      if (!url || typeof url !== 'string') return false;
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// 🤖 VIDEO ANALYZER CLASS
// ============================================================================

class VideoAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  async extractFrames(videoPath, numFrames = 10) {
    try {
      console.log(chalk.cyan(`📸 Extracting ${numFrames} frames for analysis...`));
      
      const frameDir = path.join(DIRS.temp, `frames_${Date.now()}`);
      fs.ensureDirSync(frameDir);
      
      const frames = [];
      
      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .on('end', () => {
            const frameFiles = fs.readdirSync(frameDir)
              .filter(file => file.endsWith('.jpg'))
              .sort()
              .slice(0, numFrames);
            
            for (const frameFile of frameFiles) {
              const framePath = path.join(frameDir, frameFile);
              if (fs.existsSync(framePath)) {
                const frameData = fs.readFileSync(framePath);
                frames.push({
                  data: frameData.toString('base64'),
                  mimeType: 'image/jpeg'
                });
              }
            }
            
            // Cleanup frame directory
            fs.removeSync(frameDir);
            
            console.log(chalk.green(`✅ Extracted ${frames.length} frames`));
            resolve(frames);
          })
          .on('error', (err) => {
            console.error(chalk.red(`❌ Frame extraction error: ${err.message}`));
            fs.removeSync(frameDir);
            reject(err);
          })
          .output(path.join(frameDir, 'frame_%03d.jpg'))
          .outputOptions([
            '-vf', `fps=1/${Math.max(1, Math.floor(30 / numFrames))}`,
            '-q:v', '2'
          ])
          .run();
      });
    } catch (err) {
      console.error(chalk.red(`❌ Error extracting frames: ${err.message}`));
      return [];
    }
  }

  async analyzeVideoContent(videoPath, title = '', description = '') {
    try {
      if (!this.genAI) {
        console.log(chalk.yellow('⚠️ No Gemini API key found, using fallback analysis'));
        return this.getFallbackAnalysis(title, description);
      }

      console.log(chalk.cyan('🤖 Analyzing video content with Gemini AI...'));
      
      const frames = await this.extractFrames(videoPath, 10);
      
      if (frames.length === 0) {
        console.log(chalk.yellow('⚠️ No frames extracted, using text-only analysis'));
        return await this.analyzeTextOnly(title, description);
      }

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this video content and generate TikTok-optimized metadata.

Video Information:
- Title: "${title}"
- Description: "${description}"
- Frames: ${frames.length} frames extracted

Please analyze the visual content and provide:

1. TITLE: A catchy, viral TikTok title (max 100 chars)
2. DESCRIPTION: Brief description of what's happening (max 150 chars)  
3. TAGS: 10 relevant hashtags for TikTok (include #viral #fyp #trending)
4. CATEGORY: Main category (music, dance, comedy, education, etc.)
5. MOOD: Overall mood/vibe (energetic, chill, funny, dramatic, etc.)

Format your response as JSON:
{
  "title": "...",
  "description": "...", 
  "tags": ["#viral", "#fyp", ...],
  "category": "...",
  "mood": "..."
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
        const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
        console.log(chalk.green('✅ Multi-frame AI analysis completed!'));
        return analysis;
      } catch (parseErr) {
        console.log(chalk.yellow('⚠️ Failed to parse AI response, using fallback'));
        return this.getFallbackAnalysis(title, description);
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Video analysis error: ${err.message}`));
      return this.getFallbackAnalysis(title, description);
    }
  }

  async analyzeTextOnly(title, description) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Based on this video title and description, generate TikTok metadata:

Title: "${title}"
Description: "${description}"

Provide JSON response with: title, description, tags, category, mood`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      const analysis = JSON.parse(text.replace(/```json\n?|\n?```/g, ''));
      return analysis;
    } catch (err) {
      return this.getFallbackAnalysis(title, description);
    }
  }

  getFallbackAnalysis(title, description) {
    const text = `${title} ${description}`.toLowerCase();
    
    let category = 'entertainment';
    let mood = 'energetic';
    let tags = ['#viral', '#fyp', '#trending', '#foryou'];
    
    if (text.includes('music') || text.includes('song') || text.includes('dj')) {
      category = 'music';
      tags.push('#music', '#song', '#beat', '#dance');
    } else if (text.includes('funny') || text.includes('comedy')) {
      category = 'comedy';
      mood = 'funny';
      tags.push('#funny', '#comedy', '#laugh', '#humor');
    } else if (text.includes('dance')) {
      category = 'dance';
      tags.push('#dance', '#dancing', '#moves', '#choreography');
    } else if (text.includes('food')) {
      category = 'food';
      tags.push('#food', '#cooking', '#recipe', '#foodie');
    }
    
    return {
      title: title || 'Amazing Video Content!',
      description: description || 'Check out this incredible video!',
      tags: tags,
      category: category,
      mood: mood
    };
  }
}

// ============================================================================
// 🧹 VIDEO CLEANUP CLASS
// ============================================================================

class VideoCleanup {
  constructor() {
    this.protectedFiles = new Map();
  }

  protectFile(filePath, durationMinutes = 30) {
    const expiryTime = Date.now() + (durationMinutes * 60 * 1000);
    this.protectedFiles.set(filePath, expiryTime);
    console.log(chalk.blue(`🛡️ Protected file from cleanup: ${path.basename(filePath)} (${durationMinutes}min)`));
  }

  isFileProtected(filePath) {
    const expiryTime = this.protectedFiles.get(filePath);
    if (!expiryTime) return false;
    
    if (Date.now() > expiryTime) {
      this.protectedFiles.delete(filePath);
      return false;
    }
    
    return true;
  }

  async cleanupOldFilesExceptCurrent(currentVideoId, maxAgeMinutes = 30) {
    try {
      console.log(chalk.cyan(`🧹 Cleaning files older than ${maxAgeMinutes} minutes (protecting current video)...`));
      
      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000;
      
      const directories = [DIRS.raw, DIRS.edited];
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
          
          // Skip if file contains current video ID
          if (currentVideoId && file.includes(currentVideoId)) {
            console.log(chalk.blue(`🎯 Skipping current video file: ${file}`));
            continue;
          }
          
          const stats = fs.statSync(filePath);
          const fileAge = now - stats.mtime.getTime();
          
          if (fileAge > maxAge) {
            try {
              await fs.remove(filePath);
              console.log(chalk.gray(`🗑️ Removed old file: ${file} (${Math.round(fileAge / (60 * 1000))}min old)`));
              totalRemoved++;
            } catch (err) {
              console.error(chalk.red(`❌ Failed to remove old file ${filePath}: ${err.message}`));
            }
          }
        }
      }
      
      if (totalRemoved > 0) {
        console.log(chalk.green(`✅ Removed ${totalRemoved} old file(s)`));
      } else {
        console.log(chalk.gray(`✅ No old files to remove`));
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning old files: ${err.message}`));
    }
  }

  async cleanupAfterUpload(videoId, success = true) {
    try {
      console.log(chalk.cyan(`🧹 Post-upload cleanup for video: ${videoId}`));
      
      if (success) {
        console.log(chalk.green(`✅ Upload successful - cleaning up all files`));
        await this.cleanupVideoFiles(videoId, false);
      } else {
        console.log(chalk.yellow(`⚠️ Upload failed - keeping raw file, removing processed files`));
        const processedFiles = [
          path.join(DIRS.edited, `${videoId}-edited.mp4`),
          path.join(DIRS.edited, `${videoId}-final.mp4`)
        ];
        
        for (const filePath of processedFiles) {
          try {
            if (fs.existsSync(filePath)) {
              await fs.remove(filePath);
              console.log(chalk.gray(`🗑️ Removed processed file: ${path.basename(filePath)}`));
            }
          } catch (err) {
            console.error(chalk.red(`❌ Failed to remove ${filePath}: ${err.message}`));
          }
        }
      }
      
    } catch (err) {
      console.error(chalk.red(`❌ Error in post-upload cleanup: ${err.message}`));
    }
  }

  async cleanupVideoFiles(videoId, keepOriginal = false) {
    try {
      console.log(chalk.cyan(`🧹 Cleaning up files for video: ${videoId}`));
      
      const filesToClean = [];
      const allDirs = [DIRS.raw, DIRS.edited];
      
      for (const dir of allDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            const fileContainsId = file.includes(videoId) || 
                                  file.includes(videoId.replace(/[^a-zA-Z0-9]/g, '')) ||
                                  file.split('_').some(part => part === videoId);
            
            if (fileContainsId) {
              const filePath = path.join(dir, file);
              
              if (keepOriginal && dir === DIRS.raw && !file.includes('-edited') && !file.includes('-final')) {
                continue;
              }
              
              filesToClean.push(filePath);
            }
          }
        }
      }
      
      let removedCount = 0;
      for (const filePath of filesToClean) {
        try {
          if (fs.existsSync(filePath)) {
            await fs.remove(filePath);
            console.log(chalk.gray(`🗑️ Removed: ${path.basename(filePath)}`));
            removedCount++;
          }
        } catch (err) {
          console.error(chalk.red(`❌ Failed to remove ${filePath}: ${err.message}`));
        }
      }
      
      if (removedCount > 0) {
        console.log(chalk.green(`✅ Cleaned up ${removedCount} file(s) for video ${videoId}`));
      }
      
      return removedCount;
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning up video files: ${err.message}`));
      return 0;
    }
  }

  async getStorageStats() {
    try {
      const stats = {
        raw: { count: 0, size: 0 },
        edited: { count: 0, size: 0 },
        total: { count: 0, size: 0 }
      };
      
      const directories = [
        { key: 'raw', path: DIRS.raw },
        { key: 'edited', path: DIRS.edited }
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

// ============================================================================
// 🎬 VIDEO EDITOR FUNCTION
// ============================================================================

async function editVideo(inputPath, outputPath, options = {}) {
  const { startTime = "00:00:03", duration = 30, audio = true } = options;

  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("❌ Input video file does not exist.");
  }

  const outputDir = path.dirname(outputPath);
  fs.ensureDirSync(outputDir);

  if (fs.existsSync(outputPath)) {
    fs.removeSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .videoCodec("libx264")
      .size("720x1280"); // TikTok format

    if (!audio) {
      command.noAudio();
    } else {
      command.audioCodec("aac").audioBitrate("128k");
    }

    command
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(chalk.blue(`🎬 Editing progress: ${progress.percent.toFixed(1)}%`));
        }
      })
      .on("end", () => {
        console.log(chalk.green(`✅ Video edited successfully: ${outputPath}`));
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(chalk.red(`❌ Error during video editing: ${err.message}`));
        reject(err);
      })
      .save(outputPath);
  });
}

// ============================================================================
// 🎵 AUDIO PROCESSOR FUNCTION
// ============================================================================

async function processVideoAudio(inputPath, outputPath) {
  try {
    console.log(chalk.cyan('🎵 Processing video with original audio...'));
    
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input video file not found: ${inputPath}`);
    }
    
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('copy')
        .audioCodec('aac')
        .audioBitrate('128k')
        .on('start', (commandLine) => {
          console.log(chalk.gray(`🔧 FFmpeg command: ${commandLine}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(chalk.blue(`🎵 Audio processing: ${progress.percent.toFixed(1)}%`));
          }
        })
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

// ============================================================================
// 📤 TIKTOK UPLOADER FUNCTION
// ============================================================================

async function uploadToTikTok(videoPath, caption = "#viral #fyp #trending #foryou") {
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
  if (fs.existsSync(DIRS.cookies)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(DIRS.cookies));
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
        fs.writeFileSync(DIRS.cookies, JSON.stringify(cookies, null, 2));
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
      
      // Strategy 1: Specific selector
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
      
      // Strategy 2: data-e2e attribute
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
      
      // Strategy 3: Search by button classes and text content
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
      
      // Strategy 4: Common button selectors
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

// ============================================================================
// 🤖 AI CAPTION GENERATOR FUNCTION
// ============================================================================

async function generateCaption(videoPath, title = '', description = '') {
  console.log(chalk.cyan('🤖 Generating AI-powered caption...'));
  
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log(chalk.yellow("⚠️ GEMINI_API_KEY not found, using fallback caption"));
    return getFallbackCaption(title, description);
  }
  
  try {
    const analyzer = new VideoAnalyzer();
    const analysis = await analyzer.analyzeVideoContent(videoPath, title, description);
    
    const caption = formatTikTokCaption(analysis);
    console.log(chalk.green('✅ AI-generated caption created!'));
    console.log(chalk.cyan('📋 Final TikTok Caption:'));
    console.log(chalk.gray('──────────────────────────────────────'));
    console.log(chalk.white(caption));
    console.log(chalk.gray('──────────────────────────────────────'));
    
    return caption;
    
  } catch (err) {
    console.error(chalk.red(`❌ AI caption generation failed: ${err.message}`));
    return getFallbackCaption(title, description);
  }
}

function formatTikTokCaption(analysis) {
  const { title, description, tags, mood } = analysis;
  
  let caption = '';
  
  // Add engaging title
  if (title) {
    caption += `${title}\n\n`;
  }
  
  // Add description with emojis
  if (description) {
    let desc = description;
    
    // Add mood-based emojis
    if (mood === 'energetic') desc += ' 🔥';
    else if (mood === 'funny') desc += ' 😂';
    else if (mood === 'chill') desc += ' ✨';
    else if (mood === 'dramatic') desc += ' 🎬';
    else desc += ' ❤️';
    
    caption += `${desc}\n\n`;
  }
  
  // Add hashtags
  if (tags && tags.length > 0) {
    caption += tags.join(' ');
  } else {
    caption += '#viral #fyp #trending #foryou';
  }
  
  return caption;
}

function getFallbackCaption(title, description) {
  const fallbackCaptions = [
    "🔥 This hits different! Drop a ❤️ if you're vibing!\n\n#viral #fyp #trending #foryou #amazing",
    "✨ Can't stop watching this! What do you think?\n\n#viral #fyp #trending #foryou #content",
    "🎯 This is exactly what I needed today!\n\n#viral #fyp #trending #foryou #mood",
    "💯 Absolutely incredible! Save this for later!\n\n#viral #fyp #trending #foryou #save"
  ];
  
  const randomCaption = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
  console.log(chalk.blue('🔄 Using fallback caption'));
  return randomCaption;
}

// ============================================================================
// 🌐 MULTI-PLATFORM VIDEO FETCHER FUNCTION
// ============================================================================

async function getMultiPlatformVideos(sources, options = {}) {
  const downloader = new MultiPlatformDownloader();
  const results = [];

  console.log(chalk.cyan('🌐 Multi-Platform Video Fetcher Started'));
  console.log(chalk.gray(`Supported platforms: YouTube, TikTok, Instagram, Facebook, Twitter`));

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
        
        // Enhanced search with relevance scoring
        const searchResults = await searchWithRelevanceScoring(sources, options.limit || 1);
        results.push(...searchResults);
      }
    } else if (Array.isArray(sources)) {
      if (sources.length === 0) {
        throw new Error('Empty URL array provided');
      }
      
      console.log(chalk.blue(`📥 Downloading ${sources.length} videos...`));
      
      for (const url of sources) {
        try {
          const result = await downloader.downloadVideo(url, options);
          results.push(result);
        } catch (err) {
          console.error(chalk.red(`❌ Failed to download ${url}: ${err.message}`));
          results.push({ url, error: err.message });
        }
      }
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

// Enhanced search with relevance scoring
async function searchWithRelevanceScoring(query, limit = 1) {
  try {
    console.log(chalk.blue(`🔍 Searching YouTube for: "${query}"`));
    
    const searchResults = await yts(query);
    const videos = searchResults.videos;
    
    if (!videos || videos.length === 0) {
      throw new Error(`No videos found for query: ${query}`);
    }
    
    console.log(chalk.green(`🎯 Found ${videos.length} total results`));
    
    // Calculate relevance scores
    const scoredVideos = videos.map((video, index) => {
      const score = calculateRelevanceScore(video, query, index);
      return {
        ...video,
        relevanceScore: score,
        searchRank: index + 1
      };
    });
    
    // Sort by relevance score (highest first)
    scoredVideos.sort((a, b) => b.relevanceScore - a.relevanceScore);
    
    // Show top matches
    console.log(chalk.cyan('📊 Top matches:'));
    scoredVideos.slice(0, Math.min(3, scoredVideos.length)).forEach((video, i) => {
      console.log(chalk.gray(`   ${i + 1}. "${video.title}" (Score: ${video.relevanceScore})`));
    });
    
    // Select top videos
    const selectedVideos = scoredVideos.slice(0, limit);
    console.log(chalk.green(`✅ Selected ${selectedVideos.length} video(s) matching: "${query}"`));
    
    // Download selected videos
    const downloader = new MultiPlatformDownloader();
    const downloadResults = [];
    
    for (const video of selectedVideos) {
      try {
        console.log(chalk.cyan(`📥 Processing: ${video.title}`));
        console.log(chalk.gray(`🎯 Relevance score: ${video.relevanceScore}`));
        console.log(chalk.gray(`⏱️ Duration: ${video.duration.timestamp}`));
        
        const downloadResult = await downloader.downloadVideo(video.url);
        downloadResults.push({
          ...downloadResult,
          relevanceScore: video.relevanceScore,
          searchRank: video.searchRank,
          searchQuery: query
        });
      } catch (err) {
        console.error(chalk.red(`❌ Failed to download ${video.title}: ${err.message}`));
      }
    }
    
    return downloadResults;
    
  } catch (err) {
    console.error(chalk.red(`❌ Enhanced search failed: ${err.message}`));
    throw err;
  }
}

function calculateRelevanceScore(video, query, searchRank) {
  let score = 0;
  const queryWords = query.toLowerCase().split(' ');
  const title = video.title.toLowerCase();
  const description = (video.description || '').toLowerCase();
  
  // Title keyword matching (highest weight)
  queryWords.forEach(word => {
    if (title.includes(word)) {
      score += 10;
      // Bonus for exact word match
      if (title.split(' ').includes(word)) {
        score += 5;
      }
    }
  });
  
  // Description keyword matching
  queryWords.forEach(word => {
    if (description.includes(word)) {
      score += 3;
    }
  });
  
  // Duration preference (30 seconds to 10 minutes)
  const duration = video.duration?.seconds || 0;
  if (duration >= 30 && duration <= 600) {
    score += 5;
  } else if (duration > 600) {
    score -= 2; // Penalty for very long videos
  }
  
  // View count bonus (if available)
  if (video.views) {
    const viewCount = parseInt(video.views.replace(/[^0-9]/g, '')) || 0;
    if (viewCount > 100000) score += 3;
    if (viewCount > 1000000) score += 2;
  }
  
  // Search rank penalty (lower rank = higher penalty)
  score -= Math.floor(searchRank / 5);
  
  // Recent upload bonus
  if (video.ago && (video.ago.includes('day') || video.ago.includes('week'))) {
    score += 2;
  }
  
  return Math.max(0, score);
}

// ============================================================================
// 🤖 MAIN BOT FUNCTION
// ============================================================================

async function runTikTokBot() {
  console.log(chalk.blueBright("📱 TikTok All-in-One Bot"));
  console.log(chalk.gray("All functions integrated in one script!"));
  console.log(chalk.green("🎯 Enhanced Search & AI Analysis!"));
  console.log(chalk.magenta("🤖 Multi-frame Video Analysis with Gemini!"));

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
      
      results = results.map(result => ({
        ...result,
        videoId: result.actualVideoId || result.id || result.videoId
      }));
      
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
    console.log(chalk.gray("💡 Tip: Use specific keywords for better matching"));

    try {
      results = await getMultiPlatformVideos(searchQuery, {
        platform: "YouTube",
        limit: 1,
        quality: 1080
      });

      results = results.map(result => ({
        ...result,
        videoId: result.actualVideoId || result.id || result.videoId,
        searchQuery: searchQuery
      }));

      if (results.length > 0) {
        const video = results[0];
        console.log(chalk.green(`✅ Found matching video:`));
        console.log(chalk.blue(`   📺 Title: ${video.title}`));
        console.log(chalk.gray(`   🎯 Relevance Score: ${video.relevanceScore || 'N/A'}`));
        console.log(chalk.gray(`   📊 Search Rank: #${video.searchRank || 1}`));
        console.log(chalk.gray(`   ⏱️ Duration: ${video.duration || 'Unknown'}s`));
      }
      
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
  
  const video = results[0];
  const videoId = video.videoId || video.actualVideoId || video.id;
  console.log(chalk.cyan(`🎬 Processing: ${video.title}`));
  console.log(chalk.gray(`📱 Platform: ${video.platform}`));
  console.log(chalk.gray(`📁 File: ${video.localPath}`));
  console.log(chalk.gray(`🆔 Video ID: ${videoId}`));
  
  if (video.searchQuery) {
    console.log(chalk.magenta(`🔍 Search Query: "${video.searchQuery}"`));
  }

  // PROTECT THE DOWNLOADED FILE FROM CLEANUP
  if (video.localPath) {
    videoCleanup.protectFile(video.localPath, 60);
  }

  // Perform cleanup of OLD files only
  console.log(chalk.cyan("🧹 Performing cleanup of old files..."));
  await videoCleanup.cleanupOldFilesExceptCurrent(videoId, 30);

  let uploadSuccess = false;

  try {
    const rawPath = video.localPath;
    
    // Enhanced file verification
    if (!fs.existsSync(rawPath)) {
      console.error(chalk.red(`❌ Input video file does not exist: ${rawPath}`));
      
      console.log(chalk.yellow('🔍 Searching for video file with enhanced detection...'));
      const videoDir = path.dirname(rawPath);
      
      if (fs.existsSync(videoDir)) {
        const files = fs.readdirSync(videoDir).filter(file => {
          const lowerFile = file.toLowerCase();
          return !lowerFile.endsWith('.part') &&
                 !lowerFile.includes('.tmp') &&
                 (lowerFile.endsWith('.mp4') || 
                  lowerFile.endsWith('.webm') || 
                  lowerFile.endsWith('.mkv') ||
                  lowerFile.endsWith('.avi') ||
                  lowerFile.endsWith('.mov'));
        });
        
        console.log(chalk.gray(`📁 Available video files: ${files.join(', ')}`));
        
        let matchingFiles = files.filter(file => {
          const lowerFile = file.toLowerCase();
          const lowerVideoId = videoId.toLowerCase();
          return lowerFile.includes(lowerVideoId);
        });
        
        if (matchingFiles.length === 0) {
          const platform = video.platform.toLowerCase();
          matchingFiles = files.filter(file => {
            const lowerFile = file.toLowerCase();
            return lowerFile.startsWith(platform);
          });
        }
        
        if (matchingFiles.length === 0 && files.length > 0) {
          console.log(chalk.yellow('⚠️ No specific matches found, using most recent file'));
          const filesWithStats = files.map(file => {
            const filePath = path.join(videoDir, file);
            const stats = fs.statSync(filePath);
            return { file, mtime: stats.mtime };
          }).sort((a, b) => b.mtime - a.mtime);
          
          matchingFiles = [filesWithStats[0].file];
        }
        
        if (matchingFiles.length > 0) {
          const foundFile = path.join(videoDir, matchingFiles[0]);
          console.log(chalk.green(`✅ Found matching file: ${foundFile}`));
          video.localPath = foundFile;
          videoCleanup.protectFile(foundFile, 60);
        } else {
          throw new Error(`❌ No video file found for ID: ${videoId}`);
        }
      } else {
        throw new Error(`❌ Video directory does not exist: ${videoDir}`);
      }
    }
    
    const editedPath = path.join(DIRS.edited, `${videoId}-edited.mp4`);
    const finalPath = path.join(DIRS.edited, `${videoId}-final.mp4`);

    console.log(chalk.yellow("🎬 Editing video..."));
    await editVideo(video.localPath, editedPath);

    console.log(chalk.yellow("🎵 Processing video audio..."));
    await processVideoAudio(editedPath, finalPath);

    console.log(chalk.yellow("🤖 Analyzing video and generating AI-powered caption..."));
    const caption = await generateCaption(
      finalPath, 
      video.title || '', 
      video.description || ''
    );

    console.log(chalk.yellow("📤 Uploading to TikTok..."));
    await uploadToTikTok(finalPath, caption);

    uploadSuccess = true;
    console.log(chalk.green("🚀 Video posted successfully!"));
    console.log(chalk.cyan(`📊 Summary:`));
    console.log(chalk.gray(`   Title: ${video.title}`));
    console.log(chalk.gray(`   Platform: ${video.platform}`));
    if (video.searchQuery) {
      console.log(chalk.gray(`   Search Query: "${video.searchQuery}"`));
      console.log(chalk.gray(`   Relevance Score: ${video.relevanceScore || 'N/A'}`));
    }
    console.log(chalk.gray(`   AI Generated Caption:`));
    console.log(chalk.blue(`   ${caption.split('\n')[0]}...`));

  } catch (err) {
    uploadSuccess = false;
    console.error(chalk.red(`❌ Error processing video: ${err.message}`));
  } finally {
    console.log(chalk.cyan("🧹 Performing post-processing cleanup..."));
    await videoCleanup.cleanupAfterUpload(videoId, uploadSuccess);
    
    const finalStats = await videoCleanup.getStorageStats();
    if (finalStats) {
      console.log(chalk.cyan(`📊 Storage Usage:`));
      console.log(chalk.gray(`   Raw videos: ${finalStats.raw.count} files (${finalStats.raw.sizeMB}MB)`));
      console.log(chalk.gray(`   Edited videos: ${finalStats.edited.count} files (${finalStats.edited.sizeMB}MB)`));
      console.log(chalk.gray(`   Total: ${finalStats.total.count} files (${finalStats.total.sizeMB}MB)`));
    }
  }
}

// ============================================================================
// 🎯 MAIN FUNCTION
// ============================================================================

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
        await cleanup.cleanupOldFilesExceptCurrent('', 0); // Clean all old files
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

// ============================================================================
// 🚀 EXPORT & RUN
// ============================================================================

// Export classes and functions for external use
module.exports = {
  main,
  runTikTokBot,
  getMultiPlatformVideos,
  generateCaption,
  uploadToTikTok,
  editVideo,
  processVideoAudio,
  MultiPlatformDownloader,
  VideoAnalyzer,
  VideoCleanup
};

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal error: ${err.message}`));
    process.exit(1);
  });
}

// ============================================================================
// 🎉 END OF ALL-IN-ONE TIKTOK BOT
// ============================================================================