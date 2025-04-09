const puppeteer = require("puppeteer");
const path = require("path");
const fs = require("fs");

const cookiesPath = path.join(__dirname, "../config/cookies.json");

async function uploadToTikTok(videoPath, caption = "#bot #foryou #edit #fyp") {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
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
    const cookies = JSON.parse(fs.readFileSync(cookiesPath));
    await page.setCookie(...cookies);
    loggedInWithCookies = true;
    console.log("🍪 Loaded saved cookies.");
  }

  // 👀 Go to TikTok upload
  console.log("🌐 Navigating to TikTok upload page...");
  await page.goto("https://www.tiktok.com/upload", { waitUntil: "networkidle2" });

  // ✅ Check if already logged in by detecting the file input
  try {
    await page.waitForSelector("input[type='file']", { timeout: 15000 });
    console.log("✅ Already logged in.");
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

  // 📤 Upload the video
  const inputUploadHandle = await page.$("input[type='file']");
  const absoluteVideoPath = path.resolve(videoPath);
  if (!fs.existsSync(absoluteVideoPath)) {
    console.error("❌ Video not found:", absoluteVideoPath);
    await browser.close();
    return;
  }

  await inputUploadHandle.uploadFile(absoluteVideoPath);
  console.log("📤 Video uploaded:", videoPath);

  // ✍️ Add the caption
  try {
    await page.waitForSelector("div[contenteditable='true']", { timeout: 10000 });
    await page.click("div[contenteditable='true']");
    await page.keyboard.type(caption);
  } catch {
    console.warn("⚠️ Could not type caption.");
  }

  await new Promise((r) => setTimeout(r, 2000));

  // 🚀 Click Post
  const [postButton] = await page.$x("//button[contains(text(),'Post')]");
  if (postButton) {
    await postButton.click();
    console.log("🚀 Posted to TikTok!");
  } else {
    console.warn("⚠️ Post button not found.");
  }

  await new Promise((r) => setTimeout(r, 5000));
  await browser.close();
}

module.exports = uploadToTikTok;
