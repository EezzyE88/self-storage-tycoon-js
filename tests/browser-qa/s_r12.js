const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); }); await p.waitForTimeout(600); await hold(p);
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); });
  await sim(p, 1440*95); await step(p, 3, 1/30, false);
  await p.evaluate(()=>{ document.querySelector('#tabs [data-v="business"]').click(); }); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('.sheet h3')].find(x=>/Monthly report/.test(x.textContent)); h && h.scrollIntoView(); }); await step(p, 2, 1/30, false);
  await shot('rep');
  log('report', await p.evaluate(()=>{ const r=__game.sim.s.mkt.reports.slice(-1)[0]; return JSON.stringify({g:r.grade,score:r.score,up:r.upkeep,gr:r.growPts,sug:r.sug}); }));
  // toast + bubble dedupe check
  log('dedupe', await p.evaluate(()=>{ const u=__game.ui; u.toast('Test A'); u.toast('Test A'); u.toast('Test B'); const t=u.toasts.length; const th={text:'Loading bays are full.',kind:'bad',ag:-1,x:5,y:5,f:0}; u.addBubble(th); u.addBubble({...th}); u.addBubble({...th}); return JSON.stringify({toasts:t, toastText:u.toasts.map(x=>x.text), bubbles:u.bubbles.filter(b=>b.th.text==='Loading bays are full.').length, n:u.bubbles.find(b=>b.th.text==='Loading bays are full.').n}); }));
};
