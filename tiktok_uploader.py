#!/usr/bin/env python3
"""
🎯 SIMPLE TIKTOK UPLOADER - PYTHON + SELENIUM
Hanya 3 fungsi utama:
1. Login TikTok (dengan cookies dari config/cookies.json)
2. Upload video file
3. Generate AI caption dengan Gemini
"""

import os
import json
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.common.exceptions import TimeoutException, NoSuchElementException
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class TikTokUploader:
    def __init__(self):
        self.driver = None
        self.cookies_file = "config/cookies.json"
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        # Ensure config directory exists
        os.makedirs("config", exist_ok=True)
        
        # Configure Gemini AI
        if self.gemini_api_key:
            genai.configure(api_key=self.gemini_api_key)
            self.model = genai.GenerativeModel('gemini-1.5-flash')
        else:
            self.model = None
            print("⚠️ GEMINI_API_KEY not found, will use fallback captions")

    def setup_driver(self):
        """Setup Chrome driver with optimal settings"""
        print("🔧 Setting up Chrome driver...")
        
        chrome_options = Options()
        chrome_options.add_argument("--no-sandbox")
        chrome_options.add_argument("--disable-dev-shm-usage")
        chrome_options.add_argument("--disable-blink-features=AutomationControlled")
        chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
        chrome_options.add_experimental_option('useAutomationExtension', False)
        chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36")
        
        # Keep browser open for manual interaction
        chrome_options.add_experimental_option("detach", True)
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            print("✅ Chrome driver ready")
            return True
        except Exception as e:
            print(f"❌ Failed to setup driver: {e}")
            return False

    def save_cookies(self):
        """Save cookies to config/cookies.json"""
        try:
            cookies = self.driver.get_cookies()
            with open(self.cookies_file, 'w', encoding='utf-8') as f:
                json.dump(cookies, f, indent=2, ensure_ascii=False)
            print(f"💾 Cookies saved to {self.cookies_file}")
        except Exception as e:
            print(f"⚠️ Failed to save cookies: {e}")

    def load_cookies(self):
        """Load cookies from config/cookies.json"""
        try:
            if os.path.exists(self.cookies_file):
                with open(self.cookies_file, 'r', encoding='utf-8') as f:
                    cookies = json.load(f)
                
                # Check if cookies list is not empty
                if cookies and len(cookies) > 0:
                    for cookie in cookies:
                        # Ensure required cookie fields exist
                        if 'name' in cookie and 'value' in cookie:
                            try:
                                self.driver.add_cookie(cookie)
                            except Exception as cookie_error:
                                print(f"⚠️ Failed to add cookie {cookie.get('name', 'unknown')}: {cookie_error}")
                                continue
                    print(f"🍪 Cookies loaded from {self.cookies_file}")
                    return True
                else:
                    print(f"📝 {self.cookies_file} is empty, will need to login manually")
                    return False
        except Exception as e:
            print(f"⚠️ Failed to load cookies: {e}")
        return False

    def generate_ai_caption(self, video_description=""):
        """Generate AI caption using Gemini"""
        try:
            print("🤖 Generating AI caption...")
            
            if not self.model:
                return self.get_fallback_caption()
            
            prompt = f"""Create a catchy TikTok caption for a video about: "{video_description}".

Requirements:
- Maximum 150 characters
- Include 5-8 trending hashtags
- Use emojis to make it engaging
- Make it viral-worthy and attention-grabbing
- Focus on engagement (likes, comments, shares)

Just return the caption, nothing else."""

            response = self.model.generate_content(prompt)
            caption = response.text.strip()
            
            if caption and len(caption) <= 200:
                print(f"✅ AI Generated: {caption}")
                return caption
            else:
                raise Exception("Invalid caption length")
                
        except Exception as e:
            print(f"❌ AI caption failed: {e}")
            return self.get_fallback_caption()

    def get_fallback_caption(self):
        """Get random fallback caption"""
        import random
        fallbacks = [
            "🔥 This hits different! Drop a ❤️ #viral #fyp #trending #foryou",
            "✨ POV: You found the perfect video #viral #fyp #trending #amazing",
            "🚀 This is about to blow up! #viral #fyp #trending #content #fire",
            "💯 Can't stop watching this! #viral #fyp #trending #addictive #wow",
            "😱 This gave me chills... #viral #fyp #trending #mindblown",
            "🎯 Exactly what I needed to see #viral #fyp #trending #relatable"
        ]
        caption = random.choice(fallbacks)
        print(f"🔄 Using fallback: {caption}")
        return caption

    def login_tiktok(self):
        """Login to TikTok with cookie support from config/cookies.json"""
        try:
            print("🌐 Navigating to TikTok upload page...")
            self.driver.get("https://www.tiktok.com/upload")
            time.sleep(3)
            
            # Try to load cookies first
            cookies_loaded = self.load_cookies()
            if cookies_loaded:
                print("🔄 Refreshing page with loaded cookies...")
                self.driver.refresh()
                time.sleep(5)
            
            # Check if already logged in
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
                )
                print("✅ Already logged in!")
                return True
            except TimeoutException:
                pass
            
            # Need to login manually
            print("🔑 Please login to TikTok manually...")
            print("📱 You can use QR code or email/password")
            print("⏳ Waiting for login completion...")
            
            # Wait for file input to appear (indicates successful login)
            try:
                WebDriverWait(self.driver, 300).until(  # 5 minutes timeout
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
                )
                print("✅ Login successful!")
                self.save_cookies()
                return True
            except TimeoutException:
                print("❌ Login timeout. Please try again.")
                return False
                
        except Exception as e:
            print(f"❌ Login error: {e}")
            return False

    def upload_video(self, video_path, caption=""):
        """Upload video to TikTok"""
        try:
            # Validate video file
            if not os.path.exists(video_path):
                raise Exception(f"Video file not found: {video_path}")
            
            file_size = os.path.getsize(video_path) / (1024 * 1024)  # MB
            print(f"📁 Video: {os.path.basename(video_path)} ({file_size:.1f}MB)")
            
            # Find and upload file
            print("📤 Uploading video...")
            file_input = WebDriverWait(self.driver, 20).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
            )
            
            file_input.send_keys(os.path.abspath(video_path))
            print("✅ Video file uploaded")
            
            # Wait for video processing
            print("⏳ Waiting for video processing...")
            time.sleep(10)
            
            # Add caption if provided
            if caption and caption.strip():
                self.add_caption(caption)
            
            # Post the video
            return self.post_video()
            
        except Exception as e:
            print(f"❌ Upload error: {e}")
            return False

    def add_caption(self, caption):
        """Add caption to video"""
        try:
            print("✍️ Adding caption...")
            
            # Multiple selectors for caption input
            caption_selectors = [
                "div[contenteditable='true']",
                "div[data-text='true']", 
                "textarea[placeholder*='caption']",
                "div[role='textbox']",
                "[data-e2e='editor']",
                ".public-DraftEditor-content",
                "div[data-contents='true']"
            ]
            
            caption_input = None
            for selector in caption_selectors:
                try:
                    caption_input = WebDriverWait(self.driver, 5).until(
                        EC.element_to_be_clickable((By.CSS_SELECTOR, selector))
                    )
                    print(f"✅ Found caption input: {selector}")
                    break
                except TimeoutException:
                    continue
            
            if caption_input:
                caption_input.click()
                time.sleep(1)
                
                # Clear existing text
                caption_input.send_keys("\ue009a")  # Ctrl+A
                caption_input.send_keys("\ue017")   # Delete
                
                # Type new caption
                caption_input.send_keys(caption)
                print(f"✅ Caption added: {caption}")
            else:
                print("⚠️ Could not find caption input field")
                
        except Exception as e:
            print(f"⚠️ Caption error: {e}")

    def post_video(self):
        """Post the video using multiple strategies"""
        try:
            print("🚀 Attempting to post video...")
            time.sleep(3)
            
            # Strategy 1: data-e2e selector
            try:
                post_button = WebDriverWait(self.driver, 10).until(
                    EC.element_to_be_clickable((By.CSS_SELECTOR, 'button[data-e2e="publish-button"]'))
                )
                post_button.click()
                print("🚀 Posted successfully! (Strategy 1: data-e2e)")
                time.sleep(5)
                return True
            except TimeoutException:
                print("Strategy 1 failed, trying next...")
            
            # Strategy 2: Button with primary classes
            try:
                buttons = self.driver.find_elements(By.TAG_NAME, "button")
                for button in buttons:
                    button_class = button.get_attribute("class") or ""
                    button_text = button.text.lower()
                    
                    if ("primary" in button_class and "large" in button_class) or \
                       "post" in button_text or "publish" in button_text:
                        button.click()
                        print("🚀 Posted successfully! (Strategy 2: Button classes)")
                        time.sleep(5)
                        return True
            except Exception as e:
                print(f"Strategy 2 failed: {e}")
            
            # Strategy 3: Manual posting
            print("⚠️ Automatic posting failed")
            print("📝 Video uploaded and caption added successfully!")
            print("🖱️ Please click the 'Post' button manually")
            print("⏳ Browser will stay open for manual posting...")
            
            # Keep browser open for manual posting
            input("Press Enter after you manually click 'Post' button...")
            return True
            
        except Exception as e:
            print(f"❌ Post error: {e}")
            return False

    def close(self):
        """Close the browser"""
        if self.driver:
            self.driver.quit()

def main():
    """Main interactive function"""
    print("🎯 Simple TikTok Uploader (Python + Selenium)")
    print("Features: TikTok Login + Video Upload + AI Captions")
    print("Cookies: config/cookies.json")
    print("-" * 50)
    
    uploader = TikTokUploader()
    
    try:
        # Setup driver
        if not uploader.setup_driver():
            return
        
        # Get video file path
        while True:
            video_path = input("📁 Enter video file path: ").strip().strip('"')
            if not video_path:
                print("❌ Please enter a video file path")
                continue
            if not os.path.exists(video_path):
                print("❌ File not found. Please check the path.")
                continue
            
            # Check file extension
            valid_extensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm']
            if not any(video_path.lower().endswith(ext) for ext in valid_extensions):
                print("❌ Invalid video format. Use: .mp4, .mov, .avi, .mkv, .webm")
                continue
            break
        
        # Caption option
        print("\n📝 Caption Options:")
        print("1. 🤖 Generate with AI (Gemini)")
        print("2. ✍️ Write custom caption")
        print("3. 🚫 No caption")
        
        while True:
            choice = input("Choose option (1-3): ").strip()
            if choice in ['1', '2', '3']:
                break
            print("❌ Please enter 1, 2, or 3")
        
        caption = ""
        if choice == '1':
            video_desc = input("📝 Describe your video (for AI context): ").strip()
            if not video_desc:
                video_desc = os.path.splitext(os.path.basename(video_path))[0]
            caption = uploader.generate_ai_caption(video_desc)
        elif choice == '2':
            caption = input("✍️ Enter your caption: ").strip()
        
        # Display summary
        print("\n📋 Upload Summary:")
        print("-" * 40)
        print(f"📁 Video: {os.path.basename(video_path)}")
        file_size = os.path.getsize(video_path) / (1024 * 1024)
        print(f"📏 Size: {file_size:.1f}MB")
        if caption:
            print(f"✍️ Caption: {caption}")
        print(f"🍪 Cookies: {uploader.cookies_file}")
        print("-" * 40)
        
        # Confirm upload
        confirm = input("🚀 Proceed with upload? (y/n): ").strip().lower()
        if confirm not in ['y', 'yes']:
            print("❌ Upload cancelled")
            return
        
        # Login to TikTok
        print("\n🔑 Logging in to TikTok...")
        if not uploader.login_tiktok():
            print("❌ Login failed")
            return
        
        # Upload video
        print("\n📤 Starting upload...")
        success = uploader.upload_video(video_path, caption)
        
        if success:
            print("\n🎉 SUCCESS! Video uploaded to TikTok!")
            print("📱 Check your TikTok profile to see the posted video")
        else:
            print("\n❌ Upload failed. Please try again.")
    
    except KeyboardInterrupt:
        print("\n❌ Upload cancelled by user")
    except Exception as e:
        print(f"\n❌ Error: {e}")
    finally:
        # Keep browser open for verification
        input("\nPress Enter to close browser...")
        uploader.close()

if __name__ == "__main__":
    main()