const { chromium } = require('playwright');
const ARS = ['magic-book','mini-world','star-rescue','face-deform','hand-flower','gesture-game','fitness-coach'];
(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  for (const name of ARS) {
    const page = await browser.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    try {
      await page.goto(`http://127.0.0.1:5174/world/ar/${name}.html`,{waitUntil:'domcontentloaded',timeout:15000});
      await page.waitForTimeout(2000);
      const canvas = await page.evaluate(()=>document.querySelectorAll('canvas').length>0);
      const realErrs = errs.filter(e=>!/GPU stall|favicon|AR.js|Could not load|ERR_NAME|WebGL/i.test(e));
      const ok = canvas && realErrs.length===0;
      console.log(`[${ok?'PASS':'FAIL'}] ${name}: canvas=${canvas} realErrors=${realErrs.length}`);
      if(ok) pass++; else { fail++; realErrs.slice(0,2).forEach(e=>console.log('    '+e)); }
    } catch(e) { console.log(`[FAIL] ${name}: ${e.message.slice(0,60)}`); fail++; }
    await page.close();
  }
  await browser.close();
  console.log(`\n=== ${pass}/${pass+fail} AR PASSED ===`);
  process.exit(fail?1:0);
})();
