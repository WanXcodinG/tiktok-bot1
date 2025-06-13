const { GoogleGenerativeAI } = require("@google/generative-ai");
const chalk = require('chalk');

/**
 * Generate random search queries for different categories
 */
class RandomSearchGenerator {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
    
    // Fallback search terms for each category
    this.fallbackSearchTerms = {
      'Anime Edited Videos': [
        'anime AMV edit 2024',
        'epic anime fight scenes',
        'anime compilation best moments',
        'anime edit phonk music',
        'anime AMV trending',
        'anime fight compilation',
        'anime emotional moments',
        'anime transformation scenes',
        'anime opening edit',
        'anime villain moments'
      ],
      'Tech Shorts': [
        'AI technology 2024',
        'latest tech gadgets',
        'programming tutorial',
        'tech review shorts',
        'AI breakthrough news',
        'coding tips tricks',
        'tech innovation 2024',
        'smartphone technology',
        'future technology',
        'tech explained simply'
      ],
      'Horror Clips': [
        'horror short film',
        'scary stories animated',
        'creepy pasta stories',
        'horror movie scenes',
        'scary urban legends',
        'ghost stories real',
        'horror compilation',
        'creepy true stories',
        'nightmare fuel videos',
        'horror game moments'
      ],
      'Made-Up TikTok Movies': [
        'short film vertical',
        'phone movie creative',
        'TikTok short story',
        'vertical cinema',
        'mobile filmmaking',
        'creative short film',
        'story time dramatic',
        'phone shot movie',
        'vertical storytelling',
        'creative video story'
      ],
      'TikTok Viral': [
        'viral TikTok 2024',
        'trending TikTok dance',
        'TikTok funny moments',
        'viral TikTok challenge',
        'TikTok compilation',
        'trending TikTok songs',
        'viral TikTok videos',
        'TikTok best moments',
        'funny TikTok compilation',
        'TikTok viral trends'
      ],
      'Instagram Reels': [
        'viral Instagram reels',
        'Instagram reels compilation',
        'trending reels 2024',
        'Instagram viral videos',
        'reels funny moments',
        'Instagram best reels',
        'viral reels compilation',
        'Instagram trending',
        'reels dance compilation',
        'Instagram viral content'
      ]
    };
  }

  /**
   * Generate random search query using AI or fallback
   */
  async generateRandomSearch(category) {
    try {
      console.log(chalk.cyan(`🎲 Generating random search for: ${category}`));
      
      // Try AI generation first
      if (this.genAI) {
        try {
          const aiQuery = await this.generateAISearch(category);
          if (aiQuery) {
            console.log(chalk.green(`🤖 AI Generated Search: "${aiQuery}"`));
            return aiQuery;
          }
        } catch (err) {
          console.log(chalk.yellow(`⚠️ AI search generation failed: ${err.message}`));
        }
      }
      
      // Fallback to predefined terms
      const fallbackQuery = this.getFallbackSearch(category);
      console.log(chalk.blue(`🔄 Using fallback search: "${fallbackQuery}"`));
      return fallbackQuery;
      
    } catch (err) {
      console.error(chalk.red(`❌ Error generating search: ${err.message}`));
      return this.getFallbackSearch(category);
    }
  }

  /**
   * Generate search query using Gemini AI
   */
  async generateAISearch(category) {
    try {
      const model = this.genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      
      const prompt = `Generate a random, creative search query for finding ${category} videos on YouTube/TikTok.

Requirements:
- Make it specific and engaging
- Include trending keywords for 2024
- Keep it under 50 characters
- Make it different from common searches
- Focus on viral, trending content
- Use keywords that would find high-quality videos

Category: ${category}

Return only the search query, nothing else.`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const searchQuery = response.text().trim().replace(/['"]/g, '');
      
      if (searchQuery && searchQuery.length > 5 && searchQuery.length < 100) {
        return searchQuery;
      }
      
      return null;
    } catch (err) {
      console.error(chalk.red(`❌ AI search generation error: ${err.message}`));
      return null;
    }
  }

  /**
   * Get random fallback search term
   */
  getFallbackSearch(category) {
    const terms = this.fallbackSearchTerms[category] || this.fallbackSearchTerms['TikTok Viral'];
    const randomIndex = Math.floor(Math.random() * terms.length);
    return terms[randomIndex];
  }

  /**
   * Generate multiple random searches
   */
  async generateMultipleSearches(category, count = 3) {
    const searches = [];
    
    for (let i = 0; i < count; i++) {
      const search = await this.generateRandomSearch(category);
      if (search && !searches.includes(search)) {
        searches.push(search);
      }
    }
    
    return searches;
  }

  /**
   * Get trending keywords for category
   */
  getTrendingKeywords(category) {
    const trendingKeywords = {
      'Anime Edited Videos': ['phonk', 'sigma', 'edit', 'AMV', '4K', 'epic'],
      'Tech Shorts': ['AI', '2024', 'review', 'unboxing', 'tech', 'gadget'],
      'Horror Clips': ['scary', 'creepy', 'horror', 'nightmare', 'ghost', 'paranormal'],
      'Made-Up TikTok Movies': ['short film', 'story', 'creative', 'vertical', 'phone'],
      'TikTok Viral': ['viral', 'trending', 'fyp', 'tiktok', 'dance', 'challenge'],
      'Instagram Reels': ['reels', 'viral', 'trending', 'instagram', 'short']
    };
    
    return trendingKeywords[category] || ['viral', 'trending', 'popular'];
  }
}

module.exports = RandomSearchGenerator;