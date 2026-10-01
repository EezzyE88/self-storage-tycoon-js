module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:0}); });
  const r = await p.evaluate(()=>{ const g=__game, s=g.sim.s; for (let k=0;k<300;k++){ window.advanceTime(500); const a=s.agents.find(a=>!a.hidden && a.kind==='cust'); if(a){ g.rend.frame(0.016); const m=g.rend.pool.ppl.get(a.id); if(!m) continue; const pt=g.rend.project(m.position.x,m.position.z,m.position.y+0.45); return {id:a.id, x:pt.x, y:pt.y, st:a.st, vis:m.visible}; } } return null; });
  log('person', JSON.stringify(r));
  await p.waitForTimeout(300);
  await p.mouse.click(r.x, r.y);
  await p.waitForTimeout(1500);
  log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, f:__game.showcase.follow, card:document.getElementById('followCard').innerText, sel:__game.ui.sel})));
  await p.evaluate(()=>__game.ui.do({type:'speed', v:1}));
  await p.waitForTimeout(3000);
  await shot('follow');
  log(await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, card:document.getElementById('followCard').innerText})));
};
