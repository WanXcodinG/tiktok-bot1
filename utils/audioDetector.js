const { GoogleGenerativeAI } = require("@google/generative-ai");
const chalk = require('chalk');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

/**
 * Detect video content and suggest appropriate audio/music
 */
class AudioDetector {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    
    // Audio categories mapping
    this.audioCategories = {
      'anime': ['anime', 'manga', 'japanese', 'otaku', 'AMV', 'fight', 'action'],
      'tech': ['technology', 'AI', 'robot', 'gadget', 'programming', 'code', 'tech'],
      'horror': ['scary', 'horror', 'creepy', 'ghost', 'paranormal', 'nightmare', 'dark'],
      'chill': ['calm', 'relaxing', 'peaceful', 'meditation', 'soft', 'ambient'],
      'energetic': ['dance', 'party', 'upbeat', 'energetic', 'workout', 'motivation'],
      'cinematic': ['movie', 'film', 'dramatic', 'epic', 'cinematic', 'story']
    };
  }

  /**
   * Analyze video and detect appropriate audio category
   */
  async detectAudioCategory(videoPath, videoTitle = '', videoDescription = '') {
    try {
      console.log(chalk.cyan('🎵 Analyzing video for audio detection...'));
      
      // Extract video metadata
      const metadata = await this.extractVideoMetadata(videoPath);
      
      // Combine all available text information
      const textContent = [videoTitle, videoDescription, metadata.title || ''].join(' ').toLowerCase();
      
      // Try AI analysis first
      if (this.genAI && textContent.trim()) {
        try {
          const aiCategory = await this.analyzeWithAI(textContent, metadata);
          if (aiCategory) {
            console.log(chalk.green(`🤖 AI detected audio category: ${aiCategory}`));
            return aiCategory;
          }
        } catch (err) {
          console.log(chalk.yellow(`⚠️ AI analysis failed: ${err.message}`));
        }
      }
      
      // Fallback to keyword analysis
      const keywordCategory = this.analyzeWithKeywords(textContent);
      console.log(chalk.blue(`🔍 Keyword analysis result: ${keywordCategory}`));
      
      return keywordCategory;
      
    } catch (err) {
      console.error(chalk.red(`❌ Audio detection error: ${err.message}`));
      return 'anime'; // Default fallback
    }
  }

  /**
   * Extract video metadata using FFmpeg
   */
  async extractVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(videoPath, (err, metadata) => {
        if (err) {
          console.log(chalk.yellow(`⚠️ Could not extract metadata: ${err.message}`));
          resolve({});
          return;
        }
        
        const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
        const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
        
        resolve({
          duration: metadata.format.duration,
          title: metadata.format.tags?.title || '',
          artist: metadata.format.tags?.artist || '',
          width: videoStream?.width || 0,
          height: videoStream?.height || 0,
          hasAudio: !!audioStream,
          bitrate: metadata.format.bit_rate
        });
      });
    });
  }

  /**
   * Analyze content using Gemini AI
   */
  async analyzeWithAI(textContent, metadata) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Analyze this video content and determine the most appropriate background music category.

Video Information:
- Title/Description: "${textContent}"
- Duration: ${metadata.duration || 'unknown'} seconds
- Has Audio: ${metadata.hasAudio ? 'Yes' : 'No'}
- Dimensions: ${metadata.width}x${metadata.height}

Available Music Categories:
1. anime - For anime content, AMVs, Japanese culture, manga, otaku content
2. tech - For technology, AI, programming, gadgets, reviews, tutorials
3. horror - For scary, creepy, paranormal, ghost stories, horror content
4. chill - For calm, relaxing, peaceful, meditation, soft content
5. energetic - For dance, party, upbeat, workout, motivational content
6. cinematic - For movies, films, dramatic, epic, storytelling content

Instructions:
- Analyze the text content for keywords and themes
- Consider the video characteristics
- Choose the MOST appropriate single category
- Return ONLY the category name (anime/tech/horror/chill/energetic/cinematic)

Category:`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const category = response.text().trim().toLowerCase();
      
      // Validate the response
      const validCategories = ['anime', 'tech', 'horror', 'chill', 'energetic', 'cinematic'];
      if (validCategories.includes(category)) {
        return category;
      }
      
      return null;
    } catch (err) {
      console.error(chalk.red(`❌ AI analysis error: ${err.message}`));
      return null;
    }
  }

  /**
   * Analyze content using keyword matching
   */
  analyzeWithKeywords(textContent) {
    const scores = {};
    
    // Initialize scores
    Object.keys(this.audioCategories).forEach(category => {
      scores[category] = 0;
    });
    
    // Count keyword matches
    Object.entries(this.audioCategories).forEach(([category, keywords]) => {
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        const matches = textContent.match(regex);
        if (matches) {
          scores[category] += matches.length;
        }
      });
    });
    
    // Find category with highest score
    let bestCategory = 'anime';
    let bestScore = 0;
    
    Object.entries(scores).forEach(([category, score]) => {
      if (score > bestScore) {
        bestScore = score;
        bestCategory = category;
      }
    });
    
    console.log(chalk.gray(`📊 Keyword scores: ${JSON.stringify(scores)}`));
    
    return bestCategory;
  }

  /**
   * Get audio recommendations based on category
   */
  getAudioRecommendations(category) {
    const recommendations = {
      'anime': {
        mood: 'Epic and energetic',
        genres: ['Phonk', 'Electronic', 'Japanese', 'Epic'],
        searchTerms: ['anime phonk music', 'epic anime music', 'japanese electronic']
      },
      'tech': {
        mood: 'Modern and futuristic',
        genres: ['Electronic', 'Synthwave', 'Ambient', 'Tech House'],
        searchTerms: ['tech background music', 'futuristic electronic', 'cyberpunk music']
      },
      'horror': {
        mood: 'Dark and atmospheric',
        genres: ['Dark Ambient', 'Horror', 'Suspense', 'Creepy'],
        searchTerms: ['horror background music', 'dark ambient', 'scary music']
      },
      'chill': {
        mood: 'Calm and relaxing',
        genres: ['Lo-fi', 'Ambient', 'Chill', 'Soft'],
        searchTerms: ['chill background music', 'lo-fi music', 'relaxing music']
      },
      'energetic': {
        mood: 'Upbeat and motivating',
        genres: ['Electronic', 'Dance', 'Pop', 'Upbeat'],
        searchTerms: ['upbeat background music', 'energetic music', 'dance music']
      },
      'cinematic': {
        mood: 'Dramatic and epic',
        genres: ['Orchestral', 'Cinematic', 'Epic', 'Dramatic'],
        searchTerms: ['cinematic music', 'epic orchestral', 'movie soundtrack']
      }
    };
    
    return recommendations[category] || recommendations['anime'];
  }
}

module.exports = AudioDetector;