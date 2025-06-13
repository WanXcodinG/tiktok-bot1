# 🤖 TikTok Content Bot

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/github/license/your-username/tiktok-bot)](LICENSE)
[![Made With](https://img.shields.io/badge/Made%20With-JavaScript-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TikTok Automation](https://img.shields.io/badge/Automation-TikTok-blueviolet)](#)

> ⚡ Automatically fetch, edit, caption, and upload content to TikTok using YouTube videos. Supports **anime edits**, **tech shorts**, **horror clips**, and **TikTok-style short films**.

---

## 🖼️ Preview

| CLI Interaction | TikTok Upload Bot |
|-----------------|-------------------|
| ![CLI Prompt](https://your-image-link.com/cli.png) | ![TikTok Upload](https://your-image-link.com/upload.png) |

---

## ✨ Features

- 🎥 Fetches relevant videos from YouTube
- 🧠 **AI-generated captions using Google Gemini** with trendy hashtags
- 🎶 Adds background music based on category
- 🤖 Automates TikTok uploads with Puppeteer
- ⏱️ Supports scheduled posting
- 🧹 Auto-cleans video folders daily
- 🔄 Smart fallback system for captions

---

## 🧰 Requirements

- Node.js v16+
- FFMPEG (must be installed and added to your PATH)
- **Google Gemini API Key** (free from Google AI Studio)
- TikTok login session (cookie-based)

---

## 🧭 Project Structure
```
├── bot.js # Interactive CLI for user-driven posts 
├── scheduler.js # Cron job for daily automated posts 
├── fetch/ # Video grabbers for each category 
├── edit/ # Editor & music overlay 
├── upload/ # TikTok upload logic using Puppeteer 
├── shared/ # Shared posting utility 
├── utils/ # Caption generator with Gemini AI, cleanup 
├── videos/ # Raw and edited video folders 
│ ├── raw/ 
│ └── edited/ 
├── .env # Contains API keys and secrets 
└── index.js # Entrypoint (optional)
```
---

## ⚙️ Setup

1. **Clone the repo**
   ```bash
   git clone https://github.com/TA-wiah/tiktok-bot.git
   cd tiktok-bot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Get Google Gemini API Key**
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key (it's free!)
   - Copy your API key

4. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` file:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   TIKTOK_SESSION=your_cookie_session_optional
   ```

5. **Run interactively**
   ```bash
   node bot.js
   ```

6. **Run scheduled tasks**
   ```bash
   node scheduler.js
   ```

---

## 🤖 AI Caption Generation

The bot now uses **Google Gemini AI** for intelligent caption generation:

### ✅ **Smart Features:**
- **Context-aware captions** based on video category
- **Trending hashtags** automatically included
- **Emoji integration** for better engagement
- **Character limit optimization** for TikTok
- **Fallback system** if API is unavailable

### 📝 **Caption Examples:**
- **Anime:** `🔥 This anime fight scene hits different #anime #edit #fyp #viral`
- **Tech:** `🤖 AI technology that will blow your mind #tech #ai #future #fyp`
- **Horror:** `😱 Why did I watch this at 3AM? #horror #scary #creepy #fyp`
- **Movies:** `📱 Made entirely on phone! Plot twist 🎬 #shortfilm #creative #fyp`

---

## 🔧 Customization

You can:

✨ **Add more fetch categories** (fetch/)

🧱 **Replace TikTok uploader** with your own logic

🎵 **Change or add music tracks** in addMusicToVideo

🤖 **Customize AI prompts** in generateCaption.js

---

## 🧹 Auto Cleanup

The bot runs a cron job every day at 3:00 AM to delete old videos:
```javascript
cron.schedule("0 3 * * *", cleanup);
```

---

## 💡 Example Output

```
📱 TikTok Content Bot
> You selected: Anime Edited Videos

🔎 Searching YouTube for anime edits...
📥 Downloading video...
🎬 Editing video...
🎶 Adding music...
🧠 Generating caption with Gemini for: anime edit, fight scenes
🤖 Calling Gemini API...
✅ Gemini Generated Caption: 🔥 Epic anime fight that hits different #anime #edit #fyp #viral
📤 Uploading to TikTok...
🚀 Posted to TikTok!
```

---

## 🔑 API Keys & Setup

### **Google Gemini API (Free)**
1. Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy and paste into your `.env` file

### **TikTok Session (Optional)**
- The bot will automatically save your login session after first use
- Manual cookie setup is optional

---

## 🚨 Troubleshooting

### **Common Issues:**

**❌ "GEMINI_API_KEY not found"**
- Make sure you created a `.env` file
- Check that your API key is correctly set
- Verify the API key is active in Google AI Studio

**❌ "Failed to generate caption"**
- Bot will automatically use fallback captions
- Check your internet connection
- Verify API key permissions

**❌ "Video upload failed"**
- Make sure you're logged into TikTok in the browser
- Check if video file exists and is valid
- Try clearing cookies and logging in again

---

## 🙌 Contributing

Forks, stars ⭐, issues, and pull requests are welcome!

---

## 📄 License

This project is licensed under the BSD 3-Clause License - see the [LICENSE](LICENSE) file for details.