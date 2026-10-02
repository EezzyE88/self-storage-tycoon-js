// Stress: densest lot at triple demand with a full staff, multi-year runs, array growth, save size, action bursts.
// usage: node tstress.mjs [A|B|C] [years]
import { makeSandbox } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { buildMaxLot } from './maxlot.mjs';
const which = process.argv[2] || 'A', YEARS = +(process.argv[3] || 3);
const sizes = (s) => ({ objects: Object.keys(s.objects).length, leases: Object.keys(s.leases).length, tenants: Object.keys(s.tenants).length, agents: s.agents.length, vehicles: s.vehicles.length, carts: s.carts.length, tasks: s.tasks.length, convos: (s.convos || []).length, visits: (s.visits || []).length, ledger: s.ledger.length, days: s.days.length, lost: (s.mkt.lostLog || []).length, reports: (s.mkt.reports || []).length, reviews: (s.mkt.reviews || []).length, mgrLog: (s.mgrLog || []).length });
const big = (s) => Object.entries(s).map(([k, v]) => [k, JSON.stringify(v).length]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, n]) => `${k} ${(n / 1024).toFixed(0)}KB`).join(', ');
const fixer = (sim) => { const s = sim.s; for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor)) { const r = sim.dispatch({ type: 'ownerTask', task: t.id }); if (!r.ok) sim.dispatch({ type: 'callVendor', task: t.id }); } for (const c of [...(s.convos || [])]) sim.dispatch({ type: 'convo', id: c.id, i: 0 }); };
function soak(sim, label, days, every = 60) {
  const s = sim.s; let worstDay = 0, peakAgents = 0, peakSave = 0; const rows = []; let tDay = performance.now();
  for (let d = 1; d <= days; d++) {
    for (let m = 0; m < 1440; m++) { sim.step(); if (s.agents.length > peakAgents) peakAgents = s.agents.length; if (m % 60 === 0) { sim.events.length = 0; if (m % 240 === 0) fixer(sim); } }
    sim.events.length = 0; const now = performance.now(); worstDay = Math.max(worstDay, now - tDay); const dayMs = now - tDay; tDay = now;
    if (d % 720 === 0 || d === 1) sim.dispatch({ type: 'commission', all: true });
    if (d % every === 0 || d === days) {
      const t0 = performance.now(); const code = JSON.stringify(s); const t1 = performance.now(); const c = new Sim(JSON.parse(code)); const t2 = performance.now(); c.step();
      peakSave = Math.max(peakSave, code.length);
      rows.push({ day: sim.day, dayMs: +dayMs.toFixed(1), saveKB: Math.round(code.length / 1024), stringifyMs: +(t1 - t0).toFixed(1), loadMs: +(t2 - t1).toFixed(1), cash: Math.round(s.cash), ...sizes(s) });
    }
  }
  console.log(`\n== ${label}`); console.table(rows);
  console.log(`worst game-day ${worstDay.toFixed(0)} ms (a game-day lasts 60 s real time at 1x, 15 s at 4x), peak agents ${peakAgents}, peak save ${(peakSave / 1024).toFixed(0)} KB, biggest keys: ${big(s)}`);
  return { worstDay, peakAgents, peakSave };
}
if (which === 'A') {
  const sim = makeSandbox({ kind: 'free', instant: true }); const s = sim.s; s.opts.demand = 3; const r = buildMaxLot(sim, { aisleW: 1 });
  for (let i = 0; i < 600; i++) sim.step(); sim.dispatch({ type: 'commission', all: true }); sim.dispatch({ type: 'open' });
  for (const [role, n] of [['manager', 1], ['clerk', 2], ['porter', 4], ['tech', 2]]) for (let k = 0; k < n; k++) sim.dispatch({ type: 'hire', role });
  console.log('max lot: builds', r.ok, 'units', sim.objs('unit').length, 'operating', sim.objs('unit').filter((u) => u.cstate === 'operating').length, 'staff', s.staff.length);
  soak(sim, `A: max lot (${sim.objs('unit').length} units), demand x3, 10 staff, ${YEARS} years`, 365 * YEARS, 90);
}
if (which === 'B') {
  const sim = makeMaple(); const s = sim.s; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = true;
  soak(sim, `B: Maple career, owner fixing everything, ${YEARS} years`, 365 * YEARS, 365);
}
if (which === 'C') {
  const sim = makeSandbox({ kind: 'business', cash: 250000 }); const s = sim.s; buildMaxLot(sim, { aisleW: 1 });
  let t0 = performance.now(), n = 0, ok = 0;
  for (let k = 0; k < 3000; k++) { const o = s.orders.find((x) => x.st === 'construction'); const r = o && k % 2 ? sim.dispatch({ type: 'cancelOrder', id: o.id }) : sim.dispatch({ type: 'build', tool: 'light', a: { x: 3 + (k % 30), y: 3 + (k % 20) }, b: { x: 3 + (k % 30), y: 3 + (k % 20) }, f: 0 }); n++; if (r.ok) ok++; }
  const ms = performance.now() - t0; const flows = s.days.concat([s.today]).reduce((a, d) => a + d.rent + (d.anc || 0) + d.other - d.opex - d.payroll - (d.service || 0) - d.capex - (d.debt || 0) - (d.interest || 0) + (d.fin || 0) + (d.inject || 0), 0);
  console.log(`C: ${n} build/cancel actions in one tick: ${ms.toFixed(0)} ms (${(ms / n).toFixed(2)} ms each), ${ok} accepted; cash ${Math.round(s.cash)} vs start + flows ${Math.round(250000 + flows)}; orders ${s.orders.length}`);
  for (let i = 0; i < 1440 * 5; i++) { sim.step(); sim.events.length = 0; } console.log('C: 5 days later OK, cash', Math.round(s.cash));
}
