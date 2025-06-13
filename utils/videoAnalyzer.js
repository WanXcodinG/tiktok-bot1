const { GoogleGenerativeAI } = require("@google/generative-ai");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs-extra");
const path = require("path");
const chalk = require("chalk");

/**
 * Video analyzer untuk menghasilkan metadata otomatis
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
   * Extract frame dari video pada detik ke-10
   */
  async extractFrame(videoPath, timeSeconds = 10) {
    try {
      console.log(chalk.cyan(`📸 Extracting frame at ${timeSeconds}s for analysis...`));
      
      if (!fs.existsSync(videoPath)) {
        throw new Error(`Video file not found: ${videoPath}`);
      }

      const frameFilename = `frame_${Date.now()}.jpg`;
      const framePath = path.join(this.tempDir, frameFilename);

      return new Promise((resolve, reject) => {
        ffmpeg(videoPath)
          .seekInput(timeSeconds)
          .frames(1)
          .output(framePath)
          .on('end', () => {
            console.log(chalk.green(`✅ Frame extracted: ${framePath}`));
            resolve(framePath);
          })
          .on('error', (err) => {
            console.error(chalk.red(`❌ Frame extraction failed: ${err.message}`));
            reject(err);
          })
          .run();
      });
    } catch (err) {
      console.error(chalk.red(`❌ Error extracting frame: ${err.message}`));
      throw err;
    }
  }

  /**
   * Analyze video menggunakan Gemini Vision API
   */
  async analyzeVideoContent(videoPath, originalTitle = '', originalDescription = '') {
    try {
      if (!this.genAI) {
        console.log(chalk.yellow('⚠️ GEMINI_API_KEY not found, using fallback metadata'));
        return this.generateFallbackMetadata(originalTitle, originalDescription);
      }

      console.log(chalk.cyan('🤖 Analyzing video content with Gemini AI...'));

      // Extract frame untuk analisis
      const framePath = await this.extractFrame(videoPath, 10);
      
      // Read frame sebagai base64
      const frameBuffer = await fs.readFile(framePath);
      const frameBase64 = frameBuffer.toString('base64');

      // Get video metadata
      const videoMetadata = await this.getVideoMetadata(videoPath);

      // Analyze dengan Gemini Vision
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `Analyze this video frame and generate engaging TikTok metadata.

Video Information:
- Original Title: "${originalTitle}"
- Original Description: "${originalDescription}"
- Duration: ${videoMetadata.duration}s
- Resolution: ${videoMetadata.width}x${videoMetadata.height}

Based on the visual content in this frame, generate:

1. TITLE (max 60 characters):
   - Make it catchy and viral-worthy
   - Include relevant keywords
   - Use emojis appropriately
   - Make it click-worthy

2. DESCRIPTION (max 150 characters):
   - Describe what's happening in the video
   - Include call-to-action
   - Make it engaging
   - Use relevant emojis

3. TAGS (comma-separated, max 10 tags):
   - Relevant hashtags without #
   - Mix of trending and specific tags
   - Include: viral, fyp, trending
   - Add content-specific tags

Format your response as JSON:
{
  "title": "Your catchy title here",
  "description": "Your engaging description here",
  "tags": "viral, fyp, trending, tag1, tag2, tag3"
}

Only return the JSON, nothing else.`;

      const imagePart = {
        inlineData: {
          data: frameBase64,
          mimeType: "image/jpeg"
        }
      };

      const result = await model.generateContent([prompt, imagePart]);
      const response = await result.response;
      const text = response.text().trim();

      // Parse JSON response
      try {
        const metadata = JSON.parse(text);
        
        // Validate metadata
        if (metadata.title && metadata.description && metadata.tags) {
          console.log(chalk.green('✅ AI analysis completed successfully!'));
          console.log(chalk.blue(`📝 Generated Title: ${metadata.title}`));
          console.log(chalk.blue(`📄 Generated Description: ${metadata.description}`));
          console.log(chalk.blue(`🏷️ Generated Tags: ${metadata.tags}`));
          
          // Cleanup frame file
          await this.cleanupTempFiles();
          
          return metadata;
        } else {
          throw new Error('Invalid metadata structure');
        }
      } catch (parseErr) {
        console.error(chalk.red(`❌ Failed to parse AI response: ${parseErr.message}`));
        console.log(chalk.gray(`Raw response: ${text}`));
        throw new Error('AI response parsing failed');
      }

    } catch (err) {
      console.error(chalk.red(`❌ Video analysis failed: ${err.message}`));
      
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
            duration: 0,
            width: 720,
            height: 1280,
            fps: 30
          });
          return;
        }

        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        
        resolve({
          duration: Math.round(metadata.format.duration || 0),
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
      "💥 Absolutely incredible moment"
    ];

    const fallbackDescriptions = [
      "This video is absolutely amazing! You have to see this to believe it. Drop a ❤️ if you agree!",
      "I can't stop watching this! The talent is unreal. What do you think? Comment below! 🔥",
      "This just made my day! Share this with someone who needs to see it. Pure gold! ✨",
      "No way this is real! But it is and it's incredible. Follow for more amazing content! 💯"
    ];

    const baseTags = "viral, fyp, trending, amazing, incredible, mustwatch, content, video";

    // Try to extract keywords from original title
    let selectedTitle = fallbackTitles[Math.floor(Math.random() * fallbackTitles.length)];
    let selectedDescription = fallbackDescriptions[Math.floor(Math.random() * fallbackDescriptions.length)];
    let tags = baseTags;

    if (originalTitle && originalTitle.length > 5) {
      // Use original title as base but make it more engaging
      const cleanTitle = originalTitle.substring(0, 50);
      selectedTitle = `🔥 ${cleanTitle}`;
    }

    if (originalDescription && originalDescription.length > 10) {
      // Extract keywords from original description
      const words = originalDescription.toLowerCase().split(' ');
      const keywords = words.filter(word => 
        word.length > 3 && 
        !['this', 'that', 'with', 'from', 'they', 'have', 'been', 'will'].includes(word)
      ).slice(0, 3);
      
      if (keywords.length > 0) {
        tags = `${baseTags}, ${keywords.join(', ')}`;
      }
    }

    console.log(chalk.blue('🔄 Using fallback metadata generation'));
    
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
        for (const file of files) {
          if (file.startsWith('frame_') && file.endsWith('.jpg')) {
            const filePath = path.join(this.tempDir, file);
            await fs.remove(filePath);
            console.log(chalk.gray(`🗑️ Cleaned up temp file: ${file}`));
          }
        }
      }
    } catch (err) {
      console.error(chalk.red(`❌ Error cleaning temp files: ${err.message}`));
    }
  }

  /**
   * Generate complete video metadata
   */
  async generateVideoMetadata(videoPath, originalTitle = '', originalDescription = '') {
    try {
      console.log(chalk.cyan('🎯 Generating complete video metadata...'));
      
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

      console.log(chalk.green('✅ Video metadata generated successfully!'));
      console.log(chalk.cyan('📋 Final TikTok Caption:'));
      console.log(chalk.gray('─'.repeat(50)));
      console.log(finalCaption);
      console.log(chalk.gray('─'.repeat(50)));

      return {
        title: metadata.title,
        description: metadata.description,
        tags: metadata.tags,
        formattedTags: formattedTags,
        finalCaption: finalCaption
      };

    } catch (err) {
      console.error(chalk.red(`❌ Error generating video metadata: ${err.message}`));
      throw err;
    }
  }
}

module.exports = VideoAnalyzer;