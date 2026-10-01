// usage: node run.js d|m script.js  -- script exports async (p, shot, log) => {}
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const mob = process.argv[2]==='m';
  const ctx = await b.newContext(mob ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { viewport:{width:1280,height:800} });
  const p = await ctx.newPage();
  const errs=[]; p.on('pageerror', e=>errs.push('PE '+e.message+' '+(e.stack||'').split('\n')[1])); p.on('console', m=>{ if((m.type()==='error'||m.type()==='warning') && !m.text().includes('404')) errs.push(m.type()+' '+m.text()); });
  await p.goto('http://localhost:5173/index.html'); await p.waitForFunction(()=>window.__game);
  await p.evaluate(()=>{__game.autoQ=false; __game.rend.setQuality(2);});
  const tag = mob?'m':'d';
  const shot = async (n) => p.screenshot({ path: `/tmp/shots/${n}_${tag}.png` });
  const log = (...a) => console.log(...a);
  try { await require(require('path').resolve(process.argv[3]))(p, shot, log, mob); } catch (e) { console.log('SCRIPT ERR', e.message); }
  console.log('errors:', errs.slice(0,12).join('\n'));
  await b.close();
})();
