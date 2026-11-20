// Office Step 2: one moving-supplies basket at the lease counter (Plan Rev 1, Nov 19 2026).
// Price = 40% of the market's 5x5 street rent, cost = 50% of the price (x the sandbox operating-cost option).
// A basket sells on every second lease signed at the counter while the Office toggle is on and the tutorial is not running.
// No RNG draw, no stock, no extra trip or Owner time. Price and cost are both booked to 'anc', so operating
// contribution (rent - opex - payroll) is unchanged and cash moves only by the margin.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { makeSandbox, makeScenario } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
import { MARKETS } from '../../js/data.js';
import { SUPPLIES, basketTerms, sellAtCounter, suppliesActive, suppliesSummary } from '../../js/supplies.js';
import { beatIndex, curBeat, tutorialTick } from '../../js/tutorial.js';
import { ensureCustomerAccounts } from '../../js/customeraccounts.js';
import { UI } from '../../js/ui.js';

let passed = 0;
const test = (name, run) => { run(); passed++; console.log('PASS ' + name); };
const json = (x) => JSON.parse(JSON.stringify(x));

// A graduated Maple (career) with eight vacant, ready units, so prospects sign at the counter.
function career(seed = 4242) {
  const sim = makeMaple(seed), s = sim.s;
  Object.assign(s.tut, { on: false, done: true }); s.open = true;
  const leased = sim.objs('unit').filter((u) => u.lease).sort((a, b) => a.id - b.id);
  for (const u of leased.filter((_, i) => i % 3 === 0)) { const L = s.leases[u.lease]; delete s.tenants[L.tenant]; delete s.leases[L.id]; u.lease = null; u.commercial = 'ready'; }
  s.visits = s.visits.filter((v) => !v.tenant || s.tenants[v.tenant]); ensureCustomerAccounts(s);
  sim.rebuild(); return sim;
}
// Passive play with counters on the real lease paths. Owner questions get their default answer every 30 minutes.
function instrument(sim) {
  const R = { draws: 0, counter: [], online: 0 };
  const rnd = sim.rnd.bind(sim); sim.rnd = () => { R.draws++; return rnd(); };
  const dl = sim.decideLease.bind(sim);
  sim.decideLease = (v, ag) => { const L = dl(v, ag); if (L) { if (ag) R.counter.push({ id: L.id, n: sim.s.supplies.n, t: sim.s.t }); else R.online++; } return L; };
  return R;
}
function play(sim, days) {
  const s = sim.s, end = sim.day + days;
  while (sim.day < end) {
    sim.step(); sim.events.length = 0;
    if (sim.mod % 30 === 0) for (const c of [...s.convos]) { if (sim.reviewHeld?.(c) || c.staffHandling) continue; const i = c.def ?? c.auto ?? 0; if (c.actions && c.actions[i]) sim.dispatch({ type: 'convo', id: c.id, i }); }
  }
}
const supplyRows = (s) => s.ledger.filter((r) => /^(Moving supplies|Supplies cost) - /.test(r.note || ''));
const stripSupplies = (st) => { const x = json(st); delete x.supplies; delete x.policies.supplies; return x; };

test('prices follow the accepted rule in every market, and the sandbox cost option scales cost only', () => {
  const want = { maple: [30, 15], blank: [32.5, 16.25], urban: [42.5, 21.25], rural: [22.5, 11.25] };
  assert.deepEqual(Object.keys(want).sort(), Object.keys(MARKETS).sort());
  for (const [id, [price, cost]] of Object.entries(want)) {
    assert.equal(MARKETS[id].rent['5x5'] * SUPPLIES.priceShare, price);
    assert.deepEqual(basketTerms({ market: { id } }), { price, cost }, id);
  }
  assert.deepEqual(basketTerms({ market: { id: 'maple' }, opts: { costs: 0.8 } }), { price: 30, cost: 12 });
  assert.deepEqual(basketTerms({ market: { id: 'blank' }, opts: { costs: 1.25 } }), { price: 32.5, cost: 20.31 });
  assert.equal(basketTerms({ market: { id: 'nowhere' } }), null);
  assert.equal(SUPPLIES.every, 2);
});

test('new games default the Office toggle on everywhere; only the running tutorial blocks sales', () => {
  const fresh = makeMaple(9); assert.equal(fresh.s.policies.supplies, true); assert.equal(suppliesActive(fresh.s), false, 'tutorial running');
  for (const sim of [makeScenario('turnaround'), makeScenario('vertical'), makeScenario('climate'), makeScenario('comeback'),
    makeSandbox({ kind: 'business' }), makeSandbox({ kind: 'business', start: 'starter' }), makeSandbox({ kind: 'free' }), career()]) {
    assert.equal(sim.s.policies.supplies, true); assert.equal(suppliesActive(sim.s), true, sim.s.mode);
    assert.deepEqual([sim.s.supplies.n, sim.s.supplies.sold], [0, 0]);
  }
});

test('a basket sells on every second counter lease; online and additional-unit leases never count or sell', () => {
  const sim = career(), s = sim.s, R = instrument(sim), cash0 = s.cash; play(sim, 60);
  assert.ok(R.counter.length >= 6, `counter leases ${R.counter.length}`); assert.ok(R.online >= 1, `online leases ${R.online}`);
  assert.equal(s.supplies.n, R.counter.length, 'only counter leases advance the counter');
  assert.equal(s.supplies.sold, Math.floor(R.counter.length / 2));
  R.counter.forEach((c, i) => assert.equal(c.n, i)); // read as decideLease returns, just before the counter's sale hook
  const rows = supplyRows(s), sales = rows.filter((r) => r.note.startsWith('Moving'));
  assert.equal(rows.length, 2 * s.supplies.sold); assert.ok(rows.every((r) => r.cat === 'anc'));
  sales.forEach((r, k) => { assert.equal(r.amt, 30); assert.equal(r.t, R.counter[2 * k + 1].t, 'sold in the same minute as the 2nd, 4th, ... counter lease'); });
  assert.ok(rows.filter((r) => r.note.startsWith('Supplies cost')).every((r) => r.amt === -15));
  const L = s.leases[R.counter[1].id], u = s.objects[L.unit]; assert.equal(sales[0].note, `Moving supplies - Unit ${u.num}`);
  assert.deepEqual([s.supplies.revenue, s.supplies.cost], [30 * s.supplies.sold, 15 * s.supplies.sold]);
  // The additional-unit (CR-01) and online paths call decideLease without a counter agent: no sale, no count.
  const n0 = s.supplies.n, cashBefore = s.cash, ready = sim.objs('unit').find((x) => x.cstate === 'operating' && x.commercial === 'ready');
  if (ready) { const L2 = sim.decideLease({ size: ready.size, climate: ready.env === 'climate', keen: true }, null); if (L2) assert.equal(s.cash, cashBefore + L2.rent); }
  assert.equal(s.supplies.n, n0); assert.ok(s.cash !== cash0);
});

test('same seed ON vs OFF: identical RNG draws, leases and contribution; cash differs by exactly the margin', () => {
  const run = (on) => { const sim = career(77), s = sim.s; s.policies.supplies = on; const R = instrument(sim); play(sim, 60);
    return { sim, s, R, rngS: s.rngS, leases: Object.keys(s.leases).join(), tenants: Object.keys(s.tenants).length, lost: JSON.stringify(s.lost), rep: sim.reputation(), contrib: sim.metric('contrib30'), op: sim.opResult(30).amt }; };
  const A = run(true), B = run(false);
  assert.ok(A.s.supplies.sold >= 3); assert.equal(B.s.supplies.sold, 0); assert.equal(B.s.supplies.n, 0, 'toggle off: counter does not advance');
  for (const k of ['rngS', 'leases', 'tenants', 'lost', 'rep', 'contrib']) assert.deepEqual(A[k], B[k], k);
  assert.equal(A.R.draws, B.R.draws, 'RNG draw count');
  const margin = A.s.supplies.revenue - A.s.supplies.cost;
  assert.equal(Math.round((A.s.cash - B.s.cash) * 100) / 100, margin);
  const recent = suppliesSummary(A.sim); // opResult is rounded to whole dollars
  assert.ok(Math.abs(A.op - B.op - recent.margin) <= 1, 'opResult differs by the 30-day margin');
  for (const k of ['rent', 'opex', 'payroll']) assert.equal(A.s.days.reduce((a, d) => a + (d[k] || 0), 0), B.s.days.reduce((a, d) => a + (d[k] || 0), 0), k);
});

test('tutorial: no sale or count while it runs; sales start after the real graduation completes', () => {
  const sim = career(4242), s = sim.s; Object.assign(s.tut, { on: true, done: false, beat: beatIndex('hire'), entered: true });
  assert.equal(suppliesActive(s), false);
  const R = instrument(sim); play(sim, 20);
  assert.ok(R.counter.length >= 2, 'counter leases during the tutorial'); assert.deepEqual([s.supplies.n, s.supplies.sold], [0, 0]); assert.equal(supplyRows(s).length, 0);
  assert.equal(suppliesSummary(sim).blocked, true);
  // Graduation through the production path: the graduation beat becomes current and Finish tutorial completes it.
  const G = beatIndex('grad'); Object.assign(s.tut, { beat: G, beatId: 'grad', beatAt: G, entered: true }); assert.equal(curBeat(sim).id, 'grad');
  sim.dispatch({ type: 'tutFlag', flag: 'grad' }); tutorialTick(sim);
  assert.equal(s.tut.done, true); assert.equal(s.milestones.graduated != null, true); assert.equal(suppliesActive(s), true);
  const before = R.counter.length; s.speed = 1; play(sim, 40);
  const after = R.counter.length - before; assert.ok(after >= 2, `post-graduation counter leases ${after}`);
  assert.equal(s.supplies.n, after); assert.equal(s.supplies.sold, Math.floor(after / 2));
  assert.equal(supplyRows(s)[0].t, R.counter[before + 1].t, 'first basket is the second counter lease after graduation');
});

test('old saves: load with no retroactive cash or ledger rows, then sell from the next counter leases', () => {
  const base = career(31); play(base, 5);
  const old = stripSupplies(base.s); assert.equal(old.supplies, undefined); assert.equal(old.policies.supplies, undefined);
  const cash = old.cash, ledger = JSON.stringify(old.ledger), days = JSON.stringify(old.days);
  const sim = new Sim(json(old)), s = sim.s;
  assert.equal(s.cash, cash); assert.equal(JSON.stringify(s.ledger), ledger); assert.equal(JSON.stringify(s.days), days);
  assert.equal(s.policies.supplies, true); assert.deepEqual([s.supplies.n, s.supplies.sold, s.supplies.revenue, s.supplies.cost, s.supplies.log.length], [0, 0, 0, 0, 0]);
  // A save from an unfinished tutorial loads blocked.
  const tut = stripSupplies(makeMaple(5).s), T = new Sim(json(tut)); assert.equal(T.s.policies.supplies, true); assert.equal(suppliesActive(T.s), false);
  // Damaged counters heal to zero without touching cash.
  const bad = json(base.s); bad.supplies = { n: 'x', sold: null }; const H = new Sim(bad);
  assert.deepEqual([H.s.supplies.n, H.s.supplies.sold, H.s.supplies.log.length], [0, 0, 0]); assert.equal(H.s.cash, base.s.cash);
  const R = instrument(sim); play(sim, 40); assert.ok(R.counter.length >= 2);
  assert.equal(s.supplies.sold, Math.floor(R.counter.length / 2)); assert.equal(supplyRows(s).length, 2 * s.supplies.sold);
});

test('save and reload: no duplicate sale, and the counter continues exactly as an unbroken run', () => {
  const ref = career(55); instrument(ref); play(ref, 90);
  const a = career(55), RA = instrument(a); let saved = null;
  // stop right after a sale minute (the point a duplicate would show), save as main.js does (JSON of the state), reload
  while (!saved) { a.step(); a.events.length = 0; if (a.mod % 30 === 0) for (const c of [...a.s.convos]) { if (a.reviewHeld?.(c) || c.staffHandling) continue; const i = c.def ?? c.auto ?? 0; if (c.actions && c.actions[i]) a.dispatch({ type: 'convo', id: c.id, i }); }
    if (a.s.supplies.sold === 1) saved = JSON.stringify(a.s); }
  const st = JSON.parse(saved), before = { cash: st.cash, n: st.supplies.n, sold: st.supplies.sold, rows: supplyRows(st).length };
  const b = new Sim(st); assert.deepEqual({ cash: b.s.cash, n: b.s.supplies.n, sold: b.s.supplies.sold, rows: supplyRows(b.s).length }, before, 'reload books nothing');
  const end = ref.day; const left = end - b.day; play(b, left);
  assert.equal(b.day, ref.day); assert.equal(b.s.t, ref.s.t);
  assert.deepEqual([b.s.supplies.n, b.s.supplies.sold, b.s.supplies.revenue, b.s.supplies.cost], [ref.s.supplies.n, ref.s.supplies.sold, ref.s.supplies.revenue, ref.s.supplies.cost]);
  assert.equal(b.s.cash, ref.s.cash); assert.equal(supplyRows(b.s).length, supplyRows(ref.s).length); assert.equal(b.s.rngS, ref.s.rngS);
  assert.ok(ref.s.supplies.sold >= 2);
});

test('Office row: On, Off and tutorial states; toggle flips only the policy; manual Pause runs nothing', () => {
  const sim = career(); const s = sim.s; s.speed = 0;
  const ui = Object.create(UI.prototype); ui.g = { sim, rend: { view: 'ext', setSelection() {} }, audio: { unlock() {} } };
  ui.title = false; ui.sfx = () => {}; ui.renderSheet = () => {}; ui.root = { querySelectorAll: () => [] };
  const row = () => (ui.officePanelHtml().match(/<section class="office-row" aria-label="Moving supplies">.*?<\/section>/) || [''])[0];
  assert.match(row(), /<b>Supplies · On<\/b>/); assert.match(row(), /Basket \$30 · cost \$15 · every second lease signed at the counter/);
  assert.match(row(), /0 sold in 30 days · \$0 margin/); assert.match(row(), /class="toggle on" data-a="policy" data-v="supplies"/);
  const frozen = JSON.stringify(s); row(); assert.equal(JSON.stringify(s), frozen, 'rendering the row writes nothing');
  const click = (dataset) => ui.onClick({ target: { closest: () => ({ dataset, closest: () => null }) } });
  const cash = s.cash, t = s.t; click({ a: 'policy', v: 'supplies' });
  assert.equal(s.policies.supplies, false); assert.equal(s.cash, cash); assert.equal(s.t, t); assert.equal(s.speed, 0, 'toggle keeps manual Pause');
  assert.match(row(), /<b>Supplies · Off<\/b>/); assert.match(row(), /class="toggle " data-a="policy" data-v="supplies"/);
  click({ a: 'policy', v: 'supplies' }); assert.equal(s.policies.supplies, true);
  s.tut.done = false; assert.match(row(), /<b>Supplies · Starts after the tutorial<\/b>/); s.tut.done = true;
  const U = makeScenario('vertical'); ui.g.sim = U; assert.match(row(), /Basket \$42\.50 · cost \$21\.25/); ui.g.sim = sim;
  // A sale happens only inside sim.step(); main.js does not step while speed is 0. Paused UI work never sells.
  const S0 = JSON.stringify(s.supplies); for (let i = 0; i < 50; i++) { row(); click({ a: 'policy', v: 'supplies' }); }
  assert.equal(JSON.stringify(s.supplies), S0); assert.equal(s.cash, cash); assert.equal(s.t, t);
});

test('Office 30-day count and margin stay exact above 60 sales: 61 sales, the oldest ages out, save and reload', () => {
  const sim = career(61), s = sim.s, ready = sim.objs('unit').find((u) => u.num != null);
  const lease = (k) => ({ id: 900000 + k, unit: ready.id }); let k = 0;
  const sellOne = () => { assert.equal(sellAtCounter(sim, lease(k++)), null); assert.deepEqual(sellAtCounter(sim, lease(k++)), { price: 30, cost: 15 }); };
  const cash0 = s.cash, D = sim.day;
  sellOne(); // the oldest sale, on day D
  s.t += 1440; for (let i = 0; i < 60; i++) sellOne(); // 60 more on day D+1
  assert.equal(sim.day, D + 1); assert.equal(s.supplies.sold, 61); assert.equal(s.supplies.log.length, 61);
  assert.deepEqual([suppliesSummary(sim).sold, suppliesSummary(sim).margin], [61, 915]);
  assert.equal(Math.round((s.cash - cash0) * 100) / 100, 915); assert.equal(supplyRows(s).length, 122);
  const row = () => { const ui = Object.create(UI.prototype); ui.g = { sim: X, rend: { view: 'ext', setSelection() {} }, audio: { unlock() {} } }; ui.title = false; ui.root = { querySelectorAll: () => [] };
    return (ui.officePanelHtml().match(/(\d+) sold in 30 days · \$([\d,]+) margin/) || []).slice(1).join('|'); };
  let X = sim; assert.equal(row(), '61|915');
  // save and reload: the full window survives, nothing is booked again
  const saved = JSON.stringify(s), R = new Sim(JSON.parse(saved));
  assert.equal(R.s.supplies.log.length, 61); assert.equal(R.s.cash, s.cash); assert.equal(supplyRows(R.s).length, 122);
  X = R; assert.equal(row(), '61|915');
  // day D+29 is the last day of the oldest sale's window; on day D+30 it ages out
  R.s.t += 28 * 1440; assert.equal(R.day, D + 29); X = R; assert.equal(row(), '61|915');
  R.s.t += 1440; assert.equal(R.day, D + 30); assert.deepEqual([suppliesSummary(R).sold, suppliesSummary(R).margin], [60, 900]); assert.equal(row(), '60|900');
  // the next sale prunes only entries outside the window; lifetime totals are untouched
  const sim2 = R; const sell2 = () => { sellAtCounter(sim2, lease(k++)); sellAtCounter(sim2, lease(k++)); }; sell2();
  assert.equal(R.s.supplies.log.length, 61); assert.ok(R.s.supplies.log.every((x) => x.day >= D + 1));
  assert.deepEqual([R.s.supplies.sold, R.s.supplies.revenue, R.s.supplies.cost], [62, 1860, 930]); assert.deepEqual([suppliesSummary(R).sold, suppliesSummary(R).margin], [61, 915]);
  // the rest of day D+1 ages out on day D+31
  R.s.t += 1440; assert.deepEqual([suppliesSummary(R).sold, suppliesSummary(R).margin], [1, 15]);
});

console.log('LIMIT: headless simulation only; Office row checked as HTML here, rendered separately; Safari and physical iPhone not tested.');
console.log(`ALL PASS: ${passed} supplies basket groups`);
