module.exports = async (p, shot, log, mob) => {
  const fps = () => p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); function f(){ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else res((n/2).toFixed(1)); } requestAnimationFrame(f); }));
  log('title', await fps());
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:1}); });
  log('game', await fps());
};
