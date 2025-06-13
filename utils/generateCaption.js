const { GoogleGenerativeAI } = require("@google/generative-ai");

// Fallback captions untuk berbagai kategori
const fallbackCaptions = {
  anime: [
    "🔥 Epic anime moments that hit different #anime #edit #fyp #viral",
    "This anime scene goes HARD 💯 #animeedit #foryou #trending #epic",
    "POV: You found the perfect anime edit ✨ #anime #viral #fyp #edit",
    "Anime hits different at 3AM 🌙 #animemoments #fyp #trending #viral"
  ],
  tech: [
    "🤖 Future tech that will blow your mind #tech #ai #innovation #fyp",
    "This AI is getting scary good 😳 #technology #ai #future #viral",
    "Tech that feels like magic ✨ #innovation #gadgets #fyp #trending",
    "The future is NOW 🚀 #tech #ai #future #mindblown #fyp"
  ],
  horror: [
    "😱 This gave me chills... #horror #scary #creepy #fyp #viral",
    "POV: You're home alone and hear this 👻 #horror #scary #fyp",
    "Why did I watch this at night? 🌙 #horror #creepy #viral #fyp",
    "Sleep is overrated anyway 😰 #horror #scary #trending #fyp"
  ],
  movie: [
    "📱 Made entirely on a phone! #shortfilm #movie #creative #fyp",
    "Plot twist hits different 🎬 #storytime #movie #viral #fyp",
    "This short film is EVERYTHING ✨ #creative #movie #fyp #art",
    "Phone cameras are getting insane 📱 #filmmaking #movie #fyp"
  ]
};

function getRandomFallbackCaption(topic) {
  const lowerTopic = topic.toLowerCase();
  
  if (lowerTopic.includes('anime')) {
    return fallbackCaptions.anime[Math.floor(Math.random() * fallbackCaptions.anime.length)];
  } else if (lowerTopic.includes('tech') || lowerTopic.includes('ai')) {
    return fallbackCaptions.tech[Math.floor(Math.random() * fallbackCaptions.tech.length)];
  } else if (lowerTopic.includes('horror') || lowerTopic.includes('scary')) {
    return fallbackCaptions.horror[Math.floor(Math.random() * fallbackCaptions.horror.length)];
  } else if (lowerTopic.includes('movie') || lowerTopic.includes('film')) {
    return fallbackCaptions.movie[Math.floor(Math.random() * fallbackCaptions.movie.length)];
  }
  
  // Default fallback
  return "🔥 This hits different! #viral #fyp #trending #foryou";
}

async function generateCaption(topic) {
  console.log(`🧠 Generating caption with Gemini for: ${topic}`);
  
  // Cek apakah ada API key Gemini di environment
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.log("⚠️ GEMINI_API_KEY not found in environment, using fallback");
    const fallbackCaption = getRandomFallbackCaption(topic);
    console.log("🔄 Using fallback caption:", fallbackCaption);
    return fallbackCaption;
  }
  
  try {
    // Initialize Gemini AI with updated model
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" }); // Updated model
    
    const prompt = `Create a catchy TikTok caption for a video about: "${topic}". 
    Requirements:
    - Maximum 100 characters
    - Include relevant trending hashtags
    - Use emojis to make it engaging
    - Make it attention-grabbing and viral-worthy
    - Focus on the main topic: ${topic}
    
    Just return the caption, nothing else.`;
    
    console.log("🤖 Calling Gemini API...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const caption = response.text().trim();
    
    // Validasi caption
    if (caption && caption.length > 10 && caption.length <= 150) {
      console.log("✅ Gemini Generated Caption:", caption);
      return caption;
    } else {
      throw new Error("Invalid caption length or content");
    }
    
  } catch (err) {
    console.log(`❌ Gemini API failed: ${err.message}`);
    
    // Gunakan fallback jika Gemini gagal
    const fallbackCaption = getRandomFallbackCaption(topic);
    console.log("🔄 Using fallback caption:", fallbackCaption);
    return fallbackCaption;
  }
}

module.exports = generateCaption;