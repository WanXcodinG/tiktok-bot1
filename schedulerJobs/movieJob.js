const postVideo = require("../shared/postVideo");
const chalk = require("chalk");

module.exports = async function runMovie() {
  try {
    console.log(chalk.cyan("🎬 Starting scheduled movie video post..."));

    // Use new multi-platform system
    await postVideo("Made-Up TikTok Movies", "Made-Up TikTok Movies", "shortfilm, storytime, acting, movie");

    console.log(chalk.green("✅ Scheduled movie video posted successfully."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to post scheduled movie video:"), err.message);
  }
};