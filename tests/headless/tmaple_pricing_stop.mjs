// Maple Street expand beat: read-only Business -> Asking rents stop before the existing build steps.
// Checks step order, progression from real UI states, skip-safety, unchanged beat trigger, and that guidance never writes state.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { tutorialTick, lessonTick, BEATS, stepState, curBeat } from '../../js/tutorial.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const EXPAND = BEATS.findIndex((b) => b.id === 'expand');
const expand = BEATS[EXPAND];
const rents = (label) => ({ tab: 'business', sel: null, tool: null, sectionChoice: label ? { tab: 'business', label } : null });

// Play the real tutorial up to the start of the expand beat (same path as twalk).
function toExpand(seed) {
  const sim = makeMaple(seed), s = sim.s;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); sim.events.length = 0; } };
  const until = (fn, max = 1440 * 6) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'tutorial reached expected state'); };
  const d = (a) => { const r = sim.dispatch(a); tutorialTick(sim); return r; };
  tick(2); d({ type: 'tutFlag', flag: 'welcome' }); tick();
  const u = s.objects[s.unitRoles.mapleTurnover]; d({ type: 'ownerMakeReady', unit: u.id }); s.speed = 4;
  until(() => curBeat(sim)?.id === 'money');
  d({ type: 'tutFlag', flag: 'businessOpened' }); tick(); d({ type: 'tutFlag', flag: 'moneyAck' }); tick();
  assert.equal(curBeat(sim).id, 'expand');
  return { sim, tick, until, d };
}

test('pricing stop comes first; existing build sequence follows unchanged', () => {
  const t = expand.steps.map((st) => st.t);
  assert.deepEqual(t.slice(0, 3), ['Open <b>Business</b>', 'Choose <b>Pricing</b>', 'Asking rents apply to <b>future leases</b>']);
  assert.deepEqual(t.slice(3), ['Open <b>Build</b>', 'Choose <b>Units</b>', 'Pick <b>Drive-Up 10x10</b>', '<b>Drag</b> a row down the grass beside the main aisle', 'Tap <b>Confirm</b>', 'Let construction finish and the units open']);
  assert.match(expand.steps[2].d, /future leases|leases signed after the change/); assert.match(expand.steps[2].d, /keep their current rent/); assert.match(expand.steps[2].d, /don't need to change anything/);
  assert.equal(expand.steps[0].sel, '#tabs [data-v="business"]'); assert.equal(expand.steps[1].sel, '.sheet [data-section-picker]'); assert.equal(expand.steps[2].sel, '#tabs [data-v="build"]');
  assert.ok(expand.steps.slice(0, 3).every((st) => !st.placement && !st.blueprint), 'no placement on pricing steps');
  assert.equal(expand.button, undefined, 'no acknowledgement button or flag added'); assert.equal(expand.flag, undefined);
  assert.equal(EXPAND, 4, 'beat index (tool unlocks) unchanged'); assert.equal(BEATS.length, 8);
});

test('progression follows the real Business -> Pricing -> Build path', () => {
  const { sim } = toExpand(20260929);
  assert.equal(stepState(sim, { tab: null, sel: null }).cur, 0, 'map: open Business');
  assert.equal(stepState(sim, rents(null)).cur, 1, 'Business open, no section: choose Pricing');
  assert.equal(stepState(sim, rents('Operating performance')).cur, 1, 'Statement left over from money beat: still choose Pricing');
  assert.equal(stepState(sim, rents('Asking rents')).cur, 2, 'Asking rents showing: read, then open Build');
  assert.equal(stepState(sim, { tab: 'operate', sel: null, sectionChoice: { tab: 'operate', label: 'Asking rents' } }).cur, 0, 'wrong tab never counts');
  assert.equal(stepState(sim, { tab: 'build', cat: 'site', sel: null }).cur, 4, 'Build open: choose Units (existing step)');
  assert.equal(stepState(sim, { tab: 'build', cat: 'units', sel: null }).cur, 5, 'Units chosen: Drive-Up card');
  assert.equal(stepState(sim, { tab: 'build', cat: 'units', sel: null, tool: 'du10x10', plan: null }).cur, 6, 'tool armed: drag');
  assert.equal(stepState(sim, { tab: null, sel: null, tool: 'du10x10' }).cur, 6, 'armed tool alone is past the pricing stop');
});

test('skipping the pricing stop never blocks: build straight away, beat completes on the existing milestone', () => {
  const { sim, until, d } = toExpand(20260929); const s = sim.s;
  assert.equal(expand.check(sim), false);
  const ask = JSON.stringify(s.market.ask);
  d({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 });
  assert.equal(stepState(sim, { tab: null, sel: null }).cur, expand.steps.length - 1, 'ordered row: wait for construction');
  s.speed = 4; until(() => !!s.milestones.first_expansion, 1440 * 3);
  assert.equal(expand.check(sim), true); until(() => curBeat(sim)?.id === 'repair', 10);
  assert.equal(JSON.stringify(s.market.ask), ask, 'asking rents untouched');
});

test('guidance is read-only: evaluating every pricing state writes nothing and keeps the run identical', () => {
  const A = toExpand(777), B = toExpand(777);
  assert.equal(JSON.stringify(A.sim.s), JSON.stringify(B.sim.s), 'twins identical at expand start');
  const leases = JSON.stringify(A.sim.s.leases), ask = JSON.stringify(A.sim.s.market.ask), cash = A.sim.s.cash, flags = JSON.stringify(A.sim.s.tut.flags);
  const uis = [{ tab: null, sel: null }, rents(null), rents('Operating performance'), rents('Asking rents'), { tab: 'build', cat: 'units', sel: null }];
  const before = JSON.stringify(A.sim.s);
  for (const ui of uis) { stepState(A.sim, ui); curBeat(A.sim); }
  assert.equal(JSON.stringify(A.sim.s), before, 'stepState/curBeat do not mutate state');
  A.sim.s.speed = 1; B.sim.s.speed = 1;
  for (let i = 0; i < 1440; i++) { A.tick(); B.tick(); stepState(A.sim, uis[i % uis.length]); }
  assert.equal(JSON.stringify(A.sim.s), JSON.stringify(B.sim.s), 'one game day with guidance polled every minute matches the unpolled twin');
  assert.equal(JSON.stringify(A.sim.s.market.ask), ask, 'asking rents unchanged');
  assert.equal(JSON.stringify(A.sim.s.tut.flags), flags, 'no tutorial flag written');
  assert.equal(curBeat(A.sim).id, 'expand', 'pricing stop alone never advances the beat');
  assert.ok(Object.keys(JSON.parse(leases)).every((k) => !A.sim.s.leases[k] || A.sim.s.leases[k].rent === JSON.parse(leases)[k].rent), 'existing lease rents unchanged');
  assert.ok(typeof cash === 'number');
});

test('save/reload mid-stop restores the same step', () => {
  const { sim } = toExpand(20260929);
  const re = new Sim(JSON.parse(JSON.stringify(sim.s)));
  for (const ui of [{ tab: null, sel: null }, rents(null), rents('Asking rents'), { tab: 'build', cat: 'site', sel: null }]) assert.equal(stepState(re, ui).cur, stepState(sim, ui).cur);
  assert.equal(JSON.stringify(re.s), JSON.stringify(sim.s));
});

console.log(`${passed} Maple pricing stop checks passed`);
