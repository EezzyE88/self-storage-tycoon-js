// Bug hunt: random (valid and garbage) player actions across every mode, with invariant checks after each.
// usage: node tfuzz.mjs [days=120] [seeds=3]
import { makeMaple } from '../../js/maple.js';
import { makeScenario, makeSandbox, SCENARIOS } from '../../js/scenarios.js';
import { Sim } from '../../js/sim.js';
import { TOOLS, ROLES } from '../../js/data.js';
const DAYS = +(process.argv[2] || 120), SEEDS = +(process.argv[3] || 3);
const issues = new Map(); const note = (k, d) => { const e = issues.get(k) || { n: 0, ex: d }; e.n++; issues.set(k, e); };
let rs = 1; const R = () => { rs = (rs * 1103515245 + 12345) & 0x7fffffff; return rs / 0x7fffffff; }; const pick = (a) => a[Math.floor(R() * a.length)];
const junk = () => pick([NaN, -1, 0, 1e12, 'x', null, undefined, Infinity, -500, 3.7, {}, []]);
function modes() {
  return [
    ['maple-tutorial', () => makeMaple()],
    ['maple-career', () => { const m = makeMaple(); m.s.tut = { on: false, beat: 99, flags: {}, done: true }; m.s.mode = 'tutorial'; m.s.open = true; return m; }],
    ...Object.keys(SCENARIOS).map((k) => ['sc:' + k, () => makeScenario(k)]),
    ['sb-business-empty', () => makeSandbox({ kind: 'business' })],
    ['sb-business-starter', () => makeSandbox({ kind: 'business', start: 'starter', staff: 'basic', goal: 'occ' })],
    ['sb-free', () => makeSandbox({ kind: 'free', goal: 'units' })],
    ['sb-challenging-urban', () => makeSandbox({ kind: 'business', market: 'urban', cash: 35000, demand: 0.75, costs: 1.25, wear: 1.5 })],
  ];
}
function randomAction(sim) {
  const s = sim.s, P = s.parcel, objs = Object.values(s.objects), units = objs.filter((o) => o.type === 'unit');
  const pt = () => ({ x: P.x0 + Math.floor(R() * (P.x1 - P.x0 + 3)) - 1, y: P.y0 + Math.floor(R() * (P.y1 - P.y0 + 3)) - 1 });
  const id = () => (R() < 0.85 && objs.length ? pick(objs).id : junk()), uid = () => (R() < 0.85 && units.length ? pick(units).id : junk());
  const tid = () => (R() < 0.85 && s.tasks.length ? pick(s.tasks).id : junk()), sid = () => (R() < 0.85 && s.staff.length ? pick(s.staff).id : junk());
  const r = R();
  if (r < 0.45) { const a = pt(), long = R() < 0.5, b = long ? { x: a.x + Math.floor(R() * 12) - 6, y: a.y + Math.floor(R() * 12) - 6 } : a; return { type: 'build', tool: pick(Object.keys(TOOLS)), a, b, f: R() < 0.8 ? 0 : 1, climate: R() < 0.3, rush: R() < 0.1 }; }
  const L = Object.values(s.leases), C = s.convos || [];
  return pick([
    () => ({ type: 'commission', all: true }), () => ({ type: 'commission', unit: uid() }), () => ({ type: 'open' }),
    () => ({ type: 'hire', role: pick([...Object.keys(ROLES), 'boss']) }), () => ({ type: 'fire', id: sid() }),
    () => ({ type: 'ownerMakeReady', unit: uid() }), () => ({ type: 'ownerTask', task: tid() }), () => ({ type: 'ownerTaskFor', obj: id() }), () => ({ type: 'ownerRoom', obj: id() }),
    () => ({ type: 'ownerClean', f: pick([0, 1, 2]), ...pt() }), () => ({ type: 'callVendor', task: tid() }), () => ({ type: 'taskPri', task: tid(), pri: pick([0, 2, junk()]) }),
    () => ({ type: 'cancelOrder', id: R() < 0.8 && s.orders.length ? pick(s.orders).id : junk() }),
    () => ({ type: 'renovate', unit: uid(), kind: pick(['climate', 'split', 'merge', 'door', 'x']) }),
    () => ({ type: 'rentReview', key: pick(['10x10|std', '5x5|std', '10x20|std', '5x10|cc', 'bogus']), pct: pick([0.05, 0.1, -0.5, junk()]) }),
    () => ({ type: 'setRent', key: pick(['10x10|std', '5x5|std', '10x20|cc']), v: pick([50, 120, 300, 0, -10, junk()]) }),
    () => ({ type: 'buyCarts', corral: id(), n: pick([1, 2, junk()]) }), () => ({ type: 'corralTarget', corral: id(), n: pick([0, 3, 9, junk()]) }),
    () => ({ type: 'borrow', amt: pick([5000, 50000, junk()]) }), () => ({ type: 'loan', amt: pick([1000, 99999999, junk()]) }), () => ({ type: 'repay', amt: pick([100, 1e9, junk()]) }),
    () => ({ type: 'payoff', id: s.debt && s.debt.length ? pick(s.debt).id : junk() }), () => ({ type: 'collect', lease: L.length ? pick(L).id : junk(), op: pick(['call', 'waive', 'lock', 'lien', 'auction', 'x']) }),
    () => ({ type: 'convo', id: C.length ? pick(C).id : junk(), i: pick([0, 1, 2, 5, junk()]) }),
    () => ({ type: 'policy', key: pick(['autoMakeReady', 'lateFee', 'x']), v: pick([true, false, 0, junk()]) }),
    () => ({ type: 'sbFunds', amt: pick([10000, -5, 1e9, junk()]) }), () => ({ type: 'sbSet', k: pick(['instant', 'unlimited', 'goal', 'x']), v: pick([true, false, 'occ', 'profit', 'units', 'backlog', null, junk()]) }),
    () => ({ type: 'speed', v: pick([0, 1, 2, 4]) }), () => ({ type: 'tutSkip' }), () => ({ type: 'cv', id: id() }),
    () => ({ type: pick(['nonsense', 'act', '']) }),
  ])();
}
const fin = (x) => typeof x === 'number' && Number.isFinite(x);
function invariants(sim, tag) {
  const s = sim.s;
  if (!fin(s.cash)) note('cash not finite', tag);
  for (const L of s.ledger) if (!fin(L.amt)) { note('ledger amount not finite', tag + ' ' + JSON.stringify(L)); break; }
  for (const [k, v] of Object.entries(s.today)) if (typeof v === 'number' && !fin(v)) note('today.' + k + ' not finite', tag);
  for (const u of Object.values(s.objects)) {
    if (u.type !== 'unit') continue;
    if (u.lease != null) { const L = s.leases[u.lease]; if (!L) note('unit points at missing lease', tag + ' ' + u.name); else if (L.unit !== u.id) note('lease/unit mismatch', tag + ' ' + u.name); }
    if (!['construction', 'built', 'ready', 'operating'].includes(u.cstate)) note('unit in unknown cstate ' + u.cstate, tag);
    if (u.cond != null && !(u.cond >= 0 && u.cond <= 1.0001)) note('condition out of range', tag + ' ' + u.cond);
  }
  for (const L of Object.values(s.leases)) { const u = s.objects[L.unit]; if (!u && L.status !== 'closed' && L.status !== 'ended') note('lease points at missing unit', tag + ' status ' + L.status); }
  for (const o of s.orders) for (const id of o.objs || []) if (!s.objects[id] && o.st === 'construction') note('order references missing object', tag);
  for (const ag of s.agents) { if (!fin(ag.x) || !fin(ag.y)) { note('agent position not finite', tag + ' ' + ag.kind); break; } }
  if (s.staff.filter((x) => x.role === 'owner').length !== 1) note('owner count != 1', tag);
}
const t0 = Date.now(); let actions = 0, okActs = 0, stepsMs = 0;
for (const [name, mk] of modes()) for (let seed = 1; seed <= SEEDS; seed++) {
  rs = seed * 7919 + name.length; let sim; try { sim = mk(); } catch (e) { note('constructor threw', name + ' ' + e.message); continue; }
  for (let d = 0; d < DAYS; d++) {
    for (let h = 0; h < 24; h++) {
      const n = R() < 0.5 ? 1 : 0 + (R() < 0.15 ? 3 : 0);
      for (let k = 0; k < n; k++) { const a = randomAction(sim); actions++; try { const r = sim.dispatch(a); if (r && r.ok) okActs++; if (r && r.msg != null && typeof r.msg !== 'string') note('non-string message', name + ' ' + a.type); if (r && typeof r.msg === 'string' && /undefined|NaN|\[object/.test(r.msg)) note('bad text in message: ' + a.type, r.msg.slice(0, 90)); } catch (e) { note('dispatch threw: ' + a.type + ' - ' + e.message, name + ' ' + JSON.stringify(a).slice(0, 160) + ' @' + (e.stack || '').split('\n')[1]); } }
      const t1 = performance.now();
      for (let m = 0; m < 60; m++) { try { sim.step(); } catch (e) { note('step threw - ' + e.message, name + ' day ' + sim.day + ' ' + (e.stack || '').split('\n').slice(1, 3).join(' | ')); m = 60; d = DAYS; h = 24; } }
      stepsMs += performance.now() - t1;
      for (const ev of sim.events) { const txt = JSON.stringify(ev); if (/NaN|undefined|\[object Object\]/.test(Object.values(ev).filter((v) => typeof v === 'string').join(' '))) note('bad text in event ' + ev.type, txt.slice(0, 120)); }
      sim.events.length = 0;
    }
    invariants(sim, `${name} s${seed} d${sim.day}`);
    if (d % 30 === 29) { try { const c = new Sim(JSON.parse(JSON.stringify(sim.s))); c.step(); } catch (e) { note('save round trip failed', name + ' ' + e.message); } }
  }
  console.log(`${name.padEnd(22)} seed ${seed}: day ${sim.day} cash ${Math.round(sim.s.cash)} units ${sim.objs('unit').length} leases ${Object.keys(sim.s.leases).length} objects ${Object.keys(sim.s.objects).length} save ${(JSON.stringify(sim.s).length / 1024).toFixed(0)}KB`);
}
console.log(`\n${actions} actions (${okActs} accepted), ${(stepsMs / 1000).toFixed(1)}s in sim steps, ${((Date.now() - t0) / 1000).toFixed(0)}s total`);
if (!issues.size) console.log('NO ISSUES'); else { console.log(`${issues.size} DISTINCT ISSUES`); for (const [k, v] of issues) console.log(`- [${v.n}x] ${k}\n    e.g. ${v.ex}`); }
if (issues.size) process.exitCode = 1;
