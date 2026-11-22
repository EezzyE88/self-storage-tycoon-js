// Cedar Creek financial-recovery progress (SC-01R3): once all six rear units are restored and the lease goal is met,
// the Cedar panel shows progress toward the existing net-liquid goal from the goal's own value (financialPosition).
// Display only: no rule, record, economy, speed or Pause change. Native UI methods over a stubbed DOM. Not physical Safari.
import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';
import { makeScenario } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
import { CEDAR_TARGETS } from '../../js/cedarcreek.js';

let n = 0;
const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const apronArgs = (t) => { const xs = t.apron.map((a) => a[0]); return { type: 'build', tool: 'aisle', a: { x: Math.min(...xs), y: t.apron[0][1] }, b: { x: Math.max(...xs), y: t.apron[0][1] }, f: 0 }; };
const finishOrder = (sim, r) => { sim.completeOrder(sim.s.orders.find((o) => o.id === r.order)); sim.ensure(); };
function ui(sim) {
  const box = { innerHTML: '', querySelector() { return null; } };
  const rend = { zoom: 1, view: 0, setFocus() {}, setSelection() {}, setPreview() {}, setView() {}, setOverlay() {}, lookAt() {}, zoomBy() {}, highlightProject() {} };
  const u = Object.create(UI.prototype);
  u.g = { sim, rend, audio: { unlock() {}, play() {} }, autosavePaused() {} };
  u.$ = (id) => (id === 'tut' ? box : null); u.title = false; u.scMin = false; u.toasts = []; u.toast = () => {}; u.sfx = () => {};
  u.root = null; u.tab = null; u.sel = null; u.tool = null; u.cat = null;
  u.renderSheet = () => {}; u.renderActionBar = () => {}; u.setView = () => {}; u.select = () => {}; u.setTab = () => {};
  u.safeRect = () => ({ top: 0, bottom: 600, left: 0, right: 390 });
  u.renderCedar(true); return { u, box };
}
// All six restored through production methods, with the given number of leases on restored targets.
function yard(leases) {
  const sim = makeScenario('comeback', 4401), s = sim.s, c = s.scenario;
  for (const t of CEDAR_TARGETS.filter((t) => t.apron)) finishOrder(sim, sim.dispatch(apronArgs(t)));
  for (const t of [...s.tasks].filter((t) => t.type === 'makeready')) sim.finishTask(t, null);
  sim.ensure(); for (const u of c.targets.map((t) => s.objects[t.id]).slice(0, leases)) sim.signLease(u, { size: '10x10' });
  sim.ensure(); sim.events.length = 0; return { sim, s, c };
}
const setLiquid = (sim, v) => { const s = sim.s, P = sim.financialPosition(); s.cash = Math.round((v + P.committed + s.loan.bal) * 100) / 100; }; // SYNTHETIC
const block = (h) => (h.match(/<div class="cedar-recovery">[\s\S]*?<\/p><\/div>/) || [''])[0];
const head = (h) => (h.match(/<div class="ch"><span>([^<]*)<\/span>/) || [])[1];
const usd = (v) => '$' + v.toLocaleString();

test('before the units are done there is no recovery block and the header keeps the restore and lease count', () => {
  const sim = makeScenario('comeback', 4401), { box } = ui(sim);
  assert.equal(block(box.innerHTML), ''); assert.equal(head(box.innerHTML), 'Cedar Creek · 0/6 restored · 0/3 leased');
  const y = yard(2), r = ui(y.sim);
  assert.equal(block(r.box.innerHTML), '', 'six restored but only two leased: not yet'); assert.equal(head(r.box.innerHTML), 'Cedar Creek · 6/6 restored · 2/3 leased');
});
test('six restored and three leased: the panel shows net liquid against the $2,150 goal from financialPosition, without changing state', () => {
  const { sim, c } = yard(3); setLiquid(sim, 1604.4);
  const { u, box } = ui(sim), before = JSON.stringify(sim.s); u.renderCedar(true); // ui() rendered once: the existing lazy Owner-hours sync
  assert.equal(JSON.stringify(sim.s), before, 'rendering changes no simulation state');
  const b = block(box.innerHTML), nl = sim.financialPosition().netLiquid;
  assert.equal(nl, 1604.4); assert.equal(c.status, 'active');
  assert.match(b, /Units done\. One goal left: financial recovery\./);
  assert.match(b, new RegExp(`<span>Net liquid</span><b>\\${usd(1604)} of \\$2,150</b>`));
  assert.match(b, /<i style="width:74%"><\/i>/); assert.match(b, /\$546 to go\. All six units are restored and 3 are leased\./);
  assert.equal(head(box.innerHTML), 'Cedar Creek · recovery $1,604 of $2,150');
  assert.match(box.innerHTML, /<span>Reach \$2,150 net liquid<\/span><b>\$1,604 of \$2,150<\/b>/, 'block and goal row agree');
});
test('the shown balance is net liquid (bills owed and credit-line draw subtracted), not the cash on hand', () => {
  const { sim, s } = yard(3); s.cash = 1900; s.loan.bal = 200; // SYNTHETIC: a credit-line draw lowers net liquid
  const P = sim.financialPosition(), { box } = ui(sim), want = Math.round(P.netLiquid);
  assert.ok(want < 1900); assert.match(block(box.innerHTML), new RegExp(`<b>\\${usd(want)} of \\$2,150</b>`));
  assert.doesNotMatch(block(box.innerHTML), /\$1,900 of/);
});
test('one cent short shows $1 to go and no win, and the block agrees with the goal row; reaching the goal completes Cedar as before and the block goes away', () => {
  const { sim, c } = yard(3); setLiquid(sim, c.liquidGoal - 0.01); sim.poll();
  const r = ui(sim); assert.equal(c.status, 'active');
  // Display rounds like the existing goal row ($2,150 of $2,150); the amount left still says $1 and nothing is won.
  assert.match(block(r.box.innerHTML), /<b>\$2,150 of \$2,150<\/b>/); assert.match(block(r.box.innerHTML), /\$1 to go\./);
  assert.match(r.box.innerHTML, /<span>Reach \$2,150 net liquid<\/span><b>\$2,150 of \$2,150<\/b>/, 'block and goal row agree');
  setLiquid(sim, c.liquidGoal); sim.poll(); assert.equal(c.status, 'won');
  r.u.renderCedar(true); assert.equal(block(r.box.innerHTML), ''); assert.equal(head(r.box.innerHTML), 'Cedar Creek · complete');
});
test('the collapsed panel header carries the recovery progress; net liquid below zero shows a negative amount and an empty bar', () => {
  const { sim } = yard(3); setLiquid(sim, -120); const r = ui(sim); r.u.scMin = true; r.u.renderCedar(true);
  assert.match(r.box.innerHTML, /class="tut scen comeback cedar min"/); assert.equal(head(r.box.innerHTML), 'Cedar Creek · recovery -$120 of $2,150');
  r.u.scMin = false; r.u.renderCedar(true); assert.match(block(r.box.innerHTML), /<i style="width:0%"><\/i>/); assert.match(block(r.box.innerHTML), /\$2,270 to go\./);
});
test('no forecast, date or speed control in the recovery block', () => {
  const { sim } = yard(3); setLiquid(sim, 1800); const b = block(ui(sim).box.innerHTML);
  assert.ok(b); assert.doesNotMatch(b, /\bday|days|forecast|pace|expect|estimat|4x|speed|data-a=/i);
});
test('a record without liquidGoal (3fd14ab) shows no recovery block and keeps its original goal', () => {
  const { sim, s } = yard(3); delete s.scenario.liquidGoal; const re = new Sim(JSON.parse(JSON.stringify(s)));
  re.s.cash = 900; // SYNTHETIC: under the original start goal, so it stays active
  const { box } = ui(re); assert.equal(re.s.scenario.liquidGoal, undefined); assert.equal(block(box.innerHTML), '');
  assert.equal(head(box.innerHTML), 'Cedar Creek · 6/6 restored · 3/3 leased');
});
test('save round trip keeps the record shape and the same recovery panel', () => {
  const { sim, s } = yard(3); setLiquid(sim, 1700); const keys = Object.keys(s.scenario).sort();
  const re = new Sim(JSON.parse(JSON.stringify(s))); assert.deepEqual(Object.keys(re.s.scenario).sort(), keys);
  assert.equal(block(ui(re).box.innerHTML), block(ui(sim).box.innerHTML));
});
console.log(`${n} Cedar recovery progress checks passed (stubbed DOM, not Safari)`);
