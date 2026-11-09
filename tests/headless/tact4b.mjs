// Campaign Unit 7b: Act IV Beat 14 "When rent goes unpaid", the existing collections lesson on one real account (S2
// "returned payment"). Focus: a verified prior payment, one labelled reversal through sim.money, the exact state billLease
// would have produced for a missed bill, unrelated tenants untouched, normal ladder progression only, early payment
// fail-forward, the beat-owned lien card while other reviews stay held, the persistent duplicate guard, the
// no-eligible-account wait, manual Pause, save/reload and the rendered step text.
// Fixture: the ordinary Day 18 Act III break (recorded 54-action replay), Beat 13 played with the game's own cash.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { BILLING_CYCLE_DAYS } from '../../js/data.js';
import { UI } from '../../js/ui.js';
import { BEATS, LESSONS, beatIndex, beatHeader, curBeat, stepState, tutorialTick, installTutorial, act4Eligible, authorAct4Account } from '../../js/tutorial.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const TRACE = JSON.parse(readFileSync(new URL('./fixtures/act3_break_trace_20260929.json', import.meta.url), 'utf8'));
const dayAt = (t) => Math.floor(t / 1440) + 1;
const fromJSON = (j) => { const c = new Sim(JSON.parse(j)); c.ensure(); installTutorial(c); return c; };
const clone = (sim) => fromJSON(JSON.stringify(sim.s));
const quiet = (sim) => { sim.events.length = 0; };
const until = (sim, fn, max = 1440 * 10) => { for (let i = 0; i < max && !fn(); i++) { sim.step(); quiet(sim); } assert.ok(fn(), 'expected state reached'); };
const ui = (o = {}) => ({ tab: null, cat: null, sel: null, tool: null, plan: null, verticalReview: null, rend: { view: 'ext', overlay: null }, ...o });
const idle = (sim) => !sim.s.orders.some((o) => o.st === 'construction');

// Day 18 Act III break -> Continue -> Beat 13 with real actions -> Beat 14 entered (time held at Pause, nothing authored yet).
function beat14() {
  const sim = makeMaple(TRACE.seed); installTutorial(sim); const s = sim.s;
  for (const x of TRACE.actions) { while (s.t < x.t) { sim.step(); quiet(sim); } sim.dispatch(x.a); quiet(sim); }
  until(sim, () => s.tut.beatId === 'actIII_break' && s.tut.entered, 2000);
  sim.dispatch({ type: 'tutFlag', flag: 'actIII_break' }); for (let i = 0; i < 20 && curBeat(sim).id !== 'vertical'; i++) tutorialTick(sim);
  const sh = sim.objs('shell')[0], q = sim.verticalPlan(sh.id, { fitout: false });
  assert.equal(sim.dispatch({ type: 'verticalUpgrade', shell: sh.id, fitout: false, stairs: false, stamp: q.stamp }).ok, true); until(sim, () => idle(sim));
  for (const a of [{ tool: 'hall', a: { x: 17, y: 5 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'light', a: { x: 17, y: 6 }, b: { x: 17, y: 6 }, f: 1 }, { tool: 'iu5x10', a: { x: 18, y: 5 }, b: { x: 18, y: 5 }, f: 1, axis: 'y' }]) { assert.equal(sim.dispatch({ type: 'build', ...a }).ok, true); until(sim, () => idle(sim)); }
  until(sim, () => curBeat(sim).id === 'collections');
  s.speed = 0; s.convos = s.convos.filter((c) => c.held); tutorialTick(sim); quiet(sim);
  assert.equal(s.tut.flags.act4Account, undefined, 'nothing is authored while paused');
  return JSON.stringify(s);
}
const B14 = beat14();
const at14 = () => fromJSON(B14);
const run1 = (sim) => { sim.s.speed = 4; sim.step(); quiet(sim); }; // one running minute: the beat's tick authors
const unitLines = (sim, num) => sim.s.ledger.filter((x) => (x.note || '').endsWith(`Unit ${num}`));
const leaseView = (sim, L) => ({ status: L.status, balance: L.balance, fees: L.fees, dueSince: L.dueSince, feeDone: L.feeDone, nextBill: L.nextBill, overlock: !!sim.s.objects[L.unit].overlock });

test('Beat 14 follows Beat 13 in Act IV, before graduation, and reuses the collections lesson contract verbatim', () => {
  const ids = BEATS.map((b) => b.id), c = beatIndex('collections'), b = BEATS[c], L = LESSONS.find((x) => x.id === 'collections');
  assert.equal(ids[c - 1], 'vertical'); assert.equal(ids[c + 1], 'grad'); assert.equal(beatHeader(c), 'Act IV · Grow · Beat 14');
  assert.equal(b.act, 'IV'); assert.equal(!!b.pause, false); assert.equal('focus' in b, false);
  for (const k of ['title', 'body', 'why', 'button', 'flag']) assert.equal(b[k], L[k], k);
  assert.deepEqual(b.steps.slice(1).map((x) => [x.sel, x.d]), L.steps.map((x) => [x.sel, x.d]), 'same targets and instructions as the lesson');
  const sim = at14(); assert.equal(curBeat(sim).id, 'collections'); assert.equal(stepState(sim, ui()).cur, 0);
});

test('verified prior payment: the pick is a real, fully collected latest bill at least 15 days old; role, new and recent leases are excluded', () => {
  const sim = at14(), s = sim.s, E = act4Eligible(sim), roles = new Set(Object.values(s.unitRoles));
  assert.ok(E.length > 0);
  for (const { L, u, bill } of E) {
    const line = [...s.ledger].reverse().find((x) => x.cat === 'rent' && x.note === `Rent - Unit ${u.num}`);
    assert.equal(dayAt(line.t), bill); assert.equal(bill, L.nextBill - BILLING_CYCLE_DAYS); assert.equal(line.amt, L.rent); assert.ok(sim.day - bill >= 15);
    assert.equal(L.status, 'current'); assert.ok(!roles.has(L.unit)); assert.ok(bill >= L.start);
  }
  for (let i = 1; i < E.length; i++) assert.ok(E[i - 1].bill < E[i].bill || (E[i - 1].bill === E[i].bill && E[i - 1].u.num < E[i].u.num), 'oldest bill, then lowest unit');
  for (const L of Object.values(s.leases)) if (L.start > sim.day - 15) assert.ok(!E.some((x) => x.L.id === L.id), 'a lease that started under 15 days ago is not eligible');
  // Fixture oracle (pinned fixture only): Unit 1010, $119 collected on Day 2.
  assert.equal(E[0].u.num, 1010); assert.equal(E[0].L.rent, 119); assert.equal(E[0].bill, 2);
});

test('one labelled reversal through sim.money: the collected bill nets to $0 and cash moves by exactly one rent', () => {
  const sim = at14(), s = sim.s, pick = act4Eligible(sim)[0], n0 = s.ledger.length, c0 = s.cash, r0 = s.today.rent;
  run1(sim);
  assert.equal(s.tut.flags.act4Account, pick.L.id);
  const added = s.ledger.slice(n0).filter((x) => (x.note || '').startsWith('Returned payment'));
  assert.equal(added.length, 1); assert.deepEqual([added[0].cat, added[0].amt, added[0].note], ['rent', -pick.L.rent, `Returned payment - Unit ${pick.u.num}`]);
  const bill = unitLines(sim, pick.u.num).filter((x) => x.note === `Rent - Unit ${pick.u.num}` && dayAt(x.t) === pick.bill);
  assert.equal(bill.length, 1); assert.equal(Math.round((bill[0].amt + added[0].amt) * 100), 0, 'collected + returned = $0');
  const other = s.ledger.slice(n0).filter((x) => x !== added[0]).reduce((a, x) => a + x.amt, 0);
  assert.equal(Math.round((s.cash - c0 - other) * 100) / 100, -pick.L.rent); assert.equal(Math.round((s.today.rent - r0 - other) * 100) / 100, -pick.L.rent);
});

test('financial equivalence: the lease state equals what billLease itself produces for that bill missed and nothing paid since', () => {
  const sim = at14(), pick = act4Eligible(sim)[0], ref = at14(), RL = ref.s.leases[pick.L.id];
  // Oracle: the real billLease on the untouched clone, the bill missed and every later day unpaid (draws forced, not invented).
  RL.nextBill = pick.bill; const real = ref.rnd.bind(ref);
  ref.rnd = () => { real(); return 0.999; }; for (let d = pick.bill; d <= ref.day; d++) ref.billLease(RL, d); ref.rnd = real;
  run1(sim); const L = sim.s.leases[pick.L.id];
  assert.deepEqual(leaseView(sim, L), leaseView(ref, RL));
  assert.deepEqual(leaseView(sim, L), { status: 'delinquent', balance: pick.L.rent, fees: sim.s.policies.lateFee, dueSince: pick.bill, feeDone: true, nextBill: pick.bill + BILLING_CYCLE_DAYS, overlock: !!sim.s.policies.overlock });
});

test('unrelated tenants, collections policy and the RNG stream are unchanged by authoring; no second authoring', () => {
  const sim = at14(), s = sim.s, pick = act4Eligible(sim)[0];
  const before = { leases: JSON.stringify(Object.values(s.leases).filter((L) => L.id !== pick.L.id)), units: JSON.stringify(sim.objs('unit').filter((u) => u.id !== pick.L.unit).map((u) => [u.id, !!u.overlock, u.lease])), pol: JSON.stringify(s.policies), rng: JSON.stringify(s.rngS) };
  assert.equal(authorAct4Account(sim).ok, true);
  assert.equal(JSON.stringify(Object.values(s.leases).filter((L) => L.id !== pick.L.id)), before.leases);
  assert.equal(JSON.stringify(sim.objs('unit').filter((u) => u.id !== pick.L.unit).map((u) => [u.id, !!u.overlock, u.lease])), before.units);
  assert.equal(JSON.stringify(s.policies), before.pol); assert.equal(JSON.stringify(s.rngS), before.rng, 'no RNG draw');
  assert.deepEqual(authorAct4Account(sim), { ok: false, dup: true });
  for (let i = 0; i < 1440; i++) { s.speed = 4; sim.step(); quiet(sim); }
  assert.equal(s.ledger.filter((x) => (x.note || '').startsWith('Returned payment')).length, 1);
});

test('no second collection: when the tenant pays, only rent really owed plus the policy fee is collected', () => {
  const sim = at14(); run1(sim); const s = sim.s, id = s.tut.flags.act4Account, L0 = s.leases[id], num = s.objects[L0.unit].num, rent = L0.rent, bill = L0.dueSince;
  let paidDay = null; for (let i = 0; i < 1440 * 60 && paidDay == null; i++) { s.speed = 4; sim.step(); for (const e of sim.events) if (e.type === 'paid_up' && e.unit === L0.unit) paidDay = sim.day; quiet(sim); s.convos = s.convos.filter((c) => !c.key?.startsWith('lien') && c.held); }
  if (paidDay == null) { assert.ok(['lien', 'notice', 'auction'].includes(s.leases[id]?.status) || !s.leases[id], 'still on the ladder'); return; }
  const lines = unitLines(sim, num).filter((x) => x.t >= (bill - 1) * 1440);
  const owedBills = Math.floor((paidDay - bill) / BILLING_CYCLE_DAYS) + 1; // the returned bill plus any cycles billed while unpaid
  const rentIn = lines.filter((x) => x.cat === 'rent').reduce((a, x) => a + x.amt, 0), fees = lines.filter((x) => x.cat === 'anc').reduce((a, x) => a + x.amt, 0);
  assert.equal(Math.round(rentIn * 100) / 100, rent * owedBills, 'collected + returned + paid = the bills actually due');
  assert.equal(fees, s.policies.lateFee);
});

test('normal progression only: across RNG branches the ladder alone moves the account (paid, plan, lien, notice, auction)', () => {
  const base = at14(); run1(base); const id = base.s.tut.flags.act4Account, j = JSON.stringify(base.s); const seen = new Set();
  for (let k = 0; k < 12; k++) {
    const c = fromJSON(j); c.s.rngSalt = k; for (let r = 0; r < k * 5; r++) c.rnd();
    const calls = []; const orig = c.dispatch.bind(c); c.dispatch = (a) => { calls.push(a.type); return orig(a); };
    let prev = c.s.leases[id].status; const path = [prev];
    for (let i = 0; i < 1440 * 50; i++) { c.s.speed = 4; c.step(); quiet(c); c.s.convos = c.s.convos.filter((x) => x.held); const L = c.s.leases[id]; const st = L ? L.status : 'closed'; if (st !== prev) { path.push(st); prev = st; } }
    assert.deepEqual(calls, [], 'the tutorial dispatches nothing');
    for (let i = 1; i < path.length; i++) assert.ok({ delinquent: ['current', 'lien'], lien: ['current', 'notice'], notice: ['current', 'auction'], auction: ['closed', 'current'], current: ['pastdue', 'closed'], pastdue: ['current', 'delinquent'], closed: [] }[path[i - 1]].includes(path[i]), path.join('>'));
    seen.add(path.join('>'));
  }
  assert.ok([...seen].some((p) => p.startsWith('delinquent>current')), 'some branches pay early'); assert.ok([...seen].some((p) => p.includes('lien')), 'some reach lien');
});

test('early payment fail-forward: the card says the account was paid, and Got it still completes the beat (lesson marked done)', () => {
  const base = at14(); run1(base); const id = base.s.tut.flags.act4Account, j = JSON.stringify(base.s);
  let sim = null; for (let k = 0; k < 40 && !sim; k++) { const c = fromJSON(j); c.s.rngSalt = k; for (let r = 0; r < k * 5; r++) c.rnd(); for (let i = 0; i < 1440 * 14; i++) { c.s.speed = 4; c.step(); quiet(c); if (c.s.leases[id].status === 'current') { sim = c; break; } } }
  assert.ok(sim, 'a branch where the tenant pays before review');
  const html = renderCard(sim); assert.match(html, /Unit 1010’s \$119 rent payment came back on Day \d+\. The tenant has since paid in full; the account is current\./);
  assert.match(html, /data-a="tutNext">Got it<\/button>/);
  sim.dispatch({ type: 'tutFlag', flag: 'collAck' }); tutorialTick(sim);
  assert.equal(curBeat(sim).id, 'grad'); assert.ok(sim.s.lessonsDone.collections, 'the optional collections lesson is not offered again');
});

test('held requests: the lien card is the beat’s own content while other reviews stay held; after Beat 14 it is held, then retired once stale', () => {
  const sim = at14(); run1(sim); const s = sim.s, id = s.tut.flags.act4Account;
  sim.convo({ key: 'other', who: 'Tester', sev: 'attention', ttl: 60, def: 0, text: 'Unrelated review', actions: [{ label: 'OK' }] });
  const salt = (k) => { s.rngSalt = k; };
  let lien = null; for (let k = 0; k < 30 && !lien; k++) { const c = fromJSON(JSON.stringify(s)); salt.call(null, 0); c.s.rngSalt = k; for (let r = 0; r < k * 3; r++) c.rnd(); for (let i = 0; i < 1440 * 20 && !lien; i++) { c.s.speed = 4; c.step(); quiet(c); if (c.s.convos.some((x) => x.key === 'lien' + id)) lien = c; } }
  assert.ok(lien, 'a branch that reaches lien during the beat');
  const card = lien.s.convos.find((x) => x.key === 'lien' + id), other = lien.s.convos.find((x) => x.key === 'other');
  assert.equal(lien.reviewHeld(card), false, 'lien card shown'); assert.equal(lien.reviewHeld(other), true, 'other review held');
  lien.dispatch({ type: 'tutFlag', flag: 'collAck' }); tutorialTick(lien); assert.equal(curBeat(lien).id, 'grad');
  lien.syncReviewHold(); assert.equal(lien.reviewHeld(card), true, 'after Beat 14 the lien card waits like any review');
  // Nobody answers: the standard procedure runs (notice 14 days after lien), so the held card is stale and is retired.
  for (let i = 0; i < 1440 * 16; i++) { lien.s.speed = 4; lien.step(); quiet(lien); }
  assert.ok(!lien.s.convos.some((x) => x.key === 'lien' + id) || lien.reviewActionable(lien.s.convos.find((x) => x.key === 'lien' + id)));
  lien.releaseHeld(); assert.ok(!lien.s.convos.some((x) => x.key === 'lien' + id && !lien.reviewActionable(x)), 'a stale lien card is never shown');
});

test('no eligible account: the beat waits (no authoring, no Got it) until a real payment is 15 days old, then uses it', () => {
  const sim = makeMaple(20261109); installTutorial(sim); const s = sim.s, c = beatIndex('collections');
  Object.assign(s.tut, { beat: c, beatId: 'collections', beatAt: c, entered: false }); s.speed = 4; sim.step(); quiet(sim);
  assert.equal(act4Eligible(sim).length, 0, 'Day 1: no collected bill yet'); assert.equal(s.tut.flags.act4Account, undefined);
  assert.equal(stepState(sim, ui()).cur, 0); assert.equal(curBeat(sim).buttonWhen(sim), false); assert.equal(curBeat(sim).check(sim), false);
  const n0 = s.ledger.length; let firstAt = null;
  for (let i = 0; i < 1440 * 50 && s.tut.flags.act4Account == null; i++) { s.speed = 4; sim.step(); quiet(sim); s.convos = s.convos.filter((x) => x.held); if (firstAt == null && s.tut.flags.act4Account != null) firstAt = sim.day; }
  const id = s.tut.flags.act4Account; assert.ok(id != null, 'authored once a real account qualifies');
  const r = s.ledger.find((x) => (x.note || '').startsWith('Returned payment')), num = r.note.split('Unit ')[1];
  const paid = s.ledger.filter((x) => x.note === `Rent - Unit ${num}`); assert.ok(paid.length >= 1 && paid.some((x) => x.amt === -r.amt && sim.day - dayAt(x.t) >= 15), 'reversed a real collected bill');
  assert.ok(s.ledger.length > n0);
});

test('manual Pause: nothing is authored and speed never changes while paused; Beat 14 never changes speed', () => {
  const sim = at14(), s = sim.s; for (let i = 0; i < 50; i++) { sim.poll(); tutorialTick(sim); }
  assert.equal(s.speed, 0); assert.equal(s.tut.flags.act4Account, undefined); assert.equal(stepState(sim, ui()).cur, 0);
  s.speed = 2; sim.step(); quiet(sim); assert.equal(s.speed, 2); assert.ok(s.tut.flags.act4Account != null);
});

test('save/reload: authored state and guard persist; continuation is byte-identical; the guard holds after reload', () => {
  const sim = at14(); run1(sim); for (let i = 0; i < 1440 * 3; i++) { sim.s.speed = 4; sim.step(); quiet(sim); }
  const j = JSON.stringify(sim.s), a = fromJSON(j), b = fromJSON(JSON.stringify(JSON.parse(j)));
  assert.equal(b.s.tut.flags.act4Account, sim.s.tut.flags.act4Account); assert.deepEqual(authorAct4Account(b), { ok: false, dup: true });
  for (const x of [a, b]) for (let i = 0; i < 1440 * 10; i++) { x.s.speed = 4; x.step(); quiet(x); }
  assert.equal(JSON.stringify(a.s), JSON.stringify(b.s));
  assert.equal(b.s.ledger.filter((x) => (x.note || '').startsWith('Returned payment')).length, 1);
});

// Production card markup (the browser walk checks geometry).
function renderCard(sim) {
  const box = { innerHTML: '' }, u = Object.create(UI.prototype);
  u.g = { sim, audio: { unlock() {}, play() {} }, rend: { setFocus() {}, setSelection() {}, view: 'ext', lookAt() {} } };
  Object.assign(u, { title: false, tutMin: true, tutWhy: false, toasts: [], tab: null, sel: null, tool: null, plan: null, popupBlocks: new Set() });
  u.$ = (id) => (id === 'tut' ? box : { innerHTML: '', querySelector: () => null, firstChild: null }); u.root = { querySelector: () => null, querySelectorAll: () => [], classList: { toggle() {}, remove() {} } };
  for (const k of ['sfx', 'renderSheet', 'renderActionBar', 'currentBlueprintPlan']) u[k] = () => null; u.resolveStep = (st) => st;
  u.renderTut(true); return box.innerHTML;
}
test('rendered step text: the wait, then the live account story (stage, amount owed, lockout) in the step title the card shows', () => {
  const sim = at14(); let html = renderCard(sim);
  assert.match(html, /Let time run until a payment comes back/); assert.doesNotMatch(html, /data-a="tutNext"/, 'no Got it before an account exists');
  run1(sim); const L = sim.s.leases[sim.s.tut.flags.act4Account]; html = renderCard(sim);
  assert.match(html, /<span class="tx">Open <b>Business<\/b> <span class="tut-money" data-qa="tut-act4-account">Unit 1010’s \$119 rent payment came back on Day \d+\. Now <b>Delinquent<\/b>, <b>\$139<\/b> owed, locked out\.<\/span>/);
  assert.equal(sim.owed(L), 139); assert.doesNotMatch(html, /loan|borrow/i);
});
console.log(`${passed} Act IV Beat 14 checks passed`);
