# 🤖 TikTok Multi-Platform Content Bot

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/github/license/your-username/tiktok-bot)](LICENSE)
[![Made With](https://img.shields.io/badge/Made%20With-JavaScript-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TikTok Automation](https://img.shields.io/badge/Automation-TikTok-blueviolet)](#)

> ⚡ Simple bot to download videos from **multiple platforms** and upload to TikTok with **original audio preserved**.

---

## 🌐 Supported Platforms

| Platform | Icon | Features |
|----------|------|----------|
| **YouTube** | 📺 | Search, Download |
| **TikTok** | 🎵 | Direct Download |
| **Instagram** | 📸 | Direct Download |
| **Facebook** | 👥 | Direct Download |
| **Twitter/X** | 🐦 | Direct Download |

---

## ✨ Features

- 🌐 **Multi-platform support** - Download from YouTube, TikTok, Instagram, Facebook, Twitter
- 🔗 **Simple input** - URLs or search queries
- 🧠 **AI-generated captions** using Google Gemini
- 🎵 **Original audio preserved** - No background music overlay
- 🤖 **Automated TikTok uploads** with Puppeteer
- 🧹 **Auto-cleanup** of old video files
- 🎬 **Simple video editing** with FFmpeg

---

## 🧰 Requirements

- **Node.js v16+**
- **FFmpeg** (must be installed and added to PATH)
- **yt-dlp** (automatically installed via npm)
- **Google Gemini API Key** (free from Google AI Studio)
- **TikTok account** for uploads

---

## 🚀 Quick Start

### 1. **Installation**
```bash
git clone https://github.com/TA-wiah/tiktok-bot.git
cd tiktok-bot
npm install
```

### 2. **Setup Environment**
```bash
cp .env.example .env
```

Edit `.env` file:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```

Get your free Gemini API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

### 3. **Run the Bot**
```bash
npm start
```

---

## 🎯 Usage Options

### **🔗 Direct URLs**
Paste any supported platform URL:
```
https://youtube.com/watch?v=VIDEO_ID
https://tiktok.com/@user/video/VIDEO_ID
https://instagram.com/p/POST_ID
https://facebook.com/watch/?v=VIDEO_ID
https://twitter.com/user/status/TWEET_ID
```

### **🔍 Search by Keywords**
Search YouTube with custom keywords:
```
"funny cat videos"
"tech review 2024"
"cooking tutorial"
```

---

## 🧭 Project Structure

```
tiktok-bot/
├── 📁 fetch/                    # Multi-platform downloaders
│   ├── multiPlatformDownloader.js  # Core yt-dlp wrapper
│   └── getMultiPlatformVideos.js   # Main fetching logic
├── 📁 edit/                     # Video processing
│   ├── videoEditor.js              # Simple video editor
│   └── addMusic.js                 # Audio processing
├── 📁 upload/                   # TikTok automation
│   └── tiktokUploader.js           # Puppeteer uploader
├── 📁 utils/                    # Utilities
│   ├── generateCaption.js          # Gemini AI captions
│   └── videoCleanup.js             # File cleanup
├── 📁 videos/                   # Video storage
│   ├── raw/                        # Downloaded videos
│   └── edited/                     # Processed videos
├── bot.js                       # Interactive CLI
└── index.js                     # Main entry point
```

---

## 🤖 AI Caption Generation

Powered by **Google Gemini AI** for intelligent captions:

### **Example Captions:**
```
🔥 This hits different! #viral #fyp #trending #content
🤖 Mind-blowing content! #viral #fyp #trending #content
😂 Can't stop watching this #viral #fyp #trending #content
📚 Amazing content here #viral #fyp #trending #content
```

---

## 💡 Example Workflow

```
📱 TikTok Multi-Platform Content Bot

? What do you want to do? 🎬 Process videos now (Interactive)
? How do you want to get videos? 🔗 Provide direct URLs
? Enter video URLs: https://youtube.com/watch?v=abc123

🌐 Multi-Platform Video Fetcher Started
✅ Detected 📺 YouTube: https://youtube.com/watch?v=abc123
📥 Downloading from YouTube...
✅ Downloaded successfully! Size: 45.2MB

🎬 Processing: Amazing Video Title
📱 Platform: YouTube
🎬 Editing video...
🎵 Processing video with original audio...
📝 Generating caption...
🤖 Calling Gemini API...
✅ Gemini Generated Caption: 🔥 This hits different! #viral #fyp #trending #content
📤 Uploading to TikTok...
🚀 Video posted successfully!
```

---

## 🔧 Troubleshooting

### **Common Issues:**

**❌ "yt-dlp not found"**
- The package installs automatically via npm
- Restart your terminal after installation

**❌ "Platform not supported"**  
- Check the supported platforms list above
- Ensure URL format is correct

**❌ "GEMINI_API_KEY not found"**
- Create a `.env` file in the project root
- Get your free API key from [Google AI Studio](https://makersuite.google.com/app/apikey)

---

## 🔒 Privacy & Ethics

- ✅ **Respects platform rate limits**
- ✅ **Only downloads publicly available content**
- ✅ **Adds delays between downloads**
- ✅ **Follows platform terms of service**
- ⚠️ **Always credit original creators**
- ⚠️ **Use for educational/personal purposes**

---

## 📄 License

This project is licensed under the **BSD 3-Clause License** - see the [LICENSE](LICENSE) file for details.

---

## 🚨 Disclaimer

This tool is for educational and personal use only. Always respect:
- Platform terms of service
- Copyright laws
- Content creator rights
- Rate limits and fair usage

**Use responsibly and ethically!** 🙏