const VideoAnalyzer = require('./videoAnalyzer');
const chalk = require('chalk');

/**
 * Generate caption menggunakan video analysis
 */
async function generateCaption(videoPath, originalTitle = '', originalDescription = '') {
  try {
    console.log(chalk.cyan('🎬 Generating AI-powered caption from video content...'));
    
    const videoAnalyzer = new VideoAnalyzer();
    
    // Generate metadata berdasarkan analisis video
    const metadata = await videoAnalyzer.generateVideoMetadata(
      videoPath, 
      originalTitle, 
      originalDescription
    );
    
    return metadata.finalCaption;
    
  } catch (err) {
    console.error(chalk.red(`❌ Caption generation failed: ${err.message}`));
    
    // Fallback caption
    const fallbackCaption = "🔥 This video hits different! #viral #fyp #trending #amazing #content";
    console.log(chalk.yellow('🔄 Using fallback caption:'), fallbackCaption);
    
    return fallbackCaption;
  }
}

// Legacy function untuk backward compatibility
async function generateCaptionLegacy(topic) {
  const fallbackCaptions = [
    "🔥 This hits different! #viral #fyp #trending #content",
    "😱 You won't believe this! #viral #fyp #amazing #trending",
    "💯 Absolutely incredible! #viral #fyp #trending #mustwatch",
    "🤯 Mind = blown! #viral #fyp #trending #incredible"
  ];
  
  const randomCaption = fallbackCaptions[Math.floor(Math.random() * fallbackCaptions.length)];
  console.log(chalk.blue('🔄 Using legacy caption generation:'), randomCaption);
  
  return randomCaption;
}

module.exports = generateCaption;
module.exports.generateCaptionLegacy = generateCaptionLegacy;