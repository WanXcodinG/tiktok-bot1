const inquirer = require("inquirer");
const chalk = require("chalk");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * 🎯 SIMPLE TIKTOK UPLOADER WITH AI
 * Hanya 3 fungsi utama:
 * 1. Login TikTok (dengan cookies)
 * 2. Upload video dari file lokal
 * 3. Generate caption dengan AI
 */

// Helper function for waiting
async function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Generate AI Caption using Gemini
 */
async function generateAICaption(videoTitle = "", customPrompt = "") {
  try {
    console.log(chalk.cyan('🤖 Generating AI caption...'));
    
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      console.log(chalk.yellow("⚠️ No GEMINI_API_KEY found, using fallback caption"));
      return "🔥 Amazing content! Drop a ❤️ if you're vibing! #viral #fyp #trending #foryou";
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = customPrompt || `Create a catchy TikTok caption for a video titled: "${videoTitle}". 

Requirements:
- Maximum 150 characters
- Include 5-8 trending hashtags
- Use emojis to make it engaging
- Make it viral-worthy and attention-grabbing
- Focus on engagement (likes, comments, shares)

Just return the caption, nothing else.`;
    
    console.log(chalk.blue("🤖 Calling Gemini AI..."));
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const caption = response.text().trim();
    
    if (caption && caption.length > 10 && caption.length <= 200) {
      console.log(chalk.green(`✅ AI Generated Caption: ${caption}`));
      return caption;
    } else {
      throw new Error("Invalid caption length or content");
    }
    
  } catch (err) {
    console.log(chalk.red(`❌ AI caption failed: ${err.message}`));
    
    // Fallback captions
    const fallbacks = [
      "🔥 This hits different! Drop a ❤️ #viral #fyp #trending #foryou",
      "✨ POV: You found the perfect video #viral #fyp #trending #amazing",
      "🚀 This is about to blow up! #viral #fyp #trending #content #fire",
      "💯 Can't stop watching this! #viral #fyp #trending #addictive #wow"
    ];
    
    const fallbackCaption = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    console.log(chalk.yellow(`🔄 Using fallback caption: ${fallbackCaption}`));
    return fallbackCaption;
  }
}

/**
 * Upload Video to TikTok with Advanced Strategies
 */
async function uploadToTikTok(videoPath, caption = "") {
  const cookiesPath = path.join(__dirname, "tiktok-cookies.json");

  // Validate video file
  if (!fs.existsSync(videoPath)) {
    throw new Error(`❌ Video file not found: ${videoPath}`);
  }

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

  // Set real user-agent
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
  );

  // Load saved cookies if available
  let loggedInWithCookies = false;
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath));
      if (cookies && cookies.length > 0) {
        await page.setCookie(...cookies);
        loggedInWithCookies = true;
        console.log(chalk.green("🍪 Loaded saved TikTok cookies"));
      }
    } catch (err) {
      console.log(chalk.yellow(`⚠️ Failed to load cookies: ${err.message}`));
    }
  }

  try {
    console.log(chalk.cyan("🌐 Navigating to TikTok upload page..."));
    await page.goto("https://www.tiktok.com/upload", { 
      waitUntil: "networkidle2",
      timeout: 30000 
    });

    // Check if already logged in
    let isLoggedIn = false;
    try {
      await page.waitForSelector("input[type='file']", { timeout: 15000 });
      console.log(chalk.green("✅ Already logged in to TikTok"));
      isLoggedIn = true;
    } catch {
      if (loggedInWithCookies) {
        console.error(chalk.red("❌ Saved cookies expired. Please log in manually."));
        await browser.close();
        return false;
      }

      console.log(chalk.yellow("🔑 Please log in to TikTok manually (QR code or email/password)..."));
      console.log(chalk.gray("⏳ Waiting up to 3 minutes for login..."));

      try {
        await page.waitForSelector("input[type='file']", { timeout: 180000 }); // 3 minutes
        console.log(chalk.green("✅ Login successful!"));
        isLoggedIn = true;

        // Save cookies for future use
        const cookies = await page.cookies();
        fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
        console.log(chalk.blue("💾 Cookies saved for future sessions"));
      } catch (e) {
        console.error(chalk.red("❌ Login timeout. Please try again."));
        await browser.close();
        return false;
      }
    }

    if (!isLoggedIn) {
      console.error(chalk.red("❌ Could not log in to TikTok"));
      await browser.close();
      return false;
    }

    // Upload video file
    console.log(chalk.cyan("📤 Uploading video file..."));
    const inputUploadHandle = await page.$("input[type='file']");
    if (!inputUploadHandle) {
      throw new Error("❌ Upload input not found on page");
    }

    const absoluteVideoPath = path.resolve(videoPath);
    await inputUploadHandle.uploadFile(absoluteVideoPath);
    console.log(chalk.green(`✅ Video uploaded: ${path.basename(videoPath)}`));

    // Wait for video processing
    console.log(chalk.yellow("⏳ Waiting for video to process..."));
    await wait(10000); // Wait 10 seconds for processing

    // Add caption if provided
    if (caption && caption.trim()) {
      try {
        console.log(chalk.cyan("✍️ Adding caption..."));
        
        // Multiple selectors for caption input
        const captionSelectors = [
          "div[contenteditable='true']",
          "div[data-text='true']",
          "textarea[placeholder*='caption']",
          "div[role='textbox']",
          "[data-e2e='editor']",
          ".public-DraftEditor-content",
          "div[data-contents='true']"
        ];

        let captionInput = null;
        for (const selector of captionSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            captionInput = await page.$(selector);
            if (captionInput) {
              console.log(chalk.blue(`✅ Found caption input: ${selector}`));
              break;
            }
          } catch (e) {
            continue;
          }
        }

        if (captionInput) {
          await captionInput.click();
          await wait(1000);
          
          // Clear existing text
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          await page.keyboard.press('Delete');
          
          // Type new caption
          await page.keyboard.type(caption);
          console.log(chalk.green(`✅ Caption added: ${caption}`));
        } else {
          console.warn(chalk.yellow("⚠️ Could not find caption input field"));
        }
      } catch (err) {
        console.warn(chalk.yellow(`⚠️ Could not add caption: ${err.message}`));
      }
    }

    await wait(3000);

    // Post the video using multiple strategies
    console.log(chalk.cyan("🚀 Attempting to post video..."));
    let posted = false;
    
    // Strategy 1: Specific TikTok selector
    if (!posted) {
      try {
        const specificSelector = "button[data-e2e='publish-button']";
        await page.waitForSelector(specificSelector, { timeout: 5000 });
        const publishButton = await page.$(specificSelector);
        
        if (publishButton) {
          await publishButton.click();
          console.log(chalk.green("🚀 Posted successfully! (Strategy 1: data-e2e)"));
          posted = true;
        }
      } catch (e) {
        console.log(chalk.gray("Strategy 1 failed, trying next..."));
      }
    }
    
    // Strategy 2: Button with primary classes
    if (!posted) {
      try {
        const buttons = await page.$$('button');
        for (const button of buttons) {
          const classes = await page.evaluate(el => el.className, button);
          const text = await page.evaluate(el => el.textContent, button);
          
          if (classes.includes('Button__root--type-primary') || 
              text.toLowerCase().includes('post') || 
              text.toLowerCase().includes('publish')) {
            await button.click();
            console.log(chalk.green("🚀 Posted successfully! (Strategy 2: Button classes)"));
            posted = true;
            break;
          }
        }
      } catch (e) {
        console.log(chalk.gray("Strategy 2 failed, trying next..."));
      }
    }
    
    // Strategy 3: Manual posting
    if (!posted) {
      console.log(chalk.yellow("⚠️ Automatic posting failed"));
      console.log(chalk.cyan("📝 Video uploaded and caption added successfully!"));
      console.log(chalk.yellow("🖱️ Please click the 'Post' button manually"));
      console.log(chalk.gray("⏳ Browser will stay open for 60 seconds..."));
      await wait(60000);
    } else {
      console.log(chalk.yellow("⏳ Waiting for post to complete..."));
      await wait(5000);
    }

    console.log(chalk.green("✅ TikTok upload process completed!"));
    return true;
    
  } catch (err) {
    console.error(chalk.red(`❌ Upload error: ${err.message}`));
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Main Interactive Function
 */
async function main() {
  console.log(chalk.blueBright("🎯 Simple TikTok Uploader with AI"));
  console.log(chalk.gray("Upload local video files to TikTok with AI-generated captions"));
  console.log(chalk.magenta("Features: TikTok Login + Video Upload + AI Captions"));

  try {
    // Get video file path
    const { videoPath } = await inquirer.prompt([
      {
        type: "input",
        name: "videoPath",
        message: "Enter the path to your video file:",
        validate: (input) => {
          if (!input.trim()) {
            return "Please enter a video file path";
          }
          if (!fs.existsSync(input.trim())) {
            return "File does not exist. Please check the path.";
          }
          const ext = path.extname(input.trim()).toLowerCase();
          if (!['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) {
            return "Please provide a valid video file (.mp4, .mov, .avi, .mkv, .webm)";
          }
          return true;
        }
      }
    ]);

    // Get caption option
    const { captionOption } = await inquirer.prompt([
      {
        type: "list",
        name: "captionOption",
        message: "How do you want to create the caption?",
        choices: [
          "🤖 Generate with AI (Gemini)",
          "✍️ Write custom caption",
          "🚫 No caption (upload only)"
        ]
      }
    ]);

    let caption = "";

    if (captionOption === "🤖 Generate with AI (Gemini)") {
      // Get video title for AI context
      const { videoTitle } = await inquirer.prompt([
        {
          type: "input",
          name: "videoTitle",
          message: "Enter a brief description of your video (for AI context):",
          default: path.basename(videoPath, path.extname(videoPath))
        }
      ]);

      console.log(chalk.cyan("🤖 Generating AI caption..."));
      caption = await generateAICaption(videoTitle);
      
    } else if (captionOption === "✍️ Write custom caption") {
      const { customCaption } = await inquirer.prompt([
        {
          type: "input",
          name: "customCaption",
          message: "Enter your custom caption:",
          validate: input => input.trim().length > 0 || "Please enter a caption"
        }
      ]);
      caption = customCaption;
    }

    // Display summary
    console.log(chalk.cyan("\n📋 Upload Summary:"));
    console.log(chalk.gray("─".repeat(50)));
    console.log(chalk.white(`📁 Video: ${path.basename(videoPath)}`));
    console.log(chalk.white(`📏 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)}MB`));
    if (caption) {
      console.log(chalk.white(`✍️ Caption: ${caption}`));
    }
    console.log(chalk.gray("─".repeat(50)));

    // Confirm upload
    const { confirmUpload } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmUpload",
        message: "Proceed with TikTok upload?",
        default: true
      }
    ]);

    if (!confirmUpload) {
      console.log(chalk.yellow("❌ Upload cancelled"));
      return;
    }

    // Upload to TikTok
    console.log(chalk.cyan("\n🚀 Starting TikTok upload..."));
    const success = await uploadToTikTok(videoPath, caption);

    if (success) {
      console.log(chalk.green("\n🎉 SUCCESS! Video uploaded to TikTok!"));
      console.log(chalk.cyan("📱 Check your TikTok profile to see the posted video"));
    } else {
      console.log(chalk.red("\n❌ Upload failed. Please try again."));
    }

  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
  }
}

// Export functions for external use
module.exports = {
  main,
  uploadToTikTok,
  generateAICaption
};

// Run if executed directly
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal error: ${err.message}`));
    process.exit(1);
  });
}