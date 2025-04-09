const bot = require("./bot");
const scheduler = require("./scheduler");

// Start the bot to ask the user for their content choice
bot()
  .then(() => {
    console.log("✅ User interaction completed.");

    // After user interaction, start the scheduler for automated posts
    scheduler();
  })
  .catch((err) => {
    console.error("❌ Error in bot interaction:", err.message);
  });
