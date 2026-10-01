const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const vp = process.argv[2]==='m' ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { viewport:{width:1280,height:800} };
  const p = await b.newPage(vp);
  const errs=[]; p.on('pageerror', e=>errs.push(e.message)); p.on('console', m=>{ if(m.type()==='error') errs.push(m.text()); });
  await p.goto('http://localhost:5173/index.html'); await p.waitForTimeout(2500);
  await p.screenshot({ path: '/tmp/shots/title.png' });
  const html = await p.evaluate(()=>document.getElementById('ui').innerText.slice(0,600));
  console.log(html);
  const code = process.argv[3];
  if (code) { const r = await p.evaluate(code); console.log('eval:', JSON.stringify(r)?.slice(0,1500)); await p.waitForTimeout(1500); await p.screenshot({ path: '/tmp/shots/after.png' }); }
  console.log('errors', errs.slice(0,10));
  await b.close();
})();
