// Campaign Unit 7a-r1: what Beat 13 actually renders. Phone coach cards hide beat bodies (`.tut .intro`) and the whole card
// while a modal is open, so (F1) the Go Vertical review must show the current Beat 13 step itself, with a ring on the control
// it names, and (F2) the live structure-only quote, available funds and any shortfall must be in the rendered step text.
// Production renderTut()/showVertical() markup on the ordinary Day 18 Act III break (recorded 54-action replay).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { TOOLS } from '../../js/data.js';
import { UI } from '../../js/ui.js';
import { curBeat, stepState, tutorialTick, installTutorial, verticalReviewGuide, beatIndex } from '../../js/tutorial.js';

globalThis.innerWidth = 375; globalThis.innerHeight = 667;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const CSS = readFileSync(new URL('../../css/game.css', import.meta.url), 'utf8');
const usd = (v) => '$' + Math.round(v).toLocaleString('en-US');
const plain = (h) => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ');
function breakState() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); sim.events.length = 0; } sim.dispatch(x.a); sim.events.length = 0; }
  for (let i = 0; i < 2000 && !(s.tut.beatId === 'actIII_break' && s.tut.entered); i++) { sim.step(); sim.events.length = 0; }
  assert.equal(s.tut.beatId, 'actIII_break'); return JSON.stringify(s);
}
const BASE = breakState();
function atVertical(cashDelta = 0) {
  const st = JSON.parse(BASE); st.cash += cashDelta; const sim = new Sim(st); sim.ensure(); installTutorial(sim);
  sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'vertical'); sim.events.length = 0; return sim;
}
// The production UI with the DOM replaced by string boxes (no layout here; the browser walk checks geometry).
function makeUI(sim) {
  const boxes = { tut: { innerHTML: '' }, modal: { innerHTML: '', get firstChild() { return this.innerHTML ? {} : null; } } };
  const ui = Object.create(UI.prototype);
  ui.g = { sim, audio: { unlock() {}, play() {} }, rend: { setFocus() {}, setSelection() {}, setPreview() {}, setView(v) { this.view = v; }, view: 'ext', lookAt() {} } };
  ui.title = false; ui.tutMin = true; ui.tutWhy = false; ui.toasts = []; ui.tab = null; ui.sel = null; ui.tool = null; ui.plan = null;
  ui.verticalReview = null; ui.popupBlocks = new Set();
  ui.$ = (id) => boxes[id] || { innerHTML: '', querySelector: () => null, firstChild: null };
  ui.root = { querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {}, remove() {}, contains() { return false; } } };
  for (const k of ['sfx', 'renderSheet', 'renderActionBar', 'syncFloorUi', 'currentBlueprintPlan']) ui[k] = () => null;
  ui.resolveStep = (st) => st; ui.phone = () => true;
  return { ui, boxes };
}
const live = (sim) => { const sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false }); return { q, av: sim.financialPosition().available, fit: 2 * TOOLS.hall.costPerCell + TOOLS.light.cost + TOOLS.iu5x10.cost, sh }; };
const curText = (html) => { const m = html.match(/<li class="cur">[\s\S]*?<span class="tx">([\s\S]*?)(?:<details|<\/span><\/li>)/); assert.ok(m, 'current step rendered'); return m[1]; };

test('F2: the collapsed Beat 13 card shows the live structure-only quote, fit-out estimate and available funds in the step text', () => {
  const sim = atVertical(), { ui, boxes } = makeUI(sim), L = live(sim); ui.renderTut(true);
  const html = boxes.tut.innerHTML, tx = curText(html);
  assert.match(html, /class="tut min/); assert.match(plain(tx), /Tap the interior building/);
  for (const v of [L.q.cost, L.fit, L.av]) assert.ok(tx.includes(usd(v)), `${usd(v)} in the rendered step title`);
  assert.doesNotMatch(tx, /short/); assert.ok(L.av >= L.q.cost + L.fit);
  // The step title is what the collapsed phone card shows; the beat body is hidden on non-final cards.
  assert.match(CSS, /\.tut \.intro, \.tut \.prog \{ display: none; \}/); assert.doesNotMatch(CSS, /\.tut-money[^{]*\{[^}]*display:\s*none/);
});

test('F2 low cash: the rent wait shows the live gap in its title, updates as rent arrives, and never mentions borrowing', () => {
  const sim = atVertical(-3000), { ui, boxes } = makeUI(sim); ui.renderTut(true);
  assert.equal(stepState(sim, ui).cur, 0);
  const L = live(sim), gap = L.q.cost + L.fit - L.av; assert.ok(gap > 0);
  let tx = curText(boxes.tut.innerHTML);
  assert.match(plain(tx), /Let rent cover the new floor/);
  for (const v of [L.q.cost, L.av]) assert.ok(tx.includes(usd(v))); assert.ok(tx.includes(`${usd(gap)} short`), 'live gap');
  assert.doesNotMatch(boxes.tut.innerHTML, /loan|credit line/i); assert.match(boxes.tut.innerHTML, /You do not need to borrow/);
  assert.equal(sim.loanLimit(), 0);
  // Rent arrives: the same card re-renders with the new figures (no fixed price, no stale text).
  const before = boxes.tut.innerHTML; sim.s.speed = 4;
  let i = 0; while (live(sim).av === L.av && i++ < 1440 * 5) { sim.step(); sim.events.length = 0; sim.s.convos = sim.s.convos.filter((c) => c.held); }
  ui.renderTut(false); tx = curText(boxes.tut.innerHTML); const L2 = live(sim);
  assert.notEqual(boxes.tut.innerHTML, before, 'card updated without a step change');
  if (stepState(sim, ui).cur === 0) assert.ok(tx.includes(usd(L2.av)) && tx.includes(`${usd(L2.q.cost + L2.fit - L2.av)} short`));
});

test('F1: the Go Vertical review shows Beat 13’s current step and rings the structure-only option, then Confirm', () => {
  const sim = atVertical(), { ui, boxes } = makeUI(sim), L = live(sim);
  ui.showVertical(L.sh.id); let html = boxes.modal.innerHTML;
  assert.equal(stepState(sim, ui).cur, beatIndex('vertical') >= 0 ? 3 : -1);
  const coach = html.match(/<div class="vr-coach" data-qa="vr-coach" role="status">([\s\S]*?)<\/div><div class="vr-body">/); assert.ok(coach, 'coach in the review, outside the scrolling body');
  assert.match(plain(coach[1]), /Act IV · Grow · Beat 13 · Step 4 of 22/); assert.match(plain(coach[1]), /Choose structure only/); assert.match(plain(coach[1]), /Untick Copy this floor’s unit layout and lighting/);
  assert.ok(coach[1].includes(usd(L.q.cost)) && coach[1].includes(usd(L.av)), 'live figures in the review coach');
  assert.match(html, /<label class="vr-opt vr-guide"><input type="checkbox" data-vertical-option="fitout"/); assert.doesNotMatch(html, /btn pri vr-guide/);
  // The player unticks: the review re-renders on the Confirm step.
  ui.showVertical(L.sh.id, { ...ui.verticalReview, fitout: false }); html = boxes.modal.innerHTML;
  assert.equal(stepState(sim, ui).cur, 4);
  assert.match(plain(html.match(/<div class="vr-coach"[\s\S]*?<\/div><div class="vr-body">/)[0]), /Step 5 of 22 ?Tap Confirm/);
  assert.match(html, new RegExp(`<button class="btn pri vr-guide" data-a="verticalConfirm" data-qa="vr-confirm" >Confirm · \\${usd(L.q.cost)}</button>`));
  assert.doesNotMatch(html, /vr-opt vr-guide/);
  assert.equal(sim.s.cash, JSON.parse(BASE).cash, 'reviewing charges nothing');
});

test('F1 is bounded: no review coach or ring outside Beat 13, after graduation, or once the floor is ordered', () => {
  const sim = atVertical(), L = live(sim);
  const off = (mut) => { const st = JSON.parse(JSON.stringify(sim.s)); const c = new Sim(st); c.ensure(); installTutorial(c); mut(c); const { ui, boxes } = makeUI(c);
    ui.showVertical(c.objs('shell')[0].id); return { html: boxes.modal.innerHTML, g: verticalReviewGuide(c, ui) }; };
  for (const [name, mut] of [['graduated', (c) => { c.s.tut.on = false; c.s.tut.done = true; }], ['Act III beat', (c) => { c.s.tut.beat = beatIndex('climate'); c.s.tut.beatId = 'climate'; c.s.tut.beatAt = c.s.tut.beat; }]]) {
    const r = off(mut); assert.equal(r.g, null, name); assert.doesNotMatch(r.html, /vr-coach|vr-guide/, name);
  }
  // The modal still hides the phone coach card and the ring stays off in modals (unchanged behaviour elsewhere).
  assert.match(CSS, /#ui:has\(\.modal-bg\) #tut \{ display:none; \}/);
  const { ui } = makeUI(sim); ui.guideStep = { sel: '[data-a="verticalConfirm"]' }; ui.$ = (id) => (id === 'modal' ? { firstChild: {} } : { firstChild: null }); assert.equal(ui.guideTarget(), null);
  // Once the floor is ordered the money tag is gone (nothing to quote) and Beat 13 moves on.
  const q = L.q; assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: L.sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true);
  const { ui: u2, boxes: b2 } = makeUI(sim); u2.renderTut(true); assert.doesNotMatch(b2.tut.innerHTML, /tut-money/); assert.equal(stepState(sim, u2).cur, 5);
});

test('no fixed prices: the rendered figures follow the live quote when the building is already reinforced', () => {
  const sim = atVertical(), L = live(sim), sh = L.sh; sh.plannedMaxFloors = 2; // already reinforced for two floors: no reinforcement line
  const L2 = live(sim), { ui, boxes } = makeUI(sim); ui.renderTut(true);
  assert.ok(curText(boxes.tut.innerHTML).includes(usd(L2.q.cost)));
  assert.ok(L2.q.cost < L.q.cost, 'cheaper live quote'); assert.ok(!curText(boxes.tut.innerHTML).includes(usd(L.q.cost)));
  assert.doesNotMatch(readFileSync(new URL('../../js/tutorial.js', import.meta.url), 'utf8'), /12,?470|13,?035|19,?101/);
});
test('D1: on a floor view, "Tap the interior building" first asks for EXT (ring on EXT, live figures kept); on EXT the map step is unchanged', () => {
  const sim = atVertical(), { ui, boxes } = makeUI(sim), L = live(sim); ui.resolveStep = UI.prototype.resolveStep;
  assert.equal(stepState(sim, ui).cur, 1);
  const raw = curBeat(sim).steps[1]; assert.equal(raw.view, 'ext');
  for (const v of [0, 1]) { // F1 (the natural view at the end of Act III) and F2
    ui.g.rend.view = v; const st = ui.resolveStep(raw);
    assert.equal(st.redirect, 'view'); assert.equal(st.sel, '#floors [data-v="ext"]'); assert.equal(st.obj, undefined, 'no map ring on the building centre');
    assert.match(st.t, /Switch to <b>EXT<\/b>/); assert.match(st.d, /inside a floor/);
    ui.renderTut(true); const tx = curText(boxes.tut.innerHTML);
    assert.match(plain(tx), /Switch to EXT/); assert.ok(tx.includes(usd(L.q.cost)) && tx.includes(usd(L.av)), 'live figures still on the card');
    ui.guideStep = st; const el = { getClientRects: () => [1] }; ui.guideVisible = () => true; ui.root = { ...ui.root, querySelector: (q) => (q === '#floors [data-v="ext"]' ? el : null) };
    const g = ui.guideTarget(); assert.ok(g && g.el === el, 'ring on EXT'); assert.equal(g.lbl, 'Exterior view');
  }
  // The player taps EXT (the real control action): the step is the map step again, ringed on the building.
  ui.g.rend.view = 'ext';
  const st2 = ui.resolveStep(raw); assert.equal(st2.redirect, undefined); assert.equal(st2.sel, undefined); assert.equal(typeof st2.obj, 'function');
  assert.equal(stepState(sim, ui).cur, 1, 'switching view alone does not complete the step');
  ui.sel = L.sh.id; assert.equal(stepState(sim, ui).cur, 2, 'selecting the building completes it');
  // Selecting the building another way while on F1 (a bare floor cell) also completes it: the redirect never blocks progress.
  ui.sel = null; ui.g.rend.view = 0; assert.equal(stepState(sim, ui).cur, 1); ui.sel = L.sh.id; assert.equal(stepState(sim, ui).cur, 2);
  // Bounded: no other Beat 13 step carries the view requirement, so the F1/F2 hallway, unit and light steps are unchanged.
  assert.deepEqual(curBeat(sim).steps.map((x, i) => x.view ? i : -1).filter((i) => i >= 0), [1]);
  assert.equal(sim.s.cash, JSON.parse(BASE).cash, 'nothing charged'); assert.equal(sim.s.speed, 0, 'no time change');
});
console.log(`${passed} Act IV Beat 13 rendered checks passed`);
