# 🎯 Simple TikTok Uploader (Python + Selenium)

**Upload video files ke TikTok dengan AI caption - PYTHON VERSION!**

## ✨ Fitur (Hanya 3 Fungsi)

1. **🔑 TikTok Login** - Auto-login dengan cookies
2. **📤 Video Upload** - Upload file lokal ke TikTok  
3. **🤖 AI Caption** - Generate caption dengan Gemini AI

## 🚀 Quick Start

### 1. Install Python Dependencies
```bash
pip install -r requirements.txt
```

### 2. Install ChromeDriver
**Windows:**
```bash
# Download ChromeDriver dari: https://chromedriver.chromium.org/
# Extract ke folder yang ada di PATH
```

**Linux/Mac:**
```bash
# Ubuntu/Debian
sudo apt-get install chromium-chromedriver

# Mac dengan Homebrew
brew install chromedriver
```

### 3. Setup Environment
Buat file `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*Dapatkan gratis: [Google AI Studio](https://makersuite.google.com/app/apikey)*

### 4. Run
```bash
python tiktok_uploader.py
```

## 🎯 Usage

```
🎯 Simple TikTok Uploader (Python + Selenium)
Features: TikTok Login + Video Upload + AI Captions
--------------------------------------------------

📁 Enter video file path: ./my-video.mp4

📝 Caption Options:
1. 🤖 Generate with AI (Gemini)
2. ✍️ Write custom caption
3. 🚫 No caption

Choose option (1-3): 1
📝 Describe your video (for AI context): funny cat compilation

🤖 Generating AI caption...
✅ AI Generated: 🐱 These cats are pure comedy gold! 😂 #cat #funny #viral #fyp #pets #comedy

📋 Upload Summary:
----------------------------------------
📁 Video: my-video.mp4
📏 Size: 45.1MB
✍️ Caption: 🐱 These cats are pure comedy gold! 😂 #cat #funny #viral #fyp #pets #comedy
----------------------------------------

🚀 Proceed with upload? (y/n): y

🔑 Logging in to TikTok...
🌐 Navigating to TikTok upload page...
🍪 Cookies loaded
✅ Already logged in!

📤 Starting upload...
📁 Video: my-video.mp4 (45.1MB)
📤 Uploading video...
✅ Video file uploaded
⏳ Waiting for video processing...
✍️ Adding caption...
✅ Found caption input: div[contenteditable='true']
✅ Caption added: 🐱 These cats are pure comedy gold! 😂 #cat #funny #viral #fyp #pets #comedy
🚀 Attempting to post video...
🚀 Posted successfully! (Strategy 1: data-e2e)

🎉 SUCCESS! Video uploaded to TikTok!
📱 Check your TikTok profile to see the posted video

Press Enter to close browser...
```

## 📁 Files

```
project/
├── tiktok_uploader.py     # ← MAIN FILE (semua kode di sini)
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables
├── .env.example           # Template
├── README.md              # Documentation
└── tiktok_cookies.pkl     # Auto-generated cookies
```

## 🔧 Supported Formats

- ✅ MP4 (recommended)
- ✅ MOV
- ✅ AVI  
- ✅ MKV
- ✅ WEBM

## 🛠️ Requirements

- **Python 3.7+**
- **Chrome Browser** (latest version)
- **ChromeDriver** (auto-detected or manual install)
- **Gemini API Key** (gratis untuk AI captions)

## 🚨 Notes

- **First run:** Login manual sekali, selanjutnya otomatis dengan cookies
- **File size:** Max ~100MB (TikTok limit)
- **AI Caption:** Perlu Gemini API key (gratis)
- **Browser:** Chrome akan terbuka untuk upload
- **Cookies:** Disimpan otomatis untuk login berikutnya

## 🔧 Troubleshooting

**❌ ChromeDriver not found:**
```bash
# Download dari: https://chromedriver.chromium.org/
# Pastikan ChromeDriver ada di PATH
```

**❌ Selenium errors:**
```bash
pip install --upgrade selenium
```

**❌ Login gagal:**
- Hapus file `tiktok_cookies.pkl`
- Login manual sekali lagi

**Simple & Powerful! 🎉**