const inquirer = require("inquirer");
const chalk = require("chalk");

async function main() {
  console.log(chalk.blueBright("🤖 TikTok Multi-Platform Content Bot"));
  console.log(chalk.gray("Choose how you want to run the bot:"));

  const { mode } = await inquirer.prompt([
    {
      type: "list",
      name: "mode",
      message: "What do you want to do?",
      choices: [
        "🎬 Process videos now (Interactive)",
        "⏰ Setup cleanup schedules",
        "🧹 Cleanup files only",
        "❌ Exit"
      ],
    },
  ]);

  try {
    switch (mode) {
      case "🎬 Process videos now (Interactive)":
        console.log(chalk.cyan("Starting interactive video processing..."));
        const bot = require("./bot");
        await bot();
        break;
        
      case "⏰ Setup cleanup schedules":
        console.log(chalk.cyan("Starting cleanup scheduler setup..."));
        const scheduler = require("./scheduler");
        await scheduler();
        break;
        
      case "🧹 Cleanup files only":
        console.log(chalk.cyan("Starting cleanup..."));
        const VideoCleanup = require("./utils/videoCleanup");
        const cleanup = new VideoCleanup();
        await cleanup.performFullCleanup();
        console.log(chalk.green("✅ Cleanup completed!"));
        break;
        
      case "❌ Exit":
        console.log(chalk.gray("👋 Goodbye!"));
        process.exit(0);
        break;
        
      default:
        console.log(chalk.red("❌ Invalid option selected"));
        process.exit(1);
    }
  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal error: ${err.message}`));
    process.exit(1);
  });
}

module.exports = main;