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
- 🧠 AI-generated captions with trendy hashtags
- 🎶 Adds background music based on category
- 🤖 Automates TikTok uploads with Puppeteer
- ⏱️ Supports scheduled posting
- 🧹 Auto-cleans video folders daily

---

## 🧰 Requirements

- Node.js v16+
- FFMPEG (must be installed and added to your PATH)
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
├── utils/ # Caption generator, cleanup 
├── videos/ # Raw and edited video folders 
│ ├── raw/ 
│ └── edited/ 
├── .env # Contains TikTok session or secrets 
└── index.js # Entrypoint (optional)

```
---

## ⚙️ Setup

1. **Clone the repo**
   ```
   git clone https://github.com/TA-wiah/tiktok-bot.git
   cd tiktok-bot
   ```
- Install dependencies
```
npm install

Configure .env
TIKTOK_SESSION=your_cookie_session

Run interactively
node bot.js

Run scheduled tasks
node scheduler.js
```
# 🧠 Customization
You can:

✨ Add more fetch categories (fetch/)

🧱 Replace TikTok uploader with your own logic

🎵 Change or add music tracks in addMusicToVideo

🧹 Auto Cleanup

The bot runs a cron job every day at 3:00 AM to delete old videos:
```
cron.schedule("0 3 * * *", cleanup);
```
### 💡 Example Output

📱 TikTok Content Bot
> You selected: Anime Edited Videos

📥 Downloading video...

🎬 Editing video...

🎶 Adding music...

📝 Generating caption...

📤 Uploading to TikTok...

🚀 Posted to TikTok!

## 🙌 Contributing
Forks, stars ⭐, issues, and pull requests are welcome!
