// 375 "Use suggested placement" visibility (2026-11-20): in a placement review the coach's recovery button renders
// directly after the main status line, ahead of the optional rows (more blockers, Nearest buildable spot / Move there,
// Options & guidance, payback details), so the short review scroller never pushes it under the cash lines. The button keeps
// its conditions (only when the coach has a suggested plan), markup and behavior; free-play reviews still have none.
// Real planning and production renderActionBar markup on disposable Maple fixtures; no rendered-browser claim.
import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';
import { BEATS } from '../../js/tutorial.js';

let checks = 0;
const test = (name, fn) => { fn(); checks++; console.log('PASS ' + name); };
function uiFor(sim, tool, suggested = true) {
  const u = Object.create(UI.prototype), boxes = {};
  u.g = { sim, audio: { unlock() {}, play() {} }, rend: { view: 'ext', setPreview() {}, setSelection() {} } };
  u.title = false; u.tool = tool; u.buildRotation = 0;
  u.root = { classList: { add() {}, remove() {}, contains() { return false; } }, querySelectorAll() { return []; } };
  u.$ = (id) => boxes[id] ||= { innerHTML: '', firstChild: null }; u.canRush = () => false;
  u.renderSheet = () => {}; u.renderTut = () => {}; u.upgradeHtml = () => ''; u.spendingHtml = () => ''; u.toast = () => {}; u.sfx = () => {};
  u.currentBlueprintPlan = () => (suggested ? { tool, a: { x: 0, y: 0 }, b: { x: 0, y: 0 } } : null);
  return { u, boxes };
}
const click = (u, a) => u.onClick({ target: { closest: () => ({ dataset: { a } }) } });
const arm = (u, a, b = a, rotation = 0) => { u.planArgs = { a: { ...a }, b: { ...b } }; u.buildRotation = rotation; u.replan(); };
const BTN = 'data-a="suggestPlacement"';
const OPTIONAL = ['near-valid', 'unit-options', 'build-details', '<details class="note">', 'review-commitment', 'class="bot"'];
function assertOrder(html, label) {
  const s = html.indexOf('<div class="status '); assert.ok(s >= 0, label + ': main status line');
  const end = html.indexOf('</div>', s) + 6, b = html.indexOf(BTN);
  assert.ok(b > 0, label + ': button present'); assert.equal(html.lastIndexOf(BTN), b, label + ': one button');
  assert.ok(html.startsWith('<button class="btn sm', end) && html.indexOf('>', end) > b, label + ': button is the first thing after the main status line');
  for (const k of OPTIONAL) { const i = html.indexOf(k); if (i >= 0) assert.ok(i > b, `${label}: ${k} comes after the button`); }
  assert.ok(html.indexOf('class="review-body"') < b && b < html.indexOf('review-commitment'), label + ': still inside the review body, above the cash lines');
}
const maple = () => { const sim = makeMaple(4242); sim.s.tut = { on: false, done: true }; sim.s.cash = 60000; sim.s.speed = 0; return sim; };

test('red (invalid with Nearest buildable spot), amber (after Move there) and green reviews put the button first', () => {
  const sim = maple(), { u, boxes } = uiFor(sim, 'iu5x5'); arm(u, { x: 16, y: 5 });
  assert.equal(u.plan.status, 'invalid'); assert.match(boxes.abar.innerHTML, /near-valid/); assertOrder(boxes.abar.innerHTML, 'red');
  click(u, 'snapPlacement'); assert.equal(u.plan.status, 'incomplete'); assertOrder(boxes.abar.innerHTML, 'amber');
  const g = uiFor(maple(), 'du10x10'); let ok = null;
  for (let x = 2; x < 40 && !ok; x++) for (let y = 2; y < 40 && !ok; y++) { arm(g.u, { x, y }); if (g.u.plan.status === 'valid') ok = [x, y]; }
  assert.ok(ok, 'a green drive-up spot exists'); assertOrder(g.boxes.abar.innerHTML, 'green');
});

test('a red review with several blockers keeps the button above the "+N more" details', () => {
  const sim = maple(), { u, boxes } = uiFor(sim, 'du10x10'); let hit = false;
  for (let x = 0; x < 40 && !hit; x++) for (let y = 0; y < 40 && !hit; y++) { arm(u, { x, y }); hit = u.plan.status === 'invalid' && u.plan.reasons.length > 1; }
  assert.ok(hit, 'a multi-blocker spot exists'); assert.match(boxes.abar.innerHTML, /more placement blocker/); assertOrder(boxes.abar.innerHTML, 'multi-blocker');
});

test('Act I tutorial expand step, with the real coach plan: idle bar, green suggestion and an off-target red review', () => {
  const sim = makeMaple(4242); sim.s.tut = { on: true, beat: BEATS.findIndex((b) => b.id === 'expand'), flags: {}, done: false };
  const { u, boxes } = uiFor(sim, 'du10x10'); delete u.currentBlueprintPlan; u.tab = 'build'; u.cat = 'units'; u.buildRotation = null;
  u.setView = (v) => (u.rend.view = v); u.showBlueprintTarget = () => {}; u.plan = null; u.renderActionBar();
  assert.match(boxes.abar.innerHTML, new RegExp(BTN), 'idle bar keeps the button'); click(u, 'suggestPlacement');
  assert.equal(u.plan.status, 'valid'); assertOrder(boxes.abar.innerHTML, 'tutorial green');
  arm(u, { x: 1, y: 1 }); assert.notEqual(u.plan.status, 'valid'); assertOrder(boxes.abar.innerHTML, 'tutorial off target');
  click(u, 'suggestPlacement'); assert.equal(u.plan.status, 'valid', 'the button still restores the coached placement');
});

test('conditions and markup are unchanged: no button without a coach plan, suggest-match kept for compact recommendations', () => {
  const sim = maple(), f = uiFor(sim, 'iu5x5', false); arm(f.u, { x: 16, y: 5 }); assert.doesNotMatch(f.boxes.abar.innerHTML, new RegExp(BTN), 'free play has no button');
  const r = uiFor(maple(), 'iu5x5'); r.u.recoCompact = true; r.u.planIsSuggestion = () => true; arm(r.u, { x: 16, y: 5 });
  assert.match(r.boxes.abar.innerHTML, /class="btn sm suggest-match" data-a="suggestPlacement"/); assertOrder(r.boxes.abar.innerHTML, 'compact');
  r.u.planIsSuggestion = () => false; r.u.replan(); assert.match(r.boxes.abar.innerHTML, /class="btn sm" data-a="suggestPlacement"/);
});

test('rendering the review changes nothing in the game state and keeps Pause', () => {
  const sim = maple(), before = JSON.stringify(sim.s), { u } = uiFor(sim, 'iu5x5'); arm(u, { x: 16, y: 5 }); click(u, 'snapPlacement');
  assert.equal(JSON.stringify(sim.s), before); assert.equal(sim.s.speed, 0);
});

console.log(`ALL PASS: ${checks} suggested-placement order checks`);
