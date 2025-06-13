#!/usr/bin/env node

/**
 * Direct bot runner - for running just the interactive bot
 */
const chalk = require("chalk");

async function runBot() {
  try {
    console.log(chalk.cyan("🚀 Starting TikTok Bot (Interactive Mode)..."));
    const bot = require("./bot");
    await bot();
    console.log(chalk.green("✅ Bot session completed!"));
  } catch (err) {
    console.error(chalk.red(`❌ Bot error: ${err.message}`));
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runBot();
}

module.exports = runBot;