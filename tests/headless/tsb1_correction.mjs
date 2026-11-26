// SB-1 correction (SB1-Q01, SB1-Q02), revised for SL-1: the checklist and the wait advice follow
// the actual site. Parking now means customer Parking in the public lot, reached from the street
// without a gate (SL-1 §8 items 3 and 4). Real Sim, empty-lot Business Sandbox, actions through dispatch.
// Changed from the abaf108 version (reason): Parking reached through the gate is no longer the rule (R0).
import assert from 'node:assert/strict';
import { makeSandbox } from '../../js/scenarios.js';
import { officeSiteStep, openNeeds, openingSteps } from '../../js/openingguide.js';

let checks = 0; const ok = (n) => { checks++; console.log('PASS ' + n); };
const L = 22, gx = 22;
const lot = () => {
  const sim = makeSandbox({ kind: 'business' }); sim.s.tut = { on: false, done: true }; sim.ensure();
  const p = sim.s.parcel;
  const idle = () => { for (let i = 0; i < 1440 * 20 && sim.s.orders.some((o) => o.st !== 'done'); i++) sim.step(); sim.ensure(); };
  const build = (a, wait = true) => { const r = sim.dispatch({ type: 'build', f: 0, ...a }); assert.ok(r.ok, JSON.stringify([a, r])); if (wait) idle(); };
  build({ tool: 'gate', a: { x: gx, y: L }, b: { x: gx, y: L } });
  build({ tool: 'aisle', a: { x: gx - 1, y: L + 1 }, b: { x: gx + 1, y: p.y1 } });
  build({ tool: 'aisle', a: { x: gx - 1, y: 4 }, b: { x: gx + 1, y: L - 1 } });
  return { sim, p, idle, build };
};
const need = (sim, k) => openNeeds(sim).find((n) => n.key === k);
const parkingLine = (sim) => openingSteps(sim)[1];

// SB1-Q01: office built on public Parking, then every Parking cell removed before opening.
{
  const { sim, p, build } = lot();
  build({ tool: 'aisle', a: { x: 4, y: p.y1 }, b: { x: gx - 2, y: p.y1 } });
  build({ tool: 'parking', a: { x: 4, y: p.y1 }, b: { x: 9, y: p.y1 } });
  build({ tool: 'walk', a: { x: 4, y: p.y1 - 1 }, b: { x: 8, y: p.y1 - 1 } });
  build({ tool: 'office', a: { x: 4, y: p.y1 - 5 }, b: { x: 4, y: p.y1 - 5 }, rotation: 2 });
  assert.equal(sim.objs('office')[0].cstate, 'operating');
  assert.ok(parkingLine(sim).done && !need(sim, 'parking')); ok('Q01 control: office built, Parking line done');
  for (let x = 4; x <= 9; x++) { const q = sim.plan({ tool: 'demolish', a: { x, y: p.y1 }, b: { x, y: p.y1 }, f: 0 }); assert.equal(q.status, 'valid', q.reasons.join(';')); build({ tool: 'demolish', a: { x, y: p.y1 }, b: { x, y: p.y1 }, quoteStamp: q.operation?.stamp }); }
  assert.equal(sim.s.open, false);
  assert.equal(parkingLine(sim).done, false, 'Parking line must not be done with no public bay'); ok('Q01: Parking line not done after parking removed');
  assert.ok(need(sim, 'parking')); ok('Q01: Parking is still needed');
  assert.ok(sim.openingIssues().some((m) => /^Office needs customer Parking in the public lot/.test(m))); ok('Q01: opening issues name public Parking');
  assert.equal(openingSteps(sim)[4].done, true); ok('Q01: drive line follows the real drive');
}

// SB1-Q02: pending Parking on a public pad with no drive from the street, while a drive exists elsewhere.
{
  const { sim, p, idle, build } = lot();
  const px = 6, py = L + 3; // pad in the public lot, away from the drive
  build({ tool: 'aisle', a: { x: px, y: py }, b: { x: px + 3, y: py + 1 } });
  assert.equal(sim.D.vehReach[sim.idx(px, py)], 0, 'pad is not reachable from the street');
  build({ tool: 'parking', a: { x: px, y: py }, b: { x: px + 3, y: py + 1 } }, false);
  assert.ok(sim.D.pendingGround.size > 0, 'parking pending');
  assert.ok(!need(sim, 'wait') && need(sim, 'parking')?.tool === 'parking'); ok('Q02: no wait advice for unreachable pending Parking');
  assert.equal(parkingLine(sim).done, false); ok('Q02: Parking line not done');
  idle();
  assert.ok(need(sim, 'parking')); ok('Q02: after completion still no public bay, item unchanged');
  // Control: pending Parking that the street will reach says wait, then clears.
  build({ tool: 'aisle', a: { x: 10, y: p.y1 }, b: { x: gx - 2, y: p.y1 } });
  build({ tool: 'parking', a: { x: 10, y: p.y1 }, b: { x: 14, y: p.y1 } }, false);
  assert.ok(need(sim, 'wait')); assert.match(need(sim, 'wait').msg, /Let the Parking paint finish/); ok('Q02 control: reachable pending Parking says wait');
  idle();
  assert.ok(!need(sim, 'wait') && !need(sim, 'parking')); assert.equal(parkingLine(sim).done, true); ok('Q02 control: wait advice was true');
  assert.equal(officeSiteStep(sim).key, 'office'); ok('Q02: the office is what is still needed next');
}
console.log(`${checks} SB-1 correction checks passed`);
