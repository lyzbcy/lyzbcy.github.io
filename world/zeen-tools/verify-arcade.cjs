const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({viewport:{width:1280,height:720}});
  const errs=[];
  page.on('pageerror',e=>errs.push(e.message));
  page.on('console',m=>{if(m.type()==='error')errs.push(m.text())});
  await page.goto('http://127.0.0.1:5174/world/arcade.html',{waitUntil:'domcontentloaded',timeout:20000});
  await page.waitForTimeout(3500);
  await page.screenshot({path:'zeen-tools/arcade-7machines.png'});
  // 检测自动弹窗指向魔法答案书
  const panelTitle = await page.evaluate(()=>document.querySelector('#panel-title, .panel-title, h2, [class*=title]')?.textContent || 'N/A');
  const realErrs=errs.filter(e=>!/GPU stall|favicon/i.test(e));
  console.log('errors:',realErrs.length);
  realErrs.slice(0,3).forEach(e=>console.log('  '+e));
  await browser.close();
  console.log('screenshot: arcade-7machines.png');
})();
