// Campaign Unit 7a: Act IV Beat 13 "Connect a second floor" on the existing interior building.
// Focus: beat order/header, the bounded Hallway unlock, objective completion (a working, accessible, rent-ready upstairs
// unit only), prebuilt-work recognition, affordability fail-forward with live quotes (no fixed prices, no borrowing),
// guidance progression, the tutorial never acting for the player, Pause, save migration and reload.
// Fixture: the ordinary Day 18 Act III break, reproduced by replaying a recorded 54-action coach-follow run (seed 20260929).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { TOOLS } from '../../js/data.js';
import { authoredPlacement } from '../../js/blueprint.js';
import { BEATS, beatIndex, beatHeader, curBeat, stepState, syncTutBeat, tutorialTick, toolUnlocked, installTutorial, upstairsReady } from '../../js/tutorial.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
const clone = (sim) => { const st = JSON.parse(JSON.stringify(sim.s)); const c = new Sim(st); c.ensure(); installTutorial(c); return c; };
const ui = (o = {}) => ({ tab: null, cat: null, sel: null, tool: null, plan: null, verticalReview: null, rend: { view: 'ext', overlay: null }, ...o });
const quiet = (sim) => { sim.events.length = 0; sim.s.convos = sim.s.convos.filter((c) => c.held); };
const steps = (sim, n) => { for (let i = 0; i < n; i++) { sim.step(); quiet(sim); } };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const idle = (sim) => !sim.s.orders.some((o) => o.st === 'construction');

// The ordinary Act III break (Day 18): the recorded actions at their recorded game minutes, then Continue on the break.
function breakFixture() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); sim.events.length = 0; } sim.dispatch(x.a); sim.events.length = 0; }
  until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  return sim;
}
const BASE = breakFixture();
function atVertical() { const sim = clone(BASE); sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim); assert.equal(curBeat(sim).id, 'vertical'); return sim; }
const shellOf = (sim) => sim.objs('shell')[0];
const quote = (sim) => sim.verticalPlan(shellOf(sim).id, { fitout: false });
// The player's real actions for the minimal route (the same as the Day 18 sequencing qualification).
function playRoute(sim) {
  const q = quote(sim), c0 = sim.s.cash;
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: shellOf(sim).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true);
  assert.equal(Math.round((c0 - sim.s.cash) * 100) / 100, q.cost, 'charged exactly the reviewed quote');
  until(sim, () => idle(sim));
  for (const a of [{ tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' }]) {
    const p = sim.plan(a), c = sim.s.cash; assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true, a.tool);
    assert.equal(Math.round((c - sim.s.cash) * 100) / 100, p.cost, `${a.tool} charged its quote`); until(sim, () => idle(sim));
  }
  return q;
}

test('Beat 13 opens Act IV right after the Act III break, before Beat 14 and graduation; no camera focus, no pause', () => {
  const ids = BEATS.map((b) => b.id), v = beatIndex('vertical');
  assert.equal(ids[v - 1], 'actIII_break'); assert.equal(ids[v + 1], 'collections'); assert.equal(ids[v + 2], 'financing'); assert.equal(ids[v + 3], 'actIV_break'); assert.equal(ids[v + 4], 'grad'); assert.equal(v + 5, BEATS.length); // Beats 14-15 and the Act IV break since Units 7b-7c (tact4b, tact4c)
  const b = BEATS[v]; assert.equal(b.act, 'IV'); assert.equal(b.chapter, 'Grow'); assert.equal('focus' in b, false); assert.equal(!!b.pause, false);
  assert.equal(beatHeader(v), 'Act IV · Grow · Beat 13');
  assert.equal(BEATS[v - 1].next, 'Act IV · Grow'); assert.match(BEATS[v - 1].body, /stop before Act IV/);
  assert.match(b.why, /gate → loading → entrance → elevator → upstairs unit/); assert.match(b.why, /not guaranteed to rent/);
});

test('Hallway unlocks exactly at Beat 13; the other vertical tools stay locked until graduation', () => {
  const sim = makeMaple(5), v = beatIndex('vertical');
  for (let i = 0; i < BEATS.length; i++) {
    sim.s.tut.beat = i; delete sim.s.tut.beatId; delete sim.s.tut.beatAt;
    assert.equal(toolUnlocked(sim, 'hall'), i >= v, `hall at ${BEATS[i].id}`);
    for (const k of ['shell1', 'shell2', 'elevator', 'doorWide', 'loading', 'stairs']) if (TOOLS[k]) assert.equal(toolUnlocked(sim, k), false, `${k} at ${BEATS[i].id}`);
  }
  sim.s.tut.on = false; sim.s.tut.done = true; assert.equal(toolUnlocked(sim, 'hall'), true);
});

test('Day 18 break: the beat starts incomplete, shows the live structure-only quote and position, and fits without borrowing', () => {
  const sim = atVertical(), b = curBeat(sim), q = quote(sim), av = sim.financialPosition().available;
  assert.equal(upstairsReady(sim), false); assert.equal(b.check(sim), false);
  assert.ok(b.body.includes(usd(q.cost)), 'live quote'); assert.ok(b.body.includes(usd(av)), 'live available');
  const fit = 2 * TOOLS.hall.costPerCell + TOOLS.light.cost + TOOLS.iu5x10.cost; assert.ok(b.body.includes(usd(fit)));
  assert.ok(av >= q.cost + fit); assert.doesNotMatch(b.body, /short/);
  const st = stepState(sim, ui()); assert.equal(st.done[0], true, 'no rent wait when the quote fits'); assert.equal(st.cur, 1);
  assert.equal(sim.s.speed, 0, 'Pause from the break is kept'); tutorialTick(sim); assert.equal(sim.s.speed, 0, 'Beat 13 never changes speed');
});

test('the full player route completes Beat 13 with real charges only; reserve stays covered; access route is real', () => {
  const sim = atVertical(), c0 = sim.s.cash, q = playRoute(sim);
  until(sim, () => upstairsReady(sim)); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'collections', 'Beat 14 follows (Unit 7b)'); assert.equal(sim.s.speed, 0, 'completing Beat 13 never changes speed');
  const u = sim.objs('unit').find((x) => (x.f || 0) === 1); assert.equal(u.cstate, 'operating'); assert.equal(u.commercial, 'ready'); assert.equal(!!u.blocked, false); assert.deepEqual(u.missing || [], []);
  assert.ok(sim.financialPosition().available > 0, 'reserve and bills still covered');
  const capex = sim.s.ledger.filter((r) => r.cat === 'capex' && r.t >= BASE.s.t).reduce((a, r) => a - r.amt, 0);
  assert.equal(Math.round(capex * 100) / 100, q.cost + 2 * TOOLS.hall.costPerCell + TOOLS.light.cost + TOOLS.iu5x10.cost);
  assert.ok(c0 > sim.s.cash);
});

test('completion is objective: an F1 unit, an unfinished or a blocked upstairs unit does not complete Beat 13', () => {
  const sim = atVertical(), b = curBeat(sim);
  const f1Ready = sim.objs('unit').filter((u) => (u.f || 0) === 0 && u.cstate === 'operating' && !u.lease && u.commercial === 'ready' && !u.blocked);
  assert.ok(f1Ready.length >= 1, 'fixture has ready ground-floor vacancies'); assert.equal(b.check(sim), false, 'ready ground-floor units never complete it');
  playRouteUntilUnitOrdered(sim); assert.equal(b.check(sim), false, 'an upstairs unit under construction does not count');
  until(sim, () => upstairsReady(sim)); assert.equal(b.check(sim), true);
  const el = sim.objs('elevator')[0]; el.cond = 0; sim.markDirty(); sim.rebuild(); sim.ensure();
  const u = sim.objs('unit').find((x) => (x.f || 0) === 1); assert.equal(!!u.blocked, true, 'a broken elevator blocks the upstairs unit'); assert.equal(b.check(sim), false);
});
function playRouteUntilUnitOrdered(sim) {
  const q = quote(sim); assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: shellOf(sim).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  assert.equal(sim.dispatch({ type: 'build', tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }).ok, true); until(sim, () => idle(sim));
  assert.equal(sim.dispatch({ type: 'build', tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 }).ok, true);
  assert.equal(sim.dispatch({ type: 'build', tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' }).ok, true);
}

test('prebuilt work: a working upstairs unit built before Act IV completes Beat 13 on its first tick; an order in progress shows the wait', () => {
  const pre = clone(BASE); playRoute(pre); until(pre, () => upstairsReady(pre));
  pre.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 6 && curBeat(pre).id !== 'collections'; i++) tutorialTick(pre);
  assert.equal(curBeat(pre).id, 'collections', 'already-working upstairs unit is recognised');
  const mid = atVertical(), q = quote(mid);
  assert.equal(mid.dispatch({ type: 'verticalUpgrade', shell: shellOf(mid).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); steps(mid, 60);
  const st = stepState(mid, ui()); assert.deepEqual(st.done.slice(0, 5), [true, true, true, true, true]); assert.equal(st.cur, 5); assert.match(mid.s.tut.beatId, /vertical/);
  assert.match(curBeat(mid).steps[5].t, /new floor and elevator/); assert.equal(curBeat(mid).body.includes('Structure only'), false, 'no stale quote once ordered');
});

test('the full fit-out package also counts, and guidance never blocks a player who chooses it', () => {
  const sim = atVertical(); sim.s.cash = 1e6; const q = sim.verticalPlan(shellOf(sim).id, { fitout: true }); assert.equal(q.ok, true);
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: shellOf(sim).id, fitout: true, stairs: false, stamp: q.stamp }).ok, true);
  const st = stepState(sim, ui({ verticalReview: { shell: shellOf(sim).id, fitout: true } })); assert.equal(st.done[3], true, 'fit-out choice is not forced');
  until(sim, () => upstairsReady(sim), 1440 * 12); assert.equal(curBeat(sim).check(sim), true);
});

test('affordability fail-forward: a short player sees the live gap and a rent wait, never a loan, and the wait ends when the quote fits', () => {
  const sim = atVertical(); const q = quote(sim), fit = 2 * TOOLS.hall.costPerCell + TOOLS.light.cost + TOOLS.iu5x10.cost;
  sim.s.cash -= sim.financialPosition().available - (q.cost + fit) + 2500; // 2,500 short (a test setup on a clone; nothing in play writes cash)
  const b = curBeat(sim), gap = q.cost + fit - sim.financialPosition().available;
  assert.ok(gap > 0); assert.ok(b.body.includes(usd(gap)), 'live gap'); assert.match(b.body, /Let time run/); assert.match(b.body, /do not need to borrow/);
  assert.doesNotMatch(b.body + b.steps.map((x) => x.t + x.d).join(' '), /term loan|credit line|Borrow (now|\$)/i);
  const st = stepState(sim, ui()); assert.equal(st.cur, 0); assert.equal(b.steps[0].run, true); assert.equal(b.steps[0].sel, '#speed [data-v="4"]');
  assert.equal(sim.s.loan.bal, 0); assert.equal(sim.s.debt.length, 0); assert.equal(sim.loanLimit(), 0, 'tutorial loan lock unchanged');
  sim.s.cash += 2600; assert.equal(stepState(sim, ui()).done[0], true, 'continues by itself once the quote fits');
});

test('guidance follows the real UI states: building selected, review open, structure only, Confirm', () => {
  const sim = atVertical(), id = shellOf(sim).id;
  assert.equal(stepState(sim, ui()).cur, 1); assert.equal(curBeat(sim).steps[1].obj(sim), id);
  assert.equal(stepState(sim, ui({ sel: id })).cur, 2);
  assert.equal(stepState(sim, ui({ sel: id, verticalReview: { shell: id, fitout: true } })).cur, 3);
  assert.equal(stepState(sim, ui({ sel: id, verticalReview: { shell: id, fitout: false } })).cur, 4);
  assert.equal(curBeat(sim).steps[2].sel, '[data-a="verticalReview"]'); assert.equal(curBeat(sim).steps[3].sel, '[data-vertical-option="fitout"]'); assert.equal(curBeat(sim).steps[4].sel, '[data-a="verticalConfirm"]');
  const after = clone(sim); playRouteUntilUnitOrdered(after); assert.ok(stepState(after, ui()).cur >= 6);
  // hallway ordered but unfinished: the light and unit steps wait instead of inviting a placement that cannot open
  const w = atVertical(), q = quote(w); assert.equal(w.dispatch({ type: 'verticalUpgrade', shell: shellOf(w).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(w, () => idle(w));
  assert.equal(w.dispatch({ type: 'build', tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }).ok, true);
  const s2 = stepState(w, ui()), cur = curBeat(w).steps[s2.cur]; assert.ok(cur.prereq && cur.prereq(w)?.state === 'ordered', 'waits for the F2 hallway');
});

test('the tutorial never builds, borrows or spends for the player during Beat 13', () => {
  const sim = atVertical(); const real = sim.dispatch.bind(sim); let calls = 0; sim.dispatch = (a) => { calls++; return real(a); };
  const c = sim.s.cash, led = sim.s.ledger.length; for (let i = 0; i < 1440 * 3; i++) { sim.step(); quiet(sim); }
  assert.equal(calls, 0); assert.equal(sim.s.orders.filter((o) => o.st === 'construction').length, 0);
  assert.ok(sim.s.ledger.slice(led).every((r) => !['capex', 'loan'].includes(r.cat)), 'only normal operations moved money'); assert.ok(Number.isFinite(c));
});

test('no fixed prices in the beat: the quote follows the building actually there', () => {
  const src = readFileSync(new URL('../../js/tutorial.js', import.meta.url), 'utf8');
  for (const lit of ['12,470', '12470', '13,035', '13035', '19,101', '19101']) assert.equal(src.includes(lit), false, lit);
  const sim = atVertical(), a = curBeat(sim).body; const sh = shellOf(sim); sh.plannedMaxFloors = 2; // a building already reinforced for two floors needs no reinforcement
  const q2 = quote(sim); assert.ok(q2.cost < quote(atVertical()).cost); assert.ok(curBeat(sim).body.includes(usd(q2.cost))); assert.notEqual(curBeat(sim).body, a);
});

test('save migration: an unfinished save on the Act III-era graduation resumes at the Act III break; older mappings unchanged', () => {
  const t = { on: true, done: false, beat: 15, beatId: 'grad', beatAt: 15, entered: true, flags: { actIII_break: true } }; syncTutBeat(t);
  assert.equal(t.beatId, 'actIII_break'); assert.equal(t.beat, beatIndex('actIII_break')); assert.equal(t.entered, false);
  const sim = makeMaple(9); Object.assign(sim.s.tut, t); tutorialTick(sim); tutorialTick(sim); assert.equal(curBeat(sim).id, 'vertical', 'Continue already given: Act IV starts');
  const d4 = { on: true, done: false, beat: 10, beatId: 'grad', beatAt: 10, entered: true, flags: {} }; syncTutBeat(d4); assert.equal(d4.beatId, 'actII_break');
  const cur = { on: true, done: false, beat: beatIndex('grad'), beatId: 'grad', beatAt: beatIndex('grad'), entered: true, flags: {} }; syncTutBeat(cur); assert.equal(cur.beatId, 'grad', 'current-layout graduation stays');
  const a3 = { on: true, done: false, beat: 13, beatId: 'climate', beatAt: 13, entered: true, flags: {} }; syncTutBeat(a3); assert.equal(a3.beatId, 'climate'); assert.equal(a3.beat, beatIndex('climate'));
  const done = makeMaple(10); done.s.tut = { ...done.s.tut, on: false, done: true, beat: 15, beatId: 'grad', beatAt: 15 }; syncTutBeat(done.s.tut, done.s); assert.equal(done.s.tut.done, true);
});

test('reload mid-Go-Vertical and at the hallway step resumes the same beat, step and outcome', () => {
  const a = atVertical(), q = quote(a); assert.equal(a.dispatch({ type: 'verticalUpgrade', shell: shellOf(a).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); steps(a, 300);
  const r = clone(a); assert.equal(r.s.tut.beatId, 'vertical'); assert.deepEqual(stepState(r, ui()).done, stepState(a, ui()).done);
  for (const x of [a, r]) until(x, () => idle(x)); assert.equal(JSON.stringify(a.s), JSON.stringify(r.s), 'identical after reload');
  const h = clone(a); assert.equal(stepState(h, ui()).cur, 6); assert.equal(curBeat(h).steps[6].t, 'Open <b>Build</b> (F2 hallway)');
  for (const x of [a, h]) { assert.equal(x.dispatch({ type: 'build', tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }).ok, true); until(x, () => idle(x)); }
  assert.equal(JSON.stringify(a.s), JSON.stringify(h.s));
});

test('Use suggested placement gives a valid hallway, light and unit on F2 at each stage of the real route', () => {
  const sim = atVertical(), raw = BEATS[beatIndex('vertical')].steps.filter((x) => x.placement), pick = (tool) => raw.find((x) => x.placement.tool === tool);
  const q = quote(sim); assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: shellOf(sim).id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  for (const tool of ['hall', 'light', 'iu5x10']) {
    const a = authoredPlacement(sim, pick(tool)); assert.ok(a, `${tool} suggestion`); assert.equal(a.f, 1); assert.notEqual(sim.plan(a).status, 'invalid', tool);
    assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true, tool); until(sim, () => idle(sim));
  }
  until(sim, () => upstairsReady(sim)); assert.equal(curBeat(sim).check(sim), true);
});

test('determinism: the same route from the same break gives an identical state', () => {
  const a = atVertical(), b = atVertical(); playRoute(a); playRoute(b); until(a, () => upstairsReady(a)); until(b, () => upstairsReady(b));
  assert.equal(JSON.stringify(a.s), JSON.stringify(b.s));
});

console.log(`${passed} Act IV Beat 13 checks passed`);
