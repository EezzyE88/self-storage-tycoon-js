const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.waitForTimeout(1500); await hold(p); await step(p,2,1/30,false); await shot('mTitle');
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(300);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); });
  await step(p,2,1/30,false); await shot('mGame');
  await p.evaluate(()=>__game.showcase.enterPhoto()); await step(p,2,1/30,false); await p.waitForTimeout(800); await shot('mPhoto');
  log(await p.evaluate(()=>{ const b=document.getElementById('photoBar').getBoundingClientRect(); const v=document.querySelector('.viewctl'); return JSON.stringify({bar:[b.left,b.top,b.right,b.bottom], sw:document.documentElement.scrollWidth}); }));
};
