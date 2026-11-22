// SC-01 Cedar Creek Storage Yard (Comeback record v2): property identity, access,
// local defects, keep-clear and expansion, simultaneous goals, saves and isolation.
// Native production methods in Node. Steps marked SYNTHETIC set state directly to
// reach an exact goal boundary; everything else uses ordinary dispatches.
// No Safari or physical-device claim.
import assert from 'node:assert/strict';
import { makeScenario, makeComeback, makeCedarCreek, SCENARIOS, scenarioProgress } from '../../js/scenarios.js';
import { makePublicMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { G } from '../../js/data.js';
import { accessState } from '../../js/mapleaccess.js';
import { MAPLE_FRONTAGE, validateFrontage, layoutIds } from '../../js/frontage.js';
import { CEDAR, CEDAR_LAYOUT, CEDAR_SITE, CEDAR_FRONTAGE, CEDAR_TARGETS, CEDAR_CORE, CEDAR_AISLES, CEDAR_START } from '../../js/cedarcreek.js';
import { comebackProgress, checkComeback, targetUnits, targetInService, targetLeased, unitInService, validComeback, cedarDemand, COMEBACK_GOALS } from '../../js/comeback.js';
import { careerEligibility } from '../../js/career.js';
import { yardInfill } from '../../js/yardinfill.js';
import { authoredYard } from '../../js/propertyprojects.js';
import { ensureWorkReport } from '../../js/workreport.js';

let n = 0; const test = (name, fn) => { fn(); n++; console.log('PASS ' + name); };
const reload = (sim) => new Sim(JSON.parse(JSON.stringify(sim.s)));
const occupiedCore = (sim) => sim.objs('unit').filter((u) => !sim.s.scenario.targets.some((t) => t.ids.includes(u.id)) && u.lease);
const apronArgs = (t) => { const xs = t.apron.map((a) => a[0]); return { type: 'build', tool: 'aisle', a: { x: Math.min(...xs), y: t.apron[0][1] }, b: { x: Math.max(...xs), y: t.apron[0][1] }, f: 0 }; };
const finishOrder = (sim, r) => { sim.completeOrder(sim.s.orders.find((o) => o.id === r.order)); sim.ensure(); };
// Ordinary play used by the access runs: Owner takes the shortest open make-ready each morning,
// both aprons are ordered on Day 1, and requests get their first answer.
function play(sim, days, { onTick } = {}) {
  const s = sim.s;
  while (sim.day <= days) {
    if (sim.mod === 7 * 60 && sim.day === 1) for (const t of CEDAR_TARGETS) if (t.apron) assert.ok(sim.dispatch(apronArgs(t)).ok);
    if (sim.mod === 7 * 60 + 5) {
      const open = s.tasks.filter((t) => t.type === 'makeready' && !t.assigned && !s.objects[t.obj]?.missing?.length).sort((a, b) => a.total - b.total);
      if (open[0]) sim.dispatch({ type: 'ownerTask', task: open[0].id, forceOwner: true });
    }
    if (sim.mod === 9 * 60) for (const c of [...s.convos]) if (c.actions?.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
    sim.step();
    if (onTick) onTick(sim);
    sim.events.length = 0;
  }
}

test('new Comeback starts are Cedar Creek: record v2, own layout and site, authored targets and start values', () => {
  const sim = makeScenario('comeback'), s = sim.s, c = s.scenario;
  assert.equal(s.layout, CEDAR_LAYOUT); assert.equal(c.id, 'comeback'); assert.equal(c.v, 2); assert.equal(c.site, CEDAR_SITE);
  assert.equal(c.name, SCENARIOS.comeback.name); assert.equal(c.status, 'active'); assert.equal(c.deadline, null); assert.equal(c.fail, null);
  assert.equal(s.cash, CEDAR_START.cash); assert.equal(c.cash0, CEDAR_START.cash); assert.equal(c.leaseGoal, CEDAR_START.leaseGoal);
  assert.equal(c.liquidGoal, 2150); assert.equal(CEDAR_START.cash, 1150, 'R1 keeps the $1,150 start');
  assert.equal(s.speed, 0, 'starts paused'); assert.equal(s.open, true); assert.equal(s.policies.ownerChores, false);
  assert.deepEqual(c.targets.map((t) => [t.x, t.y, t.w, t.h, t.dir.join()]), CEDAR_TARGETS.map((t) => [t.x, t.y, t.w, t.h, t.dir.join()]));
  const work = c.targets.map((t) => s.tasks.find((x) => x.type === 'makeready' && x.obj === t.id)?.total);
  assert.deepEqual(work, CEDAR_TARGETS.map((t) => t.work)); assert.ok(work.every((w) => w <= 480), 'every job fits one 8-hour shift');
  assert.equal(work.reduce((a, b) => a + b, 0), 2040);
  assert.ok(c.targets.every((t) => { const u = s.objects[t.id]; return u.commercial === 'unready' && !u.lease && u.size === '10x10' && u.access === 'drive'; }));
  assert.equal(occupiedCore(sim).length, CEDAR_CORE.length);
  assert.equal(JSON.stringify(makeCedarCreek(4401).s), JSON.stringify(makeScenario('comeback', 4401).s), 'deterministic build');
  assert.notEqual(JSON.stringify(makeCedarCreek(7).s.tenants), JSON.stringify(s.tenants), 'seed changes tenants only');
});

test('Cedar frontage is its own: validator passes and the office, bays, lanes and camera differ from Maple', () => {
  assert.deepEqual(validateFrontage(CEDAR_FRONTAGE), []); assert.ok(layoutIds().includes(CEDAR_LAYOUT));
  const C = CEDAR.desc, M = MAPLE_FRONTAGE.desc;
  for (const k of ['pocket', 'office', 'bays', 'camera', 'fence']) assert.notDeepEqual(C[k], M[k], k);
  assert.notDeepEqual(C.gate.lanes, M.gate.lanes);
  const sim = makeScenario('comeback'), s = sim.s, office = sim.objs('office')[0], gate = sim.objs('gate')[0];
  assert.deepEqual({ x: office.x, y: office.y, w: office.w, h: office.h, door: office.door, staffDoor: office.staffDoor },
    { x: C.office.x, y: C.office.y, w: C.office.w, h: C.office.h, door: C.office.door, staffDoor: C.office.staffDoor });
  assert.deepEqual([gate.x, gate.y, gate.mapleCompound], [C.gate.x, C.gate.y, true]);
  for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) if (CEDAR.bay(x, y) >= 0) assert.equal(s.ground[sim.idx(x, y)], G.PARKING);
  assert.ok(CEDAR.pocket(C.office.door.x, C.office.door.y) && !CEDAR.pocket(C.gate.x, C.gate.y), 'office door in the street pocket, gate outside it');
  for (const u of sim.objs('unit')) for (const f of sim.unitFront(u)) assert.ok(!CEDAR.pocket(f.x, f.y) && !CEDAR.lanes(f.x, f.y), 'no unit opens into the pocket or the gate lanes');
  assert.deepEqual(sim.openingIssues(), []);
  const st = accessState(sim); assert.deepEqual([st.pedestrian, st.parking, st.staff], [true, true, true]);
  // gate stacking: keypad at approachY with at least 4 clear lane rows behind it to the street
  assert.ok(C.gate.lanes.y1 - C.gate.approachY + 1 >= 4);
});

test('yard circulation is one loop with 2-wide aisles; every operating unit has aisle frontage that no apron touches', () => {
  const sim = makeScenario('comeback'), s = sim.s, veh = (x, y) => [G.ASPHALT, G.PARKING, G.LOADING].includes(s.ground[sim.idx(x, y)]);
  for (const a of CEDAR_AISLES) { assert.ok(Math.min(a.x1 - a.x0, a.y1 - a.y0) + 1 >= 2, a.why + ' at least 2 cells'); }
  // the loop: every aisle cell reaches every other aisle cell without the apron cells, and the rear lane row 7 is intact
  for (let x = 3; x <= 30; x++) assert.ok(veh(x, 7), 'rear through lane intact at x=' + x);
  const aprons = new Set(CEDAR_TARGETS.flatMap((t) => t.apron || []).map(([x, y]) => sim.idx(x, y)));
  for (const i of aprons) assert.equal(s.ground[i], G.GRASS);
  for (const u of occupiedCore(sim)) {
    assert.ok(!u.missing?.length && !u.blocked && unitInService(s, u), 'operating unit in service: ' + u.num);
    assert.ok(sim.unitFront(u).every((f) => !aprons.has(sim.idx(f.x, f.y))), 'operating unit does not depend on an apron');
  }
  const gated = s.scenario.targets.filter((t, k) => CEDAR_TARGETS[k].apron).map((t) => s.objects[t.id]);
  const open = s.scenario.targets.filter((t, k) => !CEDAR_TARGETS[k].apron).map((t) => s.objects[t.id]);
  assert.equal(gated.length, 2); assert.ok(gated.every((u) => u.missing.includes('Door must face a drive aisle connected to the gate')));
  assert.ok(open.every((u) => !u.missing?.length && !u.blocked));
});

test('apron repairs are small Drive Aisle orders that restore frontage and never take an operating unit out of service', () => {
  const sim = makeScenario('comeback'), s = sim.s, core = occupiedCore(sim);
  const orders = CEDAR_TARGETS.filter((t) => t.apron).map((t) => { const q = sim.plan(apronArgs(t)); assert.equal(q.status, 'valid', q.reasons?.join(' ')); assert.equal(q.cost, 90); return sim.dispatch(apronArgs(t)); });
  assert.ok(orders.every((r) => r.ok)); assert.equal(s.cash, CEDAR_START.cash - 180);
  for (let i = 0; i < 30; i++) { sim.step(); assert.ok(core.every((u) => unitInService(s, u) && !u.blocked), 'during construction'); }
  for (const r of orders) if (s.orders.some((o) => o.id === r.order)) finishOrder(sim, r);
  for (const t of s.scenario.targets) assert.ok(!s.objects[t.id].missing?.length, 'frontage restored for ' + t.num);
  assert.ok(core.every((u) => unitInService(s, u)));
});

test('keep-clear zones, the street pocket and the gate lanes refuse solid builds; the authored pads accept 10x10 and 5x10 rows', () => {
  const sim = makeScenario('comeback');
  const refused = (a) => { const q = sim.plan({ f: 0, ...a }); assert.equal(q.status, 'invalid', JSON.stringify(a)); return q; };
  assert.match(refused({ tool: 'du10x10', a: { x: 5, y: 5 }, b: { x: 5, y: 5 }, rotation: 2 }).reasons.join(' '), /restoration staging/);
  assert.match(refused({ tool: 'du10x10', a: { x: 28, y: 9 }, b: { x: 28, y: 9 }, rotation: 1 }).reasons.join(' '), /east loop turn/);
  assert.match(refused({ tool: 'du10x10', a: { x: 5, y: 9 }, b: { x: 5, y: 9 }, rotation: 3 }).reasons.join(' '), /west loop turn/);
  refused({ tool: 'du10x10', a: { x: 29, y: 26 }, b: { x: 29, y: 26 }, rotation: 2 });        // public driveway / pocket
  refused({ tool: 'du10x10', a: { x: 21, y: 20 }, b: { x: 21, y: 20 }, rotation: 0 });        // gate lanes
  const valid = (a, count) => { const q = sim.plan({ f: 0, ...a }); assert.equal(q.status, 'valid', JSON.stringify(a) + ' ' + (q.reasons || []).join(' ') + (q.missing || []).join(' ')); assert.equal(q.count, count); return q; };
  assert.equal(valid({ tool: 'du10x10', a: { x: 19, y: 5 }, b: { x: 26, y: 5 }, rotation: 2 }, 4).cost, 3920);   // rear pad, doors face the rear aisle
  assert.equal(valid({ tool: 'du5x10', a: { x: 19, y: 5 }, b: { x: 26, y: 5 }, rotation: 2 }, 8).cost, 4960);
  valid({ tool: 'du10x10', a: { x: 31, y: 8 }, b: { x: 31, y: 15 }, rotation: 3 }, 4);       // east pad, doors face the east connector
  valid({ tool: 'du10x10', a: { x: 11, y: 19 }, b: { x: 18, y: 19 } }, 4);                   // front pad, doors face the main aisle
  const plain = sim.plan({ f: 0, tool: 'aisle', a: { x: 5, y: 4 }, b: { x: 6, y: 4 } });     // paving the staging pad is not a solid build
  assert.notEqual(plain.status, 'invalid');
});

test('30 days x 8 seeds of ordinary play: visitors stay public, tenant cars use the gate, no access loss, keypad queue stays in the stacking lane', () => {
  const C = CEDAR.desc, L = C.gate.lanes;
  for (const seed of [4401, 7, 99, 2026, 31337, 5150, 8080, 123]) {
    const sim = makeScenario('comeback', seed), s = sim.s, core = occupiedCore(sim);
    let visitors = 0, outside = 0, tenantInPocket = 0, lost = 0, maxQueue = 0, coreOut = 0;
    const seenLane = new Set(), yardCars = new Set();
    play(sim, 30, { onTick: (sim) => {
      for (const e of sim.events) if (e.type === 'access_lost') lost++;
      for (const a of s.agents) {
        const car = sim.vehAt(a.veh), cx = car && Math.floor(car.x), cy = car && Math.floor(car.y);
        if (a.publicVisit) {
          visitors++;
          if (!a.hidden && a.y < CEDAR.streetY && !CEDAR.pocket(Math.floor(a.x), Math.floor(a.y))) outside++;
          if (car && cy < CEDAR.streetY && !CEDAR.pocket(cx, cy)) outside++;
        } else if (a.kind !== 'staff' && car) {
          if (cy < CEDAR.streetY && CEDAR.pocket(cx, cy)) tenantInPocket++;
          if (CEDAR.lanes(cx, cy)) seenLane.add(a.id);
          if (cy < L.y0) yardCars.add(a.id);
        }
      }
      maxQueue = Math.max(maxQueue, sim.gateQueue()?.length || 0);
      if (sim.mod % 60 === 0) coreOut += core.filter((u) => s.objects[u.id]?.lease && !unitInService(s, s.objects[u.id])).length;
    } });
    assert.ok(visitors > 0, 'seed ' + seed + ' had public visits');
    assert.equal(outside, 0, 'seed ' + seed + ' visitor ticks outside the pocket');
    assert.equal(tenantInPocket, 0, 'seed ' + seed + ' tenant cars in the pocket');
    assert.ok([...yardCars].every((id) => seenLane.has(id)), 'seed ' + seed + ' every yard car came through the gate lanes');
    assert.equal(lost, 0, 'seed ' + seed + ' access-lost events'); assert.equal(coreOut, 0, 'seed ' + seed + ' operating units out of service');
    assert.ok(maxQueue <= L.y1 - C.gate.approachY + 1, 'seed ' + seed + ' keypad queue ' + maxQueue);
    assert.deepEqual(sim.openingIssues(), []);
  }
});

// Ready the yard with all six restored and the given number of leases on restored targets (production methods).
function readyYard(leases) {
  const sim = makeScenario('comeback'), s = sim.s, c = s.scenario;
  for (const t of CEDAR_TARGETS.filter((t) => t.apron)) finishOrder(sim, sim.dispatch(apronArgs(t)));
  for (const t of [...s.tasks].filter((t) => t.type === 'makeready')) sim.finishTask(t, null);
  sim.ensure(); const us = c.targets.map((t) => s.objects[t.id]);
  for (const u of us.slice(0, leases)) sim.signLease(u, { size: '10x10' });
  sim.ensure(); sim.events.length = 0; return { sim, s, c, us };
}
const setLiquid = (sim, v) => { const s = sim.s, P = sim.financialPosition(); s.cash = Math.round((v + P.committed + s.loan.bal) * 100) / 100; }; // SYNTHETIC

test('goals hold only together: one cent under the $2,150 net-liquid goal is not a win; reaching it wins at once, once (SYNTHETIC cash)', () => {
  const { sim, s, c, us } = readyYard(2);
  setLiquid(sim, 5000); sim.poll(); assert.equal(c.status, 'active', 'two leases is not enough, even with plenty of net liquid');
  sim.signLease(us[2], { size: '10x10' }); sim.ensure();
  setLiquid(sim, c.liquidGoal - 0.01); sim.events.length = 0; sim.poll();
  assert.equal(sim.financialPosition().netLiquid, c.liquidGoal - 0.01);
  assert.deepEqual(comebackProgress(sim).goals.map((g) => g.met), [true, true, false]);
  assert.equal(c.status, 'active', '$2,149.99 net liquid is under the goal');
  assert.deepEqual(c.earned, [true, true, true], 'each goal has been met at some moment (cash with two leases); that alone is not a win');
  // cash in hand above the goal does not count while bills already owed take net liquid under it
  const P = sim.financialPosition(); if (P.committed > 0) { assert.ok(s.cash > c.liquidGoal - P.committed); }
  setLiquid(sim, c.liquidGoal); sim.poll();
  assert.equal(c.status, 'won'); assert.equal(c.endDay, sim.day); assert.equal(c.endCash, c.liquidGoal);
  assert.equal(sim.events.filter((e) => e.type === 'scenario_end').length, 1);
  sim.events.length = 0; for (let i = 0; i < 2 * 1440; i++) { sim.step(); sim.poll(); }
  assert.equal(sim.events.filter((e) => e.type === 'scenario_end').length, 0, 'no repeated win');
  sim.endLease(s.leases[us[0].lease], 'test'); s.cash = 0; sim.poll(); assert.equal(c.status, 'won');
  assert.ok(validComeback(s)); assert.ok(sim.dispatch({ type: 'comebackAck' }).ok); assert.equal(careerEligibility(s).eligible, true);
  assert.equal(yardInfill(sim), null); assert.equal(!!authoredYard(sim), false);
});

test('bills owed count against the goal: unpaid wages hold net liquid under $2,150 even with $2,150 cash in hand (SYNTHETIC cash)', () => {
  const { sim, s, c } = readyYard(3);
  assert.ok(sim.dispatch({ type: 'hire', role: 'porter' }).ok);
  for (let i = 0; i < 1440; i++) { sim.step(); sim.events.length = 0; }
  const owed = sim.financialPosition().committed; assert.ok(owed > 0, 'wages and costs accrue as bills');
  s.cash = c.liquidGoal; sim.poll(); assert.equal(c.status, 'active', 'cash at the goal with bills owed is not net liquid at the goal');
  s.cash = c.liquidGoal + owed; sim.poll(); assert.equal(c.status, 'won');
});

test('a 3fd14ab Cedar record without liquidGoal keeps its original goal: net liquid above its $1,150 start (SYNTHETIC cash)', () => {
  const { sim, s, c } = readyYard(3); delete c.liquidGoal;
  const re = new Sim(JSON.parse(JSON.stringify(s))), rc = re.s.scenario;
  assert.ok(validComeback(re.s)); assert.equal(rc.liquidGoal, undefined);
  assert.equal(rc.goals[2].label, 'Cash after bills above your $1,150 start'); assert.equal(rc.goals[2].v, 1150);
  setLiquid(re, 1150); re.poll(); assert.equal(rc.status, 'active');
  setLiquid(re, 1150.01); re.poll(); assert.equal(rc.status, 'won');
  for (const bad of [1150, 'lots', -1]) { const st = JSON.parse(JSON.stringify(s)); st.scenario.liquidGoal = bad; assert.equal(new Sim(st).s.scenario.status, 'unavailable', 'liquidGoal ' + bad); }
});

test('leases count distinct live leases on restored targets, not history; a target out of service blocks the win (SYNTHETIC cash)', () => {
  const sim = makeScenario('comeback'), s = sim.s, c = s.scenario;
  for (const t of CEDAR_TARGETS.filter((t) => t.apron)) finishOrder(sim, sim.dispatch(apronArgs(t)));
  for (const t of [...s.tasks].filter((t) => t.type === 'makeready')) sim.finishTask(t, null);
  sim.ensure(); s.cash = 50000; // SYNTHETIC: cash is not the question here
  const us = c.targets.map((t) => s.objects[t.id]);
  sim.signLease(us[0], { size: '10x10' }); sim.signLease(us[1], { size: '10x10' });
  sim.endLease(s.leases[us[1].lease], 'test');                       // one lease ended: history is not counted
  sim.ensure(); sim.poll(); assert.equal(comebackProgress(sim).leased, 1); assert.equal(c.status, 'active');
  sim.signLease(us[2], { size: '10x10' }); sim.poll(); assert.equal(comebackProgress(sim).leased, 2); assert.equal(c.status, 'active');
  // a vacated target that needs make-ready is not restored, so three live leases elsewhere still do not win
  assert.ok(targetInService(s, c.targets[1]) === false || s.objects[us[1].id].commercial !== 'occupied');
  sim.signLease(us[3], { size: '10x10' }); sim.ensure(); sim.poll();
  const p = comebackProgress(sim);
  if (p.restored < 6) { assert.equal(c.status, 'active', 'restored ' + p.restored + '/6 blocks the win'); for (const t of [...s.tasks].filter((t) => t.type === 'makeready')) sim.finishTask(t, null); sim.ensure(); sim.poll(); }
  assert.equal(comebackProgress(sim).restored, 6); assert.equal(c.status, 'won');
  assert.ok(c.targets.filter((t) => targetLeased(s, t)).length >= c.leaseGoal);
});

test('progress checks use no randomness and add no per-unit inquiry state; demand feedback is size-level only', () => {
  const sim = makeScenario('comeback'), s = sim.s; play(sim, 3);
  const rng = s.rngS, before = JSON.stringify(s);
  for (let i = 0; i < 200; i++) { comebackProgress(sim); checkComeback(sim); scenarioProgress(sim); cedarDemand(sim); }
  assert.equal(s.rngS, rng); assert.equal(JSON.stringify(s), before);
  assert.deepEqual(Object.keys(s.scenario).sort(), ['acknowledged', 'cash0', 'deadline', 'earned', 'fail', 'goals', 'id', 'leaseGoal', 'liquidGoal', 'name', 'ownerDone', 'site', 'staffDone', 'status', 'targets', 'v'].sort());
  for (const t of s.scenario.targets) assert.deepEqual(Object.keys(t).sort(), ['access', 'dir', 'env', 'f', 'h', 'id', 'ids', 'num', 'w', 'x', 'y'].sort());
  const D = cedarDemand(sim); assert.equal(D.size, '10x10'); assert.deepEqual(Object.keys(D.lost).sort(), ['competitor', 'noReady', 'other', 'price', 'service']);
});

test('shopper feedback names competitor losses from the reasons the game records, and the rival from its market data', () => {
  const sim = makeScenario('comeback'), s = sim.s, d = sim.day;
  // SYNTHETIC log rows in the existing lostLog shape; each reason the game records lands in its own bucket
  for (const r of ['competitor', 'competitor', 'price', 'noReady', 'service', 'ownerDeferred', 'shopping', 'convenience', 'reputation']) s.mkt.lostLog.push({ d, r, sz: '10x10', climate: false });
  s.mkt.lostLog.push({ d, r: 'competitor', sz: '5x10', climate: false }, { d, r: 'competitor', sz: '10x10', climate: true }, { d: d - 7, r: 'competitor', sz: '10x10', climate: false });
  const D = cedarDemand(sim);
  assert.deepEqual(D.lost, { price: 1, competitor: 2, noReady: 1, service: 2, other: 3 });
  assert.equal(D.rival, null); assert.equal(D.coming, null);
  s.mkt.comp.push({ id: 1, name: 'Northgate Self Storage', announced: d, opens: d + 30, strength: 0.2, price: 0.9, dist: 2 });
  assert.deepEqual(cedarDemand(sim).coming, { name: 'Northgate Self Storage', opens: d + 30, price: 0.9 }); assert.equal(cedarDemand(sim).rival, null);
  s.mkt.comp[0].opens = d; assert.deepEqual(cedarDemand(sim).rival, { name: 'Northgate Self Storage', price: 0.9 });
  assert.equal(sim.compPrice(), 0.9, 'the same rival price the shopper decision uses');
});

test('save round trip at the start, mid-restoration and after the win continues identically', () => {
  for (const stop of [0, 2, 'won']) {
    const a = makeScenario('comeback', 99);
    if (stop === 'won') play(a, 40); else if (stop) play(a, stop);
    if (stop === 'won') assert.equal(a.s.scenario.status, 'won', 'seed 99 wins within 40 days of ordinary play');
    // Existing behavior (not Cedar): load trims work-report days older than 30 days,
    // which play() only trims on the next bucket write. Apply the same trim before comparing.
    ensureWorkReport(a.s);
    const b = reload(a); assert.equal(JSON.stringify(b.s), JSON.stringify(a.s), 'reload ' + stop);
    for (const sim of [a, b]) for (let i = 0; i < 1440; i++) { sim.step(); sim.events.length = 0; }
    assert.equal(JSON.stringify(b.s), JSON.stringify(a.s), 'continuation ' + stop);
  }
});

test('old Comeback v1 saves stay v1; damaged or mismatched v2 records become unavailable and the property stays playable', () => {
  const v1 = makeComeback(4401), r1 = reload(v1);
  assert.equal(r1.s.scenario.v, 1); assert.deepEqual(r1.s.scenario.goals, COMEBACK_GOALS); assert.equal(r1.s.layout, undefined);
  assert.equal(JSON.stringify(r1.s.scenario), JSON.stringify(v1.s.scenario)); assert.ok(validComeback(r1.s));
  const base = makeScenario('comeback');
  const damage = {
    'missing targets': (s) => { s.scenario.targets = null; },
    'moved target': (s) => { s.scenario.targets[0].x += 1; },
    'other site': (s) => { s.scenario.site = 'cedar-creek-v9'; },
    'Maple layout': (s) => { s.layout = 'maple-public-office-v1'; },
    'zero lease goal': (s) => { s.scenario.leaseGoal = 0; },
    'bad start cash': (s) => { s.scenario.cash0 = 'lots'; },
    'goal under start': (s) => { s.scenario.liquidGoal = 1000; },
    'won without end day': (s) => { s.scenario.status = 'won'; s.scenario.earned = [true, true, true]; },
    'acknowledged while active': (s) => { s.scenario.acknowledged = true; },
    'unknown version': (s) => { s.scenario.v = 3; },
    'v2 relabelled v1': (s) => { s.scenario.v = 1; },
  };
  for (const [why, f] of Object.entries(damage)) {
    const st = JSON.parse(JSON.stringify(base.s)); f(st);
    const sim = new Sim(st); assert.equal(sim.s.scenario.status, 'unavailable', why); assert.ok(sim.s.scenario.notice, why);
    assert.equal(sim.s.cash, base.s.cash, why); for (let i = 0; i < 120; i++) sim.step();
  }
  const unknown = JSON.parse(JSON.stringify(base.s)); unknown.layout = 'cedar-creek-office-v2';
  assert.throws(() => new Sim(unknown), /Unknown property layout/);
});

console.log(`${n} Cedar Creek checks passed`);
