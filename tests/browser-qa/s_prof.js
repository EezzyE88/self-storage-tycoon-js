module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:0}); });
  const m = (label) => p.evaluate((label)=>{ const r=__game.rend, gl=r.r.getContext(); let tt=0; for(let i=0;i<5;i++){ const t0=performance.now(); r.frame(0.016); gl.finish(); tt+=performance.now()-t0;} const t1=performance.now(); __game.ui.update(0.016); return label+' frame '+(tt/5).toFixed(1)+'ms ui '+(performance.now()-t1).toFixed(1)+' calls '+r.r.info.render.calls+' tris '+r.r.info.render.triangles; }, label);
  log(await m('post'));
  await p.evaluate(()=>__game.showcase.setLens(false)); log(await m('nopost'));
  await p.evaluate(()=>{ __game.rend.fx.g.visible=false; }); log(await m('nofx'));
  await p.evaluate(()=>{ __game.rend.sun.castShadow=false; }); log(await m('noshadow'));
  const fps = () => p.evaluate(()=>new Promise(res=>{ let n=0; const t0=performance.now(); function f(){ n++; if(performance.now()-t0<2000) requestAnimationFrame(f); else res((n/2).toFixed(1)); } requestAnimationFrame(f); }));
  log('fps now', await fps());
  await p.evaluate(()=>{ __game.audio.update = ()=>{}; }); log('fps noaudio', await fps());
};
