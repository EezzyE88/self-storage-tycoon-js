const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log, mob) => {
  const reqs = []; p.on('request', (r) => { if (r.url().includes(':8000')) reqs.push(r.url()); });
  await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear());
  log('host', await p.evaluate(()=>location.host), 'cloud enabled', await p.evaluate(()=>__game.cloud.enabled));
  await p.evaluate(()=>document.querySelector('[data-a="new"][data-v="maple"]').click()); await p.waitForTimeout(600); await hold(p);
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); });
  await sim(p, 1440*2); await step(p, 3, 1/30, false);
  log('autosave ok', await p.evaluate(async()=>await __game.autosave()), 'note:', await p.evaluate(()=>__game.ui.autosaveNote().slice(0,70)));
  await p.evaluate(()=>document.dispatchEvent(new Event('visibilitychange'))); await p.waitForTimeout(500);
  if (!mob) { // desktop: does the banner overlap the card horizontally too?
    await p.evaluate(()=>{ const sm=__game.sim; sm.s.exp.security=0.5; sm.s.drama={lastBreak:-99,wars:{},warned:sm.day-5,noted:0}; const r0=sm.rnd; let k=0; sm.rnd=()=>{ k++; return k===1?0:r0.call(sm); }; sm.dramaDay(sm.day); sm.rnd=r0; __game.drain(); });
    await step(p, 20, 1/30, false); await p.waitForTimeout(700);
    log('desktop banner vs card', await p.evaluate(()=>{ const r=document.querySelector('#celebrate .cb').getBoundingClientRect(); const ov=[...document.querySelectorAll('#feed .convo')].some(c=>{ const q=c.getBoundingClientRect(); return !(q.right<r.left||q.left>r.right||q.bottom<r.top||q.top>r.bottom); }); return 'overlap2D ' + ov; }));
  }
  log('requests to :8000', reqs.length);
};
