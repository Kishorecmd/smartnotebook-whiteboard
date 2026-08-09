import puppeteer from 'puppeteer';

async function drawLine(page, x1, y1, x2, y2) {
  await page.mouse.move(x1, y1);
  await page.mouse.down();
  await page.mouse.move(x2, y2, { steps: 10 }); // steps makes the drawing fluid for the canvas event listeners
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 100)); // small delay between strokes
}

async function draw() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  // Set a good viewport size
  await page.setViewport({ width: 1200, height: 800 });
  
  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  
  // Wait for React and Canvas to fully initialize
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Drawing house...");
  
  // House Base (Square)
  // Top wall
  await drawLine(page, 400, 400, 600, 400);
  // Right wall
  await drawLine(page, 600, 400, 600, 600);
  // Bottom wall
  await drawLine(page, 600, 600, 400, 600);
  // Left wall
  await drawLine(page, 400, 600, 400, 400);
  
  // Roof (Triangle)
  await drawLine(page, 400, 400, 500, 250);
  await drawLine(page, 500, 250, 600, 400);
  
  // Door
  await drawLine(page, 470, 600, 470, 500); // left door frame
  await drawLine(page, 470, 500, 530, 500); // top door frame
  await drawLine(page, 530, 500, 530, 600); // right door frame
  
  // Window (Square inside)
  await drawLine(page, 430, 430, 470, 430);
  await drawLine(page, 470, 430, 470, 470);
  await drawLine(page, 470, 470, 430, 470);
  await drawLine(page, 430, 470, 430, 430);
  
  console.log("Taking screenshot...");
  const screenshotPath = 'C:\\Users\\kisho\\.gemini\\antigravity\\brain\\6b3dc021-22fe-49bf-b256-78e9397fd828\\scratch\\house_drawing.png';
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot saved to: " + screenshotPath);
  
  await browser.close();
}

draw().catch(console.error);
