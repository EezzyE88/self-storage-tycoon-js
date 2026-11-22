// Nov 22 prototype scenarios: Harborview Rate Reset, Ironworks Lofts, Campus Crunch.
// Checks the builds, per-run seeds and variants, that the scenario-only rules exist only on these three starts,
// the hold / elevator-uptime / crew-log / demand-curve rules, save and reload, and a passive-vs-careful smoke run.
// Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { makeMaple } from '../../js/maple.js';
import { demandFactor, turnWorkFactor, scenarioMetric, holdStep, extraFail, elevatorInService, crewSummary } from '../../js/scenariorules.js';
import { scenarioRulesHtml } from '../../js/newscenarioui.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const NEW = ['ratereset', 'freightlift', 'campus'];
const OLD = Object.keys(SCENARIOS).filter((id) => !NEW.includes(id));
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
function harness(sim) {
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true); return p.company.props[p.company.active].sim; };

await test('the three new scenarios build fully commissioned, deterministic per seed, and draw different starts from different seeds', async () => {
  for (const id of NEW) {
    assert.equal(SCENARIOS[id].perRun, true);
    const a = makeScenario(id, 11), b = makeScenario(id, 11);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), id + ' same seed, same start');
    assert.ok(a.objs('unit').length >= 30 && a.objs('unit').every((u) => u.cstate === 'operating'), id + ' units operating');
    assert.equal(a.s.scenario.status, 'active'); assert.ok(a.s.scenario.rules); assert.equal(a.s.scenario.seed, 11);
    assert.equal(a.s.cash, SCENARIOS[id].cash);
    const vars = new Set([11, 12, 13].map((sd) => makeScenario(id, sd).s.scenario.variant));
    assert.equal(vars.size, 3, id + ' three seeds give three variants');
    assert.notEqual(JSON.stringify(makeScenario(id, 12).s.leases), JSON.stringify(a.s.leases), id + ' leases vary by seed');
  }
});
await test('no existing scenario, Maple or Sandbox start carries scenario rules, so every hook is neutral there', async () => {
  for (const id of OLD) { const sim = makeScenario(id, 7); assert.equal(sim.s.scenario.rules, undefined, id);
    assert.equal(demandFactor(sim.s, 20), 1); assert.equal(turnWorkFactor(sim.s), 1);
    assert.equal(holdStep(sim.s.scenario, true), true); assert.equal(holdStep(sim.s.scenario, false), false);
    assert.equal(extraFail(sim, sim.s.scenario), null); assert.equal(scenarioMetric(sim, 'occ'), undefined);
    assert.equal(sim.s.scenario.held, undefined); assert.equal(sim.s.scenario.downDays, undefined); }
  const m = makeMaple(11); assert.equal(m.s.scenario ?? null, null); assert.equal(demandFactor(m.s, 20), 1); assert.equal(turnWorkFactor(m.s), 1);
  days(m, 2); assert.equal(m.s.days.some((d) => 'crew' in d || 'elevHrs' in d), false);
});
await test('goals must hold together for the full hold before the win, and a broken day resets the count', async () => {
  const sc = { rules: {}, hold: 3, held: 0 };
  assert.equal(holdStep(sc, true), false); assert.equal(holdStep(sc, true), false); assert.equal(holdStep(sc, false), false); assert.equal(sc.held, 0);
  assert.equal(holdStep(sc, true), false); assert.equal(holdStep(sc, true), false); assert.equal(holdStep(sc, true), true);
});
await test('Ironworks samples elevator service hourly; an out-of-service cab lowers uptime and ends the run after 10 days', async () => {
  const sim = makeScenario('freightlift', 11); const el = sim.objs('elevator')[0];
  assert.equal(elevatorInService(sim), true); days(sim, 8);
  const up = scenarioMetric(sim, 'elevUptime30'); assert.ok(up > 0, 'uptime sampled after a week: ' + up);
  el.cond = 0.1; assert.equal(elevatorInService(sim), false);
  for (let d = 0; d < 12 && sim.s.scenario.status === 'active'; d++) { el.cond = 0.1; days(sim, 1); }
  assert.equal(sim.s.scenario.status, 'lost'); assert.match(sim.s.scenario.why, /no working elevator for 10 days/);
  assert.ok(scenarioMetric(sim, 'elevUptime30') < up);
});
await test('Campus Crunch: the demand curve follows the rush, make-ready is three times heavier, and the crew log records Porter hours', async () => {
  const sim = makeScenario('campus', 13); const r = sim.s.scenario.rush;
  assert.equal(demandFactor(sim.s, 3), 0.3); assert.equal(demandFactor(sim.s, r), 3); assert.equal(demandFactor(sim.s, r + 13), 3); assert.equal(demandFactor(sim.s, r + 14), 0.25);
  assert.equal(turnWorkFactor(sim.s), 3);
  assert.equal(sim.dispatch({ type: 'hire', role: 'porter' }).ok, true); days(sim, 8);
  const rows = crewSummary(sim.s, 7); const p = rows.find((x) => x.role === 'porter');
  assert.ok(p && p.cap > 0 && p.used > 0, 'porter hours logged: ' + JSON.stringify(rows));
  assert.match(scenarioRulesHtml(sim, esc), /Crew, last 7 days: .*porter/);
});
await test('save and reload keep the variant, seed, rules, hold count, downtime and logs, and the run continues identically', async () => {
  for (const id of NEW) {
    const sim = makeScenario(id, 12); days(sim, 6);
    const back = await reload(sim);
    for (const k of ['id', 'variant', 'seed', 'hold', 'held', 'downDays', 'deadline']) assert.equal(JSON.stringify(back.s.scenario[k]), JSON.stringify(sim.s.scenario[k]), id + ' ' + k);
    const J = JSON.stringify; assert.equal(J(back.s.scenario.rules), J(sim.s.scenario.rules)); assert.equal(J(back.s.scenario.goals), J(sim.s.scenario.goals));
    assert.equal(J(back.s.days.map((d) => [d.crew, d.elevHrs, d.elevUp])), J(sim.s.days.map((d) => [d.crew, d.elevHrs, d.elevUp])));
    days(sim, 3); days(back, 3);
    assert.equal(Math.round(back.s.cash), Math.round(sim.s.cash), id + ' cash after 3 more days'); assert.equal(back.rentRoll(), sim.rentRoll());
  }
});
await test('passive smoke: doing nothing does not win any new scenario on seed 11 (the full careful-vs-passive matrix is in the balance CSV)', async () => {
  for (const id of NEW) { const sim = makeScenario(id, 11); const sc = sim.s.scenario;
    for (let i = 0; i < (sc.deadline + 2) * 1440 && sc.status === 'active'; i++) { sim.step(); sim.events.length = 0; }
    assert.equal(sc.status, 'lost', id + ' passive outcome'); }
});
console.log(`ALL PASS: ${n} new-scenario groups; physical Safari NOT TESTED`);
