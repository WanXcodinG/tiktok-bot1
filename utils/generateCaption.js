const axios = require("axios");

// Fallback captions for different categories
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
  console.log(`🧠 Generating caption for: ${topic}`);
  
  // Try multiple free AI services
  const services = [
    () => tryHuggingFace(topic),
    () => tryGroqAPI(topic),
    () => tryLocalGeneration(topic)
  ];
  
  for (const service of services) {
    try {
      const caption = await service();
      if (caption && caption.length > 10) {
        console.log("✅ Generated Caption:", caption);
        return caption;
      }
    } catch (err) {
      console.log(`⚠️ Service failed: ${err.message}`);
      continue;
    }
  }
  
  // If all services fail, use fallback
  const fallbackCaption = getRandomFallbackCaption(topic);
  console.log("🔄 Using fallback caption:", fallbackCaption);
  return fallbackCaption;
}

async function tryHuggingFace(topic) {
  const prompt = `Write a short TikTok caption for: "${topic}". Include hashtags. Max 80 chars.`;
  
  const response = await axios.post(
    "https://api-inference.huggingface.co/models/microsoft/DialoGPT-medium",
    {
      inputs: prompt,
      parameters: {
        max_length: 80,
        temperature: 0.7,
        do_sample: true
      },
    },
    {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 10000
    }
  );

  return response.data[0]?.generated_text?.trim();
}

async function tryGroqAPI(topic) {
  // This would require a Groq API key, but it's free
  // For now, we'll skip this and go to local generation
  throw new Error("Groq API not configured");
}

function tryLocalGeneration(topic) {
  // Simple local caption generation based on keywords
  const hashtags = ["#fyp", "#viral", "#trending", "#foryou"];
  const emojis = ["🔥", "✨", "💯", "🚀", "⚡", "👀", "😱", "🎬"];
  
  const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
  const randomHashtags = hashtags.slice(0, 3).join(" ");
  
  const templates = [
    `${randomEmoji} This ${topic.split(',')[0]} hits different ${randomHashtags}`,
    `POV: You found the perfect ${topic.split(',')[0]} ${randomEmoji} ${randomHashtags}`,
    `${randomEmoji} Can't stop watching this ${randomHashtags}`,
    `This is why I love ${topic.split(',')[0]} ${randomEmoji} ${randomHashtags}`
  ];
  
  const caption = templates[Math.floor(Math.random() * templates.length)];
  return caption.length > 100 ? caption.substring(0, 97) + "..." : caption;
}

module.exports = generateCaption;