// Campaign Unit 1: tutorial progression is identified by stable beat ids (tut.beatId) instead of position alone.
// Checks the id helpers, the save migration matrix (each old position, the pre-Round-11 12-part tutorial, graduated
// saves, sandbox/scenario/company sentinels), preserved beat state, numeric writers, a future reorder, tool unlocks,
// mid-beat save/reload, and that a full tutorial run is identical with and without the id path.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { BEATS, BEAT_ALIASES, LEGACY_BEATS, beatIndex, tutBeatIndex, syncTutBeat, curBeat, stepState, toolUnlocked, unlockBeat, tutorialTick, lessonTick } from '../../js/tutorial.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const base = clone(makeMaple(7).s);
const load = (tut, patch = {}) => { const st = clone(base); Object.assign(st, patch); st.tut = clone(tut); return new Sim(st); };
// Campaign Unit 4 inserted Beat 5 (pricing) and the Act I break; ids never change, positions did.
const IDS = ['welcome', 'makeready', 'lease', 'money', 'pricing', 'actI_break', 'expand', 'repair', 'hire', 'grad'];
const IDS8 = ['welcome', 'makeready', 'lease', 'money', 'expand', 'repair', 'hire', 'grad']; // the layout saves had before ids

test('beat ids are unique, stable and round-trip with positions', () => {
  assert.deepEqual(BEATS.map((b) => b.id), IDS);
  assert.equal(new Set(IDS).size, IDS.length);
  IDS.forEach((id, i) => assert.equal(beatIndex(id), i));
  assert.equal(beatIndex('nope'), -1); assert.equal(beatIndex(undefined), -1); assert.equal(beatIndex(3), -1);
  assert.deepEqual(BEAT_ALIASES, {});
});

test('a new tutorial game starts at welcome with an id', () => {
  const s = makeMaple(11).s;
  assert.equal(s.tut.beat, 0); assert.equal(s.tut.beatId, 'welcome'); assert.equal(s.tut.beatAt, 0);
  assert.equal(curBeat({ s }).id, 'welcome');
});

test('every in-progress 8-part position (a save without ids) maps to the same beat and keeps its state', () => {
  assert.deepEqual(LEGACY_BEATS, IDS8);
  for (let i = 0; i < IDS8.length; i++) {
    const tut = { on: true, beat: i, flags: { welcome: true, x: i }, done: false, entered: true, enteredAt: 123, idMark: 77, built: [{ tool: 'aisle', f: 0, id: 80 }] };
    const sim = load(tut), t = sim.s.tut;
    assert.equal(t.beatId, IDS8[i]);
    if (IDS8[i] === 'expand') { assert.equal(t.beat, 4); assert.equal(t.beatAt, 4); assert.equal(curBeat(sim).id, 'pricing', 'old expand, no row ordered: Beat 5'); }
    else { assert.equal(t.beat, beatIndex(IDS8[i])); assert.equal(t.beatAt, t.beat); assert.equal(curBeat(sim).id, IDS8[i]); }
    assert.deepEqual(t.flags, tut.flags); assert.equal(t.entered, true); assert.equal(t.enteredAt, 123); assert.equal(t.idMark, 77);
    assert.deepEqual(t.built, tut.built); assert.equal(t.on, true); assert.equal(t.done, false); assert.equal(t.migrated, undefined);
  }
});

test('pre-Round-11 12-part saves still remap first, then carry the id', () => {
  const map = [0, 1, 2, 3, 4, 5, 5, 6, 7, 7, 7, 7];
  for (let j = 0; j < 12; j++) {
    const st = clone(base); delete st.mkt; st.tut = { on: true, beat: j, flags: {}, done: false, entered: true };
    const t = new Sim(st).s.tut;
    assert.equal(t.beatId, IDS8[map[j]], 'position ' + j); assert.equal(t.beat, IDS8[map[j]] === 'expand' ? 4 : beatIndex(IDS8[map[j]]));
    if (j > 4) { assert.equal(t.migrated, 11); assert.equal(t.entered, false); } else { assert.equal(t.migrated, undefined); assert.equal(t.entered, true); }
  }
});

test('graduated saves stay graduated and untouched', () => {
  for (const tut of [{ on: false, beat: 8, flags: { grad: true }, done: true, gradDay: 12, idMark: 400 }, { on: false, beat: 3, flags: {}, done: true }]) {
    const sim = load(tut, { mode: 'tutorial' });
    assert.deepEqual(sim.s.tut, tut); assert.equal(curBeat(sim), null);
    assert.equal(toolUnlocked(sim, 'camera'), true); assert.equal(toolUnlocked(sim, 'office'), true);
    tutorialTick(sim); assert.deepEqual(sim.s.tut, tut);
  }
});

test('sandbox, scenario and company sentinels (beat 99) are untouched', () => {
  for (const mode of ['sandbox', 'scenario', 'tutorial']) {
    const tut = { on: false, beat: 99, flags: {}, done: true };
    const sim = load(tut, { mode });
    assert.deepEqual(sim.s.tut, tut); assert.equal(curBeat(sim), null); assert.equal(tutBeatIndex(sim.s), 99);
    assert.equal(toolUnlocked(sim, 'gate'), true);
    tutorialTick(sim); assert.deepEqual(sim.s.tut, tut);
  }
});

test('a position written without its id (older build, test, legacy writer) wins and the id follows', () => {
  const sim = makeMaple(3); assert.equal(sim.s.tut.beatId, 'welcome');
  sim.s.tut.beat = 6;
  assert.equal(tutBeatIndex(sim.s), 6); assert.equal(curBeat(sim).id, 'expand');
  syncTutBeat(sim.s.tut); assert.equal(sim.s.tut.beatId, 'expand'); assert.equal(sim.s.tut.beatAt, 6);
  const reloaded = new Sim(clone(sim.s)); assert.equal(reloaded.s.tut.beatId, 'expand'); assert.equal(reloaded.s.tut.beat, 6);
});

test('after a reorder, the id wins over the stored position', () => {
  // Saved by a build where `repair` sat at position 2: the id is authoritative because the position was written with it.
  const sim = load({ on: true, beat: 2, beatAt: 2, beatId: 'repair', flags: {}, done: false, entered: true, idMark: 50 });
  assert.equal(sim.s.tut.beat, 7); assert.equal(sim.s.tut.beatAt, 7); assert.equal(curBeat(sim).id, 'repair'); assert.equal(sim.s.tut.entered, true);
  // An alias resolves a retired id forward.
  BEAT_ALIASES.oldRepair = 'repair';
  try { const a = load({ on: true, beat: 0, beatAt: 0, beatId: 'oldRepair', flags: {}, done: false }); assert.equal(a.s.tut.beatId, 'repair'); assert.equal(a.s.tut.beat, 7); }
  finally { delete BEAT_ALIASES.oldRepair; }
  // An unknown id with a valid position falls back to the position.
  const u = load({ on: true, beat: 3, beatAt: 3, beatId: 'retired-without-alias', flags: {}, done: false });
  assert.equal(u.s.tut.beatId, 'money'); assert.equal(u.s.tut.beat, 3);
  // Nothing to resolve to: left as it was.
  const bad = load({ on: true, beat: 42, flags: {}, done: false });
  assert.equal(bad.s.tut.beat, 42); assert.equal(bad.s.tut.beatId, undefined); assert.equal(curBeat(bad), null);
});

test('tool unlocks match the former table at every beat: by beat id (expand, repair), never by position', () => {
  const old = (id, tool) => { const at = IDS.indexOf(id); if (tool === 'office' || tool === 'gate') return false; if (['aisle', 'du5x5', 'du5x10', 'du10x10', 'du10x20', 'demolish', 'walk', 'parking'].includes(tool)) return at >= IDS.indexOf('expand'); if (tool === 'light') return at >= IDS.indexOf('repair'); return false; };
  const tools = ['aisle', 'du5x5', 'du10x10', 'demolish', 'walk', 'parking', 'light', 'camera', 'hvac', 'iu5x5', 'office', 'gate', 'shell2'];
  for (let i = 0; i < BEATS.length; i++) { const sim = makeMaple(7); sim.s.tut.beat = i; for (const k of tools) assert.equal(toolUnlocked(sim, k), old(IDS[i], k), `${IDS[i]} ${k}`); }
  assert.equal(unlockBeat('du10x10'), beatIndex('expand')); assert.equal(unlockBeat('light'), beatIndex('repair')); assert.equal(unlockBeat('camera'), BEATS.length - 1);
});

// The real tutorial, title to graduation (same path as twalk). `strip` removes the id fields before every tick,
// forcing the numeric fallback, so the two runs prove the id path changes nothing.
function play(strip, onBeat) {
  const sim = makeMaple(20261101), s = sim.s, log = [];
  const ui = { tab: null, cat: 'site', tool: null, plan: null, sel: null, climate: false, rend: { view: 'ext', overlay: null }, tutLooked: false };
  const tt = () => { if (strip && s.tut.on) { delete s.tut.beatId; delete s.tut.beatAt; } tutorialTick(sim); };
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { if (strip && s.tut.on) { delete s.tut.beatId; delete s.tut.beatAt; } sim.step(); tt(); lessonTick(sim); for (const e of sim.events) log.push(JSON.stringify(e)); sim.events.length = 0; if (onBeat) onBeat(sim, ui); } };
  const until = (fn, max = 1440 * 8) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'reached state'); };
  const d = (a) => { const r = sim.dispatch(a); tt(); return r; };
  const beat = (id) => until(() => { const b = curBeat(sim); return !b || b.id !== id; });
  tick(2); ui.tutLooked = true; d({ type: 'tutFlag', flag: 'welcome' }); tick();
  const u107 = s.objects[s.unitRoles.mapleTurnover]; d({ type: 'ownerMakeReady', unit: u107.id }); s.speed = 4; beat('makeready');
  beat('lease');
  d({ type: 'tutFlag', flag: 'businessOpened' }); tick(); d({ type: 'tutFlag', flag: 'moneyAck' }); tick();
  d({ type: 'tutFlag', flag: 'pricingSeen' }); tick(); d({ type: 'tutFlag', flag: 'pricingAck' }); tick(); beat('pricing');
  d({ type: 'tutFlag', flag: 'actI_break' }); tick(); beat('actI_break');
  d({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 });
  until(() => !!s.milestones.first_expansion); beat('expand');
  tick(2); const L = sim.objs('light').find((l) => l.x === 20 && l.y === 8); const t = s.tasks.find((x) => x.obj === L.id); d({ type: 'ownerTask', task: t.id }); beat('repair');
  d({ type: 'hire', role: 'porter' }); beat('hire');
  d({ type: 'tutFlag', flag: 'grad' }); tick(2);
  return { sim, s, log };
}

let midSave = null;
const A = play(false, (sim) => { if (!midSave && curBeat(sim)?.id === 'repair' && sim.s.tut.entered) midSave = { json: JSON.stringify(sim.s) }; });
const B = play(true);

test('full tutorial: id path and numeric path give identical events and final state', () => {
  assert.equal(A.s.tut.done, true); assert.equal(A.s.tut.beat, BEATS.length); assert.equal(A.s.tut.beatId, undefined); assert.equal(A.s.tut.beatAt, undefined);
  assert.ok(A.s.milestones.graduated);
  assert.equal(A.log.length, B.log.length); assert.deepEqual(A.log, B.log);
  assert.equal(JSON.stringify(A.s), JSON.stringify(B.s));
  assert.ok(A.log.filter((e) => /"tut_done"/.test(e)).length === BEATS.length);
});

test('mid-beat save/reload keeps the beat, step, flags and marks', () => {
  assert.ok(midSave, 'captured a save during the repair beat');
  const before = new Sim(JSON.parse(midSave.json)), after = new Sim(JSON.parse(JSON.stringify(JSON.parse(midSave.json))));
  for (const sim of [before, after]) { assert.equal(sim.s.tut.beatId, 'repair'); assert.equal(sim.s.tut.beat, 7); assert.equal(curBeat(sim).id, 'repair'); }
  const ui = { tab: null, sel: null, rend: { view: 'ext' } };
  assert.deepEqual(stepState(after, ui), stepState(before, ui));
  const raw = JSON.parse(midSave.json).tut;
  for (const k of ['flags', 'entered', 'enteredAt', 'idMark', 'built', 'beatId', 'beatAt', 'beat']) assert.deepEqual(after.s.tut[k], raw[k], k);
});

console.log(`${passed} campaign state checks passed`);
