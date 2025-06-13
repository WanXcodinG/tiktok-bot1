const { GoogleGenerativeAI } = require("@google/generative-ai");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

/**
 * Video analyzer untuk menghasilkan metadata otomatis dengan 10 frame analysis
 */
class VideoAnalyzer {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    this.tempDir = path.join(__dirname, '../temp');
    
    // Ensure temp directory exists
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * Extract 10 frames dari video untuk analisis komprehensif
   */
  async extractMultipleFrames(videoPath, frameCount = 10) {
    try {
      console.log(chalk.cyan(`📸 Extracting ${frameCount} frames for comprehensive analysis...`));
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      // Get video duration first
      const videoMetadata = await this.getVideoMetadata(videoPath);
      const duration = videoMetadata.duration;
      
      if (duration <= 0) {
        throw new Error('Could not determine video duration');
      }

      console.log(chalk.blue(`📊 Video duration: ${duration}s, extracting ${frameCount} frames`));

      const framePaths = [];
      const interval = Math.max(1, Math.floor(duration / (frameCount + 1))); // Distribute frames evenly

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

          // Verify frame was created and has content
          if (fs.existsSync(framePath)) {
            const stats = fs.statSync(framePath);
            if (stats.size > 1000) { // At least 1KB
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

  /**
   * Analyze multiple frames menggunakan Gemini Vision API
   */
  async analyzeVideoContent(videoPath, originalTitle = '', originalDescription = '') {
    try {
      if (!this.genAI) {
        console.log(chalk.yellow('⚠️ GEMINI_API_KEY not found, using fallback metadata'));
        return this.generateFallbackMetadata(originalTitle, originalDescription);
      }

      console.log(chalk.cyan('🤖 Analyzing video content with Gemini AI (Multi-Frame Analysis)...'));

      // Extract multiple frames untuk analisis
      const frameData = await this.extractMultipleFrames(videoPath, 10);
      
      if (frameData.length === 0) {
        throw new Error('No frames could be extracted from video');
      }

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(videoPath);

      // Prepare frames for AI analysis
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

      // Analyze dengan Gemini Vision
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

Format your response as JSON:
{
  "title": "Your catchy title based on video analysis",
  "description": "Your engaging description of the video content",
  "tags": "viral, fyp, trending, content-specific-tag1, content-specific-tag2, mood-tag"
}

Only return the JSON, nothing else.`;

      // Create content array with prompt and all frames
      const content = [prompt, ...frameImages];

      const result = await model.generateContent(content);
      const response = await result.response;
      const text = response.text().trim();

      // Parse JSON response
      try {
        const metadata = JSON.parse(text);
        
        // Validate metadata
        if (metadata.title && metadata.description && metadata.tags) {
          console.log(chalk.green('✅ Multi-frame AI analysis completed successfully!'));
          console.log(chalk.blue(`📝 Generated Title: ${metadata.title}`));
          console.log(chalk.blue(`📄 Generated Description: ${metadata.description}`));
          console.log(chalk.blue(`🏷️ Generated Tags: ${metadata.tags}`));
          console.log(chalk.gray(`🎬 Analysis based on ${frameImages.length} frames`));
          
          // Cleanup frame files
          await this.cleanupTempFiles();
          
          return metadata;
        } else {
          throw new Error('Invalid metadata structure');
        }
      } catch (parseErr) {
        console.error(chalk.red(`❌ Failed to parse AI response: ${parseErr.message}`));
        console.log(chalk.gray(`Raw response: ${text.substring(0, 200)}...`));
        throw new Error('AI response parsing failed');
      }

    } catch (err) {
      console.error(chalk.red(`❌ Multi-frame video analysis failed: ${err.message}`));
      
      // Cleanup temp files
      await this.cleanupTempFiles();
      
      // Return fallback metadata
      return this.generateFallbackMetadata(originalTitle, originalDescription);
    }
  }

  /**
   * Get video metadata menggunakan FFprobe
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.log(chalk.yellow(`⚠️ Could not get video metadata: ${err.message}`));
          resolve({
            duration: 30, // Default fallback
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

  /**
   * Generate fallback metadata jika AI gagal
   */
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

    // Try to extract keywords from original title
    let selectedTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
    let selectedDescription = fallbackDescriptions[Math.floor(Math.random() * fallbackDescriptions.length)];
    let tags = baseTags;

    if (originalTitle && originalTitle.length > 5) {
      // Use original title as base but make it more engaging
      const cleanTitle = originalTitle.substring(0, 45);
      selectedTitle = `🔥 ${cleanTitle}`;
      
      // Extract keywords from title
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
      // Extract keywords from original description
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

  /**
   * Cleanup temporary files
   */
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

  /**
   * Generate complete video metadata dengan multi-frame analysis
   */
  async generateVideoMetadata(videoPath, originalTitle = '', originalDescription = '') {
    try {
      console.log(chalk.cyan('🎯 Generating complete video metadata with multi-frame analysis...'));
      
      const metadata = await this.analyzeVideoContent(videoPath, originalTitle, originalDescription);
      
      // Format tags untuk TikTok (dengan #)
      const formattedTags = metadata.tags
        .split(',')
        .map(tag => `#${tag.trim()}`)
        .join(' ');

      // Create final caption untuk TikTok
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
        analysisMethod: 'multi-frame' // Indicate this used multi-frame analysis
      };

    } catch (err) {
      console.error(chalk.red(`❌ Error generating video metadata: ${err.message}`));
      throw err;
    }
  }
}

module.exports = VideoAnalyzer;