import { chromium } from 'playwright';

const URL = 'http://127.0.0.1:5174/world/';

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (err) {
    console.error('Page load error:', err.message);
    await browser.close();
    process.exit(1);
  }

  const title = await page.title();
  console.log('Page Title:', title);

  const bodyText = await page.textContent('body');
  console.log('Body length:', bodyText.length);

  // Verify it's a Three.js 3D world (canvas element)
  const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  console.log('Canvas elements:', canvasCount);

  await page.screenshot({ path: 'zeen-tools/verify-screenshot.png' });
  console.log('Screenshot saved to zeen-tools/verify-screenshot.png');

  await browser.close();
  
  // Assertions
  let passed = true;
  if (!title.includes('捞鱼')) { console.error('FAIL: Title does not contain 捞鱼'); passed = false; }
  if (canvasCount === 0) { console.error('FAIL: No canvas (Three.js renderer) found'); passed = false; }
  
  if (passed) {
    console.log('Playwright verification PASSED.');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main();