// Playtest: a new player builds a Business sandbox on the empty lot using real taps and drags, then runs it.
const { hold, step, sim } = require('./lib.js');
module.exports = async (p, shot, log) => {
  const errs = []; p.on('pageerror', (e) => errs.push(e.message));
  const T = (s) => p.evaluate((s) => { const e = document.querySelector(s); return e ? e.innerText.replace(/\n+/g, ' / ') : '-'; }, s);
  const click = (s) => p.evaluate((s) => { const e = document.querySelector(s); if (!e) return 'MISSING ' + s; e.click(); return 'ok'; }, s);
  const feed = async () => { await p.waitForTimeout(500); await step(p, 2, 1/30, false); return p.evaluate(() => [...document.querySelectorAll('#coach, #feed > *')].filter((e) => !e.hidden).map((e) => e.innerText.replace(/\n+/g, ' / ')).join(' || ').slice(0, 400)); };
  const scr = (x, y) => p.evaluate(([x, y]) => { const q = __game.rend.project(x + 0.5, y + 0.5); return [q.x, q.y, q.vis]; }, [x, y]);
  const drag = async (a, b) => { const A = await scr(a.x, a.y), B = await scr(b.x, b.y); await p.mouse.move(A[0], A[1]); await p.mouse.down(); for (let k = 1; k <= 8; k++) await p.mouse.move(A[0] + (B[0] - A[0]) * k / 8, A[1] + (B[1] - A[1]) * k / 8); await p.mouse.up(); await step(p, 2, 1/30, false); return [A, B]; };
  const place = async (tool, a, b, cat) => {
    await click('[data-a="cancelTool"]'); await step(p, 2, 1/30, false);
    if (!(await p.evaluate(() => !!document.querySelector('[data-a="cat"]')))) { await click('#tabs [data-v="build"]'); await step(p, 2, 1/30, false); }
    if (cat) await click(`[data-a="cat"][data-v="${cat}"]`); await step(p, 2, 1/30, false);
    const r = await click(`[data-a="tool"][data-v="${tool}"]`); await step(p, 2, 1/30, false);
    const pts = await drag(a, b || a); const status = await T('.status');
    const c = await p.evaluate(() => { const b = document.querySelector('[data-a="confirm"]'); if (!b || b.disabled) return 'confirm disabled'; b.click(); return 'confirmed'; }); await step(p, 3, 1/30, false);
    log(`  ${tool} ${JSON.stringify(a)}->${JSON.stringify(b || a)} [${r}] onscreen ${pts[0][2] && pts[1][2]} | preview: ${status.slice(0, 160)} | ${c} | toast: ${(await p.evaluate(() => [...document.querySelectorAll('#feed .toast')].map((t) => t.innerText).slice(-1)[0] || '')).slice(0, 100)}`);
  };
  await p.waitForTimeout(800); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(1500);
  await click('[data-a="sandboxSetup"]'); await p.waitForTimeout(200); await click('[data-a="sbStart"]'); await p.waitForTimeout(1200); await hold(p); await step(p, 4, 1/30, false);
  log('1. first screen. feed:', await feed(), '| tut:', await T('.tut')); await shot('pt_first');
  await click('#coach'); await step(p, 3, 1/30, false); log('   tapped hint ->', (await T('.sheet')).slice(0, 500)); await shot('pt_hint');
  await click('.sheet .x'); await click('#tabs [data-v="build"]'); await step(p, 3, 1/30, false);
  log('2. build sheet:', (await T('.sheet')).slice(0, 600)); await shot('pt_build');
  // a player-like first layout (screen drags)
  await p.evaluate(() => __game.rend.fitProperty(__game.ui.safeRect())); await step(p, 2, 1/30, false);
  log('3. placing:');
  log('   project test', JSON.stringify(await scr(20, 29)), JSON.stringify(await p.evaluate(() => __game.sim.s.parcel))); await place('aisle', { x: 20, y: 29 }, { x: 20, y: 8 }, 'roads');
  await place('aisle', { x: 21, y: 29 }, { x: 21, y: 8 }, 'roads');
  await place('gate', { x: 20, y: 29 }, null, 'site');
  await place('office', { x: 16, y: 26 }, null, 'site');
  await place('du10x10', { x: 22, y: 10 }, { x: 22, y: 26 }, 'units');
  await place('du5x10', { x: 19, y: 10 }, { x: 19, y: 22 }, 'units');
  await place('light', { x: 19, y: 24 }, null, 'security'); await place('light', { x: 23, y: 8 }, null, 'security'); await place('camera', { x: 19, y: 9 }, null, 'security');
  log('   objects placed', await p.evaluate(() => Object.values(__game.sim.s.objects).map((o) => o.type).reduce((a, t) => (a[t] = (a[t] || 0) + 1, a), {})), 'cash', await p.evaluate(() => Math.round(__game.sim.s.cash)));
  await shot('pt_built');
  await click('[data-a="cancelTool"]'); await click('.sheet .x'); await step(p, 2, 1/30, false);
  await click('[data-a="speed"][data-v="4"]');
  for (let k = 0; k < 6; k++) { await sim(p, 720); await step(p, 3, 1/30, false); log(`4. +${(k + 1) * 12}h day ${await p.evaluate(() => __game.sim.day)} feed:`, await feed()); }
  await shot('pt_day3');
  await click('#tabs [data-v="growth"]'); await step(p, 3, 1/30, false); await p.waitForTimeout(300);
  log('   growth checklist:', (await T('.miss')).slice(0, 400), '| buttons:', await p.evaluate(() => [...document.querySelectorAll('.miss button')].map((b) => b.innerText).join(', ')));
  await shot('pt_checklist');
  const w = await p.evaluate(() => { const b = [...document.querySelectorAll('.miss button')].find((b) => /walkway/i.test(b.innerText)); if (!b) return 'no walkway button'; b.click(); return 'clicked'; }); await step(p, 3, 1/30, false);
  log('   walkway button', w, '-> tool', await p.evaluate(() => __game.ui.tool));
  { const A = await scr(18, 26), B = await scr(18, 26); }
  await drag({ x: 19, y: 26 }, { x: 19, y: 26 }); log('   walkway preview', (await T('.status')).slice(0, 140)); await click('[data-a="confirm"]'); await step(p, 3, 1/30, false);
  await click('[data-a="cancelTool"]'); await p.evaluate(() => __game.ui.select(null)); await step(p, 2, 1/30, false);
  // follow the hint chain until open
  for (let k = 0; k < 6; k++) {
    const st = await p.evaluate(() => ({ open: __game.sim.s.open, ready: __game.sim.objs('unit').filter((u) => u.cstate === 'ready').length, op: __game.sim.objs('unit').filter((u) => u.cstate === 'operating').length, built: __game.sim.objs('unit').filter((u) => u.cstate === 'built').length }));
    log('   state', JSON.stringify(st)); if (st.open) break;
    await feed(); await p.evaluate(() => __game.ui.select(null)); await click('.sheet .x'); await step(p, 2, 1/30, false); await p.waitForTimeout(500); await step(p, 2, 1/30, false); const r = await click('#coach'); await step(p, 3, 1/30, false); log('   hint tap', r, '->', (await T('.sheet')).slice(0, 300));
    const btn = await p.evaluate(() => { const bs = [...document.querySelectorAll('.sheet button')].filter((b) => !b.disabled); const b = bs.find((b) => /whole order/i.test(b.innerText)) || bs.find((b) => /open property|commission|make.?ready/i.test(b.innerText)); if (!b) return null; const t = b.innerText; b.click(); return t; }); log('   pressed', btn);
    await sim(p, 360); await step(p, 3, 1/30, false);
  }
  for (let k = 0; k < 10; k++) { await sim(p, 1440 * 3); await step(p, 3, 1/30, false); }
  log('5. day', await p.evaluate(() => __game.sim.day), 'occupancy', await p.evaluate(() => { const u = __game.sim.objs('unit').filter((u) => u.cstate === 'operating'); return u.filter((x) => x.lease).length + '/' + u.length; }), 'cash', await p.evaluate(() => Math.round(__game.sim.s.cash)), '| HUD', await T('#cash'), '| feed', await feed());
  await click('#tabs [data-v="business"]'); await step(p, 3, 1/30, false); log('   panel', (await T('.sb-panel')).slice(0, 300)); await shot('pt_business');
  log('errors', errs.length, errs.slice(0, 5).join(' | '));
};
