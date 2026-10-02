const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800);
  await p.evaluate(()=>{ document.querySelector('[data-a="new"][data-v="maple"]').click(); }); await p.waitForTimeout(600); await hold(p);
  await p.evaluate(()=>{ document.querySelector('.tut [data-a="tutSkip"]').click(); __game.drain(); });
  await sim(p, 1440*3); await step(p, 3, 1/30, false);
  log('goalbar', await p.evaluate(()=>{ const g=document.getElementById('goalbar'); return JSON.stringify({hidden:g.hidden, w:g.firstChild.style.width, title:g.title}); }));
  // force a break-in through the real event code
  log('breakin', await p.evaluate(()=>{ const sm=__game.sim; const r0=sm.rnd; let k=0; sm.rnd=()=>{ k++; return k===1?0:r0.call(sm); }; sm.s.drama={lastBreak:-99,wars:{}}; sm.dramaDay(sm.day); sm.rnd=r0; __game.drain(); return JSON.stringify(sm.s.convos.filter(c=>c.key&&c.key.startsWith('bi')).map(c=>c.text)); }));
  await step(p, 20, 1/30, false); await p.waitForTimeout(400); await shot('r14_breakin');
  log('banner', await p.evaluate(()=>document.querySelector('#celebrate').className + ' | ' + document.querySelector('#celebrate').innerText.replace(/\n/g,' / ')));
  log('convo card', await p.evaluate(()=>{ const c=document.querySelector('#feed .convo'); return c ? c.innerText.replace(/\n/g,' / ').slice(0,260) : 'none'; }));
  // answer it from the card
  await p.evaluate(()=>{ const b=[...document.querySelectorAll('#feed .convo button')].find(x=>/deductible/.test(x.textContent)); b && b.click(); __game.drain(); }); await step(p, 3, 1/30, false);
  log('after answer', await p.evaluate(()=>JSON.stringify({convos:__game.sim.s.convos.length, toast:[...document.querySelectorAll('#feed .toast')].map(t=>t.innerText).join(' | ')})));
  // treasure auction banner
  await p.waitForTimeout(4500);
  await p.evaluate(()=>{ const u=__game.sim.objs('unit')[0]; __game.sim.emit('auction_sold',{unit:u.id,price:1240,war:true,what:'a restored 1968 motorcycle',tier:'treasure',x:u.x,y:u.y,f:0}); __game.drain(); }); await step(p, 20, 1/30, false); await p.waitForTimeout(300);
  log('auction banner', await p.evaluate(()=>document.querySelector('#celebrate').innerText.replace(/\n/g,' / ')));
  await shot('r14_auction');
  // inspector quick-fix label
  log('quickfix label', await p.evaluate(()=>{ const sm=__game.sim; const L=sm.objs('light')[0]; L.cond=0.3; sm.generateTasks(); __game.ui.select && __game.ui.select(L.id); __game.ui.renderSheet && __game.ui.renderSheet(true); return [...document.querySelectorAll('.sheet button')].map(b=>b.textContent).filter(t=>/Owner|vendor/i.test(t)).join(' | '); }));
};
