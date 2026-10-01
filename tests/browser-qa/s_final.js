const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  await p.waitForTimeout(1500);
  log('title', await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, demo:!!__game.demo})));
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); });
  await p.waitForTimeout(300); await hold(p);
  await p.evaluate(()=>{ const u=__game.ui; u.do({type:'tutSkip'}); u.renderTut(true); u.do({type:'speed', v:1}); });
  const mem0 = await p.evaluate(()=>JSON.stringify(__game.rend.r.info.memory));
  await sim(p, 4000); await step(p, 5, 1/30, false);
  await p.evaluate(()=>{ __game.showcase.startTour(); }); for(let i=0;i<10;i++) await step(p,10,1/30,false);
  await p.evaluate(()=>{ __game.showcase.stopTour(); __game.showcase.enterPhoto(); document.querySelector('[data-p="tod"][data-v="22.5"]').click(); document.querySelector('[data-p="wx"][data-v="rain"]').click(); });
  for(let i=0;i<10;i++) await step(p,10,0.1,false);
  await p.evaluate(()=>{ document.querySelector('[data-p="done"]').click(); }); 
  await sim(p, 4000); await step(p, 5, 1/30, false);
  log('mem', mem0, await p.evaluate(()=>JSON.stringify(__game.rend.r.info.memory)));
  log('text', await p.evaluate(()=>window.render_game_to_text().slice(0,300)));
  log('state', await p.evaluate(()=>JSON.stringify({mode:__game.showcase.mode, body:document.body.className, tod:__game.rend.todOverride, wx:__game.rend.weatherOverride})));
  await step(p,3,1/30,false); await shot('final');
};
