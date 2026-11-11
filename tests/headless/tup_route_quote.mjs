// Campaign Unit 7c: upRouteQuote, the read-only current-state quote of the unbuilt upper-floor (`up` blueprint) route that
// Act IV Beat 15 prices. It must equal an independent stepped dry run (each step ordered on a copy, construction run in
// game minutes, actual charges summed: the Act IV probe method) on several states, never touch the real state, be
// deterministic, and say honestly when no route can be planned. $19,101 is the pinned fixture oracle only.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { curBeat, tutorialTick, installTutorial } from '../../js/tutorial.js';
import { upRouteQuote, verticalLayout, verticalDone, UP_ROUTE_STEPS } from '../../js/blueprint.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const quiet = (sim) => { sim.events.length = 0; };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const fromJSON = (j) => { const c = new Sim(JSON.parse(j)); c.ensure(); installTutorial(c); return c; };
const idle = (sim) => !sim.s.orders.some((o) => o.st === 'construction');

// Independent stepped dry run (the Act IV probe method): real time passes on the copy between steps that need it.
function steppedDryRun(state) {
  const c = fromJSON(state), cs = c.s; cs.cash = 1e7; cs.lesson = { id: 'up', idMark: cs.nextId, built: [], flags: {}, entered: false, synthetic: true };
  let lay = verticalLayout(c); if (!lay || lay.blocked) return { ok: false };
  const doneKey = { light: 'lights', light2: 'lights' }, rows = [];
  const waitFor = (fn, max = 40000) => { for (let i = 0; i < max && !fn(); i++) { c.step(); c.events.length = 0; cs.convos.length = 0; } return fn(); };
  for (const k of ['aisle', 'shell2', 'hall', 'doorWide', 'loading', 'hall2', 'elevator', 'light', 'light2', 'units']) {
    if (!['shell2', 'light', 'light2'].includes(k) && verticalDone(c, doneKey[k] || k)) continue;
    lay = verticalLayout(c); let pl = c.plan(lay.plans[k]);
    if (pl.status === 'invalid') { waitFor(() => idle(c)); lay = verticalLayout(c); pl = c.plan(lay.plans[k]); }
    const cash0 = cs.cash, r = c.dispatch({ type: 'build', ...lay.plans[k] }); assert.equal(r.ok, true, k + ': ' + r.msg);
    rows.push({ step: k, cost: Math.round((cash0 - cs.cash) * 100) / 100 });
  }
  return { ok: true, rows, total: Math.round(rows.reduce((a, x) => a + x.cost, 0) * 100) / 100 };
}
function breakState(mirror = false) {
  const sim = makeMaple(TRACE.seed, { mirror }); installTutorial(sim); const s = sim.s;
  if (!mirror) for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); quiet(sim); } sim.dispatch(x.a); quiet(sim); }
  if (!mirror) until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  return sim;
}
const D18 = breakState();
function afterBeat13() {
  const sim = fromJSON(JSON.stringify(D18.s)), s = sim.s;
  sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim);
  const sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false });
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  for (const a of [{ tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' }]) { assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true); until(sim, () => idle(sim)); }
  until(sim, () => curBeat(sim).id === 'collections'); s.speed = 0; return sim;
}
const A13 = afterBeat13();
function postGrad() { const sim = fromJSON(JSON.stringify(A13.s)); Object.assign(sim.s.tut, { done: true, on: false }); delete sim.s.tut.beatId; delete sim.s.tut.beatAt; for (let i = 0; i < 1440 * 3; i++) { sim.s.speed = 4; sim.step(); quiet(sim); } return sim; }
const STATES = { 'Day 18 Act III break': D18, 'after Beat 13': A13, 'mirrored Maple': breakState(true), 'post-graduation': postGrad() };

test('parity: upRouteQuote equals an independent stepped dry run (actual charges) on four states', () => {
  for (const [name, sim] of Object.entries(STATES)) {
    const q = upRouteQuote(sim), d = steppedDryRun(JSON.stringify(sim.s));
    assert.equal(q.ok, true, name); assert.equal(d.ok, true, name);
    assert.deepEqual(q.rows.map((r) => [r.step, r.cost]), d.rows.map((r) => [r.step, r.cost]), name); assert.equal(q.total, d.total, name);
    assert.ok(q.rows.every((r) => UP_ROUTE_STEPS.includes(r.step)) && q.total > 0, name);
  }
});
test('read-only and deterministic: the real state is byte-identical after quoting, and repeat quotes agree', () => {
  for (const [name, sim] of Object.entries(STATES)) {
    const before = JSON.stringify(sim.s), ev = sim.events.length, q1 = upRouteQuote(sim), q2 = upRouteQuote(sim);
    assert.equal(JSON.stringify(sim.s), before, name); assert.equal(sim.events.length, ev, name); assert.deepEqual(q1, q2, name);
    assert.ok(!sim.s.lesson, name + ': no lesson marker on the real state');
  }
});
test('fixture oracle: $19,101 at the pinned Day 18 break and after Beat 13 (6 upstairs 5x5, $7.20 a day, $450 asking in total)', () => {
  for (const sim of [D18, A13]) { const q = upRouteQuote(sim); assert.equal(q.total, 19101); assert.equal(q.dailyCost, 7.2); assert.equal(q.units.length, 6); assert.ok(q.units.every((u) => u.size === '5x5')); assert.equal(q.askRoll, 450); }
  assert.notEqual(upRouteQuote(STATES['post-graduation']).total, undefined);
});
test('no hardcoded quote in source', () => {
  for (const f of ['../../js/blueprint.js', '../../js/tutorial.js', '../../js/ui.js']) assert.doesNotMatch(readFileSync(new URL(f, import.meta.url), 'utf8'), /19,?101/);
});
test('blocked: with no room for the two-floor building the quote says so and charges nothing', () => {
  const sim = fromJSON(JSON.stringify(D18.s)); const P = sim.s.parcel; Object.assign(P, { x1: P.x0 + 6, y1: P.y0 + 6 }); sim.ensure();
  const before = JSON.stringify(sim.s), q = upRouteQuote(sim);
  assert.equal(q.ok, false); assert.ok(q.reason && q.reason.length > 10); assert.equal(JSON.stringify(sim.s), before);
});
console.log(`${passed} upper-floor route quote checks passed`);
