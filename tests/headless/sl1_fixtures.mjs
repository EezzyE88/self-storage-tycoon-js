// SL-1 shared fixtures: classic lots built only through ordinary build actions, in any order.
import assert from 'node:assert/strict';
import { makeSandbox } from '../../js/scenarios.js';

export function emptyLot(opts = {}) {
  const sim = makeSandbox({ kind: 'business', ...opts }); sim.s.tut = { on: false, done: true }; sim.ensure();
  return sim;
}
export const build = (sim, tool, a, b = a, extra = {}) => {
  const r = sim.dispatch({ type: 'build', tool, a, b, f: 0, ...extra });
  assert.ok(r.ok, `${tool} ${JSON.stringify(a)}-${JSON.stringify(b)}: ${r.msg}`);
  return r;
};
export const idle = (sim) => { for (let t = 0; t < 30000 && sim.s.orders.some(o => o.st === 'construction'); t++) sim.step(); assert.ok(!sim.s.orders.some(o => o.st === 'construction'), 'construction finished'); };

// A complete SL-1 facility on the default 44x34 lot (parcel x 2..41, y 2..29).
//   L: line row (public lot depth = 29 - L). gx: gate column. gates: 1 or 2.
//   staff: 'backed' (office touches the yard: staff passage) or 'gate' (no line contact: staff walk to the gate).
//   order: 'gate' | 'office' | 'units' (first item built).
// The office (5x4, door facing the street) sits at x 4..8; customer Parking is on the front row at x 4..9.
export function slLayout({ L = 22, gx = 22, staff = 'backed', order = 'gate', gates = 1, units = 6, sim = emptyLot(), farParking = false } = {}) {
  const y1 = sim.s.parcel.y1, OX = 4;
  const oy = staff === 'backed' ? Math.min(L + 1, y1 - 5) : y1 - 5;
  if (staff === 'gate') assert.ok(oy > L + 1, 'gate-walk office needs a public lot at least 6 rows deep');
  const door = oy + 4, g2 = gx >= 30 ? gx - 8 : gx + 8;
  const px = farParking ? [gx + 4, gx + 9] : [OX, OX + 5];
  const drives = gates === 2 ? [gx, g2] : [gx];
  // A walkway along row y from xa to xb, in segments that leave every gate drive column an aisle.
  const walkAlong = (y, xa, xb) => {
    let x0 = xa;
    for (let x = xa; x <= xb + 1; x++) {
      const stop = x > xb || drives.some((d) => Math.abs(x - d) <= 1);
      if (stop) { if (x > x0) build(sim, 'walk', { x: x0, y }, { x: x - 1, y }); x0 = x + 1; }
    }
  };
  const parts = {
    gate() { build(sim, 'gate', { x: gx, y: L }); if (gates === 2) build(sim, 'gate', { x: g2, y: L }); },
    drive() {
      build(sim, 'aisle', { x: gx - 1, y: L + 1 }, { x: gx + 1, y: y1 });
      build(sim, 'aisle', { x: gx - 1, y: 4 }, { x: gx + 1, y: L - 1 });
      if (gates === 2) {
        build(sim, 'aisle', { x: g2 - 1, y: L + 1 }, { x: g2 + 1, y: y1 });
        build(sim, 'aisle', { x: g2 - 1, y: L - 2 }, { x: g2 + 1, y: L - 1 });
        build(sim, 'aisle', { x: Math.min(gx, g2) + 2, y: L - 2 }, { x: Math.max(gx, g2) - 2, y: L - 2 });
      }
    },
    parking() {
      build(sim, 'aisle', { x: Math.min(px[0], gx + 2), y: y1 }, { x: Math.max(px[1], gx - 2), y: y1 });
      idle(sim);
      build(sim, 'parking', { x: px[0], y: y1 }, { x: px[1], y: y1 });
    },
    office() {
      build(sim, 'walk', { x: OX, y: door }, { x: OX + 4, y: y1 - 1 });                       // door landing down to the parking row
      walkAlong(y1 - 1, OX + 5, Math.max(gx - 2, px[1]));                                    // along the front to the drive (and far Parking)
      if (staff === 'backed') {
        walkAlong(oy - 1, OX, gx - 2);                                                         // yard-side landing, to the yard aisle
      }
      idle(sim);
      build(sim, 'office', { x: OX, y: oy }, undefined, { rotation: 2 });
    },
    units() { for (let k = 0; k < units; k++) build(sim, 'du10x10', { x: gx - 2, y: 4 + k * 2 }, undefined, { rotation: 1 }); },
  };
  const seq = { gate: ['gate', 'drive', 'parking', 'office', 'units'], office: ['parking', 'office', 'units', 'gate', 'drive'], units: ['units', 'parking', 'office', 'gate', 'drive'] }[order];
  for (const k of seq) { parts[k](); idle(sim); } // each part finishes before the next (office landings need finished paving)
  sim.dispatch({ type: 'commission', all: true });
  return sim;
}
export function runDays(sim, days, each) { for (let t = 0; t < 1440 * days; t++) { sim.step(); if (each) each(t); } }
