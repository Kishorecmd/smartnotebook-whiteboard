import puppeteer from 'puppeteer';

async function drawPath(page, points) {
  if (points.length === 0) return;
  await page.mouse.move(points[0].x, points[0].y);
  await page.mouse.down();
  for (let i = 1; i < points.length; i++) {
    await page.mouse.move(points[i].x, points[i].y, { steps: 2 });
  }
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 100)); // small delay between strokes
}

async function draw() {
  console.log("Launching browser...");
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.setViewport({ width: 1200, height: 800 });
  console.log("Navigating to http://localhost:3000...");
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 2000));
  
  console.log("Drawing a tree...");
  
  // Trunk
  const trunkLeft = [
    {x: 480, y: 600},
    {x: 485, y: 550},
    {x: 490, y: 500}
  ];
  await drawPath(page, trunkLeft);

  const trunkRight = [
    {x: 520, y: 600},
    {x: 515, y: 550},
    {x: 510, y: 500}
  ];
  await drawPath(page, trunkRight);
  
  const trunkBottom = [
    {x: 470, y: 600},
    {x: 530, y: 600}
  ];
  await drawPath(page, trunkBottom);

  // Leaves (cloud-like shape)
  // Let's create a bunch of arcs
  const leaves = [
    {x: 490, y: 500},
    {x: 450, y: 480},
    {x: 420, y: 440},
    {x: 430, y: 390},
    {x: 460, y: 350},
    {x: 500, y: 330},
    {x: 540, y: 350},
    {x: 570, y: 390},
    {x: 580, y: 440},
    {x: 550, y: 480},
    {x: 510, y: 500}
  ];
  await drawPath(page, leaves);

  // Some internal leaf lines for texture
  await drawPath(page, [{x: 470, y: 450}, {x: 490, y: 420}, {x: 520, y: 450}]);
  await drawPath(page, [{x: 490, y: 390}, {x: 510, y: 370}, {x: 530, y: 390}]);

  console.log("Taking screenshot...");
  const screenshotPath = 'C:\\Users\\kisho\\.gemini\\antigravity\\brain\\6b3dc021-22fe-49bf-b256-78e9397fd828\\scratch\\tree_drawing.png';
  await page.screenshot({ path: screenshotPath });
  console.log("Screenshot saved to: " + screenshotPath);
  
  await browser.close();
}

draw().catch(console.error);
