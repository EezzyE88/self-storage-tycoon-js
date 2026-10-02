const { hold, step, sim } = require('./lib.js');
const toasts = (p) => p.evaluate(()=>[...document.querySelectorAll('#feed .toast')].map(t=>t.innerText).join(' | '));
module.exports = async (p, shot, log) => {
  const reqs = []; p.on('request', (r) => { if (r.url().includes(':8000')) reqs.push(r.url()); });
  await p.waitForTimeout(800); await p.evaluate(()=>localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  log('title build', await p.evaluate(()=>{ const b=document.querySelector('.title-build'); return b ? b.innerText : 'none'; }));
  // game A: Maple, play to day 4
  await p.evaluate(()=>document.querySelector('[data-a="new"][data-v="maple"]').click()); await p.waitForTimeout(600);
  log('first new game asked?', await p.evaluate(()=>!!document.querySelector('.confirm-new')));
  await hold(p); await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); });
  await sim(p, 1440*3); await step(p, 3, 1/30, false); await p.evaluate(async()=>{ await __game.autosave(); });
  const A = await p.evaluate(()=>__game.saveMeta()); log('game A', JSON.stringify(A));
  // in-game menu -> New game is guarded
  await p.evaluate(()=>__game.ui.showMenu()); await p.waitForTimeout(300);
  log('menu build line', await p.evaluate(()=>{ const b=document.querySelector('.note.build'); return b ? b.innerText : 'none'; }));
  await p.evaluate(()=>document.querySelector('.menu-list [data-a="new"][data-v="empty"]').click()); await p.waitForTimeout(300);
  log('menu new -> confirm', await p.evaluate(()=>{ const c=document.querySelector('.confirm-new'); return c ? c.innerText.replace(/\n/g,' / ') : 'NO CONFIRM'; }));
  await shot('f2_confirm');
  await p.evaluate(()=>document.querySelector('[data-a="replaceNo"]').click()); await p.waitForTimeout(300);
  log('after cancel still game A', await p.evaluate(()=>JSON.stringify({ day: __game.sim.day, modal: !!document.querySelector('.confirm-new') })));
  // reload -> title -> New game guarded -> start new
  await p.reload(); await p.waitForTimeout(1800);
  await p.evaluate(()=>document.querySelector('[data-a="new"][data-v="empty"]').click()); await p.waitForTimeout(300);
  log('title new -> confirm', await p.evaluate(()=>!!document.querySelector('.confirm-new')));
  await p.evaluate(()=>document.querySelector('[data-a="replaceYes"]').click()); await p.waitForTimeout(1200); await step(p, 2, 1/30, false);
  await sim(p, 1440); await step(p, 2, 1/30, false); await p.evaluate(async()=>{ await __game.autosave(); }); await sim(p, 1440); await p.evaluate(async()=>{ await __game.autosave(); });
  log('game B + slots', await p.evaluate(()=>JSON.stringify({ B: __game.saveMeta(), kept: JSON.parse(localStorage.getItem('sst.kept.previous')).meta, main: JSON.parse(localStorage.getItem('sst.autosave.main')).meta.name, backup: JSON.parse(localStorage.getItem('sst.autosave.backup')).meta.name })));
  // reload -> restore previous game
  await p.reload(); await p.waitForTimeout(1800);
  log('title restore button', await p.evaluate(()=>{ const b=document.querySelector('[data-a="restoreKept"]'); return b ? b.innerText.replace(/\n/g,' ') : 'none'; }));
  await shot('f2_title');
  await p.evaluate(()=>document.querySelector('[data-a="restoreKept"]').click()); await p.waitForTimeout(1500); await step(p, 2, 1/30, false);
  const R = await p.evaluate(()=>__game.saveMeta());
  log('restored', JSON.stringify(R), 'MATCH A', R.name === A.name && R.day === A.day && R.cash === A.cash, '| toast:', await toasts(p));
  log('kept now', await p.evaluate(()=>JSON.parse(localStorage.getItem('sst.kept.previous')).meta.name));
  // banner never covers a request card (phone)
  await p.evaluate(()=>{ const sm=__game.sim; sm.s.exp.security=0.5; sm.s.drama={lastBreak:-99,wars:{},warned:sm.day-5,noted:0}; const r0=sm.rnd; let k=0; sm.rnd=()=>{ k++; return k===1?0:r0.call(sm); }; sm.dramaDay(sm.day); sm.rnd=r0; __game.drain(); });
  await step(p, 20, 1/30, false); await p.waitForTimeout(700);
  log('banner vs card', await p.evaluate(()=>{ const b=document.querySelector('#celebrate .cb'); const cards=[...document.querySelectorAll('#feed .convo')]; const cb=Math.max(0,...cards.map(c=>c.getBoundingClientRect().bottom)); const r=b.getBoundingClientRect(); return JSON.stringify({ bannerTop: Math.round(r.top), cardsBottom: Math.round(cb), overlap: r.top < cb && cards.length>0, on: document.querySelector('#celebrate').classList.contains('on') }); }));
  await shot('f2_banner');
  log('requests to :8000', reqs.length);
};
