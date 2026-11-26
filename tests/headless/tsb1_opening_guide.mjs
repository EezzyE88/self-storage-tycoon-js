// SB-1: an empty-lot Business Sandbox can be opened by following only the
// office refusal and the opening checklist. Each guided step must be accurate:
// while a site step is named, no office position anywhere is legal; once the
// guide clears, legal positions exist. Guidance never changes plan status.
import assert from 'node:assert/strict';
import { Sim } from '../../js/sim.js';
import { makeSandbox } from '../../js/scenarios.js';
import { officeSiteStep, openingSteps, OFFICE_LANDING_HINT } from '../../js/openingguide.js';

let checks = 0; const ok = (n) => { checks++; console.log('PASS ' + n); };
const sim = makeSandbox({ kind: 'business' }); sim.s.tut = { on: false, done: true }; sim.ensure();
const p = sim.s.parcel;
const scan = () => { // every office position and rotation on the parcel
  const legal = [], first = new Map();
  for (let r = 0; r < 4; r++) for (let y = p.y0; y <= p.y1; y++) for (let x = p.x0; x <= p.x1; x++) {
    const a = { tool: 'office', a: { x, y }, b: { x, y }, rotation: r };
    const core = sim.planCore(a), R = sim.plan(a);
    assert.equal(R.status === 'invalid', core.status === 'invalid', `guide changed legality at ${x},${y} r${r}`);
    if (R.status !== 'invalid') legal.push({ x, y, r }); else first.set(R.reasons[0], (first.get(R.reasons[0]) || 0) + 1);
  }
  return { legal, first };
};
const build = (args) => { const r = sim.dispatch({ type: 'build', ...args }); assert.ok(r.ok, JSON.stringify(r)); };
const runUntil = (cond, maxMin = 60 * 24 * 20) => { for (let t = 0; t < maxMin && !cond(); t++) sim.step(); assert.ok(cond(), 'timed out'); };
const idle = () => !sim.s.orders.some((o) => o.st !== 'done');
const expectStep = (tool, label) => {
  const step = officeSiteStep(sim), { legal, first } = scan();
  assert.equal(step?.tool ?? null, tool, label + ': ' + JSON.stringify(step));
  if (step) {
    assert.equal(legal.length, 0, label + ': a named site step must mean no legal office spot');
    assert.deepEqual([...first.keys()].filter((m) => m !== 'This property already has an office'), [step.msg], label + ': every refusal leads with the step');
  }
  ok(`${label}: ${step ? step.msg : 'no site step'} (${legal.length} legal spots)`);
  return { step, legal, first };
};

// 0. Bare lot: every office refusal names the gate, and the checklist is 0 done.
expectStep('gate', 'bare lot');
assert.deepEqual(openingSteps(sim).map((t) => t.done), [false, false, false, false, false, false]); ok('checklist starts empty');
assert.match(sim.openingIssues()[0], /gate/);

// 1. Gate. While it builds, the guide says to wait; afterwards it names the aisle.
const gx = Math.round((p.x0 + p.x1) / 2);
build({ tool: 'gate', a: { x: gx, y: p.y1 }, b: { x: gx, y: p.y1 }, f: 0 });
sim.ensure(); assert.equal(officeSiteStep(sim)?.tool, undefined); assert.match(officeSiteStep(sim).msg, /finish building/); ok('gate under construction: wait');
runUntil(idle); sim.ensure();
expectStep('aisle', 'gate done');

// 2. Aisle from the gate into the lot.
build({ tool: 'aisle', a: { x: gx, y: p.y1 - 1 }, b: { x: gx, y: p.y0 + 4 }, f: 0 });
runUntil(idle); sim.ensure();
expectStep('parking', 'aisle done');
assert.deepEqual(openingSteps(sim).slice(0, 3).map((t) => t.done), [true, true, false]); ok('checklist: gate + aisle done');

// 3. Parking on a pad beside the aisle (paved first, as the rule requires).
build({ tool: 'aisle', a: { x: gx + 1, y: p.y1 - 4 }, b: { x: gx + 4, y: p.y1 - 2 }, f: 0 });
runUntil(idle);
build({ tool: 'parking', a: { x: gx + 1, y: p.y1 - 3 }, b: { x: gx + 4, y: p.y1 - 2 }, f: 0 });
sim.ensure(); assert.match(officeSiteStep(sim)?.msg || '', /Parking paint/); ok('parking pending: wait');
runUntil(idle); sim.ensure();
const after = expectStep(null, 'parking done');
assert.ok(after.legal.length > 0, 'legal office spots exist once the guide clears');
assert.ok(after.first.has(OFFICE_LANDING_HINT), 'position refusals use the landing hint'); ok('landing hint shown for unpaved door sides');
assert.ok(![...after.first.keys()].includes('Office entrance needs a clear outdoor pedestrian landing on the selected side.')); ok('old landing text replaced');

// 4. Office at a legal spot, then drive-up units on the aisle.
const o = after.legal.sort((a, b) => b.y - a.y || a.x - b.x)[0];
build({ tool: 'office', a: { x: o.x, y: o.y }, b: { x: o.x, y: o.y }, rotation: o.r, f: 0 });
let unitsBuilt = 0;
for (let y = p.y0 + 4; y < p.y1 - 8 && unitsBuilt < 3; y++) for (const r of [0, 1, 2, 3]) {
  const a = { tool: 'du10x10', a: { x: gx - 1, y }, b: { x: gx - 1, y }, rotation: r, f: 0 };
  if (sim.plan(a).status === 'valid') { build(a); unitsBuilt++; y += 10; break; }
}
assert.ok(unitsBuilt > 0, 'a drive-up unit fits on the aisle');
runUntil(() => idle() && !sim.openingIssues().length); sim.ensure();
assert.deepEqual(openingSteps(sim).map((t) => t.done), [true, true, true, true, true, false]); ok('checklist: all but Open done');
assert.equal(officeSiteStep(sim), null);
const r = sim.dispatch({ type: 'open' }); assert.ok(r.ok, r.msg); assert.equal(sim.s.open, true); ok('property opens');
assert.equal(openingSteps(sim), null); ok('checklist disappears once open');

// 5. Save/load of the opened state round-trips.
const restored = new Sim(JSON.parse(JSON.stringify(sim.s))); restored.ensure();
assert.equal(restored.s.open, true); assert.equal(restored.objs('office').length, 1); ok('save/load round trip');

// 6. Frontage properties are untouched.
const maple = makeSandbox({ kind: 'business', start: 'starter' });
assert.equal(officeSiteStep(maple), null); assert.equal(openingSteps(maple), null); ok('starter (Maple frontage) unaffected');
console.log(`${checks} checks passed`);
