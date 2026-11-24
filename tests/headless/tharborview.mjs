// Harborview redevelopment (HV-1 site, HV-2 harbor business, HV-3 scenery) against released master ccc5cf2.
// argv[2]: an exported copy of master ccc5cf2 (its js/ folder), used for old-save loading and for proving the
// other scenarios start and run byte-identically. Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, G } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { frontageOf, validateFrontage, layoutIds } from '../../js/frontage.js';
import { accessState } from '../../js/mapleaccess.js';
import { HV_SITE_LAYOUT, HARBORVIEW_SITE } from '../../js/harborviewsite.js';

const MASTER = process.argv[2];
assert.ok(MASTER, 'usage: node tests/headless/tharborview.mjs <export of master ccc5cf2>');
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
function harnessFor(root, mods) {
  const main = readFileSync(root + '/js/main.js', 'utf8');
  const context = vm.createContext({ Sim: mods.Sim, SCENARIOS: mods.SCENARIOS, Audio: class {}, fmtTime: mods.fmtTime, modeLabel: mods.modeLabel, sandboxName: mods.sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  return (sim) => { const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g; };
}
const here = harnessFor('.', { Sim, SCENARIOS, fmtTime, modeLabel, sandboxName });
const M = { ...(await import(MASTER + '/js/sim.js')), ...(await import(MASTER + '/js/scenarios.js')) };
const there = harnessFor(MASTER, M);
// The loader sanitises saved strings (straight apostrophes become typographic; <>"` are dropped): compare like for like.
const clean = (v) => typeof v === 'string' ? v.replace(/[<>"`]/g, '').replace(/'/g, '\u2019').slice(0, 2000) : Array.isArray(v) ? v.map(clean) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v;
const same = (a, b) => JSON.stringify(clean(JSON.parse(JSON.stringify(a)))) === JSON.stringify(clean(JSON.parse(JSON.stringify(b))));
const reload = async (sim) => { const g = here(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.reason); return p.company.props[p.company.active].sim; };

await test('HV-1 Pier Road: registered valid descriptor, 44 units (14 10x10, 30 5x10), 41 leased, office outside the gate with full access', () => {
  assert.ok(layoutIds().includes(HV_SITE_LAYOUT));
  const K = frontageOf(HV_SITE_LAYOUT);
  assert.deepEqual(validateFrontage(HARBORVIEW_SITE.frontage), []); assert.deepEqual(validateFrontage(K.desc), []);
  for (const seed of [11, 12, 13]) {
    const sim = makeScenario('ratereset', seed), s = sim.s, F = K.desc;
    assert.equal(s.layout, HV_SITE_LAYOUT);
    const us = sim.objs('unit');
    assert.equal(us.length, 44); assert.equal(us.filter((u) => u.size === '10x10').length, 14); assert.equal(us.filter((u) => u.size === '5x10').length, 30);
    assert.equal(us.filter((u) => u.lease).length, 41);
    assert.deepEqual(us.filter((u) => u.blocked || u.cstate !== 'operating').map((u) => u.num), []);
    const office = sim.objs('office'), gate = sim.objs('gate');
    assert.equal(office.length, 1); assert.equal(gate.length, 1);
    assert.deepEqual([office[0].x, office[0].y, office[0].w, office[0].h], [F.office.x, F.office.y, F.office.w, F.office.h]);
    assert.deepEqual([gate[0].x, gate[0].y], [F.gate.x, F.gate.y]);
    assert.ok(office[0].y + office[0].h >= gate[0].y, 'office front sits on the public forecourt, south of the gate line');
    for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) if (K.bay(x, y) >= 0) assert.equal(s.ground[sim.idx(x, y)], G.PARKING);
    const a = accessState(sim); assert.ok(a.pedestrian && a.parking && a.staff, 'full public, parking and staff access');
    assert.equal(sim.objs('light').length, 5); assert.equal(sim.objs('camera').length, 0);
  }
});

await test('HV-1 routes: over 20 days every public visitor parks in a bay and reaches the office without passing the gate; tenants use the gate', () => {
  const sim = makeScenario('ratereset', 12), s = sim.s, K = sim.frontage(), g = sim.objs('gate')[0];
  const tr = new Map(), done = [];
  while (sim.day <= 20) {
    if (sim.mod === 540 && s.scenario.kit?.pending) sim.dispatch({ type: 'scnChoice', ev: s.scenario.kit.pending.id, i: s.scenario.kit.pending.def });
    for (const c of [...s.convos]) { const r = sim.dispatch({ type: 'convo', id: c.id, i: c.auto ?? 0 }); if (!r || !r.ok) s.convos = s.convos.filter((x) => x !== c); }
    sim.step(); sim.events.length = 0;
    const live = new Set();
    for (const ag of s.agents) {
      if (ag.kind === 'staff') continue; live.add(ag.id);
      let t = tr.get(ag.id); if (!t) tr.set(ag.id, t = { pub: !!ag.publicVisit, states: [], bay: false, nearGate: false });
      if (t.states.at(-1) !== ag.st) t.states.push(ag.st);
      const v = sim.vehAt(ag.veh); if (v) { const cx = Math.floor(v.x), cy = Math.floor(v.y); if (!v.moving && K.bay(cx, cy) >= 0) t.bay = true; if (Math.abs(cx - g.x) <= 1 && Math.abs(cy - g.y) <= 1) t.nearGate = true; }
    }
    for (const [id, t] of tr) if (!live.has(id)) { done.push(t); tr.delete(id); }
  }
  const pubs = done.filter((t) => t.pub), ten = done.filter((t) => !t.pub && t.states.includes('atunit'));
  assert.ok(pubs.length >= 10, 'enough public visits to judge: ' + pubs.length);
  assert.equal(pubs.filter((t) => t.bay).length, pubs.length, 'every public visitor parked in a customer bay');
  assert.equal(pubs.filter((t) => t.states.includes('office')).length, pubs.length, 'every public visitor reached the office');
  assert.equal(pubs.filter((t) => t.states.includes('gateq') || t.nearGate).length, 0, 'no public visitor went through the gate');
  assert.ok(ten.length >= 50 && ten.every((t) => t.states.includes('gateq')), 'tenant trips go through the gate: ' + ten.length);
});

await test('HV-1 saves: a Harborview save made on master ccc5cf2 (classic yard) loads and plays on; a new save reloads identically; master refuses the new layout id', async () => {
  const old = M.makeScenario('ratereset', 12); days(old, 5);
  const gOld = there(old), code = await gOld.saveCode();
  const p = await here(makeScenario('ratereset', 12)).prepareLoad(code);
  assert.equal(p.ok, true, p.reason); const back = p.company.props[p.company.active].sim;
  assert.equal(back.s.layout ?? null, old.s.layout ?? null); assert.equal(back.objs('unit').length, 44);
  const beforeDay = back.day; days(back, 3); assert.equal(back.day, beforeDay + 3); assert.notEqual(back.s.scenario.status, undefined);
  const sim = makeScenario('ratereset', 12); days(sim, 5);
  const twin = await reload(sim); assert.equal(twin.s.layout, HV_SITE_LAYOUT);
  days(sim, 3); days(twin, 3); assert.ok(same(twin.s, sim.s), 'reloaded run continues identically');
  const p3 = await there(M.makeScenario('ratereset', 12)).prepareLoad(await here(sim).saveCode());
  assert.equal(p3.ok, false); assert.match(String(p3.reason), /layout/i);
});

await test('HV-1 isolation: every other scenario starts and runs 10 days byte-identically to master ccc5cf2', () => {
  for (const id of Object.keys(SCENARIOS).filter((x) => x !== 'ratereset')) for (const seed of [7, 11]) {
    const a = makeScenario(id, seed), b = M.makeScenario(id, seed);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), id + ' start');
    days(a, 10); days(b, 10);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), id + ' day 10');
  }
});

// ---------------------------------------------------------------- HV-2 harbor business
const { harborGroup, HV_GROUPS, HARBORVIEW_KIT } = await import('../../js/harborview.js');
const { kitCardHtml } = await import('../../js/kitui.js');
const { outlook } = await import('../../js/finance.js');
const { makeMaple } = await import('../../js/maple.js');
// Step minute by minute; answer any other open card with its default so the wanted one can fire.
function untilCard(sim, id, maxDay = 60) {
  const k = sim.s.scenario.kit;
  while (sim.day <= maxDay) { if (k.pending) { if (k.pending.id === id) return k.pending; sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: k.pending.def }); } sim.step(); sim.events.length = 0; }
  assert.fail('card ' + id + ' never opened');
}
function lockerReview(seed, pct = 0.1) {
  const sim = makeScenario('ratereset', seed), s = sim.s;
  const u = sim.objs('unit').find((x) => x.size === '5x10');
  assert.ok(sim.dispatch({ type: 'setRent', key: '5x10|std', v: sim.marketRent(u) }).ok);
  const r = sim.dispatch({ type: 'rentReview', key: '5x10|std', pct }); assert.ok(r.ok, r.msg);
  return sim;
}
const crewNoticed = (s) => Object.values(s.leases).filter((L) => L.kitTag === 'crew' && L.rentNotice && L.rentNotice.pct > 0.05);
const snapL = (L) => JSON.parse(JSON.stringify(L));

await test('HV-2 setup: kit scenario under the same id; 12 fishing crews on 5x10 lockers, Bayside on 3 adjacent 10x10s; goal counts the 44 original units; labels only here', () => {
  for (const seed of [11, 12, 13]) {
    const sim = makeScenario('ratereset', seed), s = sim.s, sc = s.scenario;
    assert.ok(sc.kit); assert.equal(sc.rules, undefined); assert.equal(sc.id, 'ratereset'); assert.equal(sc.hold, 14); assert.equal(sc.deadline, 100);
    assert.deepEqual(sc.fail, { cashBelow: -1500, cashDays: 14 }); assert.equal(s.cash, 2500);
    const crews = Object.values(s.leases).filter((L) => L.kitTag === 'crew'), bay = Object.values(s.leases).filter((L) => L.kitTag === 'bayside');
    assert.equal(crews.length, 12); assert.ok(crews.every((L) => s.objects[L.unit].size === '5x10'));
    assert.equal(bay.length, 3); const bu = bay.map((L) => s.objects[L.unit]).sort((a, b) => a.x - b.x);
    assert.ok(bu.every((u) => u.size === '10x10' && u.y === bu[0].y) && bu[1].x - bu[0].x === 2 && bu[2].x - bu[1].x === 2, 'adjacent');
    assert.equal(sc.goals[0].k, 'yardRoll'); assert.equal(sc.goals[0].v, Math.round(sc.roll0 * 1.15 / 50) * 50); assert.match(sc.goals[0].label, /44 original units/);
    assert.equal(sim.metric('yardRoll'), sim.rentRoll(), 'at the start the yard is the whole rent roll');
    assert.equal(harborGroup(s, crews[0]), HV_GROUPS.crew); assert.equal(harborGroup(s, bay[0]), HV_GROUPS.bayside);
    assert.equal(harborGroup(s, Object.values(s.leases).find((L) => !L.kitTag)), HV_GROUPS.resident);
    assert.ok(s.visits.filter((v) => v.kind === 'prospect' && v.size === '10x20' && v.keen).length >= 9, 'haul-out shoppers scheduled');
  }
  const maple = makeMaple(4401); assert.equal(harborGroup(maple.s, Object.values(maple.s.leases)[0]), null, 'no label outside Harborview');
  const ui = readFileSync('js/ui.js', 'utf8');
  assert.match(ui, /<span>Customer<\/span><span>\$\{esc\(harborGroup\(s, L\)\)\}<\/span>/, 'unit panel shows the customer group');
  assert.match(ui, /Unit \$\{esc\(u\?\.num \?\? L\.unit\)\}\$\{harborGroup\(s, L\) \? ' · ' \+ esc\(harborGroup\(s, L\)\) : ''\}/, 'pending notice rows show the customer group');
  assert.equal(SCENARIOS.ratereset.kit, true); assert.equal(SCENARIOS.ratereset.perRun, true);
});

await test('HV-2 co-op "Agree to +5%": only pending crew notices change (rent and pct); applied rent, bills, accounts, visits and residents are untouched; the capped rent applies on the original date with the +5% consequence', () => {
  for (const seed of [11, 12]) {
    const sim = lockerReview(seed), s = sim.s;
    const before = crewNoticed(s).length; assert.ok(before >= 3, 'crews noticed above 5%: ' + before);
    const p = untilCard(sim, 'coop'); assert.equal(p.who, 'Harbor Fishermen’s Co-op'); assert.equal(p.def, 2);
    assert.match(kitCardHtml(sim, false, false), /Harbor Fishermen’s Co-op/);
    const m = crewNoticed(s), was = Object.fromEntries(m.map((L) => [L.id, snapL(L)]));
    const residents = Object.values(s.leases).filter((L) => L.kitTag !== 'crew' && L.rentNotice).map(snapL);
    const accounts = JSON.stringify(Object.values(s.customerAccounts).map((a) => [a.id, a.leaseIds])), nVisits = s.visits.length, nLeases = Object.keys(s.leases).length;
    const r = sim.dispatch({ type: 'scnChoice', ev: 'coop', i: 0 }); assert.ok(r.ok, r.msg);
    for (const L of m) {
      const o = was[L.id], N = L.rentNotice, cap = Math.min(o.rentNotice.rent, Math.round(o.rentNotice.previousRent * 1.05));
      assert.equal(N.rent, cap); assert.equal(N.pct, 0.05);
      for (const f of ['previousRent', 'issuedAt', 'effectiveDay', 'expiresDay', 'valueHit']) assert.equal(N[f], o.rentNotice[f], f + ' unchanged');
      for (const f of ['rent', 'nextBill', 'status', 'balance', 'fees', 'start', 'tenant', 'unit']) assert.deepEqual(L[f], o[f], 'lease ' + f + ' unchanged');
      const a = s.customerAccounts[s.tenants[L.tenant].accountId]; assert.match(a.events.at(-1).note, /revised to \+5%/);
    }
    assert.deepEqual(Object.values(s.leases).filter((L) => L.kitTag !== 'crew' && L.rentNotice).map(snapL), residents, 'resident notices untouched');
    assert.equal(JSON.stringify(Object.values(s.customerAccounts).map((a) => [a.id, a.leaseIds])), accounts); assert.equal(s.visits.length, nVisits); assert.equal(Object.keys(s.leases).length, nLeases);
    const first = Math.min(...m.map((L) => was[L.id].rentNotice.effectiveDay)); while (sim.day < first - 10) { sim.step(); sim.events.length = 0; }
    const fc = outlook(sim).bills.filter((b) => was[b.lease] && b.day >= was[b.lease].rentNotice.effectiveDay);
    assert.ok(fc.length && fc.every((b) => !s.leases[b.lease].rentNotice || b.amount === s.leases[b.lease].rentNotice.rent), 'cash forecast uses the revised notice');
    // watch each capped notice apply through the normal billing step
    const seen = {}; const apply = sim.applyRentNotice.bind(sim);
    sim.applyRentNotice = (L, day) => { if (was[L.id] && L.rentNotice) { const tn = s.tenants[L.tenant], sat = tn.sat, N = { ...L.rentNotice }; apply(L, day); if (!L.rentNotice) seen[L.id] = { day, N, rent: L.rent, prev: L.prevRent, sat0: sat, dSat: tn.sat - sat }; return; } apply(L, day); };
    const last = Math.max(...m.map((L) => was[L.id].rentNotice.effectiveDay));
    while (sim.day <= last + 1) { sim.step(); sim.events.length = 0; }
    for (const L of m) { const x = seen[L.id]; if (!s.leases[L.id] && !x) continue; // left through the normal move-out path before the bill
      assert.ok(x, 'notice applied'); assert.equal(x.day, was[L.id].rentNotice.effectiveDay); assert.equal(x.rent, x.N.rent); assert.equal(x.prev, was[L.id].rentNotice.previousRent);
      assert.ok(Math.abs(x.dSat - (Math.max(0, x.sat0 - 0.05 * 1.6) - x.sat0)) < 1e-9, 'satisfaction consequence is the +5% one: ' + x.dSat); }
  }
});

await test('HV-2 co-op "Pause" equals the existing Hold-for-6-months action on each matched lease; "Keep" changes no notice, schedules no move-out and only lowers crew satisfaction', () => {
  const sim = lockerReview(12), s = sim.s; untilCard(sim, 'coop');
  const m = crewNoticed(s).map((L) => L.id);
  const twin = new Sim(JSON.parse(JSON.stringify(s)));
  for (const id of m) assert.ok(twin.act_cv({ op: 'rateHold', lease: id }).ok);
  assert.ok(sim.dispatch({ type: 'scnChoice', ev: 'coop', i: 1 }).ok);
  for (const id of m) {
    const a = snapL(s.leases[id]), b = snapL(twin.s.leases[id]); assert.deepEqual(a, b, 'lease ' + id + ' same as Hold');
    assert.equal(s.tenants[a.tenant].sat, twin.s.tenants[b.tenant].sat);
  }
  const k2 = lockerReview(12), s2 = k2.s; untilCard(k2, 'coop');
  const mm = crewNoticed(s2), notes = mm.map((L) => snapL(L)), sats = mm.map((L) => s2.tenants[L.tenant].sat), mo = s2.visits.filter((v) => v.kind === 'moveout').length, leaving = mm.filter((L) => s2.tenants[L.tenant].leaving).length;
  assert.ok(k2.dispatch({ type: 'scnChoice', ev: 'coop', i: 2 }).ok);
  assert.deepEqual(mm.map(snapL), notes, 'notices and leases unchanged');
  mm.forEach((L, i) => assert.ok(Math.abs(s2.tenants[L.tenant].sat - Math.max(0, sats[i] - 0.05)) < 1e-9));
  assert.equal(s2.visits.filter((v) => v.kind === 'moveout').length, mo); assert.equal(mm.filter((L) => s2.tenants[L.tenant].leaving).length, leaving);
  assert.match(s2.scenario.kit.log.at(-2).text + s2.scenario.kit.log.at(-1).text, /Co-op unhappy/);
  const k3 = lockerReview(11, 0.05); for (let d = 0; d < 6 * 1440; d++) { if (k3.s.scenario.kit.pending) k3.dispatch({ type: 'scnChoice', ev: k3.s.scenario.kit.pending.id, i: k3.s.scenario.kit.pending.def }); k3.step(); k3.events.length = 0; }
  assert.equal(k3.s.scenario.kit.events.find((e) => e.id === 'coop').day, 9999, '+5% notices do not trigger the co-op');
  assert.ok(k3.s.scenario.kit.log.some((l) => /\+5% locker notices are fair/.test(l.text)));
});

await test('HV-2 save/reload with the co-op card open: answering after reload gives the same state as answering without reload', async () => {
  const sim = lockerReview(13); untilCard(sim, 'coop');
  const twin = await reload(sim);
  assert.equal(twin.s.scenario.kit.pending.id, 'coop');
  assert.ok(sim.dispatch({ type: 'scnChoice', ev: 'coop', i: 0 }).ok); assert.ok(twin.dispatch({ type: 'scnChoice', ev: 'coop', i: 0 }).ok);
  days(sim, 4); days(twin, 4); assert.ok(same(twin.s, sim.s), 'identical after answering and 4 more days');
});

await test('HV-2 boat bays, Bayside, marina and occupancy: the project opens 4 ready 10x20 bays; bay rent never counts toward the rent goal; empty bays count against occupancy; Bayside lock and marina referral schedule real shoppers', () => {
  const sim = makeScenario('ratereset', 11), s = sim.s, k = s.scenario.kit;
  let p = untilCard(sim, 'bayside'); assert.equal(p.who, 'Bayside Charters');
  const bay = k.start.bayside.map((id) => s.leases[id]), pros0 = s.visits.filter((v) => v.kind === 'prospect' && v.size === '10x20').length;
  assert.ok(sim.dispatch({ type: 'scnChoice', ev: 'bayside', i: 0 }).ok);
  assert.ok(bay.every((L) => L.holdUntil > s.t)); assert.equal(s.visits.filter((v) => v.kind === 'prospect' && v.size === '10x20').length, pros0 + 2);
  assert.ok(bay.every((L) => !sim.rentReviewCands('10x10|std').includes(L)), 'locked units leave rent reviews');
  while (sim.day < 8 || sim.mod < 7 * 60 + 5) { sim.step(); sim.events.length = 0; }
  const pr = k.projects.find((x) => x.id === 'bays'); assert.equal(pr.state, 'offered'); assert.equal(pr.cost, 7500); assert.equal(pr.until, 30);
  assert.equal(sim.dispatch({ type: 'scnProject', id: 'bays' }).ok, false, 'not enough cash without borrowing');
  assert.ok(sim.dispatch({ type: 'borrow', amt: 6000 }).ok, 'a term loan funds it');
  const r = sim.dispatch({ type: 'scnProject', id: 'bays' }); assert.ok(r.ok, r.msg);
  const roll = sim.metric('yardRoll'); while (sim.day <= pr.doneDay) { sim.step(); sim.events.length = 0; }
  const bays = sim.objs('unit').filter((u) => u.size === '10x20');
  assert.equal(bays.length, 4); assert.ok(bays.every((u) => u.cstate === 'operating' && !u.blocked && (u.lease || u.commercial === 'ready')));
  assert.equal(sim.objs('unit').length, 48);
  assert.ok(Math.abs(sim.occupancy().pct - sim.objs('unit').filter((u) => u.lease).length / 48) < 1e-9, 'occupancy is over all 48 units');
  p = untilCard(sim, 'marina'); assert.equal(p.who, 'Harbor Marina');
  const v0 = s.visits.filter((v) => v.kind === 'prospect' && v.size === '10x20').length; assert.ok(sim.dispatch({ type: 'scnChoice', ev: 'marina', i: 0 }).ok);
  assert.equal(s.visits.filter((v) => v.kind === 'prospect' && v.size === '10x20').length, v0 + 6);
  while (sim.day <= 45) { sim.step(); sim.events.length = 0; for (const c of [...s.convos]) { const x = sim.dispatch({ type: 'convo', id: c.id, i: c.auto ?? 0 }); if (!x || !x.ok) s.convos = s.convos.filter((y) => y !== c); } if (k.pending) sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: k.pending.def }); }
  const boat = Object.values(s.leases).filter((L) => s.objects[L.unit].size === '10x20'); assert.ok(boat.length >= 3, 'haul-out filled bays: ' + boat.length);
  assert.equal(sim.metric('yardRoll'), Object.values(s.leases).filter((L) => k.start.yard.includes(L.unit)).reduce((a, L) => a + L.rent, 0));
  assert.equal(sim.rentRoll() - sim.metric('yardRoll'), boat.reduce((a, L) => a + L.rent, 0), 'bay rent is outside the goal metric');
  assert.ok(boat.every((L) => harborGroup(s, L) === HV_GROUPS.boat));
  const none = makeScenario('ratereset', 12); untilCard(none, 'watch', 70);
  assert.ok(none.s.scenario.kit.log.some((l) => /You have none to offer/.test(l.text)), 'no bays: the marina call is logged as a missed opportunity');
});

await test('HV-2 winter thefts: the wave hits dark, off-camera rented units through the ordinary break-in consequence; a fully watched yard is not hit; a patrol never adds thefts; stars are 1 plus 2 of fleet, boats, quiet winter', () => {
  const run = (sim, fn) => { const s = sim.s, k = s.scenario.kit; while (s.scenario.status === 'active' && sim.day <= 70) { if (k.pending) sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: fn ? fn(k.pending) : k.pending.def }); sim.step(); sim.events.length = 0; } return k; };
  const a = makeScenario('ratereset', 13), sec0 = a.s.exp.security; const ka = run(a);
  assert.ok(ka.thefts >= 1, 'thefts on a dark yard: ' + ka.thefts);
  assert.ok(ka.log.some((l) => /Theft at Unit/.test(l.text) && /door dark or not fully covered/.test(l.text)));
  const b = makeScenario('ratereset', 13); b.s.creative = true;
  for (let x = 4; x <= 40; x += 3) for (const y of [9, 11, 16, 18, 21, 22]) b.dispatch({ type: 'build', tool: 'camera', f: 0, a: { x, y }, b: { x, y } });
  b.dispatch({ type: 'commission', all: true }); b.s.creative = false; b.markDirty(); b.rebuild();
  const dark = b.objs('unit').filter((u) => u.lease && b.doorExposed(u)).length; // SI-1: the door rule thieves use
  const kb = run(b); if (dark === 0) assert.equal(kb.thefts, 0, 'nothing dark, nothing stolen');
  const c = makeScenario('ratereset', 13); const kc = run(c, (p) => p.id === 'watch' ? 0 : p.def);
  assert.ok(kc.flags.patrol && kc.thefts <= ka.thefts, 'patrol never adds thefts');
  const sc = HARBORVIEW_KIT.score(a); assert.ok(sc.stars >= 1 && sc.stars <= 3 && sc.notes.length === 3);
});

// ---------------------------------------------------------------- HV-3 harbor scenery (CPU scene construction only)
await test('HV-3 scenery: Harborview builds its own harbor setting (water, pier, trawlers, marina, crane) outside the parcel and off the entrance; read-only, deterministic, old saves derive it; other settings unchanged', async () => {
  const { registerHooks } = await import('node:module');
  registerHooks({ resolve(specifier, context, next) { return specifier === 'three' ? { url: new URL('../../vendor/three.module.min.js', import.meta.url).href, shortCircuit: true } : next(specifier, context); } });
  const THREE = await import('three'); const { loadRenderer } = await import('../performance/renderer-fixture.mjs'); const Renderer = await loadRenderer();
  const { createHash } = await import('node:crypto');
  const digest = (r) => { const o = []; r.envG.traverse((x) => { if (x.isInstancedMesh) o.push([x.geometry.type, x.material.color.getHex(), Array.from(x.instanceMatrix.array)]); }); return createHash('sha256').update(JSON.stringify(o)).digest('hex'); };
  const sigs = {};
  for (const [w, h] of [[375, 667], [390, 844]]) {
    const sim = makeScenario('ratereset', 12), before = JSON.stringify(sim.s), r = new Renderer({ clientWidth: w, clientHeight: h }, sim);
    r.rebuildStatic(); assert.equal(JSON.stringify(sim.s), before, 'render must not mutate the saved state, cash, clock or Pause');
    assert.equal(r.envG.children[0].name, 'scenery-ratereset'); assert.equal(r.outer.material.color.getHexString(), '98a39d');
    let meshes = 0, inst = 0; const colors = new Set();
    r.envG.traverse((o) => { if (!o.isInstancedMesh) return; meshes++; inst += o.count; colors.add(o.material.color.getHexString()); assert.equal(o.castShadow, false);
      o.geometry.computeBoundingBox(); const p = sim.s.parcel;
      for (let i = 0; i < o.count; i++) { const m = new THREE.Matrix4(); o.getMatrixAt(i, m); const b = o.geometry.boundingBox.clone().applyMatrix4(m);
        assert.ok(b.max.x <= p.x0 - 1.19 || b.min.x >= p.x1 + 1.19 || b.max.z <= p.y0 - 1.19 || b.min.z >= p.y1 + 1.19, 'scenery stays off the parcel and boundary');
        assert.ok(b.max.z <= p.y1 + .51, 'entrance foreground stays open'); } });
    assert.ok(meshes <= 20, 'bounded draw batches: ' + meshes); assert.ok(inst >= 60, 'a full harbor, not a token prop: ' + inst);
    for (const c of ['3f6f86', '26394d', 'eef1ef', 'd9a53a', '8b7458']) assert.ok(colors.has(c), 'harbor element present: ' + c);
    sigs[w] = digest(r); r.clearGroup(r.envG); r.buildEnvironment(); assert.equal(digest(r), sigs[w], 'deterministic');
    const old = M.makeScenario('ratereset', 12); r.sim = new Sim(JSON.parse(JSON.stringify(old.s))); r.resizeWorld();
    assert.equal(r.envG.children[0].name, 'scenery-ratereset', 'a pre-HV save derives the harbor setting from its scenario id');
  }
  assert.equal(sigs[375], sigs[390]);
  for (const id of ['comeback', 'turnaround', 'vertical', 'climate']) { const r = new Renderer({ clientWidth: 390, clientHeight: 844 }, makeScenario(id)); r.rebuildStatic(); assert.equal(r.envG.children[0].name, 'scenery-' + id); }
});

console.log(`ALL PASS: ${n} Harborview groups; physical Safari NOT TESTED`);
