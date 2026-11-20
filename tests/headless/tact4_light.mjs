// Act IV Beat 13 F2 light reach (2026-11-20 fix of the 375 soft-lock): the light step counts only when the simulation's
// lighting map lights the hallway cell the coached Interior 5x10 opens onto (D.lit >= 0.5, the unit-readiness threshold).
// A light that misses, is broken or is too worn to reach keeps the step open with a coach line; a light still being
// installed counts for the light step, the light tool is put away and the Units steps wait for it; a second working
// light continues to a valid suggested unit and a working upstairs unit;
// another hallway layout counts only a lit hallway cell. The coached route is unchanged.
// Fixture: the ordinary Day 18 Act III break, replayed from the recorded coach-follow run (same as tact4).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { curBeat, stepState, tutorialTick, installTutorial, upstairsReady } from '../../js/tutorial.js';
import { BEATS } from '../../js/tutorial.js';

globalThis.innerWidth = 375; globalThis.innerHeight = 667;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const clone = (sim) => { const st = JSON.parse(JSON.stringify(sim.s)); const c = new Sim(st); c.ensure(); installTutorial(c); return c; };
const ui = (o = {}) => ({ tab: null, cat: null, sel: null, tool: null, plan: null, verticalReview: null, rend: { view: 'ext', overlay: null }, ...o });
const quiet = (sim) => { sim.events.length = 0; sim.s.convos = sim.s.convos.filter((c) => c.held); };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const idle = (sim) => !sim.s.orders.some((o) => o.st === 'construction');
function breakFixture() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); sim.events.length = 0; } sim.dispatch(x.a); sim.events.length = 0; }
  until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  return sim;
}
const BASE = breakFixture();
function atVertical() { const sim = clone(BASE); sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim); assert.equal(curBeat(sim).id, 'vertical'); return sim; }
// The player's real actions up to a finished F2 hallway on the coached cells.
function toHallway() {
  const sim = atVertical(), sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false });
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  assert.equal(sim.dispatch({ type: 'build', tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }).ok, true); until(sim, () => idle(sim));
  return sim;
}
const light = (sim, x, y) => { const a = { tool: 'light', a: { x, y }, b: { x, y }, f: 1 }; assert.equal(sim.plan(a).status, 'valid', `light at ${x},${y} is a valid build`); assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true); until(sim, () => idle(sim)); };
const UNIT = { tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' };
const steps = (sim) => curBeat(sim).steps;
const lightPlace = (sim) => steps(sim).findIndex((st) => st.placement?.tool === 'light' && !/Confirm/.test(st.t));
const unitOpen = (sim) => steps(sim).findIndex((st) => /Open <b>Build<\/b> again \(unit\)/.test(st.t));
const armed = (tool) => ui({ tab: 'build', cat: tool === 'light' ? 'security' : 'units', tool });
const LINE = /hallway next to the elevator is still dark/;
const lit = (sim, x, y) => sim.D.lit[1][sim.idx(x, y)] || 0;
const order = (sim, x, y) => { const a = { tool: 'light', a: { x, y }, b: { x, y }, f: 1 }; assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true); for (let i = 0; i < 3; i++) { sim.step(); quiet(sim); } };
const prereqOf = (sim, i = lightPlace(sim)) => { const st = curBeat(sim).steps[i]; return st.prereq ? st.prereq(sim) : null; };
const f2Light = (sim) => sim.objs('light').find((l) => (l.f || 0) === 1);
const rebuild = (sim) => { sim.markDirty(); sim.rebuild(); sim.ensure(); };

test('a light that misses the hallway cell the unit opens onto (the 375 run: 15,8) keeps the light step open', () => {
  const sim = toHallway(); light(sim, 15, 8);
  assert.ok((sim.D.lit[1][sim.idx(17, 5)] || 0) < 0.5, 'hallway cell 17,5 is dark (the cause of the amber unit)');
  assert.equal(sim.plan(UNIT).status, 'incomplete', 'suggested unit would build but not earn');
  const st = stepState(sim, armed('light'));
  assert.equal(st.cur, lightPlace(sim), 'coach stays on Tap the new F2 hallway to light it');
  assert.equal(st.done[steps(sim).findIndex((x) => x.placement?.tool === 'iu5x10')], false, 'the unit placement step is not reached');
});

test('the coach says why and points at the suggested placement; the line is absent before any F2 light', () => {
  const sim = toHallway(); assert.doesNotMatch(steps(sim)[lightPlace(sim)].d, LINE);
  light(sim, 15, 8); const d = steps(sim)[lightPlace(sim)].d;
  assert.match(d, LINE); assert.match(d, /Use suggested placement/); assert.doesNotMatch(d, /\{lightReach\}/);
});

test('a second light on the coached hallway cell continues: suggested unit valid, unit opens, Beat 13 completes', () => {
  const sim = toHallway(); light(sim, 15, 8); light(sim, 17, 6);
  assert.ok(sim.D.lit[1][sim.idx(17, 5)] >= 0.5);
  const st = stepState(sim, armed('light')); assert.ok(st.cur >= unitOpen(sim), 'light group complete'); assert.doesNotMatch(steps(sim)[lightPlace(sim)].d, LINE);
  assert.equal(sim.plan(UNIT).status, 'valid');
  assert.equal(sim.dispatch({ type: 'build', ...UNIT }).ok, true); until(sim, () => upstairsReady(sim)); assert.equal(curBeat(sim).check(sim), true);
});

test('an off-target light that still reaches the cell (the 390 run: 15,4) counts, as before', () => {
  const sim = toHallway(); light(sim, 15, 4);
  assert.ok(sim.D.lit[1][sim.idx(17, 5)] >= 0.5);
  assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim)); assert.equal(sim.plan(UNIT).status, 'valid');
});

test('the coached route (light on 17,6) is unchanged: one light, no extra line, unit valid', () => {
  const sim = toHallway(); light(sim, 17, 6);
  assert.equal(sim.objs('light').filter((l) => (l.f || 0) === 1).length, 1);
  assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim)); assert.doesNotMatch(steps(sim)[lightPlace(sim)].d, LINE);
  assert.equal(sim.plan(UNIT).status, 'valid');
});

test('save and reload with the missed light keeps the light step and the line', () => {
  const sim = toHallway(); light(sim, 15, 8);
  const re = clone(sim); assert.equal(stepState(re, armed('light')).cur, lightPlace(re)); assert.match(steps(re)[lightPlace(re)].d, LINE);
});

test('a light still being installed on the coached cell: the light tool is put away and the Units steps show a wait card, then continue', () => {
  const sim = toHallway(); order(sim, 17, 6);
  assert.equal(f2Light(sim).cstate !== 'operating', true, 'light under construction'); assert.ok(lit(sim, 17, 5) < 0.5, 'not lit until it works');
  const st = stepState(sim, armed('light')), cur = steps(sim)[st.cur];
  assert.ok(st.cur > lightPlace(sim) && st.cur > unitOpen(sim), 'the light group counts the covering light; the coach moves to the Units steps');
  assert.match(cur.sel || '', /^\.cats \[data-v="units"\]$/, 'next raw step is the Units row, so Confirm puts the light tool away (D5)');
  const pre = prereqOf(sim, st.cur); assert.equal(pre && pre.state, 'ordered', 'wait card'); assert.match(pre.t, /Let the new F2 light finish/); assert.match(pre.d, /4x/);
  const away = stepState(sim, ui({ tab: 'build', cat: 'security' })); assert.equal(away.cur, st.cur); assert.equal(prereqOf(sim, away.cur)?.state, 'ordered', 'still waiting with the tool put away');
  const up = steps(sim).findIndex((x) => x.placement?.tool === 'iu5x10'); assert.equal(stepState(sim, armed('iu5x10')).done[up], false, 'the unit placement is not reached while the hallway is dark');
  assert.doesNotMatch(steps(sim)[lightPlace(sim)].d, LINE, 'no dark-hallway line while the covering light is installing');
  assert.equal(sim.objs('light').filter((l) => (l.f || 0) === 1).length, 1);
  until(sim, () => idle(sim)); assert.equal(prereqOf(sim, st.cur), null); assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim)); assert.equal(sim.plan(UNIT).status, 'valid');
});

test('an unfinished light that would not reach the cell gets no wait card: the coach asks for a light that reaches', () => {
  const sim = toHallway(); order(sim, 15, 8);
  const st = stepState(sim, armed('light')); assert.equal(st.cur, lightPlace(sim)); assert.equal(prereqOf(sim, st.cur), null); assert.match(steps(sim)[lightPlace(sim)].d, LINE);
});

test('a broken light on the coached cell (cond below 0.2) does not count, the unit stays unreached, and the line shows', () => {
  const sim = toHallway(); light(sim, 17, 6); assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim));
  f2Light(sim).cond = 0.1; rebuild(sim); // test setup on a clone: wear that ordinary play reaches over time
  assert.ok(lit(sim, 17, 5) < 0.5); assert.equal(sim.plan(UNIT).status, 'incomplete');
  assert.equal(stepState(sim, armed('light')).cur, lightPlace(sim)); assert.match(steps(sim)[lightPlace(sim)].d, LINE);
});

test('a worn light inside the nominal radius whose computed level is below 0.5 does not count (radius alone is not enough)', () => {
  const sim = toHallway(); const r = 3.2, cand = [];
  for (let y = 0; y < 14; y++) for (let x = 10; x < 24; x++) { const d = Math.hypot(x - 17, y - 5); if (d > 2.9 && d <= r && sim.plan({ tool: 'light', a: { x, y }, b: { x, y }, f: 1 }).status === 'valid') cand.push([x, y, d]); }
  assert.ok(cand.length, 'a valid F2 light cell between 2.9 and 3.2 cells from the doorway'); const [lx, ly] = cand[0]; light(sim, lx, ly); const d = cand[0][2];
  assert.ok(d <= 3.2, 'inside the nominal light radius'); assert.ok(lit(sim, 17, 5) >= 0.5, 'a new light there does light the cell');
  assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim));
  f2Light(sim).cond = 0.4; rebuild(sim); assert.ok(lit(sim, 17, 5) < 0.5, 'worn light falls below the threshold');
  assert.equal(sim.plan(UNIT).status, 'incomplete'); assert.equal(stepState(sim, armed('light')).cur, lightPlace(sim));
});

test('an unpowered light on the coached cell (power shed) does not count; restored power counts again', () => {
  const sim = toHallway(); light(sim, 17, 6); const l = f2Light(sim); assert.equal(sim.powerKey(l), 'light', 'hallway lights draw power');
  const base = sim.s.powerBase; sim.s.powerBase = 0; const pw = sim.objs('power').map((p) => [p, p.cstate]); for (const [p] of pw) p.cstate = 'construction'; // test setup on a clone: no supply
  rebuild(sim); sim.step(); quiet(sim); rebuild(sim);
  assert.equal(!!l.unpowered, true, 'light shed'); assert.ok(lit(sim, 17, 5) < 0.5);
  assert.equal(stepState(sim, armed('light')).cur, lightPlace(sim)); assert.match(steps(sim)[lightPlace(sim)].d, LINE);
  sim.s.powerBase = base; for (const [p, c] of pw) p.cstate = c; rebuild(sim); sim.step(); quiet(sim); rebuild(sim);
  assert.equal(!!l.unpowered, false); assert.ok(lit(sim, 17, 5) >= 0.5); assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim));
});

test('another hallway layout counts only a lit hallway cell, never the mere presence of an F2 light', () => {
  const sim = atVertical(), sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false });
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  const alt = [{ a: { x: 17, y: 6 }, b: { x: 17, y: 7 } }, { a: { x: 16, y: 6 }, b: { x: 16, y: 7 } }].find((h) => sim.plan({ tool: 'hall', ...h, f: 1 }).status === 'valid');
  assert.ok(alt, 'an alternate hallway is buildable'); assert.equal(sim.dispatch({ type: 'build', tool: 'hall', ...alt, f: 1 }).ok, true); until(sim, () => idle(sim));
  assert.equal(sim.s.hall[1][sim.idx(17, 5)] ? 1 : 0, 0, 'coached cell is not hallway');
  const hs = []; for (let i = 0; i < sim.s.hall[1].length; i++) if (sim.s.hall[1][i] === 1) hs.push(i);
  const W = sim.s.W, far = []; for (let y = 0; y < sim.s.H && !far.length; y++) for (let x = 0; x < W && !far.length; x++)
    if (hs.every((i) => Math.hypot(i % W - x, Math.floor(i / W) - y) > 3.3) && sim.plan({ tool: 'light', a: { x, y }, b: { x, y }, f: 1 }).status === 'valid') far.push([x, y]);
  assert.ok(far.length, 'a valid F2 light cell out of reach of every hallway cell'); light(sim, far[0][0], far[0][1]);
  assert.ok(!hs.some((i) => sim.D.lit[1][i] >= 0.5)); assert.equal(stepState(sim, armed('light')).cur, lightPlace(sim), 'an F2 light lighting no hallway cell does not count');
  light(sim, alt.a.x, alt.a.y); assert.ok(stepState(sim, armed('light')).cur >= unitOpen(sim), 'a lit alternate hallway counts');
});

console.log(`ALL PASS: ${passed} Act IV light-reach checks`);
