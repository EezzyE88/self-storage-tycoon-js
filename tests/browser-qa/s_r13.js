const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); }); await p.waitForTimeout(600); await hold(p);
  log('mode before', await p.evaluate(()=>document.querySelector('#pname small').textContent));
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); }); await step(p, 3, 1/30, false);
  log('mode after skip', await p.evaluate(()=>document.querySelector('#pname small').textContent));
  await sim(p, 1440*3); await step(p, 3, 1/30, false);
  await p.evaluate(()=>{ document.querySelector('#tabs [data-v="business"]').click(); }); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  await p.evaluate(()=>{ __game.showcase.celebrate('Milestone', 'Leased a turned-over unit', 'Turnover to new lease: the core loop works.'); }); await p.waitForTimeout(900);
  log('banner', await p.evaluate(()=>{ const b=document.querySelector('#celebrate .cb').getBoundingClientRect(); const sh=document.querySelector('#sheet').getBoundingClientRect(); return JSON.stringify({bannerBottom:Math.round(b.bottom), sheetTop:Math.round(sh.top), overlap:b.bottom>sh.top, bodyCls:document.body.className}); }));
  await shot('r13_banner');
};
