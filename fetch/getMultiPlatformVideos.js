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

module.exports = {
  getMultiPlatformVideos,
  MultiPlatformDownloader
};