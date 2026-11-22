// PR #60 candidate repair: the scenario 30-day operating result (op30, used by Ironworks Lofts and Campus Crunch)
// counted miscellaneous 'other' cash as operating income, so a property cash transfer or opening working cash could
// satisfy an operating-result goal. op30 now uses exactly Sim.opResult()'s terms. Shared accounting is unchanged.
// Bookings exercised here (js/sim.js money()): transfers and opening working cash -> 'other' -> day.other;
// credit-line draws and term loans -> 'loan' -> day.fin; sandbox funds -> 'inject' -> day.inject; Free Build top-ups ->
// 'subsidy' -> day.inject. Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, makeSandbox, sbDefaults, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { scenarioMetric } from '../../js/scenariorules.js';
import { FINANCIAL_MINUTE } from '../../js/finance.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const NEW = ['ratereset', 'freightlift', 'campus'];
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
const toNextDay = (sim) => { const d = sim.day; while (sim.day === d) { sim.step(); sim.events.length = 0; } };
function game(props) {
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, makeSandbox, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    FINANCIAL_MINUTE, WORKING_FLOAT: 5000, FACILITY_NAMES: ['Oak Ridge Storage'], makeMapleSeedPrice: () => 60000,
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = props[0].sim; g.company = { props, active: 0, feed: [] }; return g;
}
const op = (sim) => scenarioMetric(sim, 'op30');
const agrees = (sim) => assert.equal(Math.round(op(sim)), sim.opResult(30).amt, `op30 ${op(sim)} vs opResult ${sim.opResult(30).amt} on day ${sim.day}`);
const campus31 = () => { const sim = makeScenario('campus', 13); days(sim, 31); return sim; };

await test('a property cash transfer into Campus Crunch (real game.transfer, booked as other) does not raise op30 or meet the $3,000 goal', async () => {
  const sim = campus31(), src = makeMaple(11); src.s.cash = 60000;
  const goal = sim.s.scenario.goals.find((g) => g.k === 'op30'); const before = op(sim); assert.equal(sim.goalMet(goal), false, 'passive run is below $3,000');
  const g = game([{ name: 'Campus', sim }, { name: 'Maple', sim: src }]);
  assert.equal(g.transfer(1, 0, 20000).ok, true); assert.equal(sim.s.today.other, 20000);
  toNextDay(sim); assert.equal(sim.s.days.at(-1).other, 20000, 'the transfer is in the closed day');
  assert.ok(op(sim) < before + 1000, `op30 ${op(sim)} not inflated (was ${before})`); agrees(sim); assert.equal(sim.goalMet(goal), false);
  // the sending side: a transfer out is not an operating cost either
  const out = campus31(); const g2 = game([{ name: 'Campus', sim: out }, { name: 'Maple', sim: makeMaple(12) }]);
  const b2 = op(out); assert.equal(g2.transfer(0, 1, 1000).ok, true); toNextDay(out); assert.ok(op(out) > b2 - 1000); agrees(out);
});
await test('opening working cash on an acquired property (real game.acquire, booked as other) is excluded from op30', async () => {
  const src = campus31(); src.s.cash = 80000; const g = game([{ name: 'Campus', sim: src }]);
  const r = g.acquire('parcel', 'blank'); assert.equal(r.ok, true, r.msg);
  const lot = g.company.props.at(-1).sim; assert.equal(lot.s.today.other, 5000);
  days(lot, 31); assert.ok(lot.s.days.some((d) => d.other === 5000)); assert.ok(op(lot) < 5000 - 1000 || op(lot) <= 0, 'op30 ' + op(lot)); agrees(lot);
  assert.match(readFileSync('js/main.js', 'utf8'), /sim\.money\(WORKING_FLOAT, 'other', 'Opening working cash/);
});
await test('credit-line draws and term-loan proceeds (booked as loan -> fin) cannot inflate op30; interest still counts as a cost', async () => {
  const sim = campus31(); const before = op(sim);
  const lim = sim.creditLimit() - sim.s.loan.bal; if (lim >= 1000) assert.equal(sim.dispatch({ type: 'loan', amt: 1000 }).ok, true);
  sim.money(15000, 'loan', 'Term loan (test booking, same category as act_borrow)');
  assert.ok(sim.s.today.fin >= 15000); toNextDay(sim); assert.ok(op(sim) < before + 1000); agrees(sim);
});
await test('owner/sandbox cash injections (act_sbFunds -> inject, Free Build -> subsidy) are excluded from op30', async () => {
  const sb = makeSandbox(sbDefaults('business')); assert.equal(sb.s.mode, 'sandbox');
  assert.equal(sb.dispatch({ type: 'sbFunds', amt: 25000 }).ok, true); assert.equal(sb.s.today.inject, 25000);
  sb.money(3000, 'subsidy', 'Free Build funds (test booking)');
  days(sb, 31); assert.ok(sb.s.days.some((d) => d.inject >= 28000)); assert.ok(op(sb) < 1000, 'op30 ' + op(sb)); agrees(sb);
});
await test('legitimate income and operating costs keep their treatment: rent and fees in; opex, payroll, service, marketing, interest out; capex, debt principal, other and loans out of op30', async () => {
  const A = campus31(), B = campus31(); toNextDay(A); toNextDay(B); assert.equal(op(A), op(B));
  const book = { rent: 1000, anc: 200, opex: -150, payroll: -50, service: -250, marketing: -40, interest: -10, capex: -5000, debt: -700, other: 9000, loan: 4000 };
  for (const [cat, amt] of Object.entries(book)) B.money(amt, cat, 'test ' + cat);
  toNextDay(A); toNextDay(B);
  assert.ok(Math.abs((op(B) - op(A)) - (1000 + 200 - 150 - 50 - 250 - 40 - 10)) < 1e-6, `delta ${op(B) - op(A)}`);
  const d = B.s.days.at(-1), e = A.s.days.at(-1);
  assert.equal(d.capex - e.capex, 5000); assert.equal((d.debt || 0) - (e.debt || 0), 700); assert.equal(d.other - e.other, 9000); assert.equal((d.fin || 0) - (e.fin || 0), 4000);
  agrees(A); agrees(B);
  // moving-supplies sales book price and cost to anc, so the margin counts, as before
  assert.match(readFileSync('js/supplies.js', 'utf8'), /money\(terms\.price, 'anc'[\s\S]*money\(-terms\.cost, 'anc'/);
});
await test('op30 agrees with opResult(30) every day of real Campus and Ironworks runs and is -1 before 30 days', async () => {
  for (const id of ['campus', 'freightlift']) { const sim = makeScenario(id, 12); sim.dispatch({ type: 'hire', role: 'porter' });
    for (let d = 1; d <= 45; d++) { toNextDay(sim); if (sim.s.days.length < 30) assert.equal(op(sim), -1); else agrees(sim); } }
});
await test('save and reload keep op30 identical, including a day with a transfer in the window', async () => {
  const sim = campus31(), src = makeMaple(11); src.s.cash = 60000; const g = game([{ name: 'Campus', sim }, { name: 'Maple', sim: src }]);
  g.transfer(1, 0, 12000); toNextDay(sim);
  const g1 = game([{ name: 'Campus', sim }]); const p = await g1.prepareLoad(await g1.saveCode()); assert.equal(p.ok, true);
  const back = p.company.props[p.company.active].sim;
  assert.equal(op(back), op(sim)); assert.equal(back.metric('op30'), sim.metric('op30')); agrees(back);
  days(sim, 2); days(back, 2); assert.equal(op(back), op(sim));
});
await test('other scenarios are unaffected: no older scenario goal uses op30, and their scenario metrics are unchanged', async () => {
  for (const [id, S] of Object.entries(SCENARIOS)) { if (NEW.includes(id)) continue;
    assert.equal(S.goals.some((g) => ['op30', 'upperRoll', 'elevUptime30'].includes(g.k)), false, id);
    const sim = makeScenario(id, 7); assert.equal(sim.s.scenario.goals.some((g) => g.k === 'op30'), false); }
  assert.equal(SCENARIOS.ratereset.goals.some((g) => g.k === 'op30'), false);
  assert.deepEqual(SCENARIOS.freightlift.goals.find((g) => g.k === 'op30').v, 1); assert.equal(SCENARIOS.campus.goals.find((g) => g.k === 'op30').v, 3000);
});
console.log(`ALL PASS: ${n} op30 operating-result groups; physical Safari NOT TESTED`);
