// SL-1 I6 legacy-equivalence helpers, shared by the abaf108 generator and tsecurity_line_equiv.mjs.
// Everything here takes the game modules as arguments so the same code runs against either source tree.
import { createHash } from 'node:crypto';

const sha = (x) => createHash('sha256').update(x).digest('hex');

// Edge-for-edge digests of every routing graph: vehNbr for null (all gates), each gate and publicDrive;
// pedNbr for customers (no actor) and staff, on every floor.
export function graphDigests(sim, publicDrive) {
  sim.ensure(); sim.rebuild?.();
  const s = sim.s, WH = s.W * s.H, floors = sim.D.walk.length, out = {};
  const veh = (key) => { const rows = []; for (let i = 0; i < WH; i++) rows.push(i + ':' + sim.vehNbr(i, key).slice().sort((a, b) => a - b).join(',')); return sha(rows.join('\n')); };
  out['veh:all'] = veh(null);
  for (const g of Object.values(s.objects).filter((o) => o.type === 'gate').sort((a, b) => a.id - b.id)) out['veh:gate' + g.id] = veh(g.id);
  out['veh:public'] = veh(publicDrive);
  for (const [k, actor] of [['ped:customer', null], ['ped:staff', { kind: 'staff' }]]) {
    const rows = []; for (let n = 0; n < WH * floors; n++) rows.push(n + ':' + sim.pedNbr(n, actor).slice().sort((a, b) => a - b).join(','));
    out[k] = sha(rows.join('\n'));
  }
  out.vehReach = sha(Array.from(sim.D.vehReach).join(''));
  out.openingIssues = sim.openingIssues().join('|');
  return out;
}
// Daily digests of the whole saved state over `days` days.
export function trace(sim, days) {
  const out = [];
  for (let d = 0; d < days; d++) { for (let t = 0; t < 1440; t++) { sim.step(); sim.events.length = 0; } out.push(sha(JSON.stringify(sim.s))); }
  return out;
}

// The legacy layout: front-row gate, yard office, Parking and units, all built through dispatch (abaf108 rules).
export function legacyLayout(sim) {
  const B = (tool, a, b, x = {}) => { const r = sim.dispatch({ type: 'build', tool, a, b: b || a, f: 0, ...x }); if (!r.ok) throw new Error(`${tool}: ${r.msg}`); const o = sim.s.orders.find((q) => q.id === r.order); if (o?.st === 'construction') sim.completeOrder(o); return r; };
  B('aisle', { x: 20, y: 29 }, { x: 21, y: 8 }); B('gate', { x: 20, y: 29 }); B('parking', { x: 20, y: 25 }); B('walk', { x: 19, y: 25 });
  B('office', { x: 16, y: 26 });
  B('du10x10', { x: 22, y: 10 }, { x: 22, y: 26 }); B('du10x10', { x: 18, y: 10 }, { x: 18, y: 22 });
  sim.dispatch({ type: 'commission', all: true }); sim.ensure();
}

// Fixture recipes (Q2): built identically in both trees. `days` = days run before saving.
export function fixtures({ makeSandbox, makeScenario }) {
  const sb = (o) => () => { const sim = makeSandbox(o); sim.s.tut = { on: false, done: true }; sim.ensure(); return sim; };
  const built = (o, open, days) => () => { const sim = sb(o)(); legacyLayout(sim); if (open) { const r = sim.dispatch({ type: 'open' }); if (!r.ok) throw new Error('open: ' + r.msg); } for (let t = 0; t < 1440 * days; t++) { sim.step(); sim.events.length = 0; } return sim; };
  return {
    'sandbox-blank': sb({ kind: 'business', market: 'blank' }),
    'sandbox-urban': sb({ kind: 'business', market: 'urban' }),
    'sandbox-rural': sb({ kind: 'business', market: 'rural' }),
    'sandbox-urban-legacy-built': built({ kind: 'business', market: 'urban', cash: 200000 }, false, 0),
    'sandbox-blank-legacy-open': built({ kind: 'business', market: 'blank', cash: 200000 }, true, 20),
    'freebuild-legacy-open': built({ kind: 'free' }, true, 5),
    'acquired-parcel-blank': () => makeSandbox({ market: 'blank', cash: 0, plain: true }),
    'acquired-parcel-rural': () => makeSandbox({ market: 'rural', cash: 0, plain: true }),
    ...Object.fromEntries(['turnaround', 'vertical', 'climate', 'freightlift', 'campus'].map((id) => ['scenario-' + id, () => makeScenario(id)])),
    'maple-starter-frontage': () => makeSandbox({ kind: 'business', start: 'starter' }),
  };
}
