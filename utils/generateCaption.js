// const { OpenAI } = require("openai");

// const openai = new OpenAI({
//   apiKey: process.env.OPENAI_API_KEY,
// });

// async function generateCaption(topic) {
//   const prompt = `Write a short, attention-grabbing TikTok caption for a video about: "${topic}". Include relevant, trending hashtags. Keep it under 100 characters.`;

//   const chat = await openai.chat.completions.create({
//     model: "gpt-3.5-turbo",
//     messages: [{ role: "user", content: prompt }],
//     temperature: 0.8,
//   });

//   const caption = chat.choices[0].message.content.trim();
//   console.log("🧠 Generated Caption:", caption);
//   return caption;
// }

// module.exports = generateCaption;


const axios = require("axios");

const HF_API_KEY = "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";


async function generateCaption(topic) {
  const prompt = `Write a short, attention-grabbing TikTok caption for a video about: "${topic}". Include relevant, trending hashtags. Keep it under 100 characters.`;

  try {
    const response = await axios.post(
      "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.1",
      {
        inputs: prompt,
        parameters: {
          temperature: 0.8,
          max_new_tokens: 60,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const result = response.data;
    const caption = result[0]?.generated_text?.split("\n")[0].trim();
    console.log("🧠 Generated Caption:", caption);
    return caption;
  } catch (err) {
    console.error("❌ Failed to generate caption:", err.message);
    return "🔥 Check this out! #trending #fyp";
  }
}

module.exports = generateCaption;
