const postVideo = require("../shared/postVideo");
const getTechVideos = require("../fetch/getTechVideos");

module.exports = async () => {
  await postVideo("Tech", getTechVideos, "tech, ai, gadgets, programming");
};
