const postVideo = require("../shared/postVideo");
const getHorrorVideos = require("../fetch/getHorrorVideos");

module.exports = async () => {
  await postVideo("Horror", getHorrorVideos, "horror, scary, thriller, creepy");
};
