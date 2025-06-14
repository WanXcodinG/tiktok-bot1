#!/usr/bin/env python3
"""
🎯 SIMPLE TIKTOK UPLOADER - PYTHON + SELENIUM
Hanya 3 fungsi utama:
1. Login TikTok (dengan cookies dari config/cookies.json)
2. Upload video file
3. Generate AI caption dengan Gemini

FIXED: Login stuck issue
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
        
        # Initialize cookies file if not exists
        if not os.path.exists(self.cookies_file):
            with open(self.cookies_file, 'w', encoding='utf-8') as f:
                json.dump([], f)
            print(f"📝 Created empty {self.cookies_file}")
        
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
        
        # Additional options to prevent stuck
        chrome_options.add_argument("--disable-web-security")
        chrome_options.add_argument("--disable-features=VizDisplayCompositor")
        chrome_options.add_argument("--disable-gpu")
        chrome_options.add_argument("--no-first-run")
        chrome_options.add_argument("--disable-default-apps")
        
        # Keep browser open for manual interaction
        chrome_options.add_experimental_option("detach", True)
        
        try:
            self.driver = webdriver.Chrome(options=chrome_options)
            self.driver.execute_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
            
            # Set window size
            self.driver.set_window_size(1200, 800)
            print("✅ Chrome driver ready")
            return True
        except Exception as e:
            print(f"❌ Failed to setup driver: {e}")
            return False

    def reset_cookies(self):
        """Reset cookies file to empty array"""
        try:
            with open(self.cookies_file, 'w', encoding='utf-8') as f:
                json.dump([], f, indent=2)
            print(f"🔄 Reset {self.cookies_file} to empty")
        except Exception as e:
            print(f"⚠️ Failed to reset cookies: {e}")

    def save_cookies(self):
        """Save cookies to config/cookies.json"""
        try:
            cookies = self.driver.get_cookies()
            # Filter out invalid cookies
            valid_cookies = []
            for cookie in cookies:
                if 'name' in cookie and 'value' in cookie and cookie['name'] and cookie['value']:
                    valid_cookies.append(cookie)
            
            with open(self.cookies_file, 'w', encoding='utf-8') as f:
                json.dump(valid_cookies, f, indent=2, ensure_ascii=False)
            print(f"💾 Saved {len(valid_cookies)} cookies to {self.cookies_file}")
        except Exception as e:
            print(f"⚠️ Failed to save cookies: {e}")

    def load_cookies(self):
        """Load cookies from config/cookies.json"""
        try:
            if not os.path.exists(self.cookies_file):
                print(f"📝 {self.cookies_file} not found, will create new one")
                return False
                
            with open(self.cookies_file, 'r', encoding='utf-8') as f:
                cookies = json.load(f)
            
            # Check if cookies list is not empty
            if not cookies or len(cookies) == 0:
                print(f"📝 {self.cookies_file} is empty, need manual login")
                return False
            
            # Add cookies to driver
            loaded_count = 0
            for cookie in cookies:
                try:
                    # Ensure required cookie fields exist
                    if 'name' in cookie and 'value' in cookie and cookie['name'] and cookie['value']:
                        # Remove problematic fields
                        clean_cookie = {
                            'name': cookie['name'],
                            'value': cookie['value'],
                            'domain': cookie.get('domain', '.tiktok.com'),
                            'path': cookie.get('path', '/'),
                        }
                        
                        # Add optional fields if they exist and are valid
                        if 'secure' in cookie:
                            clean_cookie['secure'] = cookie['secure']
                        if 'httpOnly' in cookie:
                            clean_cookie['httpOnly'] = cookie['httpOnly']
                            
                        self.driver.add_cookie(clean_cookie)
                        loaded_count += 1
                except Exception as cookie_error:
                    print(f"⚠️ Failed to add cookie {cookie.get('name', 'unknown')}: {cookie_error}")
                    continue
            
            if loaded_count > 0:
                print(f"🍪 Loaded {loaded_count} cookies from {self.cookies_file}")
                return True
            else:
                print(f"❌ No valid cookies loaded from {self.cookies_file}")
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
        """Login to TikTok with improved cookie handling"""
        try:
            print("🌐 Navigating to TikTok...")
            
            # First go to TikTok main page
            print("🔄 Loading TikTok main page...")
            self.driver.get("https://www.tiktok.com")
            time.sleep(5)
            
            # Check if we can load cookies
            cookies_loaded = self.load_cookies()
            
            if cookies_loaded:
                print("🔄 Refreshing with cookies...")
                self.driver.refresh()
                time.sleep(5)
                
                # Check if login worked by looking for user indicators
                try:
                    # Look for profile or upload indicators
                    profile_indicators = [
                        "[data-e2e='profile-icon']",
                        "[data-e2e='upload-icon']", 
                        "a[href*='/upload']",
                        "svg[data-e2e='upload-icon']"
                    ]
                    
                    for indicator in profile_indicators:
                        try:
                            element = WebDriverWait(self.driver, 3).until(
                                EC.presence_of_element_located((By.CSS_SELECTOR, indicator))
                            )
                            if element:
                                print("✅ Already logged in! (Found profile indicator)")
                                # Now go to upload page
                                print("🔄 Navigating to upload page...")
                                self.driver.get("https://www.tiktok.com/upload")
                                time.sleep(5)
                                return True
                        except TimeoutException:
                            continue
                            
                except Exception as e:
                    print(f"⚠️ Could not verify login status: {e}")
            
            # If not logged in, go to upload page for login
            print("🔄 Going to upload page for login...")
            self.driver.get("https://www.tiktok.com/upload")
            time.sleep(5)
            
            # Check if upload page is accessible (means logged in)
            try:
                WebDriverWait(self.driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, "input[type='file']"))
                )
                print("✅ Already logged in! (Upload page accessible)")
                return True
            except TimeoutException:
                pass
            
            # Need manual login
            print("\n" + "="*50)
            print("🔑 MANUAL LOGIN REQUIRED")
            print("="*50)
            print("📱 Please login to TikTok manually:")
            print("   • Use QR code scan with TikTok mobile app")
            print("   • Or use email/password login")
            print("   • Or use phone number login")
            print("\n⏳ Waiting for login completion...")
            print("   (Script will detect when you're logged in)")
            print("="*50)
            
            # Wait for successful login with better detection
            login_success = False
            max_attempts = 60  # 5 minutes total
            
            for attempt in range(max_attempts):
                try:
                    # Check multiple indicators of successful login
                    success_indicators = [
                        "input[type='file']",  # Upload input
                        "[data-e2e='upload-btn']",  # Upload button
                        "div[data-e2e='upload-container']",  # Upload container
                        ".upload-btn",  # Upload button class
                    ]
                    
                    for indicator in success_indicators:
                        try:
                            element = self.driver.find_element(By.CSS_SELECTOR, indicator)
                            if element and element.is_displayed():
                                login_success = True
                                break
                        except NoSuchElementException:
                            continue
                    
                    if login_success:
                        break
                        
                    # Show progress
                    if attempt % 10 == 0:
                        remaining = max_attempts - attempt
                        print(f"⏳ Still waiting... ({remaining*5} seconds remaining)")
                    
                    time.sleep(5)
                    
                except Exception as e:
                    print(f"⚠️ Login check error: {e}")
                    time.sleep(5)
            
            if login_success:
                print("✅ Login successful!")
                print("💾 Saving cookies for future use...")
                self.save_cookies()
                return True
            else:
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
            time.sleep(15)  # Increased wait time
            
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
                "div[data-contents='true']",
                "[data-e2e='video-caption']"
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
                time.sleep(1)
                
                # Type new caption
                caption_input.send_keys(caption)
                print(f"✅ Caption added: {caption}")
                time.sleep(2)
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
        # Check if user wants to reset cookies
        if os.path.exists(uploader.cookies_file):
            reset_choice = input("🍪 Reset saved cookies? (y/n): ").strip().lower()
            if reset_choice in ['y', 'yes']:
                uploader.reset_cookies()
                print("🔄 Cookies reset, will need fresh login")
        
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