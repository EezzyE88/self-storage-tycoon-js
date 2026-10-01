module.exports = async (p, shot, log, mob) => {
  await p.waitForTimeout(1000);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(1500);
  log(await p.evaluate(()=>JSON.stringify({title:__game.ui.title, mode:__game.showcase.mode, body:document.body.className, az:__game.rend.azimuth, elev:__game.rend.camElev, lens:__game.rend.post.mode, act:__game.rend.post.active()})));
  await shot('game');
  // skip tutorial, run a bit
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:4}); });
  await p.evaluate(()=>{ for(let i=0;i<20;i++) __game.advanceTime? window.advanceTime(1000):0; });
  // celebration test
  await p.evaluate(()=>{ __game.showcase.celebrate('Milestone','First expansion commissioned','More doors, more rent.', {x:16,z:16,f:0}); });
  await p.waitForTimeout(900); await shot('celebrate');
  // follow: find a visible person
  const r = await p.evaluate(()=>{ const g=__game, s=g.sim.s; for (let k=0;k<200;k++){ window.advanceTime(500); const a=s.agents.find(a=>!a.hidden && a.kind==='cust'); if(a){ const m=g.rend.pool.ppl.get(a.id); if(!m) continue; const pt=g.rend.project(m.position.x,m.position.z,m.position.y+0.45); return {id:a.id, x:pt.x, y:pt.y, st:a.st}; } } return null; });
  log('person', JSON.stringify(r));
  await p.evaluate(()=>__game.ui.do({type:'speed', v:1}));
  if (r) { await p.evaluate((r)=>{ __game.ui.tapMap(__game.rend.cellAt(r.x,r.y), r.x, r.y); }, r); await p.waitForTimeout(2500); await shot('follow'); log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, card:document.getElementById('followCard').innerText})));}
  // photo mode
  await p.evaluate(()=>__game.showcase.enterPhoto()); await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-p="tod"][data-v="18.2"]').click(); document.querySelector('[data-p="look"][data-v="film"]').click(); });
  await p.waitForTimeout(1500); await shot('photo');
  await p.evaluate(()=>document.querySelector('[data-p="snap"]').click()); await p.waitForTimeout(1500);
  log('photo', await p.evaluate(()=>JSON.stringify(window.__lastPhoto)));
  await shot('photoShot');
  await p.evaluate(()=>{ document.querySelector('[data-s="close"]').click(); document.querySelector('[data-p="tod"][data-v="22.5"]').click(); document.querySelector('[data-p="look"][data-v="natural"]').click(); });
  await p.waitForTimeout(1500); await shot('photoNight');
  await p.evaluate(()=>{ document.querySelector('[data-p="wx"][data-v="rain"]').click(); document.querySelector('[data-p="tod"][data-v="12.5"]').click(); });
  await p.waitForTimeout(4000); await shot('photoRain');
  await p.evaluate(()=>document.querySelector('[data-p="done"]').click()); await p.waitForTimeout(500);
  // tour
  await p.evaluate(()=>__game.showcase.startTour()); await p.waitForTimeout(3000); await shot('tour');
  log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, chip:!document.getElementById('tourChip').hidden})));
  await p.mouse.move(640,400); await p.mouse.down(); await p.mouse.move(700,420,{steps:5}); await p.mouse.up();
  await p.waitForTimeout(800);
  log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, az:__game.rend.azimuth, taz:__game.rend.targetAz, elev:__game.rend.camElev})));
  await shot('afterTour');
};
