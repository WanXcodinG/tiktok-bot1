#!/usr/bin/env node

/**
 * Direct scheduler runner - for running just the scheduler
 */
const chalk = require("chalk");

async function runScheduler() {
  try {
    console.log(chalk.cyan("⏰ Starting TikTok Bot Scheduler..."));
    const scheduler = require("./scheduler");
    await scheduler();
    console.log(chalk.green("✅ Scheduler setup completed!"));
  } catch (err) {
    console.error(chalk.red(`❌ Scheduler error: ${err.message}`));
    process.exit(1);
  }
}

// Only run if this file is executed directly
if (require.main === module) {
  runScheduler();
}

module.exports = runScheduler;