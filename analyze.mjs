import puppeteer from 'puppeteer';
import fs from 'fs';

async function analyze() {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Give it an extra second for React to fully render any delayed effects
  await new Promise(r => setTimeout(r, 1000));
  
  // Take a screenshot
  const screenshotPath = 'C:\\Users\\kisho\\.gemini\\antigravity\\brain\\6b3dc021-22fe-49bf-b256-78e9397fd828\\scratch\\screenshot.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log("Screenshot saved to: " + screenshotPath);
  
  // Extract key information
  const title = await page.title();
  
  // Check if logo exists
  const hasLogo = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    return imgs.some(img => img.src.includes('logo.png') || img.alt.includes('Jaihind'));
  });
  
  // Check toolbar elements
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim() || b.title || 'icon-button').filter(Boolean);
  });
  
  console.log("Title: " + title);
  console.log("Has Logo Rendered: " + hasLogo);
  console.log("Available Buttons: " + buttons.slice(0, 10).join(', ') + (buttons.length > 10 ? '...' : ''));
  
  await browser.close();
}

analyze().catch(console.error);
