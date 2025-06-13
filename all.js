const inquirer = require("inquirer");
const chalk = require("chalk");
const ytDlpWrap = require('yt-dlp-wrap').default;
const fs = require('fs-extra');
const path = require('path');
const yts = require('yt-search');
const ffmpeg = require("fluent-ffmpeg");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const crypto = require('crypto');
require("dotenv").config();

// Set FFmpeg path
ffmpeg.setFfmpegPath("C:/ffmpeg/bin/ffmpeg.exe");

// ==================== MULTI-PLATFORM DOWNLOADER ====================
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
      
      const filesBefore = this.getVideoFileNames();
      console.log(chalk.gray(`📁 Files before download: ${filesBefore.length}`));
      
      const outputFilename = `${platform.toLowerCase()}_${videoId}.%(ext)s`;
      const outputTemplate = path.join(this.outputDir, outputFilename);
      
      console.log(chalk.yellow(`⬇️ Downloading: ${videoInfo.title}`));
      console.log(chalk.gray(`📁 Output template: ${outputTemplate}`));
      
      const downloadOptions = this.getDownloadOptions(platform, options);
      const command = [url, '-o', outputTemplate, ...downloadOptions];
      const cleanCommand = this.cleanCommandArray(command);
      
      console.log(chalk.gray(`🔧 Command: yt-dlp ${cleanCommand.join(' ')}`));
      
      try {
        await this.ytDlp.exec(cleanCommand);
      } catch (ytDlpError) {
        console.error(chalk.red(`❌ yt-dlp error: ${ytDlpError.message}`));
        throw new Error(`Download failed: ${ytDlpError.message}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const filesAfter = this.getVideoFileNames();
      console.log(chalk.gray(`📁 Files after download: ${filesAfter.length}`));
      
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
          downloadedFile = path.join(this.outputDir, matchingFiles[0]);
          console.log(chalk.blue(`🔍 Found matching file: ${matchingFiles[0]}`));
          
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
          // Strategy 3: Look for new files
          const newFiles = filesAfter.filter(file => !filesBefore.includes(file));
          
          if (newFiles.length > 0) {
            downloadedFile = path.join(this.outputDir, newFiles[0]);
            console.log(chalk.blue(`🆕 Found new file: ${newFiles[0]}`));
            
            try {
              await fs.move(downloadedFile, expectedPath, { overwrite: true });
              downloadedFile = expectedPath;
              console.log(chalk.blue(`📝 Renamed to: ${expectedFilename}`));
            } catch (renameErr) {
              console.log(chalk.yellow(`⚠️ Could not rename: ${renameErr.message}`));
            }
          } else {
            // Strategy 4: Use most recent file
            const allFiles = this.getDetailedVideoFiles();
            if (allFiles.length > 0) {
              const mostRecent = allFiles[0];
              downloadedFile = mostRecent.path;
              console.log(chalk.yellow(`⚠️ Using most recent file: ${mostRecent.name}`));
              
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
        console.error(chalk.red(`❌ No file found after download for video ID: ${videoId}`));
        
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

  getVideoFileNames() {
    try {
      if (!fs.existsSync(this.outputDir)) return [];
      
      return fs.readdirSync(this.outputDir).filter(file => {
        const lowerFile = file.toLowerCase();
        return (lowerFile.endsWith('.mp4') || 
                lowerFile.endsWith('.webm') || 
                lowerFile.endsWith('.mkv') ||
                lowerFile.endsWith('.avi') ||
                lowerFile.endsWith('.mov')) &&
               !lowerFile.endsWith('.part') &&
               !lowerFile.includes('.tmp');
      });
    } catch (err) {
      console.error(chalk.red(`❌ Error getting video file names: ${err.message}`));
      return [];
    }
  }

  getDetailedVideoFiles() {
    try {
      if (!fs.existsSync(this.outputDir)) return [];
      
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
      }).sort((a, b) => b.mtime - a.mtime);
      
    } catch (err) {
      console.error(chalk.red(`❌ Error getting detailed video files: ${err.message}`));
      return [];
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
      
      if (!searchResults.videos || searchResults.videos.length === 0) {
        throw new Error(`No videos found for query: ${query}`);
      }

      console.log(chalk.cyan(`🎯 Found ${searchResults.videos.length} total results`));

      const filteredVideos = this.filterSearchResults(searchResults.videos, query, limit);
      
      if (filteredVideos.length === 0) {
        console.log(chalk.yellow('⚠️ No videos matched the search criteria, using top results'));
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

  filterSearchResults(videos, query, limit) {
    const queryWords = query.toLowerCase().split(' ').filter(word => word.length > 2);
    
    const scoredVideos = videos.map(video => {
      const title = video.title.toLowerCase();
      const description = (video.description || '').toLowerCase();
      const uploader = video.author?.name?.toLowerCase() || '';
      
      let score = 0;
      
      queryWords.forEach(word => {
        if (title.includes(word)) score += 10;
        if (title.includes(word.substring(0, Math.max(3, word.length - 1)))) score += 5;
      });
      
      queryWords.forEach(word => {
        if (description.includes(word)) score += 3;
      });
      
      queryWords.forEach(word => {
        if (uploader.includes(word)) score += 1;
      });
      
      if (title.includes(query.toLowerCase())) score += 20;
      
      const duration = video.duration?.seconds || 0;
      if (duration > 1800) score -= 5;
      if (duration >= 60 && duration <= 1200) score += 2;
      
      return { ...video, relevanceScore: score };
    });
    
    const sortedVideos = scoredVideos
      .filter(video => video.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, limit);
    
    console.log(chalk.gray(`📊 Top matches:`));
    sortedVideos.slice(0, 3).forEach((video, index) => {
      console.log(chalk.gray(`   ${index + 1}. "${video.title}" (Score: ${video.relevanceScore})`));
    });
    
    return sortedVideos;
  }

  async downloadFilteredVideos(videos, originalQuery) {
    const downloadResults = [];
    
    for (const video of videos) {
      try {
        console.log(chalk.cyan(`📥 Processing: ${video.title}`));
        console.log(chalk.gray(`🎯 Relevance score: ${video.relevanceScore || 'N/A'}`));
        console.log(chalk.gray(`⏱️ Duration: ${video.duration?.timestamp || 'Unknown'}`));
        
        const downloadResult = await this.downloadVideo(video.url);
        
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

  generateId() {
    return Math.random().toString(36).substring(2, 15);
  }

  getSupportedPlatforms() {
    return [...new Set(Object.values(this.supportedPlatforms))];
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

// ==================== VIDEO ANALYZER ====================
class VideoAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.tempDir = path.join(__dirname, 'temp');
    
    fs.ensureDirSync(this.tempDir);
  }

  async extractMultipleFrames(videoPath, frameCount = 10) {
    try {
      console.log(chalk.cyan(`📸 Extracting ${frameCount} frames for comprehensive analysis...`));
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const videoMetadata = await this.getVideoMetadata(videoPath);
      const duration = videoMetadata.duration;
      
      if (duration <= 0) {
        throw new Error('Could not determine video duration');
      }

      console.log(chalk.blue(`📊 Video duration: ${duration}s, extracting ${frameCount} frames`));

      const framePaths = [];
      const interval = Math.max(1, Math.floor(duration / (frameCount + 1)));

      for (let i = 1; i <= frameCount; i++) {
        const timeSeconds = i * interval;
        const frameFilename = `frame_${Date.now()}_${i}.jpg`;
        const framePath = path.join(this.tempDir, frameFilename);

        try {
          await new Promise((resolve, reject) => {
            ffmpeg(videoPath)
              .seekInput(timeSeconds)
              .frames(1)
              .output(framePath)
              .on('end', () => {
                console.log(chalk.gray(`✅ Frame ${i}/${frameCount} extracted at ${timeSeconds}s`));
                resolve();
              })
              .on('error', (err) => {
                console.error(chalk.red(`❌ Frame ${i} extraction failed: ${err.message}`));
                reject(err);
              })
              .run();
          });

          if (fs.existsSync(framePath)) {
            const stats = fs.statSync(framePath);
            if (stats.size > 1000) {
              framePaths.push({
                path: framePath,
                timeSeconds: timeSeconds,
                frameNumber: i
              });
            } else {
              console.log(chalk.yellow(`⚠️ Frame ${i} too small, skipping`));
              fs.removeSync(framePath);
            }
          }
        } catch (err) {
          console.log(chalk.yellow(`⚠️ Failed to extract frame ${i} at ${timeSeconds}s: ${err.message}`));
        }
      }

      console.log(chalk.green(`✅ Successfully extracted ${framePaths.length}/${frameCount} frames`));
      return framePaths;

    } catch (err) {
      console.error(chalk.red(`❌ Error extracting frames: ${err.message}`));
      throw err;
    }
  }

  parseAIResponse(rawResponse) {
    try {
      console.log(chalk.gray(`🔍 Parsing AI response (${rawResponse.length} chars)...`));
      
      let cleanedResponse = rawResponse.trim();
      
      if (cleanedResponse.includes('```json')) {
        const jsonStart = cleanedResponse.indexOf('```json') + 7;
        const jsonEnd = cleanedResponse.lastIndexOf('```');
        if (jsonEnd > jsonStart) {
          cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd).trim();
        }
      } else if (cleanedResponse.includes('```')) {
        const jsonStart = cleanedResponse.indexOf('```') + 3;
        const jsonEnd = cleanedResponse.lastIndexOf('```');
        if (jsonEnd > jsonStart) {
          cleanedResponse = cleanedResponse.substring(jsonStart, jsonEnd).trim();
        }
      }
      
      const jsonStartIndex = cleanedResponse.indexOf('{');
      const jsonEndIndex = cleanedResponse.lastIndexOf('}');
      
      if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonEndIndex > jsonStartIndex) {
        cleanedResponse = cleanedResponse.substring(jsonStartIndex, jsonEndIndex + 1);
      }
      
      const parsed = JSON.parse(cleanedResponse);
      
      if (!parsed.title || !parsed.description || !parsed.tags) {
        throw new Error('Missing required fields in AI response');
      }
      
      const metadata = {
        title: String(parsed.title).substring(0, 60).trim(),
        description: String(parsed.description).substring(0, 150).trim(),
        tags: String(parsed.tags).trim()
      };
      
      console.log(chalk.green('✅ AI response parsed successfully'));
      return metadata;
      
    } catch (err) {
      console.error(chalk.red(`❌ JSON parsing failed: ${err.message}`));
      console.log(chalk.gray(`Raw response preview: ${rawResponse.substring(0, 200)}...`));
      throw new Error('AI response parsing failed');
    }
  }

  async analyzeVideoContent(videoPath, originalTitle = '', originalDescription = '') {
    try {
      if (!this.genAI) {
        console.log(chalk.yellow('⚠️ GEMINI_API_KEY not found, using fallback metadata'));
        return this.generateFallbackMetadata(originalTitle, originalDescription);
      }

      console.log(chalk.cyan('🤖 Analyzing video content with Gemini AI (Multi-Frame Analysis)...'));

      const frameData = await this.extractMultipleFrames(videoPath, 10);
      
      if (frameData.length === 0) {
        throw new Error('No frames could be extracted from video');
      }

      const videoMetadata = await this.getVideoMetadata(videoPath);

      const frameImages = [];
      for (const frame of frameData) {
        try {
          const frameBuffer = await fs.readFile(frame.path);
          const frameBase64 = frameBuffer.toString('base64');
          
          frameImages.push({
            inlineData: {
              data: frameBase64,
              mimeType: "image/jpeg"
            }
          });
        } catch (err) {
          console.log(chalk.yellow(`⚠️ Could not read frame ${frame.frameNumber}: ${err.message}`));
        }
      }

      if (frameImages.length === 0) {
        throw new Error('No frames could be processed for AI analysis');
      }

      console.log(chalk.blue(`🎬 Analyzing ${frameImages.length} frames with AI...`));

      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analyze these ${frameImages.length} video frames taken at different timestamps to understand the complete video content and generate engaging TikTok metadata.

Video Information:
- Original Title: "${originalTitle}"
- Original Description: "${originalDescription}"
- Duration: ${videoMetadata.duration}s
- Resolution: ${videoMetadata.width}x${videoMetadata.height}
- Frames analyzed: ${frameImages.length} frames from different parts of the video

Instructions:
1. Look at ALL the frames to understand the video's story/content progression
2. Identify the main theme, action, or subject matter
3. Detect any text, objects, people, or scenes that appear
4. Understand the overall mood and style of the video
5. Generate metadata that captures the essence of the entire video

Based on your analysis of all frames, generate:

1. TITLE (max 60 characters):
   - Make it catchy and viral-worthy
   - Reflect the main content/theme you see
   - Include relevant keywords from what you observe
   - Use emojis appropriately
   - Make it click-worthy

2. DESCRIPTION (max 150 characters):
   - Describe what's happening throughout the video
   - Include call-to-action
   - Make it engaging and descriptive
   - Use relevant emojis
   - Capture the video's progression/story

3. TAGS (comma-separated, max 10 tags):
   - Relevant hashtags without # symbol
   - Mix of trending and content-specific tags
   - Include: viral, fyp, trending
   - Add tags based on what you see in the frames
   - Include subject matter, style, mood tags

IMPORTANT: Return ONLY a valid JSON object with this exact structure:
{
  "title": "Your catchy title based on video analysis",
  "description": "Your engaging description of the video content",
  "tags": "viral, fyp, trending, content-specific-tag1, content-specific-tag2, mood-tag"
}

Do not include any markdown formatting, code blocks, or additional text. Only return the JSON object.`;

      const content = [prompt, ...frameImages];

      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text();

      const metadata = this.parseAIResponse(text);
      
      console.log(chalk.green('✅ Multi-frame AI analysis completed successfully!'));
      console.log(chalk.blue(`📝 Generated Title: ${metadata.title}`));
      console.log(chalk.blue(`📄 Generated Description: ${metadata.description}`));
      console.log(chalk.blue(`🏷️ Generated Tags: ${metadata.tags}`));
      console.log(chalk.gray(`🎬 Analysis based on ${frameImages.length} frames`));
      
      await this.cleanupTempFiles();
      
      return metadata;

    } catch (err) {
      console.error(chalk.red(`❌ Multi-frame video analysis failed: ${err.message}`));
      
      await this.cleanupTempFiles();
      
      return this.generateFallbackMetadata(originalTitle, originalDescription);
    }
  }

  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.log(chalk.yellow(`⚠️ Could not get video metadata: ${err.message}`));
          resolve({
            duration: 30,
            width: 720,
            height: 1280,
            fps: 30
          });
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: Math.round(metadata.format.duration || 30),
          width: videoStream?.width || 720,
          height: videoStream?.height || 1280,
          fps: eval(videoStream?.r_frame_rate) || 30,
          bitrate: metadata.format.bit_rate
        });
      });
    });
  }

  generateFallbackMetadata(originalTitle = '', originalDescription = '') {
    const fallbackTitles = [
      "🔥 This video hits different!",
      "😱 You won't believe what happens next",
      "💯 This is absolutely insane",
      "🤯 Mind = blown",
      "✨ Pure magic caught on camera",
      "🎬 This is why I love the internet",
      "🚀 This just went viral",
      "💥 Absolutely incredible moment",
      "🎯 This is exactly what I needed to see",
      "⚡ Energy levels through the roof!"
    ];

    const fallbackDescriptions = [
      "This video is absolutely amazing! You have to see this to believe it. Drop a ❤️ if you agree!",
      "I can't stop watching this! The talent is unreal. What do you think? Comment below! 🔥",
      "This just made my day! Share this with someone who needs to see it. Pure gold! ✨",
      "No way this is real! But it is and it's incredible. Follow for more amazing content! 💯",
      "The way this unfolds is just *chef's kiss* 👌 Save this for later!",
      "POV: You found the perfect video at the perfect time 🎯 Tag someone who needs this!"
    ];

    const baseTags = "viral, fyp, trending, amazing, incredible, mustwatch, content, video, tiktok, foryou";

    let selectedTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
    let selectedDescription = fallbackDescriptions[Math.floor(Math.random() * fallbackDescriptions.length)];
    let tags = baseTags;

    if (originalTitle && originalTitle.length > 5) {
      const cleanTitle = originalTitle.substring(0, 45);
      selectedTitle = `🔥 ${cleanTitle}`;
      
      const titleWords = originalTitle.toLowerCase().split(' ');
      const titleKeywords = titleWords.filter(word => 
        word.length > 3 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'video', 'watch'].includes(word)
      ).slice(0, 2);
      
      if (titleKeywords.length > 0) {
        tags = `${baseTags}, ${titleKeywords.join(', ')}`;
      }
    }

    if (originalDescription && originalDescription.length > 10) {
      const words = originalDescription.toLowerCase().split(' ');
      const keywords = words.filter(word => 
        word.length > 3 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will', 'video', 'watch'].includes(word)
      ).slice(0, 3);
      
      if (keywords.length > 0) {
        tags = `${baseTags}, ${keywords.join(', ')}`;
      }
    }

    console.log(chalk.blue('🔄 Using enhanced fallback metadata generation'));
    
    return {
      title: selectedTitle,
      description: selectedDescription,
      tags: tags
    };
  }

  async cleanupTempFiles() {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        let cleanedCount = 0;
        
        for (const file of files) {
          if (file.startsWith('frame_') && file.endsWith('.jpg')) {
            const filePath = path.join(this.tempDir, file);
            await fs.remove(filePath);
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          console.log(chalk.gray(`🗑️ Cleaned up ${cleanedCount} temp frame files`));
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning temp files: ${err.message}`));
    }
  }

  async generateVideoMetadata(videoPath, originalTitle = '', originalDescription = '') {
    try {
      console.log(chalk.cyan('🎯 Generating complete video metadata with multi-frame analysis...'));
      
      const metadata = await this.analyzeVideoContent(videoPath, originalTitle, originalDescription);
      
      const formattedTags = metadata.tags
        .split(',')
        .map(tag => `#${tag.trim()}`)
        .join(' ');

      const finalCaption = `${metadata.title}

${metadata.description}

${formattedTags}`;

      console.log(chalk.green('✅ Multi-frame video metadata generated successfully!'));
      console.log(chalk.cyan('📋 Final TikTok Caption:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(finalCaption);
      console.log(chalk.gray('─'.repeat(50)));

      return {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        formattedTags: formattedTags,
        finalCaption: finalCaption,
        analysisMethod: 'multi-frame'
      };

    } catch (err) {
      console.error(chalk.red(`❌ Error generating video metadata: ${err.message}`));
      throw err;
    }
  }
}

// ==================== VIDEO CLEANUP ====================
class VideoCleanup {
  constructor() {
    this.rawDir = path.join(__dirname, 'videos/raw');
    this.editedDir = path.join(__dirname, 'videos/edited');
    this.protectedFiles = new Set();
    
    fs.ensureDirSync(this.rawDir);
    fs.ensureDirSync(this.editedDir);
  }

  protectFile(filePath, durationMinutes = 30) {
    try {
      const absolutePath = path.resolve(filePath);
      this.protectedFiles.add(absolutePath);
      
      console.log(chalk.blue(`🛡️ Protected file from cleanup: ${path.basename(filePath)} (${durationMinutes}min)`));
      
      setTimeout(() => {
        this.protectedFiles.delete(absolutePath);
        console.log(chalk.gray(`🔓 Protection expired for: ${path.basename(filePath)}`));
      }, durationMinutes * 60 * 1000);
      
    } catch (err) {
      console.error(chalk.red(`❌ Error protecting file: ${err.message}`));
    }
  }

  isFileProtected(filePath) {
    try {
      const absolutePath = path.resolve(filePath);
      return this.protectedFiles.has(absolutePath);
    } catch (err) {
      return false;
    }
  }

  async cleanupOldFilesExceptCurrent(currentVideoId, maxAgeMinutes = 30) {
    try {
      console.log(chalk.cyan(`🕒 Cleaning old files (except current video: ${currentVideoId})...`));
      
      const now = Date.now();
      const maxAge = maxAgeMinutes * 60 * 1000;
      
      const directories = [this.rawDir, this.editedDir];
      let totalRemoved = 0;
      
      for (const dir of directories) {
        if (!fs.existsSync(dir)) continue;
        
        const files = fs.readdirSync(dir).filter(file => 
          !file.endsWith('.part')
        );
        
        for (const file of files) {
          const filePath = path.join(dir, file);
          
          if (file.includes(currentVideoId)) {
            console.log(chalk.blue(`🛡️ Skipping current video: ${file}`));
            continue;
          }
          
          if (this.isFileProtected(filePath)) {
            console.log(chalk.blue(`🛡️ Skipping protected file: ${file}`));
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

  async getStorageStats() {
    try {
      const stats = {
        raw: { count: 0, size: 0 },
        edited: { count: 0, size: 0 },
        total: { count: 0, size: 0 }
      };
      
      const directories = [
        { key: 'raw', path: this.rawDir },
        { key: 'edited', path: this.editedDir }
      ];
      
      for (const { key, path: dirPath } of directories) {
        if (fs.existsSync(dirPath)) {
          const files = fs.readdirSync(dirPath).filter(file => 
            !file.endsWith('.part')
          );
          
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

  async cleanupAfterUpload(videoId, success = true) {
    try {
      console.log(chalk.cyan(`🧹 Post-upload cleanup for video: ${videoId}`));
      
      if (success) {
        console.log(chalk.green(`✅ Upload successful - cleaning up all files`));
        await this.cleanupVideoFiles(videoId, false);
      } else {
        console.log(chalk.yellow(`⚠️ Upload failed - keeping raw file, removing processed files`));
        const processedFiles = [
          path.join(this.editedDir, `${videoId}-edited.mp4`),
          path.join(this.editedDir, `${videoId}-final.mp4`)
        ];
        
        for (const filePath of processedFiles) {
          try {
            if (fs.existsSync(filePath) && !this.isFileProtected(filePath)) {
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
      const allDirs = [this.rawDir, this.editedDir];
      
      for (const dir of allDirs) {
        if (fs.existsSync(dir)) {
          const files = fs.readdirSync(dir);
          
          for (const file of files) {
            const fileContainsId = file.includes(videoId) || 
                                  file.includes(videoId.replace(/[^a-zA-Z0-9]/g, '')) ||
                                  file.split('_').some(part => part === videoId);
            
            if (fileContainsId) {
              const filePath = path.join(dir, file);
              
              if (keepOriginal && dir === this.rawDir && !file.includes('-edited') && !file.includes('-final')) {
                continue;
              }
              
              if (!this.isFileProtected(filePath)) {
                filesToClean.push(filePath);
              }
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
}

// ==================== VIDEO EDITOR ====================
async function editVideo(inputPath, outputName = "edited-video.mp4", options = {}) {
  const { startTime = "00:00:03", duration = 30 } = options;

  if (!inputPath || !fs.existsSync(inputPath)) {
    throw new Error("❌ Input video file does not exist.");
  }

  const projectRoot = __dirname;
  const editedVideosDir = path.join(projectRoot, "videos", "edited");

  if (!fs.existsSync(editedVideosDir)) {
    fs.mkdirSync(editedVideosDir, { recursive: true });
  }

  const cleanedOutputName = path.basename(outputName);
  const outputPath = path.join(editedVideosDir, cleanedOutputName);

  console.log(chalk.blue("📁 Saving to path:"), outputPath);

  if (fs.existsSync(outputPath)) {
    fs.removeSync(outputPath);
  }

  return new Promise((resolve, reject) => {
    const command = ffmpeg(inputPath)
      .setStartTime(startTime)
      .duration(duration)
      .videoCodec("libx264")
      .audioCodec("aac")
      .size("720x1280")
      .outputOptions([
        '-preset', 'fast',
        '-crf', '23',
        '-movflags', '+faststart'
      ]);

    command
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(chalk.yellow(`⏳ Processing: ${progress.percent.toFixed(1)}%`));
        }
      })
      .on("end", () => {
        console.log(chalk.green("✅ Video edited and saved to:"), outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error(chalk.red("❌ Error during video processing:"), err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

// ==================== AUDIO PROCESSOR ====================
async function processVideoAudio(videoPath, outputPath) {
  try {
    console.log(chalk.cyan(`🎵 Processing video with original audio...`));
    
    if (!fs.existsSync(videoPath)) {
      throw new Error(`Video file not found: ${videoPath}`);
    }
    
    console.log(chalk.blue(`🎶 Keeping original video audio`));
    
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .videoCodec('copy')
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions([
          '-movflags', '+faststart'
        ])
        .on('start', (commandLine) => {
          console.log(chalk.gray(`🔧 FFmpeg command: ${commandLine}`));
        })
        .on('progress', (progress) => {
          if (progress.percent) {
            console.log(chalk.blue(`🎵 Processing audio: ${progress.percent.toFixed(1)}%`));
          }
        })
        .on('end', () => {
          console.log(chalk.green(`✅ Video processed with original audio: ${outputPath}`));
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error(chalk.red(`❌ Error processing video: ${err.message}`));
          reject(err);
        })
        .save(outputPath);
    });
    
  } catch (err) {
    console.error(chalk.red(`❌ Error in processVideoAudio: ${err.message}`));
    throw err;
  }
}

// ==================== TIKTOK UPLOADER ====================
async function uploadToTikTok(videoPath, caption = "#bot #foryou #edit #fyp") {
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
  const cookiesPath = path.join(__dirname, "cookies.json");

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

// ==================== CAPTION GENERATOR ====================
async function generateCaption(videoPath, originalTitle = '', originalDescription = '') {
  try {
    console.log(chalk.cyan('🎬 Generating AI-powered caption from video content...'));
    
    const videoAnalyzer = new VideoAnalyzer();
    
    const metadata = await videoAnalyzer.generateVideoMetadata(
      videoPath, 
      originalTitle, 
      originalDescription
    );
    
    return metadata.finalCaption;
    
  } catch (err) {
    console.error(chalk.red(`❌ Caption generation failed: ${err.message}`));
    
    const fallbackCaption = "🔥 This video hits different! #viral #fyp #trending #amazing #content";
    console.log(chalk.yellow('🔄 Using fallback caption:'), fallbackCaption);
    
    return fallbackCaption;
  }
}

// ==================== MULTI-PLATFORM VIDEO FETCHER ====================
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

// ==================== MAIN BOT FUNCTION ====================
async function runTikTokBot() {
  console.log(chalk.blueBright("📱 TikTok Multi-Platform Content Bot"));
  console.log(chalk.gray("Supports: YouTube, TikTok, Instagram, Facebook, Twitter"));
  console.log(chalk.green("🎯 Improved Search - Get exactly what you search for!"));
  console.log(chalk.magenta("🤖 AI-Powered Video Analysis & Metadata Generation!"));

  const { inputType } = await inquirer.prompt([
    {
      type: "list",
      name: "inputType",
      message: "How do you want to get videos?",
      choices: [
        "🔗 Provide direct URLs",
        "🔍 Search by keyword (Exact Match)"
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

  } else if (inputType === "🔍 Search by keyword (Exact Match)") {
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

  if (video.localPath) {
    videoCleanup.protectFile(video.localPath, 60);
  }

  console.log(chalk.cyan("🧹 Performing cleanup of old files..."));
  await videoCleanup.cleanupOldFilesExceptCurrent(videoId, 30);

  let uploadSuccess = false;

  try {
    const rawPath = video.localPath;
    
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
    
    const editedPath = `./videos/edited/${videoId}-edited.mp4`;
    const finalPath = `./videos/edited/${videoId}-final.mp4`;

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
    console.log(chalk.blue(`   ${caption}`));

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

// ==================== MAIN ENTRY POINT ====================
async function main() {
  console.log(chalk.blueBright("🤖 TikTok All-in-One Bot"));
  console.log(chalk.gray("Everything you need in one script!"));

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
        console.log(chalk.cyan("Starting interactive video processing..."));
        await runTikTokBot();
        break;
        
      case "🧹 Cleanup files only":
        console.log(chalk.cyan("Starting cleanup..."));
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

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal error: ${err.message}`));
    process.exit(1);
  });
}

module.exports = {
  runTikTokBot,
  MultiPlatformDownloader,
  VideoAnalyzer,
  VideoCleanup,
  editVideo,
  processVideoAudio,
  uploadToTikTok,
  generateCaption,
  getMultiPlatformVideos,
  main
};