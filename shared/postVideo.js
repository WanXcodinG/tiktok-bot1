// shared/postVideo.js
const generateCaption = require("../utils/generateCaption");
const editAnimeVideo = require("../edit/animeEditor");
const addMusicToVideo = require("../edit/addMusic");
const uploadToTikTok = require("../upload/tiktokUploader");

async function postVideo(category, fetchFn, hashtags) {
  const results = await fetchFn(1);
  const videoId = results[0].videoId;

  const rawPath = `./videos/raw/${videoId}.mp4`;
  const editedPath = `./videos/edited/${videoId}-edited.mp4`;
  const finalPath = `./videos/edited/${videoId}-final.mp4`;

  await editAnimeVideo(rawPath, editedPath);
  await addMusicToVideo(editedPath, finalPath);

  const caption = await generateCaption(hashtags);
  await uploadToTikTok(finalPath, caption);
}

module.exports = postVideo;
