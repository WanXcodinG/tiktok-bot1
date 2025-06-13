const postVideo = require("../shared/postVideo");
const chalk = require("chalk");

module.exports = async function runAnime() {
  try {
    console.log(chalk.cyan("🎌 Starting scheduled anime video post..."));

    // Use new multi-platform system
    await postVideo("Anime Edited Videos", "Anime Edited Videos", "anime edit, fight scenes, Japanese animation");

    console.log(chalk.green("✅ Scheduled anime video posted successfully."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to post scheduled anime video:"), err.message);
  }
};