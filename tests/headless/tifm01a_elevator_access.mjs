// IFM-01A: blocked unit -> responsible elevator, repair -> genuinely restored access count, truthful blocked-unit status.
import assert from 'node:assert/strict';
import { makeScenario } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
import { UI } from '../../js/ui.js';
let passed = 0, failed = 0;
function test(name, fn) { try { fn(); passed++; console.log('PASS ' + name); } catch (e) { failed++; console.log('FAIL ' + name + ': ' + (e.stack || e.message)); } }

// Small two-floor building: elevator, F1+F2 halls, six F2 5x10 units, all built instantly (setup only).
function fixture({ second = false } = {}) {
  const sim = makeScenario('vertical'); const s = sim.s; s.creative = true;
  const B = (a) => { const r = sim.dispatch({ type: 'build', f: 0, ...a }); assert.ok(r.ok, a.tool + ' ' + r.msg); };
  for (const a of [
    { tool: 'aisle', a: { x: 8, y: 13 }, b: { x: 30, y: 14 } }, { tool: 'walk', a: { x: 8, y: 12 }, b: { x: 30, y: 12 } },
    { tool: 'shell2', a: { x: 8, y: 3 }, b: { x: 30, y: 11 } },
    { tool: 'hall', a: { x: 11, y: 4 }, b: { x: 11, y: 10 }, f: 0 }, { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 0 },
    { tool: 'hall', a: { x: 11, y: 4 }, b: { x: 11, y: 10 }, f: 1 }, { tool: 'hall', a: { x: 9, y: 11 }, b: { x: 29, y: 11 }, f: 1 },
    { tool: 'elevator', a: { x: 14, y: 10 }, b: { x: 14, y: 10 } }, ...(second ? [{ tool: 'elevator', a: { x: 20, y: 10 }, b: { x: 20, y: 10 } }] : []),
    { tool: 'doorWide', a: { x: 17, y: 11 }, b: { x: 17, y: 11 } },
    { tool: 'light', a: { x: 11, y: 6 }, b: { x: 11, y: 6 }, f: 0 }, { tool: 'light', a: { x: 11, y: 9 }, b: { x: 11, y: 9 }, f: 0 }, { tool: 'light', a: { x: 13, y: 11 }, b: { x: 13, y: 11 }, f: 0 },
    { tool: 'light', a: { x: 11, y: 6 }, b: { x: 11, y: 6 }, f: 1 }, { tool: 'light', a: { x: 11, y: 9 }, b: { x: 11, y: 9 }, f: 1 }, { tool: 'light', a: { x: 13, y: 11 }, b: { x: 13, y: 11 }, f: 1 },
    { tool: 'iu5x10', a: { x: 10, y: 4 }, b: { x: 10, y: 9 }, f: 1 },
    { tool: 'power', a: { x: 32, y: 6 }, b: { x: 32, y: 6 } },
  ]) B(a);
  s.creative = false; sim.rebuild();
  for (const u of sim.objs('unit')) if (u.cstate === 'ready') sim.dispatch({ type: 'commission', unit: u.id });
  sim.rebuild();
  const up = sim.objs('unit').filter((u) => u.f === 1);
  assert.ok(up.length >= 3 && up.every((u) => u.cstate === 'operating' && !u.blocked), 'fixture upper units operating with access');
  const els = sim.objs('elevator'); return { sim, s, up, el: els[0], els };
}
function fail(sim, el) { el.cond = 0.1; sim.markDirty(); sim.events.length = 0; sim.rebuild(); }
function ui(sim) { const u = Object.create(UI.prototype); u.g = { sim }; Object.defineProperty(u, 'sim', { get: () => sim, configurable: true }); return u; }
function runUntil(sim, cond, max = 3 * 1440) { const ev = []; for (let i = 0; i < max && !cond(); i++) { sim.step(); ev.push(...sim.events); sim.events.length = 0; } return ev; }

test('elevator outage blocks upper units and names the one responsible elevator', () => {
  const f = fixture(); fail(f.sim, f.el);
  assert.ok(f.up.every((u) => u.blocked && u.missing.includes('Elevator is out of service')));
  const U = ui(f.sim); for (const u of f.up) assert.equal(U.blockingElevator(u)?.id, f.el.id);
});
test('no Inspect elevator target when two elevators are down (ambiguous)', () => {
  const f = fixture({ second: true }); assert.equal(f.els.length, 2);
  for (const e of f.els) e.cond = 0.1; f.sim.markDirty(); f.sim.rebuild();
  assert.ok(f.up.every((u) => u.blocked)); const U = ui(f.sim); for (const u of f.up) assert.equal(U.blockingElevator(u), null);
});
test('no Inspect elevator target for an accessible unit or a non-elevator block', () => {
  const f = fixture(); const U = ui(f.sim); assert.equal(U.blockingElevator(f.up[0]), null);
  fail(f.sim, f.el); const u = f.up[0]; const keep = u.missing; u.missing = ['Unit door needs hallway frontage']; assert.equal(U.blockingElevator(u), null); u.missing = keep;
});
test('no-power block points at the unpowered elevator', () => {
  const f = fixture(); f.el.unpowered = true; const u = f.up[0]; u.blocked = true; u.missing = ['Elevator has no power'];
  assert.equal(ui(f.sim).blockingElevator(u)?.id, f.el.id);
});
test('vendor repair reports exactly the units that regained access', () => {
  const f = fixture(); fail(f.sim, f.el); f.sim.generateTasks();
  const t = f.s.tasks.find((x) => x.obj === f.el.id); assert.ok(t);
  const cash = f.s.cash; assert.ok(f.sim.dispatch({ type: 'callVendor', task: t.id }).ok); assert.equal(Math.round((cash - f.s.cash) * 100) / 100, 650);
  const ev = runUntil(f.sim, () => !f.s.tasks.includes(t));
  const r = ev.filter((e) => e.type === 'access_restored'); assert.equal(r.length, 1);
  assert.equal(r[0].n, f.up.length); assert.equal(r[0].obj, f.el.id); assert.equal(r[0].equip, 'Elevator');
  assert.ok(ev.some((e) => e.type === 'repaired')); assert.ok(f.up.every((u) => !u.blocked));
  assert.equal(f.sim.repairWatch, null);
});
test('repair that restores zero units reports nothing', () => {
  const f = fixture(); f.el.cond = 0.3; f.sim.generateTasks(); const t = f.s.tasks.find((x) => x.obj === f.el.id); assert.ok(t);
  f.sim.dispatch({ type: 'callVendor', task: t.id }); const ev = runUntil(f.sim, () => !f.s.tasks.includes(t));
  assert.ok(ev.some((e) => e.type === 'repaired')); assert.equal(ev.filter((e) => e.type === 'access_restored').length, 0);
});
test('repairing other equipment during an elevator outage reports nothing', () => {
  const f = fixture(); fail(f.sim, f.el); const lt = f.sim.objs('light')[0]; lt.cond = 0.3; f.sim.generateTasks();
  const t = f.s.tasks.find((x) => x.obj === lt.id); assert.ok(t); f.sim.dispatch({ type: 'callVendor', task: t.id });
  const ev = runUntil(f.sim, () => !f.s.tasks.includes(t)); assert.ok(ev.some((e) => e.type === 'repaired' && e.obj === lt.id));
  assert.equal(ev.filter((e) => e.type === 'access_restored').length, 0); assert.ok(f.up.every((u) => u.blocked));
});
test('access check during a preview does not consume or fake the report', () => {
  const f = fixture(); fail(f.sim, f.el); f.sim.repairWatch = [{ obj: f.el.id, name: 'Elevator', units: f.up.map((u) => u.id) }];
  f.sim.previewing = true; f.el.cond = 1; f.sim.rebuild(); f.sim.previewing = false;
  assert.equal(f.sim.events.filter((e) => e.type === 'access_restored').length, 0); assert.ok(f.sim.repairWatch);
});
test('the restore watch is transient: never in the saved state, saves unchanged', () => {
  const f = fixture(); fail(f.sim, f.el); f.sim.repairWatch = [{ obj: f.el.id, name: 'Elevator', units: [1] }];
  const json = JSON.stringify(f.s); assert.ok(!json.includes('repairWatch')); const r = new Sim(JSON.parse(json)); assert.equal(r.repairWatch, undefined);
});
test('unit status pill: blocked vacant unit is not shown green Rent-ready; commercial state kept', () => {
  const f = fixture(); const U = ui(f.sim); U.sheet = (t, sub, h) => h; U.tutFocus = () => null; const u = f.up[0];
  assert.equal(u.commercial, 'ready'); assert.match(U.objSheet(u, u.name), /pill g">Rent-ready/);
  fail(f.sim, f.el); const h = U.objSheet(u, u.name);
  assert.doesNotMatch(h, /Rent-ready/); assert.match(h, /Vacant · no customer access/); assert.match(h, new RegExp(`data-a="inspectElevator" data-v="${f.el.id}"`));
  assert.equal(u.commercial, 'ready'); assert.equal(u.cstate, 'operating');
});
test('toast wording names count and access only', () => {
  const U = ui(fixture().sim); const seen = []; U.toast = (t, k) => seen.push([t, k]); U.sfx = () => {};
  const ev = [{ type: 'access_restored', n: 6, equip: 'Elevator', name: 'Unit 2001' }, { type: 'access_restored', n: 1, equip: 'Elevator', name: 'Unit 2001' }];
  for (const e of ev) U.onEvent(e); assert.equal(seen.length, 2); assert.equal(seen[0][1], 'good');
  assert.equal(seen[0][0], 'Elevator repaired: 6 units regained customer access'); assert.equal(seen[1][0], 'Elevator repaired: Unit 2001 regained customer access');
});
console.log(`${passed} IFM-01A elevator access groups passed`); if (failed) { console.log('SOME FAILED'); process.exitCode = 1; }
