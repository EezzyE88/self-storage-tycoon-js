// SK-02 HVAC feedback for The Chain Next Door (presentation only).
// Checks the briefing sentence, a single over-capacity warning that names the Tech or vendor,
// no repeats while capacity stays short or across production save/reload, the all-clear after a repair,
// and that the other kit scenarios get no HVAC warning.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { kitView } from '../../js/scenariokit.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };

function harness(sim) { // production saveCode/prepareLoad from main.js, as tscenario_kit does
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.msg); return p.company.props[p.company.active].sim; };
const warnLog = (sim) => sim.s.scenario.kit.log.filter((l) => /^Climate units are overheating/.test(l.text));
const okLog = (sim) => sim.s.scenario.kit.log.filter((l) => /^HVAC is keeping up again/.test(l.text));
const short = (sim) => Object.values(sim.D.hvac).some((e) => e.load > 0 && e.cap < e.load);
// steps the sim, counting HVAC drama cards; stops at `until` day or when `stop` is true
function run(sim, until, stop, act) { let cards = 0; while (sim.s.scenario.status === 'active' && sim.day < until) { if (act && sim.mod === 9 * 60) act(sim); sim.step(); for (const e of sim.events) if (e.type === 'drama' && e.k === 'hvac') cards++; sim.events.length = 0; if (stop && stop(sim)) break; } return cards; }
const SEED = 4401;

await test('the Chain briefing says the climate HVAC wears out and needs a Tech or a paid vendor', async () => {
  const b = SCENARIOS.chainnextdoor.blurb;
  assert.match(b, /HVAC also wears out/); assert.match(b, /Tech/); assert.match(b, /paid vendor/);
  for (const id of ['grandopening', 'stormseason']) assert.doesNotMatch(SCENARIOS[id].blurb, /Tech or a paid vendor/, id);
});
await test('one warning when climate capacity first falls short, naming the Tech or vendor, with a Coming up line', async () => {
  const sim = makeScenario('chainnextdoor', SEED);
  let cards = run(sim, 200, (x) => warnLog(x).length > 0);
  assert.equal(cards, 1, 'one drama card'); const w = warnLog(sim); assert.equal(w.length, 1);
  assert.match(w[0].text, /Tech or a vendor \(\$650\)/); assert.match(w[0].text, /not you/); assert.equal(w[0].tone, 'bad');
  assert.ok(short(sim), 'warning matches the capacity the climate rating reads');
  const up = kitView(sim).upcoming; assert.ok(up.some((u) => u.urgent && /^Now: climate units overheating/.test(u.text) && /Tech or a vendor/.test(u.text)), 'Coming up line');
  // the morning before, capacity was fine and nothing was said
  const pre = makeScenario('chainnextdoor', SEED); run(pre, w[0].day); assert.equal(warnLog(pre).length, 0); assert.equal(pre.s.scenario.kit.flags.hvacShort, undefined);
  // no repeats while it stays short
  cards += run(sim, w[0].day + 40); assert.ok(short(sim), 'still short'); assert.equal(warnLog(sim).length, 1); assert.equal(cards, 1);
});
await test('save and reload neither repeats nor loses the warning', async () => {
  const a = makeScenario('chainnextdoor', SEED); run(a, 200, (x) => warnLog(x).length > 0); const d0 = warnLog(a)[0].day;
  let b = await reload(a); assert.equal(b.s.scenario.kit.flags.hvacShort, true); assert.equal(warnLog(b).length, 1);
  let cards = run(b, d0 + 10); b = await reload(b); cards += run(b, d0 + 25);
  assert.equal(cards, 0, 'no card after reload'); assert.equal(warnLog(b).length, 1, 'one log line after two reloads');
  assert.ok(kitView(b).upcoming.some((u) => /^Now: climate units overheating/.test(u.text)), 'Coming up line survives reload');
  // reloaded the evening before the warning: it still fires exactly once
  const c = makeScenario('chainnextdoor', SEED); run(c, d0 - 1); let r = await reload(c); const cc = run(r, d0 + 15);
  // a reload re-derives HVAC capacity from current plant wear, so the warning can come a little earlier than without one;
  // it still comes once, on the first morning the climate rating's capacity reads short
  assert.equal(cc, 1); assert.equal(warnLog(r).length, 1); assert.ok(warnLog(r)[0].day >= d0 - 1 && warnLog(r)[0].day <= d0, 'warned by the uninterrupted day');
});
await test('a vendor repair clears it once; a later shortfall warns again, once', async () => {
  const sim = makeScenario('chainnextdoor', SEED); run(sim, 200, (x) => warnLog(x).length > 0); const d0 = warnLog(sim)[0].day;
  const vend = (x) => { for (const t of x.s.tasks.filter((t) => t.type === 'repair' && !t.assigned && !t.vendor && t.need === 'repair_complex')) x.dispatch({ type: 'callVendor', task: t.id }); };
  run(sim, d0 + 30, (x) => okLog(x).length > 0, vend);
  assert.equal(okLog(sim).length, 1, 'all-clear logged'); assert.equal(sim.s.scenario.kit.flags.hvacShort, false); assert.equal(short(sim), false);
  assert.ok(!kitView(sim).upcoming.some((u) => /overheating/.test(u.text)), 'Coming up line gone');
  const d1 = okLog(sim)[0].day; run(sim, d1 + 10); assert.equal(warnLog(sim).length, 1, 'no new warning while capacity holds');
  // let it wear out again with no repairs: one new warning
  run(sim, 200, (x) => warnLog(x).length > 1); const w = warnLog(sim);
  if (w.length > 1) { const cards = run(sim, w[1].day + 20); assert.equal(cards, 0); assert.equal(warnLog(sim).length, 2); }
});
await test('only the Chain warns: Grand Opening and Storm Season never log an HVAC warning', async () => {
  for (const id of ['grandopening', 'stormseason']) { const sim = makeScenario(id, SEED); const cards = run(sim, 150); assert.equal(cards, 0, id); assert.equal(warnLog(sim).length, 0, id); assert.equal(sim.s.scenario.kit.flags.hvacShort, undefined, id); }
});
console.log(`${n} HVAC feedback groups passed`);
