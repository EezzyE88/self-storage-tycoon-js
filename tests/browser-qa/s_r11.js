const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(600); await hold(p);
  const fr = async (n=3) => { await step(p, n, 1/30, false); await p.waitForTimeout(250); };
  await p.evaluate(()=>{ __game.ui.closeModal && __game.ui.closeModal(); document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); }); await fr(3);
  log('tut', await p.evaluate(()=>JSON.stringify({done:__game.sim.s.tut.done, on:__game.sim.s.tut.on, press:__game.sim.pressureOn()})));
  const t0 = Date.now(); await sim(p, 1440*32); await fr(4); log('sim32 ms', Date.now()-t0);
  log('state', await p.evaluate(()=>{ const s=__game.sim.s; return JSON.stringify({day:__game.sim.day, comps:s.mkt.comp.length, reports:s.mkt.reports.map(r=>r.grade), offer:s.lessonOffer, tier:s.coTier, reviews:s.mkt.reviews.length}); }));
  await shot('r11_play');
  await p.evaluate(()=>{ document.querySelector('#tabs [data-v="business"]').click(); }); await fr(); await shot('r11_biz');
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('.sheet h3')].find(x=>/Your market/.test(x.textContent)); h && h.scrollIntoView(); }); await fr(); await shot('r11_market');
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('.sheet h3')].find(x=>/Reviews/.test(x.textContent)); h && h.scrollIntoView(); }); await fr(); await shot('r11_reviews');
  await p.evaluate(()=>{ document.querySelector('#tabs [data-v="growth"]').click(); }); await fr(); await shot('r11_growth');
  log('career', await p.evaluate(()=>(document.querySelector('.career')||{innerText:'NONE'}).innerText.replace(/\s+/g,' ')));
  await p.evaluate(()=>{ const h=[...document.querySelectorAll('.sheet h3')].find(x=>/Lessons/.test(x.textContent)); h && h.scrollIntoView(); }); await fr(); await shot('r11_lessons');
  // start financing lesson via button
  await p.evaluate(()=>{ const b=document.querySelector('[data-a="lessonStart"][data-v="financing"]'); b && b.click(); __game.drain(); }); await fr(4);
  await p.evaluate(()=>{ document.querySelector('[data-a="close"]') && document.querySelector('[data-a="close"]').click(); }); await fr(4); await shot('r11_lesson');
  log('lesson', await p.evaluate(()=>JSON.stringify(__game.sim.s.lesson) + ' | ' + (document.querySelector('.tut')||{innerText:'-'}).innerText.replace(/\s+/g,' ').slice(0,160)));
  await p.evaluate(()=>{ document.querySelector('[data-a="lessonEnd"]').click(); }); await fr();
  // vacate a drive 10x10 and inspect
  await p.evaluate(()=>{ const g=__game, sm=g.sim; const u=sm.objs('unit').find(u=>u.access==='drive'&&u.size==='10x10'&&u.lease); sm.endLease(sm.s.leases[u.lease],'qa'); sm.s.tasks=sm.s.tasks.filter(t=>t.obj!==u.id); u.commercial='ready'; sm.markDirty(); sm.poll(); g.ui.select(u.id); }); await fr(4); await shot('r11_reno');
  log('reno', await p.evaluate(()=>[...document.querySelectorAll('.sheet button')].map(b=>b.textContent).filter(t=>/Split|climate/i.test(t)).join(' / ')));
  await p.evaluate(()=>{ __game.ui.select(null); __game.ui.do({type:'coTier', tier:2}); document.querySelector('#tabs [data-v="build"]').click(); }); await fr();
  await p.evaluate(()=>{ document.querySelector('.cats [data-v="units"]').click(); document.querySelector('[data-a="tool"][data-v="du10x10"]').click(); const u=__game.ui; u.planArgs={a:{x:13,y:18},b:{x:13,y:21}}; u.replan(); }); await fr();
  await p.evaluate(()=>{ document.querySelector('#abar [data-a="rush"]').click(); }); await fr(); await shot('r11_rush');
  log('rush', await p.evaluate(()=>document.querySelector('#abar .cost').innerText.replace(/\s+/g,' ')));
  await p.evaluate(()=>{ __game.ui.pickTool(null); __game.ui.setTab(null); }); await fr();
  log('text', await p.evaluate(()=>/undefined|NaN|\[object/.test(document.body.innerText) ? 'BAD' : 'clean'));
  log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth), 'errs', errs.join(' | ').slice(0,400));
};
