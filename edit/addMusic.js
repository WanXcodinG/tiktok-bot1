const fetchMusic = require("../utils/fetchMusic");
const ffmpeg = require("fluent-ffmpeg");

async function addMusicToVideo(videoPath, outputPath, category = "anime") {
  const musicPath = await fetchMusic(category); // Downloads fresh music

  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(videoPath)
      .addInput(musicPath)
      .outputOptions("-shortest")      // Ensures the output is the shortest of both audio/video
      .outputOptions("-map 0:v:0")    // Maps the video stream from input 0 (video)
      .outputOptions("-map 1:a:0")    // Maps the audio stream from input 1 (music)
      .outputOptions("-c:v copy")     // Copies the video codec without re-encoding
      .on("end", () => {
        console.log("🎶 Music added to video:", outputPath);
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("❌ Error during video processing:", err.message);
        reject(err);
      })
      .save(outputPath);
  });
}

module.exports = addMusicToVideo;
