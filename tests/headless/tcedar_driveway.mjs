// Cedar Creek Damaged Driveway guidance (SC-01R2): the unit-card action opens the ordinary Drive Aisle review on the two
// authored cells, charges nothing until Confirm, cancels cleanly, and steps aside once the repair is under way or done.
// Native UI methods over a stubbed DOM/renderer; rendered taps are covered by the Playwright reruns. Not physical Safari.
import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { makeScenario, SCENARIOS } from '../../js/scenarios.js';
import { CEDAR_TARGETS } from '../../js/cedarcreek.js';
import { targetUnits } from '../../js/comeback.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
function fixture(seed = 4401) {
  const sim = makeScenario('comeback', seed), box = { innerHTML: '', querySelector() { return null; } }, calls = [];
  const rend = { zoom: 0.25, view: 0, setFocus() {}, setSelection() {}, setPreview() {}, setView() {}, setOverlay() {},
    lookAt(x, y) { calls.push(['lookAt', x, y]); }, zoomBy(k) { this.zoom *= k; calls.push(['zoomBy', +k.toFixed(3)]); },
    highlightProject(b) { calls.push(['highlight', b]); } };
  const u = Object.create(UI.prototype);
  u.g = { sim, rend, audio: { unlock() {}, play() {} }, autosavePaused() {} };
  u.$ = (id) => (id === 'tut' ? box : null); u.title = false; u.scMin = false; u.toasts = []; u.toast = () => {}; u.sfx = () => {};
  u.root = null; u.tab = null; u.sel = null; u.tool = null; u.cat = null;
  u.renderSheet = () => {}; u.renderActionBar = () => {}; u.setView = () => {}; u.select = (id) => { u.sel = id; };
  u.setTab = (t) => { calls.push(['tab', t]); u.tab = t; }; u.safeRect = () => ({ top: 0, bottom: 600, left: 0, right: 390 });
  // The live game shows this panel at start; its render syncs the Owner's daily work counters (sim.workRemaining),
  // an existing lazy initialisation. Render once so later state comparisons isolate the driveway action.
  u.renderCedar(true);
  return { sim, u, box, calls, rend };
}
const tapAction = (u, a, v) => u.onClick({ target: { closest() { return { dataset: { a, v: String(v) }, closest() { return null; } }; } } });
const drive = CEDAR_TARGETS.map((t, k) => [t, k]).filter(([t]) => t.apron);
const state = (sim) => JSON.stringify(sim.s);
const finishBuilds = (sim) => { for (let i = 0; i < 600 && sim.s.orders.some((o) => o.st === 'construction'); i++) { sim.step(); sim.events.length = 0; } };

test('wording: blurb, briefing, cards and details say Damaged Driveway; no player-facing "apron"', () => {
  const { u, box, sim } = fixture();
  assert.match(SCENARIOS.comeback.blurb, /two of them have a Damaged Driveway\./);
  u.renderCedar(true); const h = box.innerHTML;
  assert.match(h, /two units have a Damaged Driveway\./); assert.match(h, /<b>Damaged Driveway:<\/b> two units need a Drive Aisle on the two damaged driveway cells/);
  assert.doesNotMatch(h, /apron/i); assert.doesNotMatch(SCENARIOS.comeback.blurb, /apron/i);
  assert.equal((h.match(/Review driveway repair · \$90/g) || []).length, 2);
  for (const [t, k] of drive) assert.match(h, new RegExp(`data-a="cedarDriveway" data-v="${k}"><b>Unit ${sim.s.scenario.targets[k].num}</b><small>Damaged Driveway · 2 cells in front of the door</small>`));
  assert.equal((h.match(/data-a="comebackUnit"/g) || []).length, 4, 'the other four cards keep their unit action');
});
for (const [t, k] of drive) {
  const [a, b] = [{ x: Math.min(...t.apron.map((c) => c[0])), y: 6 }, { x: Math.max(...t.apron.map((c) => c[0])), y: 6 }];
  test(`Unit card ${k}: Review driveway repair prepares the Drive Aisle review on ${a.x}-${b.x},6, zoomed and outlined, charging nothing`, () => {
    const { u, sim, calls } = fixture(); const before = state(sim), cash = sim.s.cash;
    tapAction(u, 'cedarDriveway', k);
    assert.equal(u.tool, 'aisle'); assert.equal(u.cat, 'roads'); assert.equal(u.plan.status, 'valid'); assert.equal(u.plan.cost, 90);
    assert.deepEqual([u.plan.args.a.x, u.plan.args.a.y, u.plan.args.b.x, u.plan.args.b.y, u.plan.args.f], [a.x, 6, b.x, 6, 0]);
    assert.deepEqual(calls.find((c) => c[0] === 'highlight')[1], { x: a.x, y: 6, w: 2, h: 1 });
    assert.ok(calls.some((c) => c[0] === 'lookAt') && u.rend.zoom >= 1.2 - 1e-9, 'camera framed and zoomed to at least 1.2');
    assert.equal(u.scMin, true, 'panel collapsed'); assert.equal(u.tab, 'build');
    assert.equal(state(sim), before, 'no simulation state change before Confirm'); assert.equal(sim.s.cash, cash);
  });
}
test('the prepared plan is the same build a manual Drive Aisle drag makes', () => {
  for (const [t, k] of drive) {
    const A = fixture(), B = fixture(); tapAction(A.u, 'cedarDriveway', k);
    const xs = t.apron.map((c) => c[0]); B.u.cat = 'roads'; B.u.pickTool('aisle'); B.u.placeStart({ x: Math.min(...xs), y: 6 }); B.u.placeMove({ x: Math.max(...xs), y: 6 }); B.u.finishPlacement();
    assert.deepEqual(JSON.parse(JSON.stringify(A.u.plan.args)), JSON.parse(JSON.stringify(B.u.plan.args)));
    assert.equal(A.u.plan.cost, B.u.plan.cost);
  }
});
test('cancel (✕) puts the tool away with no order, no charge and no state change', () => {
  const { u, sim } = fixture(); const before = state(sim);
  tapAction(u, 'cedarDriveway', 1); assert.equal(u.tool, 'aisle');
  tapAction(u, 'cancelTool', ''); assert.equal(u.tool, null); assert.equal(u.plan, null);
  assert.equal(state(sim), before); assert.equal(sim.s.orders.length, 0);
});
test('Confirm charges $90 once through the ordinary build path; the card then shows the repair under way and offers no second review', () => {
  const { u, sim, box } = fixture(); const cash = sim.s.cash;
  tapAction(u, 'cedarDriveway', 1); u.confirmPlan();
  assert.equal(sim.s.cash, cash - 90); const o = sim.s.orders.at(-1);
  assert.equal(o.tool, 'aisle'); assert.equal(o.st, 'construction'); assert.deepEqual(o.cells.map((c) => [c.x, c.y]), [[9, 6], [10, 6]]);
  assert.equal(u.cedarDriveway(1).building, true); assert.equal(u.cedarDriveway(1).cost, null);
  u.scMin = false; u.renderCedar(true);
  assert.match(box.innerHTML, /Unit 1012<\/b><small>Damaged Driveway · repair under way<\/small><\/button>/);
  assert.equal((box.innerHTML.match(/Review driveway repair · \$/g) || []).length, 1, 'only 1015 still offers the review');
  const before = state(sim); u.tool = null; tapAction(u, 'cedarDriveway', 1); assert.equal(u.tool, null, 'a stale tap does nothing'); assert.equal(state(sim), before);
});
test('after both repairs complete: access restored, cards return to the unit action with the make-ready line', () => {
  const { u, sim, box } = fixture();
  for (const [, k] of drive) { tapAction(u, 'cedarDriveway', k); u.confirmPlan(); }
  assert.equal(sim.s.cash, 1150 - 180); finishBuilds(sim);
  for (const [, k] of drive) { const un = targetUnits(sim.s, sim.s.scenario.targets[k])[0]; assert.equal(un.missing?.length || 0, 0); assert.equal(un.blocked, false); assert.equal(u.cedarDriveway(k), null); }
  u.scMin = false; u.renderCedar(true);
  assert.doesNotMatch(box.innerHTML, /Damaged Driveway ·|Review driveway repair ·|data-a="cedarDriveway"/);
  assert.equal((box.innerHTML.match(/data-a="comebackUnit"/g) || []).length, 6);
  assert.match(box.innerHTML, /Unit 1012<\/b><small>Prepare unit 5h · not started/);
});
test('not offered outside a live Cedar v2 record (unavailable record, other scenarios)', () => {
  const { u, sim } = fixture(); sim.s.scenario.status = 'unavailable'; assert.equal(u.cedarDriveway(1), null);
  const t = fixture(); t.u.g.sim = makeScenario('turnaround', 7); assert.equal(t.u.cedarDriveway(1), null);
});
console.log(`${n} Cedar Damaged Driveway checks passed (stubbed DOM, not Safari)`);
