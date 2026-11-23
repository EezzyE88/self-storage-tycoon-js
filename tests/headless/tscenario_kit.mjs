// SK-01 scenario kit: Grand Opening, Storm Season and The Chain Next Door.
// Checks seeded starts, held goals, decisions, projects, checkpoints, endings, the result record,
// production save/reload mid-run, and that the older scenarios never get kit state.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { KIT_SCENARIOS } from '../../js/kitscenarios.js';
import { isKit, validResult, resultCheck, kitView } from '../../js/scenariokit.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const IDS = ['grandopening', 'stormseason', 'chainnextdoor'];

function harness(sim) { // production saveCode/prepareLoad from main.js, as tscenario_rules_save does
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.msg); return p.company.props[p.company.active].sim; };
// a simple engaged player: answers with a fixed policy, fixes equipment, opens ready units
function player(policy, extra) {
  return (sim) => { const s = sim.s, k = s.scenario.kit;
    for (const t of s.tasks.filter((t) => !t.assigned && !t.vendor && t.type === 'repair')) if (ROLES.owner.can.includes(t.need)) sim.dispatch({ type: 'ownerTask', task: t.id });
    for (const c of [...s.convos]) if (c.actions?.length) sim.dispatch({ type: 'convo', id: c.id, i: 0 });
    if (k.pending) { let i = policy[k.pending.id]; if (i == null) for (const [p, v] of Object.entries(policy)) if (k.pending.id.startsWith(p)) i = v; if (i != null) { const r = sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i }); if (!r.ok) sim.dispatch({ type: 'scnChoice', ev: k.pending.id, i: k.pending.def }); } }
    if (extra) extra(sim); };
}
function play(sim, f, untilDay = 999) { const s = sim.s; while (s.scenario.status === 'active' && sim.day < untilDay) { if (sim.mod === 9 * 60 && f) f(sim); sim.step(); sim.events.length = 0; } return sim; }
const PLANS = {
  grandopening: player({ finance: 1, opening: 0, movers: 0, rival: 1, bulk: 1 }, (sim) => { const s = sim.s; if (!s.mkt.ad) sim.dispatch({ type: 'ad', kind: 'local' }); if (sim.financialPosition().netLiquid < -3000 && s.loan.bal < sim.creditLimit() - 2000) sim.dispatch({ type: 'loan', amt: 2000 }); }),
  stormseason: player({ insure: 1, prep: 1, repair: 0, claims: 1 }),
  // SK-02: the Chain's climate building has HVAC plants that only a Tech or a paid vendor can repair; the plan books the vendor through the normal action
  chainnextdoor: player({ retain: 0, poach: 1, sponsor: 0, office: 0 }, (sim) => { const s = sim.s; for (const t of s.tasks.filter((t) => t.type === 'repair' && !t.assigned && !t.vendor && t.need === 'repair_complex' && s.objects[t.obj]?.type === 'hvac')) sim.dispatch({ type: 'callVendor', task: t.id }); if (!s.mkt.ad) sim.dispatch({ type: 'ad', kind: 'local' }); if ((sim.day - 1) % 15 === 0) for (const key of Object.keys(s.market.ask)) { const [size, env] = key.split('|'); sim.dispatch({ type: 'setRent', key, v: Math.round(sim.marketRent({ size, env }) * 0.93 / 5) * 5 }); } }),
};

await test('the three kit scenarios are listed with goals, holds and fail text, and the older four are unchanged', async () => {
  for (const id of IDS) { const S = SCENARIOS[id]; assert.ok(S && S.kit, id); assert.ok(S.goals.length >= 3 && S.hold >= 10 && S.winFrom > 1 && S.deadline > S.winFrom && S.failText, id); }
  for (const id of ['comeback', 'turnaround', 'vertical', 'climate']) { assert.ok(SCENARIOS[id] && !SCENARIOS[id].kit, id); const sim = makeScenario(id, 11); assert.equal(isKit(sim.s), false, id); assert.equal(sim.metric('opProfit30'), 0, id + ' unknown metrics stay 0'); }
});
await test('every kit start opens cleanly: open for business, nothing under construction, valid kit state', async () => {
  for (const id of IDS) { const sim = makeScenario(id, 5), s = sim.s, k = s.scenario.kit;
    assert.equal(s.open, true, id); assert.deepEqual(sim.openingIssues(), [], id); assert.equal(s.orders.length, 0, id);
    assert.ok(sim.objs('unit').length >= 36 && sim.objs('unit').every((u) => u.cstate === 'operating'), id + ' units operate');
    assert.equal(k.v, 1); assert.equal(k.seed, 5); assert.ok(k.events.length >= 2); assert.equal(s.scenario.status, 'active');
    assert.equal(JSON.stringify(JSON.parse(JSON.stringify(s.scenario))), JSON.stringify(s.scenario), id + ' kit state is plain JSON'); }
});
await test('starts are seeded: the same seed repeats exactly, different seeds differ, and no seed picks a fresh one', async () => {
  for (const id of IDS) {
    const a = makeScenario(id, 21), b = makeScenario(id, 21), c = makeScenario(id, 22);
    const sig = (sim) => JSON.stringify([sim.s.scenario.kit.events.map((e) => e.day), sim.s.scenario.kit.storms?.map((x) => [x.day, x.sev]), Object.values(sim.s.leases).map((L) => [L.unit, L.rent])]);
    assert.equal(sig(a), sig(b), id + ' same seed'); assert.notEqual(sig(a), sig(c), id + ' different seed');
    const r1 = makeScenario(id), r2 = makeScenario(id); assert.ok(r1.s.scenario.kit.seed > 0 && r1.s.scenario.kit.seed !== r2.s.scenario.kit.seed, id + ' run seed');
  }
  assert.equal(JSON.stringify(makeScenario('comeback').s.objects), JSON.stringify(makeScenario('comeback', 4401).s.objects), 'Cedar Creek keeps its fixed default seed');
});
await test('decisions: one at a time, invalid or unaffordable answers refused, unanswered ones take the stated default', async () => {
  const sim = makeScenario('grandopening', 3), s = sim.s, k = s.scenario.kit;
  play(sim, null, 2); assert.equal(k.pending?.id, 'finance');
  assert.equal(sim.dispatch({ type: 'scnChoice', ev: 'nope', i: 0 }).ok, false);
  assert.equal(sim.dispatch({ type: 'scnChoice', ev: 'finance', i: 7 }).ok, false);
  const r = sim.dispatch({ type: 'scnChoice', ev: 'finance', i: 1 }); assert.equal(r.ok, true);
  assert.equal(k.flags.io, true); assert.equal(k.checks.find((c) => c.id === 'm2').v, 0.75, 'interest-only raises the Day 120 check');
  assert.ok(s.debt[0].pmt < 1200, 'interest-only payment');
  assert.equal(sim.dispatch({ type: 'scnChoice', ev: 'finance', i: 0 }).ok, false, 'answered once');
  play(sim, null, k.events.find((e) => e.id === 'opening').day + 1); assert.equal(k.pending?.id, 'opening');
  s.cash = 100; assert.equal(sim.dispatch({ type: 'scnChoice', ev: 'opening', i: 0 }).ok, false, 'cannot afford the event');
  s.cash = 12000; const exp = k.pending.expires; play(sim, null, exp + 1);
  assert.equal(k.events.find((e) => e.id === 'opening').choice, 2, 'default after expiry'); assert.match(k.log.map((l) => l.text).join('|'), /no answer, default/);
});
await test('goals must hold together for the full count of mornings; a miss resets the count', async () => {
  const sim = makeScenario('chainnextdoor', 4), s = sim.s, sc = s.scenario, k = sc.kit;
  const real = sim.goalMet.bind(sim); let met = true; sim.goalMet = (g) => met;
  play(sim, null, sc.winFrom - 1); assert.equal(k.streak, 0, 'nothing counts before winFrom');
  play(sim, null, sc.winFrom + sc.hold - 2); assert.equal(sc.status, 'active'); assert.equal(k.streak, sc.hold - 2);
  met = false; play(sim, null, sim.day + 1); assert.equal(k.streak, 0, 'reset');
  met = true; play(sim, null, sim.day + sc.hold + 1); assert.equal(sc.status, 'won'); sim.goalMet = real;
  assert.ok(validResult(k.result) && k.result.won && k.result.held >= sc.hold && k.result.stars >= 1);
});
await test('lender checks warn, open a cure period, and end the run only if still missed; a passive Grand Opening loses that way', async () => {
  const sim = play(makeScenario('grandopening', 99)), sc = sim.s.scenario, k = sc.kit;
  assert.equal(sc.status, 'lost'); assert.match(sc.why, /lender called/i);
  const c = k.checks.find((x) => x.result === 'fail'); assert.ok(c && c.warned && c.cureUntil === c.day + c.cure, 'warned and cured period used');
  assert.ok(validResult(k.result) && !k.result.won && k.result.stars === 0);
});
await test('Storm Season: storms damage units and equipment, crews and patches repair, insurance pays later, projects reduce damage', async () => {
  const sim = makeScenario('stormseason', 2), s = sim.s, k = s.scenario.kit;
  play(sim, player({ insure: 2, prep: 2, repair: 1, claims: 0 }), k.storms[0].day + 1);
  const st = k.storms[0]; assert.equal(st.hit, true); assert.ok(st.units >= 1, 'units damaged');
  assert.ok(k.damage.length >= 1 && k.damage.every((d) => d.state === 'crew'), 'contractor booked');
  play(sim, null, k.storms[0].day + 12); assert.ok(k.damage.slice(0, st.units).every((d) => d.state === 'fixed'), 'crew finished');
  assert.ok(k.payouts.some((p) => p.paid), 'insurance paid');
  const hardened = makeScenario('stormseason', 2), plain = makeScenario('stormseason', 2);
  hardened.s.cash = 20000; assert.equal(hardened.dispatch({ type: 'scnProject', id: 'fixtures' }).ok, true); assert.equal(hardened.dispatch({ type: 'scnProject', id: 'fixtures' }).ok, false, 'once');
  const d0 = plain.s.scenario.kit.storms[0].day + 1; play(hardened, null, d0); play(plain, null, d0);
  assert.ok(hardened.s.scenario.kit.storms[0].units < plain.s.scenario.kit.storms[0].units, 'reinforcement cuts unit damage');
});
await test('The Chain Next Door: Vaultline opens, answers deep price cuts with deeper ones, and backs off when you hold', async () => {
  const chase = makeScenario('chainnextdoor', 8), hold = makeScenario('chainnextdoor', 8);
  const cut = (sim) => { const s = sim.s, c = s.mkt.comp[0]; if (!c || sim.day % 7) return; for (const key of Object.keys(s.market.ask)) { const [size, env] = key.split('|'); sim.dispatch({ type: 'setRent', key, v: Math.round(sim.marketRent({ size, env }) * (c.price - 0.02) / 5) * 5 }); } };
  play(chase, player({}, cut), 130); play(hold, player({}), 130);
  const c1 = chase.s.mkt.comp[0], c2 = hold.s.mkt.comp[0];
  assert.ok(chase.s.scenario.kit.wars >= 3 && c1.price <= 0.74, 'price war escalates'); assert.equal(hold.s.scenario.kit.wars, 0); assert.ok(c2.price >= 0.86, 'no war when you hold');
  assert.equal(chase.s.drama.wars[c1.id], 'none', 'the generic one-off price war stays off for the kit rival');
});
await test('save and reload mid-run through the production loader continues identically to an uninterrupted run', async () => {
  for (const id of IDS) {
    const plan = PLANS[id];
    const a = play(makeScenario(id, 31), plan, 46);
    const b = await reload(a); assert.ok(isKit(b.s), id);
    assert.equal(JSON.stringify(b.s.scenario), JSON.stringify(a.s.scenario), id + ' scenario state survives reload');
    const c = await reload(b); assert.equal(JSON.stringify(c.s.scenario.kit), JSON.stringify(a.s.scenario.kit), id + ' twice');
    play(a, plan); play(b, plan);
    assert.equal(b.s.scenario.status, a.s.scenario.status, id); assert.equal(b.s.scenario.endDay, a.s.scenario.endDay, id);
    assert.equal(JSON.stringify(b.s.scenario.kit.result), JSON.stringify(a.s.scenario.kit.result), id + ' same result');
    const ended = await reload(a); assert.equal(ended.s.scenario.status, a.s.scenario.status); assert.ok(validResult(ended.s.scenario.kit.result), id + ' result valid after reload');
  }
});
await test('a played plan wins each scenario on a fixed seed; passive play loses each one', async () => {
  for (const id of IDS) {
    const won = play(makeScenario(id, 1), PLANS[id]); assert.equal(won.s.scenario.status, 'won', id + ' plan wins: ' + (won.s.scenario.why || ''));
    const lost = play(makeScenario(id, 1)); assert.equal(lost.s.scenario.status, 'lost', id + ' passive loses');
    assert.ok(lost.s.scenario.why && lost.s.scenario.kit.result && !lost.s.scenario.kit.result.won);
  }
});
await test('the result record is versioned and self-checking: edits are detected', async () => {
  const sim = play(makeScenario('stormseason', 1), PLANS.stormseason), r = sim.s.scenario.kit.result;
  assert.ok(validResult(r)); assert.equal(r.v, 1); assert.equal(r.id, 'stormseason'); assert.equal(r.check, resultCheck(r));
  assert.equal(validResult({ ...r, stars: 3, check: r.check }), r.stars === 3, 'stars edit'); assert.equal(validResult({ ...r, day: r.day - 1 }), false, 'day edit');
  assert.equal(validResult({ ...r, won: !r.won }), false); assert.equal(validResult(null), false);
  assert.ok(Array.isArray(kitView(sim).log));
});
await test('kit scenarios never touch manual Pause, and time only moves when stepped', async () => {
  for (const id of IDS) { const sim = makeScenario(id, 9); assert.equal(sim.s.speed, 0, id + ' starts paused'); const t = sim.s.t; play(sim, null, 3); assert.equal(sim.s.speed, 0, id); assert.ok(sim.s.t > t); }
});
// ---- D1/D2: operating profit excludes transfers and other non-operating receipts; insurance is a non-operating receipt
const opOnly = (sim) => sim.s.days.slice(-30).reduce((a, x) => a + x.rent + (x.anc || 0) - x.opex - x.payroll - (x.service || 0) - (x.marketing || 0), 0);
const stepDay = (sim) => { const d = sim.day; while (sim.day === d) { sim.step(); sim.events.length = 0; } };
await test('D1: a transfer from another property never counts as operating profit or debt-service coverage', async () => {
  const a = play(makeScenario('grandopening', 31), PLANS.grandopening, 60), b = play(makeScenario('grandopening', 31), PLANS.grandopening, 60);
  assert.equal(JSON.stringify(a.s.days), JSON.stringify(b.s.days), 'twins match before the transfer');
  const g = harness(a), other = makeScenario('chainnextdoor', 5); g.company.props.push({ name: 'Second Lot', sim: other }); other.s.cash = 20000;
  const cash0 = a.s.cash, r = g.transfer(1, 0, 10000); assert.equal(r.ok, true, r.msg); assert.equal(a.s.cash - cash0, 10000, 'the transfer arrives as cash');
  assert.equal(a.s.ledger.at(-1).cat, 'other'); assert.equal(a.s.today.other >= 10000, true, 'booked on the other line');
  stepDay(a); stepDay(b);
  assert.equal(Math.round(a.metric('opProfit30')), Math.round(opOnly(a)), 'opProfit30 is operating-only');
  assert.equal(a.metric('opProfit30'), b.metric('opProfit30'), 'transfer leaves operating profit unchanged');
  assert.equal(a.metric('dscr'), b.metric('dscr'), 'transfer leaves DSCR unchanged');
  assert.equal(Math.round(a.s.cash - b.s.cash), 10000, 'cash differs by exactly the transfer');
});
await test('D2: Storm Season insurance payouts are paid once, as non-operating cash that never enters operating profit', async () => {
  const sim = makeScenario('stormseason', 31), s = sim.s, f = player({ insure: 1, prep: 1, repair: 0, claims: 1 }); const k = s.scenario.kit;
  let seen = 0;
  while (s.scenario.status === 'active') {
    const paidBefore = k.payouts.filter((p) => p.paid).length, rows = s.ledger.length, anc0 = s.today.anc || 0, other0 = s.today.other || 0;
    if (sim.mod === 9 * 60) f(sim); sim.step(); sim.events.length = 0;
    const newly = k.payouts.filter((p) => p.paid).length - paidBefore;
    if (newly > 0 && s.today.day === sim.day) {
      const paid = k.payouts.filter((p) => p.paid).slice(-newly), amt = paid.reduce((a, p) => a + p.amt, 0);
      const ins = s.ledger.slice(rows).filter((l) => l.note === 'Insurance payout');
      assert.equal(ins.length, newly, 'one ledger row per payout'); assert.ok(ins.every((l) => l.cat === 'insurance'), 'category insurance');
      assert.equal(ins.reduce((a, l) => a + l.amt, 0), amt, 'ledger amount equals the payout');
      assert.equal((s.today.other || 0) - other0, amt, 'payout on the non-operating line'); assert.equal((s.today.anc || 0) - anc0, 0, 'not ancillary revenue');
      seen += newly;
    }
  }
  assert.ok(seen >= 1, 'at least one payout was paid'); assert.equal(seen, k.payouts.filter((p) => p.paid).length);
  assert.equal(k.payouts.filter((p) => p.paid).length, s.ledger.filter((l) => l.note === 'Insurance payout').length, 'paid exactly once each');
  const recorded = s.finance.cashDays.reduce((a, d) => a + (d.categories.insurance || 0), 0), recent = k.payouts.filter((p) => p.paid && p.day > sim.day - 90).reduce((a, p) => a + p.amt, 0);
  assert.equal(Math.round(recorded), Math.round(recent), 'cash-day categories carry the receipts');
  assert.ok(!s.days.some((d) => (d.anc || 0) > 0 && s.ledger.some((l) => l.cat === 'anc' && l.note === 'Insurance payout')), 'no payout booked as anc');
});
await test('D1: debt-service coverage is operating profit over the current loan payment; loan draws and added funds never count', async () => {
  for (const finance of [0, 1]) {
    const plan = player({ finance, opening: 0, movers: 0, rival: 1, bulk: 1 }, (sim) => { if (!sim.s.mkt.ad) sim.dispatch({ type: 'ad', kind: 'local' }); });
    for (const day of [60, 120]) {
      const a = play(makeScenario('grandopening', 31), plan, day), b = play(makeScenario('grandopening', 31), plan, day);
      if (a.s.scenario.status !== 'active') continue;
      const pay = a.s.debt.reduce((x, d) => x + d.pmt, 0); assert.equal(a.metric('debtPay'), pay, 'debtPay is the current loan payment');
      assert.ok(Math.abs(a.metric('dscr') - opOnly(a) / pay) < 1e-9, 'DSCR recomputes from operating lines only');
      a.money(2000, 'loan', 'Credit line draw'); a.money(3000, 'inject', 'Added funds'); stepDay(a); stepDay(b);
      assert.equal(a.metric('dscr'), b.metric('dscr'), `finance ${finance} day ${day}: loan draws and added funds leave DSCR unchanged`);
    }
  }
});
async function claimReload(answer) {
  const pol = answer ? { insure: 2, prep: 2, repair: 0, claims: 0 } : { insure: 2, prep: 2, repair: 0 };
  for (const seed of [31, 3, 11, 29, 47, 61, 88, 5]) {
    const f = player(pol), base = play(makeScenario('stormseason', seed), f);
    const a = makeScenario('stormseason', seed), s = a.s;
    while (s.scenario.status === 'active' && !(s.scenario.kit.pending && s.scenario.kit.pending.id.startsWith('claims') && a.mod > 7 * 60 && a.mod < 9 * 60)) { if (a.mod === 9 * 60) f(a); a.step(); a.events.length = 0; }
    if (s.scenario.status !== 'active') continue;
    const id = s.scenario.kit.pending.id, b = await reload(a);
    assert.equal(JSON.stringify(b.s.scenario), JSON.stringify(s.scenario), 'pending claim survives reload');
    play(b, f);
    assert.equal(JSON.stringify(b.s.scenario.kit.result), JSON.stringify(base.s.scenario.kit.result), 'same result as an uninterrupted run');
    assert.equal(b.s.cash, base.s.cash); assert.equal(b.s.ledger.length, base.s.ledger.length);
    const ev = b.s.scenario.kit.events.find((e) => e.id === id), ev0 = base.s.scenario.kit.events.find((e) => e.id === id);
    assert.equal(ev.choice, ev0.choice); assert.equal(ev.choice, answer ? 0 : 2, answer ? 'answered: pay all' : 'expired: the default applies');
    const claimPays = (x) => x.s.scenario.kit.payouts.filter((p) => p.why === 'claims').length;
    assert.equal(claimPays(b), claimPays(base), 'claims payouts are not duplicated or lost');
    if (answer) assert.ok(claimPays(b) >= 1, 'full cover repays a paid claim');
    return seed;
  }
  assert.fail('no seed opened a claims decision');
}
await test('a reload while a claims decision is waiting continues identically when the player answers', async () => { await claimReload(true); });
await test('a reload while a claims decision is waiting continues identically when it expires to its default', async () => { await claimReload(false); });
console.log(`${n} scenario kit groups passed`);
