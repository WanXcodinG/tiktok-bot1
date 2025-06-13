const fs = require("fs");
const path = require("path");
const VideoCleanup = require("./videoCleanup");
const chalk = require("chalk");

async function cleanupAll() {
  try {
    console.log(chalk.cyan("🕒 Daily cleanup started..."));
    
    const videoCleanup = new VideoCleanup();
    
    // Perform comprehensive cleanup
    await videoCleanup.performFullCleanup();
    
    // Clean files older than 24 hours
    await videoCleanup.cleanupOldFiles(24);
    
    // Manage music files (keep max 15)
    await videoCleanup.cleanupUnusedMusic(15);
    
    console.log(chalk.green("✅ Daily cleanup completed!"));
    
  } catch (err) {
    console.error(chalk.red(`❌ Daily cleanup error: ${err.message}`));
  }
}

// Legacy function for backward compatibility
function cleanupOldFiles(dir, daysOld = 7) {
  const now = Date.now();
  const cutoff = now - daysOld * 24 * 60 * 60 * 1000;

  try {
    if (!fs.existsSync(dir)) {
      return;
    }

    const files = fs.readdirSync(dir);
    for (const file of files) {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.mtimeMs < cutoff) {
        fs.unlinkSync(filePath);
        console.log(`🗑️ Deleted old file: ${filePath}`);
      }
    }
  } catch (err) {
    console.error(chalk.red(`❌ Error cleaning ${dir}: ${err.message}`));
  }
}

// Legacy cleanup function
function legacyCleanupAll() {
  cleanupOldFiles(path.join(__dirname, "../videos/raw"));
  cleanupOldFiles(path.join(__dirname, "../videos/edited"));
}

module.exports = cleanupAll;