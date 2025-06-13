const cron = require("node-cron");
const inquirer = require("inquirer");
const chalk = require("chalk");
const cleanup = require("./utils/cleanupOldVideos");
const VideoCleanup = require("./utils/videoCleanup");

async function startScheduler() {
  // Enhanced cleanup schedule - runs every 6 hours
  cron.schedule("0 */6 * * *", async () => {
    console.log(chalk.cyan("🕒 Scheduled cleanup started..."));
    const videoCleanup = new VideoCleanup();
    await videoCleanup.performFullCleanup();
  });
  
  // Daily deep cleanup at 3:00 AM
  cron.schedule("0 3 * * *", cleanup);
  
  console.log(chalk.cyan("🕒 TikTok Bot Scheduler Setup"));
  console.log(chalk.green("🧹 Enhanced cleanup schedules enabled!"));
  console.log(chalk.yellow("⚠️ Note: Category-based scheduling has been removed."));
  console.log(chalk.gray("Only cleanup schedules are active."));

  const { enableCleanup } = await inquirer.prompt([
    {
      type: "confirm",
      name: "enableCleanup",
      message: "Enable automatic cleanup schedules?",
      default: true
    }
  ]);

  if (enableCleanup) {
    console.log(chalk.green("✅ Cleanup schedules enabled!"));
    console.log(chalk.blueBright("📅 Cleanup will run automatically:"));
    console.log(chalk.gray("   - Every 6 hours: Basic cleanup"));
    console.log(chalk.gray("   - Daily at 3:00 AM: Deep cleanup"));
  } else {
    console.log(chalk.yellow("⚠️ Cleanup schedules disabled."));
  }
}

module.exports = startScheduler;