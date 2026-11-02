// Repair beat "Tap the broken light": a complaint bubble ("The hallway is dark.") drawn over the coached light must not take
// the tap. Only that coached step (flag clearMapTap) turns bubble taps off; bubbles stay visible, complaints and feedback
// behave normally on every other step and after the tutorial. Also pins the Asking rents "1 unit" plural.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { UI } from '../../js/ui.js';
import { tutorialTick, lessonTick, BEATS, beatIndex, stepState, curBeat } from '../../js/tutorial.js';

let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
globalThis.innerWidth ??= 390; globalThis.innerHeight ??= 844;

// Play the real Maple tutorial to the repair beat (same path as tmaple_pricing_stop, continued through the Act I break and the row).
function toRepair(seed = 20260929) {
  const sim = makeMaple(seed), s = sim.s;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { sim.step(); tutorialTick(sim); lessonTick(sim); sim.events.length = 0; } };
  const until = (fn, max = 1440 * 6) => { let i = 0; while (!fn() && i < max) { tick(); i++; } assert.ok(fn(), 'tutorial reached expected state'); };
  const d = (a) => { const r = sim.dispatch(a); tutorialTick(sim); return r; };
  tick(2); d({ type: 'tutFlag', flag: 'welcome' }); tick();
  d({ type: 'ownerMakeReady', unit: s.objects[s.unitRoles.mapleTurnover].id }); s.speed = 4;
  until(() => curBeat(sim)?.id === 'money');
  for (const f of ['businessOpened', 'moneyAck', 'pricingSeen', 'pricingAck', 'actI_break']) { d({ type: 'tutFlag', flag: f }); tick(); }
  assert.equal(curBeat(sim).id, 'expand');
  d({ type: 'build', tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 }); s.speed = 4;
  until(() => curBeat(sim)?.id === 'repair', 1440 * 3);
  return { sim, tick };
}

// A UI with the real updateBubbles/coachClearsMapTap and a stubbed renderer; bubbles are bound complaint bubbles (role=button).
function uiFor(sim, view = 0) {
  const ui = Object.create(UI.prototype);
  Object.assign(ui, { g: { sim }, title: false, sel: null, tab: null, tool: null, toasts: [], bubbles: [] });
  ui.g.rend = { view, project: () => ({ x: 195, y: 422, vis: true }), pool: { ppl: new Map() } };
  ui.syncFeedbackProperty = () => {}; ui.mapPointClear = () => true;
  return ui;
}
const bubble = (sim, text = 'The hallway is dark.') => {
  const attrs = { role: 'button' };
  const el = { style: {}, offsetWidth: 180, hasAttribute: (k) => k in attrs, remove() {} };
  return { el, th: { kind: 'bad', text, x: 20, y: 8, f: 0 }, t: performance.now(), ag: -1 };
};
const tapState = (ui) => { ui.updateBubbles(); return ui.bubbles.map((b) => b.el.style.pointerEvents); };

test('only the repair "Tap the broken light" step carries clearMapTap', () => {
  const flagged = BEATS.flatMap((b) => (b.steps || []).map((st, i) => ({ b: b.id, i, on: !!st.clearMapTap }))).filter((x) => x.on);
  assert.deepEqual(flagged.map((x) => x.b + ':' + x.i), ['repair:1']);
  assert.match(BEATS[beatIndex('repair')].steps[1].t, /broken <b>light<\/b>/);
});

test('on the coached light step an overlapping complaint bubble stays visible but cannot take the tap', () => {
  const { sim } = toRepair(); const ui = uiFor(sim, 0);
  assert.equal(stepState(sim, ui).cur, 1, 'F1 shown: Tap the broken light');
  ui.bubbles.push(bubble(sim), bubble(sim, 'It is dark in here.'));
  assert.deepEqual(tapState(ui), ['none', 'none']);
  assert.ok(ui.bubbles.every((b) => b.el.style.opacity === 1), 'bubbles still shown');
  assert.equal(ui.coachClearsMapTap(), true);
});

test('the same bubble takes taps on the step before and after, and once the light is selected', () => {
  const { sim } = toRepair(); const before = uiFor(sim, 'ext');
  assert.equal(stepState(sim, before).cur, 0, 'EXT view: Look inside (F1)');
  before.bubbles.push(bubble(sim)); assert.deepEqual(tapState(before), ['auto']);
  const ui = uiFor(sim, 0); ui.sel = BEATS[beatIndex('repair')].steps[1].obj(sim);
  assert.equal(stepState(sim, ui).cur, 2, 'light selected: Send Owner');
  ui.bubbles.push(bubble(sim)); assert.deepEqual(tapState(ui), ['auto']);
});

test('outside the tutorial, unbound bubbles and hidden bubbles keep their existing rules', () => {
  const { sim } = toRepair(); assert.equal(sim.dispatch({ type: 'tutSkip' }).ok, true);
  const ui = uiFor(sim, 0); ui.bubbles.push(bubble(sim)); assert.deepEqual(tapState(ui), ['auto'], 'tutorial off: feedback bubble tappable');
  const fresh = uiFor(makeMaple(5), 0); const b = bubble(fresh.sim); b.el.hasAttribute = () => false; fresh.bubbles.push(b);
  assert.deepEqual(tapState(fresh), ['none'], 'non-feedback bubble stays untappable');
  const t = uiFor(sim, 0); t.title = true; assert.equal(t.coachClearsMapTap(), false);
});

test('the shield is UI-only: evaluating it writes no game state and survives save/reload on the step', () => {
  const { sim } = toRepair(); const ui = uiFor(sim, 0); ui.bubbles.push(bubble(sim));
  const before = JSON.stringify(sim.s); for (let i = 0; i < 50; i++) tapState(ui);
  assert.equal(JSON.stringify(sim.s), before);
  const re = new Sim(JSON.parse(before)); const r = uiFor(re, 0); r.bubbles.push(bubble(re));
  assert.deepEqual(tapState(r), ['none']);
});

test('Asking rents rows say "1 unit" and "N units"', () => {
  const sim = makeMaple(20260929); const ui = uiFor(sim, 0);
  const rows = [...ui.businessSheet().matchAll(/<small>Market [^<]*/g)].map((m) => m[0]);
  assert.ok(rows.length >= 3, 'Asking rents rows rendered');
  assert.ok(rows.every((r) => !/\b1 units\b/.test(r)), rows.join(' | '));
  assert.ok(rows.some((r) => / 1 unit · /.test(r)), 'the single 10x20 reads "1 unit"');
  assert.ok(rows.some((r) => / 16 units · /.test(r)), 'plural rows unchanged');
});

console.log(`${passed} repair tap shield checks passed`);
