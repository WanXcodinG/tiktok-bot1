// bot.js
const inquirer = require("inquirer");
const chalk = require("chalk");
require("dotenv").config();
const cron = require("node-cron");
const cleanup = require("./utils/cleanupOldVideos");

cron.schedule("0 3 * * *", cleanup); // 🕒 runs daily at 3:00 AM


async function main() {
  console.log(chalk.blueBright("📱 TikTok Content Bot"));

  const { category } = await inquirer.prompt([
    {
      type: "list",
      name: "category",
      message: "What type of content do you want to post?",
      choices: [
        "Anime Edited Videos",
        "Tech Shorts",
        "Horror Clips",
        "Made-Up TikTok Movies",
      ],
    },
  ]);

  console.log(chalk.green(`> You selected: ${category}`));

  const generateCaption = require("./utils/generateCaption");
  const editAnimeVideo = require("./edit/animeEditor");
  const addMusicToVideo = require("./edit/addMusic");
  const uploadToTikTok = require("./upload/tiktokUploader");

  switch (category) {
    case "Anime Edited Videos": {
      const getAnimeVideos = require("./fetch/getAnimeVideos");
      const results = await getAnimeVideos(1);
      const videoId = results[0].videoId;

      const rawPath = `./videos/raw/${videoId}.mp4`;
      const editedPath = `./videos/edited/${videoId}-edited.mp4`;
      const finalPath = `./videos/edited/${videoId}-final.mp4`;

      await editAnimeVideo(rawPath, editedPath);
      await addMusicToVideo(editedPath, finalPath);

      const caption = await generateCaption("anime edit, fight scenes, Japanese animation");
      await uploadToTikTok(finalPath, caption);
      break;
    }

    case "Tech Shorts": {
      const getTechVideos = require("./fetch/getTechVideos");
      const results = await getTechVideos(1);
      const videoId = results[0].videoId;

      const rawPath = `./videos/raw/${videoId}.mp4`;
      const editedPath = `./videos/edited/${videoId}-edited.mp4`;
      const finalPath = `./videos/edited/${videoId}-final.mp4`;
      await editAnimeVideo(rawPath, editedPath); // reuse editor
      await addMusicToVideo(editedPath, finalPath, "tech");

      // inside each case block in bot.js
      const postVideo = require("./shared/postVideo");
      const getAnimeVideos = require("./fetch/getAnimeVideos");
      await postVideo("Tech", getTechVideos, "tech, ai, gadgets, programming");

      const caption = await generateCaption("tech content, gadgets, AI tools, coding tips");
      await uploadToTikTok(finalPath, caption);
      break;
    }

    case "Horror Clips": {
      const getHorrorVideos = require("./fetch/getHorrorVideos");
      const results = await getHorrorVideos(1);
      const videoId = results[0].videoId;

      const rawPath = `./videos/raw/${videoId}.mp4`;
      const editedPath = `./videos/edited/${videoId}-edited.mp4`;
      const finalPath = `./videos/edited/${videoId}-final.mp4`;

      await editAnimeVideo(rawPath, editedPath); // reuse editor
      await addMusicToVideo(editedPath, finalPath, "horror");

      // inside each case block in bot.js
    const postVideo = require("./shared/postVideo");
    const getAnimeVideos = require("./fetch/getAnimeVideos");
    await postVideo("Horror", getHorrorVideos, "horror, scary, thriller, creepy");


      const caption = await generateCaption("horror short film, scary story, spooky night");
      await uploadToTikTok(finalPath, caption);
      break;
    }

    case "Made-Up TikTok Movies": {
      const getMovies = require("./fetch/getTikTokMovies");
      const results = await getMovies(1);
      const videoId = results[0].videoId;

      const rawPath = `./videos/raw/${videoId}.mp4`;
      const editedPath = `./videos/edited/${videoId}-edited.mp4`;
      const finalPath = `./videos/edited/${videoId}-final.mp4`;

      await editAnimeVideo(rawPath, editedPath); // reuse editor
      await addMusicToVideo(editedPath, finalPath, "made-up tiktok movies sound");

      // inside each case block in bot.js
      const postVideo = require("./shared/postVideo");
      const getAnimeVideos = require("./fetch/getAnimeVideos");
      await postVideo("TikTok Movie", getMovies, "shortfilm, storytime, acting, movie");

      const caption = await generateCaption("short movie, tiktok drama, storytime series");
      await uploadToTikTok(finalPath, caption);
      break;
    }

    default:
      console.log(chalk.red("❌ Invalid category selected."));
  }
}

// main();
module.exports = main;
