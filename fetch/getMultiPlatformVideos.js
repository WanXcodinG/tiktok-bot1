const MultiPlatformDownloader = require('./multiPlatformDownloader');
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
 * Get videos by category with mixed sources
 */
async function getVideosByCategory(category, count = 1) {
  const categoryMappings = {
    'Anime Edited Videos': {
      searchTerms: ['anime AMV edit', 'anime fight scenes', 'anime compilation'],
      platforms: ['YouTube'],
      hashtags: 'anime edit, fight scenes, Japanese animation'
    },
    'Tech Shorts': {
      searchTerms: ['tech review', 'AI technology', 'gadget unboxing'],
      platforms: ['YouTube'],
      hashtags: 'tech, ai, gadgets, programming'
    },
    'Horror Clips': {
      searchTerms: ['horror short film', 'scary videos', 'creepy stories'],
      platforms: ['YouTube'],
      hashtags: 'horror, scary, thriller, creepy'
    },
    'Made-Up TikTok Movies': {
      searchTerms: ['short film phone', 'TikTok movie', 'vertical cinema'],
      platforms: ['YouTube', 'TikTok'],
      hashtags: 'shortfilm, storytime, acting, movie'
    },
    'TikTok Viral': {
      searchTerms: ['viral TikTok', 'trending TikTok'],
      platforms: ['TikTok'],
      hashtags: 'viral, trending, tiktok, fyp'
    },
    'Instagram Reels': {
      searchTerms: ['Instagram reels', 'viral reels'],
      platforms: ['Instagram'],
      hashtags: 'reels, instagram, viral, trending'
    }
  };

  const config = categoryMappings[category];
  if (!config) {
    throw new Error(`Category "${category}" not supported`);
  }

  console.log(chalk.cyan(`🎯 Fetching ${category} videos...`));

  // Use search terms to find videos
  const searchTerm = config.searchTerms[Math.floor(Math.random() * config.searchTerms.length)];
  const platform = config.platforms[0]; // Use first platform as default

  try {
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
      videoId: result.id
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