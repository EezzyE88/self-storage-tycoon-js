const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ __game.newGame('sc:turnaround'); __game.ui.title=false; __game.ui.closeModal && __game.ui.closeModal(); });
  await p.waitForTimeout(300); await hold(p);
  await p.evaluate(()=>{ const g=__game; g.ui.do({type:'speed', v:1}); });
  await sim(p, 4*1440); // lien convo appears on day 4
  await p.evaluate(()=>{ __game.ui.renderFeed(true); }); await step(p,2,1/30,false); await p.waitForTimeout(300);
  await shot('r9feed');
  log('convos', await p.evaluate(()=>JSON.stringify(__game.sim.s.convos.map(c=>c.text))));
  await p.evaluate(()=>{ __game.ui.setTab('business'); __game.ui.renderSheet(true); }); await step(p,2,1/30,false); await p.waitForTimeout(400);
  await shot('r9biz');
  await p.evaluate(()=>{ const sh=document.querySelector('.sheet .body, .sheet .scroll, .sheet'); const h3=[...document.querySelectorAll('.sheet h3')].find(h=>h.textContent.startsWith('Collections')); h3 && h3.scrollIntoView(); }); await step(p,1,1/30,false); await p.waitForTimeout(300);
  await shot('r9coll');
  await p.evaluate(()=>{ const h3=[...document.querySelectorAll('.sheet h3')].find(h=>h.textContent.startsWith('Financing')); h3 && h3.scrollIntoView(); }); await step(p,1,1/30,false); await p.waitForTimeout(300);
  await shot('r9fin');
  log('text', await p.evaluate(()=>{ const t=document.querySelector('.sheet').innerText; return /undefined|NaN|\[object/.test(t) ? 'BAD '+t.match(/.{0,40}(undefined|NaN|\[object).{0,40}/)[0] : 'clean'; }));
  log('overflow', await p.evaluate(()=>document.documentElement.scrollWidth));
  // auction set piece
  await p.evaluate(()=>{ const g=__game, s=g.sim.s; g.ui.setTab(null); const L=Object.values(s.leases).find(L=>L.status!=='current'); g.sim.scheduleAuction(L); s.auction.day=g.sim.day; const u=s.objects[L.unit]; g.rend.pan && 0; window.__au=u.id; });
  await p.evaluate(()=>{ const g=__game,s=g.sim.s; while (g.sim.mod !== 600) { g.sim.step(); } g.drain(); });
  await step(p, 20, 1/30, false); await p.waitForTimeout(300);
  log('crowd', await p.evaluate(()=>__game.showcase.crowd.length));
  await p.evaluate(()=>{ const g=__game,u=g.sim.s.objects[window.__au]; g.rend.zoomBy && g.rend.zoomBy(2); g.ui.focusCell ? g.ui.focusCell(u.x,u.y) : null; });
  await step(p, 10, 1/30, false); await p.waitForTimeout(300); await shot('r9auction');
  await p.evaluate(()=>{ const g=__game; for(let i=0;i<85;i++) g.sim.step(); g.drain(); });
  await step(p, 10, 1/30, false); await p.waitForTimeout(400); await shot('r9sold');
  log('after', await p.evaluate(()=>JSON.stringify({res:__game.sim.s.auction.result, crowd:__game.showcase.crowd.length})));
};
