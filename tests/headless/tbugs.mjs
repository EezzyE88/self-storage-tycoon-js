// Regression checks for the bugs found by the 2026-10-02 bug/stress/playtest pass.
import { makeMaple } from '../../js/maple.js';
import { makeSandbox } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
let fails = 0; const ok = (c, m, x = '') => { console.log((c ? 'PASS ' : 'FAIL ') + m, x); if (!c) fails++; };
const career = () => { const m = makeMaple(); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.open = true; return m; };
{ // B1 invalid clean cell
  const sim = career(); let threw = null, r = {}; try { r = sim.dispatch({ type: 'ownerClean', f: 2, x: 10, y: 10 }); for (let i = 0; i < 600; i++) sim.step(); } catch (e) { threw = e.message; }
  ok(!r.ok && !threw, 'B1 ownerClean on a floor that does not exist is refused and the game keeps running', r.msg);
  const r2 = sim.dispatch({ type: 'ownerClean', f: 0, x: -5, y: 9999 }); ok(!r2.ok, 'B1 ownerClean off the map is refused');
  const st = JSON.parse(JSON.stringify(sim.s)); st.tasks.push({ id: 999999, type: 'clean', need: 'clean', f: 2, x: 3, y: 3, work: 30, prog: 0, pri: 1 });
  let t2 = null; try { const c = new Sim(st); for (let i = 0; i < 600; i++) c.step(); } catch (e) { t2 = e.message; } ok(!t2, 'B1 a save already carrying the bad task loads and runs', t2 || '');
}
{ // B2 buyCarts on a non-corral
  const sim = career(); const u = sim.objs('unit')[0]; const r = sim.dispatch({ type: 'buyCarts', corral: u.id, n: 2 }); ok(!r.ok && !/undefined/.test(r.msg), 'B2 buying carts for a non-corral object is refused', r.msg);
}
{ // B3 undo for any order placed in the last 30 minutes
  const sim = makeSandbox({ kind: 'business', cash: 100000 }); const s = sim.s;
  sim.dispatch({ type: 'build', tool: 'aisle', a: { x: 20, y: 29 }, b: { x: 20, y: 10 }, f: 0 }); const first = s.orders[0];
  sim.dispatch({ type: 'build', tool: 'aisle', a: { x: 21, y: 29 }, b: { x: 21, y: 10 }, f: 0 });
  for (let i = 0; i < 10; i++) sim.step(); const c0 = s.cash; const r = sim.dispatch({ type: 'cancelOrder', id: first.id });
  ok(Math.round(s.cash - c0) === first.cost, 'B3 undoing an earlier order within 30 min refunds it in full', `${r.msg}`);
  const sim2 = makeSandbox({ kind: 'business', cash: 100000 }); sim2.dispatch({ type: 'build', tool: 'aisle', a: { x: 20, y: 29 }, b: { x: 20, y: 10 }, f: 0 }); const o2 = sim2.s.orders[0]; for (let i = 0; i < 40; i++) sim2.step(); const c1 = sim2.s.cash; sim2.dispatch({ type: 'cancelOrder', id: o2.id });
  ok(sim2.s.cash - c1 < o2.cost, 'B3 after 30 min a cancel is a partial refund', Math.round(sim2.s.cash - c1) + ' of ' + o2.cost);
}
{ // B4 worn carts in a corral get repaired instead of piling up
  const sim = career(); const s = sim.s; for (const c of s.carts) c.cond = 0.1; let worn = 0;
  for (let i = 0; i < 1440 * 3; i++) { sim.step(); if (i % 60 === 0) { for (const t of s.tasks.filter((t) => !t.assigned && t.type === 'carts')) sim.dispatch({ type: 'ownerTask', task: t.id }); sim.events.length = 0; } }
  worn = s.carts.filter((c) => c.cond < 0.2).length; ok(worn === 0, 'B4 worn-out carts sitting in a corral get repair jobs and are fixed', `${worn} of ${s.carts.length} still worn`);
}
{ // B5 routine visits do not pile up behind the crowd cap
  const sim = career(); const s = sim.s; for (let k = 0; k < 3000; k++) s.visits.push({ kind: 'access', tenant: Object.keys(s.tenants)[0], unit: Object.values(s.leases)[0].unit, t: s.t + 1 });
  for (let i = 0; i < 61; i++) s.agents.push({ id: 1e6 + i, kind: 'cust', st: 'leave', hidden: true, f: 0, x: 0, y: 0, path: null });
  const before = s.visits.length; try { for (let i = 0; i < 1440; i++) { sim.step(); sim.events.length = 0; } } catch (e) { /* synthetic agents may be removed */ }
  ok(s.visits.length < before / 10, 'B5 routine access visits are not re-queued forever when the lot is crowded', `${before} -> ${s.visits.length}`);
}
{ // B6 'Commission whole order' still works after the finished order record is pruned (3 days after it was placed)
  const sim = makeSandbox({ kind: 'business' }); const B = (tool, a, b) => sim.dispatch({ type: 'build', tool, a, b: b || a, f: 0 });
  B('aisle', { x: 20, y: 29 }, { x: 20, y: 8 }); B('aisle', { x: 21, y: 29 }, { x: 21, y: 8 }); B('gate', { x: 20, y: 29 }); B('du5x10', { x: 19, y: 10 }, { x: 19, y: 22 });
  for (let i = 0; i < 1440 * 4; i++) { sim.step(); sim.events.length = 0; } B('walk', { x: 18, y: 26 }); for (let i = 0; i < 600; i++) { sim.step(); sim.events.length = 0; }
  const u = sim.objs('unit')[0]; const had = sim.s.orders.some((o) => o.id === u.order); const r = sim.dispatch({ type: 'commission', order: u.order });
  ok(r.ok && sim.objs('unit').every((x) => x.cstate === 'operating'), 'B6 commissioning a whole order works after its record was pruned', `record kept: ${had}; ${r.msg}`);
}
console.log(fails ? `${fails} FAILED` : 'ALL PASS'); process.exit(fails ? 1 : 0);
