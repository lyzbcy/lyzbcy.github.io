const { chromium } = require('playwright');
const fs = require('fs');

const URL = 'http://127.0.0.1:5174/world/';
const OUT_DIR = 'zeen-tools/shots';

async function main() {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });

  const errors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));

  try {
    await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
  } catch (err) {
    console.error('Page load error:', err.message);
    await browser.close();
    process.exit(1);
  }

  // Wait for loading bar to finish and enter button to appear
  await page.waitForFunction(() => {
    const btn = document.getElementById('enter-btn');
    return btn && btn.style.display !== 'none' && getComputedStyle(btn).display !== 'none';
  }, { timeout: 20000 });
  console.log('Enter button visible.');

  await page.click('#enter-btn');
  console.log('Clicked enter.');

  // Wait for 3D world to render
  await page.waitForTimeout(4000);

  // Capture console errors before shots
  console.log('Console errors so far:', errors.length);

  // Shot 1: default spawn view
  await page.screenshot({ path: `${OUT_DIR}/01-spawn.png` });
  console.log('Shot 01 (spawn) saved.');

  // Shot 0: bird's-eye overview by injecting a temporary camera override
  await page.evaluate(() => {
    // disable player control temporarily and lift camera high
    window.__shotOverview = true;
  });
  // Give the world a moment, then capture an aerial by teleporting via controls
  await page.evaluate(() => {
    const ev = new CustomEvent('shot:overview');
    window.dispatchEvent(ev);
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: `${OUT_DIR}/00-overview.png` });
  console.log('Shot 00 (overview) saved.');
  // resume normal control
  await page.evaluate(() => { window.__shotOverview = false; window.dispatchEvent(new CustomEvent('shot:resume')); });
  await page.waitForTimeout(300);

  // Shot 2: look up at the tower by moving the camera via world state / mouse
  // Simulate keyboard to walk forward a bit, then screenshot
  await page.keyboard.down('w');
  await page.waitForTimeout(800);
  await page.keyboard.up('w');
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/02-walk-forward.png` });
  console.log('Shot 02 (walk forward) saved.');

  // Shot 3: turn around (pointer lock may not work in headless; use drag on canvas)
  const canvas = await page.$('#canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 - 200, box.y + box.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${OUT_DIR}/03-turn.png` });
  console.log('Shot 03 (turn) saved.');

  // Report console errors
  console.log('\n=== Console errors ===');
  errors.forEach(e => console.log(' -', e));
  console.log('======================');

  await browser.close();
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
