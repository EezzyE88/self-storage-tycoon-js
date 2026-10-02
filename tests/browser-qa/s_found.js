const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>localStorage.clear());
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); }); await p.waitForTimeout(600); await hold(p);
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); });
  await sim(p, 1440*3); await step(p, 3, 1/30, false);
  await p.evaluate(async()=>{ await __game.autosave(); });
  await sim(p, 1440); await step(p, 3, 1/30, false);
  const saved = await p.evaluate(async()=>{ await __game.autosave(); const m=JSON.parse(localStorage.getItem('sst.autosave.main')), b=JSON.parse(localStorage.getItem('sst.autosave.backup')); return { day: __game.sim.day, t: __game.sim.s.t, cash: Math.round(__game.sim.s.cash), leases: Object.keys(__game.sim.s.leases).length, mainMeta: m.meta, backupDay: b && b.meta.day, bytes: m.code.length }; });
  log('saved', JSON.stringify(saved));
  log('hud', await p.evaluate(()=>document.getElementById('cash').innerText.replace(/\n/g,' | ')));
  await p.evaluate(()=>{ document.querySelector('#tabs [data-v="business"]').click(); }); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('business', await p.evaluate(()=>[...document.querySelectorAll('.sheet .stat')].map(x=>x.innerText.replace(/\n/g,' / ')).join(' || ').slice(0,700)));
  await shot('f_business');
  // reload = close and reopen
  await p.reload(); await p.waitForTimeout(2500);
  log('title continue', await p.evaluate(()=>{ const b=document.querySelector('[data-a="continue"]'); return b ? b.innerText.replace(/\n/g,' ') : 'NONE'; }));
  await p.evaluate(()=>document.querySelector('[data-a="continue"]').click()); await p.waitForTimeout(1500); await step(p, 2, 1/30, false);
  const back = await p.evaluate(()=>({ day: __game.sim.day, t: __game.sim.s.t, cash: Math.round(__game.sim.s.cash), leases: Object.keys(__game.sim.s.leases).length, toast: [...document.querySelectorAll('#feed .toast')].map(t=>t.innerText).join(' | ') }));
  log('restored', JSON.stringify(back), 'MATCH', back.t === saved.t && back.cash === saved.cash && back.leases === saved.leases);
  // damaged main save -> backup
  await p.evaluate(()=>{ const m=JSON.parse(localStorage.getItem('sst.autosave.main')); m.code='SST1.broken'; m.at += 5; localStorage.setItem('sst.autosave.main', JSON.stringify(m)); });
  await p.reload(); await p.waitForTimeout(2500);
  await p.evaluate(()=>document.querySelector('[data-a="continue"]').click()); await p.waitForTimeout(1500); await step(p, 2, 1/30, false);
  log('after damage', await p.evaluate(()=>JSON.stringify({ day: __game.sim.day, toast: [...document.querySelectorAll('#feed .toast')].map(t=>t.innerText).join(' | ') })));
  // calm events + marks
  await p.evaluate(()=>{ const sm=__game.sim; sm.s.exp.security=0.5; sm.s.drama={lastBreak:-99,wars:{}}; sm.dramaDay(sm.day); __game.drain(); });
  await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('notice card', await p.evaluate(()=>{ const c=document.querySelector('#feed .convo'); return c ? c.innerText.replace(/\n/g,' / ') : 'none'; }));
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#feed .convo button')].find(x=>/security map/.test(x.textContent)); b && b.click(); }); await step(p, 3, 1/30, false); await p.waitForTimeout(700);
  log('overlay', await p.evaluate(()=>__game.rend.overlay + ' | ' + [...document.querySelectorAll('#feed .toast')].map(t=>t.innerText).join(' | ')));
  await shot('f_secmap');
  await p.evaluate(()=>{ const sm=__game.sim; sm.s.drama.warned = sm.day - 5; const r0=sm.rnd; let k=0; sm.rnd=()=>{ k++; return k===1?0:r0.call(sm); }; sm.dramaDay(sm.day); sm.rnd=r0; __game.drain(); });
  await step(p, 20, 1/30, false); await p.waitForTimeout(500);
  log('breakin card', await p.evaluate(()=>{ const c=[...document.querySelectorAll('#feed .convo')].find(x=>/cut the lock/.test(x.innerText)); return c ? c.innerText.replace(/\n/g,' / ') : 'none ('+ [...document.querySelectorAll('#feed .convo')].map(x=>x.innerText.slice(0,40)).join('; ') +')'; }));
  log('banner', await p.evaluate(()=>document.querySelector('#celebrate').className));
  await shot('f_breakin');
};
