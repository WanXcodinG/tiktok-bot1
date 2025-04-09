// const ytdl = require("ytdl-core");
const ytdl = require("@distube/ytdl-core");
const fs = require("fs");
const path = require("path");

async function fetchYouTubeMusic(keyword = "anime background music") {
  const searchQuery = encodeURIComponent(`${keyword} royalty-free background music`);
  const searchUrl = `https://www.youtube.com/results?search_query=${searchQuery}`;

  const ytsr = require('yt-search');
  const results = await ytsr(searchQuery);
  const firstMusicVideo = results.videos.find(video => video.duration.seconds < 300); // short

  if (!firstMusicVideo) throw new Error("No music video found");

  const outputPath = path.join(__dirname, `../assets/music/${firstMusicVideo.videoId}.mp3`);
  const stream = ytdl(firstMusicVideo.url, { filter: "audioonly" });

  await new Promise((resolve, reject) => {
    stream.pipe(fs.createWriteStream(outputPath))
      .on("finish", () => {
        console.log(`🎧 Downloaded music: ${firstMusicVideo.title}`);
        resolve();
      })
      .on("error", reject);
  });

  return outputPath;
}

module.exports = fetchYouTubeMusic;
