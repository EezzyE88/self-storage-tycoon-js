const { hold, step } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(500); await hold(p);
  const t = (l) => p.evaluate((l)=>{ const r=__game.rend, gl=r.r.getContext(); const t0=performance.now(); r.frame(0.03); gl.finish(); return l+' '+(performance.now()-t0).toFixed(0)+'ms err '+gl.getError()+' lost '+gl.isContextLost(); }, l);
  log(await t('subtle'));
  await p.evaluate(()=>__game.showcase.enterPhoto()); log(await t('strong'));
  log(await t('strong2'));
  await p.evaluate(()=>{ __game.rend.post.rt.texture.generateMipmaps=false; __game.rend.post.rt.texture.minFilter=1006; __game.rend.post.rt.dispose(); }); log(await t('nomip'));log(await t('nomip2'));
  await p.evaluate(()=>{ __game.showcase.setLens(false); __game.showcase.exitPhoto(); }); log(await t('off'));
};
