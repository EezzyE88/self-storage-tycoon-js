// SL-1 (consolidated spec §2-§6, §13): security line rules, routing and invariants I1-I5.
// Real Sim, empty-lot Business Sandbox, ordinary build actions through dispatch; the requirement matrix
// covers line depths 2/5/10 rows, gate columns left/center/right, 1 and 2 gates, and both staff forms.
import assert from 'node:assert/strict';
import { emptyLot, build, idle, slLayout, runDays } from './sl1_fixtures.mjs';
import { publicDrive, publicOfficeBays } from '../../js/mapleaccess.js';
import { storageOnPublicSide, lineState, lineEdge, cancelLineOutcome, cancelLineNotice } from '../../js/securityline.js';
import { Sim } from '../../js/sim.js';
import { G } from '../../js/data.js';
import { readdirSync, readFileSync } from 'node:fs';

let n = 0; const ok = (m) => { n++; console.log('PASS ' + m); };
const snap = (sim) => JSON.stringify(sim.s);
const plan = (sim, tool, a, b = a, x = {}) => sim.plan({ type: 'build', tool, a, b, f: 0, ...x });
const refused = (sim, tool, a, msg, b = a, x = {}) => {
  const before = snap(sim), q = plan(sim, tool, a, b, x);
  assert.equal(q.status, 'invalid', `${tool} ${JSON.stringify(a)} should be refused (${msg})`);
  assert.ok(q.reasons.includes(msg), `${tool}: expected "${msg}", got ${JSON.stringify(q.reasons)}`);
  assert.equal(sim.dispatch({ type: 'build', tool, a, b, f: 0, ...x }).ok, false); assert.equal(snap(sim), before);
};
const xy = (sim, i) => ({ x: i % sim.s.W, y: (i / sim.s.W) | 0 });
const field = (sim, starts, nbr) => { const seen = new Set(starts), q = [...starts]; while (q.length) { const i = q.pop(); for (const j of nbr(i)) if (!seen.has(j)) { seen.add(j); q.push(j); } } return seen; };
const streetStarts = (sim) => Array.from({ length: sim.s.W }, (_, x) => sim.idx(x, sim.s.parcel.y1 + 2));

// ---------- I1-I5 on one opened layout ----------
function invariants(sim, label) {
  sim.ensure(); const s = sim.s, W = s.W, L = s.secLine, WH = W * s.H, office = sim.objs('office')[0], gates = sim.objs('gate');
  assert.ok(Number.isInteger(L) && L < s.parcel.y1, `${label}: line set in front of row y1`);
  // I1: the prospect (public) vehicle graph never enters the yard, and reaches the office bays.
  const pub = field(sim, streetStarts(sim), (i) => sim.vehNbr(i, publicDrive));
  for (const i of pub) { const c = xy(sim, i); assert.notEqual(sim.secureSide(c.x, c.y), 'yard', `${label} I1 at ${c.x},${c.y}`); }
  const bays = publicOfficeBays(sim, office).bays; assert.ok(bays.length && bays.every((b) => pub.has(b)), `${label} I1 bays reachable`);
  // I2: tenant graphs cross the line only beside an operating gate; the yard is reached.
  for (const g of gates) {
    const ten = field(sim, streetStarts(sim), (i) => sim.vehNbr(i, g.id)); let yard = 0;
    for (const i of ten) {
      const a = xy(sim, i); if (sim.secureSide(a.x, a.y) === 'yard') yard++;
      for (const j of sim.vehNbr(i, g.id)) { const b = xy(sim, j); if (lineEdge(sim, a, b)) assert.ok(Math.abs(b.x - g.x) <= 1, `${label} I2 crossing at ${b.x}`); }
    }
    assert.ok(yard > 0, `${label} I2 gate ${g.x} reaches the yard`);
  }
  // I3: customer pedestrians from the sidewalk never reach a yard cell; they reach the office door.
  const walkers = Array.from({ length: W }, (_, x) => sim.idx(x, s.parcel.y1 + 1));
  const cust = field(sim, walkers, (i) => sim.pedNbr(i, null).filter((j) => j < WH));
  for (const i of cust) { const c = xy(sim, i); assert.notEqual(sim.secureSide(c.x, c.y), 'yard', `${label} I3 at ${c.x},${c.y}`); }
  assert.ok(cust.has(sim.idx(office.door.x, office.door.y)), `${label} I3 door reached`);
  // I4: no storage on the public side.
  assert.ok(!storageOnPublicSide(sim, L), `${label} I4`);
  // I5: staff cross only at gate columns or through the office staff passage, and reach the yard.
  const staff = { kind: 'staff' }, gcols = gates.map((g) => g.x);
  const st = field(sim, [sim.idx(office.door.x, office.door.y)], (i) => sim.pedNbr(i, staff).filter((j) => j < WH)); let inYard = 0;
  for (const i of st) {
    const a = xy(sim, i); if (sim.secureSide(a.x, a.y) === 'yard') inYard++;
    for (const j of sim.pedNbr(i, staff)) { if (j >= WH) continue; const b = xy(sim, j); if (lineEdge(sim, a, b)) assert.ok(gcols.some((gx) => Math.abs(b.x - gx) <= 1) || sim.D.staffPassage?.get(i)?.includes(j) || sim.D.staffPassage?.get(j)?.includes(i) || sim.D.solid[i] || sim.D.solid[j], `${label} I5 staff crossing at ${a.x},${a.y}->${b.x},${b.y}`); }
  }
  assert.ok(inYard > 0, `${label} I5 staff reach the yard`);
}
function runChecked(sim, days, label) {
  let pYard = 0, leases = 0;
  runDays(sim, days, () => { for (const a of sim.s.agents) if (a.vt === 'prospect' && !a.hidden && sim.secureSide(Math.floor(a.x), Math.floor(a.y)) === 'yard') pYard++; });
  for (const v of sim.s.vehicles) if (v.vt === 'prospect') assert.notEqual(sim.secureSide(Math.floor(v.x), Math.floor(v.y)), 'yard', `${label}: prospect car in the yard`);
  leases = sim.objs('unit').filter((u) => u.lease != null).length;
  assert.equal(pYard, 0, `${label}: prospect walked in the yard`); return leases;
}

// ---------- Q3 requirement matrix ----------
let cells = 0;
for (const depth of [2, 5, 10]) for (const gx of [12, 22, 36]) for (const gates of [1, 2]) for (const staff of depth >= 6 ? ['backed', 'gate'] : ['backed']) {
  const L = 29 - depth, label = `depth ${depth} gate ${gx} x${gates} ${staff}`;
  const sim = slLayout({ L, gx, gates, staff });
  assert.deepEqual(sim.openingIssues(), [], `${label}: ${sim.openingIssues()}`);
  assert.ok(sim.dispatch({ type: 'open' }).ok, label);
  invariants(sim, label); cells++;
  if (gates === 1 && gx === 22) assert.ok(runChecked(sim, 10, label) > 0, `${label}: units lease`);
}
ok(`I1-I5 hold on all ${cells} matrix layouts (depths 2/5/10, gate left/center/right, 1-2 gates, backed and gate-walk offices); 10-day runs lease units with no prospect in the yard`);

// ---------- §3.1 gate rules ----------
{
  const sim = emptyLot(), p = sim.s.parcel;
  assert.equal(lineState(sim), 'unset');
  refused(sim, 'gate', { x: 20, y: p.y0 }, 'For now a gate needs at least one yard row behind it.');
  const q1 = plan(sim, 'gate', { x: 20, y: p.y0 + 1 }); assert.notEqual(q1.status, 'invalid'); assert.equal(q1.proposedLine, p.y0 + 1);
  const qf = plan(sim, 'gate', { x: 20, y: p.y1 }); assert.notEqual(qf.status, 'invalid'); assert.ok(qf.warn.includes('A gate on the front row leaves no public lot for the office and customer Parking.'));
  const q2 = plan(sim, 'gate', { x: 20, y: 22 }); assert.equal(q2.status, 'incomplete'); assert.ok(q2.missing.includes('No drive from the street to this gate yet.')); assert.ok(q2.missing.includes('Gate has no drive aisle behind it yet'));
  ok('GAT-1′ any row from y0+1 (y0 refused), GAT-1a front-row advisory, GAT-11 and GAT-5 incomplete, preview proposes the line');
  build(sim, 'gate', { x: 20, y: 22 }); assert.equal(sim.s.secLine, 22); assert.deepEqual(lineState(sim), { L: 22 });
  refused(sim, 'gate', { x: 30, y: 20 }, `For now all gates sit on one security line. Place this gate on row ${p.y1 - 22 + 1}, or remove every gate to move the line.`);
  assert.notEqual(plan(sim, 'gate', { x: 30, y: 22 }).status, 'invalid');
  ok('GAT-8: a second gate must sit on the line; on the line it is allowed');
  // Cancel restores the unset line.
  const ord = sim.s.orders.find((o) => o.tool === 'gate'); assert.ok('prevSecLine' in ord && ord.prevSecLine === null);
  assert.ok(sim.dispatch({ type: 'cancelOrder', id: ord.id }).ok);
  assert.equal(sim.objs('gate').length, 0); assert.equal(sim.s.secLine, undefined); assert.equal(lineState(sim), 'unset');
  ok('Cancelling the line-setting gate restores the unset line');
}
{
  // GAT-10a / GAT-10b / GAT-9, removal keeps the line, and the legal relocation.
  const sim = emptyLot();
  build(sim, 'aisle', { x: 20, y: 4 }, { x: 22, y: 20 }); idle(sim);
  build(sim, 'du10x10', { x: 18, y: 6 }, undefined, { rotation: 1 }); idle(sim);
  const u = sim.objs('unit')[0];
  refused(sim, 'gate', { x: 21, y: u.y - 1 }, 'Storage must stay inside the secured yard. Choose a row in front of your storage.');
  assert.notEqual(plan(sim, 'gate', { x: 21, y: 21 }).status, 'invalid');
  ok('GAT-10a: a line that would leave storage on the public side is refused; a line in front of it is allowed');
  build(sim, 'walk', { x: 4, y: 27 }, { x: 8, y: 28 }); idle(sim);
  build(sim, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }); idle(sim);
  const o = sim.objs('office')[0]; assert.equal(o.door.y, 27);
  refused(sim, 'gate', { x: 21, y: 28 }, 'This line would put the office door inside the secured yard.');
  ok('GAT-10b: a line that would enclose the office door is refused (office-first build order)');
  build(sim, 'gate', { x: 21, y: 21 }); idle(sim); assert.equal(sim.s.secLine, 21);
  const gate = sim.objs('gate')[0];
  const q = sim.plan({ tool: 'demolish', a: { x: gate.x, y: gate.y }, b: { x: gate.x, y: gate.y }, f: 0 }); assert.equal(q.status, 'valid', q.reasons.join(';'));
  assert.ok(sim.dispatch({ type: 'build', tool: 'demolish', a: { x: gate.x, y: gate.y }, b: { x: gate.x, y: gate.y }, f: 0, quoteStamp: q.operation?.stamp }).ok); idle(sim);
  assert.equal(sim.objs('gate').length, 0); assert.equal(sim.s.secLine, 21);
  ok('Removing the last gate keeps the line');
  sim.s.vehicles.push({ id: 9999, x: 10.5, y: 25.5, f: 0 }); sim.markDirty();
  refused(sim, 'gate', { x: 21, y: 20 }, 'For now the line can only move while the lot is empty of vehicles and people.');
  assert.notEqual(plan(sim, 'gate', { x: 21, y: 21 }).status, 'invalid'); // same row: not a move
  sim.s.vehicles.pop(); sim.markDirty();
  build(sim, 'gate', { x: 21, y: 20 }); assert.equal(sim.s.secLine, 20);
  ok('GAT-9: the line moves only while the lot is empty; re-placing on the same row is not a move; relocation works');
}
// ---------- §3.2 office and §3.3 storage ----------
{
  const sim = emptyLot();
  build(sim, 'gate', { x: 22, y: 22 }); build(sim, 'walk', { x: 4, y: 18 }, { x: 12, y: 18 }); build(sim, 'walk', { x: 4, y: 27 }, { x: 8, y: 28 }); idle(sim);
  refused(sim, 'office', { x: 4, y: 14 }, 'Face the office door into the public lot, in front of the security line.', undefined, { rotation: 2 });
  assert.notEqual(plan(sim, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }).status, 'invalid');
  ok('OFF-8: a yard-side door landing is refused; a public-lot door is allowed');
  build(sim, 'aisle', { x: 25, y: 23 }, { x: 34, y: 29 }); build(sim, 'aisle', { x: 25, y: 12 }, { x: 34, y: 14 }); idle(sim);
  refused(sim, 'du10x10', { x: 28, y: 24 }, 'Storage units go inside the secured yard.', undefined, { rotation: 0 });
  assert.notEqual(plan(sim, 'du10x10', { x: 28, y: 10 }, undefined, { rotation: 0 }).status, 'invalid');
  refused(sim, 'shell1', { x: 36, y: 24 }, 'Storage buildings go inside the secured yard.', { x: 39, y: 27 });
  assert.notEqual(plan(sim, 'shell1', { x: 36, y: 15 }, { x: 39, y: 18 }).status, 'invalid');
  ok('UNT-7 and SHL-5: storage units and buildings in the public lot are refused; in the yard they are allowed');
  for (const [tool, a, b] of [['aisle', { x: 10, y: 25 }, { x: 12, y: 25 }], ['loading', { x: 26, y: 25 }, { x: 27, y: 25 }], ['parking', { x: 30, y: 26 }, { x: 33, y: 26 }], ['walk', { x: 10, y: 24 }, { x: 13, y: 24 }], ['light', { x: 16, y: 26 }], ['camera', { x: 17, y: 26 }]]) {
    const q = plan(sim, tool, a, b || a); assert.notEqual(q.status, 'invalid', `${tool} allowed in the public lot: ${q.reasons}`);
  }
  ok('Category 4: aisle, loading, parking, walkway, light and camera are allowed in the public lot');
}
{
  // DOR-6: a shell straddling nothing; a door facing the public lot from a yard shell on the line row.
  const sim = emptyLot();
  build(sim, 'gate', { x: 30, y: 20 }); idle(sim);
  build(sim, 'shell1', { x: 6, y: 16 }, { x: 11, y: 20 }); idle(sim);
  build(sim, 'hall', { x: 8, y: 17 }, { x: 8, y: 20 }); idle(sim);
  refused(sim, 'doorStd', { x: 8, y: 20 }, 'Storage doors must open into the secured yard.', undefined, { dir: [0, 1] });
  ok('DOR-6: a storage door opening onto the public lot is refused');
}
// ---------- §5 opening requirements are Category 2 (never block construction) ----------
{
  const sim = emptyLot();
  build(sim, 'gate', { x: 22, y: 22 }); build(sim, 'walk', { x: 4, y: 27 }, { x: 8, y: 28 }); idle(sim);
  const q = plan(sim, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }); assert.notEqual(q.status, 'invalid');
  build(sim, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }); idle(sim);
  const iss = sim.openingIssues();
  assert.ok(iss.includes('Office needs customer Parking in the public lot, reachable from the street, with a walk to the door.'), iss.join('|'));
  assert.ok(iss.includes('Office needs a staff route into the yard: back it onto the security line or connect it to the gate.'), iss.join('|'));
  assert.equal(sim.dispatch({ type: 'open' }).ok, false);
  ok('OFF-9/OFF-10: missing Parking and staff route are opening issues, never placement refusals; Open is refused');
}
// ---------- §10 saves ----------
{
  const sim = slLayout({}); sim.dispatch({ type: 'open' }); runDays(sim, 2);
  const a = snap(sim), b = new Sim(JSON.parse(a)); b.ensure(); assert.equal(snap(b), a);
  runDays(sim, 1); runDays(b, 1); assert.equal(snap(b), snap(sim));
  ok('SL-1 save/load/save is byte-stable and continues identically');
  const leg = emptyLot(); build(leg, 'gate', { x: 22, y: leg.s.parcel.y1 }); assert.equal(leg.s.secLine, undefined); assert.equal(leg.D.lineL ?? leg.s.parcel.y1, leg.s.parcel.y1);
  ok('A front-row first gate on a fresh lot keeps the legacy implicit line (no secLine written)');
}
// ---------- Pause ----------
{
  const sim = emptyLot(); sim.s.speed = 0; const t = sim.s.t;
  plan(sim, 'gate', { x: 22, y: 22 }); build(sim, 'gate', { x: 22, y: 22 });
  const ord = sim.s.orders.find((o) => o.tool === 'gate'); sim.dispatch({ type: 'cancelOrder', id: ord.id });
  assert.equal(sim.s.speed, 0); assert.equal(sim.s.t, t);
  ok('Manual Pause holds through gate preview, Confirm and Cancel');
}
// ---------- legacy exceptions are not exploitable by new construction ----------
{
  const { makeEmptyLot } = await import('../../js/maple.js');
  for (const [label, sim] of [['legacy Creative Lot save', makeEmptyLot({ creative: true })], ['Business Sandbox', emptyLot()]]) {
    sim.ensure(); build(sim, 'aisle', { x: 20, y: 8 }, { x: 21, y: sim.s.parcel.y1 }); idle(sim); build(sim, 'gate', { x: 20, y: sim.s.parcel.y1 }); build(sim, 'walk', { x: 19, y: 25 }); idle(sim);
    const q = plan(sim, 'office', { x: 15, y: 24 }, undefined, { rotation: 1 });
    assert.equal(q.status, 'invalid', `${label}: a new yard office behind a front-row gate must be refused`); assert.ok(q.reasons.includes('Face the office door into the public lot, in front of the security line.'), q.reasons.join('|'));
  }
  const s2 = emptyLot(); build(s2, 'walk', { x: 4, y: 16 }, { x: 8, y: 16 }); idle(s2); build(s2, 'office', { x: 4, y: 12 }, undefined, { rotation: 2 }); idle(s2);
  // Office-first deep in the lot (line unset): no line may later enclose its door, including the legacy front row.
  refused(s2, 'gate', { x: 22, y: s2.s.parcel.y1 }, 'This line would put the office door inside the secured yard.');
  ok('Legacy yard-office exceptions are not available to new offices (front-row gate, legacy Creative Lot save, office-first then gate)');
}
// ---------- GAT-10c: cancelling a line-moving gate (promoted from the Q14 cancellation probe) ----------
{
  const mk = () => { const sim = emptyLot(); sim.s.speed = 0; return sim; };
  const removeGate = (sim) => { const g = sim.objs('gate')[0]; const q = plan(sim, 'demolish', { x: g.x, y: g.y }); assert.equal(q.status, 'valid', q.reasons.join(';')); build(sim, 'demolish', { x: g.x, y: g.y }, undefined, { quoteStamp: q.operation?.stamp }); };
  const relocate = (sim, from, to) => {
    build(sim, 'gate', { x: 22, y: from }); idle(sim); removeGate(sim); assert.equal(sim.s.secLine, from);
    build(sim, 'gate', { x: 22, y: to }); const o = sim.s.orders.find((q) => q.tool === 'gate' && q.st === 'construction');
    assert.equal(o.prevSecLine, from); assert.equal(sim.s.secLine, to); return o;
  };
  const cancel = (sim, o) => {
    const before = cancelLineOutcome(sim, o), c0 = sim.s.cash, t = sim.s.t, sp = sim.s.speed, r = sim.dispatch({ type: 'cancelOrder', id: o.id });
    return { ...r, before, cashBack: sim.s.cash - c0, cost: o.cost, pauseHeld: sim.s.speed === sp && sim.s.t === t, line: sim.s.secLine ?? null, gates: sim.objs('gate').length };
  };
  const gateReason = (sim, y) => plan(sim, 'gate', { x: 22, y }).reasons[0] || null;
  const fr = (sim, L) => sim.s.parcel.y1 - L + 1;
  const plain = /^Undone - refunded \$[\d,]+$/;
  // Restores (behavior unchanged): first gate on a fresh lot; a move with nothing built since; an office public under both lines.
  { const sim = mk(); build(sim, 'gate', { x: 22, y: 22 }); const o = sim.s.orders.find((q) => q.tool === 'gate'); build(sim, 'du10x10', { x: 10, y: 8 }, undefined, { rotation: 1 });
    const r = cancel(sim, o); assert.deepEqual(r.before, { action: 'restore', to: null }); assert.ok(r.ok && r.line === null && r.gates === 0 && plain.test(r.msg) && r.lineKept === undefined, JSON.stringify(r)); }
  { const sim = mk(); const o = relocate(sim, 15, 25); const r = cancel(sim, o); assert.deepEqual(r.before, { action: 'restore', to: 15 }); assert.ok(r.line === 15 && plain.test(r.msg), JSON.stringify(r)); }
  { const sim = mk(); build(sim, 'walk', { x: 4, y: 27 }, { x: 8, y: 27 }); idle(sim); const o = relocate(sim, 25, 15);
    build(sim, 'office', { x: 4, y: 23 }, undefined, { rotation: 2 }); const r = cancel(sim, o); assert.ok(r.line === 25 && plain.test(r.msg), JSON.stringify(r)); }
  { const sim = mk(); build(sim, 'gate', { x: 22, y: 22 }); build(sim, 'gate', { x: 32, y: 22 }); const o = sim.s.orders.find((q) => q.tool === 'gate' && 'prevSecLine' in q);
    const r = cancel(sim, o); assert.deepEqual(r.before, { action: 'none' }); assert.ok(r.line === 22 && r.gates === 1 && plain.test(r.msg), JSON.stringify(r)); }
  ok('GAT-10c: cancel restores the previous line when nothing conflicts (first gate, empty move, office public under both, another gate remains); message unchanged');
  // Storage built since: the line stays, the player is told before and after; refund and Pause unchanged.
  { const sim = mk(); const o = relocate(sim, 15, 25); build(sim, 'du10x10', { x: 10, y: 18 }, undefined, { rotation: 1 });
    const u = sim.objs('unit')[0]; assert.equal(u.cstate, 'construction');
    const pre = cancelLineOutcome(sim, o); assert.deepEqual(pre, { action: 'keep', row: fr(sim, 25), prevRow: fr(sim, 15), reasons: ['storage'] });
    assert.equal(cancelLineNotice(pre, 'before'), `The security line will stay on row ${fr(sim, 25)}. Moving it back to row ${fr(sim, 15)} would leave storage outside the secured yard.`);
    const r = cancel(sim, o);
    assert.ok(r.ok && r.line === 25 && r.gates === 0 && sim.secureSide(u.x, u.y) === 'yard', JSON.stringify(r));
    assert.equal(r.msg, `Undone - refunded $${r.cost.toLocaleString()}. Security line stays on row ${fr(sim, 25)}.`); assert.equal(r.lineKept, fr(sim, 25));
    assert.ok(r.cashBack === r.cost && r.refund === r.cost && r.pauseHeld, JSON.stringify(r));
    assert.match(gateReason(sim, 15), /^Storage must stay inside the secured yard/); assert.notEqual(plan(sim, 'gate', { x: 22, y: 25 }).status, 'invalid');
    const rt = new Sim(JSON.parse(JSON.stringify(sim.s))); rt.ensure(); assert.equal(JSON.stringify(rt.s), JSON.stringify(sim.s)); assert.equal(rt.s.secLine, 25);
    const uo = sim.s.orders.find((q) => q.st === 'construction'); assert.ok(sim.dispatch({ type: 'cancelOrder', id: uo.id }).ok); assert.equal(sim.s.secLine, 25);
    assert.notEqual(plan(sim, 'gate', { x: 22, y: 15 }).status, 'invalid'); }
  ok('GAT-10c storage: line kept, notice before (dialog) and after (result), full refund, Pause held, GAT-10a still guards, save round trip, no deferred restore');
  // Office door built since: the line stays with the office notice.
  { const sim = mk(); build(sim, 'walk', { x: 4, y: 20 }, { x: 8, y: 20 }); idle(sim); const o = relocate(sim, 25, 15);
    build(sim, 'office', { x: 4, y: 16 }, undefined, { rotation: 2 }); const d = sim.objs('office')[0].door;
    const pre = cancelLineOutcome(sim, o); assert.deepEqual(pre.reasons, ['office']);
    assert.equal(cancelLineNotice(pre, 'before'), `The security line will stay on row ${fr(sim, 15)}. Moving it back to row ${fr(sim, 25)} would put the office door inside the secured yard.`);
    const r = cancel(sim, o); assert.ok(r.line === 15 && sim.secureSide(d.x, d.y) === 'public' && r.msg.endsWith(`Security line stays on row ${fr(sim, 15)}.`), JSON.stringify(r));
    assert.equal(gateReason(sim, 25), 'This line would put the office door inside the secured yard.'); }
  ok('GAT-10c office: line kept with the office-door notice; GAT-10b still guards');
  // Storage conflicts need a deeper new line, office conflicts a shallower one, so one cancel never has both; the copy still covers it.
  { const sim = mk(); build(sim, 'walk', { x: 4, y: 22 }, { x: 8, y: 22 }); idle(sim); const o = relocate(sim, 24, 12);
    build(sim, 'office', { x: 4, y: 18 }, undefined, { rotation: 2 }); const pre = cancelLineOutcome(sim, o); assert.deepEqual(pre.reasons, ['office']);
    assert.equal(cancelLineNotice({ ...pre, reasons: ['storage', 'office'] }, 'before'), `The security line will stay on row ${pre.row}. Moving it back to row ${pre.prevRow} would leave storage outside the secured yard and put the office door inside it.`);
    assert.equal(cancelLineNotice({ action: 'restore', to: 3 }, 'before'), ''); assert.equal(cancelLineNotice(null, 'after'), ''); }
  ok('GAT-10c copy: combined wording; no notice unless the line is kept');
  // A non-gate order and a gate order that never set the line have no outcome.
  { const sim = mk(); build(sim, 'aisle', { x: 4, y: 29 }, { x: 8, y: 29 }); assert.equal(cancelLineOutcome(sim, sim.s.orders.at(-1)), null); }
  ok('GAT-10c applies only to the order that set or moved the line');
}
// ---------- boundary centralization (FO-1 readiness, spec §2) ----------
{
  const dir = new URL('../../js/', import.meta.url), owners = new Set(['securityline.js', 'sim.js', 'main.js']);
  const code = (f) => readFileSync(new URL(f, dir), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  const offenders = readdirSync(dir).filter((f) => f.endsWith('.js') && !owners.has(f) && /\bsecLine\b|\blineL\b/.test(code(f)));
  assert.deepEqual(offenders, [], 'only securityline.js reads the stored line; sim.js writes it and main.js validates saves');
  const sim = code('sim.js'), uses = [...sim.matchAll(/\bsecLine\b/g)].length;
  assert.ok(uses <= 12, `sim.js touches s.secLine only in the gate order write/cancel/removal paths (${uses})`);
  ok('Boundary reads are centralized in js/securityline.js (no other module reads the stored line)');
}
console.log(`${n} security line checks passed`);
