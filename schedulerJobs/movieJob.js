const postVideo = require("../shared/postVideo");
const getTikTokMovies = require("../fetch/getTikTokMovies");

module.exports = async () => {
  await postVideo("TikTok Movie", getTikTokMovies, "shortfilm, storytime, acting, movie");
};
