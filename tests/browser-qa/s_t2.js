const { hold, step } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(500); await hold(p);
  let t0=Date.now(); await shot('a'); log('subtle shot', Date.now()-t0);
  await p.evaluate(()=>__game.showcase.enterPhoto()); await step(p,2);
  t0=Date.now(); await shot('b'); log('strong shot', Date.now()-t0);
  await p.evaluate(()=>{ document.querySelector('[data-p="tod"][data-v="22.5"]').click(); }); await step(p,2);
  t0=Date.now(); await shot('c'); log('night shot', Date.now()-t0);
};
