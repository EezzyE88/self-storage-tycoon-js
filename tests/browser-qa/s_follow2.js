module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:0}); });
  const r = await p.evaluate(()=>{ const g=__game, s=g.sim.s; for (let k=0;k<300;k++){ window.advanceTime(500); const a=s.agents.find(a=>!a.hidden && a.kind==='cust'); if(a){ g.rend.frame(0.016); const m=g.rend.pool.ppl.get(a.id); if(!m) continue; const pt=g.rend.project(m.position.x,m.position.z,m.position.y+0.45); return {id:a.id, x:pt.x, y:pt.y}; } } return null; });
  await p.mouse.click(r.x, r.y);
  for (let i=0;i<6;i++){ await p.waitForTimeout(700); log(await p.evaluate(()=>{ const t0=performance.now(); __game.rend.frame(0.016); const t1=performance.now(); __game.ui.update(0.016); return JSON.stringify({f:(t1-t0).toFixed(1), u:(performance.now()-t1).toFixed(1), mode:__game.showcase.mode, zoom:__game.rend.zoom.toFixed(2)}); })); }
  await p.evaluate(()=>__game.ui.do({type:'speed', v:1}));
  for (let i=0;i<4;i++){ await p.waitForTimeout(700); log(await p.evaluate(()=>{ const t0=performance.now(); __game.rend.frame(0.016); return JSON.stringify({f:(performance.now()-t0).toFixed(1), mode:__game.showcase.mode, t:__game.sim.s.t}); })); }
};
