module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:1}); });
  const fps = () => p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); function f(){ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else res((n/2).toFixed(1)); } requestAnimationFrame(f); }));
  log('fps', await fps(), await p.evaluate(()=>__game.audio.ctx && __game.audio.ctx.state));
  await p.evaluate(()=>{ __game.audio.music = ()=>{}; }); log('fps nomusic', await fps());
  await p.evaluate(()=>{ __game.audio.update = ()=>{}; }); log('fps noaudio', await fps());
  await p.evaluate(()=>{ __game.audio.play = ()=>{}; }); log('fps nosfx', await fps());
  await p.evaluate(()=>{ __game.showcase.setLens(false); }); log('fps nopost', await fps());
};
