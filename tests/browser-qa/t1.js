const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const mob = process.argv[2]==='m';
  const p = await b.newPage(mob ? { viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true } : { viewport:{width:1280,height:800} });
  const errs=[]; p.on('pageerror', e=>errs.push('PE '+e.message)); p.on('console', m=>{ if(m.type()==='error'||m.type()==='warning') errs.push(m.type()+' '+m.text()); });
  await p.goto('http://localhost:5173/index.html'); await p.evaluate(()=>{__game.autoQ=false; __game.rend.setQuality(2);}); await p.waitForTimeout(4000);
  await p.screenshot({ path: `/tmp/shots/title_${mob?'m':'d'}.png` });
  await p.waitForTimeout(6000);
  await p.screenshot({ path: `/tmp/shots/title2_${mob?'m':'d'}.png` });
  console.log(errs.join('\n')); console.log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, tod:__game.rend.todOverride, post:__game.rend.post.active(), agents:__game.sim.s.agents.length, t:__game.sim.s.t})));
  console.log(errs.slice(0,15).join('\n'));
  await b.close();
})();
