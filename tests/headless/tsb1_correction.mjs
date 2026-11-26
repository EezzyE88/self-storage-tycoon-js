// SB-1 correction (SB1-Q01, SB1-Q02): checklist and waiting guidance follow the
// actual site, not assumptions. Real Sim, empty-lot Business Sandbox, actions
// through dispatch (the same call Confirm makes).
import assert from 'node:assert/strict';
import { makeSandbox } from '../../js/scenarios.js';
import { officeSiteStep, openingSteps } from '../../js/openingguide.js';
import { classicOfficeGates, classicGateParking } from '../../js/mapleaccess.js';

let checks = 0; const ok = (n) => { checks++; console.log('PASS ' + n); };
const lot = () => {
  const sim = makeSandbox({ kind: 'business' }); sim.s.tut = { on: false, done: true }; sim.ensure();
  const p = sim.s.parcel, gx = Math.round((p.x0 + p.x1) / 2);
  const idle = () => { for (let i = 0; i < 1440 * 20 && sim.s.orders.some((o) => o.st !== 'done'); i++) sim.step(); sim.ensure(); };
  const build = (a, wait = true) => { const r = sim.dispatch({ type: 'build', f: 0, ...a }); assert.ok(r.ok, JSON.stringify([a, r])); if (wait) idle(); };
  build({ tool: 'gate', a: { x: gx, y: p.y1 }, b: { x: gx, y: p.y1 } });
  build({ tool: 'aisle', a: { x: gx, y: p.y1 - 1 }, b: { x: gx, y: p.y0 + 4 } });
  return { sim, p, gx, idle, build };
};
const reachable = (sim) => classicGateParking(sim, classicOfficeGates(sim)).length;
const parkingLine = (sim) => openingSteps(sim)[2];

// SB1-Q01: office built, then every reachable Parking cell removed before opening.
{
  const { sim, p, gx, idle, build } = lot();
  build({ tool: 'aisle', a: { x: gx + 1, y: p.y1 - 4 }, b: { x: gx + 4, y: p.y1 - 2 } });
  build({ tool: 'parking', a: { x: gx + 1, y: p.y1 - 3 }, b: { x: gx + 4, y: p.y1 - 2 } });
  let spot = null;
  for (let y = p.y1 - 1; y >= p.y0 && !spot; y--) for (let x = p.x0; x <= p.x1 && !spot; x++) for (let r = 0; r < 4 && !spot; r++)
    if (sim.plan({ tool: 'office', a: { x, y }, b: { x, y }, rotation: r }).status !== 'invalid') spot = { x, y, r };
  assert.ok(spot); build({ tool: 'office', a: { x: spot.x, y: spot.y }, b: { x: spot.x, y: spot.y }, rotation: spot.r });
  assert.equal(sim.objs('office')[0].cstate, 'operating');
  assert.ok(reachable(sim) > 0 && parkingLine(sim).done); ok('Q01 control: office built, Parking line done');
  for (let y = p.y1 - 3; y <= p.y1 - 2; y++) for (let x = gx + 1; x <= gx + 4; x++) { const q = sim.plan({ tool: 'demolish', a: { x, y }, b: { x, y }, f: 0 }); assert.equal(q.status, 'valid', q.reasons.join(';')); build({ tool: 'demolish', a: { x, y }, b: { x, y }, quoteStamp: q.operation?.stamp }); }
  assert.equal(reachable(sim), 0, 'all reachable parking removed');
  assert.equal(sim.s.open, false);
  assert.equal(parkingLine(sim).done, false, 'Parking line must not be done with zero reachable parking'); ok('Q01: Parking line not done after parking removed');
  assert.equal(openingSteps(sim)[3].done, false); ok('Q01: Office line not done (office access needs parking)');
  assert.ok(sim.openingIssues().some((m) => /parking/i.test(m))); ok('Q01: opening issues still name parking');
  assert.equal(openingSteps(sim)[1].done, true); ok('Q01: Aisle line follows the real aisle');
}

// SB1-Q02: pending Parking on a paved pad not connected to the gate, while a connected aisle exists.
{
  const { sim, p, gx, idle, build } = lot();
  const px = gx - 8, py = p.y1 - 4; // pad well away from the connected aisle
  build({ tool: 'aisle', a: { x: px, y: py }, b: { x: px + 3, y: py + 1 } });
  assert.ok(reachable(sim) === 0 && !sim.D.vehReach[sim.idx(px, py)], 'pad is disconnected');
  build({ tool: 'parking', a: { x: px, y: py }, b: { x: px + 3, y: py + 1 } }, false);
  assert.ok([...sim.D.pendingGround.values()].length > 0, 'parking pending');
  const st = officeSiteStep(sim);
  assert.doesNotMatch(st.msg, /Let the Parking paint finish/); assert.equal(st.tool, 'parking'); ok('Q02: no wait advice for disconnected pending Parking');
  assert.equal(parkingLine(sim).done, false); ok('Q02: Parking line not done');
  idle();
  assert.equal(reachable(sim), 0); assert.equal(officeSiteStep(sim).tool, 'parking'); ok('Q02: after completion still no reachable Parking, guide unchanged');
  // Control: pending Parking that will connect still says wait, then clears.
  build({ tool: 'aisle', a: { x: gx + 1, y: p.y1 - 4 }, b: { x: gx + 4, y: p.y1 - 2 } });
  build({ tool: 'parking', a: { x: gx + 1, y: p.y1 - 3 }, b: { x: gx + 4, y: p.y1 - 2 } }, false);
  assert.match(officeSiteStep(sim).msg, /Let the Parking paint finish/); ok('Q02 control: connected pending Parking says wait');
  idle();
  assert.ok(reachable(sim) > 0); assert.equal(officeSiteStep(sim), null); assert.equal(parkingLine(sim).done, true); ok('Q02 control: wait advice was true');
}
console.log(`${checks} SB-1 correction checks passed`);
