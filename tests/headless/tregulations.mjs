// FCPR Rev 1 §6 (D6): the in-code regulations register is honoured by the game.
//   REG-2 (a) every 'invalid' reason and every opening issue from a sweep of all tools over representative
//             fixtures maps to a register entry of category 1 or 5 (2 only for removal protection / opening);
//         (b) no Category 2, 3 or 4 entry ever refuses a build plan (Category 2 never blocks construction);
//         (c) every Category 1 and 2 entry names a requirement and an existing test;
//         (d) every Category 5 entry is listed for limitation-wording review.
//   REG-3 guidance never changes legality: plan() and planCore() agree on validity for every swept plan.
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { REGULATIONS, regulationFor, LIMITATION_REVIEW } from '../../js/regulations.js';
import { TOOLS } from '../../js/data.js';
import { Sim } from '../../js/sim.js';
import { makeSandbox, makeScenario } from '../../js/scenarios.js';
import { emptyLot, build, idle, slLayout } from './sl1_fixtures.mjs';
import { explainOfficeRefusal, openNeeds, openingSteps } from '../../js/openingguide.js';

let n = 0; const ok = (m) => { n++; console.log('PASS ' + m); };
assert.ok(Object.isFrozen(REGULATIONS) && REGULATIONS.every(Object.isFrozen)); 
const ids = REGULATIONS.map((r) => r.id); assert.equal(new Set(ids).size, ids.length, 'unique ids');

// (c) requirement and an existing test for every Cat 1 / Cat 2 entry.
for (const r of REGULATIONS.filter((r) => r.cat === 1 || r.cat === 2)) {
  assert.ok(r.requirement && r.requirement.length > 3, `${r.id} names a requirement`);
  assert.ok(existsSync(new URL(`./${r.test}.mjs`, import.meta.url)), `${r.id}: test ${r.test} exists`);
}
ok(`REG-2 (c): ${REGULATIONS.filter((r) => r.cat === 1 || r.cat === 2).length} Category 1/2 entries name a requirement and an existing test`);
// (d) Cat 5 limitation-wording review list.
const cat5 = REGULATIONS.filter((r) => r.cat === 5); assert.ok(cat5.length && LIMITATION_REVIEW);
for (const r of cat5) console.log(`  Cat 5 ${r.id}: ${r.stems.length ? r.stems.map((s) => JSON.stringify(s)).join(', ') : '(shares another entry\'s wording)'} - ${r.disp}`);
ok(`REG-2 (d): ${cat5.length} Category 5 entries listed for limitation-wording review`);

// ---------- fixtures ----------
const legacy = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/sl1/abaf108_equiv.json.gz', import.meta.url))));
const load = (id) => { const sim = new Sim(JSON.parse(legacy.fixtures[id].save)); sim.ensure(); return sim; };
const fixtures = {
  'empty lot (line unset)': () => emptyLot(),
  'line set, nothing else': () => { const s = emptyLot(); build(s, 'gate', { x: 22, y: 22 }); idle(s); return s; },
  'SL-1 layout, not open': () => slLayout({}),
  'SL-1 layout, open, two gates, deep lot': () => { const s = slLayout({ L: 19, gates: 2 }); s.dispatch({ type: 'open' }); for (let t = 0; t < 1440 * 3; t++) s.step(); return s; },
  'SL-1 office built, Parking missing': () => { const s = emptyLot(); build(s, 'gate', { x: 22, y: 22 }); build(s, 'walk', { x: 4, y: 27 }, { x: 8, y: 28 }); idle(s); build(s, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }); return s; },
  'legacy open save (yard office, tenants)': () => load('sandbox-blank-legacy-open'),
  'scenario campus (multi-floor)': () => makeScenario('campus'),
  'scenario vertical': () => makeScenario('vertical'),
  'Maple frontage': () => makeSandbox({ kind: 'business', start: 'starter' }),
};
const toolNames = Object.keys(TOOLS);
const shapesOf = (tool, x, y) => {
  const T = TOOLS[tool], out = [];
  if (T.shape === 'rect') out.push({ a: { x, y }, b: { x: x + 2, y: y + 1 } }, { a: { x, y }, b: { x, y } });
  else if (T.shape === 'row') for (const rotation of [0, 1]) out.push({ a: { x, y }, b: { x, y: y + 6 }, rotation }, { a: { x, y }, b: { x: x + 6, y }, rotation });
  else if (tool === 'office') for (const rotation of [0, 1, 2, 3]) out.push({ a: { x, y }, b: { x, y }, rotation });
  else out.push({ a: { x, y }, b: { x, y } });
  return out;
};
const seen = new Map(), unmapped = new Map(); let plans = 0, refusals = 0, legalityChecks = 0;
const record = (msg, where, kind) => {
  const r = regulationFor(msg);
  if (!r) { if (!unmapped.has(msg)) unmapped.set(msg, where); return; }
  const k = r.id; seen.set(k, (seen.get(k) || 0) + 1);
  if (kind === 'build') assert.ok(r.cat === 1 || r.cat === 5, `REG-2 (b): ${r.id} (Cat ${r.cat}) refused a build plan: "${msg}" at ${where}`);
  if (kind === 'demolish') assert.ok(r.cat === 1 || r.cat === 2 || r.cat === 5, `${r.id} (Cat ${r.cat}) refused a removal: "${msg}" at ${where}`);
  if (kind === 'opening') assert.equal(r.cat, 2, `${r.id} opening issue must be Cat 2: "${msg}"`);
};
for (const [name, make] of Object.entries(fixtures)) {
  const sim = make(), p = sim.s.parcel, before = JSON.stringify(sim.s), floors = sim.s.hall.length;
  for (const m of sim.openingIssues()) record(m, name, 'opening');
  for (const tool of toolNames) for (let f = 0; f < Math.min(floors, 2); f++) for (let y = p.y0 - 1; y <= p.y1 + 1; y += 3) for (let x = p.x0 - 1; x <= p.x1 + 1; x += 3) {
    if (f > 0 && !['hall', 'doorStd', 'elevator', 'stairs', 'light', 'camera', 'hvac', 'restroom', 'fountain', 'demolish', 'iu5x5', 'iu10x10'].includes(tool)) continue;
    for (const sh of shapesOf(tool, x, y)) {
      const a = { type: 'build', tool, f, ...sh }, R = sim.plan(a); plans++;
      { // REG-3: guidance (explainOfficeRefusal) only rewords; plan() adds only the Cat 1 ALL-7 access check.
        const C = sim.planCore(a);
        if ((R.status === 'invalid') !== (C.status === 'invalid')) assert.ok(R.reasons.every((m) => regulationFor(m)?.id === 'ALL-7'), `REG-3: legality of ${tool} at ${x},${y} f${f} in ${name} changed by ${R.reasons}`);
        if (tool === 'office') { const st = C.status, fp = JSON.stringify([C.items, C.creates]); explainOfficeRefusal(sim, C); assert.equal(C.status, st); assert.equal(JSON.stringify([C.items, C.creates]), fp); }
        legalityChecks++;
      }
      if (R.status === 'invalid') { refusals++; for (const m of R.reasons) record(m, `${name} ${tool} ${x},${y} f${f}`, tool === 'demolish' ? 'demolish' : 'build'); }
    }
  }
  openNeeds(sim); openingSteps(sim);
  assert.equal(JSON.stringify(sim.s), before, `planning or guidance changed state in ${name}`);
}
if (unmapped.size) { for (const [m, w] of unmapped) console.log(`  UNMAPPED "${m}" (${w})`); }
assert.equal(unmapped.size, 0, `REG-2 (a): ${unmapped.size} refusal or opening messages have no register entry`);
ok(`REG-2 (a)/(b): ${plans} plans over ${Object.keys(fixtures).length} fixtures, ${refusals} refusals; every reason maps to a Cat 1/5 entry (Cat 2 only for removal and opening)`);
ok(`REG-3: guidance never changes legality or footprint across ${legalityChecks} swept plans (plan() differs from planCore() only by the Cat 1 ALL-7 access check)`);
console.log('  entries exercised: ' + [...seen.entries()].sort().map(([k, v]) => `${k}x${v}`).join(' '));

// REG-2 (b) directly: SL-1 Category 2 opening requirements never refuse a build plan.
{
  const s = emptyLot(); build(s, 'gate', { x: 22, y: 22 }); build(s, 'walk', { x: 4, y: 27 }, { x: 8, y: 28 }); idle(s);
  for (const r of [0, 1, 2, 3]) { const q = s.plan({ tool: 'office', a: { x: 4, y: 23 }, b: { x: 4, y: 23 }, f: 0, rotation: r }); if (q.status === 'invalid') assert.ok(q.reasons.every((m) => [1, 5].includes(regulationFor(m)?.cat)), q.reasons.join('|')); }
  assert.notEqual(s.plan({ tool: 'office', a: { x: 4, y: 23 }, b: { x: 4, y: 23 }, f: 0, rotation: 2 }).status, 'invalid');
  ok('An office with no Parking and no staff route is placeable (OFF-9/10 are Category 2 opening requirements)');
}
// Every SL-1 refusal has a register ID and category.
for (const [id, msg] of [['GAT-1', 'For now a gate needs at least one yard row behind it.'], ['GAT-8', 'For now all gates sit on one security line. Place this gate on row 8, or remove every gate to move the line.'], ['GAT-9', 'For now the line can only move while the lot is empty of vehicles and people.'], ['GAT-10a', 'Storage must stay inside the secured yard. Choose a row in front of your storage.'], ['GAT-10b', 'This line would put the office door inside the secured yard.'], ['OFF-8', 'Face the office door into the public lot, in front of the security line.'], ['UNT-7', 'Storage units go inside the secured yard.'], ['SHL-5', 'Storage buildings go inside the secured yard.'], ['DOR-6', 'Storage doors must open into the secured yard.']]) {
  const r = regulationFor(msg); assert.equal(r?.id, id, msg); if (r.cat === 5) assert.ok(msg.startsWith('For now'), `${id} limitation wording`);
}
for (const id of ['GAT-1', 'GAT-8', 'GAT-9']) assert.equal(REGULATIONS.find((r) => r.id === id).cat, 5, id);
for (const id of ['GAT-10a', 'GAT-10b', 'OFF-8', 'UNT-7', 'SHL-5', 'DOR-6']) assert.equal(REGULATIONS.find((r) => r.id === id).cat, 1, id);
ok('Q11: every SL-1 refusal maps to its register ID and category; Category 5 ones use "For now" limitation wording');
console.log(`${n} regulations register checks passed`);
