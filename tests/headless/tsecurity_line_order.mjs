// SL-1 Q12 (consolidated spec §9, FCPR D3): gate-first, office-first and units-first construction orders
// each reach Open with the same final layout, through ordinary build actions only. Also Q13: inefficient but
// compliant layouts (deep public lot, far Parking, corner gate) open and run 30 days.
import assert from 'node:assert/strict';
import { slLayout, runDays } from './sl1_fixtures.mjs';
import { openNeeds } from '../../js/openingguide.js';

let n = 0; const ok = (m) => { n++; console.log('PASS ' + m); };
const layoutOf = (sim) => JSON.stringify([
  Object.values(sim.s.objects).map((o) => [o.type, o.x, o.y, o.w, o.h, o.rotation ?? o.rot ?? null, o.dir ?? null, o.size ?? null, o.cstate]).sort(),
  sim.s.ground, sim.s.secLine]);
const opens = (sim, label) => {
  assert.deepEqual(sim.openingIssues(), [], `${label}: ${sim.openingIssues().join('; ')}`);
  assert.deepEqual(openNeeds(sim), [], `${label}: still needed ${openNeeds(sim).map((x) => x.key)}`);
  const r = sim.dispatch({ type: 'open' }); assert.ok(r.ok, r.msg); assert.equal(sim.s.open, true);
};
const prospectsStayOut = (sim, days) => {
  let yard = 0, tenantsIn = 0, stuck = 0; const seen = new Map();
  runDays(sim, days, (t) => {
    for (const a of sim.s.agents) {
      const x = Math.floor(a.x), y = Math.floor(a.y), side = sim.secureSide(x, y);
      if (a.vt === 'prospect' && !a.hidden && side === 'yard') yard++;
      if (a.vt === 'tenant' && side === 'yard') tenantsIn++;
      if (t % 60 === 0) { const k = `${a.id}`; const p = `${a.x.toFixed(2)},${a.y.toFixed(2)},${a.st}`; const prev = seen.get(k); if (prev && prev.p === p) { prev.n++; if (prev.n > 12 && !a.hidden && !/office|wait|park|unit|idle|work/i.test(a.st || '')) stuck++; } else seen.set(k, { p, n: 0 }); }
    }
  });
  return { yard, tenantsIn, stuck };
};

const base = layoutOf(slLayout({ order: 'gate' }));
for (const order of ['gate', 'office', 'units']) {
  const sim = slLayout({ order });
  assert.equal(layoutOf(sim), base, `${order}-first final layout differs`);
  opens(sim, order);
  ok(`${order}-first reaches Open with the same final layout`);
}
for (const order of ['office', 'units']) {
  const sim = slLayout({ order, staff: 'gate' });
  opens(sim, order + '/gate-walk');
  ok(`${order}-first with a gate-walk office (no line contact) reaches Open`);
}

// Q13 inefficient but compliant layouts: open, run 30 days, prospects never enter the yard.
for (const [label, opts] of [['deep public lot (10 rows)', { L: 19 }], ['far Parking (east of the drive)', { farParking: true }], ['east corner gate (column 36)', { gx: 36 }], ['two gates', { gates: 2 }]]) {
  const sim = slLayout(opts); opens(sim, label);
  const r = prospectsStayOut(sim, 30);
  assert.equal(r.yard, 0, `${label}: prospect seen in the yard`);
  assert.ok(sim.objs('unit').some((u) => u.lease != null), `${label}: no leases in 30 days`);
  ok(`${label}: opens, 30 days, prospects stay out of the yard, units lease`);
}
console.log(`${n} security line build-order checks passed`);
