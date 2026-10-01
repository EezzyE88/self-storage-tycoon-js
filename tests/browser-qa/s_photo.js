const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(500); await hold(p);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:1}); });
  await sim(p, 300);
  await p.evaluate(()=>__game.showcase.enterPhoto());
  const set = async (sel, n=3) => { await p.evaluate((sel)=>{ for (const s of sel) document.querySelector(s).click(); __game.rend.post.snapNext=true; }, sel); await step(p, n, 1/30, false); };
  await set(['[data-p="tod"][data-v="22.5"]']); await shot('pNight');
  await set(['[data-p="tod"][data-v="18.2"]']); await shot('pGolden');
  await set(['[data-p="tod"][data-v="12.5"]','[data-p="wx"][data-v="rain"]'], 1); for (let i=0;i<6;i++) await step(p, 4, 0.5, false); await shot('pRain');
  await set(['[data-p="tod"][data-v="19.5"]','[data-p="wx"][data-v="fair"]','[data-p="look"][data-v="cool"]'], 1); for (let i=0;i<6;i++) await step(p, 4, 0.5, false); await shot('pDusk');
};
