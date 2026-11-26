// SB-1 revised for SL-1 (consolidated SL-1 spec §8). The empty-lot Business Sandbox opens by
// following only the "still needed to open" items and their tool buttons. Guidance is Category 3:
// it never changes what is legal (office scans at every stage compare plan() with planCore()),
// it names no required order, and every item is accurate for the site as it stands.
// Changed from the abaf108 version (reason): the old test asserted the forced gate -> aisle ->
// Parking -> office sequence that FCPR Rev 1 deleted (OFF-6, conflicts X1/X4).
import assert from 'node:assert/strict';
import { Sim } from '../../js/sim.js';
import { makeSandbox } from '../../js/scenarios.js';
import { officeSiteStep, openNeeds, openingSteps, OFFICE_LANDING_HINT } from '../../js/openingguide.js';

let checks = 0; const ok = (n) => { checks++; console.log('PASS ' + n); };
const sim = makeSandbox({ kind: 'business' }); sim.s.tut = { on: false, done: true }; sim.ensure();
const p = sim.s.parcel;
const scan = () => { // every office position and rotation on the parcel
  const legal = [], first = new Map();
  for (let r = 0; r < 4; r++) for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
    const a = { tool: 'office', a: { x, y }, b: { x, y }, rotation: r };
    const core = sim.planCore(a), R = sim.plan(a);
    assert.equal(R.status === 'invalid', core.status === 'invalid', `guidance changed legality at ${x},${y} r${r}`);
    if (R.status !== 'invalid') legal.push({ x, y, r }); else first.set(R.reasons[0], (first.get(R.reasons[0]) || 0) + 1);
  }
  return { legal, first };
};
const build = (args) => { const r = sim.dispatch({ type: 'build', f: 0, ...args }); assert.ok(r.ok, JSON.stringify([args, r])); };
const idle = () => { for (let t = 0; t < 1440 * 20 && sim.s.orders.some((o) => o.st !== 'done'); t++) sim.step(); sim.ensure(); };
const keys = () => openNeeds(sim).map((n) => n.key);
const tools = () => Object.fromEntries(openNeeds(sim).map((n) => [n.key, n.tool || null]));

// 0. Bare lot: the line item comes first; the other needs are listed too (no forced order).
assert.deepEqual(keys(), ['line', 'parking', 'office', 'units']); assert.equal(tools().line, 'gate'); ok('bare lot: line, parking, office, units still needed');
assert.match(openNeeds(sim)[0].msg, /^Choose your security line: place an Entrance Gate/); ok('line item copy');
assert.deepEqual(openingSteps(sim).map((t) => t.done), [false, false, false, false, false, false, false]); ok('checklist starts empty');
assert.equal(officeSiteStep(sim).key, 'line'); assert.match(sim.openingIssues()[0], /gate/);
{ const { legal, first } = scan(); assert.equal(legal.length, 0); assert.ok(first.has(OFFICE_LANDING_HINT)); ok(`bare lot: office refused only for an unpaved door landing (${first.get(OFFICE_LANDING_HINT)} spots)`); }

// 1. Place a gate on row 22: the line is set, the public lot is rows 23..29.
const gx = 22, L = 22;
build({ tool: 'gate', a: { x: gx, y: L }, b: { x: gx, y: L } });
assert.equal(sim.s.secLine, L); assert.ok(!keys().includes('line')); ok('gate placed: line set, line item cleared');
assert.ok(keys().includes('gateDrive')); assert.equal(tools().parking, 'aisle'); ok('no paving in the public lot: Parking item opens Drive Aisle with the paint note');
idle();

// 2. Follow the items: a drive from the street to the gate, an aisle behind it, then Parking.
build({ tool: 'aisle', a: { x: gx - 1, y: L + 1 }, b: { x: gx + 1, y: p.y1 } });
build({ tool: 'aisle', a: { x: gx - 1, y: 4 }, b: { x: gx + 1, y: L - 1 } });
build({ tool: 'aisle', a: { x: 4, y: p.y1 }, b: { x: gx - 2, y: p.y1 } });
idle();
assert.ok(!keys().includes('gateDrive')); assert.equal(tools().parking, 'parking'); ok('drive done; Parking item now paints parking');
build({ tool: 'parking', a: { x: 4, y: p.y1 }, b: { x: 9, y: p.y1 } });
assert.ok(keys().includes('wait')); assert.match(openNeeds(sim).find((n) => n.key === 'wait').msg, /Let the Parking paint finish/); ok('pending public Parking: wait');
idle();
assert.ok(!keys().includes('wait') && !keys().includes('parking')); ok('public Parking done');

// 3. Office in the public lot: OFF-8 refuses yard-side doors; legality unchanged by guidance.
build({ tool: 'walk', a: { x: 4, y: 28 }, b: { x: 8, y: 28 } });
build({ tool: 'walk', a: { x: 4, y: 22 }, b: { x: 18, y: 22 } });
idle();
const after = scan();
assert.ok(after.legal.length > 0); assert.ok(after.first.has('Face the office door into the public lot, in front of the security line.')); ok(`office scan: ${after.legal.length} legal spots, yard-side doors refused with OFF-8`);
for (const s of after.legal) { const o = sim.planCore({ tool: 'office', a: { x: s.x, y: s.y }, b: { x: s.x, y: s.y }, rotation: s.r }).creates[0]; assert.equal(sim.secureSide(o.door.x, o.door.y), 'public'); }
ok('every legal office door landing is in the public lot');
build({ tool: 'office', a: { x: 4, y: 24 }, b: { x: 4, y: 24 }, rotation: 2 });
assert.ok(!keys().includes('office')); ok('office placed: office item cleared');

// 4. Units inside the yard; staff route exists via the yard-side walk at row 22 (office touches the yard? no: gate walk).
for (let k = 0; k < 3; k++) build({ tool: 'du10x10', a: { x: gx - 2, y: 4 + 2 * k }, b: { x: gx - 2, y: 4 + 2 * k }, rotation: 1 });
idle();
assert.deepEqual(keys(), []); ok('nothing still needed');
sim.dispatch({ type: 'commission', all: true });
assert.deepEqual(sim.openingIssues(), [], JSON.stringify(sim.objs('unit').map(u=>[u.cstate,u.missing,u.x,u.y,u.dir])));
assert.deepEqual(openingSteps(sim).map((t) => t.done), [true, true, true, true, true, true, false]); ok('checklist: all but Open done');
const r = sim.dispatch({ type: 'open' }); assert.ok(r.ok, r.msg); assert.equal(sim.s.open, true); ok('property opens');
assert.equal(openingSteps(sim), null); assert.deepEqual(openNeeds(sim), []); ok('guidance disappears once open');

// 5. Save/load of the opened state round-trips.
const restored = new Sim(JSON.parse(JSON.stringify(sim.s))); restored.ensure();
assert.equal(restored.s.open, true); assert.equal(restored.s.secLine, L); assert.equal(JSON.stringify(restored.s), JSON.stringify(sim.s)); ok('save/load round trip');

// 6. Frontage properties are untouched.
const maple = makeSandbox({ kind: 'business', start: 'starter' });
assert.equal(officeSiteStep(maple), null); assert.equal(openingSteps(maple), null); ok('starter (Maple frontage) unaffected');
console.log(`${checks} checks passed`);
