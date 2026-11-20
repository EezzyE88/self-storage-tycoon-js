// Scenario R2.0 foundation: starting briefing, Coming up, and the 7-day goal confirmation with the
// deadline-day exception. Comeback Yard stays milestone-driven (no hold). Production saveCode/prepareLoad
// run in a vm, as in tscenario_rules_save.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { HOLD_DAYS, needsBriefing, briefing, comingUp, holdLine, BRIEFS } from '../../js/scenarioframe.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };

function harness(sim) {
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const p = await harness(sim).prepareLoad(await harness(sim).saveCode()); assert.equal(p.ok, true); return p.company.props[p.company.active].sim; };
// one daily goal checkpoint (7:00 financial batch) per call
const nextCheck = (sim) => { const F = sim.s.finance, d = F.lastDay; do { sim.step(); sim.events.length = 0; } while (F.lastDay === d); };
const forceGoals = (sim, met) => { sim.goalMet = () => met(); };

await test('timed goals must hold for 7 straight daily checks before the win', () => {
  const sim = makeScenario('turnaround'); const sc = sim.s.scenario; let met = true; forceGoals(sim, () => met);
  for (let i = 1; i < HOLD_DAYS; i++) { nextCheck(sim); assert.equal(sc.status, 'active', 'not won on check ' + i); assert.equal(sc.hold, i); assert.equal(holdLine(sc), `Holding ${i}/${HOLD_DAYS} days`); }
  nextCheck(sim); assert.equal(sc.status, 'won'); assert.equal(sc.hold, HOLD_DAYS); assert.equal(holdLine(sc), '');
});
await test('a slip resets the hold', () => {
  const sim = makeScenario('climate'); const sc = sim.s.scenario; let met = true; forceGoals(sim, () => met);
  for (let i = 0; i < 4; i++) nextCheck(sim); assert.equal(sc.hold, 4);
  met = false; nextCheck(sim); assert.equal(sc.hold, 0); assert.equal(holdLine(sc), '');
  met = true; for (let i = 0; i < HOLD_DAYS - 1; i++) nextCheck(sim); assert.equal(sc.status, 'active'); nextCheck(sim); assert.equal(sc.status, 'won');
});
await test('deadline-day exception: goals met on the deadline day win with an unfinished hold', () => {
  const sim = makeScenario('vertical'); const sc = sim.s.scenario; let met = false; forceGoals(sim, () => met);
  nextCheck(sim); sc.deadline = sim.day + 2; nextCheck(sim); assert.equal(sc.status, 'active');
  met = true; nextCheck(sim); assert.equal(sim.day, sc.deadline); assert.equal(sc.status, 'won'); assert.equal(sc.hold, 1); assert.equal(sc.endDay, sc.deadline);
});
await test('deadline passing with goals unmet still loses (unchanged rule)', () => {
  const sim = makeScenario('vertical'); const sc = sim.s.scenario; forceGoals(sim, () => false);
  nextCheck(sim); sc.deadline = sim.day + 1; nextCheck(sim); nextCheck(sim); assert.equal(sc.status, 'lost'); assert.match(sc.why, /deadline passed/);
});
await test('a hold that has started still wins on the deadline day, not after it', () => {
  const sim = makeScenario('turnaround'); const sc = sim.s.scenario; forceGoals(sim, () => true);
  nextCheck(sim); sc.deadline = sim.day + 2; nextCheck(sim); assert.equal(sc.status, 'active'); nextCheck(sim);
  assert.equal(sc.status, 'won'); assert.equal(sc.endDay, sc.deadline); assert.equal(sc.hold, 3);
});
await test('Comeback Yard stays milestone-driven with no hold', () => {
  const sim = makeScenario('comeback'); const sc = sim.s.scenario; assert.equal(sc.hold, undefined);
  for (let i = 0; i < 3; i++) nextCheck(sim); assert.equal(sc.hold, undefined); assert.equal(holdLine(sc), '');
});
await test('briefing: every scenario has one, it shows once, and it is generated text', () => {
  for (const id of Object.keys(SCENARIOS)) {
    const sim = makeScenario(id); const s = sim.s; assert.ok(BRIEFS[id], id); assert.equal(needsBriefing(s), true, id);
    const b = briefing(sim); assert.equal(b.length, 3, id); assert.ok(b.join(' ').split(/\s+/).length <= 60, id + ' is concise: ' + b.join(' ').split(/\s+/).length + ' words');
    assert.match(b[1], /^\$[\d,]+ cash/, id); assert.ok(b.every((l) => !/[<>"`]/.test(l)), id);
    const speed = s.speed; assert.equal(sim.dispatch({ type: 'scenBriefed' }).ok, true); assert.equal(s.scenario.briefed, 1); assert.equal(needsBriefing(s), false); assert.equal(s.speed, speed, 'manual Pause/speed untouched');
  }
  const old = makeScenario('turnaround'); delete old.s.scenario.briefed; assert.equal(needsBriefing(old.s), false, 'a run saved before R2.0 never re-shows a briefing');
  const maple = makeMaple(3); assert.equal(needsBriefing(maple.s), false); assert.deepEqual(comingUp(maple), []);
});
await test('Coming up reads existing dates, soonest first, at most 2', () => {
  const sim = makeScenario('turnaround'), s = sim.s, sc = s.scenario; nextCheck(sim);
  const Ls = Object.values(s.leases).filter((L) => L.status === 'current'); const d = sim.day;
  Ls[0].rentNotice = { rent: Ls[0].rent + 30, previousRent: Ls[0].rent, issuedAt: s.t, effectiveDay: d + 4, expiresDay: d + 64, pct: 0.08, valueHit: 0, asked: false };
  Ls[1].rentNotice = { rent: Ls[1].rent + 20, previousRent: Ls[1].rent, issuedAt: s.t, effectiveDay: d + 4, expiresDay: d + 64, pct: 0.08, valueHit: 0, asked: false };
  const all = comingUp(sim, 9); assert.ok(all.some((x) => x.day === d + 4 && x.text === 'Rent increases +$50/mo take effect'), JSON.stringify(all));
  const st = sim.scheduledOutlook().settlements[0]; assert.ok(all.some((x) => x.day === st.day && /^Weekly bills about \$[\d,]+ settle$/.test(x.text)));
  for (let i = 1; i < all.length; i++) assert.ok(all[i].day >= all[i - 1].day, 'sorted');
  sc.badDays = 3; const ends = comingUp(sim, 9).find((x) => /^Run ends if net liquid stays under -\$5,000$/.test(x.text)); assert.equal(ends.day, d + sc.fail.cashDays - 3);
  assert.ok(comingUp(sim).length <= 2); sc.deadline = d + 10; assert.ok(comingUp(sim, 9).some((x) => x.day === d + 10 && x.text === 'Scenario deadline'));
  const late = Object.values(s.leases).find((L) => L.status !== 'current') || Ls[2]; late.status = 'notice'; late.noticeUntil = d + 6;
  assert.ok(comingUp(sim, 9).some((x) => x.day === d + 6 && /^Lien notice ends · Unit /.test(x.text)));
  sc.status = 'won'; assert.deepEqual(comingUp(sim), []);
});
await test('reading the briefing and Coming up writes nothing and draws no random numbers', () => {
  const sim = makeScenario('turnaround'); nextCheck(sim); const before = JSON.stringify(sim.s);
  for (let i = 0; i < 20; i++) { briefing(sim); comingUp(sim); holdLine(sim.s.scenario); needsBriefing(sim.s); }
  assert.equal(JSON.stringify(sim.s), before);
});
await test('hold and briefing state survive the production save path unchanged', async () => {
  const sim = makeScenario('turnaround'); forceGoals(sim, () => true); for (let i = 0; i < 3; i++) nextCheck(sim);
  let loaded = await reload(sim); assert.equal(loaded.s.scenario.hold, 3); assert.equal(loaded.s.scenario.briefed, 0);
  loaded.dispatch({ type: 'scenBriefed' }); loaded = await reload(loaded); assert.equal(loaded.s.scenario.briefed, 1); assert.equal(loaded.s.scenario.hold, 3);
  loaded.goalMet = () => true; for (let i = 0; i < HOLD_DAYS - 3 - 1; i++) nextCheck(loaded); assert.equal(loaded.s.scenario.status, 'active'); nextCheck(loaded); assert.equal(loaded.s.scenario.status, 'won');
  const cb = makeScenario('comeback'); const lc = await reload(cb); assert.equal(lc.s.scenario.status, 'active', 'Comeback with briefed field still loads as valid'); assert.equal(lc.s.scenario.briefed, 0);
});
console.log(`${n} scenario frame checks passed`);
