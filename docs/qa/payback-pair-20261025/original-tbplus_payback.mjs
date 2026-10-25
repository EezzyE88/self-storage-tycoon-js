// Real minute-by-minute payback: collected rent from the added units less incremental
// incurred OPEX and attributable vendor/clean-out costs. Includes lease-up, missed
// payments, wear, competition and actual cart/customer routing. Existing Owner + Porter.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { ROLES } from '../../js/data.js';
import { cents } from '../../js/finance.js';

const action = (tool, x, y, xx = x, yy = y, extra = {}) => ({ tool, a: { x, y }, b: { x: xx, y: yy }, f: 0, ...extra });
function plans(kind) {
  if (kind === 'infill') return [action('du10x10', 13, 18, 13, 25)];
  const large = kind !== 'complete6', top = kind === 'complete12' ? 2 : 4, last = large ? 14 : 12, unitTop = top + 1, unitEnd = large ? 14 : 10;
  return [action('aisle', 28, 15, 35, 17), ...(!large ? [action('walk', 28, 13, 35, 14)] : []), action('loading', 32, 15, 33, 16),
    action('shell1', 29, top, 36, last), action('hall', 32, unitTop, 32, last), action('doorWide', 32, last),
    ...(large ? (top === 2 ? [4, 8, 12] : [5, 9, 13]) : [8, 11]).map((y) => action('light', 32, y)), action('hvac', 28, 8),
    action('iu10x10', 31, unitTop, 31, unitEnd, { climate: true }), action('iu10x10', 33, unitTop, 33, unitEnd, { climate: true }),
    action('corral', 34, 16)];
}
function run(kind, seed) {
  const sim = makeMaple(seed), s = sim.s; s.mode = 'sandbox'; s.tut = { on: false, done: true }; s.open = true;
  sim.dispatch({ type: 'hire', role: 'porter' });
  const original = new Set(Object.keys(s.objects)), base = sim.dailyOpex(), added = new Set(), newNumbers = new Set();
  let invested = 0, revenue = 0, cost = 0, vendors = 0, builtDay = null, paidBackDay = null, blockedSamples = 0, ownerExhausted = 0;
  const money = sim.money.bind(sim);
  sim.money = (amount, cat, note) => {
    const num = /Unit (\d+)/.exec(note || '');
    if (num && newNumbers.has(+num[1])) { if (cat === 'rent') revenue += amount; else if (cat === 'service') cost -= amount; }
    return money(amount, cat, note);
  };
  const buyCarts = sim.act_buyCarts.bind(sim);
  sim.act_buyCarts = (a) => { const attributable = added.has(String(a.corral)), before = s.cash; const r = buyCarts(a); if (r.ok && attributable) invested += before - s.cash; return r; };
  const vendor = sim.act_callVendor.bind(sim);
  sim.act_callVendor = (a) => { const t = s.tasks.find((x) => x.id === a.task), attributed = t && added.has(String(t.obj)); const before = s.cash; const r = vendor(a); if (r.ok && attributed) vendors += before - s.cash; return r; };
  const end = 630 * 1440 + 420;
  while (s.t < end && !paidBackDay) {
    if (sim.mod === 9 * 60) {
      if (sim.objs('unit').some((u) => u.cstate === 'ready')) sim.dispatch({ type: 'commission', all: true });
      for (const t of s.tasks.filter((x) => !x.assigned && !x.vendor && x.type === 'repair')) {
        if (ROLES.owner.can.includes(t.need)) sim.dispatch({ type: 'ownerTask', task: t.id });
        else if (sim.financialPosition({ spend: 650 }).available >= 0) sim.dispatch({ type: 'callVendor', task: t.id });
      }
      for (const c of [...s.convos]) if (c.actions && c.actions.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
      if ((sim.day - 1) % 30 === 0) for (const k of Object.keys(s.market.ask)) { const [size, env] = k.split('|'); sim.dispatch({ type: 'setRent', key: k, v: Math.round(sim.marketRent({ size, env }) * 0.95 / 5) * 5 }); }
      if (sim.day === 31) {
        builtDay = sim.day;
        for (const a of plans(kind)) { const P = sim.plan(a), r = sim.dispatch({ type: 'build', ...a }); assert.ok(r.ok, `${kind}: ${a.tool}: ${r.msg}`); invested += P.cost; }
        for (const o of Object.values(s.objects)) if (!original.has(String(o.id))) { added.add(String(o.id)); if (o.type === 'unit') newNumbers.add(o.num); }
      }
      if (builtDay && kind !== 'infill') { const corral = sim.objs('corral').find((c) => added.has(String(c.id))); if (corral && corral.cstate === 'operating' && !s.carts.some((c) => c.home === corral.id)) sim.dispatch({ type: 'buyCarts', corral: corral.id, n: 2 }); }
      if (sim.day === 34 && builtDay) { const r = sim.dispatch({ type: 'ad', kind: 'size', target: '10x10' }); if (r.ok) invested += 250; }
    }
    sim.step(); sim.events.length = 0;
    if (builtDay && sim.mod === 420) {
      // The original asset burden follows the identical authoritative per-category cost curve.
      const k = sim.costIdx(), baseline = Object.entries(base).filter(([key]) => !['total', 'payroll'].includes(key)).reduce((n, [, v]) => n + cents(v * k), 0);
      cost += Math.max(0, cents(sim.dailyOpex().total - baseline));
      if (sim.objs('unit').filter((u) => newNumbers.has(u.num)).some((u) => u.blocked || (u.cstate === 'built' && (u.missing || []).length))) blockedSamples++;
      if (revenue - cost - vendors >= invested) paidBackDay = sim.day;
    }
    if (builtDay && sim.mod === 1439) { const owner = s.staff.find((st) => st.role === 'owner'); if ((owner.workUsed || 0) >= 8) ownerExhausted++; }
  }
  return { kind, seed, units: newNumbers.size, invested, paidBackDay, monthsFromCommit: paidBackDay ? +((paidBackDay - builtDay) / 30).toFixed(2) : null, rentCollected: Math.round(revenue), incrementalOpex: Math.round(cost), vendors: Math.round(vendors), netContribution: Math.round(revenue - cost - vendors), finalNewLeased: sim.objs('unit').filter((u) => newNumbers.has(u.num) && u.lease).length, blockedSamples, ownerExhausted };
}
const results = ['infill', 'complete6', 'complete10', 'complete12'].flatMap((kind) => [2026, 4401, 424242].map((seed) => run(kind, seed)));
console.log('PAYBACK_RESULTS ' + JSON.stringify(results));
assert.ok(results.every((r) => r.blockedSamples === 0), 'layouts must provide usable rentable inventory');
assert.ok(results.every((r) => Object.values(r).every((v) => typeof v !== 'number' || Number.isFinite(v))));
assert.ok(results.filter((r) => r.kind === 'infill').every((r) => r.monthsFromCommit > 0 && r.monthsFromCommit < 12), 'reuse of infrastructure and spare work capacity should allow faster infill');
assert.ok(results.filter((r) => r.kind === 'complete10').every((r) => r.monthsFromCommit > 0 && r.monthsFromCommit <= 18), 'well-used complete package must pay back within the benchmark upper bound');
assert.ok(results.filter((r) => r.kind === 'complete6').every((r) => r.monthsFromCommit == null || r.monthsFromCommit > 18), 'undersized package should expose its overhead disadvantage');
console.log('ALL PASS: live-simulation expansion comparisons completed; benchmark assessment uses observed payback');
