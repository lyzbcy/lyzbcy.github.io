const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const all=[];
  page.on('console', m => all.push(`[${m.type()}] ${m.text()}`));
  page.on('pageerror', e => all.push(`[PAGEERROR] ${e.message}`));
  page.on('requestfailed', r => all.push(`[REQFAIL] ${r.url()} - ${r.failure()&&r.failure().errorText}`));
  await page.goto('http://127.0.0.1:5174/world/ar/invite.html',{waitUntil:'networkidle',timeout:30000});
  await page.waitForTimeout(3000);
  const probe = await page.evaluate(()=>{
    return { hasArToolkitSource: typeof window.ArToolkitSource, hasTHREEx: typeof window.THREEx };
  });
  console.log('=== probe ==='); console.log(JSON.stringify(probe));
  console.log('=== console/error (前30) ===');
  all.slice(0,30).forEach(l=>console.log(l));
  await browser.close();
})();
