// PI-01C Actual Investment Results: recorded construction cost and actual rent collected for the latest
// completed rental-unit group. Real Sim paths only (build, lease, billing, collections, cancellation, vertical
// fit-out, removal, renovation, Company Goal credit, two properties, save/load). Records are observational:
// they never change cash, the ledger, RNG, Pause or any other state, and missing history is never invented.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { installTutorial, curBeat, tutorialTick, upstairsReady, authorAct4Account } from '../../js/tutorial.js';
import { investmentCheckin, investmentCheckinHtml } from '../../js/investmentprogress.js';
import { unitBuildRecord, latestCompletedGroup } from '../../js/investmentresults.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const ROW = { tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 }, f: 0 };
const ROW2 = { tool: 'du10x10', a: { x: 15, y: 18 }, b: { x: 15, y: 21 }, f: 0 };
const quiet = (sim) => { sim.events.length = 0; };
const steps = (sim, n) => { for (let i = 0; i < n; i++) { sim.step(); quiet(sim); } };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const cents = (v) => Math.round(v * 100) / 100;
const members = (sim, order) => sim.objs('unit').filter((u) => u.order === order);
// Independent cross-check: every rent-category ledger row whose note names one of these unit numbers.
const ledgerRent = (sim, nums) => cents(sim.s.ledger.filter((x) => x.cat === 'rent' && nums.some((n) => new RegExp(`Unit ${n}$`).test(x.note))).reduce((a, x) => a + x.amt, 0));
function property(seed = 9) { const sim = makeMaple(seed); sim.s.tut.on = false; sim.s.open = true; sim.s.speed = 0; return sim; }
function built(sim, row = ROW) {
  const c0 = sim.s.cash, plan = sim.plan(row), r = sim.dispatch({ type: 'build', ...row });
  assert.equal(r.ok, true, r.msg);
  assert.equal(cents(c0 - sim.s.cash), plan.cost, 'charged exactly the quote');
  until(sim, () => members(sim, r.order).every((u) => u.cstate === 'operating'), 1440 * 3);
  return { order: r.order, cost: plan.cost, units: members(sim, r.order) };
}
const rec = (sim, order) => unitBuildRecord(sim, order);

test('construction cost is the recorded charge of the build order; collected rent starts at $0', () => {
  const sim = property(), g = built(sim);
  assert.deepEqual(rec(sim, g.order), { day: 1, cost: g.cost, rent: 0, removed: 0, credit: 0 });
  assert.equal(sim.s.ledger.filter((x) => x.cat === 'capex' && x.amt === -g.cost).length, 1);
  const html = investmentCheckinHtml(sim);
  assert.match(html, new RegExp(`construction cost \\$${g.cost.toLocaleString('en-US')} · rent collected from these units \\$0 since Day 1`));
});

test('initial and recurring rent: attributed per unit, equal to the ledger, fees and other units excluded', () => {
  const sim = property(), old = sim.objs('unit').find((u) => u.order == null && u.cstate === 'operating'), g = built(sim);
  sim.signLease(g.units[0], null); sim.signLease(g.units[1], null); sim.signLease(old, null);
  const first = cents(sim.s.leases[g.units[0].lease].rent + sim.s.leases[g.units[1].lease].rent);
  assert.equal(rec(sim, g.order).rent, first, 'two first-month payments only; the authored unit is not in this group');
  steps(sim, 1440 * 70);
  const nums = g.units.map((u) => u.num);
  assert.ok(rec(sim, g.order).rent > first, 'recurring bills were collected');
  assert.equal(rec(sim, g.order).rent, ledgerRent(sim, nums), 'equals every rent row for these units');
});

test('overdue rent, late fees, payment plans and subsequent leases', () => {
  const sim = property(), g = built(sim), u = g.units[0];
  sim.signLease(u, null); const L = sim.s.leases[u.lease], base = rec(sim, g.order).rent;
  Object.assign(L, { status: 'delinquent', balance: 2 * L.rent, fees: 20, dueSince: sim.day - 20 });
  sim.payUp(L, 'Past-due rent paid');
  assert.equal(rec(sim, g.order).rent, cents(base + 2 * L.rent), 'overdue balance is rent; the $20 late fee is not');
  assert.equal(sim.s.ledger.at(-1).cat, 'anc');
  Object.assign(L, { status: 'delinquent', balance: 3 * L.rent, fees: 20, dueSince: sim.day - 20, planTried: false });
  const r0 = rec(sim, g.order).rent, rnd = sim.rnd; sim.rnd = () => 0; const res = sim.act_collect({ op: 'plan', lease: L.id }); sim.rnd = rnd;
  assert.equal(res.ok, true); assert.equal(rec(sim, g.order).rent, cents(r0 + Math.round(3 * L.rent / 2)), 'plan instalment counted when paid');
  sim.endLease(L, 'moveout'); u.commercial = 'ready';
  const r1 = rec(sim, g.order).rent; sim.signLease(u, null);
  assert.equal(rec(sim, g.order).rent, cents(r1 + sim.s.leases[u.lease].rent), 'a later lease on the same unit adds to the group');
  assert.equal(rec(sim, g.order).rent, ledgerRent(sim, [u.num]));
});

test('auction proceeds, loans and Company Goal credits never count as rent', () => {
  const sim = property(), g = built(sim), u = g.units[0];
  sim.signLease(u, null); const L = sim.s.leases[u.lease], r0 = rec(sim, g.order).rent;
  Object.assign(L, { status: 'auction', balance: 4 * L.rent, fees: 20 });
  sim.s.auction = { day: sim.day, done: false }; sim.s.t = (sim.day - 1) * 1440 + 600; sim.auctionTick(); sim.s.t += 80; sim.auctionTick();
  assert.ok(sim.s.ledger.some((x) => x.cat === 'anc' && /Lien auction/.test(x.note)), 'the auction sold');
  assert.equal(rec(sim, g.order).rent, r0);
  sim.s.loan.bal = 0; const before = sim.s.cash, room = sim.creditLimit();
  assert.ok(room > 0, 'fixture has credit'); assert.equal(sim.dispatch({ type: 'loan', amt: Math.min(1000, room) }).ok, true);
  assert.equal(sim.s.ledger.at(-1).cat, 'loan');
  assert.equal(rec(sim, g.order).rent, r0, 'a credit-line draw is not rent');
  const credited = property(); credited.s.companyGoalTracking = true; credited.s.companyGoalCredits = { construction: 1000 };
  const h = built(credited); const R = rec(credited, h.order);
  assert.equal(R.cost, h.cost, 'construction cost is never netted'); assert.equal(R.credit, 1000); assert.equal(R.rent, 0);
  assert.ok(credited.s.ledger.some((x) => x.cat === 'goal_reward' && x.amt === 1000));
  assert.match(investmentCheckinHtml(credited), /A \$1,000 Company Goal credit was booked separately\./);
  assert.ok(before <= sim.s.cash);
});

test('cancellations: undo and late cancel leave no group record; the previous group keeps its record', () => {
  const sim = property(), g = built(sim);
  const undo = sim.dispatch({ type: 'build', ...ROW2 }); assert.ok(sim.s.unitBuilds[undo.order]);
  assert.equal(sim.dispatch({ type: 'cancelOrder', id: undo.order }).ok, true);
  assert.equal(sim.s.unitBuilds[undo.order], undefined);
  const late = sim.dispatch({ type: 'build', ...ROW2 }); steps(sim, 60);
  const c = sim.s.cash; assert.equal(sim.dispatch({ type: 'cancelOrder', id: late.order }).ok, true); assert.ok(sim.s.cash > c, 'partial refund paid');
  assert.equal(sim.s.unitBuilds[late.order], undefined);
  assert.equal(investmentCheckin(sim).order, g.order); assert.equal(investmentCheckin(sim).results.cost, g.cost);
});

test('unit removal keeps the recorded cost and rent and says the group changed', () => {
  const sim = property(), g = built(sim), u = g.units[3];
  sim.signLease(g.units[0], null); const r0 = rec(sim, g.order).rent;
  const q = sim.placeableRemoval(u.id); assert.notEqual(q.classification, 'blocked', q.prerequisites?.[0]);
  assert.equal(sim.dispatch({ type: 'remove', target: u.id, stamp: q.stamp }).ok, true);
  assert.equal(sim.s.objects[u.id], undefined);
  assert.deepEqual([rec(sim, g.order).cost, rec(sim, g.order).rent, rec(sim, g.order).removed], [g.cost, r0, 1]);
  assert.match(investmentCheckinHtml(sim), /Both figures include 1 unit since removed\./);
});

test('renovation split units keep the group identity; their rent is attributed', () => {
  const sim = property(), g = built(sim, { tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 19 }, f: 0 }), u = g.units[0];
  const op = sim.renovateOptions(u).find((x) => x.kind === 'split');
  assert.ok(op?.ok, op?.why || 'split offered');
  assert.equal(sim.dispatch({ type: 'renovate', unit: u.id, kind: 'split' }).ok, true);
  const parts = members(sim, g.order).filter((x) => x.size === '5x10'); assert.equal(parts.length, 2);
  for (const p of parts) p.commercial = 'ready';
  const r0 = rec(sim, g.order).rent; sim.signLease(parts[0], null);
  assert.equal(rec(sim, g.order).rent, cents(r0 + sim.s.leases[parts[0].lease].rent));
  assert.equal(rec(sim, g.order).cost, g.cost, 'renovation spending is not construction cost of the group');
});

test('properties are isolated even when order and unit ids coincide', () => {
  const a = property(9), b = property(9), ga = built(a), gb = built(b);
  assert.equal(ga.order, gb.order);
  b.signLease(gb.units[0], null); steps(b, 1440 * 35);
  assert.equal(rec(a, ga.order).rent, 0); assert.ok(rec(b, gb.order).rent > 0);
});

test('returned rent payment (Act IV account) is subtracted from collected rent', () => {
  const sim = property(), g = built(sim); sim.s.tut.flags = {};
  for (const u of g.units) sim.signLease(u, null);
  steps(sim, 1440 * 50);
  // Test setup only: make a group lease the earliest eligible account by parking the others for one call.
  const others = Object.values(sim.s.leases).filter((L) => !g.units.some((u) => u.id === L.unit) && L.status === 'current');
  for (const L of others) L.status = 'test-parked';
  const r0 = rec(sim, g.order).rent, res = authorAct4Account(sim);
  for (const L of others) L.status = 'current';
  assert.equal(res.ok, true, 'an eligible group account exists');
  const L = sim.s.leases[res.lease]; assert.ok(g.units.some((u) => u.id === L.unit));
  assert.equal(rec(sim, g.order).rent, cents(r0 - L.rent));
  assert.equal(rec(sim, g.order).rent, ledgerRent(sim, g.units.map((u) => u.num)));
});

const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
function atVertical() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); quiet(sim); } sim.dispatch(x.a); quiet(sim); }
  until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim);
  return sim;
}
test('vertical fit-out package: whole reviewed package cost recorded; cancelled package leaves none', () => {
  const sim = atVertical(), shell = sim.objs('shell')[0]; sim.s.cash = 1e6;
  const q = sim.verticalPlan(shell.id, { fitout: true }); assert.equal(q.ok, true);
  const r = sim.dispatch({ type: 'verticalUpgrade', shell: shell.id, fitout: true, stairs: false, stamp: q.stamp }); assert.equal(r.ok, true);
  assert.equal(sim.s.unitBuilds[r.order].c, q.cost);
  until(sim, () => upstairsReady(sim), 1440 * 12);
  const ups = members(sim, r.order).filter((u) => u.cstate === 'operating'); assert.ok(ups.length > 0);
  const r0 = rec(sim, r.order).rent; sim.signLease(ups[0], null);
  assert.equal(rec(sim, r.order).rent, cents(r0 + sim.s.leases[ups[0].lease].rent));
  const other = atVertical(), sh = other.objs('shell')[0]; other.s.cash = 1e6;
  const q2 = other.verticalPlan(sh.id, { fitout: true }), r2 = other.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: true, stairs: false, stamp: q2.stamp });
  assert.equal(other.dispatch({ type: 'cancelOrder', id: r2.order }).ok, true);
  assert.equal(other.s.unitBuilds?.[r2.order], undefined);
});

test('no fabricated history: unrecorded and creative groups say so; damaged records are not shown', () => {
  const sim = property(), g = built(sim); sim.signLease(g.units[0], null);
  delete sim.s.unitBuilds[g.order];
  const html = investmentCheckinHtml(sim);
  assert.match(html, /construction cost and collected rent are not on record for this group/);
  assert.doesNotMatch(html, /rent collected from these units \$/); assert.doesNotMatch(html, /Collected rent is gross/);
  sim.s.unitBuilds[g.order] = { d: 1, c: 'x', r: 0 }; assert.equal(investmentCheckin(sim).results, null);
  const free = property(); free.s.creative = true; const r = free.dispatch({ type: 'build', ...ROW }); assert.equal(r.ok, true);
  assert.equal(free.s.unitBuilds?.[r.order], undefined, 'a creative build charges nothing and records nothing');
});

test('wording: gross receipts only, never profit, ROI or capital recovery', () => {
  const sim = property(), g = built(sim); for (const u of g.units) sim.signLease(u, null);
  const text = investmentCheckinHtml(sim).replace(/<[^>]+>/g, ' ');
  assert.match(text, /Collected rent is gross cash received, not profit or return on investment, and excludes late fees, auction proceeds, loans and goal rewards\./);
  const stripped = text.replace('not cash collected or profit', '').replace('not profit or return on investment', '');
  assert.doesNotMatch(stripped, /profit|ROI|return on|recover|payback|paid back|paid off|break.?even|net /i);
});

test('save/load: records survive a real save round trip and keep accumulating; check-in is read-only', () => {
  const sim = property(), g = built(sim); sim.signLease(g.units[0], null);
  const before = JSON.stringify(sim.s); investmentCheckin(sim); investmentCheckinHtml(sim); assert.equal(JSON.stringify(sim.s), before);
  const loaded = new Sim(JSON.parse(JSON.stringify(sim.s)));
  assert.deepEqual(rec(loaded, g.order), rec(sim, g.order)); assert.equal(loaded.s.speed, 0);
  steps(sim, 1440 * 35); steps(loaded, 1440 * 35);
  assert.deepEqual(rec(loaded, g.order), rec(sim, g.order)); assert.equal(JSON.stringify(loaded.s), JSON.stringify(sim.s));
});

test('source guard: every rent-category cash call is attributed beside it', () => {
  for (const f of readdirSync(new URL('../../js/', import.meta.url))) {
    if (!f.endsWith('.js')) continue;
    for (const line of readFileSync(new URL('../../js/' + f, import.meta.url), 'utf8').split('\n')) {
      if (/money\([^)]*,\s*'rent'/.test(line)) assert.match(line, /noteUnitRent\(/, `${f}: ${line.trim().slice(0, 90)}`);
    }
  }
});

// ---- Record retention (corrective successor of 6f0478b): bounded storage never loses a record the Check-in can need.
// Real commits of single 5x5 drive-up units at free cells; cash raised for the fixture only.
// Cells on seed-9 Maple where a single 5x5 drive-up opens (found by building each alone through the real Sim).
const OPENING = [[10,3],[11,3],[12,3],[13,14],[13,18],[14,14],[14,18],[15,14],[15,18],[16,14],[16,18],[17,14],[17,18],[18,14],[18,18],[19,14],[19,18],[20,14],[20,18],[21,14],[21,18],[22,14],[22,18],[23,14],[23,18],[24,14],[24,18],[25,14],[25,18],[26,18],[27,14],[27,18]];
function singles(sim, n) {
  const out = [];
  for (const [x, y] of OPENING) { if (out.length >= n) break; const r = sim.dispatch({ type: 'build', tool: 'du5x5', a: { x, y }, b: { x, y }, f: 0 }); if (r.ok) out.push(r.order); }
  assert.equal(out.length, n, 'fixture found enough free cells'); return out;
}
const book = (sim) => Object.keys(sim.s.unitBuilds || {}).map(Number);
const pendingN = (sim) => sim.s.orders.filter((o) => o.st === 'construction').length;
const finish = (sim) => until(sim, () => !pendingN(sim) && sim.objs('unit').every((u) => u.order == null || u.cstate === 'operating' || u.cstate === 'built'), 1440 * 6);

test('retention: 29 newer pending orders, all cancelled, leave the latest completed group recorded', () => {
  const sim = property(); sim.s.cash = 1e7; const g = built(sim, { tool: 'du10x10', a: { x: 10, y: 3 }, b: { x: 11, y: 3 }, f: 0 });
  const pend = singles(sim, 29);
  for (const id of pend) assert.ok(sim.s.unitBuilds[id], 'every pending order keeps its record');
  assert.deepEqual(rec(sim, g.order), { day: 1, cost: g.cost, rent: 0, removed: 0, credit: 0 }, 'completed group kept while newer work is pending');
  for (const id of [...pend].reverse()) assert.equal(sim.dispatch({ type: 'cancelOrder', id }).ok, true);
  assert.equal(investmentCheckin(sim).order, g.order); assert.equal(investmentCheckin(sim).results.cost, g.cost);
  assert.equal(book(sim).length, 1, 'cancelled records are gone');
});

test('retention: pending orders that complete become the recorded latest group; storage stays bounded', () => {
  const sim = property(); sim.s.cash = 1e7; const pend = singles(sim, 30); finish(sim);
  const C = investmentCheckin(sim); assert.equal(C.order, Math.max(...pend)); assert.ok(C.results, 'latest completed group recorded');
  singles(sim, 1); // a new commit prunes
  assert.ok(book(sim).length <= 24 + pendingN(sim), 'bounded: ' + book(sim).length);
  assert.ok(sim.s.unitBuilds[C.order], 'the shown group survives pruning');
  const kept = book(sim).filter((id) => !sim.s.orders.some((o) => o.id === id && o.st === 'construction')).sort((a, b) => b - a);
  assert.deepEqual(kept, [...pend].sort((a, b) => b - a).slice(0, 24), 'newest completed groups kept, oldest dropped');
});

test('retention: removing the newest group falls back to an older recorded group; records with no units left are dropped first', () => {
  const sim = property(); sim.s.cash = 1e7; const pend = singles(sim, 25); finish(sim);
  const newest = Math.max(...pend), u = members(sim, newest)[0], q = sim.placeableRemoval(u.id);
  assert.equal(sim.dispatch({ type: 'remove', target: u.id, stamp: q.stamp }).ok, true);
  const C = investmentCheckin(sim); assert.equal(C.order, [...pend].sort((a, b) => b - a)[1]); assert.ok(C.results, 'fallback group recorded');
  singles(sim, 1); assert.equal(sim.s.unitBuilds[newest], undefined, 'the emptied order is dropped at the next commit');
  assert.ok(sim.s.unitBuilds[C.order]);
});

test('retention: the Check-in group is protected even behind 24+ newer completed groups that have not opened', () => {
  const sim = property(); sim.s.cash = 1e7; const g = built(sim, { tool: 'du10x10', a: { x: 10, y: 3 }, b: { x: 11, y: 3 }, f: 0 });
  const later = singles(sim, 26); finish(sim);
  // Test setup only: hold the newer groups' units at 'built' (not open), so the shown group is the older one.
  for (const id of later) for (const x of members(sim, id)) x.cstate = 'built';
  assert.equal(investmentCheckin(sim).order, g.order);
  singles(sim, 1); assert.ok(sim.s.unitBuilds[g.order], 'shown group kept although 26 newer completed groups exist');
  assert.equal(investmentCheckin(sim).results.cost, g.cost);
});

test('retention: pruning is observational and the shared selector matches the Check-in', () => {
  const a = property(); a.s.cash = 1e7; singles(a, 26); finish(a);
  assert.equal(latestCompletedGroup(a.s)[0], investmentCheckin(a).order);
  const b = new Sim(JSON.parse(JSON.stringify(a.s))); delete b.s.unitBuilds; // same world with no records at all
  for (const sim of [a, b]) { singles(sim, 2); if (sim === a) assert.ok(book(a).length <= 24 + pendingN(a), 'bounded at commit'); steps(sim, 1440 * 3); }
  assert.equal(JSON.stringify({ ...a.s, unitBuilds: undefined }), JSON.stringify({ ...b.s, unitBuilds: undefined }), 'records and pruning never change play');
});

// Current-build production save path (main.js saveCode/loadCode via the existing save-name fixture), two properties.
const mem = new Map();
globalThis.window = { localStorage: { getItem: (k) => mem.get(k) || null, setItem: (k, v) => mem.set(k, String(v)), removeItem: (k) => mem.delete(k) } };
const { saveAPI } = await import('../fixtures/save-name/api.mjs');
const MAIN = readFileSync(new URL('../../js/main.js', import.meta.url), 'utf8');
const game = () => { const g = saveAPI(MAIN); g.beginSaveSession = () => {}; g.ui = { title: false }; g.rend = { view: 'ext' }; g.attach = function (sim, kind, { view } = {}) { this.sim = sim; this.rend.view = view; }; return g; };
{
  const a = property(9), b = property(9), ga = built(a), gb = built(b); b.signLease(gb.units[0], null); steps(b, 1440 * 32);
  const g = game(); g.sim = b; g.company = { props: [{ name: 'First', sim: a }, { name: 'Second', sim: b }], active: 1, feed: [] };
  const code = await g.saveCode(), fresh = game(); assert.ok(await fresh.loadCode(code, true));
  const [la, lb] = fresh.company.props.map((p) => p.sim);
  assert.deepEqual(rec(la, ga.order), rec(a, ga.order)); assert.deepEqual(rec(lb, gb.order), rec(b, gb.order));
  assert.equal(rec(la, ga.order).rent, 0); assert.ok(rec(lb, gb.order).rent > 0);
  assert.equal(investmentCheckinHtml(lb), investmentCheckinHtml(b)); assert.equal(lb.s.speed, 0);
  passed++; console.log('PASS production save code round trip keeps both properties\' records and identical check-in');
}

console.log(`${passed} PI-01C investment results checks passed`);
