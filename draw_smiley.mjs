import puppeteer from 'puppeteer';

async function drawPath(page, points) {
  if (points.length === 0) return;
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  // Draw stroke smoothly
  for (let i = 1; i < points.length; i++) {
    await page.mouse.move(points[i].x, points[i].y, { steps: 1 });
  }
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 100)); // small delay between strokes
}

function getCirclePoints(cx, cy, r, startAngle = 0, endAngle = 2 * Math.PI, segments = 60) {
  const points = [];
  const angleStep = (endAngle - startAngle) / segments;
  for (let i = 0; i <= segments; i++) {
    const angle = startAngle + i * angleStep;
    points.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return points;
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
  
  console.log("Drawing smiley face...");
  
  // Head (circle centered at 500, 400, radius 200)
  const head = getCirclePoints(500, 400, 200, 0, 2 * Math.PI, 80);
  await drawPath(page, head);
  
  // Left Eye (centered at 420, 320, radius 25)
  const leftEye = getCirclePoints(420, 320, 25);
  await drawPath(page, leftEye);
  
  // Right Eye (centered at 580, 320, radius 25)
  const rightEye = getCirclePoints(580, 320, 25);
  await drawPath(page, rightEye);
  
  // Smile (arc starting a bit lower, from angle slightly past 0 to slightly before pi)
  // y increases downwards on the screen, so angle 0 is right (3 o'clock), pi/2 is down (6 o'clock), pi is left (9 o'clock)
  const smile = getCirclePoints(500, 400, 130, Math.PI * 0.15, Math.PI * 0.85, 40);
  await drawPath(page, smile);
  
  console.log("Taking screenshot...");
  const screenshotPath = 'C:\\Users\\kisho\\.gemini\\antigravity\\brain\\6b3dc021-22fe-49bf-b256-78e9397fd828\\scratch\\smiley_drawing.png';
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot saved to: " + screenshotPath);
  
  await browser.close();
}

draw().catch(console.error);
