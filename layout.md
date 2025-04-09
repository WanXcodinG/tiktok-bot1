tiktok-bot/
├── bot.js                  # Main entry point (CLI interface)
├── fetch/                  # Responsible for scraping or finding content
│   ├── getAnimeVideos.js
│   ├── getTechVideos.js
│   ├── getHorrorVideos.js
│   └── getTikTokMovies.js
├── edit/                   # Responsible for video editing per type
│   ├── animeEditor.js
│   ├── horrorEditor.js
│   └── genericEditor.js
├── upload/
│   └── tiktokUploader.js   # Automates TikTok upload using Puppeteer
├── assets/                 # Stores intro/outro clips, SFX, music
│   ├── intros/
│   ├── outros/
│   ├── music/
│   └── overlays/
├── videos/                 # Downloaded & edited videos stored here
│   ├── raw/
│   └── edited/
├── utils/
│   └── videoUtils.js       # Common video helper functions
├── config/
│   └── settings.js         # Paths, user-agent, TikTok login config
├── package.json
└── README.md
