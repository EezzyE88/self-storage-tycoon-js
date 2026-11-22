// Bug-test round fixes for the Nov 22 scenarios (Harborview Rate Reset, Ironworks Lofts, Campus Crunch).
// B1 two-cab elevator uptime, B2 outcome opens the panel (rules scenarios only), B3 negative-cash wording,
// B4 crew-log day count, B5/B7 rule and hold-deadline lines, B8 Campus rush line, and older scenarios unchanged.
// Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeScenario, SCENARIOS } from '../../js/scenarios.js';
import { elevatorInService, elevatorCabs, cashText, crewSummary } from '../../js/scenariorules.js';
import { scenarioRulesHtml, holdLine, rushLine } from '../../js/newscenarioui.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const NEW = ['ratereset', 'freightlift', 'campus'];
const OLD = Object.keys(SCENARIOS).filter((id) => !NEW.includes(id));
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
const esc = (x) => String(x).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

await test('B1: with two elevator cabs, one broken cab is not an outage; both broken is', async () => {
  const sim = makeScenario('freightlift', 21); sim.s.cash = 20000;
  const r = sim.dispatch({ type: 'build', tool: 'elevator', a: { x: 26, y: 10 }, b: { x: 26, y: 10 } }); assert.equal(r.ok, true, r.msg);
  days(sim, 3);
  const [e1, e2] = sim.objs('elevator'); assert.ok(e1 && e2 && e2.cstate === 'operating', 'second cab commissioned');
  e1.cond = 0.1; sim.markDirty(); sim.rebuild(); days(sim, 1); e1.cond = 0.1;
  assert.equal(sim.works(e1), false, 'cab 1 broken'); assert.equal(sim.works(e2), true, 'cab 2 working');
  {
    assert.equal(elevatorInService(sim), true, 'one working cab keeps the lift in service');
    assert.deepEqual(elevatorCabs(sim), { total: 2, up: 1 });
    assert.match(strip(scenarioRulesHtml(sim, esc)), /in service \(1 of 2 cabs working\)/);
  }
  const fake = { s: { t: 0 }, objs: () => [{ cstate: 'operating' }, { cstate: 'operating' }], works: () => false };
  assert.equal(elevatorInService(fake), false, 'all cabs down is out of service');
  const one = { s: { t: 0 }, objs: () => [{ cstate: 'operating', ok: 1 }, { cstate: 'operating' }], works: (e) => !!e.ok };
  assert.equal(elevatorInService(one), true); assert.deepEqual(elevatorCabs(one), { total: 2, up: 1 });
  const single = makeScenario('freightlift', 22); assert.deepEqual(elevatorCabs(single), { total: 1, up: 1 }, 'the authored single cab is unchanged');
});

await test('B3: negative cash thresholds read -$1,500 on rules scenarios and keep the old format elsewhere', async () => {
  for (const id of NEW) { const sc = makeScenario(id, 11).s.scenario; assert.equal(cashText(sc, -1500), '-$1,500'); assert.equal(cashText(sc, 2500), '$2,500'); }
  for (const id of OLD) { const sim = makeScenario(id, 11), sc = sim.s.scenario; if (!sc) continue; assert.equal(sc.rules, undefined, id + ' has no rules'); assert.equal(cashText(sc, -1500), '$-1,500', id + ' unchanged'); }
  const src = readFileSync('js/sim.js', 'utf8');
  assert.match(src, /stayed below \$\{cashText\(sc, f\.cashBelow\)\}/); assert.match(src, /below \$\{cashText\(sc, f\.cashBelow\)\} - \$\{f\.cashDays\}/);
});

await test('B7: the hold line names the last start day, and says when the hold can no longer finish', async () => {
  const sc = { status: 'active', hold: 14, deadline: 100, held: 0 };
  assert.equal(holdLine({ day: 1 }, sc), 'Goals held together: 0 of 14 days in a row · to finish by the deadline, start the hold by Day 87');
  assert.equal(holdLine({ day: 87 }, sc), 'Goals held together: 0 of 14 days in a row · to finish by the deadline, start the hold by Day 87');
  assert.match(holdLine({ day: 88 }, sc), /not enough days left to finish the hold before the deadline$/);
  assert.equal(holdLine({ day: 90 }, { ...sc, held: 5 }), 'Goals held together: 5 of 14 days in a row');
  assert.match(holdLine({ day: 95 }, { ...sc, held: 5 }), /not enough days left/);
  assert.equal(holdLine({ day: 60 }, { ...sc, status: 'won', held: 14 }), 'Goals held together: 14 of 14 days in a row');
});

await test('B5: the Ironworks fail rule is visible from Day 1 and leaves the panel after the outcome', async () => {
  const sim = makeScenario('freightlift', 31), sc = sim.s.scenario;
  assert.match(strip(scenarioRulesHtml(sim, esc)), /Elevator: in service · the run ends if it is out at the 7:00 AM check 10 mornings in a row/);
  sc.downDays = 3; assert.match(strip(scenarioRulesHtml(sim, esc)), /3 of 10 mornings down at 7:00 AM/);
  sc.status = 'won'; const h = strip(scenarioRulesHtml(sim, esc)); assert.match(h, /Elevator: in service/); assert.doesNotMatch(h, /run ends|mornings down/);
});

await test('B4: the crew line counts only the days actually logged', async () => {
  const sim = makeScenario('campus', 41); sim.dispatch({ type: 'hire', role: 'porter' });
  days(sim, 4);
  const rows = crewSummary(sim.s, 7), logged = Math.max(...rows.map((r) => r.days)); assert.ok(logged >= 1 && logged < 7);
  assert.match(strip(scenarioRulesHtml(sim, esc)), new RegExp(`Crew, last ${logged} day${logged === 1 ? '' : 's'}:`));
  days(sim, 6); assert.match(strip(scenarioRulesHtml(sim, esc)), /Crew, last 7 days:/);
});

await test('B8: Campus shows where the run is relative to the rush; other scenarios show no rush line', async () => {
  const r = { from: 18, to: 31, m: 3 };
  assert.equal(rushLine(1, r), 'Fall rush: Day 18–31, starts in 17 days; few shoppers until then');
  assert.equal(rushLine(17, r), 'Fall rush: Day 18–31, starts in 1 day; few shoppers until then');
  assert.equal(rushLine(18, r), 'Fall rush is on through Day 31: lots of shoppers, have units ready');
  assert.equal(rushLine(32, r), 'Fall rush ended on Day 31: few shoppers now');
  const sim = makeScenario('campus', 41), sc = sim.s.scenario;
  assert.match(strip(scenarioRulesHtml(sim, esc)), new RegExp(`Fall rush: Day ${sc.rush}–${sc.rush + 13}, starts in ${sc.rush - 1} days`));
  sc.status = 'won'; assert.doesNotMatch(strip(scenarioRulesHtml(sim, esc)), /Fall rush/);
  for (const id of ['ratereset', 'freightlift']) assert.doesNotMatch(strip(scenarioRulesHtml(makeScenario(id, 41), esc)), /rush/i);
});

await test('B2: the outcome opens the panel for rules scenarios only (older scenarios keep their behavior)', async () => {
  const ui = readFileSync('js/ui.js', 'utf8'); const line = ui.split('\n').find((l) => l.includes("case 'scenario_end'"));
  assert.match(line, /if \(e\.comeback \|\| this\.sim\?\.s\.scenario\?\.rules\) this\.scMin = false;/);
  assert.match(line, /this\.sfx\(e\.won \? 'milestone' : 'attention'\); this\.toast\(/); assert.match(line, /this\.renderTut\(true\); break;/);
  assert.doesNotMatch(line, /\/\/ /, 'no line comment swallowing the handler');
});

console.log(`ALL PASS: ${n} new-scenario bugfix groups; physical Safari NOT TESTED`);
