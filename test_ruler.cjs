const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1200, height: 800 }
  });
  
  const page = await browser.newPage();
  
  // Go to the local dev server
  await page.goto('http://localhost:3000');
  
  // Wait for canvas to load
  await page.waitForSelector('canvas');

  // Activate ruler tool
  const rulerButton = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Ruler'));
  });
  
  if (rulerButton) {
    await rulerButton.evaluate(b => b.click());
  }

  // Click on canvas to place the ruler
  await page.mouse.move(400, 400);
  await page.mouse.down();
  await page.mouse.up();
  await new Promise(r => setTimeout(r, 200));

  // Switch to Pen tool
  const penButton = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(btn => btn.textContent.includes('Pen'));
  });
  if (penButton) {
    await penButton.evaluate(b => b.click());
  }
  
  // Try to draw a line along the ruler edge
  // We placed the ruler at 400, 400, wait, it places where we click.
  // The default ruler width is 600, height 50. Wait, Ruler is x,y.
  // If we placed it at 400,400, the top edge is at 400.
  // Let's drag the mouse from (400, 395) to (900, 395).
  // This should snap to the top edge!
  
  await page.mouse.move(420, 395);
  await page.mouse.down();
  
  // Drag slowly
  for(let i=0; i<=50; i++) {
    await page.mouse.move(420 + i * 10, 395 + (i % 2 === 0 ? 5 : -5)); // Add wobble
    await new Promise(r => setTimeout(r, 20));
  }
  await page.mouse.up();

  // Draw another line without ruler snapping to compare (move the ruler first)
  // Or just draw far away from the ruler
  await page.mouse.move(420, 300);
  await page.mouse.down();
  
  // Drag slowly
  for(let i=0; i<=50; i++) {
    await page.mouse.move(420 + i * 10, 300 + (i % 2 === 0 ? 5 : -5)); // Add wobble
    await new Promise(r => setTimeout(r, 20));
  }
  await page.mouse.up();

  
  // Take a screenshot
  await page.screenshot({ path: 'C:\\Users\\kisho\\.gemini\\antigravity\\brain\\6b3dc021-22fe-49bf-b256-78e9397fd828\\scratch\\ruler_drawing.png' });
  
  await browser.close();
})();
