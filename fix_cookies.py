#!/usr/bin/env python3
"""
🔧 Cookie Fixer - Reset TikTok cookies jika bermasalah
"""

import os
import json

def fix_cookies():
    """Reset cookies file"""
    cookies_file = "config/cookies.json"
    
    # Ensure config directory exists
    os.makedirs("config", exist_ok=True)
    
    # Reset cookies to empty array
    with open(cookies_file, 'w', encoding='utf-8') as f:
        json.dump([], f, indent=2)
    
    print(f"🔄 Reset {cookies_file} to empty")
    print("✅ Cookies fixed! Run tiktok_uploader.py again")

if __name__ == "__main__":
    fix_cookies()