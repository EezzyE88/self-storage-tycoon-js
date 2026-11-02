// Tutorial ring while the panel section menu ("Choose section") is open, and the menu's reachability on short screens.
// Native UI methods (guideTarget, resolveStep, renderSheet) over a stubbed DOM; layout facts are asserted from the shipped
// stylesheet source. Real rendered layout/taps are covered by the Playwright reruns, not here. Not physical Safari.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';
import { BEATS, LESSONS, stepState, curBeat } from '../../js/tutorial.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const stepWhere = (re) => [...BEATS, ...LESSONS].flatMap((b) => b.steps).find((st) => re.test(st.sel || ''));
const pricing = BEATS.find((b) => b.id === 'pricing').steps[1];
const hire = stepWhere(/"role":"porter"/), overlay = stepWhere(/data-a="overlay"/), collections = stepWhere(/^\.ladder$/);
const PICKER = '.sheet [data-section-picker]';

// A stub root whose elements are resolved by the exact selectors the production code asks for.
function fixture({ tab = 'business', menu = null, step = pricing, controlVisible = false, optionVisible = true, available = ['Asking rents', 'Hire capacity', 'Overlays', 'Collections'] } = {}) {
  const sim = makeMaple(11), ui = Object.create(UI.prototype); sim.s.tut = { ...sim.s.tut, on: true };
  const picker = { id: 'picker', visible: true, disabled: false };
  const control = { id: 'control', visible: controlVisible };
  const options = available.map((v) => ({ id: 'opt:' + v, dataset: { a: 'section', v }, visible: optionVisible }));
  const reveals = [];
  ui.g = { sim, audio: { unlock() {}, play() {} }, rend: { view: 0, setSelection() {}, setView() {}, setOverlay() {}, setPreview() {} } };
  ui.title = false; ui.modalOpen = () => false; ui.tab = tab; ui.sectionMenuKey = menu; ui.sel = null; ui.tool = null;
  ui.guideStep = step; ui.guideKey = 'k';
  ui.root = {
    querySelector: (s) => (s === PICKER ? picker : s === step.sel ? control : null),
    querySelectorAll: (s) => (s === '.sheet [data-section-menu] [data-a="section"]' && menu ? options : []),
  };
  ui.guideVisible = (el) => !!el && el.visible !== false; ui.revealedKey = 'k';
  ui.revealGuideEl = (el) => { reveals.push(el.id); if (el.reveal) { el.visible = true; return true; } return false; };
  return { ui, sim, picker, control, options, reveals };
}
const ringOn = (ui) => ui.guideTarget();

test('Choose Pricing: menu closed keeps the ring on the selector (the tap that opens it)', () => {
  const f = fixture({ menu: null });
  const t = ringOn(f.ui); assert.equal(t.el, f.picker); assert.equal(t.lbl, 'Choose Pricing');
});
test('Choose Pricing: menu open moves the ring to the Pricing option, never the selector', () => {
  const f = fixture({ menu: 'business' });
  const t = ringOn(f.ui); assert.equal(t.el.id, 'opt:Asking rents'); assert.equal(t.el.dataset.v, 'Asking rents'); assert.equal(t.lbl, 'Tap Pricing'); assert.notEqual(t.el, f.picker);
});
test('menu open for another tab, or no option rendered, or no pointer-safe option: falls back to the selector ring', () => {
  assert.equal(ringOn(fixture({ tab: 'business', menu: 'operate' }).ui).el.id, 'picker');
  assert.equal(ringOn(fixture({ menu: 'business', available: ['Bills'] }).ui).el.id, 'picker');
  const f = fixture({ menu: 'business', optionVisible: false }); assert.equal(ringOn(f.ui).el.id, 'picker'); assert.deepEqual(f.reveals, ['opt:Asking rents'], 'tried to scroll the option into view first');
});
test('a menu option scrolled out of a short sheet is revealed and then ringed', () => {
  const f = fixture({ menu: 'business' }); f.options[0].visible = false; f.options[0].reveal = true;
  const t = ringOn(f.ui); assert.equal(t.el.id, 'opt:Asking rents'); assert.deepEqual(f.reveals, ['opt:Asking rents']);
});
test('shared mechanism: Hire, Overlays and Collections steps ring their menu option while the menu is open', () => {
  for (const [step, v, lbl, tab] of [[hire, 'Hire capacity', 'Tap Hire', 'operate'], [overlay, 'Overlays', 'Tap Overlays', 'operate'], [collections, 'Collections', 'Tap Collections', 'business']]) {
    assert.ok(step, 'tutorial step exists: ' + v);
    const open = fixture({ tab, menu: tab, step }), t = ringOn(open.ui);
    assert.equal(t.el.dataset.v, v); assert.equal(t.lbl, lbl);
    const redirected = fixture({ tab, menu: tab, step: { ...step, sel: PICKER, redirect: 'section', section: { operate: { 'Hire capacity': ['operate', v, 'Hire'], Overlays: ['operate', v, 'Overlays'] }, business: { Collections: ['business', v, 'Collections'] } }[tab][v] } });
    assert.equal(ringOn(redirected.ui).el.dataset.v, v, 'redirected (selector) form of the step also rings the option');
    assert.equal(ringOn(fixture({ tab, menu: null, step: { ...step, sel: PICKER, redirect: 'section', section: [tab, v, lbl] } }).ui).el.id, 'picker', 'menu closed: selector');
  }
});
test('real control already on screen keeps its own ring even if the menu state is set', () => {
  const f = fixture({ tab: 'operate', menu: 'operate', step: hire, controlVisible: true });
  assert.equal(ringOn(f.ui).el, f.control);
});
test('ring logic never writes game state', () => {
  const f = fixture({ menu: 'business' }); const before = JSON.stringify(f.sim.s);
  for (let i = 0; i < 50; i++) { ringOn(f.ui); stepState(f.sim, { tab: 'business', sel: null, sectionChoice: null }); }
  assert.equal(JSON.stringify(f.sim.s), before);
});
test('tutorial step is unchanged apart from naming its section: trigger, order, selector and done() intact', () => {
  assert.deepEqual(pricing.section, ['business', 'Asking rents', 'Pricing']); assert.equal(pricing.sel, PICKER); assert.equal(pricing.lbl, 'Choose Pricing');
  // Campaign Unit 4: the Pricing stop moved out of `expand` into its own Beat 5 (`pricing`); the step itself is unchanged.
  const beat = BEATS.find((b) => b.id === 'pricing'); assert.equal(BEATS.indexOf(beat), 4); assert.equal(beat.steps.length, 3);
  assert.equal(BEATS.find((b) => b.id === 'expand').steps.length, 6, 'expand keeps only its build steps');
  const sim = makeMaple(20260929); sim.s.tut.beat = 4;
  assert.equal(curBeat(sim).id, 'pricing'); assert.equal(stepState(sim, { tab: 'business', sel: null, sectionChoice: { tab: 'business', label: 'Asking rents' } }).cur, 2);
  assert.equal(beat.check(sim), false); sim.s.tut.flags.pricingSeen = true; sim.s.tut.flags.pricingAck = true; assert.equal(beat.check(sim), true);
});
test('step section values are real menu options in the production Business and Operate panels', () => {
  for (const [tab, wanted] of [['business', ['Asking rents', 'Collections']], ['operate', ['Hire capacity', 'Overlays']]]) {
    const sim = makeMaple(32); sim.s.tut = { on: false, done: true, flags: {} }; let html = '';
    const ui = Object.create(UI.prototype), box = { querySelector: () => null, querySelectorAll: () => [], firstChild: null };
    Object.defineProperty(box, 'innerHTML', { get: () => html, set: (v) => { html = v; box.firstChild = v ? { classList: { add() {} } } : null; } });
    ui.g = { sim, company: null, audio: { unlock() {}, play() {} }, rend: { view: 0, setSelection() {}, setView() {}, setOverlay() {}, setPreview() {} } };
    ui.tab = tab; ui.sel = null; ui.sheetTall = true; ui.$ = () => box; ui.root = { querySelector: () => null, querySelectorAll: () => [] }; ui.sfx = () => {}; ui.syncFeedbackProperty = () => {}; ui.syncFloorUi = () => {};
    ui.renderSheet(true); ui.onClick({ target: { closest: () => ({ dataset: { a: 'sectionMenu' } }) } });
    const menuHtml = html.slice(html.indexOf('data-section-menu'), html.indexOf('</nav>', html.indexOf('data-section-menu')));
    for (const v of wanted) assert.match(menuHtml, new RegExp(`data-a="section" data-v="${v}"`), `${tab} menu offers ${v}`);
  }
});
test('stylesheet: the open section menu shrinks and scrolls inside the sheet instead of overflowing under the tab bar', () => {
  const css = readFileSync('css/game.css', 'utf8'); const rule = css.split('\n').find((l) => l.startsWith('#ui .section-menu {'));
  assert.ok(rule, 'rule present'); assert.match(rule, /flex:\s*0 1 auto/); assert.match(rule, /min-height:\s*0/); assert.match(rule, /overflow:\s*auto/); assert.doesNotMatch(rule, /flex-shrink:\s*0/);
  assert.match(css, /#ui \.sheet:has\(\[data-section-menu\]\) \.body \{ flex-shrink:\s*50;/, 'body yields before the menu does');
});
console.log(`${n} section-menu ring checks passed (stubbed DOM + stylesheet source, not Safari)`);
