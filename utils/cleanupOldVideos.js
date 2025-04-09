const fs = require("fs");
const path = require("path");

function cleanupOldFiles(dir, daysOld = 7) {
  const now = Date.now();
  const cutoff = now - daysOld * 24 * 60 * 60 * 1000;

  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    if (stat.mtimeMs < cutoff) {
      fs.unlinkSync(filePath);
      console.log(`🗑️ Deleted old file: ${filePath}`);
    }
  }
}

function cleanupAll() {
  cleanupOldFiles(path.join(__dirname, "../videos/raw"));
  cleanupOldFiles(path.join(__dirname, "../videos/edited"));
}

module.exports = cleanupAll;
