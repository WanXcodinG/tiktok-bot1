const chalk = require("chalk");

async function main() {
  console.log(chalk.blueBright("🤖 TikTok All-in-One Bot"));
  console.log(chalk.gray("All functions integrated in one script!"));

  try {
    // Import and run the all-in-one bot
    const allInOneBot = require("./all.js");
    await allInOneBot();
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