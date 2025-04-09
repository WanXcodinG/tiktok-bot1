const cron = require("node-cron");
const inquirer = require("inquirer");
const chalk = require("chalk");
const cleanup = require("./utils/cleanupOldVideos");

const jobs = {
  "Anime Edited Videos": require("./schedulerJobs/animeJob"),
  "Tech Shorts": require("./schedulerJobs/techJob"),
  "Horror Clips": require("./schedulerJobs/horrorJob"),
  "Made-Up TikTok Movies": require("./schedulerJobs/movieJob"),
};

async function startScheduler() {
  // Clean old videos daily at 3:00 AM
  cron.schedule("0 3 * * *", cleanup);
  console.log(chalk.cyan("🕒 TikTok Bot Scheduler Setup"));

  const { selectedCategories } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "selectedCategories",
      message: "Which categories do you want to auto-post?",
      choices: Object.keys(jobs),
    },
  ]);

  for (const category of selectedCategories) {
    const { time } = await inquirer.prompt([
      {
        type: "input",
        name: "time",
        message: `⏰ Enter time for "${category}" post (24hr format e.g. 08:00):`,
        validate: input =>
          /^([01]\d|2[0-3]):[0-5]\d$/.test(input) || "Enter time in HH:MM format",
      },
    ]);

    const [hour, minute] = time.split(":");
    const cronTime = `${minute} ${hour} * * *`;

    cron.schedule(cronTime, jobs[category]);
    console.log(chalk.green(`✅ Scheduled "${category}" at ${time}`));
  }

  console.log(chalk.blueBright("📅 All schedules set! Bot will post automatically."));
}

module.exports = startScheduler;
