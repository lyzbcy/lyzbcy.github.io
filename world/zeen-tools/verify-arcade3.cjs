const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto('http://127.0.0.1:5174/world/arcade.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForTimeout(3500);
  await page.screenshot({path:'zeen-tools/arcade-3.png'});
  const realErrs=errs.filter(e=>!/GPU stall|favicon/i.test(e));
  console.log('errors:', realErrs.length);
  realErrs.slice(0,3).forEach(e=>console.log('  '+e));
  await browser.close();
  console.log(realErrs.length===0?'\n=== ARCADE3 PASSED ===':'\n=== ARCADE3 CHECK ===');
  process.exit(realErrs.length===0?0:1);
})();
