// Harborview redevelopment (HV-1 site, HV-2 harbor business, HV-3 scenery) against released master ccc5cf2.
// argv[2]: an exported copy of master ccc5cf2 (its js/ folder), used for old-save loading and for proving the
// other scenarios start and run byte-identically. Native headless only; physical Safari NOT TESTED.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { Sim, fmtTime } from '../../js/sim.js';
import { MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, G } from '../../js/data.js';
import { makeScenario, SCENARIOS, modeLabel, sandboxName } from '../../js/scenarios.js';
import { frontageOf, validateFrontage, layoutIds } from '../../js/frontage.js';
import { accessState } from '../../js/mapleaccess.js';
import { HV_SITE_LAYOUT, HARBORVIEW_SITE } from '../../js/harborviewsite.js';

const MASTER = process.argv[2];
assert.ok(MASTER, 'usage: node tests/headless/tharborview.mjs <export of master ccc5cf2>');
let n = 0; const test = async (name, f) => { await f(); console.log('PASS ' + name); n++; };
const days = (sim, d) => { for (let i = 0; i < d * 1440; i++) { sim.step(); sim.events.length = 0; } };
function harnessFor(root, mods) {
  const main = readFileSync(root + '/js/main.js', 'utf8');
  const context = vm.createContext({ Sim: mods.Sim, SCENARIOS: mods.SCENARIOS, Audio: class {}, fmtTime: mods.fmtTime, modeLabel: mods.modeLabel, sandboxName: mods.sandboxName, MARKETS, ROLES, MIN_PER_DAY, FLOOR_H, BUILD: { name: 'test' }, localsave: { ok: false }, savearchive: {}, cloud: { ok: false },
    CompressionStream, DecompressionStream, Response, Blob, btoa, atob, escape, unescape, encodeURIComponent, decodeURIComponent, performance, console: { warn() {} } });
  vm.runInContext(main.slice(main.indexOf('const game = {'), main.indexOf('// initial world')) + main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice')) + ';globalThis.game=game;', context);
  return (sim) => { const g = context.game; g.sim = sim; g.company = { props: [{ name: sim.s.scenario?.name || 'Lot', sim }], active: 0, feed: [] }; return g; };
}
const here = harnessFor('.', { Sim, SCENARIOS, fmtTime, modeLabel, sandboxName });
const M = { ...(await import(MASTER + '/js/sim.js')), ...(await import(MASTER + '/js/scenarios.js')) };
const there = harnessFor(MASTER, M);
const reload = async (sim) => { const g = here(sim); const p = await g.prepareLoad(await g.saveCode()); assert.equal(p.ok, true, p.reason); return p.company.props[p.company.active].sim; };

await test('HV-1 Pier Road: registered valid descriptor, 44 units (14 10x10, 30 5x10), 41 leased, office outside the gate with full access', () => {
  assert.ok(layoutIds().includes(HV_SITE_LAYOUT));
  const K = frontageOf(HV_SITE_LAYOUT);
  assert.deepEqual(validateFrontage(HARBORVIEW_SITE.frontage), []); assert.deepEqual(validateFrontage(K.desc), []);
  for (const seed of [11, 12, 13]) {
    const sim = makeScenario('ratereset', seed), s = sim.s, F = K.desc;
    assert.equal(s.layout, HV_SITE_LAYOUT);
    const us = sim.objs('unit');
    assert.equal(us.length, 44); assert.equal(us.filter((u) => u.size === '10x10').length, 14); assert.equal(us.filter((u) => u.size === '5x10').length, 30);
    assert.equal(us.filter((u) => u.lease).length, 41);
    assert.deepEqual(us.filter((u) => u.blocked || u.cstate !== 'operating').map((u) => u.num), []);
    const office = sim.objs('office'), gate = sim.objs('gate');
    assert.equal(office.length, 1); assert.equal(gate.length, 1);
    assert.deepEqual([office[0].x, office[0].y, office[0].w, office[0].h], [F.office.x, F.office.y, F.office.w, F.office.h]);
    assert.deepEqual([gate[0].x, gate[0].y], [F.gate.x, F.gate.y]);
    assert.ok(office[0].y + office[0].h >= gate[0].y, 'office front sits on the public forecourt, south of the gate line');
    for (let y = 0; y < s.H; y++) for (let x = 0; x < s.W; x++) if (K.bay(x, y) >= 0) assert.equal(s.ground[sim.idx(x, y)], G.PARKING);
    const a = accessState(sim); assert.ok(a.pedestrian && a.parking && a.staff, 'full public, parking and staff access');
    assert.equal(sim.objs('light').length, 5); assert.equal(sim.objs('camera').length, 0);
  }
});

await test('HV-1 routes: over 20 days every public visitor parks in a bay and reaches the office without passing the gate; tenants use the gate', () => {
  const sim = makeScenario('ratereset', 12), s = sim.s, K = sim.frontage(), g = sim.objs('gate')[0];
  const tr = new Map(), done = [];
  while (sim.day <= 20) {
    if (sim.mod === 540 && s.scenario.kit?.pending) sim.dispatch({ type: 'scnChoice', ev: s.scenario.kit.pending.id, i: s.scenario.kit.pending.def });
    for (const c of [...s.convos]) { const r = sim.dispatch({ type: 'convo', id: c.id, i: c.auto ?? 0 }); if (!r || !r.ok) s.convos = s.convos.filter((x) => x !== c); }
    sim.step(); sim.events.length = 0;
    const live = new Set();
    for (const ag of s.agents) {
      if (ag.kind === 'staff') continue; live.add(ag.id);
      let t = tr.get(ag.id); if (!t) tr.set(ag.id, t = { pub: !!ag.publicVisit, states: [], bay: false, nearGate: false });
      if (t.states.at(-1) !== ag.st) t.states.push(ag.st);
      const v = sim.vehAt(ag.veh); if (v) { const cx = Math.floor(v.x), cy = Math.floor(v.y); if (!v.moving && K.bay(cx, cy) >= 0) t.bay = true; if (Math.abs(cx - g.x) <= 1 && Math.abs(cy - g.y) <= 1) t.nearGate = true; }
    }
    for (const [id, t] of tr) if (!live.has(id)) { done.push(t); tr.delete(id); }
  }
  const pubs = done.filter((t) => t.pub), ten = done.filter((t) => !t.pub && t.states.includes('atunit'));
  assert.ok(pubs.length >= 10, 'enough public visits to judge: ' + pubs.length);
  assert.equal(pubs.filter((t) => t.bay).length, pubs.length, 'every public visitor parked in a customer bay');
  assert.equal(pubs.filter((t) => t.states.includes('office')).length, pubs.length, 'every public visitor reached the office');
  assert.equal(pubs.filter((t) => t.states.includes('gateq') || t.nearGate).length, 0, 'no public visitor went through the gate');
  assert.ok(ten.length >= 50 && ten.every((t) => t.states.includes('gateq')), 'tenant trips go through the gate: ' + ten.length);
});

await test('HV-1 saves: a Harborview save made on master ccc5cf2 (classic yard) loads and plays on; a new save reloads identically; master refuses the new layout id', async () => {
  const old = M.makeScenario('ratereset', 12); days(old, 5);
  const gOld = there(old), code = await gOld.saveCode();
  const p = await here(makeScenario('ratereset', 12)).prepareLoad(code);
  assert.equal(p.ok, true, p.reason); const back = p.company.props[p.company.active].sim;
  assert.equal(back.s.layout ?? null, old.s.layout ?? null); assert.equal(back.objs('unit').length, 44);
  const beforeDay = back.day; days(back, 3); assert.equal(back.day, beforeDay + 3); assert.notEqual(back.s.scenario.status, undefined);
  const sim = makeScenario('ratereset', 12); days(sim, 5);
  const twin = await reload(sim); assert.equal(twin.s.layout, HV_SITE_LAYOUT);
  days(sim, 3); days(twin, 3); assert.equal(JSON.stringify(twin.s), JSON.stringify(sim.s), 'reloaded run continues identically');
  const p3 = await there(M.makeScenario('ratereset', 12)).prepareLoad(await here(sim).saveCode());
  assert.equal(p3.ok, false); assert.match(String(p3.reason), /layout/i);
});

await test('HV-1 isolation: every other scenario starts and runs 10 days byte-identically to master ccc5cf2', () => {
  for (const id of Object.keys(SCENARIOS).filter((x) => x !== 'ratereset')) for (const seed of [7, 11]) {
    const a = makeScenario(id, seed), b = M.makeScenario(id, seed);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), id + ' start');
    days(a, 10); days(b, 10);
    assert.equal(JSON.stringify(a.s), JSON.stringify(b.s), id + ' day 10');
  }
});

console.log(`ALL PASS: ${n} Harborview groups; physical Safari NOT TESTED`);
