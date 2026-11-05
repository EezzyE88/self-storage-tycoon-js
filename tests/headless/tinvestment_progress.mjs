// Financial Comprehension: read-only Investment Progress on the Act II/III breaks, the graduation card and Business.
// Player-built units are units carrying a construction `order`; only operating units count. Contracted rent is never
// presented as cash collected, profit or return. Nothing is saved; Pause, tutorial progression and the economy are unchanged.
import assert from 'node:assert/strict';
import { makeMaple, makeEmptyLot } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { makeScenario, makeComeback } from '../../js/scenarios.js';
import { BEATS, beatIndex, curBeat, tutorialTick } from '../../js/tutorial.js';
import { UI } from '../../js/ui.js';
import { investmentProgress, actIIProgress, investmentText, gradProgress, businessProgressHtml, GRAD_TRANSITION, STATEMENT_POINTER, REMINDER_DAYS } from '../../js/investmentprogress.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const ROW = { tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 };
const NEGATION = 'Monthly rent is not the same as cash collected or profit.';
const builtUnits = (sim) => sim.objs('unit').filter((u) => u.order != null);
function withRow(seed = 9, { grad = false } = {}) {
  const sim = makeMaple(seed), s = sim.s; s.tut.on = false; s.open = true;
  if (grad) Object.assign(s.tut, { done: true, gradDay: 1 });
  assert.equal(sim.dispatch({ type: 'build', ...ROW }).ok, true);
  for (let i = 0; i < 1440 * 3 && builtUnits(sim).some((u) => u.cstate !== 'operating'); i++) sim.step();
  assert.ok(builtUnits(sim).every((u) => u.cstate === 'operating'), 'row opened');
  return sim;
}
const lease = (sim, u) => sim.signLease(u, null);
const setBeat = (sim, id) => { const i = beatIndex(id); Object.assign(sim.s.tut, { on: true, done: false, beat: i, beatId: id, beatAt: i, entered: true }); };
function businessFor(sim, tier = null) {
  const ui = Object.create(UI.prototype);
  ui.g = { sim, tierInfo: () => tier }; ui.$ = () => ({ innerHTML: '' });
  return ui.businessSheet();
}

test('no player-built units: nothing shown anywhere (authored starts, scenarios, empty lot)', () => {
  for (const sim of [makeMaple(1), makeMaple(2, { mirror: true }), makeComeback(4401), makeScenario('turnaround'), makeEmptyLot()]) {
    assert.equal(builtUnits(sim).length, 0); assert.equal(investmentProgress(sim), null);
    assert.equal(actIIProgress(sim), ''); assert.equal(investmentText(sim), ''); assert.equal(businessProgressHtml(sim), '');
    assert.equal(gradProgress(sim), '<br><br>' + GRAD_TRANSITION, 'graduation keeps the transition notice even with no new units');
  }
});

test('construction is not counted; opened units count as vacant; leased rent equals the stored lease amounts', () => {
  const sim = makeMaple(9), s = sim.s; s.tut.on = false; s.open = true;
  assert.equal(sim.dispatch({ type: 'build', ...ROW }).ok, true);
  assert.equal(builtUnits(sim).length, 4); assert.equal(investmentProgress(sim), null, 'under construction');
  for (let i = 0; i < 1440 * 3 && builtUnits(sim).some((u) => u.cstate !== 'operating'); i++) sim.step();
  const roll0 = sim.rentRoll();
  assert.deepEqual(investmentProgress(sim), { built: 4, leased: 0, vacant: 4, newRent: 0, roll: roll0 });
  const [a, b, c, d] = builtUnits(sim); lease(sim, a); lease(sim, b);
  const P = investmentProgress(sim), want = s.leases[a.lease].rent + s.leases[b.lease].rent;
  assert.deepEqual(P, { built: 4, leased: 2, vacant: 2, newRent: want, roll: sim.rentRoll() });
  assert.equal(P.roll, roll0 + want);
  lease(sim, c); lease(sim, d); assert.equal(investmentProgress(sim).vacant, 0); assert.equal(investmentProgress(sim).leased, 4);
});

test('demolition removes a built unit; a split keeps built halves built and authored halves authored', () => {
  const sim = withRow(9, { grad: true }), s = sim.s;
  const [a, b] = builtUnits(sim);
  const q = sim.plan({ tool: 'demolish', targetId: a.id, a: { x: a.x, y: a.y }, b: { x: a.x, y: a.y }, f: 0 });
  assert.equal(sim.dispatch({ type: 'build', tool: 'demolish', targetId: a.id, a: { x: a.x, y: a.y }, b: { x: a.x, y: a.y }, f: 0, quoteStamp: q.operation?.stamp }).ok, true);
  assert.equal(investmentProgress(sim).built, 3);
  sim.ensure(); assert.equal(sim.dispatch({ type: 'renovate', unit: b.id, kind: 'split' }).ok, true);
  assert.equal(investmentProgress(sim).built, 4, 'one built 10x10 became two built 5x10s');
  const au = sim.objs('unit').find((u) => u.order == null && u.size === '10x10' && u.access === 'drive');
  const L = s.leases[au.lease]; if (L) { delete s.tenants[L.tenant]; delete s.leases[L.id]; } au.lease = null; au.commercial = 'ready';
  const authored = sim.objs('unit').filter((u) => u.order == null).length;
  assert.equal(sim.dispatch({ type: 'renovate', unit: au.id, kind: 'split' }).ok, true);
  assert.equal(investmentProgress(sim).built, 4); assert.equal(sim.objs('unit').filter((u) => u.order == null).length, authored + 1);
});

test('save/reload: identical values from a JSON round trip; calculation and texts write nothing', () => {
  const sim = withRow(11); lease(sim, builtUnits(sim)[0]);
  const before = JSON.stringify(sim.s);
  investmentProgress(sim); actIIProgress(sim); investmentText(sim); gradProgress(sim); businessProgressHtml(sim);
  assert.equal(JSON.stringify(sim.s), before, 'no state written');
  const re = new Sim(clone(sim.s)); assert.deepEqual(investmentProgress(re), investmentProgress(sim));
  assert.equal(investmentText(re), investmentText(sim));
});

test('Act II break: original body kept, all new units counted, short contracted-rent line', () => {
  assert.equal(typeof BEATS[beatIndex('actII_break')].body, 'string'); assert.equal(typeof BEATS[beatIndex('actIII_break')].body, 'string'); assert.equal(typeof BEATS[beatIndex('grad')].body, 'string');
  const sim = withRow(13); const u = builtUnits(sim)[0]; lease(sim, u);
  assert.equal(sim.dispatch({ type: 'build', tool: 'du10x10', a: { x: 13, y: 3 }, b: { x: 13, y: 9 }, f: 0, axis: 'y' }).ok, true, 'a second, uncoached drive-up build (allowed from expand)');
  for (let i = 0; i < 1440 * 3 && builtUnits(sim).some((x) => x.cstate !== 'operating'); i++) sim.step();
  setBeat(sim, 'actII_break'); const b = curBeat(sim), P = investmentProgress(sim);
  assert.equal(P.built, 7, 'counts every new unit, not only the coached row');
  assert.ok(b.body.startsWith(BEATS[beatIndex('actII_break')].body), 'authored body unchanged and first');
  assert.match(b.body, new RegExp(`Your new units: <b>${P.leased} of ${P.built}</b> leased, adding <b>\\$${Math.round(P.newRent)}/month</b> in contracted rent`));
});

test('Act III break and graduation: headline only when something new is leased; occupancy dip explained; no profit, payback or return claim', () => {
  const sim = withRow(15); setBeat(sim, 'actIII_break');
  let body = curBeat(sim).body;
  assert.doesNotMatch(body, /starting to work/, 'no success headline with 0 leased (O1)'); assert.match(body, /New units: <b>0 of 4<\/b> leased/);
  lease(sim, builtUnits(sim)[0]); body = curBeat(sim).body;
  assert.match(body, /<b>Your investment is starting to work\.<\/b> New units: <b>1 of 4<\/b> leased/);
  assert.match(body, /Occupancy may have dipped because newly opened units start empty/); assert.ok(body.includes(NEGATION));
  assert.match(body, new RegExp(`Total property rent roll: <b>\\$${Math.round(sim.rentRoll()).toLocaleString('en-US')}/month</b>`));
  for (const t of [actIIProgress(sim), investmentText(sim), gradProgress(sim), businessProgressHtml(sim)]) {
    const rest = t.replace(NEGATION, '');
    assert.doesNotMatch(rest, /profit|paid for itself|payback|return on|collected|lower (your )?(asking )?rent/i);
  }
  assert.doesNotMatch(investmentText(sim), /up to|potential|asking/i, 'no asking-rent potential (refinement 1)');
});

test('graduation card: transition is announced while the tutorial economy applies; Finish switches it and keeps Pause', () => {
  const sim = withRow(17); setBeat(sim, 'grad'); sim.s.speed = 4; sim.s.tut.entered = false; tutorialTick(sim);
  assert.equal(sim.s.speed, 0, 'paused graduation holds'); assert.equal(sim.pressureOn(), false, 'card shows before the economy changes');
  const body = curBeat(sim).body;
  assert.ok(body.startsWith(BEATS[beatIndex('grad')].body)); assert.ok(body.includes('When you tap Finish tutorial,</b> the introductory market boost ends. From tomorrow'));
  sim.dispatch({ type: 'tutFlag', flag: 'grad' }); tutorialTick(sim);
  assert.equal(sim.s.tut.done, true); assert.equal(sim.pressureOn(), true); assert.equal(sim.s.speed, 0, 'still paused after Finish'); assert.equal(curBeat(sim), null);
});

test('Business: graduated campaign only; reminder for 30 days; hidden when full and past the window; career rent roll is dynamic', () => {
  const sim = withRow(19, { grad: true }), s = sim.s; s.tut.gradDay = sim.day;
  let h = businessProgressHtml(sim);
  assert.match(h, /^<div class="note invest-progress">/); assert.doesNotMatch(h, /<h3/, 'never a section heading');
  assert.match(h, /New units:<\/b> 0 of 4 leased · \$0\/mo in contracted rent · property rent roll/);
  assert.match(h, /introductory market boost has ended/); assert.ok(h.includes(STATEMENT_POINTER));
  assert.doesNotMatch(h, /Career rent roll/, 'no career line without career data');
  const tier = { roll: 3963.5, next: { name: 'Example tier', roll: 5000 } };
  assert.match(businessProgressHtml(sim, tier), /<b>Career rent roll<\/b> \$3,964 of \$5,000\/mo for Example tier\./);
  assert.doesNotMatch(businessProgressHtml(sim, { roll: 1, next: null }), /Career/);
  s.tut.gradDay = sim.day - REMINDER_DAYS - 1; h = businessProgressHtml(sim);
  assert.doesNotMatch(h, /introductory market boost/); assert.match(h, /0 of 4 leased/, 'still shown while new units are vacant');
  for (const u of builtUnits(sim)) lease(sim, u); assert.equal(businessProgressHtml(sim), '', 'hidden once full and past the window');
  s.tut.gradDay = sim.day; assert.match(businessProgressHtml(sim), /4 of 4 leased/, 'within the window it stays even when full');
  const sb = withRow(21); sb.s.mode = 'sandbox'; sb.s.tut = { on: false, beat: 99, flags: {}, done: true, gradDay: sb.day }; assert.equal(businessProgressHtml(sb), '', 'not on sandbox or acquired properties');
  const tut = withRow(23); assert.equal(businessProgressHtml(tut), '', 'not before graduation');
});

test('Business sheet integration: block sits after the top cards and before Bills; existing cards unchanged', () => {
  const sim = withRow(25, { grad: true }); sim.s.tut.gradDay = sim.day;
  const html = businessFor(sim, { roll: sim.rentRoll(), next: { name: 'Local operator', roll: 4375 } });
  const i = html.indexOf('invest-progress'), stats = html.indexOf('<div class="stats">'), bills = html.indexOf('>Bills &amp; reserve</h3>');
  assert.ok(stats >= 0 && i > stats && i < bills, 'after the stats block, before Bills & reserve');
  for (const label of ['<small>Cash</small>', '<small>Monthly rent roll</small>', '<small>Rent collected, last 30 days</small>', '<small>Operating cost / day</small>', 'Operating performance · 30 calendar days']) assert.ok(html.includes(label), label);
  assert.match(html, /Career rent roll<\/b> \$[\d,]+ of \$4,375\/mo for Local operator/);
  const pre = withRow(27); assert.ok(!businessFor(pre).includes('invest-progress'), 'tutorial Business unchanged');
});

console.log(`${passed} investment progress checks passed`);
