import assert from 'node:assert/strict';
import { Sim, newState } from '../../js/sim.js';
import { makeMaple } from '../../js/maple.js';
import { makeScenario } from '../../js/scenarios.js';
import { UI } from '../../js/ui.js';
import { financeState, financialTime, cents } from '../../js/finance.js';
import { TIERS } from '../../js/data.js';

let checks = 0;
function test(name, fn) { fn(); checks++; console.log('PASS ' + name); }
const quiet = () => { const s = newState({ mode: 'sandbox' }); s.opts = { competition: false, wear: 0 }; return new Sim(s); };
const near = (a, b) => assert.ok(Math.abs(a - b) < 0.011, `${a} != ${b}`);
const advance = (sim, t) => { while (sim.s.t < t) { sim.step(); sim.events.length = 0; } };

test('7:00 batch is idempotent, expenses accrue without moving cash', () => {
  const sim = quiet(), s = sim.s, cash = s.cash;
  assert.equal(sim.financialBatch(), true); assert.equal(sim.financialBatch(), false);
  assert.equal(s.finance.cycle, 1); near(sim.committedBills(), 18); near(s.cash, cash);
  near(s.today.opex, 18); assert.equal(s.ledger.length, 0);
});
test('midnight resets capacity but bills wait until 7:00', () => {
  const sim = quiet(), s = sim.s; s.staff.push({ id: 999, role: 'owner', wage: 0, workDay: 1, workUsed: 8 });
  sim.financialBatch(); advance(sim, 1440); near(sim.committedBills(), 18);
  assert.equal(sim.workRemaining(s.staff[0]), 8);
  advance(sim, financialTime(2) - 1); near(sim.committedBills(), 18);
  sim.step(); near(sim.committedBills(), 36);
});
test('seventh processed day settles once and never double-books expenses', () => {
  const sim = quiet(), s = sim.s, cash = s.cash;
  advance(sim, financialTime(7)); near(s.cash, cash - 126); near(sim.committedBills(), 0);
  assert.equal(s.finance.cycle, 0); near(s.today.opex, 18); near(s.today.other, 0);
  near(s.days.reduce((a, d) => a + d.opex, 0) + s.today.opex, 126);
  assert.equal(s.ledger.length, 1); assert.equal(s.ledger[0].cat, 'settle_opex');
  const copy = new Sim(JSON.parse(JSON.stringify(s))); copy.financialBatch(); near(copy.s.cash, s.cash);
  near(copy.cashWindow(7).net, -126);
});
test('one wage at 7:00; firing preserves it and late hiring waits until tomorrow', () => {
  const sim = quiet(), s = sim.s; s.staff.push({ id: 1, role: 'porter', wage: 12.5 });
  sim.financialBatch(); near(s.finance.accrued.payroll, 12.5);
  sim.dispatch({ type: 'fire', id: 1 }); near(s.finance.accrued.payroll, 12.5);
  s.objects[800] = { id: 800, type: 'office', x: 3, y: 3, w: 5, h: 4, cstate: 'operating', door: { x: 8, y: 4, dir: [1, 0] } }; sim.rebuild();
  s.t++; assert.ok(sim.dispatch({ type: 'hire', role: 'tech' }).ok);
  near(s.finance.accrued.payroll, 12.5);
  advance(sim, financialTime(2)); near(s.finance.accrued.payroll, 32.5);
});
test('credit interest accrues, term debt is serviced at 7:00', () => {
  const sim = quiet(), s = sim.s; s.loan.bal = 1000;
  s.debt.push({ id: 10, bal: 1000, rate: 0.12, pmt: 100, next: 2, paid: 0 });
  sim.financialBatch(); near(s.finance.accrued.interest, 0.4);
  advance(sim, financialTime(2) - 1); assert.equal(s.debt[0].next, 2);
  sim.step(); near(s.debt[0].bal, 910); near(s.today.interest, 10.4);
  near(s.cash, 59900); assert.equal(s.debt[0].next, 32);
});
test('reserve uses future costs and future loan payments, never accrued commitments', () => {
  const sim = quiet(), s = sim.s; sim.financialBatch(); s.t++;
  s.debt.push({ id: 1, bal: 1000, rate: 0, pmt: 100, next: 15 });
  near(sim.recommendedReserve(), 500 + 14 * 18 + 100);
  const r = sim.recommendedReserve(); s.finance.accrued.payroll = 400;
  near(sim.recommendedReserve(), r); near(sim.financialPosition().available, s.cash - 418 - r);
  s.debt[0].next = 16; near(sim.recommendedReserve(), 752);
});
test('net liquidity and scenario failure count bills/debt but exclude reserve', () => {
  const sim = quiet(), s = sim.s;
  s.cash = 100; s.finance.accrued.opex = 50; s.loan.bal = 25;
  near(sim.financialPosition().netLiquid, 25); assert.ok(sim.financialPosition().available < 0);
  s.scenario = { status: 'active', goals: [{ k: 'roll', v: 99999 }], deadline: 100, fail: { cashBelow: 0, cashDays: 2 } };
  sim.scenarioCheck(1); assert.equal(s.scenario.badDays, 0);
  s.finance.accrued.opex = 100; sim.scenarioCheck(2); assert.equal(s.scenario.badDays, 1);
  const before = sim.financialPosition().netLiquid; sim.act_loan({ amt: 1000 }); near(sim.financialPosition().netLiquid, before);
  sim.scenarioCheck(3); assert.equal(s.scenario.status, 'lost');
});
test('forecast excludes every non-current status and uses monthly bill dates', () => {
  const sim = quiet(), s = sim.s; sim.financialBatch(); s.t++;
  ['current', 'plan', 'pastdue', 'delinquent', 'lien', 'notice', 'auction'].forEach((status, i) => {
    s.leases[i] = { id: i, status, rent: 100, nextBill: 2, balance: status === 'current' ? 0 : 200, fees: 0 };
  });
  const before = JSON.stringify(s), F = sim.scheduledOutlook();
  assert.equal(JSON.stringify(s), before); near(F.inflow, 100); near(F.atRisk, 1200);
  assert.equal(F.bills.length, 1); near(F.downside, F.net - 100);
  s.leases[0].nextBill = 32; near(sim.scheduledOutlook().inflow, 0);
});
test('forecast agrees with actual deterministic settlements and final commitments', () => {
  const sim = quiet(), s = sim.s; sim.financialBatch(); s.t++;
  const F = sim.scheduledOutlook(), cash = s.cash;
  advance(sim, financialTime(F.end)); near(s.cash - cash, F.net); near(sim.committedBills(), F.committedAfter);
  near(F.outflow + F.committedAfter, 18 + F.futureCosts);
});
test('new lease first month paid immediately, next bill 30 days later', () => {
  const sim = makeMaple(), s = sim.s;
  const u = sim.objs('unit').find((x) => !x.lease); u.commercial = 'ready';
  const cash = s.cash, L = sim.signLease(u, {});
  assert.ok(L); near(s.cash - cash, L.rent); assert.equal(L.nextBill, sim.day + 30);
});
test('legacy migration preserves finances/history exactly and skips already-paid current day', () => {
  for (const minute of [0, 419, 420, 421, 1439]) {
    const sim = makeScenario('turnaround'), s = JSON.parse(JSON.stringify(sim.s));
    delete s.finance; s.t = 9 * 1440 + minute; s.today.day = 10;
    s.ledger.push({ t: s.t - 1, amt: -123.45, cat: 'opex' });
    s.debt.push({ id: 999, bal: 10000, next: 35, pmt: 200, rate: 0.075 });
    const kept = JSON.stringify([s.cash, s.leases, s.tenants, s.debt, s.ledger, s.days, s.today]);
    const migrated = new Sim(s);
    assert.equal(JSON.stringify([s.cash, s.leases, s.tenants, s.debt, s.ledger, s.days, s.today]), kept);
    assert.equal(s.finance.lastDay, 10); near(migrated.committedBills(), 0);
    assert.equal(migrated.financialBatch(), false);
    const loaded = new Sim(JSON.parse(JSON.stringify(s))); near(loaded.s.cash, s.cash); near(loaded.committedBills(), 0);
  }
});
test('cash history reconciles even beyond transaction retention; legacy truncation is disclosed', () => {
  const sim = quiet(), cash = sim.s.cash;
  for (let i = 0; i < 2200; i++) sim.money(i % 2 ? -1 : 2, 'other', 'history stress');
  assert.equal(sim.s.ledger.length, 2000); near(sim.cashWindow(1).net, sim.s.cash - cash);
  const legacy = JSON.parse(JSON.stringify(sim.s)); delete legacy.finance; legacy.ledger = legacy.ledger.slice(-250);
  const migrated = new Sim(legacy); assert.equal(migrated.cashWindow(30).complete, false);
});
test('spending and hiring previews include obligations without mutating money', () => {
  const sim = quiet(); sim.financialBatch(); const before = sim.s.cash;
  const P = sim.financialPosition({ spend: 250, extraDaily: 12.5 });
  near(P.cash, before - 250); near(P.committed, 18); near(P.reserve, 500 + (18 + 12.5) * 14);
  near(sim.s.cash, before);
});
test('causal diagnostics use inventory, access, demand and measured capacity evidence', () => {
  const sim = makeScenario('turnaround');
  sim.s.mkt.lostLog.push({ d: 1, r: 'noReady', sz: '10x10', climate: false });
  const o = sim.operations(), ds = sim.diagnostics();
  assert.equal(o.makeReady, 11); assert.ok(o.askingOffline > 0);
  assert.ok(ds.some((d) => d.cause.includes('Gate')));
  assert.ok(ds.some((d) => d.cause.includes('10x10')));
  assert.ok(ds.every((d) => d.cause && d.effect && d.consequence && d.action));
  assert.ok(sim.staffingEvidence('porter').evidence.includes('11'));
  assert.ok(sim.growthReadiness().checks.some((c) => !c.ok));
});
test('growth checklist can pass on evidence and fails when turnover blocks the opportunity', () => {
  const sim = makeMaple(), s = sim.s; s.tut = { on: false, done: true }; s.t = financialTime(31); s.finance.lastDay = 31;
  s.tasks = []; for (const u of sim.objs('unit')) if (!u.lease) u.cstate = 'construction';
  for (const d of [24, 25, 26, 27, 28, 29, 30]) s.days.push({ day: d, workMeasured: true, ownerUsed: 3, ownerOffice: 1 });
  for (let i = 0; i < 8; i++) s.mkt.lostLog.push({ d: 28, r: 'noReady', sz: '10x10', climate: false });
  sim.rebuild();
  const plan = sim.plan({ tool: 'du10x10', a: { x: 13, y: 18 }, b: { x: 13, y: 25 } });
  const I = sim.investment(plan); assert.ok(I.range && I.range[1] < 12);
  assert.ok(sim.growthReadiness(plan).justified);
  for (const u of sim.objs('unit').slice(0, 5)) { delete s.leases[u.lease]; u.lease = null; u.commercial = 'unready'; }
  assert.equal(sim.growthReadiness(plan).justified, false);
});
test('UI financial and calendar surfaces use B+ truths and authoritative 7:00 dates', () => {
  const sim = makeMaple(), ui = Object.create(UI.prototype); ui.g = { sim };
  const html = ui.financialHtml();
  assert.ok(html.includes('Scheduled next 30 days') && html.includes('Available after bills &amp; reserve') && html.includes('At-risk receivables'));
  assert.ok(!html.includes('Normalized operating'));
  const events = ui.calendarEvents(); assert.ok(events.some((e) => e.label === 'Weekly expense settlement'));
  assert.ok(events.filter((e) => /billing|settlement|loan payment/.test(e.label)).every((e) => e.t % 1440 === 420));
});
test('career thresholds adjusted proportionally; property requirements unchanged', () => {
  assert.deepEqual(TIERS.slice(1).map((t) => t.roll), [4375, 8750, 18750, 37500]);
  assert.deepEqual(TIERS.slice(1).map((t) => t.props), [1, 2, 3, 4]);
});
test('deadline day remains eligible, meeting goals after it cannot win', () => {
  const sim = quiet(), s = sim.s;
  s.scenario = { id: 'deadline', status: 'active', goals: [{ k: 'roll', v: 0 }], deadline: 150, fail: { cashBelow: -99999, cashDays: 3 } };
  sim.scenarioCheck(150); assert.equal(s.scenario.status, 'won');
  s.scenario.status = 'active'; sim.scenarioCheck(151); assert.equal(s.scenario.status, 'lost');
});
test('midcycle B+ save/resume preserves commitments and identical future settlement', () => {
  const sim = quiet(); advance(sim, financialTime(4) + 1);
  sim.s.loan.bal = 1000;
  const resumed = new Sim(JSON.parse(JSON.stringify(sim.s)));
  advance(sim, financialTime(10)); advance(resumed, financialTime(10));
  assert.equal(JSON.stringify(resumed.s), JSON.stringify(sim.s));
});
test('overdue schedule forecast matches one bill/payment per future financial batch', () => {
  const sim = quiet(), s = sim.s; s.t = financialTime(70) + 1; s.finance.lastDay = 70;
  s.leases[1] = { id: 1, status: 'current', rent: 100, nextBill: 1, balance: 0, fees: 0 };
  s.debt.push({ id: 2, bal: 1000, rate: 0, pmt: 100, next: 1 });
  const f = sim.scheduledOutlook();
  assert.deepEqual(f.bills.map((b) => b.day), [71, 72, 73, 91]);
  assert.deepEqual(f.terms.map((p) => p.day), [71, 72, 73, 91]);
});
test('Business, Operate, Growth and modal HTML render without invalid numbers', () => {
  const sim = makeScenario('turnaround'), ui = Object.create(UI.prototype), modal = { innerHTML: '' };
  ui.g = { sim, rend: { overlay: null }, company: null }; ui.$ = () => modal;
  ui.title = false; ui.do = (a) => sim.dispatch(a);
  for (const method of ['businessSheet', 'operateSheet', 'growthSheet']) {
    const html = ui[method](); assert.ok(html.length > 100); assert.ok(!/NaN|undefined/.test(html), method);
  }
  for (const method of ['showFinances', 'showCalendar']) {
    ui[method](); assert.ok(modal.innerHTML.length > 100); assert.ok(!/NaN|undefined/.test(modal.innerHTML), method);
  }
  assert.equal(sim.s.scenario.goals.find((g) => g.k === 'roll').v, 3750);
});
console.log(`ALL PASS: ${checks} B+ tests`);
