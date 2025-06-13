const MultiPlatformDownloader = require('./multiPlatformDownloader');
const RandomSearchGenerator = require('../utils/randomSearchGenerator');
const chalk = require('chalk');

/**
 * Get videos from multiple platforms using URLs or search
 */
async function getMultiPlatformVideos(sources, options = {}) {
  const downloader = new MultiPlatformDownloader();
  const results = [];

  console.log(chalk.cyan('🌐 Multi-Platform Video Fetcher Started'));
  console.log(chalk.gray(`Supported platforms: ${downloader.getSupportedPlatforms().join(', ')}`));

  try {
    // Handle different input types
    if (typeof sources === 'string') {
      // Validate input string
      if (!sources || sources.trim().length === 0) {
        throw new Error('Empty search query or URL provided');
      }
      
      // Single URL or search query
      if (downloader.isValidUrl(sources)) {
        console.log(chalk.blue(`📥 Downloading from URL: ${sources}`));
        const result = await downloader.downloadVideo(sources, options);
        results.push(result);
      } else {
        // Search query
        console.log(chalk.blue(`🔍 Searching for: "${sources}"`));
        const searchResults = await downloader.searchAndDownload(
          sources, 
          options.platform || 'YouTube', 
          options.limit || 1
        );
        results.push(...searchResults);
      }
    } else if (Array.isArray(sources)) {
      // Multiple URLs
      if (sources.length === 0) {
        throw new Error('Empty URL array provided');
      }
      
      console.log(chalk.blue(`📥 Downloading ${sources.length} videos...`));
      const downloadResults = await downloader.downloadMultiple(sources, options);
      results.push(...downloadResults);
    } else {
      throw new Error('Invalid sources format. Provide URL string or array of URLs.');
    }

    // Filter successful downloads
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
 * Get videos by category with random search terms - UPDATED
 */
async function getVideosByCategory(category, count = 1) {
  const searchGenerator = new RandomSearchGenerator();
  
  const categoryMappings = {
    'Anime Edited Videos': {
      platforms: ['YouTube'],
      hashtags: 'anime edit, fight scenes, Japanese animation'
    },
    'Tech Shorts': {
      platforms: ['YouTube'],
      hashtags: 'tech, ai, gadgets, programming'
    },
    'Horror Clips': {
      platforms: ['YouTube'],
      hashtags: 'horror, scary, thriller, creepy'
    },
    'Made-Up TikTok Movies': {
      platforms: ['YouTube', 'TikTok'],
      hashtags: 'shortfilm, storytime, acting, movie'
    },
    'TikTok Viral': {
      platforms: ['TikTok'],
      hashtags: 'viral, trending, tiktok, fyp'
    },
    'Instagram Reels': {
      platforms: ['Instagram'],
      hashtags: 'reels, instagram, viral, trending'
    }
  };

  const config = categoryMappings[category];
  if (!config) {
    throw new Error(`Category "${category}" not supported`);
  }

  console.log(chalk.cyan(`🎯 Fetching ${category} videos with random search...`));

  try {
    // Generate random search term using AI or fallback
    const searchTerm = await searchGenerator.generateRandomSearch(category);
    const platform = config.platforms[0]; // Use first platform as default

    console.log(chalk.magenta(`🎲 Random search term: "${searchTerm}"`));

    const results = await getMultiPlatformVideos(searchTerm, {
      platform: platform,
      limit: count,
      quality: 1080
    });

    // Add category metadata
    return results.map(result => ({
      ...result,
      category: category,
      hashtags: config.hashtags,
      videoId: result.id,
      searchTerm: searchTerm // Add search term for reference
    }));

  } catch (err) {
    console.error(chalk.red(`❌ Failed to fetch ${category} videos: ${err.message}`));
    throw err;
  }
}

module.exports = {
  getMultiPlatformVideos,
  getVideosByCategory,
  MultiPlatformDownloader
};