// Act III "Turn the Security overlay off" after Back to map: the Operate panel is compact, so the Overlays details
// (and the Security button) are hidden, yet Overlays is still the chosen section. The coach must show the existing
// "Choose Overlays" instruction (ring on the selector, then on its Overlays option) and return to the real step once
// Security is reachable. Native resolveStep/guideTarget over a stubbed DOM; rendered taps are covered by Playwright reruns.
import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';
import { BEATS } from '../../js/tutorial.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
globalThis.document ??= {};
const off = BEATS.find((b) => b.id === 'overlays').steps.find((st) => /overlay off/.test(st.t));
const hire = BEATS.find((b) => b.id === 'hire').steps[1];
const PICKER = '.sheet [data-section-picker]';

// laidOut: the control has a layout box (false = inside display:none, as in the compact panel's hidden details).
function fixture({ step = off, label = 'Overlays', laidOut = false, visible = false, menu = null } = {}) {
  const sim = makeMaple(11), ui = Object.create(UI.prototype); sim.s.tut = { ...sim.s.tut, on: true };
  const picker = { id: 'picker', visible: true };
  const control = { id: 'control', visible, getClientRects: () => (laidOut || visible ? [{}] : []) };
  const option = { id: 'opt:' + label, dataset: { a: 'section', v: label }, visible: true };
  ui.g = { sim, audio: { unlock() {}, play() {} }, rend: { view: 0, overlay: 'security' } };
  ui.title = false; ui.modalOpen = () => false; ui.tab = 'operate'; ui.sectionMenuKey = menu; ui.sel = null; ui.tool = null;
  ui.sectionChoice = { tab: 'operate', label };
  ui.placementMismatch = () => null; ui.timeLocked = () => false;
  ui.root = {
    querySelector: (s) => (s === PICKER ? picker : s === step.sel ? control : null),
    querySelectorAll: (s) => (s === '.sheet [data-section-menu] [data-a="section"]' && menu ? [option] : []),
  };
  ui.guideVisible = (el) => !!el && el.visible !== false;
  ui.revealGuideEl = () => false;
  const ring = () => { const st = ui.resolveStep(step); ui.guideStep = st; ui.guideKey = 'k' + (st.redirect || ''); return { step: st, target: ui.guideTarget() }; };
  return { ui, picker, control, option, ring };
}

test('compact panel hides Security while Overlays is chosen: coach says Choose Overlays, ring on the selector', () => {
  const f = fixture(); const { step, target } = f.ring();
  assert.equal(step.redirect, 'section'); assert.match(step.t, /Choose <b>Overlays<\/b>/); assert.match(step.d, /Turn the Security overlay off/);
  assert.equal(target.el, f.picker); assert.equal(target.lbl, 'Choose Overlays');
});

test('section menu open: ring on the Overlays option', () => {
  const f = fixture({ menu: 'operate' }); const { step, target } = f.ring();
  assert.equal(step.redirect, 'section'); assert.equal(target.el, f.option); assert.equal(target.lbl, 'Tap Overlays');
});

test('Overlays chosen in the expanded panel, Security visible: the real turn-off step returns, ring on Security', () => {
  const f = fixture({ visible: true }); const { step, target } = f.ring();
  assert.equal(step.redirect, undefined); assert.match(step.t, /Security<\/b> overlay off/); assert.equal(target.el, f.control);
});

test('Hire fold fix kept: a laid-out Hire Porter below the fold keeps the real step', () => {
  const f = fixture({ step: hire, label: 'Hire capacity', laidOut: true }); const step = f.ui.resolveStep(hire);
  assert.equal(step.redirect, undefined); assert.match(step.t, /Hire Porter/);
  const h = fixture({ step: hire, label: 'Hire capacity', laidOut: false }); assert.equal(h.ui.resolveStep(hire).redirect, 'section', 'hidden (compact) Hire Porter asks to choose Hire');
});

test('evaluating the coach writes no game state', () => {
  const f = fixture(); const before = JSON.stringify(f.ui.g.sim.s); for (let i = 0; i < 20; i++) f.ring();
  assert.equal(JSON.stringify(f.ui.g.sim.s), before);
});

console.log(`${n} security turn-off compact panel checks passed (stubbed DOM, not Safari)`);
