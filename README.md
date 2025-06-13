# 🤖 TikTok Multi-Platform Content Bot

[![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)](https://nodejs.org)
[![License](https://img.shields.io/github/license/your-username/tiktok-bot)](LICENSE)
[![Made With](https://img.shields.io/badge/Made%20With-JavaScript-yellow)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![TikTok Automation](https://img.shields.io/badge/Automation-TikTok-blueviolet)](#)

> ⚡ Simple and clean bot to fetch, edit, and upload content to TikTok from **multiple platforms** including YouTube, TikTok, Instagram, Facebook, and Twitter using **yt-dlp**. Supports **AI-generated captions** and keeps **original video audio**.

---

## 🌐 Supported Platforms

| Platform | Icon | Features | Max Duration |
|----------|------|----------|--------------|
| **YouTube** | 📺 | Search, Playlists, Subtitles | 12 hours |
| **TikTok** | 🎵 | Vertical videos, Music | 10 minutes |
| **Instagram** | 📸 | Stories, Reels, IGTV | 1 hour |
| **Facebook** | 👥 | Live videos, Stories | 4 hours |
| **Twitter/X** | 🐦 | Short clips | 2 minutes 20s |

---

## ✨ Features

- 🌐 **Multi-platform support** - Download from YouTube, TikTok, Instagram, Facebook, Twitter
- 🔗 **Flexible input** - URLs or search queries
- 🧠 **AI-generated captions** using Google Gemini with trendy hashtags
- 🎵 **Original audio preserved** - No background music overlay
- 🤖 **Automated TikTok uploads** with Puppeteer
- 🧹 **Auto-cleanup** of old video files
- 🎬 **Professional video editing** with FFmpeg
- 📊 **Platform-specific optimization**

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
Search any platform with custom keywords:
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
│   ├── animeEditor.js              # FFmpeg video editor
│   └── addMusic.js                 # Audio processing
├── 📁 upload/                   # TikTok automation
│   └── tiktokUploader.js           # Puppeteer uploader
├── 📁 utils/                    # Utilities
│   ├── generateCaption.js          # Gemini AI captions
│   ├── platformUtils.js            # Platform detection
│   └── videoCleanup.js             # File cleanup
├── 📁 videos/                   # Video storage
│   ├── raw/                        # Downloaded videos
│   └── edited/                     # Processed videos
├── bot.js                       # Interactive CLI
└── index.js                     # Main entry point
```

---

## 🤖 AI Caption Generation

Powered by **Google Gemini AI** for intelligent, context-aware captions:

### **Smart Features:**
- 🎯 **Context-aware** based on video content and category
- 📈 **Trending hashtags** automatically included
- 😊 **Emoji optimization** for better engagement
- 📏 **Character limits** optimized for TikTok
- 🔄 **Fallback system** with pre-written captions

### **Example Captions:**
```
🔥 This hits different! #entertainment #viral #fyp #trending
🤖 Tech that will blow your mind #tech #gaming #review #fyp  
😂 Can't stop laughing at this #funny #comedy #viral #fyp
📚 Learn something new today #educational #learn #tips #fyp
```

---

## ⚙️ Advanced Configuration

### **Platform-Specific Settings**
```javascript
// Automatic quality optimization per platform
const settings = {
  'YouTube': { quality: '1080p', aspectRatio: '16:9' },
  'TikTok': { quality: '720p', aspectRatio: '9:16' },
  'Instagram': { quality: '720p', aspectRatio: '9:16' },
  'Facebook': { quality: '720p', aspectRatio: '16:9' },
  'Twitter': { quality: '720p', aspectRatio: '16:9' }
};
```

### **Custom Download Options**
```javascript
const options = {
  quality: 1080,        // Max resolution
  audioOnly: false,     // Download audio only
  platform: 'YouTube',  // Preferred platform
  limit: 5             // Number of videos
};
```

---

## 💡 Example Workflow

```
📱 TikTok Multi-Platform Content Bot

? What do you want to do? 🎬 Process videos now (Interactive)
? How do you want to get videos? 🔗 Provide direct URLs
? Enter video URLs: https://youtube.com/watch?v=abc123
? What category best describes these videos? Tech/Gaming

🌐 Multi-Platform Video Fetcher Started
✅ Detected 📺 YouTube: https://youtube.com/watch?v=abc123
📥 Downloading from YouTube...
✅ Downloaded successfully! Size: 45.2MB

🎬 Processing: Epic Tech Review 2024
📱 Platform: YouTube
🎬 Editing video...
🎵 Processing video with original audio...
📝 Generating caption...
🤖 Calling Gemini API...
✅ Gemini Generated Caption: 🤖 This tech will change everything! #tech #gaming #review #fyp
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

**❌ "Download failed"**
- Some videos may be geo-restricted
- Try different videos from the same platform
- Check your internet connection

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

## 🙌 Contributing

We welcome contributions! Here's how you can help:

- 🐛 **Report bugs** via GitHub issues
- 💡 **Suggest features** for new platforms or functionality
- 🔧 **Submit pull requests** with improvements
- ⭐ **Star the repo** if you find it useful
- 📖 **Improve documentation**

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