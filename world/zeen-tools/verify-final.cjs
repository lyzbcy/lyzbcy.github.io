const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  let pass=0, fail=0;
  async function check(url, name){
    const page = await browser.newPage();
    const errs=[];
    page.on('pageerror',e=>errs.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
    try{
      await page.goto(url,{waitUntil:'domcontentloaded',timeout:20000});
      await page.waitForTimeout(2500);
      const ok = errs.filter(e=>!/GPU stall|favicon|Could not load/i.test(e)).length===0;
      console.log(`[${ok?'PASS':'FAIL'}] ${name}`);
      if(ok) pass++; else { fail++; errs.slice(0,2).forEach(e=>console.log('    '+e)); }
    }catch(e){ console.log(`[FAIL] ${name}: ${e.message.slice(0,50)}`); fail++; }
    await page.close();
  }
  await check('http://127.0.0.1:5174/world/', '世界(3D NPC+薄暮天空)');
  await check('http://127.0.0.1:5174/world/arcade.html', '游戏厅(3台街机+访客)');
  await check('http://127.0.0.1:5174/world/ar/tryon.html', 'AR试戴间');
  await check('http://127.0.0.1:5174/world/ar/signbridge.html', 'AR手语桥');
  await check('http://127.0.0.1:5174/world/ar/posture.html', 'AR护脊官');
  await browser.close();
  console.log(`\n=== ${pass}/${pass+fail} PASSED ===`);
  process.exit(fail?1:0);
})();
