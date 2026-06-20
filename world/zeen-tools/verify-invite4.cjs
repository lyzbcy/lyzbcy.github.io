const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto('http://127.0.0.1:5174/world/ar/invite.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForTimeout(1500);
  await page.click('#demo2');
  await page.waitForTimeout(4500);
  const phase = await page.evaluate(()=>document.body.dataset.phase);
  const realErrs=errs.filter(e=>!/GPU stall|favicon|Could not load/i.test(e));
  console.log('demo阶段:', phase, '| errors:', realErrs.length);
  await browser.close();
  let pass = phase==='hold' && realErrs.length===0;
  console.log(pass?'\n=== INVITE4 PASSED ===':'\n=== INVITE4 CHECK ===');
  process.exit(pass?0:1);
})();
