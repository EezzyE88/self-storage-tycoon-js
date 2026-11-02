// Tutorial "Tap Hire Porter" on a short screen (375x667): once Hire is the chosen Operate section, the Hire Porter button
// is rendered but sits below the panel's fold. The coach must keep the real step (and the ring scrolls the button into
// view) instead of looping on "Choose Hire in the section selector". Native resolveStep/guideTarget over a stubbed DOM;
// rendered taps are covered by the Playwright reruns. Not physical Safari.
import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { makeMaple } from '../../js/maple.js';
import { BEATS } from '../../js/tutorial.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
globalThis.document ??= {}; // resolveStep only checks that a document exists
const hire = BEATS.find((b) => b.id === 'hire').steps[1];
const PICKER = '.sheet [data-section-picker]';

function fixture({ choice = 'Hire capacity', choiceTab = 'operate', rendered = true, visible = false, menu = null, revealWorks = true, tab = 'operate' } = {}) {
  const sim = makeMaple(11), ui = Object.create(UI.prototype); sim.s.tut = { ...sim.s.tut, on: true };
  const picker = { id: 'picker', visible: true };
  const control = { id: 'hirePorter', visible };
  const option = { id: 'opt:Hire capacity', dataset: { a: 'section', v: 'Hire capacity' }, visible: true };
  const reveals = [];
  ui.g = { sim, audio: { unlock() {}, play() {} }, rend: { view: 0 } };
  ui.title = false; ui.modalOpen = () => false; ui.tab = tab; ui.sectionMenuKey = menu; ui.sel = null; ui.tool = null;
  ui.sectionChoice = choice ? { tab: choiceTab, label: choice } : null;
  ui.placementMismatch = () => null; ui.timeLocked = () => false;
  ui.root = {
    querySelector: (s) => (s === PICKER ? picker : s === hire.sel ? (rendered ? control : null) : null),
    querySelectorAll: (s) => (s === '.sheet [data-section-menu] [data-a="section"]' && menu ? [option] : []),
  };
  ui.guideVisible = (el) => !!el && el.visible !== false;
  ui.revealGuideEl = (el) => { reveals.push(el.id); if (revealWorks && el === control) { el.visible = true; return true; } return false; };
  const ring = () => { const step = ui.resolveStep(hire); ui.guideStep = step; ui.guideKey = 'hire:1' + (step.redirect || ''); return { step, target: ui.guideTarget() }; };
  return { ui, picker, control, option, reveals, ring };
}

test('Hire chosen, Hire Porter rendered below the fold: the coach keeps "Tap Hire Porter" (no section loop)', () => {
  const f = fixture(); const step = f.ui.resolveStep(hire);
  assert.equal(step.redirect, undefined, 'no section redirect');
  assert.match(step.t, /Hire Porter/); assert.equal(step.sel, hire.sel);
});

test('the ring scrolls Hire Porter into view once and points at it', () => {
  const f = fixture(); const { target } = f.ring();
  assert.deepEqual(f.reveals, ['hirePorter']); assert.equal(target.el, f.control); assert.equal(target.lbl, 'Tap here');
});

test('PR #14 behaviour kept: no section chosen yet, or a different one, still asks to choose Hire', () => {
  for (const choice of [null, 'Staff']) {
    const f = fixture({ choice }); const { step, target } = f.ring();
    assert.equal(step.redirect, 'section'); assert.match(step.t, /Choose <b>Hire<\/b>/); assert.equal(target.el, f.picker); assert.equal(target.lbl, 'Choose Hire');
  }
  const other = fixture({ choiceTab: 'business' }); assert.equal(other.ui.resolveStep(hire).redirect, 'section', 'a Business choice does not count on Operate');
});

test('PR #14 behaviour kept: with the section menu open the ring stays on the Hire option', () => {
  const f = fixture({ menu: 'operate' }); const { step, target } = f.ring();
  assert.equal(step.redirect, 'section'); assert.equal(target.el, f.option); assert.equal(target.lbl, 'Tap Hire');
});

test('control not rendered at all still redirects; a visible control is unchanged', () => {
  assert.equal(fixture({ rendered: false }).ui.resolveStep(hire).redirect, 'section');
  const v = fixture({ visible: true, choice: null }); assert.equal(v.ui.resolveStep(hire).redirect, undefined);
});

test('evaluating the coach writes no game state', () => {
  const f = fixture(); const before = JSON.stringify(f.ui.sim.s); for (let i = 0; i < 20; i++) f.ring();
  assert.equal(JSON.stringify(f.ui.sim.s), before);
});

console.log(`${n} hire section fold checks passed (stubbed DOM, not Safari)`);
