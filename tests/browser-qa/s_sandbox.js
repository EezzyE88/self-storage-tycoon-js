const { hold, step, sim } = require('./lib.js');
const click = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return 'MISSING ' + s; e.click(); return 'ok'; }, sel);
const txt = (p, sel) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\n+/g, ' / ') : 'none'; }, sel);
const overflow = (p) => p.evaluate(() => { const m = document.querySelector('.modal, .sheet'); if (!m) return 'n/a'; const bad = [...m.querySelectorAll('*')].filter((e) => e.scrollWidth > e.clientWidth + 2 && getComputedStyle(e).overflowX === 'visible' && e.children.length === 0).length; return bad + ' overflowing leaf elements; modal ' + Math.round(m.getBoundingClientRect().width) + 'px wide'; });
module.exports = async (p, shot, log) => {
  await p.waitForTimeout(800); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  log('title sandbox button', await txt(p, '[data-a="sandboxSetup"]'), '| old buttons gone', await p.evaluate(() => !document.querySelector('.title [data-v="empty"], .title [data-v="creative"]')));
  await click(p, '[data-a="sandboxSetup"]'); await p.waitForTimeout(300);
  log('setup business', (await txt(p, '.sb-setup')).slice(0, 900)); log('layout', await overflow(p)); await shot('sb_setup_business');
  await click(p, '[data-a="sbOpt"][data-k="kind"][data-v=\'"free"\']'); await p.waitForTimeout(200);
  log('setup free', (await txt(p, '.sb-setup')).slice(0, 500)); await shot('sb_setup_free');
  await click(p, '[data-a="sbOpt"][data-k="kind"][data-v=\'"business"\']'); await click(p, '[data-a="sbOpt"][data-k="start"][data-v=\'"starter"\']');
  await click(p, '[data-a="sbOpt"][data-k="preset"][data-v=\'"challenging"\']'); await click(p, '[data-a="sbOpt"][data-k="goal"][data-v=\'"profit"\']'); await click(p, '[data-a="sbAdv"]'); await p.waitForTimeout(200);
  await click(p, '[data-a="sbOpt"][data-k="staff"][data-v=\'"basic"\']'); await p.waitForTimeout(200);
  log('advanced', (await txt(p, '.sb-adv')).slice(0, 700)); log('layout adv', await overflow(p)); await shot('sb_setup_adv');
  await click(p, '[data-a="sbStart"]'); await p.waitForTimeout(1200); await hold(p); await step(p, 3, 1/30, false);
  log('started', await p.evaluate(() => JSON.stringify({ speed: __game.sim.s.speed, mode: __game.sim.s.mode, sb: { kind: __game.sim.s.sb.kind, preset: __game.sim.s.sb.preset, goal: __game.sim.s.sb.goal && __game.sim.s.sb.goal.k }, opts: __game.sim.s.opts, cash: __game.sim.s.cash, staff: __game.sim.s.staff.map((x) => x.role), tut: !!(__game.sim.s.tut && __game.sim.s.tut.on), lesson: !!__game.sim.s.lesson })));
  log('HUD', await txt(p, '#pname'));
  await sim(p, 1440 * 3); await step(p, 3, 1/30, false);
  await click(p, '#tabs [data-v="business"]'); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('panel', (await txt(p, '.sb-panel')).slice(0, 900)); await shot('sb_panel');
  await click(p, '[data-a="sbFunds"][data-v="10000"]'); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('after add funds HUD', await txt(p, '#pname'), '| modified badge', await p.evaluate(() => !!document.querySelector('.sb-panel .sb-mod')), '| toast', await p.evaluate(() => [...document.querySelectorAll('#feed .toast')].map((t) => t.innerText).join(' | ')));
  log('statement sandbox line', await p.evaluate(() => [...document.querySelectorAll('.stmt span')].map((x) => x.innerText).join(' ').match(/Sandbox funds[^$]*\$[\d,]+/)?.[0] || 'none'));
  // shortage panel
  await p.evaluate(() => { __game.sim.s.cash = 120; }); await click(p, '[data-a="sbSet"][data-k="goal"][data-v=\'"occ"\']'); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('shortage', (await txt(p, '.sb-short')).slice(0, 500)); await shot('sb_short');
  await p.evaluate(() => { __game.sim.s.cash = 30000; });
  // save, reload, continue
  await p.evaluate(async () => { await __game.autosave(); }); const A = await p.evaluate(() => JSON.stringify(__game.sim.s.sb));
  await p.reload(); await p.waitForTimeout(1800);
  log('continue label', await txt(p, '[data-a="continue"]'));
  await click(p, '[data-a="continue"]'); await p.waitForTimeout(1500); await step(p, 3, 1/30, false);
  await shot('sb_restored_hud'); log('restored sb identical', await p.evaluate((a) => JSON.stringify(__game.sim.s.sb) === a, A), '| HUD', await txt(p, '#pname'));
  // Free Build: build sheet + over-budget preview
  await p.evaluate(() => { __game.newGame('custom', { kind: 'free', start: 'empty' }); __game.ui.title = false; }); await p.waitForTimeout(800); await step(p, 3, 1/30, false);
  await click(p, '#tabs [data-v="build"]'); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('free build sheet sub', await p.evaluate(() => (document.querySelector('.sheet .sub, .sheet h2 + *') || {}).innerText || document.querySelector('.sheet') && document.querySelector('.sheet').innerText.slice(0, 120)));
  log('free HUD', await txt(p, '#pname'), '| cash chip', await txt(p, '#cash'), '| flag', await p.evaluate(() => { const f = document.querySelector('#sbflag'); const r = f.getBoundingClientRect(); return f.innerText + ' visible ' + (!f.hidden && r.width > 0) + ' w' + Math.round(r.width); }));
  await click(p, '[data-a="sheetClose"], .sheet .x'); await step(p, 3, 1/30, false); await shot('sb_free_hud');
};
