# 🎯 Simple TikTok Uploader

**Upload video files ke TikTok dengan AI caption - SUPER SIMPLE!**

## ✨ Fitur (Hanya 3 Fungsi)

1. **🔑 TikTok Login** - Auto-login dengan cookies
2. **📤 Video Upload** - Upload file lokal ke TikTok  
3. **🤖 AI Caption** - Generate caption dengan Gemini AI

## 🚀 Quick Start

### 1. Install
```bash
npm install
```

### 2. Setup Environment
Buat file `.env`:
```env
GEMINI_API_KEY=your_gemini_api_key_here
```
*Dapatkan gratis: [Google AI Studio](https://makersuite.google.com/app/apikey)*

### 3. Run
```bash
npm start
```

## 🎯 Usage

```
🎯 Simple TikTok Uploader
Login + Upload + AI Caption

? Video file path: ./my-video.mp4
? Caption option: 🤖 AI Generated
? Video description (for AI): funny cat video

📋 Summary:
📁 Video: my-video.mp4
📏 Size: 45.2MB
✍️ Caption: 🐱 This cat is hilarious! 😂 #cat #funny #viral #fyp

? Upload to TikTok? Yes

🚀 Uploading...
🍪 Cookies loaded
✅ Already logged in
✅ Video uploaded: my-video.mp4
✅ Caption added: 🐱 This cat is hilarious! 😂 #cat #funny #viral #fyp
🚀 Posted! (data-e2e)
✅ Upload completed!

🎉 SUCCESS! Video uploaded!
```

## 📁 Files

```
project/
├── tiktok-uploader.js     # ← MAIN FILE (semua kode di sini)
├── package.json           # Dependencies (hanya 5 packages)
├── .env                   # Environment variables
├── .env.example           # Template
├── README.md              # Documentation
└── tiktok-cookies.json    # Auto-generated cookies
```

## 🔧 Supported Formats

- ✅ MP4 (recommended)
- ✅ MOV
- ✅ AVI  
- ✅ MKV

## 🚨 Notes

- **First run:** Login manual sekali, selanjutnya otomatis
- **File size:** Max ~100MB
- **AI Caption:** Perlu Gemini API key (gratis)
- **Browser:** Chrome akan terbuka untuk upload

**Simple & Focused! 🎉**