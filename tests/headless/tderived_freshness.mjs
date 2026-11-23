// SK-02 C1: derived lighting and HVAC values stay fresh when equipment wears past the 45% step.
// Checks the threshold crossing itself, stored-equals-recomputed values through long runs in several modes,
// and that an uninterrupted run and one saved and reloaded mid-way (production saveCode/prepareLoad) stay identical.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, TOOLS } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };

function harness(sim) { // production saveCode/prepareLoad from main.js, as tscenario_kit does
  const main = readFileSync('js/main.js', 'utf8');
  const context = vm.createContext({ Sim, SCENARIOS, Audio: class {}, fmtTime, modeLabel, sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g;
}
const reload = async (sim) => { const g = harness(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.msg); return p.company.props[p.company.active].sim; };
const run = (sim, day) => { while (sim.day < day && (!sim.s.scenario || sim.s.scenario.status === 'active' || sim.s.scenario.status == null)) { sim.step(); sim.events.length = 0; } return sim; };
const hvacOf = (D) => JSON.stringify(Object.entries(D.hvac).map(([k, e]) => [k, Math.round(e.cap * 1000), Math.round(e.load * 1000)]).sort());
const litOf = (D) => D.lit.map((L) => Array.from(L, (v) => Math.round(v * 1000)).join(',')).join('|');
const fresh = (sim) => new Sim(JSON.parse(JSON.stringify(sim.s))).D; // a newly built sim derives everything from current state
const sig = (sim) => { const s = sim.s; return JSON.stringify([sim.day, s.t, Math.round(sim.financialPosition().cash * 100), Object.values(s.leases).map((L) => [L.unit, L.rent, L.status]), Object.values(s.tenants).map((t) => Math.round(t.sat * 1e6)), Object.entries(s.exp).map(([k, v]) => [k, Math.round(v * 1e6)]), s.mkt.reviews.length, Object.values(s.objects).map((o) => o.cond == null ? null : Math.round(o.cond * 1e6)), s.scenario?.status]); };

await test('a light or HVAC plant wearing past 45% refreshes its derived value at once; wear itself is unchanged', async () => {
  const sim = makeScenario('chainnextdoor', 4401); sim.ensure();
  const hv = sim.objs('hvac').find((h) => h.cond >= 0.45), cap0 = sim.D.hvac[hv.serves].cap;
  const before = hv.cond; sim.wear(hv, before - 0.44);
  assert.ok(Math.abs(hv.cond - 0.44) < 1e-9, 'wear amount applied exactly'); assert.equal(sim.dirty, true, 'HVAC crossing marks dirty');
  sim.ensure(); assert.ok(Math.abs(sim.D.hvac[hv.serves].cap - (cap0 - TOOLS.hvac.capacity * 0.2)) < 1e-9, 'plant derated to 80%');
  const L = sim.objs('light').find((l) => !l.mount && l.cond >= 0.45 && sim.works(l)), i = sim.idx(L.x, L.y), f = L.f || 0;
  assert.equal(sim.D.lit[f][i], 1); sim.wear(L, L.cond - 0.44); assert.equal(sim.dirty, true, 'light crossing marks dirty');
  sim.ensure(); assert.equal(sim.D.lit[f][i], 0.75, 'light dimmed to 75%');
  // other equipment has no derived value at 45%: no extra rebuild
  const cam = sim.objs('camera').find((c) => c.cond >= 0.45); sim.wear(cam, cam.cond - 0.44); assert.equal(sim.dirty, false, 'camera at 45% needs no rebuild');
  // further wear between 45% and 20% does not rebuild again; the 20% failure still does
  sim.wear(hv, 0.1); assert.equal(sim.dirty, false); sim.wear(hv, hv.cond - 0.19); assert.equal(sim.dirty, true, '20% failure still rebuilds');
});
await test('stored HVAC capacity and light levels always equal a fresh recompute (Grand Opening, Chain, Storm Season, Cedar Creek)', async () => {
  for (const [id, seed, days] of [['grandopening', 4401, 120], ['chainnextdoor', 99, 120], ['stormseason', 1, 100], ['comeback', 4401, 60]]) {
    const sim = makeScenario(id, seed); let checks = 0;
    while (sim.day < days && (!sim.s.scenario || sim.s.scenario.status === 'active')) {
      sim.step(); sim.events.length = 0;
      if (sim.mod === 7 * 60 + 1) { sim.ensure(); const F = fresh(sim); assert.equal(hvacOf(sim.D), hvacOf(F), `${id} HVAC fresh on day ${sim.day}`); assert.equal(litOf(sim.D), litOf(F), `${id} lights fresh on day ${sim.day}`); checks++; }
    }
    assert.ok(checks >= 50, id + ' checked daily');
  }
});
await test('an uninterrupted run and one saved and reloaded mid-way stay identical (cases that diverged before this fix)', async () => {
  for (const [id, seed, at, until] of [['grandopening', 4401, 64, 140], ['chainnextdoor', 99, 70, 95], ['chainnextdoor', 4401, 61, 90], ['comeback', 4401, 20, 60]]) {
    const a = run(makeScenario(id, seed), until);
    let b = run(makeScenario(id, seed), at); b = await reload(b); run(b, until);
    assert.equal(sig(b), sig(a), `${id} seed ${seed}, reloaded on day ${at}, matches on day ${until}`);
  }
});
await test('repeated reloads across the wear window are invisible: reload every 3 days through the HVAC derate', async () => {
  const a = run(makeScenario('grandopening', 99), 110);
  let b = makeScenario('grandopening', 99); for (let d = 52; d < 110; d += 3) { run(b, d); b = await reload(b); } run(b, 110);
  assert.equal(sig(b), sig(a));
});
console.log(`${n} derived freshness groups passed`);
