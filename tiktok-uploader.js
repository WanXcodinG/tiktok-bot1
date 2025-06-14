const inquirer = require("inquirer");
const chalk = require("chalk");
const puppeteer = require("puppeteer");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

/**
 * 🎯 ULTRA SIMPLE TIKTOK UPLOADER
 * Hanya 3 fungsi:
 * 1. Login TikTok
 * 2. Upload video file
 * 3. Generate AI caption
 */

// Helper wait function
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate AI Caption
 */
async function generateAICaption(videoTitle = "") {
  try {
    console.log(chalk.cyan('🤖 Generating AI caption...'));
    
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.log(chalk.yellow("⚠️ No GEMINI_API_KEY, using fallback"));
      return "🔥 Amazing content! #viral #fyp #trending #foryou";
    }
    
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Create a catchy TikTok caption for: "${videoTitle}". 
Max 150 chars, include trending hashtags, use emojis. Just return the caption.`;
    
    const result = await model.generateContent(prompt);
    const caption = result.response.text().trim();
    
    if (caption && caption.length <= 200) {
      console.log(chalk.green(`✅ AI Caption: ${caption}`));
      return caption;
    }
    
    throw new Error("Invalid caption");
    
  } catch (err) {
    console.log(chalk.red(`❌ AI failed: ${err.message}`));
    const fallbacks = [
      "🔥 This hits different! #viral #fyp #trending #foryou",
      "✨ POV: Perfect video found #viral #fyp #amazing",
      "🚀 About to blow up! #viral #fyp #trending #fire"
    ];
    const fallback = fallbacks[Math.floor(Math.random() * fallbacks.length)];
    console.log(chalk.yellow(`🔄 Fallback: ${fallback}`));
    return fallback;
  }
}

/**
 * Upload to TikTok
 */
async function uploadToTikTok(videoPath, caption = "") {
  const cookiesPath = "tiktok-cookies.json";

  if (!fs.existsSync(videoPath)) {
    throw new Error(`Video not found: ${videoPath}`);
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

  // Load cookies
  if (fs.existsSync(cookiesPath)) {
    try {
      const cookies = JSON.parse(fs.readFileSync(cookiesPath));
      await page.setCookie(...cookies);
      console.log(chalk.green("🍪 Cookies loaded"));
    } catch (err) {
      console.log(chalk.yellow("⚠️ Cookie load failed"));
    }
  }

  try {
    console.log(chalk.cyan("🌐 Going to TikTok upload..."));
    await page.goto("https://www.tiktok.com/upload", { waitUntil: "networkidle2" });

    // Check login
    let isLoggedIn = false;
    try {
      await page.waitForSelector("input[type='file']", { timeout: 10000 });
      console.log(chalk.green("✅ Already logged in"));
      isLoggedIn = true;
    } catch {
      console.log(chalk.yellow("🔑 Please login manually..."));
      await page.waitForSelector("input[type='file']", { timeout: 180000 });
      console.log(chalk.green("✅ Login successful!"));
      
      // Save cookies
      const cookies = await page.cookies();
      fs.writeFileSync(cookiesPath, JSON.stringify(cookies, null, 2));
      console.log(chalk.blue("💾 Cookies saved"));
      isLoggedIn = true;
    }

    if (!isLoggedIn) {
      throw new Error("Login failed");
    }

    // Upload video
    console.log(chalk.cyan("📤 Uploading video..."));
    const fileInput = await page.$("input[type='file']");
    await fileInput.uploadFile(path.resolve(videoPath));
    console.log(chalk.green(`✅ Video uploaded: ${path.basename(videoPath)}`));

    await wait(8000);

    // Add caption
    if (caption) {
      try {
        console.log(chalk.cyan("✍️ Adding caption..."));
        const captionSelectors = [
          "div[contenteditable='true']",
          "div[role='textbox']",
          "[data-e2e='editor']"
        ];

        let captionInput = null;
        for (const selector of captionSelectors) {
          try {
            await page.waitForSelector(selector, { timeout: 3000 });
            captionInput = await page.$(selector);
            if (captionInput) break;
          } catch (e) { continue; }
        }

        if (captionInput) {
          await captionInput.click();
          await wait(1000);
          await page.keyboard.down('Control');
          await page.keyboard.press('a');
          await page.keyboard.up('Control');
          await page.keyboard.type(caption);
          console.log(chalk.green(`✅ Caption added: ${caption}`));
        }
      } catch (err) {
        console.log(chalk.yellow(`⚠️ Caption failed: ${err.message}`));
      }
    }

    await wait(3000);

    // Post video
    console.log(chalk.cyan("🚀 Posting..."));
    let posted = false;
    
    // Try data-e2e selector
    try {
      const publishBtn = await page.$('button[data-e2e="publish-button"]');
      if (publishBtn) {
        await publishBtn.click();
        console.log(chalk.green("🚀 Posted! (data-e2e)"));
        posted = true;
      }
    } catch (e) {}
    
    // Try button text
    if (!posted) {
      try {
        const buttons = await page.$$('button');
        for (const btn of buttons) {
          const text = await page.evaluate(el => el.textContent, btn);
          if (text.toLowerCase().includes('post') || text.toLowerCase().includes('publish')) {
            await btn.click();
            console.log(chalk.green("🚀 Posted! (text search)"));
            posted = true;
            break;
          }
        }
      } catch (e) {}
    }
    
    if (!posted) {
      console.log(chalk.yellow("⚠️ Auto-post failed. Please click 'Post' manually"));
      await wait(30000);
    }

    console.log(chalk.green("✅ Upload completed!"));
    return true;
    
  } catch (err) {
    console.error(chalk.red(`❌ Upload error: ${err.message}`));
    return false;
  } finally {
    await browser.close();
  }
}

/**
 * Main Function
 */
async function main() {
  console.log(chalk.blueBright("🎯 Simple TikTok Uploader"));
  console.log(chalk.gray("Login + Upload + AI Caption"));

  try {
    // Get video file
    const { videoPath } = await inquirer.prompt([
      {
        type: "input",
        name: "videoPath",
        message: "Video file path:",
        validate: (input) => {
          if (!input.trim()) return "Enter video path";
          if (!fs.existsSync(input.trim())) return "File not found";
          const ext = path.extname(input.trim()).toLowerCase();
          if (!['.mp4', '.mov', '.avi', '.mkv'].includes(ext)) {
            return "Invalid video format";
          }
          return true;
        }
      }
    ]);

    // Caption option
    const { captionType } = await inquirer.prompt([
      {
        type: "list",
        name: "captionType",
        message: "Caption option:",
        choices: [
          "🤖 AI Generated",
          "✍️ Custom Caption", 
          "🚫 No Caption"
        ]
      }
    ]);

    let caption = "";

    if (captionType === "🤖 AI Generated") {
      const { videoDesc } = await inquirer.prompt([
        {
          type: "input",
          name: "videoDesc",
          message: "Video description (for AI):",
          default: path.basename(videoPath, path.extname(videoPath))
        }
      ]);
      caption = await generateAICaption(videoDesc);
      
    } else if (captionType === "✍️ Custom Caption") {
      const { customCaption } = await inquirer.prompt([
        {
          type: "input",
          name: "customCaption",
          message: "Enter caption:",
          validate: input => input.trim().length > 0 || "Enter caption"
        }
      ]);
      caption = customCaption;
    }

    // Summary
    console.log(chalk.cyan("\n📋 Summary:"));
    console.log(chalk.white(`📁 Video: ${path.basename(videoPath)}`));
    console.log(chalk.white(`📏 Size: ${(fs.statSync(videoPath).size / 1024 / 1024).toFixed(2)}MB`));
    if (caption) console.log(chalk.white(`✍️ Caption: ${caption}`));

    const { confirm } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirm",
        message: "Upload to TikTok?",
        default: true
      }
    ]);

    if (!confirm) {
      console.log(chalk.yellow("❌ Cancelled"));
      return;
    }

    // Upload
    console.log(chalk.cyan("\n🚀 Uploading..."));
    const success = await uploadToTikTok(videoPath, caption);

    if (success) {
      console.log(chalk.green("\n🎉 SUCCESS! Video uploaded!"));
    } else {
      console.log(chalk.red("\n❌ Upload failed"));
    }

  } catch (err) {
    console.error(chalk.red(`❌ Error: ${err.message}`));
  }
}

// Run
if (require.main === module) {
  main().catch(err => {
    console.error(chalk.red(`❌ Fatal: ${err.message}`));
    process.exit(1);
  });
}

module.exports = { main, uploadToTikTok, generateAICaption };