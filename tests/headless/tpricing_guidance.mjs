// Pricing guidance (display only): saved "Trim asking rents" advice is reworded when shown, and Asking rents
// gets a per-size "Last 30 days" line. No economy, saved-state, RNG or Pause mutation.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { UI } from '../../js/ui.js';
import { priceAdviceText, pricingActivity, pricingActivityHtml } from '../../js/pricingguidance.js';
let passes = 0;
const test = (label, fn) => { fn(); passes++; console.log('PASS', label); };
const OLD_RIVAL = '8 shoppers left over price; StorQuik Self Storage charges about 16% under market. Trim asking rents in Business, or win on quality.';
const OLD_PLAIN = '3 shoppers left over price. Trim asking rents in Business, or win on quality.';
const daily = day => ({ day, rent: 100, anc: 0, opex: 1, payroll: 1, service: 0, marketing: 0, interest: 0, leases: 0, moveouts: 0 });
function setup(day = 61) {
  const sim = makeMaple(34); sim.s.tut = { on: false, done: true, flags: {} }; sim.s.speed = 0; sim.s.t = (day - 1) * 1440;
  sim.s.days = Array.from({ length: 30 }, (_, i) => daily(day - 30 + i)); sim.s.today = daily(day); sim.s.mkt.reports = []; sim.s.mkt.lostLog = [];
  return sim;
}
const uiFor = sim => { const ui = Object.create(UI.prototype); ui.g = { sim }; return ui; };
const units = (sim, size) => Object.values(sim.s.objects).filter(u => u.type === 'unit' && u.cstate === 'operating' && u.size === size);

test('saved advice with a rival is reworded and keeps count, rival and gap', () => {
  assert.equal(priceAdviceText(OLD_RIVAL), '8 shoppers turned down your asking rent; StorQuik Self Storage charges about 16% under market. Other shoppers may still lease the same units at full rent, so a lower price is not guaranteed to earn more. Compare each size in Business → Asking rents before changing price.');
});
test('saved advice without a rival is reworded; no cut is recommended', () => {
  const t = priceAdviceText(OLD_PLAIN);
  assert.match(t, /^3 shoppers turned down your asking rent\. /); assert.doesNotMatch(t, /Trim|cut|lower your/i);
});
test('every other advice line and non-string values pass through unchanged', () => {
  for (const t of ['14 shoppers wanted a 10x10 and found none available.', '6 tenants pay well under market. A rent review could add about $210/mo (some may move out).', 'Trim asking rents in Business, or win on quality.', '', null, undefined])
    assert.equal(priceAdviceText(t), t);
});
test('the live monthly report still stores the original advice text (sim.js unchanged)', () => {
  const sim = setup(61); for (let i = 0; i < 4; i++) sim.s.mkt.lostLog.push({ d: 40 + i, r: 'price', sz: '5x10', climate: false });
  sim.monthReport(61); const R = sim.s.mkt.reports.at(-1);
  assert.ok(R.sug.includes('4 shoppers left over price. Trim asking rents in Business, or win on quality.'), JSON.stringify(R.sug));
});
test('report shows reworded advice; stored report and whole state byte-identical after render', () => {
  const sim = setup(61); sim.monthReport(61); const R = sim.s.mkt.reports.at(-1); R.sug = [OLD_RIVAL, '14 shoppers wanted a 10x10 and found none available.'];
  const before = JSON.stringify(sim.s), html = uiFor(sim).reportHtml();
  assert.match(html, /8 shoppers turned down your asking rent; StorQuik Self Storage charges about 16% under market/);
  assert.doesNotMatch(html, /Trim asking rents/); assert.match(html, /14 shoppers wanted a 10x10/);
  assert.equal(JSON.stringify(sim.s), before); assert.equal(R.sug[0], OLD_RIVAL);
});
test('activity counts by size only: climate preference is not split; only price and competitor count', () => {
  const sim = setup(61); const L = sim.s.mkt.lostLog;
  L.push({ d: 40, r: 'price', sz: '5x10', climate: true }, { d: 41, r: 'competitor', sz: '5x10', climate: false }, { d: 42, r: 'noReady', sz: '5x10', climate: false }, { d: 43, r: 'ownerDeferred', sz: '5x10', climate: false }, { d: 44, r: 'shopping', sz: '5x10', climate: false });
  const r = pricingActivity(sim).rows.find(x => x.size === '5x10'); assert.equal(r.turned, 2);
});
test('activity window is the rolling 30 days ending today; older losses and signings excluded', () => {
  const sim = setup(61); const u = units(sim, '5x10').find(x => x.lease && sim.s.leases[x.lease]);
  assert.ok(u, 'fixture has a leased 5x10'); const others = units(sim, '5x10').filter(x => x !== u && x.lease);
  for (const x of others) sim.s.leases[x.lease].start = 1;
  sim.s.leases[u.lease].start = 31; sim.s.mkt.lostLog.push({ d: 31, r: 'price', sz: '5x10', climate: false }, { d: 32, r: 'price', sz: '5x10', climate: false });
  let r = pricingActivity(sim).rows.find(x => x.size === '5x10'); assert.equal(r.signed, 0); assert.equal(r.turned, 1); assert.deepEqual(pricingActivity(sim).period, { start: 32, end: 61 });
  sim.s.leases[u.lease].start = 61; r = pricingActivity(sim).rows.find(x => x.size === '5x10'); assert.equal(r.signed, 1);
});
test('ready now excludes leased, unready and blocked units', () => {
  const sim = setup(61); const free = units(sim, '5x10').filter(x => !x.lease); assert.ok(free.length >= 1, 'fixture has a vacant 5x10');
  const ready = () => pricingActivity(sim).rows.find(x => x.size === '5x10')?.ready ?? 0; // a size with no activity is omitted
  for (const x of free) x.commercial = 'unready'; assert.equal(ready(), 0);
  free[0].commercial = 'ready'; free[0].blocked = true; assert.equal(ready(), 0);
  free[0].blocked = false; assert.equal(ready(), 1);
});
test('Business shows the Last 30 days block under Asking rents with the caution note; nothing mutated', () => {
  const sim = setup(61); sim.s.mkt.lostLog.push({ d: 50, r: 'price', sz: '5x10', climate: false });
  const before = JSON.stringify(sim.s), html = pricingActivityHtml(sim);
  assert.match(html, /<b>Last 30 days<\/b> · Days 32–61/); assert.match(html, /5x10: \d+ signed and still renting · 1 turned down the price · \d+ ready to rent now/);
  assert.match(html, /Counts show what happened, not what caused it\./); assert.equal(JSON.stringify(sim.s), before);
});
test('no activity and no units -> no markup', () => {
  const sim = setup(61); for (const u of Object.values(sim.s.objects)) if (u.type === 'unit') u.cstate = 'construction';
  assert.equal(pricingActivityHtml(sim), '');
});
test('Pause, asks, cash and RNG state untouched by rendering', () => {
  const sim = setup(61); sim.s.mkt.lostLog.push({ d: 50, r: 'competitor', sz: '5x5', climate: false });
  const snap = JSON.stringify({ speed: sim.s.speed, ask: sim.s.market.ask, cash: sim.s.cash, rng: sim.s.rng, seed: sim.s.seed });
  pricingActivityHtml(sim); priceAdviceText(OLD_RIVAL);
  assert.equal(JSON.stringify({ speed: sim.s.speed, ask: sim.s.market.ask, cash: sim.s.cash, rng: sim.s.rng, seed: sim.s.seed }), snap); assert.equal(sim.s.speed, 0);
});
console.log(`${passes} pricing guidance focused checks passed`);
