const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const cookiesPath = path.join(__dirname, "../config/cookies.json");

// Helper function for waiting
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
    console.log("⏳ Waiting for video to process...");
    await wait(8000); // Increased wait time for processing

    // ✍️ Add the caption
    try {
      console.log("✍️ Adding caption...");
      
      // Try multiple selectors for the caption input
      const captionSelectors = [
        "div[contenteditable='true']",
        "div[data-text='true']",
        "textarea[placeholder*='caption']",
        "div[role='textbox']",
        "[data-e2e='editor']",
        ".public-DraftEditor-content"
      ];

      let captionInput = null;
      for (const selector of captionSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          captionInput = await page.$(selector);
          if (captionInput) {
            console.log(`✅ Found caption input with selector: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (captionInput) {
        await captionInput.click();
        await wait(1000);
        
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

    await wait(3000);

    // 🚀 Click Post button using multiple strategies
    try {
      console.log("🚀 Looking for Post button...");
      let posted = false;
      
      // Strategy 1: Use the exact selector you provided
      try {
        const specificSelector = "#root > div > div > div.css-fsbw52.ep9i2zp0 > div.css-86gjln.edss2sz5 > div > div > div > div.jsx-3335848873.footer > div > button.Button__root.Button__root--shape-default.Button__root--size-large.Button__root--type-primary.Button__root--loading-false > div.Button__content.Button__content--shape-default.Button__content--size-large.Button__content--type-primary.Button__content--loading-false";
        
        console.log("🎯 Trying specific selector...");
        await page.waitForSelector(specificSelector, { timeout: 10000 });
        const specificButton = await page.$(specificSelector);
        
        if (specificButton) {
          await specificButton.click();
          console.log("🚀 Posted to TikTok! (Strategy 1: Specific selector)");
          posted = true;
        }
      } catch (e) {
        console.log("Specific selector failed, trying alternative strategies...");
      }
      
      // Strategy 2: Try data-e2e attribute
      if (!posted) {
        try {
          const publishButton = await page.$('button[data-e2e="publish-button"]');
          if (publishButton) {
            await publishButton.click();
            console.log("🚀 Posted to TikTok! (Strategy 2: data-e2e)");
            posted = true;
          }
        } catch (e) {
          console.log("Strategy 2 failed, trying strategy 3...");
        }
      }
      
      // Strategy 3: Search by button classes and text content
      if (!posted) {
        try {
          const postButton = await page.evaluateHandle(() => {
            // Look for buttons with specific classes
            const buttons = Array.from(document.querySelectorAll('button'));
            
            // First try to find button with specific classes
            let targetButton = buttons.find(btn => {
              const classes = btn.className;
              return classes.includes('Button__root--type-primary') && 
                     classes.includes('Button__root--size-large');
            });
            
            // If not found, search by text content
            if (!targetButton) {
              targetButton = buttons.find(btn => {
                const text = btn.textContent.toLowerCase();
                return text.includes('post') || text.includes('publish') || text.includes('share');
              });
            }
            
            return targetButton;
          });
          
          if (postButton && postButton.asElement) {
            await postButton.asElement().click();
            console.log("🚀 Posted to TikTok! (Strategy 3: class + text search)");
            posted = true;
          }
        } catch (e) {
          console.log("Strategy 3 failed, trying strategy 4...");
        }
      }
      
      // Strategy 4: Try common button selectors
      if (!posted) {
        const buttonSelectors = [
          'button[type="submit"]',
          'div[role="button"]',
          '.btn-post',
          '.publish-btn',
          'button.Button__root--type-primary'
        ];
        
        for (const selector of buttonSelectors) {
          try {
            const element = await page.$(selector);
            if (element) {
              const text = await page.evaluate(el => el.textContent, element);
              if (text && (text.toLowerCase().includes('post') || text.toLowerCase().includes('publish'))) {
                await element.click();
                console.log(`🚀 Posted to TikTok! (Strategy 4: ${selector})`);
                posted = true;
                break;
              }
            }
          } catch (e) {
            continue;
          }
        }
      }
      
      if (!posted) {
        console.warn("⚠️ Could not find or click post button automatically");
        console.log("📝 Video uploaded and caption added. Please click 'Post' manually.");
        console.log("🔍 The browser will stay open for 30 seconds for manual posting...");
        await wait(30000);
      } else {
        // Wait a bit after posting
        console.log("⏳ Waiting for post to complete...");
        await wait(5000);
      }
      
    } catch (err) {
      console.warn("⚠️ Error with post button:", err.message);
      console.log("📝 Video uploaded but may need manual posting");
    }

    console.log("✅ TikTok upload process completed!");
    
  } catch (err) {
    console.error("❌ Error during TikTok upload:", err.message);
  } finally {
    await browser.close();
  }
}

module.exports = uploadToTikTok;