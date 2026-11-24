// Reusable public-office frontage (U1): Maple routing identical to master 7e906d8,
// a test-only synthetic layout with different office, parking and gate positions,
// keep-clear refusals, and explicit refusal of unknown layout ids on load.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import vm from 'node:vm';
import * as OLD from '../fixtures/frontage/mapleaccess_7e906d8.mjs';
import * as NEW from '../../js/mapleaccess.js';
import { MAPLE_PUBLIC, MAPLE_FRONTAGE, frontageOf, knownLayout, layoutIds, validateFrontage, registerFrontage } from '../../js/frontage.js';
import { CEDAR, CEDAR_LAYOUT } from '../../js/cedarcreek.js';
import { makeMaple, makePublicMaple } from '../../js/maple.js';
import { makeSandbox, modeLabel, sandboxName } from '../../js/scenarios.js';
import { Sim, fmtTime } from '../../js/sim.js';
import { G, MARKETS, MIN_PER_DAY, ROLES } from '../../js/data.js';
import { SYNTH, SYNTH_DESC, makeSynthetic, registerSynthetic } from '../fixtures/frontage/synthetic.mjs';
import { KIT_SITES, GO_SITE_LAYOUT, SS_SITE_LAYOUT, CN_SITE_LAYOUT } from '../../js/kitsites.js';
import { makeScenario } from '../../js/scenarios.js';
import { accessState } from '../../js/mapleaccess.js';

let groups = 0;
const test = async (name, fn) => { await fn(); console.log('PASS ' + name); groups++; };
const build = (tool, x, y, x1 = x, y1 = y) => ({ type: 'build', tool, f: 0, a: { x, y }, b: { x: x1, y: y1 } });
const snap = (sim) => JSON.stringify(sim.s);
const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const norm = (a) => JSON.stringify(a, (k, v) => (v instanceof Set ? [...v].sort((x, y) => x - y) : v));
function complete(sim, a) { const r = sim.dispatch(a); assert.ok(r.ok, r.msg); sim.completeOrder(sim.s.orders.find((o) => o.id === r.order)); sim.ensure(); }
function refused(sim, a, reason) {
  const before = snap(sim), q = sim.plan(a);
  assert.equal(q.status, 'invalid'); assert.match(q.reasons.join(' '), reason);
  assert.equal(sim.dispatch(a).ok, false); assert.equal(snap(sim), before);
}

await test('Maple, Cedar Creek and the three SK-02 kit sites ship; every descriptor passes the validator and Maple keeps every master constant', () => {
  // Exact shipped inventory: any unplanned registration still fails here.
  assert.deepEqual(layoutIds(), [MAPLE_PUBLIC, CEDAR_LAYOUT, GO_SITE_LAYOUT, SS_SITE_LAYOUT, CN_SITE_LAYOUT, 'harborview-office-v1']);
  // Each kit site: its own id, a valid frozen registered copy, and a scenario start that matches it with full access.
  for (const [id, layout] of [['grandopening', GO_SITE_LAYOUT], ['stormseason', SS_SITE_LAYOUT], ['chainnextdoor', CN_SITE_LAYOUT]]) {
    const raw = KIT_SITES[id].frontage, K = frontageOf(layout);
    assert.equal(raw.id, layout); assert.deepEqual(validateFrontage(raw), []); assert.deepEqual(validateFrontage(K.desc), []);
    assert.ok(Object.isFrozen(K.desc) && Object.isFrozen(K.desc.gate.lanes) && Object.isFrozen(K.desc.fence));
    const sim = makeScenario(id, 4401), F = K.desc, office = sim.objs('office'), gate = sim.objs('gate');
    assert.equal(sim.s.layout, layout); assert.equal(office.length, 1); assert.equal(gate.length, 1);
    assert.deepEqual({ x: office[0].x, y: office[0].y, w: office[0].w, h: office[0].h, door: office[0].door, staffDoor: office[0].staffDoor },
      { x: F.office.x, y: F.office.y, w: F.office.w, h: F.office.h, door: F.office.door, staffDoor: F.office.staffDoor });
    assert.deepEqual([gate[0].x, gate[0].y, gate[0].mapleCompound], [F.gate.x, F.gate.y, true]);
    for (let y = 0; y < sim.s.H; y++) for (let x = 0; x < sim.s.W; x++) if (K.bay(x, y) >= 0) assert.equal(sim.s.ground[sim.idx(x, y)], G.PARKING);
    const a = accessState(sim); assert.ok(a.pedestrian && a.parking && a.staff, id + ' opens with full public, parking and staff access');
    assert.deepEqual(sim.objs('unit').filter((u) => u.blocked || u.cstate !== 'operating').map((u) => u.num), [], id + ' units all open');
  }
  assert.deepEqual(validateFrontage(CEDAR.desc), []);
  assert.deepEqual(validateFrontage(MAPLE_FRONTAGE.desc), []);
  assert.ok(Object.isFrozen(MAPLE_FRONTAGE.desc) && Object.isFrozen(MAPLE_FRONTAGE.desc.gate.lanes));
  const sim = makePublicMaple(), office = sim.objs('office')[0], gate = sim.objs('gate')[0], F = MAPLE_FRONTAGE.desc;
  assert.deepEqual({ x: office.x, y: office.y, w: office.w, h: office.h, door: office.door, staffDoor: office.staffDoor },
    { x: F.office.x, y: F.office.y, w: F.office.w, h: F.office.h, door: F.office.door, staffDoor: F.office.staffDoor });
  assert.deepEqual([gate.x, gate.y, gate.mapleCompound], [F.gate.x, F.gate.y, true]);
  for (let y = 0; y < sim.s.H; y++) for (let x = 0; x < sim.s.W; x++) {
    if (MAPLE_FRONTAGE.bay(x, y) >= 0) assert.equal(sim.s.ground[sim.idx(x, y)], G.PARKING);
  }
});

await test('exhaustive Maple edge equivalence with master 7e906d8 for every cell, neighbour, staff mode and gate id', () => {
  const variants = [];
  const base = makePublicMaple(); base.ensure(); variants.push(['opening', base]);
  const shut = makePublicMaple(); shut.objs('gate')[0].cstate = 'construction'; shut.markDirty(); shut.ensure(); variants.push(['gate offline', shut]);
  const two = makePublicMaple(); two.s.cash = 90000; complete(two, build('aisle', 31, 17, 33, 29)); complete(two, build('gate', 32, 29)); variants.push(['second classic gate', two]);
  let edges = 0;
  for (const [name, sim] of variants) {
    const s = sim.s, ids = [null, NEW.publicDrive, ...sim.objs('gate').map((g) => g.id), 99999];
    for (const o of Object.values(s.objects)) assert.equal(NEW.recessed(s, o), OLD.recessed(s, o), name + ' recessed ' + o.id);
    for (let y = -1; y <= s.H; y++) for (let x = -1; x <= s.W; x++) {
      assert.equal(NEW.pocket(x, y), OLD.pocket(x, y)); assert.equal(NEW.publicBay(x, y), OLD.publicBay(x, y));
      for (const [dx, dy] of DIRS) {
        const nx = x + dx, ny = y + dy;
        for (const staff of [null, false, true]) assert.equal(MAPLE_FRONTAGE.pedestrianEdge(x, y, nx, ny, staff), OLD.pedestrianEdge(x, y, nx, ny, staff), `${name} ped ${x},${y}->${nx},${ny} ${staff}`);
        for (const id of ids) assert.equal(MAPLE_FRONTAGE.vehicleEdge(sim, x, y, nx, ny, id), OLD.vehicleEdge(sim, x, y, nx, ny, id), `${name} veh ${x},${y}->${nx},${ny} ${id}`);
        edges++;
      }
    }
  }
  assert.ok(edges > 3 * 44 * 34 * 4);
});

await test('accessState and lostMapleAccess equal master for a placement corpus, pending orders and live visitors', () => {
  const tools = ['walk', 'power', 'aisle', 'du10x10', 'light', 'parking'];
  let compared = 0;
  const compareAll = (sim) => {
    for (const pending of [true, false]) assert.equal(norm(NEW.accessState(sim, null, pending)), norm(OLD.accessState(sim, null, pending)));
    for (const tool of tools) for (let y = 12; y < 31; y += 1) for (let x = 2; x < 30; x += 2) {
      const plan = sim.plan(build(tool, x, y, x + (tool === 'walk' || tool === 'aisle' ? 2 : 0), y));
      for (const pending of [true, false]) {
        const a = NEW.accessState(sim, plan, pending), b = OLD.accessState(sim, plan, pending);
        assert.equal(norm(a), norm(b), `${tool} ${x},${y} ${pending}`);
        assert.equal(NEW.lostMapleAccess(NEW.accessState(sim), a), OLD.lostMapleAccess(OLD.accessState(sim), b));
        compared++;
      }
    }
  };
  const sim = makePublicMaple(); compareAll(sim);
  sim.s.cash = 90000; const r = sim.dispatch(build('walk', 12, 29)); assert.ok(r.ok, r.msg); compareAll(sim);
  const live = makePublicMaple(7); live.s.visits = []; live.s.t = 510;
  live.startVisit({ kind: 'prospect', size: '5x10', keen: true });
  for (let i = 0; i < 40; i++) live.step();
  assert.ok(live.s.agents.some((a) => a.publicVisit)); compareAll(live);
  const classic = makeMaple(); assert.equal(norm(NEW.accessState(classic)), norm(OLD.accessState(classic)));
  assert.ok(compared > 3000);
});

await test('no layout identity checks outside the frontage, Maple builder and Maple tutorial content', () => {
  const allowed = new Set(['frontage.js', 'mapleaccess.js', 'maple.js', 'tutorial.js', 'cedarcreek.js']);
  for (const f of readdirSync('js').filter((f) => f.endsWith('.js') && !allowed.has(f))) {
    const src = readFileSync('js/' + f, 'utf8');
    assert.ok(!/MAPLE_PUBLIC|maple-public-office|\.layout\s*[!=]==/.test(src), f + ' must read the frontage descriptor instead of the Maple layout id');
  }
  const render = readFileSync('js/render.js', 'utf8');
  assert.ok(!/lookAt\(14,23\)|run\(4,30|19\.5\*C|x=10;x<=16/.test(render + readFileSync('js/main.js', 'utf8')), 'no Maple frontage literals in render or camera');
});

await test('unknown public layout ids are refused explicitly on load and by the simulation; known saves still load', async () => {
  const main = readFileSync('js/main.js', 'utf8'),
    funcs = main.slice(main.indexOf('function validState('), main.indexOf('function makeMapleSeedPrice(')),
    methods = main.slice(main.indexOf('  rawSaveCode('), main.indexOf('  applyLoad('));
  const api = eval('(()=>{' + funcs + ';return ({' + methods + '});})()');
  const maple = makePublicMaple(), classic = makeMaple();
  for (const sim of [maple, classic]) {
    const p = await api.prepareLoad(api.rawSaveCode(snap(sim)));
    assert.ok(p.ok, p.msg); assert.equal(p.company.props[0].sim.s.layout, sim.s.layout); assert.equal(p.company.props[0].sim.s.speed, 0);
  }
  for (const layout of ['cedar-creek-v1', 'maple-public-office-v2', 7, '']) {
    const st = JSON.parse(snap(maple)); st.layout = layout;
    const p = await api.prepareLoad(api.rawSaveCode(JSON.stringify(st)));
    assert.equal(p.ok, false); assert.equal(p.reason, 'unknown-layout'); assert.match(p.msg, /layout this build does not recognize[\s\S]*not loaded/);
    assert.throws(() => new Sim(JSON.parse(JSON.stringify(st))), /Unknown property layout/);
    assert.equal(knownLayout(layout), false); assert.equal(frontageOf(layout), null);
  }
  const bad = JSON.parse(snap(maple)); bad.layout = 'cedar-creek-v1';
  const portfolio = { company: true, saveGeneration: Sim.saveGeneration, props: [{ name: 'A', s: JSON.parse(snap(classic)) }, { name: 'B', s: bad }], active: 0, feed: [] };
  const p = await api.prepareLoad(api.rawSaveCode(JSON.stringify(portfolio)));
  assert.equal(p.ok, false); assert.equal(p.reason, 'unknown-layout');
  assert.equal(knownLayout(undefined), true); assert.equal(knownLayout(null), true);
});

await test('validator rejects broken descriptors and duplicate or changed ids', () => {
  const broken = (patch) => { const d = structuredClone(SYNTH_DESC); patch(d); return validateFrontage(d); };
  assert.deepEqual(validateFrontage(SYNTH_DESC), []);
  assert.match(broken((d) => { d.pocket.y1 = 27; }).join(), /sidewalk/);
  assert.match(broken((d) => { d.bays[0].x0 = 20; }).join(), /bays/);
  assert.match(broken((d) => { d.office.staffDoor = { x: 34, y: 27, dir: [0, 1] }; }).join(), /staff door/);
  assert.match(broken((d) => { d.gate.lanes.x0 = 30; }).join(), /lanes overlap|split/);
  assert.match(broken((d) => { d.gate.approachY = 27; d.gate.y = 26; }).join(), /stacking/);
  assert.match(broken((d) => { d.fence[1].run = [32, 21, 38, 21]; }).join(), /north edge is open/);
  assert.match(broken((d) => { d.keepClear.push({ x0: 32, x1: 33, y0: 22, y1: 22, why: 'office walk' }); }).join(), /overlaps a bay/);
  assert.match(broken((d) => { d.camera = { x: 60, y: 2 }; }).join(), /camera/);
  assert.throws(() => registerFrontage({ ...MAPLE_FRONTAGE.desc }), /already registered/);
});

registerSynthetic();
const controlled = (seed) => { const sim = makeSynthetic(seed); sim.s.visits = []; sim.s.t = 510; sim.s.policies.ownerChores = false; return sim; };
const K = frontageOf(SYNTH), inPublic = (x, y) => y >= K.streetY || K.pocket(x, y);

await test('synthetic layout moves office, parking and gate away from Maple and opens with full access', () => {
  const sim = makeSynthetic(), M = MAPLE_FRONTAGE.desc, D = K.desc, office = sim.objs('office')[0], gate = sim.objs('gate')[0];
  assert.notDeepEqual([office.x, office.y], [M.office.x, M.office.y]); assert.notDeepEqual([gate.x, gate.y], [M.gate.x, M.gate.y]);
  assert.notEqual(D.bays.length, M.bays.length); assert.equal(D.crosswalks.length, 0);
  for (let y = 0; y < sim.s.H; y++) for (let x = 0; x < sim.s.W; x++) assert.ok(!(K.pocket(x, y) && MAPLE_FRONTAGE.pocket(x, y)), 'public areas do not overlap');
  const a = NEW.accessState(sim, null, false);
  assert.ok(a.pedestrian && a.parking && a.staff); assert.deepEqual(sim.openingIssues(), []);
  assert.equal(sim.gateConnection(gate.id).kind, 'maple-yard'); assert.deepEqual(sim.routeGateIds(), [gate.id]);
  assert.deepEqual(sim.objs('unit').filter((u) => u.blocked).map((u) => u.num), []);
});

await test('synthetic shopper drives, parks, walks and leaves inside its own public area, across a reload', () => {
  let sim = controlled(23); sim.s.objects[sim.s.unitRoles.mapleTurnover].commercial = 'ready';
  sim.startVisit({ kind: 'prospect', size: '5x10', keen: true });
  const id = sim.s.agents.find((a) => a.publicVisit).id, states = new Set(); let restored = false, bay = -1;
  for (let tick = 0; tick < 900; tick++) {
    const a = sim.s.agents.find((x) => x.id === id); if (!a) break;
    const car = sim.vehAt(a.veh); states.add(a.st); assert.equal(a.gateId, null);
    assert.ok(inPublic(Math.floor(car.x), Math.floor(car.y)), 'car stays public');
    if (!a.hidden) assert.ok(K.pocket(Math.floor(a.x), Math.floor(a.y)), 'visitor stays public');
    for (const n of car.path || []) assert.ok(inPublic(n % sim.s.W, Math.floor(n / sim.s.W)));
    if (car.dest != null) bay = K.bay(car.dest % sim.s.W, Math.floor(car.dest / sim.s.W));
    if (!restored && a.st === 'toOffice') { sim = new Sim(JSON.parse(snap(sim))); restored = true; }
    sim.step();
  }
  assert.ok(restored); assert.ok(bay >= 0); assert.deepEqual([...states], ['drive', 'toOffice', 'office', 'back', 'leave']);
  assert.ok(!sim.s.agents.some((a) => a.id === id));
  const two = controlled(); for (let i = 0; i < 3; i++) two.startVisit({ kind: 'prospect', size: '5x10', probe: i });
  assert.equal(two.s.agents.filter((a) => a.publicVisit).length, 2, 'two bays, two visitors');
});

await test('synthetic tenant crosses IN on the inbound half, uses the unit and leaves through the outbound half', () => {
  const sim = controlled(), t = Object.values(sim.s.tenants)[0], unit = sim.s.leases[t.lease].unit, Gt = K.desc.gate;
  sim.startVisit({ kind: 'access', unit, tenant: t.id });
  const a = sim.s.agents.at(-1), id = a.id, car = sim.vehAt(a.veh), crossings = [], states = new Set();
  let prev = Math.floor(car.y);
  for (let i = 0; i < 1200 && sim.s.agents.some((x) => x.id === id); i++) {
    sim.step(); const y = Math.floor(car.y), x = Math.floor(car.x);
    assert.ok(!K.pocket(x, y), 'tenant car never enters the public area');
    if (prev === Gt.approachY && y === Gt.y) { assert.ok(K.inbound(x)); crossings.push('IN'); }
    if (prev === Gt.y && y === Gt.approachY) { assert.ok(K.outbound(x)); crossings.push('OUT'); }
    prev = y; states.add(a.st);
  }
  assert.deepEqual(crossings, ['IN', 'OUT']); assert.ok(states.has('gateq') && states.has('atunit')); assert.ok(!sim.s.agents.includes(a));
});

await test('synthetic owner leaves through the rear door for make-ready and returns without entering the public area', () => {
  const sim = controlled(), a = sim.s.agents[0], t = sim.s.tasks.find((t) => t.type === 'makeready');
  assert.ok(sim.dispatch({ type: 'ownerTask', task: t.id, forceOwner: true }).ok);
  const seen = new Set();
  for (let i = 0; i < 900; i++) { seen.add(a.st); if (!a.hidden) assert.ok(!K.pocket(Math.floor(a.x), Math.floor(a.y))); if (seen.has('work') && a.st === 'office') break; sim.step(); }
  assert.ok(seen.has('work') && seen.has('home')); assert.equal(a.st, 'office');
  assert.deepEqual([a.x, a.y], [K.desc.office.staffDoor.x + 0.5, K.desc.office.staffDoor.y + 0.5]);
  assert.equal(sim.s.objects[t.obj].commercial, 'ready');
});

await test('synthetic access protections and keep-clear zones refuse before any debit', () => {
  const sim = makeSynthetic(); sim.s.cash = 90000;
  refused(sim, build('power', 35, 22), /office entrance/);
  refused(sim, build('power', 37, 19), /staff route/);
  refused(sim, build('power', 37, 27), /office walk/);
  refused(sim, build('du5x5', 38, 27), /office walk/);
  assert.equal(sim.plan(build('light', 37, 27)).status, 'valid', 'a pole does not block the walk');
  refused(sim, build('gate', 36, 29), /secure street-facing spot/);
  assert.equal(sim.plan(build('power', 10, 19)).status, 'valid', 'yard away from the frontage stays buildable');
  const maple = makePublicMaple(); maple.s.cash = 90000;
  assert.equal(maple.plan(build('power', 8, 27)).status === 'invalid' && /clear for/.test(maple.plan(build('power', 8, 27)).reasons.join(' ')), false, 'Maple adds no keep-clear refusal');
});

await test('synthetic save round trip continues identically, and the fence render uses the routing runs', async () => {
  const sim = controlled(5); sim.startVisit({ kind: 'prospect', size: '5x10', keen: true });
  for (let i = 0; i < 120; i++) sim.step();
  const copy = new Sim(JSON.parse(snap(sim)));
  for (let i = 0; i < 400; i++) { sim.step(); copy.step(); sim.events = []; copy.events = []; }
  assert.equal(snap(copy), snap(sim));
  const source = readFileSync('js/render.js', 'utf8'), start = source.indexOf('  buildFence() {'), end = source.indexOf('  setView(', start);
  const fence = (s) => {
    const runs = []; class Mesh { constructor(geo) { this.geo = geo; this.scale = { set: (...v) => (this.size = v) }; this.position = { set: (...v) => (this.pos = v) }; this.rotation = {}; } }
    const ctx = vm.createContext({ THREE: { Mesh }, recessed: NEW.recessed });
    vm.runInContext(source.slice(start, end).replace('buildFence()', 'function buildFence()'), ctx);
    ctx.buildFence.call({ sim: s, geo: { plane: 'plane', box: 'box' }, mat: {}, box() {}, add(m) { if (m.geo === 'plane') runs.push([m.pos[0], m.pos[2], m.size[0]]); } });
    return runs;
  };
  const mid = (r) => [(r[0] + r[2]) / 2, (r[1] + r[3]) / 2, Math.hypot(r[2] - r[0], r[3] - r[1])];
  const runs = fence(sim);
  for (const f of K.desc.fence) assert.ok(runs.some((m) => norm(m) === norm(mid(f.office || f.run))), 'fence run ' + f.run);
  const mapleRuns = fence(makePublicMaple());
  for (const r of [[4, 30, 4, 20], [8, 20, 18, 20], [18, 20, 18, 24], [24, 24, 24, 30]]) assert.ok(mapleRuns.some((m) => norm(m) === norm(mid(r))), 'Maple run ' + r);
});

await test('synthetic acceptance: several seeds and days keep visitors public and tenant cars on the gate route', () => {
  for (const seed of [1, 2, 3, 4]) {
    const sim = makeSynthetic(seed); let visitors = 0, tenants = 0;
    for (let i = 0; i < 2 * MIN_PER_DAY; i++) {
      sim.step(); sim.events = [];
      for (const a of sim.s.agents) {
        const car = a.veh && sim.vehAt(a.veh); if (!car) continue;
        const x = Math.floor(car.x), y = Math.floor(car.y);
        if (a.publicVisit) { visitors++; assert.ok(inPublic(x, y), `seed ${seed} visitor car at ${x},${y}`); }
        else if (a.kind === 'cust') { tenants++; assert.ok(!K.pocket(x, y), `seed ${seed} tenant car in public area`); }
      }
    }
    assert.ok(visitors > 0 && tenants > 0, `seed ${seed} saw traffic`); assert.deepEqual(sim.openingIssues(), []);
  }
});

await test('Maple office rebuild uses actual public and secured routes off the authored slot', () => {
  const sim = makePublicMaple(), s = sim.s, old = sim.objs('office')[0];
  delete s.objects[old.id]; sim.markDirty();
  const args = { tool:'office', a:{x:4,y:18}, b:{x:4,y:18}, rotation:2 };
  const valid = sim.plan(args);
  assert.equal(valid.status,'valid',valid.reasons.join());
  const original = s.ground.slice();
  for (const bay of MAPLE_FRONTAGE.desc.bays) for (let y=bay.y0;y<=bay.y1;y++)
    for (let x=bay.x0;x<=bay.x1;x++) s.ground[sim.idx(x,y)]=G.ASPHALT;
  sim.markDirty();
  refused(sim,args,/parking bay/);
  s.ground=original; sim.markDirty();
  const cash=s.cash;
  assert.ok(sim.dispatch({type:'build',...args}).ok);
  assert.equal(s.cash,cash-valid.cost);
  sim.completeOrder(s.orders.at(-1));
  const office = sim.objs('office')[0];
  assert.notDeepEqual([office.x,office.y],[old.x,old.y]);
  assert.deepEqual(office.door.dir,[0,1]);
  assert.ok(!MAPLE_FRONTAGE.pocket(office.staffDoor.x,office.staffDoor.y));
  const access = NEW.accessState(sim,null,false);
  assert.ok(access.pedestrian && access.parking && access.staff);
  const door = sim.idx(office.door.x,office.door.y), rear = sim.idx(office.staffDoor.x,office.staffDoor.y);
  assert.ok(sim.pedPath(door,rear,{kind:'staff'}));
  assert.equal(sim.pedPath(door,rear),null);
  assert.equal(s.speed,0);
  const loaded = new Sim(JSON.parse(snap(sim)));
  assert.deepEqual(loaded.objs('office')[0],office);
  assert.deepEqual(loaded.openingIssues(),[]);
  loaded.s.tut.on=false; loaded.s.tut.done=true;
  loaded.s.t=10*60; loaded.s.visits=[];
  loaded.startVisit({kind:'prospect',size:'5x10',keen:true});
  const visitor=loaded.s.agents.find(a=>a.publicVisit);
  assert.ok(visitor);
  const seen=new Set();
  for(let i=0;i<900 && loaded.s.agents.includes(visitor);i++){
    seen.add(visitor.st);
    if(!visitor.hidden) assert.ok(MAPLE_FRONTAGE.pocket(Math.floor(visitor.x),Math.floor(visitor.y)));
    loaded.step();
  }
  assert.deepEqual([...seen],['drive','toOffice','office','back','leave']);
  assert.ok(!loaded.s.agents.includes(visitor));

});
await test('east-side classic prospect completes the office visit via the only gate with parking', () => {
  const sim = makeSandbox({kind:'business',cash:100000,tiers:'all',instant:true});
  const {s} = sim, y1 = s.parcel.y1;
  for (const x of [8,32]) {
    const result = sim.dispatch(build('gate',x,y1));
    assert.ok(result.ok,result.msg);
    const order = s.orders.find(o => o.id === result.order);
    if (order.st === 'construction') sim.completeOrder(order);
    for (let y=14;y<=y1;y++) s.ground[sim.idx(x,y)] = G.ASPHALT;
  }
  for (let x=9;x<32;x++) s.ground[sim.idx(x,14)] = G.CONCRETE;
  const bay = sim.idx(8,14);
  s.ground[bay] = G.PARKING;
  sim.markDirty();
  complete(sim,{...build('office',14,10),rotation:2});
  const [west,east] = sim.objs('gate');
  s.open=true; s.t=10*60; s.visits=[];
  const visit = {kind:'prospect',size:'5x10',keen:true};
  assert.ok(sim.gateCanServeVisit(west.id,visit));
  assert.equal(sim.gateCanServeVisit(east.id,visit),false);
  const rng = sim.rnd;
  sim.rnd=()=>0.1; // Deterministically start the car on the east edge.
  sim.startVisit(visit);
  sim.rnd=rng;
  const agent = s.agents.find(a => a.vt === 'prospect');
  assert.ok(agent);
  assert.equal(agent.gateId,west.id);
  const car = sim.vehAt(agent.veh);
  assert.equal(Math.floor(car.x),s.W-1);
  const seen = new Set();
  for(let i=0;i<1800 && s.agents.includes(agent);i++){
    seen.add(agent.st);
    if (car.parked != null) assert.equal(car.parked,bay);
    sim.step();
  }
  for (const state of ['gateq','toOffice','office','back','leave']) assert.ok(seen.has(state),state);
  assert.ok(!agent.failed);
  assert.ok(!s.agents.includes(agent));
});
console.log(`${groups} frontage descriptor groups passed`);
