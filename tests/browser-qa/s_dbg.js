const { hold, step } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(600); await hold(p);
  await p.evaluate(()=>{ __game.ui.closeModal && __game.ui.closeModal(); __game.ui.tutLooked=true; }); await step(p,3,1/30,false);
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutNext"]').click(); __game.drain(); }); await p.waitForTimeout(200); await step(p,2,1/30,false); await p.waitForTimeout(200); await step(p,2,1/30,false); await shot('dbg');
  log(await p.evaluate(()=>{ const u=__game.ui; const r=document.querySelector('.tut').getBoundingClientRect(); const o=__game.sim.objs('unit').find(u=>u.num===107); const pp=__game.rend.project(o.x+(o.w||1)/2,o.y+(o.h||1)/2,0); return JSON.stringify({card:[r.top,r.bottom,r.width], pp, key:u.guideKey, ap:u.autoPanKey, busy:u.pointerBusy, H:innerHeight}); }));
};
