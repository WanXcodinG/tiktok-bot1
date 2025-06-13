const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const cookiesPath = path.join(__dirname, "../config/cookies.json");

async function uploadToTikTok(videoPath, caption = "#bot #foryou #edit #fyp") {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });

  const page = await browser.newPage();

  // ✅ Set real user-agent to avoid detection
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  // ✅ Use saved cookies if available
  let loggedInWithCookies = false;
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath));
      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        loggedInWithCookies = true;
        console.log("🍪 Loaded saved cookies.");
      }
    } catch (err) {
      console.log("⚠️ Failed to load cookies:", err.message);
    }
  }

  try {
    // 👀 Go to TikTok upload
    console.log("🌐 Navigating to TikTok upload page...");
    await page.goto("https://www.tiktok.com/upload", { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    // ✅ Check if already logged in by detecting the file input
    let isLoggedIn = false;
    try {
      await page.waitForSelector("input[type='file']", { timeout: 15000 });
      console.log("✅ Already logged in.");
      isLoggedIn = true;
    } catch {
      if (loggedInWithCookies) {
        console.error("❌ Saved cookies failed. Try logging in manually once.");
        await browser.close();
        return;
      }

      // 🚪 Ask user to log in manually only once
      console.log("🧾 No saved cookies. Please log in manually (QR or password)...");

      try {
        await page.waitForSelector("input[type='file']", { timeout: 180000 }); // wait 3 mins max
        console.log("✅ Login successful!");
        isLoggedIn = true;

        // 💾 Save cookies for future sessions
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log("💾 Cookies saved.");
      } catch (e) {
        console.error("❌ Login timeout. Try again.");
        await browser.close();
        return;
      }
    }

    if (!isLoggedIn) {
      console.error("❌ Could not log in to TikTok");
      await browser.close();
      return;
    }

    // 📤 Upload the video
    const inputUploadHandle = await page.$("input[type='file']");
    if (!inputUploadHandle) {
      console.error("❌ Upload input not found");
      await browser.close();
      return;
    }

    const absoluteVideoPath = path.resolve(videoPath);
    if (!fs.existsSync(absoluteVideoPath)) {
      console.error("❌ Video not found:", absoluteVideoPath);
      await browser.close();
      return;
    }

    await inputUploadHandle.uploadFile(absoluteVideoPath);
    console.log("📤 Video uploaded:", videoPath);

    // Wait for video to process
    await page.waitForTimeout(5000);

    // ✍️ Add the caption
    try {
      // Try multiple selectors for the caption input
      const captionSelectors = [
        "div[contenteditable='true']",
        "div[data-text='true']",
        "textarea[placeholder*='caption']",
        "div[role='textbox']"
      ];

      let captionInput = null;
      for (const selector of captionSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          captionInput = await page.$(selector);
          if (captionInput) break;
        } catch (e) {
          continue;
        }
      }

      if (captionInput) {
        await captionInput.click();
        await page.waitForTimeout(1000);
        
        // Clear any existing text
        await page.keyboard.down('Control');
        await page.keyboard.press('a');
        await page.keyboard.up('Control');
        
        await page.keyboard.type(caption);
        console.log("✍️ Caption added:", caption);
      } else {
        console.warn("⚠️ Could not find caption input field.");
      }
    } catch (err) {
      console.warn("⚠️ Could not add caption:", err.message);
    }

    await page.waitForTimeout(2000);

    // 🚀 Click Post button using multiple strategies
    try {
      let postButton = null;
      
      // Strategy 1: Try XPath with evaluate (newer Puppeteer compatible)
      try {
        postButton = await page.evaluateHandle(() => {
          const buttons = Array.from(document.querySelectorAll('button'));
          return buttons.find(btn => 
            btn.textContent.includes('Post') || 
            btn.textContent.includes('Publish') ||
            btn.getAttribute('data-e2e') === 'publish-button'
          );
        });
        
        if (postButton && postButton.asElement) {
          await postButton.asElement().click();
          console.log("🚀 Posted to TikTok! (Strategy 1)");
        }
      } catch (e) {
        console.log("Strategy 1 failed, trying strategy 2...");
        
        // Strategy 2: Try CSS selectors
        const postSelectors = [
          'button[data-e2e="publish-button"]',
          'button:contains("Post")',
          'div[role="button"]:contains("Post")',
          'button[type="submit"]'
        ];
        
        for (const selector of postSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              await element.click();
              console.log("🚀 Posted to TikTok! (Strategy 2)");
              postButton = element;
              break;
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!postButton) {
        // Strategy 3: Manual search and click
        await page.evaluate(() => {
          const buttons = document.querySelectorAll('button, div[role="button"]');
          for (let button of buttons) {
            if (button.textContent.toLowerCase().includes('post') || 
                button.textContent.toLowerCase().includes('publish')) {
              button.click();
              return true;
            }
          }
          return false;
        });
        console.log("🚀 Attempted to post using Strategy 3");
      }
      
    } catch (err) {
      console.warn("⚠️ Could not find or click post button:", err.message);
      console.log("📝 Video uploaded but may need manual posting");
    }

    await page.waitForTimeout(5000);
    
  } catch (err) {
    console.error("❌ Error during TikTok upload:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = uploadToTikTok;