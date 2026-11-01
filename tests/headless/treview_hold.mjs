// Campaign Unit 2: owner reviews wait while a tutorial or lesson is teaching.
// Checks: hold predicate; no expiry/default while held and age frozen; cap never drops a held review; order kept;
// save/reload mid-hold; release at graduation, lesson end and chapter-break Continue; stale reviews retired with no
// decision/default; per-type staleness checks; Clerk/Manager handling unchanged; lesson-owned requests shown;
// outside a hold, behaviour (expiry, default, cap) is unchanged.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { BEATS, tutorialTick } from '../../js/tutorial.js';
import { OFFICE_HOURS } from '../../js/data.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const tutorial = (seed = 31) => makeMaple(seed); // a new Maple game: the tutorial is active at its first beat
const career = (seed = 31) => { const m = makeMaple(seed); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.open = true; return m; };
const run = (sim, n) => { for (let i = 0; i < n; i++) sim.step(); };
// A request with a detectable default: if the default ever runs, tut.flags['def_<key>'] is set.
const ask = (sim, key, extra = {}) => {
  sim.convo({ key, who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Test ' + key, actions: [{ label: 'Default', action: { type: 'tutFlag', flag: 'def_' + key } }, { label: 'Other' }], ...extra });
  return sim.s.convos.find((c) => c.key === key);
};
const mine = (sim, p = 'h') => sim.s.convos.filter((c) => String(c.key).startsWith(p));
const brokenLight = (sim) => { const L = sim.objs('light').find((l) => l.x === 20 && l.y === 8); L.cond = 0.05; sim.markDirty?.(); assert.equal(sim.works(L), false); return L; };
const lightAsk = (sim, L) => { sim.convo({ key: 'light' + L.id, who: 'A tenant', sev: 'attention', obj: L.id, ttl: 10 * 60, text: 'The light near my unit is out.', actions: [{ label: 'Assign repair', action: { type: 'ownerTaskFor', obj: L.id } }, { label: 'Log it for later' }] }); return sim.s.convos.find((c) => c.key === 'light' + L.id); };

test('reviews are held while the tutorial or a lesson is active, not otherwise', () => {
  const t = tutorial(); assert.equal(t.reviewsHeld(), true);
  const c = career(); assert.equal(c.reviewsHeld(), false);
  c.s.lesson = { id: 'interior', idMark: c.s.nextId, built: [], flags: {}, entered: true }; assert.equal(c.reviewsHeld(), true);
  const x = ask(t, 'h1'); assert.equal(t.reviewHeld(x), true);
  const y = ask(career(), 'h1'); assert.equal(career().reviewHeld(y), false);
});

test('a held review never expires or takes its default, and its age is frozen', () => {
  const sim = tutorial(); const c = ask(sim, 'h1'); const id = c.id;
  run(sim, 1500);
  const k = sim.s.convos.find((x) => x.id === id);
  assert.ok(k, 'still pending'); assert.equal(sim.s.tut.flags.def_h1, undefined, 'default never ran');
  assert.ok(sim.convoAge(k) <= 5, 'age frozen at creation, got ' + sim.convoAge(k));
  assert.ok(k.heldSince != null && k.heldSince <= k.t + 5);
  assert.equal(sim.s.tut.on, true); assert.equal(sim.s.tut.beat, 0);
});

test('outside a hold the same request expires to its default exactly as before', () => {
  const sim = career(); const c = ask(sim, 'h1'); const id = c.id;
  run(sim, 70);
  assert.equal(sim.s.convos.some((x) => x.id === id), false); assert.equal(sim.s.tut.flags.def_h1, true);
});

test('the request cap never drops a held review, and order is kept', () => {
  const sim = tutorial();
  for (let i = 0; i < 12; i++) ask(sim, 'h' + i);
  const held = mine(sim); assert.equal(held.length, 12);
  assert.deepEqual(held.map((c) => c.key), Array.from({ length: 12 }, (_, i) => 'h' + i));
  assert.deepEqual(held.map((c) => c.id), [...held.map((c) => c.id)].sort((a, b) => a - b));
  // Outside a hold the cap still keeps the newest 8 (oldest first out), as before.
  const c = career(); for (let i = 0; i < 12; i++) ask(c, 'h' + i);
  assert.deepEqual(mine(c).map((x) => x.key), ['h4', 'h5', 'h6', 'h7', 'h8', 'h9', 'h10', 'h11']);
});

test('save and reload mid-hold keeps every held review, its order, unresolved state and the tutorial state', () => {
  const sim = tutorial(); for (let i = 0; i < 3; i++) ask(sim, 'h' + i); run(sim, 300);
  const before = clone(sim.s); const re = new Sim(clone(before));
  assert.deepEqual(re.s.convos, before.convos); assert.deepEqual(re.s.tut, before.tut);
  assert.ok(mine(re).every((c) => re.reviewHeld(c)));
  run(re, 900);
  assert.deepEqual(mine(re).map((c) => c.id), mine(sim).map((c) => c.id));
  assert.ok(['h0', 'h1', 'h2'].every((k) => re.s.tut.flags['def_' + k] === undefined));
  assert.equal(new Set(re.s.convos.map((c) => c.key)).size, re.s.convos.length, 'no duplicates');
});

test('graduation releases held reviews: actionable ones shown with their timer resumed, stale ones retired', () => {
  const sim = tutorial(); const L = brokenLight(sim);
  const keep = lightAsk(sim, L), other = ask(sim, 'h1');
  const L2 = sim.objs('light').find((l) => l.id !== L.id); L2.cond = 0.05; const stale = lightAsk(sim, L2);
  run(sim, 600);
  L2.cond = 1; assert.equal(sim.works(L2), true); // normal play fixed it while held
  const log0 = sim.s.mgrLog.length, tasks0 = sim.s.tasks.length, cash0 = sim.s.cash;
  sim.s.tut.beat = BEATS.length - 1; sim.s.tut.flags.grad = true; tutorialTick(sim);
  assert.equal(sim.s.tut.done, true);
  const ids = sim.s.convos.map((c) => c.id);
  assert.ok(ids.includes(keep.id) && ids.includes(other.id)); assert.ok(!ids.includes(stale.id));
  assert.equal(sim.s.mgrLog.length, log0 + 1); assert.match(sim.s.mgrLog[0].msg, /^No longer needed: /); assert.equal(sim.s.mgrLog[0].retired, true);
  assert.equal(sim.s.tasks.length, tasks0, 'retiring ran no decision'); assert.equal(sim.s.cash, cash0);
  for (const c of [keep, other]) { const k = sim.s.convos.find((x) => x.id === c.id); assert.equal(k.heldSince, null); assert.equal(k.wasHeld, true); assert.equal(sim.reviewHeld(k), false); assert.ok(sim.convoAge(k) <= 5); }
  // The timer resumes from where it stopped: h1 (ttl 60) takes its default about 60 minutes after release, not before.
  run(sim, 50); assert.ok(sim.s.convos.some((x) => x.id === other.id)); assert.equal(sim.s.tut.flags.def_h1, undefined);
  run(sim, 20); assert.ok(!sim.s.convos.some((x) => x.id === other.id)); assert.equal(sim.s.tut.flags.def_h1, true);
});

test('chapter-break Continue releases actionable held reviews; later requests are held again', () => {
  const sim = tutorial(); ask(sim, 'h1'); ask(sim, 'h2', { sev: 'critical' }); run(sim, 30);
  const L2 = sim.objs('light')[0]; L2.cond = 1; const stale = lightAsk(sim, L2); // light already works: stale
  const r = sim.dispatch({ type: 'reviewRelease' });
  assert.deepEqual([r.ok, r.shown, r.retired], [true, 2, 1]);
  assert.ok(!sim.s.convos.some((c) => c.id === stale.id));
  assert.equal(sim.releasedPending(), 2); assert.ok(mine(sim).every((c) => c.released && !sim.reviewHeld(c)));
  assert.equal(sim.s.tut.on, true, 'the campaign continues');
  const late = ask(sim, 'h3'); assert.equal(sim.reviewHeld(late), true);
  sim.dispatch({ type: 'convo', id: mine(sim)[0].id, i: 1 }); assert.equal(sim.releasedPending(), 1);
  run(sim, 200); assert.ok(sim.s.convos.some((c) => c.id === late.id), 'the new one is held');
});

test('a lesson ending releases what it held', () => {
  const sim = career(); sim.s.lesson = { id: 'interior', idMark: sim.s.nextId, built: [], flags: {}, entered: true };
  const c = ask(sim, 'h1'); run(sim, 200); assert.ok(sim.s.convos.some((x) => x.id === c.id));
  sim.dispatch({ type: 'lesson', op: 'end' });
  const k = sim.s.convos.find((x) => x.id === c.id); assert.ok(k); assert.equal(sim.reviewHeld(k), false); assert.equal(k.heldSince, null);
  // Skipping the tutorial releases too.
  const t = tutorial(); const d = ask(t, 'h1'); run(t, 100); t.dispatch({ type: 'tutSkip' });
  assert.equal(t.reviewHeld(t.s.convos.find((x) => x.id === d.id)), false);
});

test('a hold that ended without a release call is released on the next request check', () => {
  const sim = tutorial(); const c = ask(sim, 'h1'); run(sim, 100);
  sim.s.tut.on = false; sim.s.tut.done = true; // e.g. a save from a build that ended the tutorial differently
  run(sim, 5); const k = sim.s.convos.find((x) => x.id === c.id); assert.equal(k.heldSince, null); assert.equal(k.wasHeld, true);
});

test('staleness checks: only resolved decisions are retired', () => {
  const sim = tutorial(); const s = sim.s;
  const L = Object.values(s.leases)[0], tn = s.tenants[L.tenant];
  const R = (c) => sim.reviewActionable(c);
  assert.equal(R({ key: 'mo' + tn.id }), false, 'tenant not leaving'); tn.leaving = true; assert.equal(R({ key: 'mo' + tn.id }), true);
  assert.equal(R({ key: 'rate' + L.id }), true); assert.equal(R({ key: 'rate' + 'nope' }), false);
  assert.equal(R({ key: 'lien' + L.id }), false); L.status = 'lien'; assert.equal(R({ key: 'lien' + L.id }), true);
  assert.equal(R({ key: 'size' + 999999 }), false);
  const Lt = sim.objs('light')[0]; Lt.cond = 1; assert.equal(R({ key: 'light' + Lt.id }), false); Lt.cond = 0.05; assert.equal(R({ key: 'light' + Lt.id }), true);
  assert.equal(R({ key: 'gate5' }), true, 'no safe check: shown'); assert.equal(R({ key: 'loan' }), true); assert.equal(R({}), true);
});

test('Clerk/Manager handling is unchanged during a lesson', () => {
  const sim = career(); sim.s.cash = 1e6; assert.equal(sim.dispatch({ type: 'hire', role: 'manager' }).ok, true);
  sim.s.lesson = { id: 'interior', idMark: sim.s.nextId, built: [], flags: {}, entered: true };
  let n = 0; while ((sim.hour < OFFICE_HOURS[0] || sim.hour >= OFFICE_HOURS[1] - 1) && n++ < 1440) sim.step();
  const c = ask(sim, 'h1', { auto: 0 }); run(sim, 5);
  assert.equal(c.staffHandling, 'Manager'); assert.equal(sim.reviewHeld(c), false);
  run(sim, 30);
  assert.ok(!sim.s.convos.some((x) => x.id === c.id)); assert.equal(sim.s.tut.flags.def_h1, true);
  assert.ok(sim.s.mgrLog.some((l) => /^Manager answered Tester/.test(l.msg)));
});

test('a request the active beat owns is lesson content: shown, not held', () => {
  const b = BEATS[0]; b.ownsRequest = (sim, c) => c.key === 'own';
  try {
    const sim = tutorial(); const own = ask(sim, 'own'), other = ask(sim, 'h1');
    assert.equal(sim.reviewHeld(own), false); assert.equal(sim.reviewHeld(other), true);
    run(sim, 70); assert.equal(sim.s.tut.flags.def_own, true, 'owned request follows normal timing'); assert.ok(sim.s.convos.some((x) => x.id === other.id));
  } finally { delete b.ownsRequest; }
});

console.log(`${passed} owner review hold checks passed`);
