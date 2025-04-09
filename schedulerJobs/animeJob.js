// runAnime.js
const postVideo = require("../shared/postVideo");
const getAnimeVideos = require("../fetch/getAnimeVideos");

module.exports = async function runAnime() {
  try {
    console.log("✅ Posting anime video...");

    await postVideo("Anime Edited Videos", getAnimeVideos, "anime edit, fight scenes, Japanese animation");

    console.log("✅ Anime video posted successfully.");
  } catch (err) {
    console.error("❌ Failed to post anime video:", err.message);
  }
};
