const postVideo = require("../shared/postVideo");
const chalk = require("chalk");

module.exports = async function runTech() {
  try {
    console.log(chalk.cyan("🤖 Starting scheduled tech video post..."));

    // Use new multi-platform system
    await postVideo("Tech Shorts", "Tech Shorts", "tech, ai, gadgets, programming");

    console.log(chalk.green("✅ Scheduled tech video posted successfully."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to post scheduled tech video:"), err.message);
  }
};