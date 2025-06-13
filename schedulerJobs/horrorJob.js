const postVideo = require("../shared/postVideo");
const chalk = require("chalk");

module.exports = async function runHorror() {
  try {
    console.log(chalk.cyan("👻 Starting scheduled horror video post..."));

    // Use new multi-platform system
    await postVideo("Horror Clips", "Horror Clips", "horror, scary, thriller, creepy");

    console.log(chalk.green("✅ Scheduled horror video posted successfully."));
  } catch (err) {
    console.error(chalk.red("❌ Failed to post scheduled horror video:"), err.message);
  }
};