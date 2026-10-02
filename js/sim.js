// AUTHORITATIVE SIMULATION (GDD §51). No DOM, no rendering, no audio.
// Presentation reads `sim.s` (state) + `sim.D` (derived caches) and consumes `sim.events`.
// All mutations go through sim.dispatch(action). Deterministic given seed + action script.
import {
  MIN_PER_DAY, BILLING_CYCLE_DAYS, OFFICE_HOURS, ACCESS_HOURS, G, VEH_GROUND, PED_GROUND,
  SIZES, TOOLS, MARKETS, CART_COST, CLIMATE_COST_MULT, ROLES, OPEX, WORK, NAMES_FIRST, NAMES_LAST, POWER,
} from './data.js';

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const productKey = (size, env) => `${size}|${env}`;
export const fmtTime = (t) => {
  const m = t % MIN_PER_DAY, h = Math.floor(m / 60), mm = m % 60;
  const ap = h >= 12 ? 'PM' : 'AM'; const hh = ((h + 11) % 12) + 1;
  return `${hh}:${String(mm).padStart(2, '0')} ${ap}`;
};
export const dayOf = (t) => Math.floor(t / MIN_PER_DAY) + 1;

// ---------------------------------------------------------------- state factory
export function newState({ mode = 'tutorial', creative = false, seed = 1234, market = 'maple', W = 44, H = 34 } = {}) {
  const WH = W * H;
  const s = {
    v: 1, mode, creative, seed, rngS: seed >>> 0, W, H,
    parcel: { x0: 2, y0: 2, x1: W - 3, y1: H - 5 },
    t: 7 * 60, speed: 0,
    cash: mode === 'tutorial' ? 26000 : 60000,
    ground: new Array(WH).fill(G.GRASS),
    hall: [new Array(WH).fill(0), new Array(WH).fill(0)], // 0 none, 1 built, 2 under construction
    dirt: [new Array(WH).fill(0), new Array(WH).fill(0)],
    objects: {}, orders: [], leases: {}, tenants: {}, carts: [], vehicles: [], agents: [], staff: [], tasks: [],
    visits: [], gateQ: [], officeQ: [],
    market: { id: market, ask: {} },
    ledger: [], days: [], today: null,
    exp: { access: 0.85, convenience: 0.8, cleanliness: 0.85, security: 0.7, climate: 0.9, service: 0.85, value: 0.8, comfort: 0.8 },
    powerBase: POWER.base[market] ?? 30, loan: { bal: 0, warnT: -1e9 }, debt: [], auction: null, mgrLog: [],
    thoughts: [], convos: [], lost: {}, lostToday: {}, mkt: { comp: [], nextComp: null, reviews: [], lostLog: [], reports: [] },
    milestones: {}, tut: { on: mode === 'tutorial', beat: 0, flags: {}, done: false },
    open: mode === 'tutorial', policies: { preventive: false, porterCarts: true, ownerChores: true, lateFee: 20, autoNotice: false, resolution: 'auction', retention: true, overlock: true },
    weather: 'fair', nextId: 1, structV: 1, unitNo: { drive: 101, interior: 201, upper: 301 },
    lastCommit: null,
  };
  const M = MARKETS[market];
  for (const sz of Object.keys(M.rent)) {
    s.market.ask[productKey(sz, 'std')] = M.rent[sz];
    s.market.ask[productKey(sz, 'climate')] = Math.round(M.rent[sz] * M.climatePremium / 5) * 5;
  }
  // street + sidewalks outside the front fence
  const { y1 } = s.parcel;
  for (let x = 0; x < W; x++) {
    s.ground[(y1 + 1) * W + x] = G.SIDEWALK;
    s.ground[(y1 + 2) * W + x] = G.STREET;
    s.ground[(y1 + 3) * W + x] = G.STREET;
    if (y1 + 4 < H) s.ground[(y1 + 4) * W + x] = G.SIDEWALK;
  }
  s.today = blankDay(1);
  return s;
}
const COMP_NAMES = ['StorQuik Self Storage', 'Carlsbad Box & Lock', 'SecureSpace on 5th', 'Coastline Storage Co.', 'Depot Self Storage'];
const M_open_comps = (sim) => sim.openComps().length > 0;
const OWNER_AUTO_PER_DAY = 3; // routine chores the Owner picks up unasked each day (repairs always wait for the player)
function blankDay(day) { return { day, rent: 0, anc: 0, other: 0, opex: 0, payroll: 0, service: 0, capex: 0, debt: 0, interest: 0, fin: 0, leases: 0, moveouts: 0, prospects: 0, lost: 0 }; }

// ---------------------------------------------------------------- Sim
export class Sim {
  constructor(state) {
    this.s = state; this.events = []; this.D = null; this.dirty = true;
    // forward-compatible defaults for older saves
    state.policies ||= {}; if (state.policies.ownerChores === undefined) state.policies.ownerChores = true;
    state.loan ||= { bal: 0, warnT: -1e9 };
    if (state.powerBase == null) state.powerBase = POWER.base[state.market && state.market.id] ?? 30;
    if (state.exp && state.exp.comfort == null) state.exp.comfort = 0.8;
    state.mgrLog ||= []; state.debt ||= []; if (state.auction === undefined) state.auction = null;
    const P = state.policies; if (P.lateFee == null) P.lateFee = 20; if (P.autoNotice == null) P.autoNotice = false; if (!P.resolution) P.resolution = 'auction'; if (P.retention == null) P.retention = true; if (P.overlock == null) P.overlock = true;
    for (const L of Object.values(state.leases || {})) { if (L.fees == null) L.fees = 0; }
    // saves from before Round 11 (no market state) used the 12-part tutorial; move them to the matching part of the 8-part one
    if (!state.mkt && state.tut && state.tut.on && !state.tut.done && state.tut.beat > 4) {
      state.tut.beat = [0, 1, 2, 3, 4, 5, 5, 6, 7, 7, 7, 7][Math.min(11, state.tut.beat)] ?? 7; state.tut.entered = false; state.tut.migrated = 11;
    }
    state.mkt ||= { comp: [], nextComp: null, reviews: [], lostLog: [], reports: [] }; if (state.coTier == null) state.coTier = 1;
    this.rebuild();
  }
  // deterministic rng (mulberry32) stored in state
  rnd() {
    let t = (this.s.rngS = (this.s.rngS + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  pick(arr) { return arr[Math.floor(this.rnd() * arr.length)]; }
  id() { return this.s.nextId++; }
  emit(type, data = {}) { this.events.push({ type, t: this.s.t, ...data }); }
  get day() { return dayOf(this.s.t); }
  get mod() { return this.s.t % MIN_PER_DAY; }
  get hour() { return this.mod / 60; }
  idx(x, y) { return y * this.s.W + x; }
  inb(x, y) { return x >= 0 && y >= 0 && x < this.s.W && y < this.s.H; }
  inParcel(x, y) { const p = this.s.parcel; return x >= p.x0 && x <= p.x1 && y >= p.y0 && y <= p.y1; }
  objs(type) { return (this.D && this.D.byType[type]) || []; }
  obj(id) { return this.s.objects[id]; }
  isDaylight() { const h = this.hour; return h >= 6.5 && h < 19; }

  money(amt, cat, note) {
    const s = this.s; s.cash += amt;
    s.ledger.push({ t: s.t, amt: Math.round(amt * 100) / 100, cat, note });
    if (s.ledger.length > 250) s.ledger.splice(0, s.ledger.length - 250);
    const d = s.today;
    if (cat === 'rent') d.rent += amt; else if (cat === 'opex') d.opex -= amt; else if (cat === 'payroll') d.payroll -= amt;
    else if (cat === 'capex') d.capex -= amt; else if (cat === 'anc') d.anc = (d.anc || 0) + amt; else if (cat === 'service') d.service = (d.service || 0) - amt;
    else if (cat === 'debt') d.debt = (d.debt || 0) - amt; else if (cat === 'interest') d.interest = (d.interest || 0) - amt; else if (cat === 'loan') d.fin = (d.fin || 0) + amt;
    else d.other += amt;
    if (amt > 0 && cat === 'rent') this.emit('rent', { amt });
  }

  // ============================================================ DERIVED CACHES
  rebuild() {
    const s = this.s, W = s.W, H = s.H, WH = W * H;
    const D = {
      byType: {}, shellAt: new Int32Array(WH), solid: new Uint8Array(WH), unitAt: [new Int32Array(WH), new Int32Array(WH)],
      at: new Map(), doorEdge: new Map(), elevAt: new Int32Array(WH), walk: [new Uint8Array(WH), new Uint8Array(WH)],
      lit: [new Float32Array(WH), new Float32Array(WH)], cam: [new Uint8Array(WH), new Uint8Array(WH)],
      hvac: {}, vehReach: new Uint8Array(WH), pendingGround: new Map(),
      stairAt: new Int32Array(WH), roomAt: [new Int32Array(WH), new Int32Array(WH)], water: new Set(), power: null,
    };
    this.D = D;
    for (const o of Object.values(s.objects)) {
      (D.byType[o.type] ||= []).push(o);
      const f = o.f || 0;
      const addAt = (i) => { const k = f * WH + i; if (!D.at.has(k)) D.at.set(k, []); D.at.get(k).push(o.id); };
      if (o.type === 'shell') {
        for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) { D.shellAt[this.idx(x, y)] = o.id; D.solid[this.idx(x, y)] = 1; }
      } else if (o.type === 'unit' || o.type === 'office' || o.type === 'hvac' || o.type === 'power' || o.type === 'water') {
        for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) {
          const i = this.idx(x, y); addAt(i);
          if (o.type === 'unit') D.unitAt[f][i] = o.id;
          if (o.type !== 'unit' || o.access === 'drive') D.solid[i] = 1;
        }
      } else if (o.type === 'restroom') {
        const i = this.idx(o.x, o.y); addAt(i); D.roomAt[f][i] = o.id;
      } else if (o.type === 'canopy') {
        for (let y = o.y; y < o.y + o.h; y++) for (let x = o.x; x < o.x + o.w; x++) addAt(this.idx(x, y));
      } else if (o.type === 'gate') {
        for (let x = o.x - 1; x <= o.x + 1; x++) addAt(this.idx(x, o.y));
      } else addAt(this.idx(o.x, o.y));
    }
    for (const o of this.objs('stairs')) { D.stairAt[this.idx(o.x, o.y)] = o.id; for (let f = 0; f < 2; f++) { const k = f * WH + this.idx(o.x, o.y); if (!D.at.has(k)) D.at.set(k, []); if (!D.at.get(k).includes(o.id)) D.at.get(k).push(o.id); } }
    for (const o of this.objs('water')) if (o.cstate === 'operating') D.water.add(o.serves);
    this.computePower();
    for (const o of this.objs('elevator')) { D.elevAt[this.idx(o.x, o.y)] = o.id; for (let f = 0; f < 2; f++) { const k = f * WH + this.idx(o.x, o.y); if (!D.at.has(k)) D.at.set(k, []); if (!D.at.get(k).includes(o.id)) D.at.get(k).push(o.id); } }
    for (const o of this.objs('door')) if (o.cstate === 'operating') {
      const i = this.idx(o.x, o.y), j = this.idx(o.x + o.dir[0], o.y + o.dir[1]);
      D.doorEdge.set(Math.min(i, j) + ',' + Math.max(i, j), o.id);
    }
    // pending ground from active orders (for validation + display)
    for (const ord of s.orders) if (ord.st === 'construction') for (const tl of ord.tiles) if (tl.k === 'ground') D.pendingGround.set(tl.i, tl.v);
    // walkability
    const p = s.parcel;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = this.idx(x, y); const sh = D.shellAt[i];
      if (sh) {
        const shell = s.objects[sh];
        if (shell.cstate !== 'operating') continue;
        for (let f = 0; f < shell.floors; f++) if (s.hall[f][i] === 1 || (D.elevAt[i] && this.obj(D.elevAt[i]).cstate === 'operating') || (D.stairAt[i] && this.obj(D.stairAt[i]).cstate === 'operating')) D.walk[f][i] = 1;
      } else if (y <= p.y1 + 1 && PED_GROUND.has(s.ground[i]) && !D.solid[i]) D.walk[0][i] = 1;
    }
    // lighting + camera coverage
    for (const L of this.objs('light')) {
      if (!this.works(L)) continue;
      const r = TOOLS.light.radius, f = L.f || 0, sh = D.shellAt[this.idx(L.x, L.y)];
      for (let y = Math.floor(L.y - r); y <= L.y + r; y++) for (let x = Math.floor(L.x - r); x <= L.x + r; x++) {
        if (!this.inb(x, y)) continue; const i = this.idx(x, y);
        if (D.shellAt[i] !== sh) continue;
        const d = Math.hypot(x - L.x, y - L.y); if (d > r) continue;
        const v = d < r * 0.7 ? 1 : 1 - (d - r * 0.7) / (r * 0.3) * 0.5;
        D.lit[f][i] = Math.max(D.lit[f][i], v * (L.cond < 0.45 ? 0.75 : 1));
      }
    }
    for (const C of this.objs('camera')) {
      if (!this.works(C)) continue;
      const r = TOOLS.camera.radius, f = C.f || 0, sh = D.shellAt[this.idx(C.x, C.y)];
      for (let y = Math.floor(C.y - r); y <= C.y + r; y++) for (let x = Math.floor(C.x - r); x <= C.x + r; x++) {
        if (!this.inb(x, y)) continue; const i = this.idx(x, y);
        if (D.shellAt[i] !== sh) continue;
        if (Math.hypot(x - C.x, y - C.y) <= r) D.cam[f][i] = 1;
      }
    }
    // HVAC capacity/load per shell
    for (const hv of this.objs('hvac')) {
      if (hv.cstate !== 'operating') continue;
      const cap = hv.unpowered ? 0 : TOOLS.hvac.capacity * (hv.cond < 0.2 ? 0.25 : hv.cond < 0.45 ? 0.8 : 1);
      const e = (D.hvac[hv.serves] ||= { cap: 0, load: 0, plants: [] }); e.cap += cap; e.plants.push(hv.id);
    }
    for (const u of this.objs('unit')) if (u.env === 'climate' && u.cstate === 'operating') {
      const sh = D.shellAt[this.idx(u.x, u.y)]; const e = (D.hvac[sh] ||= { cap: 0, load: 0, plants: [] }); e.load += SIZES[u.size].sqft / 25;
    }
    // vehicle reachability from street (through the gate)
    const gate = this.objs('gate')[0];
    D.gate = gate && gate.cstate === 'operating' ? gate : null;
    const start = [];
    for (let x = 0; x < W; x++) start.push(this.idx(x, p.y1 + 2));
    const seen = D.vehReach; const q = [...start]; for (const i of start) seen[i] = 1;
    while (q.length) { const i = q.pop(); for (const j of this.vehNbr(i)) if (!seen[j]) { seen[j] = 1; q.push(j); } }
    // pedestrian "exterior access" = cells reachable from any vehicle-reachable ped cell
    this.D = D;
    this.computeUnitReqs();
    this.dirty = !!this.redoRebuild; this.redoRebuild = false;
  }
  works(o) { return !!o && o.cstate === 'operating' && (o.cond ?? 1) >= 0.2 && !o.unpowered; }
  powerKey(o) {
    if (o.type === 'door') return o.kind === 'auto' ? 'doorAuto' : null;
    return POWER.load[o.type] != null ? o.type : null;
  }
  computePower() { // GDD §22: capacity vs demand; lowest-priority loads are shed when demand exceeds service
    const s = this.s, D = this.D;
    const cap = (s.powerBase ?? 30) + this.objs('power').filter((o) => o.cstate === 'operating').length * TOOLS.power.kw;
    const loads = [];
    for (const o of Object.values(s.objects)) {
      if (o.cstate !== 'operating') continue;
      const k = this.powerKey(o);
      if (k) loads.push({ o, k, kw: POWER.load[k] });
      if (o.type === 'door' && o.keypad === 'operating') loads.push({ o: null, k: 'keypad', kw: POWER.load.keypad });
    }
    const pr = (k) => POWER.priority.indexOf(k);
    loads.sort((a, b) => (pr(a.k) - pr(b.k)) || ((a.o ? a.o.id : 0) - (b.o ? b.o.id : 0)));
    let used = 0, demand = 0; const shed = [];
    for (const L of loads) {
      demand += L.kw;
      if (used + L.kw <= cap + 1e-9) { used += L.kw; if (L.o) { if (L.o.unpowered && !this.previewing) this.emit('power_restored', { obj: L.o.id }); L.o.unpowered = false; } }
      else if (L.o) { if (!L.o.unpowered && !this.previewing && s.t > 0) this.emit('power_shed', { obj: L.o.id, name: this.objName(L.o), x: L.o.x, y: L.o.y, f: L.o.f || 0 }); L.o.unpowered = true; shed.push(L.o.id); }
    }
    for (const o of Object.values(s.objects)) if (o.unpowered && (o.cstate !== 'operating' || !this.powerKey(o))) o.unpowered = false;
    D.power = { cap, used, demand, shed };
  }
  hasWater(shellId) { return shellId && this.D.water.has(shellId); }
  amenityWorks(o) { return this.works(o) && this.hasWater(this.D.shellAt[this.idx(o.x, o.y)]); }
  powerAdd(tool, count = 1) { // kW a planned build would add (negative = capacity)
    const k = tool === 'doorAuto' ? 'doorAuto' : tool === 'keypad' ? 'keypad' : POWER.load[tool] != null ? tool : null;
    return k ? POWER.load[k] * count : 0;
  }
  accessImpact(apply) { // how many open units would lose customer access if `apply` happened (preview only)
    this.ensure();
    const units = this.objs('unit');
    const snap = units.map((u) => [u, u.cstate, u.missing, u.blocked, u.conv, u.dist]);
    const before = new Set(units.filter((u) => u.cstate === 'operating' && !u.blocked).map((u) => u.id));
    const evLen = this.events.length;
    this.previewing = true;
    const restore = apply(); this.rebuild();
    const lost = this.objs('unit').filter((u) => before.has(u.id) && u.blocked);
    restore(); this.rebuild(); this.previewing = false;
    for (const [u, c, m, b, cv, d] of snap) { u.cstate = c; u.missing = m; u.blocked = b; u.conv = cv; u.dist = d; }
    this.events.length = evLen;
    return lost.length;
  }
  markDirty() { this.dirty = true; this.s.structV++; }
  ensure() { if (this.dirty) this.rebuild(); }

  vehNbr(i) {
    const s = this.s, W = s.W, D = this.D, out = [];
    const x = i % W, y = (i / W) | 0, p = s.parcel;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!this.inb(nx, ny)) continue;
      const j = this.idx(nx, ny);
      if (!VEH_GROUND.has(s.ground[j]) || D.solid[j]) continue;
      if ((y === p.y1 && ny === p.y1 + 1) || (y === p.y1 + 1 && ny === p.y1)) {
        if (!D.gate || Math.abs(nx - D.gate.x) > 1) continue;
      }
      if (ny <= p.y1 && (nx < p.x0 || nx > p.x1)) continue;
      out.push(j);
    }
    return out;
  }
  // pedestrian graph node = f*WH + i
  pedNbr(n) {
    const s = this.s, W = s.W, WH = W * s.H, D = this.D, out = [];
    const f = (n / WH) | 0, i = n % WH, x = i % W, y = (i / W) | 0;
    for (const [dx, dy] of DIRS) {
      const nx = x + dx, ny = y + dy; if (!this.inb(nx, ny)) continue;
      const j = this.idx(nx, ny);
      if (!D.walk[f][j]) continue;
      if (ny > s.parcel.y1 || y > s.parcel.y1) continue; // fence
      const sa = D.shellAt[i], sb = D.shellAt[j];
      if (sa !== sb) { if (f > 0) continue; if (!D.doorEdge.has(Math.min(i, j) + ',' + Math.max(i, j))) continue; }
      out.push(f * WH + j);
    }
    const e = D.elevAt[i];
    if (e) { const el = s.objects[e]; if (this.works(el)) for (let g = 0; g < 2; g++) if (g !== f && D.walk[g][i]) out.push(g * WH + i); }
    const st = D.stairAt[i]; // stairs: people only, never carts (GDD §21)
    if (st && !this.navCart && s.objects[st].cstate === 'operating') for (let g = 0; g < 2; g++) if (g !== f && D.walk[g][i]) out.push(g * WH + i);
    return out;
  }
  bfs(starts, isGoal, nbr, maxN = 20000) {
    const prev = new Map(); const q = [];
    for (const st of starts) { prev.set(st, -1); q.push(st); }
    let head = 0;
    while (head < q.length && head < maxN) {
      const n = q[head++];
      if (isGoal(n)) { const path = []; let c = n; while (c !== -1) { path.push(c); c = prev.get(c); } return path.reverse(); }
      for (const m of nbr(n)) if (!prev.has(m)) { prev.set(m, n); q.push(m); }
    }
    return null;
  }
  distField(starts, nbr) { // BFS distances
    const dist = new Map(); const q = [];
    for (const st of starts) { dist.set(st, 0); q.push(st); }
    let h = 0; while (h < q.length) { const n = q[h++]; const d = dist.get(n); for (const m of nbr(n)) if (!dist.has(m)) { dist.set(m, d + 1); q.push(m); } }
    return dist;
  }
  pedPath(fromNode, toNode) { return this.bfs([fromNode], (n) => n === toNode, (n) => this.pedNbr(n)); }
  node(f, x, y) { return f * this.s.W * this.s.H + this.idx(x, y); }
  unnode(n) { const WH = this.s.W * this.s.H, f = (n / WH) | 0, i = n % WH; return { f, x: i % this.s.W, y: (i / this.s.W) | 0, i }; }

  // ------------------------------------------------------------ unit geometry + requirements
  unitFront(u) { // cells directly in front of the door face
    const out = [];
    const [dx, dy] = u.dir; // outward door direction
    if (dx !== 0) { const fx = dx > 0 ? u.x + u.w : u.x - 1; for (let y = u.y; y < u.y + u.h; y++) out.push({ x: fx, y }); }
    else { const fy = dy > 0 ? u.y + u.h : u.y - 1; for (let x = u.x; x < u.x + u.w; x++) out.push({ x, y: fy }); }
    return out.filter((c) => this.inb(c.x, c.y));
  }
  computeUnitReqs() {
    const s = this.s, D = this.D, WH = s.W * s.H;
    // distance field from loading/parking/asphalt vehicle-reachable ped cells (exterior access)
    const accessStarts = [];
    for (let i = 0; i < WH; i++) if (D.vehReach[i] && D.walk[0][i] && (s.ground[i] === G.LOADING || s.ground[i] === G.PARKING || s.ground[i] === G.ASPHALT)) accessStarts.push(i);
    const loadStarts = accessStarts.filter((i) => s.ground[i] === G.LOADING);
    this.navCart = true; // units must be reachable with a cart (freight path), not just by stairs
    const dAccess = this.distField(accessStarts, (n) => this.pedNbr(n));
    const dLoad = loadStarts.length ? this.distField(loadStarts, (n) => this.pedNbr(n)) : new Map();
    this.navCart = false;
    D.dAccess = dAccess;
    // an office whose door faces grass swings its entrance to a side customers can actually reach
    for (const of of this.previewing ? [] : this.objs('office')) {
      if (of.cstate !== 'operating' || !of.door) continue;
      const di = this.idx(of.door.x, of.door.y); if (D.vehReach[di] || dAccess.has(di)) continue;
      let best = null;
      for (const d of [[0, 1], [1, 0], [-1, 0], [0, -1]]) {
        const cells = d[0] ? [...Array(of.h)].map((_, k) => ({ x: d[0] > 0 ? of.x + of.w : of.x - 1, y: of.y + k })) : [...Array(of.w)].map((_, k) => ({ x: of.x + k, y: d[1] > 0 ? of.y + of.h : of.y - 1 }));
        const c = cells.find((c) => this.inb(c.x, c.y) && this.inParcel(c.x, c.y) && (D.vehReach[this.idx(c.x, c.y)] || dAccess.has(this.idx(c.x, c.y))));
        if (c) { best = { x: c.x, y: c.y, dir: d }; break; }
      }
      if (best) { of.door = best; s.structV++; this.redoRebuild = true; this.emit('office_door', { x: best.x, y: best.y }); }
    }
    const newlyBlocked = [];
    for (const u of this.objs('unit')) {
      const miss = [];
      const fronts = this.unitFront(u);
      if (u.access === 'drive') {
        const ok = fronts.some((c) => { const i = this.idx(c.x, c.y); return D.vehReach[i] && VEH_GROUND.has(s.ground[i]); });
        if (!ok) miss.push('Door needs drive-aisle frontage connected to the gate');
        u.conv = 1; u.dist = 0;
      } else {
        const f = u.f || 0;
        const fc = fronts.find((c) => s.hall[f][this.idx(c.x, c.y)] === 1) || fronts[0];
        if (!fc) { u.missing = ['Unit door faces the property edge']; u.blocked = u.cstate === 'operating'; if (u.cstate === 'ready') u.cstate = 'built'; continue; }
        const n = this.node(f, fc.x, fc.y);
        const shell = s.objects[D.shellAt[this.idx(u.x, u.y)]];
        if (s.hall[f][this.idx(fc.x, fc.y)] !== 1) miss.push('Unit door needs hallway frontage');
        else if (!dAccess.has(n)) {
          const els = this.objs('elevator').filter((e) => e.cstate === 'operating' && D.shellAt[this.idx(e.x, e.y)] === shell.id);
          if (f > 0 && !els.length) miss.push('Floor 2 has no elevator connection');
          else if (f > 0 && !els.some((e) => this.works(e))) miss.push(els.some((e) => e.unpowered) ? 'Elevator has no power' : 'Elevator is out of service');
          else miss.push('Hallway has no route to a building entrance');
        }
        if (D.lit[f][this.idx(fc.x, fc.y)] < 0.5 && u.cstate !== 'operating') miss.push('Hallway is dark - add a light');
        if (u.env === 'climate') {
          const hv = D.hvac[shell.id];
          const extra = u.cstate === 'operating' ? 0 : SIZES[u.size].sqft / 25;
          if (!hv || hv.cap <= 0) miss.push('Climate zone has no HVAC capacity');
          else if (hv.load + extra > hv.cap + 1e-6) miss.push('HVAC capacity exceeded for this zone');
        }
        const dl = dLoad.get(n), da = dAccess.get(n);
        u.dist = dl ?? da ?? 99;
        u.conv = clamp(1.04 - u.dist * 0.011, 0.55, 1) * (f > 0 ? 0.93 : 1) * (loadStarts.length ? 1 : 0.9);
      }
      u.missing = miss;
      if (u.cstate === 'built' || u.cstate === 'ready') u.cstate = miss.length ? 'built' : 'ready';
      // operating units keep their status, but lose access when their route or frontage breaks
      const wasBlocked = !!u.blocked;
      u.blocked = u.cstate === 'operating' && miss.some((m) => !/dark|HVAC/.test(m));
      if (u.blocked && !wasBlocked) newlyBlocked.push(u);
    }
    if (newlyBlocked.length && s.t > 0) this.emit('access_lost', { n: newlyBlocked.length, unit: newlyBlocked[0].id, name: newlyBlocked[0].name, x: newlyBlocked[0].x, y: newlyBlocked[0].y, f: newlyBlocked[0].f || 0, why: newlyBlocked[0].missing[0] });
  }
  unitLit(u) { const fc = this.unitFront(u)[0]; if (!fc) return 1; if (u.access === 'drive') return this.isDaylight() ? 1 : Math.max(0.35, this.D.lit[0][this.idx(fc.x, fc.y)]); return this.D.lit[u.f || 0][this.idx(fc.x, fc.y)]; }
  unitSecurity(u) {
    const fc = this.unitFront(u)[0]; const f = u.f || 0; const i = fc ? this.idx(fc.x, fc.y) : this.idx(u.x, u.y);
    let sc = 0.35 + (this.D.gate ? 0.15 : 0) + (this.D.cam[f][i] ? 0.3 : 0) + Math.min(1, this.unitLit(u)) * 0.12;
    if (u.access === 'interior') { const sh = this.D.shellAt[this.idx(u.x, u.y)]; if (this.objs('door').some((d) => d.keypad && this.D.shellAt[this.idx(d.x, d.y)] === sh)) sc += 0.1; }
    return clamp(sc, 0, 1);
  }

  // ============================================================ BUILD PLANNING (validation)
  groundAt(i) { return this.D.pendingGround.has(i) ? this.D.pendingGround.get(i) : this.s.ground[i]; }
  cellFree(i, f = 0) { // no solid object / shell / unit on this cell
    const D = this.D; if (D.shellAt[i]) return false; if (D.unitAt[f][i]) return false; if (D.solid[i]) return false;
    const at = D.at.get(f * this.s.W * this.s.H + i) || [];
    return !at.some((id) => { const t = this.s.objects[id].type; return t === 'hvac' || t === 'office' || t === 'unit'; });
  }
  plan(a) { // wraps planCore with utility-capacity consequences (GDD §22, §63.5)
    const R = this.planCore(a);
    if (!R || R.status === 'invalid' || !this.D.power) return R;
    const P = this.D.power, n = R.count || 1;
    if (a.tool === 'power') { R.power = { cap: P.cap + TOOLS.power.kw, demand: P.demand }; return R; }
    let add = this.powerAdd(a.tool === 'units' ? '' : a.tool, n);
    if (a.tool === 'units' && R.climate) add = 0;
    if (!add) return R;
    const after = P.demand + add; R.power = { cap: P.cap, demand: after, add };
    R.warn = R.warn || [];
    if (after > P.cap + 1e-9) R.warn.push(`Power: ${after.toFixed(1)} of ${P.cap} kW - over capacity, lowest-priority equipment will shut off. Add an Electrical Service Upgrade.`);
    else if (after > P.cap * 0.85) R.warn.push(`Power near limit: ${after.toFixed(1)} of ${P.cap} kW`);
    return R;
  }
  planCore(a) {
    this.ensure();
    const s = this.s, D = this.D, T = TOOLS[a.tool]; const f = a.f || 0;
    const R = { tool: a.tool, status: 'valid', reasons: [], missing: [], cost: 0, count: 0, dur: 0, opex: 0, items: [], creates: [], tiles: [], label: T ? T.name : a.tool };
    if (!T) return { ...R, status: 'invalid', reasons: ['Unknown tool'] };
    const bad = (m) => { R.status = 'invalid'; if (!R.reasons.includes(m)) R.reasons.push(m); };
    const inc = (m) => { if (R.status === 'valid') R.status = 'incomplete'; if (!R.missing.includes(m)) R.missing.push(m); };
    const x0 = Math.min(a.a.x, a.b.x), x1 = Math.max(a.a.x, a.b.x), y0 = Math.min(a.a.y, a.b.y), y1 = Math.max(a.a.y, a.b.y);
    const rectCells = () => { const out = []; for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ x, y }); return out; };
    const needParcel = (c) => { if (!this.inParcel(c.x, c.y)) { bad('Outside the property line'); return false; } return true; };

    if (T.shape === 'rect' && a.tool !== 'canopy' && !a.tool.startsWith('shell') && a.tool !== 'hall') {
      const target = { aisle: G.ASPHALT, loading: G.LOADING, parking: G.PARKING, walk: G.CONCRETE }[a.tool];
      let n = 0;
      for (const c of rectCells()) {
        const it = { ...c, f: 0, ok: true }; R.items.push(it);
        if (!needParcel(c)) { it.ok = false; continue; }
        const i = this.idx(c.x, c.y), g = this.groundAt(i);
        if (!this.cellFree(i)) { it.ok = false; bad('Blocked: overlaps a building or unit'); continue; }
        if (g === target) { it.ok = true; it.skip = true; continue; }
        if (a.tool === 'loading' || a.tool === 'parking') { if (g !== G.ASPHALT && g !== G.LOADING && g !== G.PARKING) { it.ok = false; bad(`${T.name} must be painted on a drive aisle`); continue; } }
        else if (g !== G.GRASS && g !== G.CONCRETE && !(a.tool === 'walk' && g === G.ASPHALT)) { it.ok = false; bad('Blocked: surface already paved'); continue; }
        n++; R.tiles.push({ k: 'ground', i, v: target });
      }
      R.count = n; R.cost = n * T.costPerCell; R.dur = 60 + n * 6;
      if (n === 0 && R.status !== 'invalid') bad('Nothing to change here');
      if (a.tool === 'aisle' && R.status !== 'invalid') {
        const touches = R.tiles.some((t) => { const x = t.i % s.W, y = (t.i / s.W) | 0; return DIRS.some(([dx, dy]) => { const j = this.idx(x + dx, y + dy); return D.vehReach[j] || (D.pendingGround.get(j) === G.ASPHALT); }); });
        if (!touches) inc('Not connected to an existing drive aisle');
      }
      if (R.status !== 'invalid' && R.tiles.length && (a.tool === 'walk' || a.tool === 'loading' || a.tool === 'parking')) {
        const n = this.accessImpact(() => { const old = R.tiles.map((t) => [t.i, s.ground[t.i]]); for (const t of R.tiles) s.ground[t.i] = t.v; return () => { for (const [i, g] of old) s.ground[i] = g; }; });
        if (n) R.warn = [`${n} open unit${n > 1 ? 's' : ''} will lose access and stop renting`];
      }
      if (a.tool === 'loading' && R.status !== 'invalid') {
        const nearDoor = this.objs('door').some((d) => Math.abs(d.x - x0) + Math.abs(d.y - y0) < 8 || Math.abs(d.x - x1) + Math.abs(d.y - y1) < 8);
        if (!nearDoor) inc('No building entrance nearby');
      }
      return R;
    }
    if (a.tool === 'canopy') {
      let touches = false;
      for (const c of rectCells()) {
        const it = { ...c, f: 0, ok: true }; R.items.push(it);
        if (!needParcel(c)) { it.ok = false; continue; }
        const i = this.idx(c.x, c.y), g = this.groundAt(i);
        if (!(g === G.LOADING || g === G.CONCRETE || g === G.ASPHALT || g === G.PARKING) || !this.cellFree(i)) { it.ok = false; bad('Canopy must cover paved loading/apron cells'); }
        if ((D.at.get(i) || []).some((id) => s.objects[id].type === 'canopy')) { it.ok = false; bad('Already covered'); }
        if (DIRS.some(([dx, dy]) => this.inb(c.x + dx, c.y + dy) && D.shellAt[this.idx(c.x + dx, c.y + dy)])) touches = true;
      }
      if (!touches) bad('Canopy must touch a building');
      const n = R.items.length; R.count = n; R.cost = n * T.costPerCell; R.dur = 300 + n * 20;
      R.creates.push({ type: 'canopy', x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1, f: 0 });
      return R;
    }
    if (a.tool.startsWith('shell')) {
      const w = x1 - x0 + 1, h = y1 - y0 + 1;
      if (w < 3 || h < 3) bad('Buildings must be at least 3x3 cells');
      for (const c of rectCells()) {
        const it = { ...c, f: 0, ok: true }; R.items.push(it);
        if (!needParcel(c)) { it.ok = false; continue; }
        const i = this.idx(c.x, c.y), g = this.groundAt(i);
        if (!this.cellFree(i) || (D.at.get(i) || []).length) { it.ok = false; bad('Blocked: overlaps another structure'); continue; }
        if (g !== G.GRASS && g !== G.CONCRETE) { it.ok = false; bad('Blocked: would sit on a drive aisle'); }
      }
      R.count = w * h; R.cost = R.count * T.costPerCell; R.dur = 600 + R.count * 14 * T.floors;
      R.creates.push({ type: 'shell', x: x0, y: y0, w, h, floors: T.floors, f: 0 });
      R.label = `${T.name} ${w}x${h}`;
      inc('Needs hallway, units, a door and lights to earn rent');
      return R;
    }
    if (a.tool === 'hall') {
      let shellId = null, n = 0;
      for (const c of rectCells()) {
        const it = { ...c, f, ok: true }; R.items.push(it);
        if (!this.inb(c.x, c.y)) { it.ok = false; continue; }
        const i = this.idx(c.x, c.y), sh = D.shellAt[i];
        if (!sh) { it.ok = false; bad('Hallways must be inside a building'); continue; }
        const shell = s.objects[sh];
        if (shellId && sh !== shellId) { it.ok = false; bad('Hallway spans two buildings'); continue; }
        shellId = sh;
        if (shell.cstate === 'construction') R.waitShell = shell.id;
        if (f >= shell.floors) { it.ok = false; bad('This building has no floor ' + (f + 1)); continue; }
        if (D.unitAt[f][i] || D.elevAt[i] || D.stairAt[i] || D.roomAt[f][i]) { it.ok = false; bad('Blocked: overlaps a unit, elevator, stairwell or restroom'); continue; }
        if (s.hall[f][i]) { it.skip = true; continue; }
        n++; R.tiles.push({ k: 'hall', f, i });
      }
      if (!n && R.status !== 'invalid') bad('Nothing to change here');
      R.count = n; R.cost = n * T.costPerCell; R.dur = 60 + n * 5;
      return R;
    }
    if (T.unit) return this.planUnits(a, R, bad, inc);
    // ---- tap tools
    const x = a.a.x, y = a.a.y; if (!this.inb(x, y)) { bad('Off the map'); return R; }
    const i = this.idx(x, y);
    R.items.push({ x, y, f, ok: true });
    const failItem = (m) => { R.items[0].ok = false; bad(m); };
    const atHere = (D.at.get(f * s.W * s.H + i) || []).map((id) => s.objects[id]);
    switch (a.tool) {
      case 'office': {
        R.items = [];
        const w = T.fw, h = T.fd, ox = x - 2, oy = y - 1;
        for (let yy = oy; yy < oy + h; yy++) for (let xx = ox; xx < ox + w; xx++) {
          const it = { x: xx, y: yy, f: 0, ok: true }; R.items.push(it);
          if (!this.inParcel(xx, yy)) { it.ok = false; bad('Outside the property line'); continue; }
          const j = this.idx(xx, yy);
          if (!this.cellFree(j) || (D.at.get(j) || []).length || (this.groundAt(j) !== G.GRASS && this.groundAt(j) !== G.CONCRETE)) { it.ok = false; bad('Blocked: office needs clear unpaved land'); }
        }
        if (this.objs('office').length) bad('This property already has an office');
        // door: pick side facing a paved cell
        const sides = [[1, 0], [-1, 0], [0, 1], [0, -1]]; let door = null;
        const pref = a.dir ? [a.dir, ...sides] : sides;
        for (const d of pref) {
          const cells = d[0] ? [...Array(h)].map((_, k) => ({ x: d[0] > 0 ? ox + w : ox - 1, y: oy + k })) : [...Array(w)].map((_, k) => ({ x: ox + k, y: d[1] > 0 ? oy + h : oy - 1 }));
          const c = cells.find((c) => this.inb(c.x, c.y) && PED_GROUND.has(this.groundAt(this.idx(c.x, c.y))) && this.inParcel(c.x, c.y));
          if (c) { door = { x: c.x, y: c.y, dir: d }; break; }
        }
        if (!door) { door = { x: ox + w, y: oy + 1, dir: [1, 0] }; inc('Office door needs a paved walkway or parking in front'); }
        R.cost = T.cost; R.dur = 1440; R.count = 1;
        R.creates.push({ type: 'office', x: ox, y: oy, w, h, f: 0, door });
        return R;
      }
      case 'gate': {
        const p = s.parcel;
        if (y !== p.y1) { failItem('Gates go on the front fence line (street frontage)'); return R; }
        if (this.objs('gate').length) failItem('This property already has an entrance gate');
        if (x - 1 < p.x0 || x + 1 > p.x1) failItem('Too close to the property corner');
        R.items = [-1, 0, 1].map((k) => ({ x: x + k, y, f: 0, ok: R.status !== 'invalid' }));
        for (let k = -1; k <= 1; k++) { const j = this.idx(x + k, y); if (!this.cellFree(j)) { bad('Blocked: gate lane overlaps a structure'); } R.tiles.push({ k: 'ground', i: j, v: G.ASPHALT }, { k: 'ground', i: this.idx(x + k, y + 1), v: G.ASPHALT }); }
        const inside = [-1, 0, 1].some((k) => { const j = this.idx(x + k, y - 1); return this.groundAt(j) === G.ASPHALT; });
        if (!inside) inc('Gate has no drive aisle behind it yet');
        R.cost = T.cost; R.dur = 480; R.count = 1;
        R.creates.push({ type: 'gate', x, y, f: 0, cond: 1 });
        return R;
      }
      case 'doorStd': case 'doorWide': case 'doorAuto': {
        const sh = D.shellAt[i];
        if (!sh) { failItem('Doors go on a building wall, on a hallway cell'); return R; }
        if (f !== 0) { failItem('Exterior doors are on the ground floor'); return R; }
        if (!s.hall[0][i]) { failItem('The inside of this door needs a hallway (build one first)'); return R; }
        if (s.objects[sh].cstate === 'construction') R.waitShell = sh;
        const outs = DIRS.filter(([dx, dy]) => this.inb(x + dx, y + dy) && D.shellAt[this.idx(x + dx, y + dy)] !== sh);
        if (!outs.length) { failItem('Not on an exterior wall'); return R; }
        let dir = outs.find((d) => a.dir && d[0] === a.dir[0] && d[1] === a.dir[1]) || outs.find(([dx, dy]) => PED_GROUND.has(this.groundAt(this.idx(x + dx, y + dy)))) || outs[0];
        if (this.objs('door').some((d) => d.x === x && d.y === y && d.dir[0] === dir[0] && d.dir[1] === dir[1])) { failItem('A door is already here'); return R; }
        const oi = this.idx(x + dir[0], y + dir[1]);
        if (!PED_GROUND.has(this.groundAt(oi)) || !this.cellFree(oi)) inc('Door opens onto grass - pave a walkway or loading zone');
        R.cost = T.cost; R.dur = 240; R.count = 1;
        R.creates.push({ type: 'door', kind: T.doorKind, x, y, f: 0, dir, cond: 1 });
        R.opex = T.doorKind === 'auto' ? OPEX.doorAuto : 0;
        return R;
      }
      case 'elevator': {
        const sh = D.shellAt[i]; const shell = sh && s.objects[sh];
        if (!shell) { failItem('Elevators go inside a building'); return R; }
        if (shell.floors < 2) { failItem('This building has only one floor'); return R; }
        if (shell.cstate === 'construction') R.waitShell = shell.id;
        for (let g = 0; g < 2; g++) if (D.unitAt[g][i]) { failItem('Blocked on floor ' + (g + 1) + ' by a unit'); return R; }
        if (D.elevAt[i]) { failItem('An elevator is already here'); return R; }
        for (let g = 0; g < 2; g++) if (!DIRS.some(([dx, dy]) => this.inb(x + dx, y + dy) && s.hall[g][this.idx(x + dx, y + dy)] === 1)) inc(`No hallway beside the shaft on floor ${g + 1}`);
        R.items = [{ x, y, f: 0, ok: true }, { x, y, f: 1, ok: true }];
        R.cost = T.cost; R.dur = 2160; R.count = 1; R.opex = OPEX.elevator;
        R.creates.push({ type: 'elevator', x, y, f: 0, cond: 1 });
        return R;
      }
      case 'stairs': {
        const sh = D.shellAt[i]; const shell = sh && s.objects[sh];
        if (!shell) { failItem('Stairwells go inside a building'); return R; }
        if (shell.floors < 2) { failItem('This building has only one floor'); return R; }
        if (shell.cstate === 'construction') R.waitShell = shell.id;
        for (let g = 0; g < 2; g++) if (D.unitAt[g][i] || D.roomAt[g][i]) { failItem('Blocked on floor ' + (g + 1)); return R; }
        if (D.elevAt[i] || D.stairAt[i]) { failItem('Already a shaft or stairwell here'); return R; }
        for (let g = 0; g < 2; g++) if (!DIRS.some(([dx, dy]) => this.inb(x + dx, y + dy) && s.hall[g][this.idx(x + dx, y + dy)] === 1)) inc(`No hallway beside the stairs on floor ${g + 1}`);
        R.items = [{ x, y, f: 0, ok: true }, { x, y, f: 1, ok: true }];
        R.cost = T.cost; R.dur = 720; R.count = 1;
        R.creates.push({ type: 'stairs', x, y, f: 0, cond: 1 });
        return R;
      }
      case 'power': case 'water': {
        if (!this.inParcel(x, y) || !this.cellFree(i) || (D.at.get(i) || []).length) { failItem('Blocked'); return R; }
        const g = this.groundAt(i); if (g !== G.GRASS && g !== G.CONCRETE) { failItem('Utility pads go on open ground'); return R; }
        let serves = null;
        if (a.tool === 'water') { serves = DIRS.map(([dx, dy]) => this.inb(x + dx, y + dy) && D.shellAt[this.idx(x + dx, y + dy)]).find((v) => v); if (!serves) { failItem('Water service must sit directly beside a building'); return R; } if (D.water.has(serves)) { failItem('This building already has water service'); return R; } }
        R.cost = T.cost; R.dur = a.tool === 'power' ? 1440 : 480; R.count = 1; R.opex = a.tool === 'power' ? OPEX.power : 0;
        R.creates.push({ type: a.tool, x, y, w: 1, h: 1, f: 0, serves, cond: 1 });
        return R;
      }
      case 'restroom': {
        const sh = D.shellAt[i]; const shell = sh && s.objects[sh];
        if (!shell) { failItem('Restrooms go inside a building, off a hallway'); return R; }
        if (f >= shell.floors) { failItem('No floor here'); return R; }
        if (s.hall[f][i] || D.unitAt[f][i] || D.elevAt[i] || D.stairAt[i] || D.roomAt[f][i]) { failItem('Needs an empty cell beside a hallway (not on it)'); return R; }
        if (s.hall[f][i] === 2) { failItem('Hallway under construction here'); return R; }
        if (!DIRS.some(([dx, dy]) => this.inb(x + dx, y + dy) && s.hall[f][this.idx(x + dx, y + dy)] === 1)) { failItem('The restroom door must open onto a hallway'); return R; }
        if (shell.cstate === 'construction') R.waitShell = shell.id;
        if (!D.water.has(sh)) inc('Building has no water service - add a Water Service hookup');
        R.cost = T.cost; R.dur = 1080; R.count = 1; R.opex = OPEX.restroom;
        R.creates.push({ type: 'restroom', x, y, f, cond: 1, dirt: 0 });
        return R;
      }
      case 'fountain': {
        const sh = D.shellAt[i];
        if (!sh || s.hall[f][i] !== 1) { failItem('Fountains go on a built hallway'); return R; }
        if (atHere.some((o) => o.type === 'fountain' || o.type === 'corral')) { failItem('Something is already here'); return R; }
        if (!D.water.has(sh)) inc('Building has no water service - add a Water Service hookup');
        R.cost = T.cost; R.dur = 240; R.count = 1; R.opex = OPEX.fountain;
        R.creates.push({ type: 'fountain', x, y, f, cond: 1 });
        return R;
      }
      case 'light': case 'camera': {
        if (!this.inParcel(x, y)) { failItem('Outside the property line'); return R; }
        const sh = D.shellAt[i];
        if (sh) { const shell = s.objects[sh]; if (f >= shell.floors) { failItem('No floor here'); return R; } if (D.unitAt[f][i]) { failItem('Mount it in a hallway, not inside a unit'); return R; } }
        else if (f > 0) { failItem('Exterior fixtures go on the ground level'); return R; }
        else if (D.solid[i] && !atHere.some((o) => o.type === 'unit' || o.type === 'office')) { failItem('Blocked'); return R; }
        if (atHere.some((o) => o.type === a.tool)) { failItem('Already one here'); return R; }
        R.cost = T.cost; R.dur = 120; R.count = 1; R.opex = a.tool === 'light' ? OPEX.light : OPEX.camera;
        R.creates.push({ type: a.tool, x, y, f: sh ? f : 0, cond: 1 });
        return R;
      }
      case 'keypad': {
        const door = this.objs('door').find((d) => (d.x === x && d.y === y) || (d.x + d.dir[0] === x && d.y + d.dir[1] === y));
        if (!door) { failItem('Tap a building door'); return R; }
        if (door.keypad) { failItem('This door already has a keypad'); return R; }
        R.cost = T.cost; R.dur = 120; R.count = 1; R.opex = OPEX.keypad;
        R.creates.push({ type: 'keypadUpgrade', door: door.id });
        return R;
      }
      case 'hvac': {
        if (!this.inParcel(x, y) || !this.cellFree(i) || (D.at.get(i) || []).length) { failItem('Blocked'); return R; }
        const g = this.groundAt(i); if (g !== G.GRASS && g !== G.CONCRETE) { failItem('HVAC pads go on open ground beside a building'); return R; }
        const adj = DIRS.map(([dx, dy]) => this.inb(x + dx, y + dy) && D.shellAt[this.idx(x + dx, y + dy)]).find((v) => v);
        if (!adj) { failItem('HVAC must sit directly beside a building'); return R; }
        R.cost = T.cost; R.dur = 720; R.count = 1; R.opex = OPEX.hvacPlant;
        R.creates.push({ type: 'hvac', x, y, w: 1, h: 1, f: 0, serves: adj, cond: 1 });
        return R;
      }
      case 'corral': {
        const walkable = D.walk[f][i] || (f === 0 && !D.shellAt[i] && PED_GROUND.has(this.groundAt(i)) && this.cellFree(i));
        if (!walkable) { failItem('Corrals go on a walkway, loading apron or hallway'); return R; }
        if (atHere.some((o) => o.type === 'corral')) { failItem('Already a corral here'); return R; }
        R.cost = T.cost; R.dur = 60; R.count = 1;
        R.creates.push({ type: 'corral', x, y, f: D.shellAt[i] ? f : 0, target: 3 });
        return R;
      }
      case 'demolish': {
        const small = { light: 0, camera: 0, sign: 0, corral: 1, hvac: 1, amenity: 1, door: 2, unit: 5 };
        const cand = atHere.filter((o) => o.type !== 'shell' && o.type !== 'gate' && o.type !== 'office').sort((p, q) => (small[p.type] ?? 3) - (small[q.type] ?? 3));
        let o = cand[0];
        if (!o && D.elevAt[i]) o = s.objects[D.elevAt[i]];
        if (!o && D.stairAt[i]) o = s.objects[D.stairAt[i]];
        if (!o) { const dd = this.objs('door').find((d) => d.x === x && d.y === y); if (dd) o = dd; }
        if (!o) { failItem('Nothing removable here'); return R; }
        R.target = o.id; R.label = 'Demolish ' + this.objName(o);
        if (o.type === 'unit' && (o.lease || o.commercial === 'reserved')) { failItem('Occupied - the lease must end before demolition'); return R; }
        if (o.type === 'elevator' && this.objs('unit').some((u) => u.f > 0 && u.cstate === 'operating' && D.shellAt[this.idx(u.x, u.y)] === D.shellAt[i])) { failItem('Upper-floor units depend on this elevator'); return R; }
        if (s.agents.some((ag) => ag.unit === o.id)) { failItem('A customer is using this right now'); return R; }
        R.cost = 60 + (o.type === 'unit' ? SIZES[o.size].sqft * 0.6 : 40); R.dur = 0; R.count = 1;
        R.missing.push(o.type === 'unit' ? 'Capacity is lost; no salvage refund' : 'No salvage refund');
        if (o.type !== 'unit') { const n = this.accessImpact(() => { delete s.objects[o.id]; return () => { s.objects[o.id] = o; }; }); if (n) R.warn = [`${n} open unit${n > 1 ? 's' : ''} will lose access and stop renting`]; }
        R.status = 'valid';
        return R;
      }
    }
    return R;
  }
  planUnits(a, R, bad, inc) {
    const s = this.s, D = this.D, T = TOOLS[a.tool], f = T.access === 'drive' ? 0 : (a.f || 0);
    const sz = SIZES[T.size]; const dx = a.b.x - a.a.x, dy = a.b.y - a.a.y;
    const axisX = a.axis ? a.axis === 'x' : Math.abs(dx) >= Math.abs(dy);
    const len = (axisX ? Math.abs(dx) : Math.abs(dy)) + 1;
    const n = Math.max(1, Math.floor(len / sz.w));
    const step = axisX ? Math.sign(dx) || 1 : Math.sign(dy) || 1;
    const climate = T.access === 'interior' && !!a.climate;
    // two orientations: door on -perp side or +perp side of the drag line
    const build = (sideSign) => {
      const units = [];
      for (let k = 0; k < n; k++) {
        const along = (axisX ? a.a.x : a.a.y) + (step > 0 ? k * sz.w : -(k + 1) * sz.w + 1);
        let ux, uy, uw, uh, dir;
        if (axisX) { uw = sz.w; uh = sz.d; ux = along; uy = sideSign < 0 ? a.a.y : a.a.y - sz.d + 1; dir = [0, sideSign]; }
        else { uw = sz.d; uh = sz.w; uy = along; ux = sideSign < 0 ? a.a.x : a.a.x - sz.d + 1; dir = [sideSign, 0]; }
        units.push({ x: ux, y: uy, w: uw, h: uh, dir, f });
      }
      return units;
    };
    const frontScore = (units) => units.reduce((acc, u) => acc + this.unitFront({ ...u }).filter((c) => {
      const i = this.idx(c.x, c.y);
      return T.access === 'drive' ? VEH_GROUND.has(this.groundAt(i)) : !!s.hall[f][i];
    }).length, 0);
    const A = build(-1), B = build(1);
    let units = frontScore(B) > frontScore(A) ? B : A;
    if (a.flip) units = units === A ? B : A;
    let anyBad = false;
    for (const u of units) {
      let ok = true;
      for (let y = u.y; y < u.y + u.h; y++) for (let x = u.x; x < u.x + u.w; x++) {
        R.items.push({ x, y, f, ok: true, unit: true });
        const it = R.items[R.items.length - 1];
        if (!this.inb(x, y)) { it.ok = false; ok = false; bad('Off the map'); continue; }
        const i = this.idx(x, y);
        if (T.access === 'drive') {
          if (!this.inParcel(x, y)) { it.ok = false; ok = false; bad('Outside the property line'); continue; }
          if (!this.cellFree(i) || (D.at.get(i) || []).length) { it.ok = false; ok = false; bad('Blocked: overlaps another structure'); continue; }
          const g = this.groundAt(i); if (g !== G.GRASS && g !== G.CONCRETE) { it.ok = false; ok = false; bad('Blocked: would sit on a drive aisle'); continue; }
        } else {
          const sh = D.shellAt[i]; const shell = sh && s.objects[sh];
          if (!shell) { it.ok = false; ok = false; bad('Interior units must be inside a building'); continue; }
          if (shell.cstate === 'construction') R.waitShell = shell.id;
          if (f >= shell.floors) { it.ok = false; ok = false; bad('This building has no floor ' + (f + 1)); continue; }
          if (s.hall[f][i] || D.unitAt[f][i] || D.elevAt[i] || D.stairAt[i] || D.roomAt[f][i]) { it.ok = false; ok = false; bad('Blocked: overlaps a hallway, unit, elevator, stairwell or restroom'); continue; }
          if (units[0] && D.shellAt[this.idx(units[0].x, units[0].y)] !== sh) { it.ok = false; ok = false; bad('Row spans two buildings'); }
        }
      }
      const fronts = this.unitFront(u);
      if (T.access === 'interior') {
        if (!fronts.some((c) => s.hall[f][this.idx(c.x, c.y)])) { ok = false; bad('Unit door needs hallway frontage (build the hallway first)'); }
      } else if (!fronts.some((c) => VEH_GROUND.has(this.groundAt(this.idx(c.x, c.y))))) inc('Door faces no drive aisle yet');
      u.ok = ok; if (!ok) anyBad = true;
    }
    R.count = units.length;
    const unitCost = T.cost * (climate ? CLIMATE_COST_MULT : 1);
    R.cost = Math.round(unitCost * units.length);
    R.dur = 240 + 110 * units.length * (sz.sqft / 50) ** 0.5;
    R.opex = OPEX.perUnit * units.length + (climate ? OPEX.hvacPerClimateCell * sz.sqft / 25 * units.length : 0);
    R.units = units; R.label = `${units.length} x ${climate ? 'Climate ' : ''}${T.name}`;
    R.sqft = sz.sqft * units.length;
    R.doorDir = units[0] && units[0].dir;
    if (!anyBad && T.access === 'interior') {
      const sh = D.shellAt[this.idx(units[0].x, units[0].y)];
      if (f > 0 && !this.objs('elevator').some((e) => D.shellAt[this.idx(e.x, e.y)] === sh)) inc('Floor 2 has no elevator connection');
      const dark = units.some((u) => { const c = this.unitFront(u).find((c) => s.hall[f][this.idx(c.x, c.y)] === 1); return c && D.lit[f][this.idx(c.x, c.y)] < 0.5; });
      if (dark) inc('Hallway is dark - add a light');
      if (climate) { const hv = D.hvac[sh]; const need = units.length * sz.sqft / 25; if (!hv || hv.cap <= 0) inc('Climate zone has no HVAC capacity'); else if (hv.load + need > hv.cap) inc('HVAC capacity would be exceeded'); }
      if (!this.objs('door').some((d) => D.shellAt[this.idx(d.x, d.y)] === sh)) inc('Building has no entrance door');
    }
    for (const u of units) R.creates.push({ type: 'unit', x: u.x, y: u.y, w: u.w, h: u.h, dir: u.dir, f, size: T.size, access: T.access, env: climate ? 'climate' : 'std' });
    return R;
  }

  // ============================================================ ACTIONS
  dispatch(a) {
    this.ensure();
    const fn = this['act_' + a.type];
    if (!fn) return { ok: false, msg: 'Unknown action ' + a.type };
    const r = fn.call(this, a) || { ok: true };
    this.ensure();
    return r;
  }
  act_speed(a) { this.s.speed = a.v; this.emit('speed', { v: a.v }); return { ok: true }; }
  act_build(a) {
    const s = this.s, R = this.plan(a);
    if (R.status === 'invalid') { this.emit('refuse'); return { ok: false, msg: R.reasons[0] }; }
    if (a.tool === 'demolish') return this.demolish(R);
    const rush = !!a.rush && (s.coTier || 1) >= 2 && !s.creative; if (rush) { R.cost = Math.round(R.cost * 1.25); R.dur = R.dur * 0.5; }
    if (!s.creative && s.cash < R.cost) { this.emit('refuse'); return { ok: false, msg: `Not enough cash (${Math.round(R.cost).toLocaleString()} needed)` }; }
    const ord = { id: this.id(), label: R.label, tool: a.tool, cost: R.cost, dur: Math.max(30, Math.round(R.dur)), prog: 0, st: 'construction', objs: [], tiles: R.tiles, t0: s.t, cells: R.items.filter((it) => !it.skip).map((it) => ({ x: it.x, y: it.y, f: it.f })) };
    if (!s.creative) this.money(-R.cost, 'capex', R.label);
    if (R.waitShell) ord.waitShell = R.waitShell;
    for (const c of R.creates) {
      if (c.type === 'keypadUpgrade') { const d = s.objects[c.door]; d.keypad = 'pending'; d.keypadOrder = ord.id; ord.keypadDoor = d.id; continue; }
      const o = { id: this.id(), ...c, cstate: 'construction', order: ord.id, cond: c.cond ?? 1 };
      if (o.type === 'unit') {
        o.commercial = 'none'; o.lease = null;
        const key = o.access === 'drive' ? 'drive' : o.f > 0 ? 'upper' : 'interior';
        { const base = { drive: 100, interior: 200, upper: 300 }[key], k = s.unitNo[key]++ - base - 1; o.num = base + Math.floor(k / 99) * 1000 + (k % 99) + 1; } o.name = 'Unit ' + o.num;
      }
      if (o.type === 'corral') { o.name = this.corralName(o); }
      if (o.type === 'elevator') Object.assign(o, { pos: 0, tgt: null, door: 0, riders: [], q: [[], []], cap: 4, trips: 0 });
      if (o.type === 'gate') Object.assign(o, { open: 0 });
      s.objects[o.id] = o; ord.objs.push(o.id);
    }
    for (const tl of R.tiles) if (tl.k === 'hall') s.hall[tl.f][tl.i] = 2;
    s.orders.push(ord);
    if (s.lesson) s.lesson.built.push({ tool: a.tool, f: a.f || 0, id: ord.id }); else if (s.tut && s.tut.on) (s.tut.built || (s.tut.built = [])).push({ tool: a.tool, f: a.f || 0, id: ord.id });
    s.lastCommit = { order: ord.id, t: s.t };
    this.markDirty();
    this.emit('commit', { order: ord.id, cells: ord.cells });
    if (s.creative) this.completeOrder(ord);
    return { ok: true, order: ord.id, msg: `${R.label} committed` };
  }
  corralName(o) {
    const n = this.objs('corral').length + 1;
    const nearLoad = DIRS.some(([dx, dy]) => this.s.ground[this.idx(o.x + dx, o.y + dy)] === G.LOADING);
    return (o.f > 0 ? `Floor ${o.f + 1} Corral` : nearLoad ? 'Main Loading Corral' : 'Corral') + (n > 1 ? ' ' + n : '');
  }
  demolish(R) {
    const s = this.s, o = s.objects[R.target];
    this.money(-R.cost, 'capex', 'Demolition: ' + this.objName(o));
    if (o.type === 'corral') for (const c of s.carts) if (c.corral === o.id && c.st === 'corral') { c.st = 'stranded'; c.corral = null; c.f = o.f; c.x = o.x; c.y = o.y; c.since = s.t; }
    if (o.type === 'door' && o.keypad) { /* keypad removed with door */ }
    s.tasks = s.tasks.filter((t) => t.obj !== o.id);
    delete s.objects[o.id];
    this.markDirty(); this.emit('demolish', { x: o.x, y: o.y, f: o.f || 0 });
    return { ok: true, msg: 'Demolished' };
  }
  act_cancelOrder(a) {
    const s = this.s, ord = s.orders.find((o) => o.id === a.id);
    if (!ord || ord.st !== 'construction') return { ok: false, msg: 'Nothing to cancel' };
    const undo = s.lastCommit && s.lastCommit.order === ord.id && s.t - s.lastCommit.t <= 30;
    const refund = undo ? ord.cost : Math.round(ord.cost * (1 - ord.prog) * 0.6);
    if (!s.creative) this.money(refund, 'capex', (undo ? 'Undo: ' : 'Cancelled: ') + ord.label);
    for (const id of ord.objs) delete s.objects[id];
    if (ord.keypadDoor) { const d = s.objects[ord.keypadDoor]; if (d) { d.keypad = null; } }
    for (const tl of ord.tiles) if (tl.k === 'hall' && s.hall[tl.f][tl.i] === 2) s.hall[tl.f][tl.i] = 0;
    s.orders = s.orders.filter((o) => o !== ord);
    // dependent work inside a cancelled shell cannot be built on open ground
    let extra = 0, nDep = 0;
    const shellIds = new Set(ord.objs.filter((id) => !s.objects[id]));
    for (const dep of s.orders.filter((o) => o.st === 'construction' && o.waitShell && shellIds.has(o.waitShell))) {
      const r = this.act_cancelOrder({ id: dep.id, cascade: true }); if (r.ok) { extra += r.refund || 0; nDep++; }
    }
    this.markDirty(); this.emit('cancel');
    const total = refund + extra;
    return { ok: true, refund, msg: `${undo ? 'Undone' : 'Cancelled'}${nDep ? ` (+${nDep} dependent order${nDep > 1 ? 's' : ''})` : ''} - refunded $${total.toLocaleString()}` };
  }
  cancelRefund(ord) {
    const s = this.s; const undo = s.lastCommit && s.lastCommit.order === ord.id && s.t - s.lastCommit.t <= 30;
    return { undo, refund: undo ? ord.cost : Math.round(ord.cost * (1 - ord.prog) * 0.6) };
  }
  completeOrder(ord) {
    const s = this.s;
    ord.st = 'done'; ord.prog = 1;
    for (const tl of ord.tiles) {
      if (tl.k === 'ground') s.ground[tl.i] = tl.v;
      else if (tl.k === 'hall') s.hall[tl.f][tl.i] = 1;
    }
    for (const id of ord.objs) {
      const o = s.objects[id]; if (!o) continue;
      if (o.type === 'unit') o.cstate = 'built';
      else o.cstate = 'operating';
    }
    if (ord.keypadDoor) { const d = s.objects[ord.keypadDoor]; if (d) { d.keypad = 'operating'; d.kcond = 1; } }
    this.markDirty(); this.rebuild();
    if (ord.tool === 'office') for (const st of s.staff) if (!s.agents.some((a) => a.sid === st.id)) this.spawnStaffAgent(st);
    const units = ord.objs.map((id) => s.objects[id]).filter((o) => o && o.type === 'unit');
    this.emit('complete', { order: ord.id, label: ord.label, cells: ord.cells, ready: units.filter((u) => u.cstate === 'ready').length, units: units.length });
    if (ord.tool === 'hall' || ord.tool === 'aisle') { /* infra */ }
    s.orders = s.orders.filter((o) => o.st === 'construction' || s.t - o.t0 < 3 * MIN_PER_DAY);
  }
  act_commission(a) {
    const s = this.s; this.ensure();
    let targets = [];
    if (a.order) { const ord = s.orders.find((o) => o.id === a.order); targets = ord ? ord.objs.map((id) => s.objects[id]).filter(Boolean) : []; }
    else if (a.unit) targets = [s.objects[a.unit]];
    else if (a.all) targets = this.objs('unit');
    targets = targets.filter((u) => u && u.type === 'unit' && u.cstate === 'ready');
    if (!targets.length) { this.emit('refuse'); return { ok: false, msg: 'Nothing is ready to commission' }; }
    for (const u of targets) { u.cstate = 'operating'; u.commercial = 'ready'; }
    this.markDirty(); this.rebuild();
    this.emit('commissioned', { n: targets.length, x: targets[0].x, y: targets[0].y, f: targets[0].f || 0 });
    this.milestone('first_expansion');
    if (targets.some((u) => u.env === 'climate')) this.milestone('first_climate');
    if (targets.some((u) => u.f > 0)) this.milestone('first_upper');
    return { ok: true, msg: `${targets.length} unit${targets.length > 1 ? 's' : ''} commissioned - now rent-ready` };
  }
  act_open() {
    const miss = this.openingIssues();
    if (miss.length) { this.emit('refuse'); return { ok: false, msg: miss[0] }; }
    this.s.open = true; this.emit('opened'); if (this.hour < OFFICE_HOURS[1] - 1.5) this.genProspects(this.day, Math.max(0.35, (OFFICE_HOURS[1] - this.hour) / 10)); return { ok: true, msg: 'Open for business' };
  }
  openingIssues() {
    this.ensure(); const s = this.s, D = this.D, out = [];
    if (!D.gate) out.push('Main gate is not connected to the street');
    const office = this.objs('office')[0];
    if (!office || office.cstate !== 'operating') out.push('No operating office');
    else { const di = this.idx(office.door.x, office.door.y); if (!D.vehReach[di] && !(D.dAccess && D.dAccess.has(di))) out.push('Office door has no customer route - pave a walkway or parking in front of it'); }
    if (!this.objs('unit').some((u) => u.cstate === 'operating')) out.push('No commissioned rent-ready units');
    return out;
  }
  act_setRent(a) { const k = a.key; if (!(k in this.s.market.ask) || !Number.isFinite(Number(a.v))) return { ok: false }; this.s.market.ask[k] = clamp(Math.round(a.v), 10, 2000); return { ok: true }; }
  // ---------------------------------------------------------------- existing-tenant rent reviews (GDD §34)
  rentReviewCands(key) {
    const s = this.s, ask = s.market.ask[key];
    return Object.values(s.leases).filter((L) => {
      const u = s.objects[L.unit]; if (!u || productKey(u.size, u.env) !== key || L.status !== 'current' || (L.holdUntil && L.holdUntil > s.t)) return false;
      const since = Math.max(L.start != null ? (L.start - 1) * MIN_PER_DAY : -1e9, L.incT ?? -1e9);
      return s.t - since >= 180 * MIN_PER_DAY && L.rent < ask;
    });
  }
  rentReviewPreview(key, pct) {
    const ask = this.s.market.ask[key]; const c = this.rentReviewCands(key);
    return { n: c.length, delta: c.reduce((a, L) => a + Math.min(Math.round(L.rent * (1 + pct)), ask) - L.rent, 0) };
  }
  act_rentReview(a) {
    const s = this.s, pct = clamp(Number(a.pct) || 0, 0.01, 0.15), ask = s.market.ask[a.key];
    if (ask == null) return { ok: false };
    const c = this.rentReviewCands(a.key); if (!c.length) { this.emit('refuse'); return { ok: false, msg: 'No eligible tenants (need 6+ months tenure and rent below asking)' }; }
    let delta = 0;
    for (const L of c) {
      const nr = Math.min(Math.round(L.rent * (1 + pct)), ask); delta += nr - L.rent; L.prevRent = L.rent; L.rent = nr; L.incT = s.t; L.asked = false;
      const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat - pct * 1.6, 0, 1);
    }
    s.exp.value = clamp(s.exp.value - 0.01 * c.length / Math.max(1, Object.keys(s.leases).length) * 10, 0, 1);
    this.emit('rent_review', { n: c.length, delta });
    return { ok: true, msg: `${c.length} tenant${c.length > 1 ? 's' : ''} notified: +$${delta.toLocaleString()}/mo from next bill. Expect a few more move-outs.` };
  }
  // ---------------------------------------------------------------- Manager automation (GDD §46.3)
  hasManager() { return this.s.staff.some((x) => x.role === 'manager'); }
  mgr(msg) { const s = this.s; s.mgrLog.unshift({ t: s.t, msg }); s.mgrLog.length = Math.min(s.mgrLog.length, 20); this.emit('manager', { msg }); }
  managerTick() {
    const s = this.s; if (!this.hasManager()) return;
    const h = this.hour; if (h < OFFICE_HOURS[0] || h >= OFFICE_HOURS[1]) return;
    const reserve = (c) => s.creative || s.cash - c >= 2500;
    // 1. commission rent-ready units
    if (s.open && this.objs('unit').some((u) => u.cstate === 'ready')) { const r = this.act_commission({ all: true }); if (r.ok) this.mgr('Opened rent-ready units for rental'); }
    // 2. escalate stalled repairs to vendors
    const hasTech = s.staff.some((x) => x.role === 'tech');
    for (const t of s.tasks) {
      if (t.assigned || t.vendor || (t.type !== 'repair')) continue;
      const age = s.t - t.created, complex = t.need === 'repair_complex';
      if ((complex && (!hasTech ? age > 90 : age > 360)) || (t.pri >= 2 && age > 240)) {
        const cost = complex ? 650 : 250; if (!reserve(cost)) continue;
        const r = this.act_callVendor({ task: t.id }); if (r.ok) this.mgr(`Called a vendor: ${t.label} ($${cost})`);
      }
    }
    // 3. keep carts stocked
    for (const c of this.objs('corral')) {
      if (c.cstate !== 'operating' || this.cartsAt(c.id).length || (c.mgrBuy && s.t - c.mgrBuy < MIN_PER_DAY)) continue;
      const homed = s.carts.filter((x) => x.home === c.id && x.st !== 'damaged').length;
      if (homed < (c.target || 2) && reserve(CART_COST)) { const r = this.act_buyCarts({ corral: c.id, n: 1 }); if (r.ok) { c.mgrBuy = s.t; this.mgr(`Bought a cart for ${c.name}`); } }
    }
    // 4. monthly rent bands per product
    const day = dayOf(s.t);
    if (Math.floor(h) === 9 && day % 30 === 0 && s.mgrBand !== day) {
      s.mgrBand = day; const M = MARKETS[s.market.id];
      const by = {}; for (const u of this.objs('unit')) if (u.cstate === 'operating') { const k = productKey(u.size, u.env); (by[k] ||= { n: 0, occ: 0 }).n++; if (u.lease) by[k].occ++; }
      for (const [k, v] of Object.entries(by)) {
        if (v.n < 2) continue; const occ = v.occ / v.n, [sz, env] = k.split('|');
        const mk = this.marketRent({ size: sz, env }), cur = s.market.ask[k];
        let nv = cur;
        if (occ >= 0.92) nv = Math.min(Math.round(cur * 1.03 / 5) * 5, Math.round(mk * 1.3));
        else if (occ < 0.75) nv = Math.max(Math.round(cur * 0.97 / 5) * 5, Math.round(mk * 0.8));
        if (nv !== cur) { s.market.ask[k] = nv; this.mgr(`${nv > cur ? 'Raised' : 'Lowered'} ${sz} ${env === 'climate' ? 'climate ' : ''}asking rent to $${nv} (${Math.round(occ * 100)}% occupied)`); }
      }
    }
  }
  act_hire(a) {
    const s = this.s, R = ROLES[a.role]; if (!R || a.role === 'owner') return { ok: false, msg: 'Cannot hire that role' };
    const office = this.objs('office')[0]; if (!office) return { ok: false, msg: 'Staff need an office to work from' };
    if (!s.creative && s.cash < R.wage * 7) { this.emit('refuse'); return { ok: false, msg: `Keep at least a week of wages ($${(R.wage * 7).toLocaleString()}) in cash before hiring` }; }
    const st = { id: this.id(), role: a.role, name: this.pick(NAMES_FIRST), wage: R.wage, hired: s.t };
    s.staff.push(st); this.spawnStaffAgent(st);
    this.emit('hire', { role: a.role }); return { ok: true, msg: `Hired ${st.name} (${R.name}) - $${R.wage}/day` };
  }
  act_fire(a) {
    const s = this.s, st = s.staff.find((x) => x.id === a.id); if (!st || st.role === 'owner') return { ok: false };
    const ag = s.agents.find((g) => g.sid === st.id);
    if (ag) { this.releaseTask(ag); if (ag.cart) this.dropCart(ag); this.leaveElevator(ag); s.agents = s.agents.filter((g) => g !== ag); }
    s.staff = s.staff.filter((x) => x !== st); return { ok: true, msg: `${st.name} let go` };
  }
  act_ownerTask(a) { // player assigns a task to the Owner
    const s = this.s, t = s.tasks.find((x) => x.id === a.task); if (!t) return { ok: false, msg: 'Task gone' };
    const owner = s.staff.find((x) => x.role === 'owner'); const ag = owner && s.agents.find((g) => g.sid === owner.id);
    if (!ag) { this.emit('refuse'); return { ok: false, msg: 'The Owner needs an operating office first - call a vendor instead' }; }
    if (t.vendor) return { ok: false, msg: 'A vendor is already booked for this' };
    if (!ROLES.owner.can.includes(t.need)) return { ok: false, msg: 'The Owner cannot do this work - it needs a Tech or vendor' };
    if (t.assigned && t.assigned !== owner.id) return { ok: false, msg: 'Already assigned to someone else' };
    if (ag.task === t.id) return { ok: false, msg: 'Owner is already on it' };
    if (ag.task || (ag.queue && ag.queue.length)) { ag.queue = ag.queue || []; if (!ag.queue.includes(t.id)) ag.queue.push(t.id); t.assigned = owner.id; t.queued = true; this.emit('task_assigned'); return { ok: true, msg: 'Owner is busy - task queued' }; }
    t.unreachable = null;
    if (!this.startTask(ag, t)) return { ok: false, msg: 'The Owner has no walkable route to that spot' };
    this.emit('task_assigned');
    return { ok: true, msg: 'Owner is on the way' };
  }
  act_ownerMakeReady(a) { const t = this.s.tasks.find((x) => x.type === 'makeready' && x.obj === a.unit); if (!t) return { ok: false, msg: 'No make-ready needed' }; return this.act_ownerTask({ task: t.id }); }
  act_taskPri(a) { const t = this.s.tasks.find((x) => x.id === a.task); if (t) t.pri = a.pri; return { ok: true }; }
  act_callVendor(a) {
    const s = this.s, t = s.tasks.find((x) => x.id === a.task); if (!t) return { ok: false };
    if (t.vendor) return { ok: false, msg: 'A vendor is already booked' };
    const cost = t.need === 'repair_complex' ? 650 : 250;
    if (!s.creative && s.cash < cost) return { ok: false, msg: 'Not enough cash' };
    for (const ag of s.agents) { if (ag.task === t.id) { if (ag.cart) this.dropCart(ag); ag.task = null; ag.st = 'idle'; } if (ag.queue) ag.queue = ag.queue.filter((x) => x !== t.id); }
    if (!s.creative) this.money(-cost, 'service', 'Vendor service: ' + t.label);
    const pri = (s.coTier || 1) >= 2; t.vendor = s.t + (pri ? 300 : 600); t.assigned = 'vendor'; this.emit('task_assigned');
    return { ok: true, msg: `Vendor booked (~${pri ? 5 : 10} hours) - $${cost}` };
  }
  act_buyCarts(a) {
    const s = this.s, c = s.objects[a.corral]; if (!c || c.cstate !== 'operating') return { ok: false, msg: 'Corral not ready' };
    const n = clamp(Math.floor(Number(a.n) || 1), 1, 50), cost = n * CART_COST;
    if (!s.creative && s.cash < cost) return { ok: false, msg: 'Not enough cash' };
    if (!s.creative) this.money(-cost, 'capex', `${n} cart${n > 1 ? 's' : ''}`);
    for (let k = 0; k < n; k++) s.carts.push({ id: this.id(), st: 'corral', corral: c.id, home: c.id, f: c.f || 0, x: c.x, y: c.y, cond: 1, uses: 0 });
    this.emit('carts_bought', { n }); return { ok: true, msg: `${n} cart${n > 1 ? 's' : ''} delivered to ${c.name}` };
  }
  act_corralTarget(a) { const c = this.s.objects[a.corral]; if (c) c.target = clamp(a.v, 0, 20); return { ok: true }; }
  act_policy(a) { this.s.policies[a.key] = a.v; return { ok: true }; }
  act_convo(a) {
    const s = this.s, c = s.convos.find((x) => x.id === a.id); if (!c) return { ok: false };
    s.convos = s.convos.filter((x) => x !== c);
    const act = c.actions[a.i]; if (act && act.action) return this.dispatch(act.action);
    return { ok: true };
  }
  renovateOptions(u) { // what a vacant unit can be turned into (after the tutorial)
    const s = this.s, out = [];
    if (!u || u.type !== 'unit' || u.cstate !== 'operating' || u.lease || u.commercial === 'reserved' || s.scenario && s.scenario.noReno || (s.tut && s.tut.on)) return out;
    if (u.access === 'interior' && u.env === 'std') {
      const hv = this.D.hvac[this.D.shellAt[this.idx(u.x, u.y)]], need = SIZES[u.size].sqft / 25;
      out.push({ kind: 'climate', label: 'Convert to climate', cost: 300 + SIZES[u.size].sqft * 6, ok: !!hv && hv.cap - hv.load >= need, why: !hv ? 'Needs an HVAC plant serving this building' : 'HVAC is at capacity; add another plant' });
    }
    if (u.access === 'drive' && u.size === '10x10') out.push({ kind: 'split', label: 'Split into two 5x10', cost: 450, ok: true });
    return out;
  }
  act_renovate(a) {
    const s = this.s, u = s.objects[a.unit]; this.ensure();
    const op = this.renovateOptions(u).find((x) => x.kind === a.kind); if (!op) return { ok: false, msg: 'Only vacant units can be renovated' };
    if (!op.ok) return { ok: false, msg: op.why };
    if (!s.creative && s.cash < op.cost) return { ok: false, msg: 'Not enough cash' };
    if (!s.creative) this.money(-op.cost, 'capex', `${op.label} - ${u.name}`);
    s.tasks = s.tasks.filter((t) => !(t.obj === u.id && t.type === 'makeready'));
    const ready = (o) => { o.commercial = 'unready'; o.vacatedAt = s.t; this.addTask({ type: 'makeready', need: 'makeready', obj: o.id, label: `Make-ready ${o.name}`, work: WORK.makeready }); };
    if (a.kind === 'climate') { u.env = 'climate'; ready(u); }
    else {
      const dx = u.dir && u.dir[0] !== 0; const parts = dx ? [{ x: u.x, y: u.y, w: 2, h: 1 }, { x: u.x, y: u.y + 1, w: 2, h: 1 }] : [{ x: u.x, y: u.y, w: 1, h: 2 }, { x: u.x + 1, y: u.y, w: 1, h: 2 }];
      delete s.objects[u.id];
      parts.forEach((p, k) => { const o = { ...u, ...p, id: this.id(), size: '5x10', lease: null }; if (k) { const key = 'drive'; const base = 100, n = s.unitNo[key]++ - base - 1; o.num = base + Math.floor(n / 99) * 1000 + (n % 99) + 1; o.name = 'Unit ' + o.num; } s.objects[o.id] = o; ready(o); });
    }
    this.markDirty(); this.emit('renovated', { unit: u.id, kind: a.kind });
    return { ok: true, msg: `${op.label}: done. Make-ready queued.` };
  }
  act_coTier(a) { const s = this.s; const was = s.coTier || 1; s.coTier = a.tier; if (a.tier > was) this.emit('tier_up', { tier: a.tier }); return { ok: true }; }
  act_tutFlag(a) { this.s.tut.flags[a.flag] = true; if (this.s.lesson) this.s.lesson.flags[a.flag] = true; return { ok: true }; }
  act_lesson(a) { // optional lessons after graduation (tutorial.js LESSONS)
    const s = this.s;
    if (a.op === 'start') { if (s.tut && s.tut.on) return { ok: false, msg: 'Finish the tutorial first' }; s.lesson = { id: a.id, idMark: s.nextId, built: [], flags: {}, entered: false }; if (s.lessonOffer === a.id) s.lessonOffer = null; return { ok: true }; }
    if (a.op === 'end') { s.lesson = null; return { ok: true }; }
    if (a.op === 'dismiss') { s.lessonsSeen = s.lessonsSeen || {}; s.lessonsSeen[a.id] = this.day; if (s.lessonOffer === a.id) s.lessonOffer = null; return { ok: true }; }
    return { ok: false };
  }
  poll() { this.ensure(); if (this.onTick) this.onTick(this); if (this.dirty) this.rebuild(); }
  act_tutSkip() { this.s.tut.on = false; this.s.tut.done = true; this.emit('tut_skip'); return { ok: true }; }
  milestone(k) { if (!this.s.milestones[k]) { this.s.milestones[k] = this.s.t; this.emit('milestone', { k }); } }

  // ============================================================ TICK
  step() { // one game minute
    const s = this.s; this.ensure();
    s.t++;
    const mod = this.mod;
    if (mod === 0) this.newDay();
    this.auctionTick();
    if (mod % 5 === 0) this.convoTick();
    // construction
    for (const ord of s.orders) if (ord.st === 'construction') {
      if (ord.waitShell && !s.objects[ord.waitShell]) { this.act_cancelOrder({ id: ord.id, cascade: true }); continue; }
      if (ord.waitShell && s.objects[ord.waitShell] && s.objects[ord.waitShell].cstate === 'construction') { ord.waiting = true; continue; }
      ord.waiting = false;
      ord.prog = Math.min(1, ord.prog + 1 / ord.dur);
      if (ord.prog >= 1) this.completeOrder(ord);
    }
    // scheduled visits
    if (s.visits.length) {
      const due = s.visits.filter((v) => v.t <= s.t); if (due.length) {
        s.visits = s.visits.filter((v) => v.t > s.t);
        for (const v of due) this.startVisit(v);
      }
    }
    this.updateGate();
    for (const el of this.objs('elevator')) this.updateElevator(el);
    for (const ag of [...s.agents]) { if (ag.kind === 'cust') this.updateCustomer(ag); else this.updateStaff(ag); }
    if (mod % 30 === 0) this.generateTasks();
    if (mod % 10 === 0) this.serveOffice();
    if (mod % 60 === 20) this.managerTick();
    for (const t of s.tasks) if (t.vendor && s.t >= t.vendor) this.finishTask(t, null);
    // tutorial hooks run in tutorial module via sim.onTick
    if (this.onTick) this.onTick(this);
    if (this.dirty) this.rebuild();
  }
  newDay() {
    const s = this.s, day = this.day;
    // close out yesterday
    s.days.push(s.today); if (s.days.length > 90) s.days.shift();
    s.today = blankDay(day);
    // operating costs
    const ox = this.dailyOpex();
    this.money(-ox.total, 'opex', 'Daily operating cost');
    const pay = s.staff.reduce((a, st) => a + st.wage, 0); if (pay) this.money(-pay, 'payroll', 'Payroll');
    if (s.loan.bal > 0) { const int = Math.round(s.loan.bal * 0.0004 * 100) / 100; this.money(-int, 'interest', 'Credit line interest'); }
    if (!s.creative) this.cashCheck(ox.total + pay);
    // billing on anniversary days, then the collections ladder (GDD §36)
    for (const L of Object.values(s.leases)) this.billLease(L, day);
    this.debtService(day);
    // tenants whose rent was just raised sometimes ask about it (GDD §26 pricing question)
    { const asked = Object.values(s.leases).filter((L) => L.incT != null && !L.asked && s.t - L.incT < 5 * MIN_PER_DAY && s.tenants[L.tenant]);
      for (const L of asked.slice(0, 2)) { L.asked = true; if (this.rnd() < 0.4) this.pricingConvo(L); } }
    // tenant move-out pressure (accumulated satisfaction, not single trips)
    for (const tn of Object.values(s.tenants)) {
      const L = s.leases[tn.lease]; if (!L || L.status !== 'current' || tn.leaving) continue;
      const u = s.objects[L.unit]; const mk = this.marketRent(u);
      const cpx = this.compPrice(); const hazard = (1 / 320) * (1 + clamp(0.72 - tn.sat, 0, 1) * 5) * (1 + 1.5 * clamp(0.6 - s.exp.access, 0, 0.6) + 0.9 * clamp(0.6 - s.exp.security, 0, 0.6)) /* broken gates and dark lots drive tenants out */ * clamp(L.rent / mk, 0.8, 1.6) ** 2 * (L.incT != null && s.t - L.incT < 60 * MIN_PER_DAY ? 1.5 : 1) * (cpx != null && L.rent / mk > cpx + 0.05 ? 1 + this.compShare() * 2 : 1) * (0.85 + 0.15 * this.season(day));
      if (this.rnd() < hazard) {
        tn.leaving = true; const when = this.randomAccessTime(day + 2); this.schedule({ kind: 'moveout', tenant: tn.id, unit: u.id }, when);
        if (this.rnd() < 0.5) this.postReview(tn, true);
        if (this.rnd() < 0.65) this.moveoutConvo(tn, L, u, L.rent / mk > 1.04);
      }
    }
    // routine access visits
    for (const tn of Object.values(s.tenants)) {
      const L = s.leases[tn.lease]; if (!L || tn.leaving || !s.objects[L.unit] || s.objects[L.unit].commercial !== 'occupied') continue;
      if (s.objects[L.unit].overlock) continue; // overlocked for non-payment: no access visits until the account is current
      if (this.rnd() < 1 / 1.8) this.schedule({ kind: this.rnd() < 0.15 ? 'bigaccess' : 'access', tenant: tn.id, unit: L.unit }, this.randomAccessTime(day));
    }
    this.marketDay(day);
    this.dramaDay(day);
    if (day > 1 && (day - 1) % 30 === 0 && !s.creative && !(s.mode === 'tutorial' && !s.tut.done)) this.monthReport(day);
    if (s.open) this.genProspects(day, 1);
    // equipment wear
    for (const o of Object.values(s.objects)) if (o.cstate === 'operating') {
      const w = { light: 0.006, camera: 0.004, hvac: 0.009, elevator: 0.004, door: o.kind === 'auto' ? 0.004 : 0.001, gate: 0.003, fountain: 0.007 }[o.type];
      if (w) this.wear(o, w * (0.5 + this.rnd()));
    }
    for (const L of this.objs('loading')) { /* none */ }
    for (let i = 0; i < s.ground.length; i++) if (s.ground[i] === G.LOADING) s.dirt[0][i] = Math.min(1, s.dirt[0][i] + 0.006);
    // weather: restrained
    const prev = s.weather; s.weather = this.rnd() < (prev === 'rain' ? 0.45 : 0.12) ? 'rain' : 'fair';
    if (s.weather !== prev) this.emit('weather', { w: s.weather });
    if (s.scenario && s.scenario.status === 'active') this.scenarioCheck(day);
    this.emit('newday', { day });
  }
  // ---------------------------------------------------------------- scenarios (GDD §44): visible goals + fail conditions
  metric(k) {
    const s = this.s, last = s.days.slice(-30);
    switch (k) {
      case 'occ': return this.occupancy().pct;
      case 'rep': return this.reputation();
      case 'upperLeased': return this.objs('unit').filter((u) => (u.f || 0) > 0 && u.lease).length;
      case 'climateLeased': return this.objs('unit').filter((u) => u.env === 'climate' && u.lease).length;
      case 'climateScore': return this.metric('climateLeased') >= 5 ? s.exp.climate : 0; // only counts once climate tenants are actually rating it
      case 'elevWait': { const els = this.objs('elevator').filter((e) => e.cstate === 'operating'); return els.length ? Math.max(...els.map((e) => e.avgWait || 0)) : 99; }
      case 'contrib30': return last.length < 30 ? -1 : last.reduce((a, d) => a + d.rent - d.opex - d.payroll, 0);
      case 'roll': return this.rentRoll();
      case 'cash': return s.cash;
      default: return 0;
    }
  }
  goalMet(g) { const v = this.metric(g.k); return g.cmp === '<' ? v < g.v : v >= g.v; }
  scenarioCheck(day) {
    const s = this.s, sc = s.scenario;
    const f = sc.fail; let failing = false;
    if (f && f.cashBelow != null && s.cash - (s.loan ? s.loan.bal : 0) < f.cashBelow) failing = true;
    sc.badDays = failing ? (sc.badDays || 0) + 1 : 0;
    const allMet = sc.goals.every((g) => this.goalMet(g));
    if (allMet) { sc.status = 'won'; sc.endDay = day; this.emit('scenario_end', { won: true }); this.milestone('scenario_' + sc.id); return; }
    if (f && f.cashDays && sc.badDays >= f.cashDays) { sc.status = 'lost'; sc.endDay = day; sc.why = `Net cash stayed below $${f.cashBelow.toLocaleString()} for ${f.cashDays} days`; this.emit('scenario_end', { won: false }); return; }
    if (day > sc.deadline) { sc.status = 'lost'; sc.endDay = day; sc.why = `Day ${sc.deadline} deadline passed`; this.emit('scenario_end', { won: false }); return; }
    if (failing && sc.badDays === 1) this.emit('cash_warn', { msg: `Scenario risk: net cash below $${f.cashBelow.toLocaleString()} - ${f.cashDays} days of this ends the run` });
  }
  genProspects(day, frac) {
    const s = this.s, M = MARKETS[s.market.id]; const rep = this.reputation();
    const press = this.season(day) * (1 - this.compShare()) * this.reviewFactor() * (this.pressureOn() && M.settled && !s.scenario ? M.settled : 1) * ((s.coTier || 1) >= 4 ? 1.1 : 1) * this.promoFactor();
    for (const sz of Object.keys(M.demand)) {
      const lam = M.demand[sz] * (s.opts && s.opts.demand || 1) * frac * (0.45 + 0.8 * rep) * (s.mode === 'tutorial' && !s.tut.done ? 0.75 : 1) * press;
      let k = 0; const L = Math.exp(-lam); let p = 1; do { k++; p *= this.rnd(); } while (p > L); k--;
      for (let j = 0; j < k; j++) {
        const needsClimate = this.rnd() < (s.opts && s.opts.climateShare != null ? s.opts.climateShare : M.climateShare);
        const online = this.rnd() < 0.4;
        const lo = Math.max(OFFICE_HOURS[0] + 0.5, frac < 1 ? this.hour + 0.3 : 0);
        const t = online ? s.t + 1 + Math.floor(this.rnd() * MIN_PER_DAY * frac) : this.randomTime(day, lo, Math.max(lo + 0.5, OFFICE_HOURS[1] - 1));
        this.schedule({ kind: online ? 'online' : 'prospect', size: sz, climate: needsClimate }, Math.max(s.t + 1, t));
      }
    }
  }
  creditLimit() { return Math.max(8000, Math.round(this.rentRoll() * 4 / 1000) * 1000); }
  cashCheck(burn) { // financial warnings and a recoverable distress path
    const s = this.s; const firstNeg = s.cash < 0 && !s.loan.neg; s.loan.neg = s.cash < 0;
    if (!firstNeg && s.t - s.loan.warnT < 3 * MIN_PER_DAY) return;
    if (s.cash < 0) {
      s.loan.warnT = s.t;
      this.emit('cash_warn', { msg: `Cash is negative (${Math.round(s.cash).toLocaleString()}). New construction and hiring are frozen.` });
      const room = this.creditLimit() - s.loan.bal;
      if (room >= 1000) this.convo({ key: 'loan', who: 'Community Bank', text: `We can open a credit line for your storage business. Up to $${room.toLocaleString()} at about 1.2% per month.`, sev: 'critical',
        actions: [{ label: `Draw $${Math.min(room, Math.max(5000, Math.ceil(-s.cash / 1000) * 1000 + 3000)).toLocaleString()}`, action: { type: 'loan', amt: Math.min(room, Math.max(5000, Math.ceil(-s.cash / 1000) * 1000 + 3000)) } }, { label: 'Not now' }] });
    } else if (burn > 0 && s.cash < burn * 10) {
      s.loan.warnT = s.t;
      this.emit('cash_warn', { msg: `Cash is low: about ${Math.max(0, Math.floor(s.cash / burn))} days of costs left. Consider fewer staff or higher occupancy.` });
    }
  }
  act_loan(a) {
    const s = this.s, amt = Math.floor(Number(a.amt) || 0); const room = this.creditLimit() - s.loan.bal;
    if (amt <= 0) return { ok: false }; if (amt > room) return { ok: false, msg: `Credit limit reached ($${room.toLocaleString()} available)` };
    s.loan.bal += amt; this.money(amt, 'loan', 'Credit line draw'); this.emit('loan'); return { ok: true, msg: `Borrowed $${amt.toLocaleString()}` };
  }
  act_repay(a) {
    const s = this.s, amt = Math.min(s.loan.bal, Math.floor(Number(a.amt) || 0)); if (amt <= 0) return { ok: false, msg: 'Nothing to repay' };
    if (s.cash < amt) return { ok: false, msg: 'Not enough cash' };
    s.loan.bal -= amt; this.money(-amt, 'debt', 'Credit line repayment'); return { ok: true, msg: `Repaid $${amt.toLocaleString()}` };
  }
  dailyOpex() {
    const s = this.s, o = { base: OPEX.base, units: 0, lights: 0, security: 0, doors: 0, elevators: 0, hvac: 0, amenities: 0, utilities: 0 };
    for (const x of Object.values(s.objects)) {
      if (x.cstate !== 'operating') continue;
      if (x.type === 'unit') o.units += OPEX.perUnit;
      else if (x.type === 'light') o.lights += OPEX.light;
      else if (x.type === 'camera') o.security += OPEX.camera;
      else if (x.type === 'gate') o.security += OPEX.gate + OPEX.keypad;
      else if (x.type === 'door') { if (x.kind === 'auto') o.doors += OPEX.doorAuto; if (x.keypad === 'operating') o.security += OPEX.keypad; }
      else if (x.type === 'elevator') o.elevators += OPEX.elevator;
      else if (x.type === 'hvac') o.hvac += OPEX.hvacPlant;
      else if (x.type === 'restroom') o.amenities += OPEX.restroom;
      else if (x.type === 'fountain') o.amenities += OPEX.fountain;
      else if (x.type === 'power') o.utilities += OPEX.power;
    }
    for (const e of Object.values(this.D.hvac)) o.hvac += e.load * OPEX.hvacPerClimateCell;
    if (this.pressureOn()) { o.tax = 4 + 0.25 * this.objs('unit').filter((u) => u.cstate === 'operating').length; const k = this.costIdx() * ((s.coTier || 1) >= 4 ? 0.92 : 1); for (const key of Object.keys(o)) o[key] = Math.round(o[key] * k * 100) / 100; }
    o.total = Object.values(o).reduce((a, b) => a + b, 0);
    o.payroll = s.staff.reduce((a, st) => a + st.wage, 0);
    return o;
  }
  wear(o, amt, key = 'cond') {
    amt *= (this.s.opts && this.s.opts.wear != null ? this.s.opts.wear : 1);
    const before = o[key]; o[key] = Math.max(0, o[key] - amt);
    if (before >= 0.2 && o[key] < 0.2) { this.emit('fault', { obj: o.id, x: o.x, y: o.y, f: o.f || 0, sev: o.type === 'elevator' || o.type === 'hvac' ? 'critical' : 'attention' }); this.markDirty(); }
    else if (before >= 0.45 && o[key] < 0.45) this.emit('degraded', { obj: o.id, x: o.x, y: o.y, f: o.f || 0 });
  }
  randomTime(day, h0, h1) { return (day - 1) * MIN_PER_DAY + Math.floor((h0 + this.rnd() * (h1 - h0)) * 60); }
  randomAccessTime(day) { return this.randomTime(day, ACCESS_HOURS[0] + 0.5, ACCESS_HOURS[1] - 1.5); }
  schedule(v, t) { this.s.visits.push({ ...v, t: Math.max(this.s.t + 1, t) }); }
  marketRent(u) { const M = MARKETS[this.s.market.id]; return M.rent[u.size] * (u.env === 'climate' ? M.climatePremium : 1) * this.rentIdx(); }
  askFor(u) { return this.s.market.ask[productKey(u.size, u.env)]; }
  reputation() { const e = this.s.exp; return (e.access * 1 + e.convenience * 1.3 + e.cleanliness * 0.9 + e.security * 0.9 + e.climate * 0.5 + e.service * 0.7 + e.value * 1.1 + (e.comfort ?? 0.8) * 0.4) / 6.8; }
  // ============================================================ MARKET PRESSURE
  // Competitors, seasons, reviews and rising costs. An ignored property levels off and slips;
  // a well-run one (fair prices, fixed equipment, clean, staffed) keeps pulling ahead.
  // Off in the tutorial (until graduation) and creative mode. Scenarios get seasons, reviews, rising costs and one rival.
  pressureOn() { const s = this.s; return !s.creative && !(s.mode === 'tutorial' && !s.tut.done) && !(s.opts && s.opts.competition === false); }
  costIdx() { return this.pressureOn() ? 1.04 ** ((this.day - 1) / 365) : 1; }
  rentIdx() { return this.pressureOn() ? 1.03 ** ((this.day - 1) / 365) : 1; }
  season(day = this.day) { return this.pressureOn() ? 1 + 0.2 * Math.sin(2 * Math.PI * (day - 80) / 365) : 1; } // moving season peaks in early summer
  seasonName(day = this.day) { const v = Math.sin(2 * Math.PI * (day - 80) / 365); return v > 0.5 ? 'Peak moving season' : v < -0.5 ? 'Winter slowdown' : v > 0 ? 'Busy season building' : 'Shoulder season'; }
  openComps() { return (this.s.mkt.comp || []).filter((c) => this.day >= c.opens); }
  compShare() {
    if (!this.pressureOn()) return 0; const rep = this.reputation(); let sh = 0;
    for (const c of this.openComps()) { const ramp = clamp((this.day - c.opens) / 60, 0, 1); sh += c.strength * (0.4 + 0.6 * ramp) * clamp(1.45 - rep, 0.45, 1.1); }
    return clamp(sh, 0, 0.5);
  }
  compPrice() { const cs = this.openComps(); return cs.length ? Math.min(...cs.map((c) => c.price)) : null; }
  rating() { const r = (this.s.mkt.reviews || []).slice(-25); return r.length < 3 ? null : r.reduce((a, x) => a + x.stars, 0) / r.length; }
  reviewFactor() { const r = this.rating(); return r == null || !this.pressureOn() ? 1 : clamp(0.7 + 0.075 * r, 0.78, 1.08); }
  postReview(tn, leaving) {
    const s = this.s; if (!this.pressureOn()) return;
    const stars = clamp(Math.round(1 + 4 * clamp((tn.sat - 0.35) / 0.55, 0, 1) + (this.rnd() - 0.5)), 1, 5);
    const e = s.exp; const dims = [['security', 'dark, unwatched corners'], ['cleanliness', 'dirty loading area and halls'], ['convenience', 'waiting for carts and the elevator'], ['service', 'slow help at the office'], ['value', 'the rent for what you get'], ['access', 'gate and door problems']];
    const worst = dims.slice().sort((a, b) => e[a[0]] - e[b[0]])[0];
    const text = stars >= 4 ? this.pick(['Clean, easy and well kept.', 'Staff were helpful and the place feels safe.', 'Fair price, no hassles.', 'Easy in and out. Would recommend.'])
      : stars === 3 ? `Fine overall, but ${worst[1]} could be better.` : `Disappointed: ${worst[1]}.${leaving ? ' Moving out.' : ''}`;
    s.mkt.reviews.push({ t: s.t, name: tn.name.split(' ')[0], stars, text, dim: stars <= 3 ? worst[0] : null }); if (s.mkt.reviews.length > 40) s.mkt.reviews.shift();
    this.emit('review', { stars, text, name: tn.name });
  }
  marketDay(day) {
    const s = this.s, M = s.mkt; if (!this.pressureOn()) return;
    if (M.nextComp == null) M.nextComp = day + (s.scenario ? 50 : 45) + Math.floor(this.rnd() * 30);
    if (day >= M.nextComp && M.comp.length < (s.scenario ? 1 : 3)) { // scenarios get one rival mid-run
      const used = new Set(M.comp.map((c) => c.name)); const name = COMP_NAMES.find((n) => !used.has(n)) || 'Another facility';
      const c = { id: this.id(), name, announced: day, opens: day + 30, strength: Math.round((0.16 + this.rnd() * 0.1) * 100) / 100, price: Math.round((0.88 + this.rnd() * 0.06) * 100) / 100, dist: Math.round((1.2 + this.rnd() * 2.3) * 10) / 10 };
      M.comp.push(c); M.nextComp = day + 200 + Math.floor(this.rnd() * 120);
      this.emit('comp_announce', { name: c.name, opens: c.opens, dist: c.dist, price: c.price });
    }
    for (const c of M.comp) if (day === c.opens) this.emit('comp_open', { name: c.name, price: c.price });
    for (const tn of Object.values(s.tenants)) if (!tn.leaving && this.rnd() < 1 / 150) this.postReview(tn, false);
  }
  // ============================================================ STORY EVENTS (Round 14)
  // Rare, readable moments built on existing systems. Each one asks the player for a decision.
  dramaDay(day) {
    const s = this.s; if (!this.pressureOn()) return;
    const D = (s.drama ||= { lastBreak: -99, wars: {} });
    // break-in: dark, unwatched properties get hit more often
    const occ = this.objs('unit').filter((u) => u.lease && s.leases[u.lease] && s.tenants[s.leases[u.lease].tenant]);
    const pBreak = 0.0022 * (1 + 8 * clamp(0.8 - s.exp.security, 0, 0.8));
    if (occ.length && day - D.lastBreak > 20 && this.rnd() < pBreak) {
      const u = occ[Math.floor(this.rnd() * occ.length)], L = s.leases[u.lease], tn = s.tenants[L.tenant];
      D.lastBreak = day; tn.sat = clamp(tn.sat - 0.25, 0, 1); s.exp.security = clamp(s.exp.security - 0.05, 0, 1);
      const loss = Math.round((400 + this.rnd() * 1800) / 50) * 50;
      this.emit('drama', { k: 'breakin', title: `Break-in at Unit ${u.num}`, sub: s.exp.security < 0.65 ? 'Dark, unwatched corners invite thieves. Lights and cameras deter them.' : 'Even well-run properties get hit sometimes.', x: u.x, y: u.y, f: u.f || 0 });
      this.convo({ key: 'bi' + u.id, who: tn.name, obj: u.id, sev: 'critical', ttl: 10 * 60, def: 1, auto: 1,
        text: `Someone cut the lock on Unit ${u.num}. About $${loss.toLocaleString()} of my things are gone. What are you going to do about it?`,
        actions: [{ label: 'Cover their insurance deductible ($250)', action: { type: 'cv', op: 'biCover', tenant: tn.id } }, { label: 'File a police report and apologize', action: { type: 'cv', op: 'biReport', tenant: tn.id } }] });
    }
    // price war: a rival that has been open a few weeks cuts its prices once
    for (const c of this.openComps()) {
      if (D.wars[c.id] || day - c.opens < 20) continue;
      D.wars[c.id] = 'pending'; if (this.rnd() < 0.4) { D.wars[c.id] = 'none'; continue; }
      c.price = Math.round((c.price - 0.06) * 100) / 100; D.wars[c.id] = day;
      this.emit('drama', { k: 'pricewar', title: `${c.name} cut prices`, sub: `They now charge about ${Math.round((1 - c.price) * 100)}% under market. Your move.` });
      this.convo({ key: 'pw' + c.id, who: 'Market watch', sev: 'critical', ttl: 24 * 60, def: 1, auto: 1, comp: c.id,
        text: `${c.name} just dropped its rents to about ${Math.round((1 - c.price) * 100)}% under market. Price shoppers will notice this week.`,
        actions: [{ label: 'Match them: cut asking rents 6%', action: { type: 'cv', op: 'pwMatch', comp: c.id } }, { label: 'Hold your prices', action: { type: 'cv', op: 'pwHold', comp: c.id } }, { label: 'Run a local ad campaign ($600)', action: { type: 'cv', op: 'pwAd', comp: c.id } }] });
    }
  }
  promoFactor() { const m = this.s.mkt; return m && m.promoUntil && this.day <= m.promoUntil ? 1.18 : 1; }
  lostRecent(days = 30) { const d0 = this.day - days; const out = {}; for (const x of this.s.mkt.lostLog) if (x.d > d0) out[x.r] = (out[x.r] || 0) + 1; return out; }
  monthReport(day) {
    const s = this.s, last = s.days.slice(-30); if (last.length < 20) return;
    const sum = (k) => last.reduce((a, d) => a + (d[k] || 0), 0);
    const collected = sum('rent') + sum('anc'), contrib = collected - sum('opex') - sum('payroll') - sum('service');
    const oc = this.occupancy(), roll = this.rentRoll(), rep = this.reputation(), rating = this.rating(), lost = this.lostRecent(30);
    const prev = s.mkt.reports[s.mkt.reports.length - 1];
    const sug = [];
    const lostN = (k) => lost[k] || 0;
    const sizeLost = {}; for (const x of s.mkt.lostLog) if (x.d > day - 30 && (x.r === 'noSize' || x.r === 'noReady')) sizeLost[x.sz] = (sizeLost[x.sz] || 0) + 1;
    const topSize = Object.entries(sizeLost).sort((a, b) => b[1] - a[1])[0];
    if (topSize && topSize[1] >= 3) sug.push({ w: topSize[1] * 3, k: 'build', text: `${topSize[1]} shoppers wanted a ${topSize[0]} and found none available. Build more ${topSize[0]} units or turn vacant ones over faster.` });
    if (lostN('noClimate') >= 2) sug.push({ w: lostN('noClimate') * 3, k: 'climate', text: `${lostN('noClimate')} shoppers needed climate control. An HVAC plant plus climate units would capture them.` });
    const cp = this.compPrice();
    if (lostN('price') + lostN('competitor') >= 3) sug.push({ w: (lostN('price') + lostN('competitor')) * 2.5, k: 'price', text: `${lostN('price') + lostN('competitor')} shoppers left over price${cp ? `; ${this.openComps()[0].name} charges about ${Math.round((1 - cp) * 100)}% under market` : ''}. Trim asking rents in Business, or win on quality.` });
    const waiting = s.tasks.filter((t) => !t.assigned).length;
    if (waiting >= 3) sug.push({ w: waiting * 2, k: 'staff', text: `${waiting} jobs are waiting in Operate. Hire a Porter or Tech, or call vendors, before customers notice.` });
    const dims = [['security', 'Security is weak. Add lights or cameras where the Security overlay is dark.'], ['cleanliness', 'Cleanliness is slipping. A Porter keeps loading areas and halls clean.'], ['convenience', 'Interior convenience is low. Check cart stock and elevator waits.'], ['access', 'Access problems (gate, doors). Repair worn equipment.']];
    const gateDown = Object.values(s.objects).some((o) => o.type === 'gate' && o.cstate === 'operating' && o.cond < 0.45);
    for (const [k, t] of dims) if (s.exp[k] < 0.62 && !(k === 'access' && gateDown)) sug.push({ w: (0.62 - s.exp[k]) * 40, k, text: t });
    if (rating != null && rating < 3.6) { const ds = {}; for (const r of s.mkt.reviews.slice(-25)) if (r.dim) ds[r.dim] = (ds[r.dim] || 0) + 1; const top = Object.entries(ds).sort((a, b) => b[1] - a[1])[0]; sug.push({ w: (3.6 - rating) * 8, k: 'reviews', text: `Reviews average ${rating.toFixed(1)} stars${top ? `, mostly about ${top[0]}` : ''}. Online shoppers read them.` }); }
    const legacy = Object.values(s.leases).filter((L) => s.objects[L.unit] && L.rent < 0.9 * this.marketRent(s.objects[L.unit]) && L.status === 'current');
    if (legacy.length >= 3) { const gain = Math.round(legacy.reduce((a, L) => a + this.marketRent(s.objects[L.unit]) * 0.97 - L.rent, 0)); sug.push({ w: legacy.length * 1.5, k: 'rent', text: `${legacy.length} tenants pay well under market. A rent review could add about $${gain.toLocaleString()}/mo (some may move out).` }); }
    const behind = Object.values(s.leases).filter((L) => ['delinquent', 'lien', 'notice'].includes(L.status)).length;
    if (behind >= 2) sug.push({ w: behind * 2, k: 'collect', text: `${behind} accounts are seriously behind. Work them in Business → Collections.` });
    const broken = Object.values(s.objects).filter((o) => o.cstate === 'operating' && o.cond < 0.45 && (['light', 'camera', 'hvac', 'elevator', 'gate', 'fountain'].includes(o.type) || (o.type === 'door' && o.kind === 'auto')));
    if (broken.length) sug.push({ w: 6 + broken.length * 3 + (broken.some((o) => o.type === 'gate') ? 10 : 0), k: 'repair', text: `${broken.length} piece${broken.length > 1 ? 's' : ''} of equipment ${broken.length > 1 ? 'need' : 'needs'} repair${broken.some((o) => o.type === 'gate') ? ', including the gate. Tenants who cannot get in move out' : ''}. Repairs don't happen on their own: tap the wrench pins, or call a vendor in Operate.` });
    if (M_open_comps(this) && !sug.length) sug.push({ w: 1, k: 'comp', text: 'A competitor is open nearby. Keep quality high: strong reputation limits how many shoppers they take.' });
    sug.sort((a, b) => b.w - a.w);
    const Ls = Object.values(s.leases).filter((L) => s.objects[L.unit]); const priceR = Ls.length ? Ls.reduce((a, L) => a + L.rent / this.marketRent(s.objects[L.unit]), 0) / Ls.length : 1;
    const ref = s.mkt.reports.length >= 3 ? s.mkt.reports[s.mkt.reports.length - 3].roll : null; const growth = ref ? roll / Math.max(1, ref) - 1 : 0;
    // Grade = how well the property is run AND whether it is growing, not just whether it is full.
    const eq = Object.values(s.objects).filter((o) => o.cstate === 'operating' && (['light', 'camera', 'hvac', 'elevator', 'gate', 'fountain'].includes(o.type) || (o.type === 'door' && o.kind === 'auto')));
    const eqOk = eq.length ? eq.filter((o) => o.cond >= 0.45).length / eq.length : 1;
    const stale = s.tasks.filter((t) => !t.assigned && !t.vendor && s.t - t.created > 2 * MIN_PER_DAY).length;
    const upkeep = clamp(eqOk * 10 - Math.min(6, stale * 1.5), 0, 10);
    const growPts = clamp(4 + growth * 80, 0, 15);
    const score = (oc.pct * 20 + clamp(contrib / Math.max(1, roll), 0, 0.7) / 0.7 * 20 + rep * 20 + (rating != null ? (rating - 1) / 4 * 10 : 7) + clamp((priceR - 0.8) / 0.2, 0, 1) * 10 + upkeep + growPts) * 100 / 105;
    const grade = score >= 88 ? 'A' : score >= 76 ? 'B' : score >= 64 ? 'C' : score >= 52 ? 'D' : 'F';
    const R = { day, month: s.mkt.reports.length + 1, grade, score: Math.round(score), priceR, growth, upkeep: Math.round(upkeep), growPts: Math.round(growPts), stale, eqOk, occ: oc.pct, occN: oc.occ, units: oc.n, roll, rollPrev: prev ? prev.roll : null, collected, contrib, rep, repPrev: prev ? prev.rep : null, rating, leases: sum('leases'), moveouts: sum('moveouts'), lost, sug: sug.slice(0, 3).map((x) => x.text), season: this.seasonName(day), comps: this.openComps().map((c) => c.name) };
    s.mkt.reports.push(R); if (s.mkt.reports.length > 12) s.mkt.reports.shift();
    this.emit('report', { month: R.month, grade });
  }
  // ============================================================ COLLECTIONS (GDD §36)
  // Current -> Past Due -> Delinquent (overlocked) -> Lien eligible -> Lien notice -> Auction / clean-out.
  // The player sets policy and handles exceptions; the ladder runs itself.
  stageOf(L) { return L.status === 'current' ? 'Current' : { pastdue: 'Past due', plan: 'Payment plan', delinquent: 'Delinquent', lien: 'Lien eligible', notice: 'Lien notice', auction: 'Auction scheduled' }[L.status] || 'Past due'; }
  billLease(L, day) {
    const s = this.s, u = s.objects[L.unit]; if (!u) return;
    if (L.status === 'current') {
      if (day < L.nextBill) return;
      L.nextBill += BILLING_CYCLE_DAYS;
      if (this.rnd() < 0.955) { this.money(L.rent, 'rent', `Rent - Unit ${u.num}`); return; }
      L.status = 'pastdue'; L.balance = L.rent; L.fees = 0; L.dueSince = day; L.feeDone = false;
      this.emit('pastdue', { unit: u.id }); return;
    }
    if (day >= L.nextBill && L.status !== 'auction') { L.balance += L.rent; L.nextBill += BILLING_CYCLE_DAYS; }
    if (L.status === 'auction') return; // waiting for auction day
    const late = day - L.dueSince;
    // does the tenant pay today?
    if (L.status === 'plan') {
      if (day >= L.planDue) { if (this.rnd() < 0.8) return this.payUp(L, 'Payment plan completed'); L.status = 'delinquent'; this.emit('plan_broken', { unit: u.id }); }
      return;
    }
    const pPay = { pastdue: 0.2, delinquent: 0.05, lien: 0.04, notice: 0.035 }[L.status] ?? 0.05;
    if (this.rnd() < pPay) return this.payUp(L, L.status === 'notice' ? 'Paid after lien notice' : 'Past-due rent paid');
    if (!L.feeDone && late >= 5 && s.policies.lateFee > 0) { L.feeDone = true; L.fees = (L.fees || 0) + s.policies.lateFee; }
    if (L.status === 'pastdue' && late >= 15) {
      L.status = 'delinquent';
      if (s.policies.overlock) { u.overlock = true; this.emit('overlock', { unit: u.id, x: u.x, y: u.y, f: u.f || 0 }); }
    } else if (L.status === 'delinquent' && late >= 30) {
      L.status = 'lien'; L.lienDay = day; this.emit('lien_eligible', { unit: u.id });
      if (s.policies.autoNotice || this.hasManager()) { this.startNotice(L); if (this.hasManager()) this.mgr(`Sent a lien notice for Unit ${u.num} (${this.fmtMoney(this.owed(L))} owed)`); }
      else this.convo({ key: 'lien' + L.id, who: 'Collections', sev: 'critical', obj: u.id, ttl: 3 * MIN_PER_DAY, def: 0,
        text: `Unit ${u.num} is ${late} days past due and owes ${this.fmtMoney(this.owed(L))}. The account is now lien-eligible.`,
        actions: [{ label: 'Send lien notice', action: { type: 'collect', op: 'notice', lease: L.id } }, { label: 'Offer a payment plan', action: { type: 'collect', op: 'plan', lease: L.id } }, { label: 'Waive fees, wait 14 days', action: { type: 'collect', op: 'waive', lease: L.id } }] });
    } else if (L.status === 'lien' && day - (L.lienDay || day) >= 14) this.startNotice(L); // standard procedure if nobody decides
    else if (L.status === 'notice' && day >= L.noticeUntil) this.scheduleAuction(L);
  }
  owed(L) { return Math.round((L.balance || 0) + (L.fees || 0)); }
  fmtMoney(v) { return '$' + Math.round(v).toLocaleString(); }
  payUp(L, why) {
    const s = this.s, u = s.objects[L.unit], amt = this.owed(L);
    if (amt > 0) { this.money(L.balance, 'rent', `${why} - Unit ${u.num}`); if (L.fees) this.money(L.fees, 'anc', `Late fees - Unit ${u.num}`); }
    this.dropConvo('lien' + L.id); L.status = 'current'; L.balance = 0; L.fees = 0; L.feeDone = false; L.noticeUntil = null; L.planDue = null; u.overlock = false;
    const tn = s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat - 0.04, 0, 1);
    this.emit('paid_up', { unit: u.id, amt });
  }
  dropConvo(key) { this.s.convos = this.s.convos.filter((c) => c.key !== key); }
  startNotice(L) { this.dropConvo('lien' + L.id); const u = this.s.objects[L.unit]; L.status = 'notice'; L.noticeUntil = this.day + 14; this.emit('lien_notice', { unit: u.id }); }
  nextAuctionDay(minDay) { let d = minDay; while (d % 7 !== 6) d++; return d; } // Saturdays
  scheduleAuction(L) {
    const s = this.s, u = s.objects[L.unit]; L.status = 'auction'; this.dropConvo('lien' + L.id);
    if (!s.auction || s.auction.done) s.auction = { day: this.nextAuctionDay(this.day + 2), done: false };
    L.auctionDay = s.auction.day; this.emit('auction_scheduled', { unit: u.id, day: s.auction.day });
  }
  auctionTick() { // runs every minute; cheap
    const s = this.s, A = s.auction; if (!A || A.done || this.day !== A.day) return;
    const m = this.mod;
    if (m === 10 * 60 && !A.live) {
      const lots = Object.values(s.leases).filter((L) => L.status === 'auction');
      if (!lots.length) { A.done = true; return; }
      A.live = { until: s.t + 80, lots: lots.map((L) => L.id) };
      if (s.policies.resolution === 'auction') this.emit('auction_start', { units: lots.map((L) => L.unit) });
    }
    if (A.live && s.t >= A.live.until) {
      let total = 0; const sold = [];
      for (const id of A.live.lots) {
        const L = s.leases[id]; if (!L || L.status !== 'auction') continue; const u = s.objects[L.unit];
        if (s.policies.resolution === 'auction') {
          // what's inside is a surprise: most lots are ordinary, some are junk, a few start a bidding war
          const roll = this.rnd(); const tier = roll < 0.08 ? 'treasure' : roll < 0.22 ? 'junk' : 'normal'; const war = tier === 'treasure';
          const what = tier === 'treasure' ? this.pick(['a restored 1968 motorcycle', 'a vintage arcade cabinet', 'sealed comic book boxes', 'a coin collection', 'a classic guitar and amp', 'antique oak furniture'])
            : tier === 'junk' ? this.pick(['old mattresses and broken chairs', 'boxes of tax papers', 'a sofa nobody wants', 'mystery bags of clothes']) : this.pick(['household furniture', 'tools and a lawn mower', 'boxed kitchenware', 'sports gear and bikes', 'holiday decorations']);
          const price = Math.round(L.rent * (war ? 4 + this.rnd() * 5 : tier === 'junk' ? 0.15 + this.rnd() * 0.3 : 0.5 + this.rnd() * 2) / 5) * 5;
          if (tier === 'junk') this.money(-80, 'service', `Haul-away after auction - Unit ${u.num}`);
          const credit = Math.min(price, this.owed(L)); total += price;
          this.money(price, 'anc', `Lien auction - Unit ${u.num}${war ? ' (bidding war)' : ''}`);
          sold.push({ unit: u.id, num: u.num, price, war, what, tier, owed: this.owed(L), credit });
          this.emit('auction_sold', { unit: u.id, price, war, what, tier, x: u.x, y: u.y, f: u.f || 0 });
        } else {
          this.money(-120, 'service', `Clean-out and donation - Unit ${u.num}`);
          sold.push({ unit: u.id, num: u.num, price: 0 });
        }
        this.endLease(L, 'auction');
      }
      A.done = true; A.live = null; A.result = { total, sold, mode: s.policies.resolution };
      const left = Object.values(s.leases).filter((L) => L.status === 'auction'); // lots that arrived during the sale roll to the next one
      if (left.length) { const nx = { day: this.nextAuctionDay(this.day + 2), done: false, prev: A.result }; s.auction = nx; for (const L of left) L.auctionDay = nx.day; }
      this.milestone('first_auction');
      this.emit('auction_end', { total, n: sold.length, mode: s.policies.resolution });
    }
  }
  act_collect(a) {
    const s = this.s, L = s.leases[a.lease]; if (!L) return { ok: false, msg: 'That account has closed' };
    const u = s.objects[L.unit], tn = s.tenants[L.tenant];
    switch (a.op) {
      case 'notice': if (!['delinquent', 'lien', 'pastdue'].includes(L.status)) return { ok: false, msg: 'Not eligible for a lien notice yet' };
        if (this.day - L.dueSince < 30) return { ok: false, msg: 'A lien notice needs 30 days of non-payment' };
        this.startNotice(L); return { ok: true, msg: `Lien notice sent for Unit ${u.num}. Auction in about 2 weeks if unpaid.` };
      case 'plan': {
        if (!['pastdue', 'delinquent', 'lien', 'notice'].includes(L.status)) return { ok: false, msg: 'No plan needed' };
        if (L.planTried) return { ok: false, msg: 'This tenant already had a payment-plan offer' };
        L.planTried = true;
        if (this.rnd() < 0.72) {
          const half = Math.round(L.balance / 2); this.money(half, 'rent', `Payment plan - Unit ${u.num}`); L.balance -= half; L.fees = 0;
          L.status = 'plan'; L.planDue = this.day + 14; u.overlock = false; if (tn) tn.sat = clamp(tn.sat + 0.05, 0, 1);
          this.emit('plan_ok', { unit: u.id }); return { ok: true, msg: `${tn ? tn.name : 'Tenant'} paid $${half} now; the rest is due in 14 days. Fees waived, overlock removed.` };
        }
        return { ok: false, msg: `${tn ? tn.name : 'The tenant'} didn't respond to the payment-plan offer.` };
      }
      case 'waive': L.fees = 0; L.dueSince += 14; if (L.status === 'lien') L.status = 'delinquent'; return { ok: true, msg: `Fees waived for Unit ${u.num}. Lien clock pushed back 14 days.` };
      case 'unlock': u.overlock = false; return { ok: true, msg: `Overlock removed from Unit ${u.num}` };
      case 'hold': if (L.status !== 'auction') return { ok: false }; L.status = 'notice'; L.noticeUntil = this.day + 14; return { ok: true, msg: `Unit ${u.num} pulled from the auction for 14 days` };
    }
    return { ok: false };
  }

  // ============================================================ FINANCING (GDD §37)
  // Term loans: principal, rate, term, monthly payment, approval limit. Nothing more.
  loanTerms() { return { rate: (this.s.coTier || 1) >= 3 ? 0.065 : 0.075, months: 60 }; }
  loanPmt(P, rate = 0.075, n = 60) { const r = rate / 12; return Math.round(P * r / (1 - Math.pow(1 + r, -n)) * 100) / 100; }
  loanLimit() {
    const s = this.s; if (s.creative) return 0;
    if (s.mode === 'tutorial' && !s.tut.done) return 0;
    const roll = this.rentRoll(); const pay = s.debt.reduce((a, d) => a + d.pmt, 0);
    const room = roll * 0.45 - pay; if (room <= 0) return 0;
    const { rate, months } = this.loanTerms(); const r = rate / 12;
    const pv = room * (1 - Math.pow(1 + r, -months)) / r;
    return Math.max(0, Math.min(250000, Math.floor(pv / 5000) * 5000));
  }
  act_borrow(a) {
    const s = this.s, amt = Math.floor(Number(a.amt) || 0), lim = this.loanLimit();
    if (s.mode === 'tutorial' && !s.tut.done) return { ok: false, msg: 'Term loans open after the tutorial' };
    if (amt < 5000) return { ok: false, msg: 'Minimum term loan is $5,000' };
    if (amt > lim) { this.emit('refuse'); return { ok: false, msg: lim ? `The bank approves up to $${lim.toLocaleString()} at this rent roll` : 'Rent roll is too small to support a term loan' }; }
    const { rate, months } = this.loanTerms(); const pmt = this.loanPmt(amt, rate, months);
    s.debt.push({ id: this.id(), orig: amt, bal: amt, rate, months, pmt, next: this.day + BILLING_CYCLE_DAYS, start: this.day, paid: 0 });
    this.money(amt, 'loan', `Term loan (${months} mo @ ${(rate * 100).toFixed(1)}%)`);
    this.milestone('first_loan'); this.emit('loan');
    return { ok: true, msg: `Borrowed $${amt.toLocaleString()} · $${Math.round(pmt).toLocaleString()}/mo for ${months} months` };
  }
  act_payoff(a) {
    const s = this.s, d = s.debt.find((x) => x.id === a.id); if (!d) return { ok: false };
    const amt = Math.round(d.bal * 100) / 100; if (!s.creative && s.cash < amt) { this.emit('refuse'); return { ok: false, msg: 'Not enough cash to pay it off' }; }
    this.money(-amt, 'debt', 'Term loan payoff'); s.debt = s.debt.filter((x) => x !== d); this.emit('loan_paid');
    return { ok: true, msg: 'Loan paid off' };
  }
  debtService(day) {
    const s = this.s;
    for (const d of [...s.debt]) {
      if (day < d.next) continue; d.next += BILLING_CYCLE_DAYS;
      const int = Math.round(d.bal * d.rate / 12 * 100) / 100, prin = Math.min(d.bal, Math.round((d.pmt - int) * 100) / 100);
      this.money(-int, 'interest', 'Term loan interest'); this.money(-prin, 'debt', 'Term loan principal');
      d.bal = Math.round((d.bal - prin) * 100) / 100; d.paid++;
      if (d.bal <= 0.5) { s.debt = s.debt.filter((x) => x !== d); this.emit('loan_paid'); }
    }
  }

  // ============================================================ CONVERSATIONS (GDD §26)
  // Every answer maps to real state. Routine ones are answered by a Clerk/Manager per policy; unanswered ones expire to a default.
  pricingConvo(L) {
    const s = this.s, u = s.objects[L.unit], tn = s.tenants[L.tenant]; if (!u || !tn || L.prevRent == null) return;
    this.convo({ key: 'rate' + L.id, who: tn.name, obj: u.id, sev: 'attention', ttl: 8 * 60, def: 2, auto: 0,
      text: `Why did my rate change? Unit ${u.num} went from ${this.fmtMoney(L.prevRent)} to ${this.fmtMoney(L.rent)}.`,
      actions: [{ label: 'Explain the market rate', action: { type: 'cv', op: 'rateExplain', lease: L.id } }, { label: `Hold ${this.fmtMoney(L.prevRent)} for 6 months`, action: { type: 'cv', op: 'rateHold', lease: L.id } }, { label: 'Ignore', action: { type: 'cv', op: 'rateIgnore', lease: L.id } }] });
  }
  moveoutConvo(tn, L, u, price) {
    const offer = this.s.policies.retention;
    this.convo({ key: 'mo' + tn.id, who: tn.name, obj: u.id, sev: 'attention', ttl: 10 * 60, def: 1, auto: offer && price ? 0 : 1,
      text: price ? `The rent on Unit ${u.num} is more than I want to pay. I'm moving out. What do I need to do?` : `I'm done with Unit ${u.num}. What do I need to do?`,
      actions: [{ label: `Offer 10% off (${this.fmtMoney(Math.round(L.rent * 0.9))}/mo) to stay`, action: { type: 'cv', op: 'retain', tenant: tn.id } }, { label: 'Explain move-out steps', action: { type: 'cv', op: 'moveoutOk', tenant: tn.id } }] });
  }
  act_cv(a) {
    const s = this.s;
    switch (a.op) {
      case 'biCover': { const tn = s.tenants[a.tenant]; if (s.cash < 250 && !s.creative) return { ok: false, msg: 'Not enough cash' }; this.money(-250, 'service', 'Break-in: covered tenant deductible'); if (tn) tn.sat = clamp(tn.sat + 0.32, 0, 1); return { ok: true, msg: `${tn ? tn.name.split(' ')[0] : 'The tenant'} is grateful and staying.` }; }
      case 'biReport': { const tn = s.tenants[a.tenant]; if (!tn) return { ok: true }; tn.sat = clamp(tn.sat - 0.05, 0, 1);
        if (this.rnd() < 0.35 && !tn.leaving) { const L = s.leases[tn.lease]; if (L) { tn.leaving = true; this.schedule({ kind: 'moveout', tenant: tn.id, unit: L.unit }, this.randomAccessTime(this.day + 3)); } this.postReview(tn, true); return { ok: true, msg: `${tn.name.split(' ')[0]} is moving out after the break-in.` }; }
        return { ok: true, msg: 'Report filed. The tenant is unhappy but staying for now.' }; }
      case 'pwMatch': { for (const k of Object.keys(s.market.ask)) s.market.ask[k] = Math.round(s.market.ask[k] * 0.94); return { ok: true, msg: 'Asking rents cut 6%. Existing tenants keep their rates.' }; }
      case 'pwHold': return { ok: true, msg: 'Holding prices. Expect fewer price shoppers; quality has to win them.' };
      case 'pwAd': { if (s.cash < 600 && !s.creative) return { ok: false, msg: 'Not enough cash' }; this.money(-600, 'service', 'Local ad campaign'); s.mkt.promoUntil = this.day + 45; return { ok: true, msg: 'Ad campaign running for 45 days: more shoppers will visit.' }; }
      case 'rateExplain': { const L = s.leases[a.lease], tn = L && s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat - 0.02, 0, 1); return { ok: true, msg: 'Explained: rates follow the local market. The new rate stands.' }; }
      case 'rateIgnore': { const L = s.leases[a.lease], tn = L && s.tenants[L.tenant]; if (tn) tn.sat = clamp(tn.sat - 0.07, 0, 1); return { ok: true }; }
      case 'rateHold': {
        const L = s.leases[a.lease], tn = L && s.tenants[L.tenant]; if (!L || L.prevRent == null) return { ok: false, msg: 'That lease has changed' };
        const was = L.rent; L.rent = L.prevRent; L.prevRent = null; L.incT = null; L.holdUntil = s.t + 180 * MIN_PER_DAY; if (tn) tn.sat = clamp(tn.sat + 0.08, 0, 1);
        return { ok: true, msg: `Rate held at ${this.fmtMoney(L.rent)} (−${this.fmtMoney(was - L.rent)}/mo). They're grateful.` };
      }
      case 'retain': {
        const tn = s.tenants[a.tenant], L = tn && s.leases[tn.lease]; if (!tn || !L || !tn.leaving) return { ok: false, msg: 'Too late: they have already moved out' };
        if (tn.retainTried) return { ok: false, msg: 'Already made them an offer' }; tn.retainTried = true;
        if (this.rnd() < clamp(0.1 + tn.sat * 0.55, 0.15, 0.7)) {
          L.rent = Math.round(L.rent * 0.9); tn.leaving = false; tn.sat = clamp(tn.sat + 0.1, 0, 1);
          s.visits = s.visits.filter((v) => !(v.kind === 'moveout' && v.tenant === tn.id));
          this.milestone('first_retention'); this.emit('retained', { unit: L.unit });
          return { ok: true, msg: `${tn.name} is staying at ${this.fmtMoney(L.rent)}/mo.` };
        }
        return { ok: false, msg: `${tn.name} thanked you but is still moving out.` };
      }
      case 'moveoutOk': return { ok: true, msg: 'Move-out explained: empty the unit, sweep it, and return the lock.' };
      case 'sizeUp': case 'sizeKeep': {
        const ag = s.agents.find((x) => x.id === a.ag); if (!ag || ag.st !== 'office') return { ok: false, msg: 'The prospect has already left the counter' };
        ag.sizeQ = null; ag.keen = true;
        if (a.op === 'sizeUp') { ag.size = a.size; return { ok: true, msg: `Recommended a ${a.size}. They'll take a look.` }; }
        ag.cramped = true; return { ok: true, msg: 'Told them a 10x10 will do.' };
      }
      case 'vendorFor': { const o = s.objects[a.obj]; if (!o) return { ok: false }; const t = this.ensureRepairTask(o); return this.act_callVendor({ task: t.id }); }
    }
    return { ok: false };
  }
  convoTick() { // every 5 game minutes: staff answer routine conversations; unanswered ones expire to their default
    const s = this.s; if (!s.convos.length) return;
    const h = this.hour, inHours = h >= OFFICE_HOURS[0] && h < OFFICE_HOURS[1];
    const clerk = inHours && s.agents.some((a) => a.kind === 'staff' && a.role === 'clerk' && a.st === 'office');
    const mgr = inHours && this.hasManager();
    for (const c of [...s.convos]) {
      const age = s.t - c.t;
      if (c.auto != null && (clerk || mgr) && age >= 15) {
        const act = c.actions[c.auto]; s.convos = s.convos.filter((x) => x !== c);
        if (act && act.action) { const r = this.dispatch(act.action); this.mgr(`${clerk ? 'Clerk' : 'Manager'} answered ${c.who}: ${act.label}${r && r.msg ? ' - ' + r.msg : ''}`); }
        continue;
      }
      if (c.ttl && age >= c.ttl) {
        s.convos = s.convos.filter((x) => x !== c);
        const act = c.def != null && c.actions[c.def]; if (act && act.action) this.dispatch(act.action);
        this.emit('convo_expired', { who: c.who });
      }
    }
  }
  endLease(L, why) {
    const s = this.s, u = s.objects[L.unit];
    delete s.leases[L.id]; const tn = s.tenants[L.tenant]; if (tn) { delete s.tenants[tn.id]; this.dropConvo('mo' + tn.id); } this.dropConvo('lien' + L.id); this.dropConvo('rate' + L.id);
    u.lease = null; u.commercial = 'unready'; u.vacatedAt = s.t; u.overlock = false;
    { const fc = this.unitFront(u)[0]; if (fc) s.dirt[u.f || 0][this.idx(fc.x, fc.y)] += 0.25; }
    this.addTask({ type: 'makeready', need: 'makeready', obj: u.id, label: why === 'auction' ? `Clean out ${u.name}` : `Make-ready ${u.name}`, work: WORK.makeready * (why === 'auction' ? 2 : 1) });
    s.today.moveouts++;
    this.emit('moveout', { unit: u.id });
  }

  // ============================================================ LEASING
  decideLease(v, ag) {
    const s = this.s, M = MARKETS[s.market.id];
    s.today.prospects++;
    const all = this.objs('unit').filter((u) => u.cstate === 'operating' && !u.blocked && u.size === v.size);
    const ready = all.filter((u) => u.commercial === 'ready');
    let cands = ready.filter((u) => (v.climate ? u.env === 'climate' : u.env === 'std'));
    let settling = false;
    if (!cands.length && v.climate) { cands = ready.filter((u) => u.env === 'std'); settling = true; }
    if (!cands.length && !v.climate) { cands = ready.filter((u) => u.env === 'climate'); }
    const lose = (reason) => { s.lost[reason] = (s.lost[reason] || 0) + 1; s.today.lost++; s.mkt.lostLog.push({ d: this.day, r: reason, sz: v.size }); if (s.mkt.lostLog.length > 200) s.mkt.lostLog.shift(); this.emit('lost', { reason, size: v.size }); if (ag) this.thought(ag, { noSize: `No ${v.size} available.`, noClimate: 'I need climate control.', price: 'Too expensive for me.', convenience: 'Not convenient enough.', shopping: 'I\'ll keep shopping.', competitor: 'The place down the road is cheaper.', reputation: 'The reviews put me off.', noReady: 'Nothing ready to rent today.' }[reason] || 'I\'ll keep shopping.', 'bad'); return null; };
    if (!cands.length) return lose(all.length ? (v.climate ? 'noClimate' : 'noReady') : v.climate && this.objs('unit').some((u) => u.size === v.size) ? 'noClimate' : 'noSize');
    const rep = this.reputation(); const cp = this.compPrice();
    let best = null, bestP = -1;
    for (const u of cands) {
      const ratio = this.askFor(u) / this.marketRent(u) / clamp(0.72 + 0.34 * rep, 0.85, 1.02); // a poorly kept facility has to charge less to sign
      let pPrice = ratio <= 0.9 ? 0.95 : 0.95 * Math.exp(-4.2 * (ratio - 0.9));
      if (v.keen) pPrice = ratio > 1.25 ? pPrice : 0.97;
      const conv = v.keen ? 1 : u.conv * (u.f > 0 ? this.elevatorFactor(u) : 1);
      let p = pPrice * clamp(conv, 0.4, 1) * (v.keen ? 1 : 0.72 + 0.35 * rep) * (settling ? 0.35 : 1) * clamp(0.42 + 1.0 * s.exp.access, 0.42, 1); // shoppers who see a broken gate walk away
      if (cp != null && !v.keen && ratio > cp + 0.04) p *= clamp(1 - (ratio - cp) * 2.2, 0.35, 1);
      if (p > bestP) { bestP = p; best = u; }
    }
    if (this.rnd() < bestP) return this.signLease(best, v);
    const ratio = this.askFor(best) / this.marketRent(best);
    return lose(cp != null && ratio > cp + 0.04 && this.rnd() < 0.6 ? 'competitor' : ratio > 1.08 ? 'price' : best.conv < 0.82 ? 'convenience' : rep < 0.68 ? 'reputation' : 'shopping');
  }
  elevatorFactor(u) { const e = this.objs('elevator').find((e) => this.D.shellAt[this.idx(e.x, e.y)] === this.D.shellAt[this.idx(u.x, u.y)]); if (!e) return 0.5; return e.cond < 0.2 ? 0.55 : clamp(1 - (e.avgWait || 0) / 90, 0.7, 1); }
  signLease(u, v) {
    const s = this.s;
    const tn = { id: this.id(), name: `${this.pick(NAMES_FIRST)} ${this.pick(NAMES_LAST)}`, sat: 0.8, lease: null, since: s.t };
    const L = { id: this.id(), unit: u.id, tenant: tn.id, rent: this.askFor(u), start: this.day, nextBill: this.day + BILLING_CYCLE_DAYS, status: 'current', balance: 0, fees: 0 };
    tn.lease = L.id; s.tenants[tn.id] = tn; s.leases[L.id] = L;
    u.lease = L.id; u.commercial = 'reserved';
    this.money(L.rent, 'rent', `First month - ${u.name}`);
    s.today.leases++;
    if (u.vacatedAt != null) this.milestone('first_lease_after_turnover');
    this.emit('lease', { unit: u.id, x: u.x, y: u.y, f: u.f || 0, rent: L.rent });
    let t = s.t + 60 + Math.floor(this.rnd() * 180);
    const m = t % MIN_PER_DAY; if (m > (ACCESS_HOURS[1] - 1.5) * 60) t += MIN_PER_DAY - m + ACCESS_HOURS[0] * 60 + 60;
    this.schedule({ kind: 'movein', tenant: tn.id, unit: u.id }, t);
    return L;
  }

  // ============================================================ VISITS / AGENTS
  startVisit(v) {
    const s = this.s;
    if (v.kind === 'online') { this.decideLease(v, null); return; }
    const mod = this.mod;
    if (mod < ACCESS_HOURS[0] * 60 || mod > ACCESS_HOURS[1] * 60 - 30) { this.schedule(v, this.randomAccessTime(this.day + 1)); return; }
    if (!this.D.gate) { this.schedule(v, s.t + 240); return; }
    if (v.unit && !s.objects[v.unit]) return;
    if (s.agents.filter((a) => a.kind === 'cust').length > 60) { this.schedule(v, s.t + 30); return; }
    const u = v.unit && s.objects[v.unit];
    const vtype = v.kind === 'movein' || v.kind === 'moveout' ? this.pick(['van', 'box', 'box', 'pickup', 'suv']) : this.pick(['sedan', 'sedan', 'suv', 'suv', 'pickup', 'van']);
    const fromEast = this.rnd() < 0.5; const p = s.parcel;
    const sx = fromEast ? s.W - 1 : 0, sy = fromEast ? p.y1 + 2 : p.y1 + 3;
    const veh = { id: this.id(), type: vtype, x: sx + 0.5, y: sy + 0.5, hx: fromEast ? -1 : 1, hy: 0, path: null, pi: 0, color: this.pick(['#c8ccd0', '#2e3a4a', '#8a2f2f', '#f2f2ee', '#3d5a3f', '#6b7a8f', '#a8834e', '#1e1f22']), parked: null };
    const needCart = u && u.access === 'interior' ? (v.kind === 'movein' || v.kind === 'moveout' ? true : v.kind === 'bigaccess' ? this.rnd() < 0.8 : this.rnd() < 0.25) : false;
    const ag = { id: this.id(), kind: 'cust', vt: v.kind, tenant: v.tenant, unit: v.unit, size: v.size, climate: v.climate, keen: v.keen, veh: veh.id, st: 'arrive', hidden: true, f: 0, x: veh.x, y: veh.y, path: null, pi: 0, wait: 0, needCart, cart: null, carry: false,
      exp: { gate: 0, cart: 0, elev: 0, office: 0, walk: 0, dirt: 0, dirtN: 0, dark: false, noCart: false, door: 0 }, t0: s.t, look: Math.floor(this.rnd() * 1e6) };
    s.vehicles.push(veh); s.agents.push(ag);
    const gx = this.D.gate.x;
    const goal = this.idx(gx, p.y1 + 1);
    const path = this.bfs([this.idx(sx, sy)], (n) => n === goal, (n) => this.vehNbr(n));
    this.setVehPath(veh, path);
    this.emit('arrive', { ag: ag.id });
  }
  setVehPath(veh, path) { veh.path = path; veh.pi = 0; }
  vehAt(id) { return this.s.vehicles.find((v) => v.id === id); }
  moveVeh(veh, speed) { // returns true when path finished
    if (!veh.path || veh.pi >= veh.path.length) return true;
    let rem = speed;
    while (rem > 0 && veh.pi < veh.path.length) {
      const n = veh.path[veh.pi]; const tx = (n % this.s.W) + 0.5, ty = ((n / this.s.W) | 0) + 0.5;
      const dx = tx - veh.x, dy = ty - veh.y, d = Math.hypot(dx, dy);
      if (d <= rem) { veh.x = tx; veh.y = ty; rem -= d; veh.pi++; if (d > 0.01) { veh.hx = dx / d; veh.hy = dy / d; } }
      else { veh.x += dx / d * rem; veh.y += dy / d * rem; veh.hx = dx / d; veh.hy = dy / d; rem = 0; }
    }
    return veh.pi >= veh.path.length;
  }
  // pedestrian movement along node path; handles door waits + elevator hand-off
  moveAgent(ag, speed) {
    if (!ag.path || ag.pi >= ag.path.length) return 'done';
    if (ag.doorWait > 0) { ag.doorWait--; ag.exp.door++; return 'moving'; }
    const s = this.s, WH = s.W * s.H;
    let rem = speed;
    // hallway friction: carts meeting in single-width corridors
    if (ag.cart && ag.f !== undefined) {
      const ci = this.idx(Math.floor(ag.x), Math.floor(ag.y));
      if (this.D.shellAt[ci] && this.isNarrow(ag.f, ci) && s.agents.some((o) => o !== ag && o.cart && !o.hidden && o.f === ag.f && Math.abs(o.x - ag.x) + Math.abs(o.y - ag.y) < 1.3)) { rem *= 0.55; ag.friction = (ag.friction || 0) + 1; }
    }
    while (rem > 0 && ag.pi < ag.path.length) {
      const n = ag.path[ag.pi]; const f = (n / WH) | 0, i = n % WH;
      if (f !== ag.f) { // vertical move -> stairs (walk) or elevator
        if (this.D.stairAt[i] && !this.D.elevAt[i]) {
          if (!ag.climbT) { ag.climbT = 7; this.emit('stairs', { x: i % s.W, y: (i / s.W) | 0 }); }
          ag.climbT--; ag.climbing = { from: ag.f, to: f, k: 1 - ag.climbT / 7 };
          if (ag.climbT <= 0) { ag.climbT = 0; ag.climbing = null; ag.f = f; ag.pi++; if (ag.exp) ag.exp.walk += 5; }
          return 'moving';
        }
        const el = s.objects[this.D.elevAt[i]];
        if (!el) { ag.path = null; return 'blocked'; }
        this.joinElevator(ag, el, f); return 'elevator';
      }
      const tx = (i % s.W) + 0.5, ty = ((i / s.W) | 0) + 0.5;
      const dx = tx - ag.x, dy = ty - ag.y, d = Math.hypot(dx, dy);
      if (d <= rem) {
        // crossing a door edge?
        const pi = this.idx(Math.floor(ag.x), Math.floor(ag.y));
        const key = Math.min(pi, i) + ',' + Math.max(pi, i);
        if (pi !== i && this.D.doorEdge.has(key)) {
          const door = s.objects[this.D.doorEdge.get(key)];
          if (!ag._doorPassed || ag._doorPassed !== key + ag.pi) {
            ag._doorPassed = key + ag.pi;
            let wt = door.kind === 'std' ? (ag.cart ? 4 : 1) : door.kind === 'wide' ? (ag.cart ? 1 : 0) : 0;
            if (door.kind === 'auto' && (door.cond < 0.2 || door.unpowered)) wt = ag.cart ? 6 : 2;
            if (door.keypad === 'operating' && ag.kind === 'cust' && this.D.shellAt[i]) { wt += 1; door.kcond = Math.max(0, (door.kcond ?? 1) - 0.002); }
            if (door.kind === 'auto') this.wear(door, 0.0015);
            this.emit('door', { obj: door.id, kind: door.kind, x: door.x, y: door.y });
            door.openT = s.t;
            if (wt > 0) { ag.doorWait = wt; return 'moving'; }
          }
        }
        ag.x = tx; ag.y = ty; rem -= d; ag.pi++;
        if (d > 0.01) { ag.hx = dx / d; ag.hy = dy / d; }
        const dirtAdd = ag.cart ? 0.0018 : 0.001;
        if (this.D.shellAt[i] || s.ground[i] === G.LOADING) { s.dirt[f][i] = Math.min(1, s.dirt[f][i] + dirtAdd); ag.exp.dirt += s.dirt[f][i]; ag.exp.dirtN++; }
        if (ag.kind === 'cust') { ag.exp.walk++; if (this.D.shellAt[i] && this.D.lit[f][i] < 0.4) ag.exp.dark = true; }
      } else { ag.x += dx / d * rem; ag.y += dy / d * rem; ag.hx = dx / d; ag.hy = dy / d; rem = 0; }
    }
    if (ag.cart) { const c = this.cartById(ag.cart); if (c) { c.f = ag.f; c.x = ag.x; c.y = ag.y; } }
    return ag.pi >= ag.path.length ? 'done' : 'moving';
  }
  isNarrow(f, i) {
    const s = this.s, W = s.W, x = i % W, y = (i / W) | 0, h = (xx, yy) => this.inb(xx, yy) && s.hall[f][this.idx(xx, yy)] === 1;
    const ns = h(x, y - 1) || h(x, y + 1), ew = h(x - 1, y) || h(x + 1, y);
    if (ns && !ew) return true; if (ew && !ns) return true; return false;
  }
  cartById(id) { return this.s.carts.find((c) => c.id === id); }
  goTo(ag, f, x, y) {
    const from = this.node(ag.f, Math.floor(ag.x), Math.floor(ag.y));
    const to = this.node(f, x, y);
    this.navCart = !!ag.cart; const p = this.pedPath(from, to); this.navCart = false;
    ag.path = p; ag.pi = 0; return !!p;
  }
  goToAny(ag, targets) { // targets: array of nodes
    const from = this.node(ag.f, Math.floor(ag.x), Math.floor(ag.y));
    const set = new Set(targets);
    this.navCart = !!ag.cart; const p = this.bfs([from], (n) => set.has(n), (n) => this.pedNbr(n)); this.navCart = false;
    ag.path = p; ag.pi = 0; return p;
  }
  thought(ag, text, kind = 'bad', extra = {}) {
    if (!text) return;
    const s = this.s;
    const recent = s.thoughts.findLast ? s.thoughts.findLast((x) => x.text === text) : null;
    if (recent && s.t - recent.t < 20) { recent.n = (recent.n || 1) + 1; return; } // identical complaints are grouped, not spammed
    const th = { t: s.t, text, kind, f: ag.f || 0, x: ag.x, y: ag.y, ag: ag.id, ...extra };
    s.thoughts.push(th); if (s.thoughts.length > 40) s.thoughts.shift();
    this.emit('thought', th);
  }
  convo(c) {
    const s = this.s; if (s.convos.some((x) => x.key && x.key === c.key)) return;
    s.convos.push({ id: this.id(), t: s.t, ttl: 12 * 60, ...c }); if (s.convos.length > 8) s.convos.shift();
    this.emit('convo', { sev: c.sev || 'attention' });
  }

  // ---------------- gate
  updateGate() {
    const s = this.s, gate = this.D.gate; if (!gate) return;
    // exit sensor opens automatically; keypad controls entry
    const near = s.vehicles.some((v) => Math.abs(v.x - (gate.x + 0.5)) < 2.2 && Math.abs(v.y - (gate.y + 1)) < 1.8 && v.moving);
    const target = near || gate.serving ? 1 : 0;
    if (target && gate.open < 1) { if (gate.open === 0) this.emit('gate', { x: gate.x, y: gate.y }); gate.open = Math.min(1, gate.open + 0.25); }
    else if (!target && gate.open > 0) gate.open = Math.max(0, gate.open - 0.2);
  }
  keypadServiceTime() { const g = this.D.gate; return Math.round(4 + (1 - g.cond) * 14); }

  // ---------------- customer state machine
  updateCustomer(ag) {
    const s = this.s, veh = ag.veh && this.vehAt(ag.veh), p = s.parcel;
    const u = ag.unit && s.objects[ag.unit];
    const VS = 0.34, WS = ag.cart ? 0.17 : 0.21;
    switch (ag.st) {
      case 'arrive': {
        veh.moving = true;
        if (this.moveVeh(veh, VS)) { veh.moving = false; ag.st = 'gateq'; if (!s.gateQ.includes(ag.id)) s.gateQ.push(ag.id); }
        break;
      }
      case 'gateq': {
        const gate = this.D.gate; ag.exp.gate++;
        const qi = s.gateQ.indexOf(ag.id);
        // queue position on the street behind the apron
        if (qi > 0) { const tx = gate.x + 0.5 + (veh.hx < 0 ? 0 : 0), ty = p.y1 + 1.5 + Math.min(qi, 1) * 1.0; veh.x += (tx + (qi > 1 ? (qi - 1) * 2.4 * (veh.hx < 0 ? 1 : -1) : 0) - veh.x) * 0.2; veh.y += (ty - veh.y) * 0.2; if (qi >= 2 && ag.exp.gate === 20) this.thought(ag, 'Gate line is backing up.', 'bad'); break; }
        if (!gate.serving) { gate.serving = ag.id; ag.gateT = this.keypadServiceTime(); ag.gateFail = gate.cond < 0.2 || !!gate.unpowered; this.emit('keypad', { x: gate.x, y: gate.y }); }
        if (gate.serving !== ag.id) break;
        ag.gateT--;
        if (ag.gateT <= 0) {
          if (ag.gateFail && !ag.buzzed) {
            if (!ag.gateCalled) {
              ag.gateCalled = true; ag.gateT = 35;
              this.thought(ag, "My gate code isn't working.", 'bad');
              this.ensureRepairTask(gate);
              this.convo({ key: 'gate' + gate.id, who: this.custName(ag), text: "My gate code isn't working.", sev: 'attention', obj: gate.id,
                actions: [{ label: 'Send Owner to the keypad', action: { type: 'ownerTaskFor', obj: gate.id } }, { label: 'Dismiss' }] });
              break;
            }
            if (this.officeServers() > 0) { ag.buzzed = true; this.thought(ag, 'The office buzzed me in.', 'neutral'); }
            else { // gives up
              s.gateQ.shift(); gate.serving = null; ag.exp.gate += 60; ag.failed = true;
              this.thought(ag, 'Nobody answered. I\'m leaving.', 'bad');
              this.depart(ag); break;
            }
          }
          s.gateQ.shift(); gate.serving = null; this.wear(gate, 0.0012);
          this.emit('keypad_ok', { x: gate.x, y: gate.y });
          const dest = this.chooseDest(ag, veh);
          if (!dest) { ag.failed = true; this.thought(ag, "I can't get to my unit from here.", 'bad'); this.depart(ag); break; }
          veh.dest = dest; veh.moving = true;
          this.setVehPath(veh, this.bfs([this.idx(Math.floor(veh.x), Math.floor(veh.y))], (n) => n === dest, (n) => this.vehNbr(n)));
          if (!veh.path) { ag.failed = true; this.depart(ag); break; }
          ag.st = 'drive';
        }
        break;
      }
      case 'drive': {
        if (this.moveVeh(veh, VS)) {
          veh.moving = false; veh.parked = veh.dest;
          ag.hidden = false; ag.f = 0; ag.x = veh.x; ag.y = veh.y;
          const i = veh.dest;
          if (s.weather === 'rain' && (this.D.at.get(i) || []).some((id) => s.objects[id].type === 'canopy')) this.thought(ag, 'Nice covered loading area.', 'good');
          else if (s.weather === 'rain' && s.ground[i] === G.LOADING && ag.needCart) ag.exp.rain = true;
          this.afterPark(ag, u);
        }
        break;
      }
      case 'toOffice': {
        const r = this.moveAgent(ag, WS);
        if (r === 'done') {
          ag.hidden = true; ag.st = 'office'; s.officeQ.push(ag.id);
          if (ag.vt === 'prospect' && ag.size === '10x10' && !ag.climate && this.rnd() < 0.3) { // GDD §26 prospect sizing
            const big = this.objs('unit').some((x) => x.cstate === 'operating' && x.commercial === 'ready' && x.size === '10x20' && !x.blocked);
            if (big) { ag.sizeQ = true; this.convo({ key: 'size' + ag.id, who: 'A prospect', sev: 'attention', ttl: 40, auto: 0,
              text: "I'm storing a two-bedroom apartment. Is a 10x10 enough?",
              actions: [{ label: `Recommend a 10x20 (${this.fmtMoney(s.market.ask[productKey('10x20', 'std')])}/mo)`, action: { type: 'cv', op: 'sizeUp', ag: ag.id, size: '10x20' } }, { label: 'A 10x10 will do', action: { type: 'cv', op: 'sizeKeep', ag: ag.id } }] }); }
          }
        }
        break;
      }
      case 'office': {
        if (ag.serveT > 0) {
          ag.serveT--;
          if (ag.serveT === 0) {
            s.officeQ = s.officeQ.filter((x) => x !== ag.id);
            ag.hidden = false;
            s.convos = s.convos.filter((c) => c.key !== 'size' + ag.id);
            const L = this.decideLease({ size: ag.size, climate: ag.climate, keen: ag.keen }, ag);
            if (L) { this.thought(ag, `Signed for a ${ag.size}. Moving in soon.`, 'good'); if (ag.cramped || ag.sizeQ) { const tn = s.tenants[L.tenant]; if (tn) { tn.sat = 0.64; tn.cramped = true; } } }
            this.goToVehicle(ag);
          }
        } else {
          ag.exp.office++;
          if (ag.exp.office > 50) {
            s.officeQ = s.officeQ.filter((x) => x !== ag.id); ag.hidden = false;
            s.lost.service = (s.lost.service || 0) + 1; s.today.lost++; this.emit('lost', { reason: 'service' });
            this.thought(ag, 'No one at the office.', 'bad');
            this.goToVehicle(ag);
          }
        }
        break;
      }
      case 'toCorral': {
        if (this.moveAgent(ag, WS) === 'done') { if (!this.claimCart(ag)) { ag.st = 'waitCart'; } else this.walkToUnit(ag, u); }
        break;
      }
      case 'waitCart': {
        ag.exp.cart++;
        if (this.claimCart(ag)) { if (ag.exp.cart > 8) this.thought(ag, 'Finally, a cart.', 'neutral'); this.walkToUnit(ag, u); break; }
        if (ag.exp.cart === 2) {
          const c = s.objects[ag.corral];
          this.thought(ag, `No carts at ${c ? c.name : 'the corral'}.`, 'bad');
        }
        if (ag.exp.cart > 16) {
          ag.exp.noCart = true; const c = s.objects[ag.corral];
          this.convo({ key: 'carts' + ag.corral, who: this.custName(ag), text: 'Are there any carts available?', sev: 'attention', obj: ag.corral,
            actions: [{ label: `Buy 2 carts for ${c ? c.name : 'corral'} ($${2 * CART_COST})`, action: { type: 'buyCarts', corral: ag.corral, n: 2 } }, { label: 'Dismiss' }] });
          this.walkToUnit(ag, u);
        }
        break;
      }
      case 'walk': {
        const r = this.moveAgent(ag, WS);
        if (r === 'done') this.arriveUnit(ag, u);
        else if (r === 'blocked') { this.thought(ag, "I can't reach my unit.", 'bad'); ag.failed = true; this.goToVehicle(ag); }
        break;
      }
      case 'elev': break; // elevator moves us
      case 'atunit': {
        ag.wait--;
        if (u && ag.wait % 20 === 0) u.doorT = s.t;
        if (ag.wait <= 0) this.finishAtUnit(ag, u);
        break;
      }
      case 'toRest': {
        const r = this.moveAgent(ag, WS);
        if (r === 'done') {
          const rr = s.objects[ag.rr];
          if (rr) { ag.wait = 4 + Math.floor(this.rnd() * 5); ag.st = 'inRest'; ag.hidden = true; rr.busyUntil = s.t + ag.wait; rr.dirt = Math.min(1, (rr.dirt || 0) + 0.035); rr.uses = (rr.uses || 0) + 1; ag.rrDone = true; }
          else this.goToVehicle(ag);
        } else if (r === 'blocked') this.goToVehicle(ag);
        break;
      }
      case 'inRest': { if (--ag.wait <= 0) { ag.hidden = false; this.goToVehicle(ag); } break; }
      case 'retCart': {
        if (this.moveAgent(ag, WS) === 'done') {
          const c = this.cartById(ag.cart), corral = s.objects[ag.corral];
          if (c && corral) { c.st = 'corral'; c.corral = corral.id; c.f = corral.f || 0; c.x = corral.x; c.y = corral.y; this.emit('cart_return', { x: corral.x, y: corral.y, f: corral.f || 0 }); }
          ag.cart = null; this.goToVehicle(ag);
        }
        break;
      }
      case 'back': {
        const r = this.moveAgent(ag, ag.cart ? 0.17 : WS);
        if (r === 'done' || r === 'blocked') {
          if (ag.cart && r === 'done' && !ag.cartRetried) { // most people push the empty cart back if a corral is close
            ag.cartRetried = true;
            const home = s.objects[ag.cartHome]; const target = home && home.cstate === 'operating' ? home : this.objs('corral').find((c) => c.cstate === 'operating');
            if (target && this.rnd() < 0.7 && this.goTo(ag, target.f || 0, target.x, target.y) && ag.path.length < 40) { ag.corral = target.id; ag.st = 'retCart'; break; }
          }
          if (ag.cart) this.dropCart(ag); this.depart(ag);
        }
        break;
      }
      case 'leave': {
        veh.moving = true;
        if (this.moveVeh(veh, VS)) {
          s.vehicles = s.vehicles.filter((v) => v !== veh);
          s.agents = s.agents.filter((x) => x !== ag);
        }
        break;
      }
    }
    if (ag.inElev) { /* position managed by elevator */ }
  }
  custName(ag) { const tn = ag.tenant && this.s.tenants[ag.tenant]; return tn ? tn.name : 'A prospect'; }
  chooseDest(ag, veh) {
    const s = this.s, D = this.D, u = ag.unit && s.objects[ag.unit];
    const taken = new Set(s.vehicles.filter((v) => v !== veh && (v.dest != null)).map((v) => v.dest));
    const free = (i) => !taken.has(i) && D.vehReach[i];
    if (ag.vt === 'prospect') {
      const office = this.objs('office')[0]; if (!office) return null;
      const oi = this.idx(office.door.x, office.door.y);
      const cands = [];
      for (let i = 0; i < s.ground.length; i++) if (s.ground[i] === G.PARKING && D.vehReach[i]) cands.push(i);
      const d = this.distField([oi], (n) => this.pedNbr(n));
      cands.sort((a, b) => (d.get(a) ?? 999) - (d.get(b) ?? 999));
      const c = cands.find(free) ?? cands[0];
      if (c != null) return c;
      // fall back: any asphalt near office
      return this.nearestVehCell(oi, taken);
    }
    if (!u) return null;
    if (u.access === 'drive') {
      const fr = this.unitFront(u).map((c) => this.idx(c.x, c.y)).filter((i) => D.vehReach[i]);
      return fr.find(free) ?? fr[0] ?? null;
    }
    const fc = this.unitFront(u).find((c) => s.hall[u.f || 0][this.idx(c.x, c.y)] === 1);
    if (!fc) return null;
    const d = this.distField([this.node(u.f || 0, fc.x, fc.y)], (n) => this.pedNbr(n));
    const load = [], park = [];
    for (let i = 0; i < s.ground.length; i++) {
      if (!D.vehReach[i] || !d.has(i)) continue;
      if (s.ground[i] === G.LOADING) load.push(i); else if (s.ground[i] === G.PARKING || s.ground[i] === G.ASPHALT) park.push(i);
    }
    load.sort((a, b) => d.get(a) - d.get(b)); park.sort((a, b) => d.get(a) - d.get(b));
    const l = load.find(free); if (l != null) return l;
    const pk = park.filter((i) => s.ground[i] === G.PARKING).find(free);
    if (load.length) this.thought(ag, 'Loading bays are full.', 'bad');
    if (pk != null) { ag.exp.walk += 10; return pk; }
    const any = park.find(free); if (any != null) { ag.exp.walk += 10; return any; }
    return load[0] ?? null;
  }
  nearestVehCell(i0, taken) {
    const p = this.bfs([i0], (n) => this.D.vehReach[n] && !taken.has(n) && VEH_GROUND.has(this.s.ground[n]), (n) => {
      const W = this.s.W, x = n % W, y = (n / W) | 0; return DIRS.map(([dx, dy]) => [x + dx, y + dy]).filter(([a, b]) => this.inb(a, b)).map(([a, b]) => this.idx(a, b));
    }, 3000);
    return p ? p[p.length - 1] : null;
  }
  afterPark(ag, u) {
    const s = this.s;
    if (ag.vt === 'prospect') {
      const office = this.objs('office')[0];
      if (!office || !this.goTo(ag, 0, office.door.x, office.door.y)) { this.thought(ag, "I can't find the office entrance.", 'bad'); ag.failed = true; this.depart(ag); return; }
      ag.st = 'toOffice'; return;
    }
    if (!u) { this.depart(ag); return; }
    if (u.access === 'drive') { this.arriveUnit(ag, u); return; }
    if (ag.needCart) {
      const corrals = this.objs('corral').filter((c) => c.cstate === 'operating');
      const withCart = corrals.filter((c) => this.cartsAt(c.id).length);
      let p = withCart.length ? this.goToAny(ag, withCart.map((c) => this.node(c.f || 0, c.x, c.y))) : null;
      if (p && p.length > 45) p = null; // too far to bother
      if (p) { const n = this.unnode(p[p.length - 1]); ag.corral = corrals.find((c) => (c.f || 0) === n.f && c.x === n.x && c.y === n.y).id; ag.st = 'toCorral'; return; }
      if (corrals.length) {
        const q = this.goToAny(ag, corrals.map((c) => this.node(c.f || 0, c.x, c.y)));
        if (q && q.length < 45) { const n = this.unnode(q[q.length - 1]); ag.corral = corrals.find((c) => (c.f || 0) === n.f && c.x === n.x && c.y === n.y).id; ag.st = 'toCorral'; return; }
      }
      ag.exp.noCart = true;
    }
    this.walkToUnit(ag, u);
  }
  cartsAt(corralId) { return this.s.carts.filter((c) => c.st === 'corral' && c.corral === corralId && c.cond >= 0.2); }
  claimCart(ag) {
    const c = this.cartsAt(ag.corral)[0]; if (!c) return false;
    c.st = 'inuse'; c.corral = null; c.uses++; ag.cart = c.id; ag.cartHome = c.home;
    this.wear(c, 0.012);
    this.emit('cart_take', { x: ag.x, y: ag.y, f: ag.f });
    return true;
  }
  walkToUnit(ag, u) {
    const s = this.s; const f = u.f || 0;
    const fc = this.unitFront(u).find((c) => s.hall[f][this.idx(c.x, c.y)] === 1);
    let ok = fc && this.goTo(ag, f, fc.x, fc.y);
    if (!ok && fc && ag.cart) { // no freight path (e.g. elevator down): leave the cart and hand-carry up the stairs
      const cartId = ag.cart; ag.cart = null; ok = this.goTo(ag, f, fc.x, fc.y); ag.cart = cartId;
      if (ok) { this.dropCart(ag); ag.exp.noCart = true; ag.exp.walk += 25; this.thought(ag, 'Elevator is down - carrying it up the stairs.', 'bad'); }
    }
    if (!ok) { this.thought(ag, "I can't reach my unit.", 'bad'); ag.failed = true; if (ag.cart) this.dropCart(ag); this.goToVehicle(ag); return; }
    ag.st = 'walk';
    if (ag.vt === 'movein' || ag.vt === 'bigaccess' || ag.vt === 'moveout') ag.carry = true;
  }
  arriveUnit(ag, u) {
    const base = { access: 35, bigaccess: 90, movein: 150, moveout: 140 }[ag.vt] || 40;
    const noCartPenalty = u.access === 'interior' && ag.needCart && !ag.cart ? 1.7 : 1;
    ag.wait = Math.round(base * noCartPenalty); ag.st = 'atunit'; u.doorT = this.s.t; u.doorOpen = true;
    this.emit('rollup', { x: u.x, y: u.y, f: u.f || 0, open: true });
    if (u.access === 'interior' && this.D.lit[u.f || 0][this.idx(Math.floor(ag.x), Math.floor(ag.y))] < 0.4) { ag.exp.dark = true; this.thought(ag, 'The hallway is dark.', 'bad'); }
  }
  finishAtUnit(ag, u) {
    const s = this.s;
    u.doorOpen = false; this.emit('rollup', { x: u.x, y: u.y, f: u.f || 0, open: false });
    ag.carry = false;
    if (ag.vt === 'movein') {
      u.commercial = 'occupied';
      this.emit('movedin', { unit: u.id });
    }
    if (u.access === 'interior' && ag.cart) this.milestone('first_cart_trip');
    if (u.access === 'interior') { // GDD §24: some visitors stop at the building's restroom on the way out
      const sh = this.D.shellAt[this.idx(u.x, u.y)], long = ag.vt === 'movein' || ag.vt === 'moveout' || ag.vt === 'bigaccess';
      const rr = this.objs('restroom').filter((r) => this.amenityWorks(r) && this.D.shellAt[this.idx(r.x, r.y)] === sh).sort((a, b) => (a.dirt || 0) - (b.dirt || 0))[0];
      if (rr) { ag.rrUse = long || this.rnd() < 0.15; if (ag.rrUse) ag.rrWant = rr.id; }
    }
    if (ag.vt === 'moveout') { const L = s.leases[u.lease]; if (L) this.endLease(L, 'moveout'); }
    if ((ag.vt === 'access' || ag.vt === 'bigaccess') && this.rnd() < 0.5) { // GDD §26 maintenance complaint
      const lt = this.objs('light').find((l) => (l.f || 0) === (u.f || 0) && l.cstate === 'operating' && !this.works(l) && Math.abs(l.x - u.x) + Math.abs(l.y - u.y) <= 7);
      if (lt) { this.ensureRepairTask(lt); this.convo({ key: 'light' + lt.id, who: this.custName(ag), sev: 'attention', obj: lt.id, ttl: 10 * 60,
        text: `The light near my unit is out.`, actions: [{ label: 'Send Owner to fix it', action: { type: 'ownerTaskFor', obj: lt.id } }, { label: 'Call an electrician ($250)', action: { type: 'cv', op: 'vendorFor', obj: lt.id } }, { label: 'Log it for later' }] }); }
    }
    if (u.access === 'drive') { this.depart(ag); return; }
    if (ag.cart) {
      const corrals = this.objs('corral').filter((c) => c.cstate === 'operating');
      const home = s.objects[ag.cartHome];
      const target = home && home.cstate === 'operating' ? home : corrals[0];
      let p = target && this.goTo(ag, target.f || 0, target.x, target.y) ? ag.path : null;
      const pReturn = p ? (p.length < 28 ? 0.93 : 0.78) : 0;
      if (p && this.rnd() < pReturn) { ag.corral = target.id; ag.st = 'retCart'; return; }
      this.dropCart(ag);
    }
    this.goToVehicle(ag);
  }
  dropCart(ag) {
    const c = this.cartById(ag.cart); ag.cart = null; if (!c) return;
    c.st = c.cond < 0.2 ? 'damaged' : 'stranded'; c.corral = null; c.f = ag.f; c.x = Math.floor(ag.x) + 0.5; c.y = Math.floor(ag.y) + 0.5; c.since = this.s.t;
    this.emit('cart_left', { f: c.f, x: c.x, y: c.y });
  }
  restroomTrip(ag) {
    const s = this.s, rr = s.objects[ag.rrWant]; ag.rrWant = null;
    if (!rr || rr.type !== 'restroom' || !this.amenityWorks(rr)) return false;
    const f = rr.f || 0, hd = DIRS.find(([dx, dy]) => this.inb(rr.x + dx, rr.y + dy) && s.hall[f][this.idx(rr.x + dx, rr.y + dy)] === 1);
    if (!hd || !this.goTo(ag, f, rr.x + hd[0], rr.y + hd[1]) || ag.path.length > 70) return false;
    ag.rr = rr.id; ag.st = 'toRest'; return true;
  }
  goToVehicle(ag) {
    if (ag.rrWant && !ag.cart && this.restroomTrip(ag)) return;
    const veh = this.vehAt(ag.veh);
    if (!veh) { this.depart(ag); return; }
    if (!this.goTo(ag, 0, Math.floor(veh.x), Math.floor(veh.y))) { if (ag.cart) this.dropCart(ag); this.depart(ag); return; }
    ag.st = 'back';
  }
  depart(ag) {
    const s = this.s, veh = this.vehAt(ag.veh);
    this.recordExperience(ag);
    ag.hidden = true; ag.st = 'leave'; this.leaveElevator(ag);
    s.gateQ = s.gateQ.filter((x) => x !== ag.id);
    if (this.D.gate && this.D.gate.serving === ag.id) this.D.gate.serving = null;
    if (!veh) { s.agents = s.agents.filter((x) => x !== ag); return; }
    veh.parked = null; veh.dest = null; veh.moving = true;
    const p = s.parcel, toEast = this.rnd() < 0.5;
    const goal = this.idx(toEast ? s.W - 1 : 0, toEast ? p.y1 + 3 : p.y1 + 2);
    const path = this.bfs([this.idx(Math.floor(veh.x), Math.floor(veh.y))], (n) => n === goal, (n) => this.vehNbr(n));
    this.setVehPath(veh, path || [goal]);
  }
  recordExperience(ag) {
    if (ag.recorded || ag.kind !== 'cust') return; ag.recorded = true;
    const s = this.s, e = ag.exp, u = ag.unit && s.objects[ag.unit];
    const dims = {};
    dims.access = clamp(1 - Math.max(0, e.gate - 6) / 40, 0, 1);
    if (u && u.access === 'interior') {
      const cartPen = e.noCart ? 0.35 : clamp(e.cart / 30, 0, 0.3);
      dims.convenience = clamp(1 - cartPen - clamp(e.elev / 60, 0, 0.4) - clamp((e.walk - 20) / 160, 0, 0.25) - clamp(e.door / 25, 0, 0.12) - (e.rain ? 0.08 : 0) - clamp((ag.friction || 0) / 60, 0, 0.1), 0, 1);
    } else if (u) dims.convenience = 1;
    if (e.dirtN) dims.cleanliness = clamp(1.05 - (e.dirt / e.dirtN) * 1.3, 0, 1);
    if (u) dims.security = Math.min(this.unitSecurity(u), e.dark ? 0.45 : 1);
    if (u && u.env === 'climate') { const hv = this.D.hvac[this.D.shellAt[this.idx(u.x, u.y)]]; dims.climate = hv && hv.cap >= hv.load ? 1 : 0.2; }
    if (ag.vt === 'prospect' || e.office > 0) dims.service = clamp(1 - e.office / 60, 0, 1);
    if (u && u.lease && s.leases[u.lease]) dims.value = clamp(1.4 - (s.leases[u.lease].rent / this.marketRent(u)) * 0.6, 0, 1);
    if (u && u.access === 'interior') { // GDD §24 amenities: restroom + fountain in this building
      const sh = this.D.shellAt[this.idx(u.x, u.y)], long = ag.vt === 'movein' || ag.vt === 'moveout' || ag.vt === 'bigaccess';
      const rr = this.objs('restroom').filter((r) => this.amenityWorks(r) && this.D.shellAt[this.idx(r.x, r.y)] === sh).sort((a, b) => (a.dirt || 0) - (b.dirt || 0))[0];
      const fo = this.objs('fountain').some((r) => this.amenityWorks(r) && this.D.shellAt[this.idx(r.x, r.y)] === sh);
      let c;
      if (rr) {
        const used = ag.rrUse != null ? ag.rrUse : long || this.rnd() < 0.15;
        if (used && !ag.rrDone) { rr.dirt = Math.min(1, (rr.dirt || 0) + 0.035); rr.uses = (rr.uses || 0) + 1; }
        c = used && rr.dirt > 0.6 ? 0.5 : 0.95;
        if (used && rr.dirt > 0.6 && this.rnd() < 0.4) this.thought(ag, 'That restroom needs cleaning.', 'bad');
      } else { c = long ? 0.55 : 0.78; if (long && this.rnd() < 0.12) this.thought(ag, 'No restroom in this building?', 'bad'); }
      if (fo) c += 0.08;
      dims.comfort = clamp(c, 0, 1);
    }
    if (ag.failed) { dims.access = Math.min(dims.access, 0.2); dims.convenience = Math.min(dims.convenience ?? 1, 0.2); }
    for (const [k, v] of Object.entries(dims)) s.exp[k] = s.exp[k] * 0.93 + v * 0.07;
    const tn = ag.tenant && s.tenants[ag.tenant];
    if (tn) { const vals = Object.values(dims); const m = vals.reduce((a, b) => a + b, 0) / vals.length; tn.sat = tn.sat * 0.82 + m * 0.18; tn.last = dims; }
    // a few positive notes so thoughts are not only complaints
    if (u && u.access === 'interior' && ag.elevWaited != null && ag.elevWaited < 6 && this.rnd() < 0.3) this.thought(ag, 'That elevator was quick.', 'good');
  }

  // ============================================================ OFFICE
  officeServers() {
    const s = this.s, h = this.hour;
    return s.agents.filter((a) => a.kind === 'staff' && a.st === 'office' && (a.role === 'owner' || (a.role === 'clerk' && h >= OFFICE_HOURS[0] && h < OFFICE_HOURS[1]))).length;
  }
  serveOffice() {
    const s = this.s; let free = this.officeServers() - s.officeQ.filter((id) => { const a = s.agents.find((x) => x.id === id); return a && a.serveT > 0; }).length;
    for (const id of s.officeQ) {
      if (free <= 0) break; const a = s.agents.find((x) => x.id === id);
      if (a && !(a.serveT > 0)) { a.serveT = 25; free--; }
    }
  }

  // ============================================================ ELEVATORS
  joinElevator(ag, el, destF) {
    ag.prevSt = ag.st; ag.st = 'elev'; ag.elev = el.id; ag.elevDest = destF; ag.elevT0 = this.s.t;
    if (!el.q[ag.f].includes(ag.id)) el.q[ag.f].push(ag.id);
  }
  leaveElevator(ag) {
    if (!ag.elev) return; const el = this.s.objects[ag.elev]; ag.elev = null; ag.inElev = false;
    if (!el) return; el.q = el.q.map((q) => q.filter((x) => x !== ag.id)); el.riders = el.riders.filter((r) => r.a !== ag.id);
  }
  updateElevator(el) {
    const s = this.s; if (el.cstate !== 'operating') return;
    const agent = (id) => s.agents.find((a) => a.id === id);
    for (const q of el.q) for (const id of q) { const a = agent(id); if (a) { a.exp && a.exp.elev++; } }
    if (!this.works(el)) {
      // people without carts give up on the elevator and take the stairs if the building has them
      if (s.t % 3 === 0) for (const q of el.q) for (const id of [...q]) {
        const a = agent(id); if (!a || a.cart || s.t - a.elevT0 < 4 || !a.path) continue;
        const tgt = this.unnode(a.path[a.path.length - 1]), saved = [a.path, a.pi];
        if (this.goTo(a, tgt.f, tgt.x, tgt.y)) { this.leaveElevator(a); a.st = a.prevSt; if (a.kind === 'cust') this.thought(a, 'Taking the stairs instead.', 'neutral'); }
        else { a.path = saved[0]; a.pi = saved[1]; }
      }
      for (const q of el.q) for (const id of q) { const a = agent(id); if (a && a.kind === 'cust' && s.t - a.elevT0 === 5) { this.thought(a, el.unpowered ? 'The elevator has no power.' : 'The elevator is out of service.', 'bad'); } }
      if (el.q.some((q) => q.length) && !el.convoed) {
        el.convoed = true; this.ensureRepairTask(el);
        const t = s.tasks.find((x) => x.obj === el.id);
        this.convo({ key: 'elev' + el.id, who: 'Tenant', text: "I've been waiting forever for the elevator.", sev: 'critical', obj: el.id,
          actions: [{ label: 'Call elevator vendor ($650)', action: { type: 'callVendor', task: t && t.id } }, { label: 'Dismiss' }] });
      }
      return;
    }
    el.convoed = false;
    for (const r of el.riders) { const a = agent(r.a); if (a) { a.inElev = true; a.f = Math.round(el.pos); a.x = el.x + 0.5; a.y = el.y + 0.5; if (a.cart) { const c = this.cartById(a.cart); if (c) { c.f = a.f; c.x = a.x; c.y = a.y; } } } }
    if (el.door > 0) { el.door--; return; }
    const atFloor = Math.abs(el.pos - Math.round(el.pos)) < 1e-6; const fl = Math.round(el.pos);
    if (atFloor && (el.tgt === null || el.tgt === fl)) {
      let changed = false;
      for (const r of [...el.riders]) if (r.dest === fl) {
        const a = agent(r.a); el.riders = el.riders.filter((x) => x !== r); changed = true;
        if (a) { a.inElev = false; a.elev = null; a.f = fl; a.st = a.prevSt; a.pi++; }
      }
      const q = el.q[fl];
      while (q.length) {
        const a = agent(q[0]); if (!a) { q.shift(); continue; }
        const used = el.riders.reduce((acc, r) => acc + r.slots, 0), slots = a.cart ? 2 : 1;
        if (used + slots > el.cap) break;
        q.shift(); el.riders.push({ a: a.id, dest: a.elevDest, slots }); changed = true;
        const w = s.t - a.elevT0; a.elevWaited = w; el.avgWait = (el.avgWait || 0) * 0.85 + w * 0.15;
        if (a.kind === 'cust' && w > 40) this.thought(a, "I've been waiting forever for the elevator.", 'bad');
        a.inElev = true; this.wear(el, 0.0022); el.trips++;
      }
      if (changed) { el.door = 3; this.emit('elevator', { x: el.x, y: el.y, f: fl, obj: el.id }); }
      el.tgt = null;
      const other = el.riders.find((r) => r.dest !== fl);
      if (other) el.tgt = other.dest;
      else { for (let g = 0; g < el.q.length; g++) if (g !== fl && el.q[g].length) { el.tgt = g; break; } }
      if (el.tgt !== null) this.emit('elevator_move', { obj: el.id });
    }
    if (el.tgt !== null && el.door === 0) {
      const dir = Math.sign(el.tgt - el.pos); el.pos += dir / 10;
      if ((dir > 0 && el.pos >= el.tgt) || (dir < 0 && el.pos <= el.tgt)) { el.pos = el.tgt; }
    }
  }

  // ============================================================ STAFF + TASKS
  spawnStaffAgent(st) {
    const s = this.s, office = this.objs('office')[0];
    const ag = { id: this.id(), kind: 'staff', sid: st.id, role: st.role, st: 'office', hidden: true, f: 0, x: office ? office.door.x + 0.5 : 5, y: office ? office.door.y + 0.5 : 5, task: null, queue: [], path: null, pi: 0, exp: { walk: 0, dirt: 0, dirtN: 0, door: 0, elev: 0 }, look: st.id * 7919 };
    s.agents.push(ag); return ag;
  }
  staffOf(ag) { return this.s.staff.find((x) => x.id === ag.sid); }
  addTask(t) {
    const s = this.s;
    if (s.tasks.some((x) => x.type === t.type && x.obj != null && x.obj === t.obj)) return null;
    const task = { id: this.id(), created: s.t, pri: 0, assigned: null, total: t.work, prog: 0, ...t };
    s.tasks.push(task); this.emit('task_new', { task: task.id, pri: task.pri }); return task;
  }
  ensureRepairTask(o) {
    const complex = o.type === 'elevator' || o.type === 'hvac';
    const kind = { light: 'repair_light', camera: 'repair_camera', hvac: 'repair_hvac', elevator: 'repair_elevator', door: 'repair_door', gate: 'repair_keypad', fountain: 'repair_fountain' }[o.type] || 'repair_light';
    let t = this.s.tasks.find((x) => x.obj === o.id && (x.type === 'repair' || x.type === 'pm'));
    if (!t) t = this.addTask({ type: 'repair', need: complex ? 'repair_complex' : 'repair_simple', obj: o.id, label: `Repair ${this.objName(o)}`, work: WORK[kind], pri: o.cond < 0.2 ? 2 : 0 });
    else if (o.cond < 0.2) t.pri = Math.max(t.pri, 2);
    return t;
  }
  act_ownerTaskFor(a) { const o = this.s.objects[a.obj]; if (!o) return { ok: false }; const t = this.ensureRepairTask(o); return this.act_ownerTask({ task: t.id }); }
  act_ownerRoom(a) {
    const o = this.s.objects[a.obj]; if (!o || o.type !== 'restroom') return { ok: false };
    let t = this.s.tasks.find((x) => x.type === 'cleanroom' && x.obj === o.id);
    if (!t) t = this.addTask({ type: 'cleanroom', need: 'clean', obj: o.id, label: 'Clean restroom', work: WORK.clean_restroom });
    return t ? this.act_ownerTask({ task: t.id }) : { ok: false };
  }
  act_ownerClean(a) {
    const t = this.addTask({ type: 'clean', need: 'clean', obj: null, f: a.f, x: a.x, y: a.y, label: 'Clean ' + (this.D.shellAt[this.idx(a.x, a.y)] ? 'hallway' : 'loading area'), work: WORK.clean });
    return t ? this.act_ownerTask({ task: t.id }) : { ok: false };
  }
  generateTasks() {
    const s = this.s, D = this.D;
    const hasTech = s.staff.some((x) => x.role === 'tech');
    for (const o of Object.values(s.objects)) {
      if (o.cstate !== 'operating') continue;
      if (o.type === 'restroom' && (o.dirt || 0) > 0.55) this.addTask({ type: 'cleanroom', need: 'clean', obj: o.id, label: 'Clean restroom', work: WORK.clean_restroom, pri: o.dirt > 0.8 ? 1 : 0 });
      if (['light', 'camera', 'hvac', 'elevator', 'gate', 'fountain'].includes(o.type) || (o.type === 'door' && o.kind === 'auto')) {
        if (o.cond < 0.45) this.ensureRepairTask(o);
        else if (s.policies.preventive && hasTech && o.cond < 0.68 && !s.tasks.some((x) => x.obj === o.id)) this.addTask({ type: 'pm', need: 'repair_simple', obj: o.id, label: `Preventive service: ${this.objName(o)}`, work: WORK.pm });
      }
    }
    for (const c of s.carts) {
      if ((c.st === 'stranded' && s.t - c.since > 45) || c.st === 'damaged') {
        if (!s.tasks.some((t) => t.type === 'carts' && t.cart === c.id)) this.addTask({ type: 'carts', need: 'carts', cart: c.id, obj: 'cart' + c.id, label: c.st === 'damaged' ? 'Repair damaged cart' : `Recover cart${c.f > 0 ? ' from Floor ' + (c.f + 1) : ''}`, work: c.st === 'damaged' ? 45 : WORK.carts, phase: 1 });
      }
    }
    const WH = s.W * s.H;
    for (let f = 0; f < 2; f++) for (let i = 0; i < WH; i++) {
      if (s.dirt[f][i] < 0.55) continue;
      const x = i % s.W, y = (i / s.W) | 0;
      if (s.tasks.some((t) => t.type === 'clean' && t.f === f && Math.abs(t.x - x) + Math.abs(t.y - y) < 6)) continue;
      this.addTask({ type: 'clean', need: 'clean', obj: null, f, x, y, label: 'Clean ' + (D.shellAt[i] ? (f > 0 ? 'Floor 2 hallway' : 'hallway') : 'loading area'), work: WORK.clean });
    }
    for (const t of s.tasks) if (t.unreachable && s.t - t.unreachable > 120) t.unreachable = null;
  }
  taskCell(t) {
    const s = this.s, D = this.D;
    const walkNear = (f, x, y) => {
      if (this.inb(x, y) && D.walk[f][this.idx(x, y)]) return { f, x, y };
      for (const [dx, dy] of DIRS) if (this.inb(x + dx, y + dy) && D.walk[f][this.idx(x + dx, y + dy)]) return { f, x: x + dx, y: y + dy };
      for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1], [2, 0], [-2, 0], [0, 2], [0, -2]]) if (this.inb(x + dx, y + dy) && D.walk[f][this.idx(x + dx, y + dy)]) return { f, x: x + dx, y: y + dy };
      return null;
    };
    if (t.type === 'makeready') { const u = s.objects[t.obj]; if (!u) return null; const fr = this.unitFront(u).find((c) => D.walk[u.f || 0][this.idx(c.x, c.y)]); return fr ? { f: u.f || 0, ...fr } : null; }
    if (t.type === 'clean') return walkNear(t.f, t.x, t.y);
    if (t.type === 'carts') {
      const c = this.cartById(t.cart); if (!c) return null;
      if (t.phase === 1) return c.st === 'damaged' && c.corral ? walkNear(c.f, Math.floor(c.x), Math.floor(c.y)) : walkNear(c.f, Math.floor(c.x), Math.floor(c.y));
      const home = s.objects[c.home] && s.objects[c.home].cstate === 'operating' ? s.objects[c.home] : this.objs('corral')[0];
      return home ? walkNear(home.f || 0, home.x, home.y) : null;
    }
    const o = s.objects[t.obj]; if (!o) return null;
    if (o.type === 'gate') return walkNear(0, o.x, o.y);
    if (o.type === 'hvac') { for (const [dx, dy] of DIRS) { const r = walkNear(0, o.x + dx, o.y + dy); if (r) return r; } return null; }
    if (o.type === 'elevator') return walkNear(0, o.x, o.y);
    if (o.type === 'door') return walkNear(0, o.x, o.y);
    return walkNear(o.f || 0, o.x, o.y);
  }
  startTask(ag, t) {
    const c = this.taskCell(t);
    if (ag.hidden) { const office = this.objs('office')[0]; if (office) { ag.f = 0; ag.x = office.door.x + 0.5; ag.y = office.door.y + 0.5; } }
    if (!c || !this.goTo(ag, c.f, c.x, c.y)) { t.unreachable = this.s.t; t.assigned = null; t.queued = false; ag.task = null; this.emit('refuse'); return false; }
    ag.task = t.id; t.assigned = ag.sid; ag.st = 'walk'; ag.hidden = false;
    this.emit('task_start', { task: t.id });
    return true;
  }
  releaseTask(ag) { const t = this.s.tasks.find((x) => x.id === ag.task); if (t) t.assigned = null; ag.task = null; }
  onShift() { const h = this.hour; return h >= 7 && h < 20; } // staff day shift (GDD §29)
  ownerMayAutoWork() { // Owner handles chores on their own when the office is quiet (after the tutorial)
    const s = this.s, h = this.hour;
    if (!s.policies.ownerChores || (s.tut && s.tut.on && !s.tut.done)) return false;
    if (h < OFFICE_HOURS[0] || h >= OFFICE_HOURS[1] - 0.5) return false;
    if (s.officeQ.length) return false;
    if ((s.today.ownerAuto || 0) >= OWNER_AUTO_PER_DAY) return false; // the Owner has other work: only a few chores a day happen on their own
    if (s.staff.some((x) => x.role === 'clerk') ) return true;
    return !s.agents.some((a) => a.kind === 'cust' && a.vt === 'prospect');
  }
  pickTask(ag, ownerAuto = false) {
    const s = this.s, R = ROLES[ag.role];
    const cands = s.tasks.filter((t) => !t.assigned && !t.vendor && !t.unreachable && R.can.includes(t.need) && (t.need !== 'carts' || s.policies.porterCarts || ownerAuto) && (!ownerAuto || (t.need !== 'office' && !t.need.startsWith('repair'))))
      .sort((a, b) => (b.pri - a.pri) || (a.created - b.created));
    for (const t of cands) if (this.startTask(ag, t)) { if (ownerAuto) s.today.ownerAuto = (s.today.ownerAuto || 0) + 1; return true; }
    return false;
  }
  updateStaff(ag) {
    const s = this.s; const WS = ag.cart ? 0.19 : 0.24;
    const t = ag.task && s.tasks.find((x) => x.id === ag.task);
    if (ag.task && !t) { ag.task = null; if (ag.st === 'walk' || ag.st === 'work') ag.st = 'idle'; if (ag.cart) this.dropCart(ag); }
    switch (ag.st) {
      case 'office': case 'idle': {
        if (ag.queue && ag.queue.length) { const nt = s.tasks.find((x) => x.id === ag.queue[0]); ag.queue.shift(); if (nt) { nt.queued = false; if (this.startTask(ag, nt)) break; } }
        if (ag.role !== 'owner' && ag.role !== 'clerk' && s.t % 5 === 0 && this.onShift() && this.pickTask(ag)) break;
        if (ag.role === 'owner' && s.t % 10 === 0 && this.ownerMayAutoWork() && this.pickTask(ag, true)) break;
        if (ag.st === 'idle') { const office = this.objs('office')[0]; if (office && this.goTo(ag, 0, office.door.x, office.door.y)) ag.st = 'home'; else ag.st = 'office'; }
        break;
      }
      case 'walk': {
        const r = this.moveAgent(ag, WS);
        if (r === 'done') {
          if (t.type === 'carts' && t.phase === 1) {
            const c = this.cartById(t.cart);
            if (c) { ag.cart = c.id; c.st = 'inuse'; c.corral = null; this.emit('cart_take', { x: ag.x, y: ag.y, f: ag.f }); }
            t.phase = 2; const dc = this.taskCell(t);
            if (!dc || !this.goTo(ag, dc.f, dc.x, dc.y)) { this.dropCart(ag); this.finishTask(t, ag, true); }
            break;
          }
          ag.st = 'work'; ag.wait = Math.max(1, Math.round(t.total * (1 - t.prog)));
          this.emit('work_start', { kind: t.type, x: ag.x, y: ag.y, f: ag.f, obj: t.obj });
        } else if (r === 'blocked') { this.releaseTask(ag); ag.st = 'idle'; }
        break;
      }
      case 'work': {
        ag.wait--; t.prog = clamp(1 - ag.wait / t.total, 0, 1);
        if (s.t % 15 === 0) this.emit('work_tick', { kind: t.type, x: ag.x, y: ag.y, f: ag.f });
        if (ag.wait <= 0) { this.finishTask(t, ag); ag.st = 'idle'; }
        break;
      }
      case 'home': {
        const r = this.moveAgent(ag, WS);
        if (ag.queue && ag.queue.length) { ag.st = 'idle'; break; }
        if (s.t % 5 === 0 && (ag.role !== 'owner' ? ag.role !== 'clerk' && this.onShift() : this.ownerMayAutoWork()) && this.pickTask(ag, ag.role === 'owner')) break;
        if (r === 'done' || r === 'blocked') { ag.st = 'office'; ag.hidden = true; }
        break;
      }
      case 'elev': break;
    }
  }
  finishTask(t, ag, aborted = false) {
    const s = this.s;
    s.tasks = s.tasks.filter((x) => x !== t);
    if (ag) ag.task = null;
    if (aborted) return;
    const o = t.obj != null && s.objects[t.obj];
    if (t.type === 'makeready' && o) { o.commercial = 'ready'; this.milestone('first_makeready'); this.emit('rentready', { unit: o.id, x: o.x, y: o.y, f: o.f || 0 }); }
    else if ((t.type === 'repair' || t.type === 'pm') && o) {
      // choice, not chore: the Owner's quick fix is free but wears out sooner; a Tech or vendor restores it fully
      const quick = t.type === 'repair' && ag && ag.role === 'owner' && this.pressureOn();
      o.cond = quick ? Math.max(o.cond, 0.72) : 1; o.quickFix = quick; if (o.type === 'door' && o.keypad) o.kcond = quick ? 0.72 : 1; this.markDirty();
      this.milestone('first_repair'); this.emit('repaired', { obj: o.id, x: o.x, y: o.y, f: o.f || 0 });
      s.convos = s.convos.filter((c) => c.obj !== o.id);
    } else if (t.type === 'cleanroom' && o) {
      o.dirt = 0; this.emit('cleaned', { x: o.x, y: o.y, f: o.f || 0 });
    } else if (t.type === 'clean') {
      const r = 2.6;
      for (let y = Math.floor(t.y - r); y <= t.y + r; y++) for (let x = Math.floor(t.x - r); x <= t.x + r; x++) if (this.inb(x, y) && Math.hypot(x - t.x, y - t.y) <= r) s.dirt[t.f][this.idx(x, y)] = 0;
      this.emit('cleaned', { x: t.x, y: t.y, f: t.f });
    } else if (t.type === 'carts') {
      const c = this.cartById(t.cart);
      if (c) {
        if (c.st === 'damaged' || c.cond < 0.2) c.cond = 1;
        const home = s.objects[c.home] && s.objects[c.home].cstate === 'operating' ? s.objects[c.home] : this.objs('corral')[0];
        if (home) { c.st = 'corral'; c.corral = home.id; c.f = home.f || 0; c.x = home.x; c.y = home.y; this.emit('cart_return', { x: home.x, y: home.y, f: home.f || 0 }); }
      }
      if (ag) ag.cart = null;
    }
    if (ag && ag.role !== 'owner') this.milestone('first_delegated');
    this.emit('task_done', { type: t.type });
  }

  // ============================================================ NAMES / QUERIES
  objName(o) {
    if (!o) return '';
    switch (o.type) {
      case 'unit': return o.name;
      case 'door': return { std: 'Standard', wide: 'Wide Sliding', auto: 'Automatic' }[o.kind] + ' Door';
      case 'gate': return 'Gate Keypad';
      case 'hvac': return 'HVAC Plant';
      case 'stairs': return 'Stairwell';
      case 'power': return 'Electrical Service';
      case 'water': return 'Water Service';
      case 'fountain': return 'Water Fountain';
      case 'corral': return o.name || 'Cart Corral';
      case 'shell': return `Building (${o.floors} floor${o.floors > 1 ? 's' : ''})`;
      default: return o.type[0].toUpperCase() + o.type.slice(1);
    }
  }
  rentRoll() { return Object.values(this.s.leases).reduce((a, L) => a + L.rent, 0); }
  occupancy() {
    const us = this.objs('unit').filter((u) => u.cstate === 'operating');
    const occ = us.filter((u) => u.lease).length; return { n: us.length, occ, pct: us.length ? occ / us.length : 0 };
  }
  collected(days = 30) { return this.s.days.slice(-days).reduce((a, d) => a + d.rent, 0) + this.s.today.rent; }
  toText() {
    const s = this.s; const o = this.occupancy();
    return JSON.stringify({
      coords: 'grid x right, y down; street at bottom', mode: s.mode, day: this.day, time: fmtTime(s.t), speed: s.speed, cash: Math.round(s.cash), open: s.open,
      occupancy: `${o.occ}/${o.n}`, rentRoll: this.rentRoll(), tut: s.tut.on ? s.tut.beat : 'off',
      orders: s.orders.filter((x) => x.st === 'construction').map((x) => ({ id: x.id, label: x.label, prog: +x.prog.toFixed(2) })),
      ready: this.objs('unit').filter((u) => u.cstate === 'ready').map((u) => u.num),
      built: this.objs('unit').filter((u) => u.cstate === 'built').map((u) => ({ n: u.num, missing: u.missing })),
      tasks: s.tasks.map((t) => ({ id: t.id, label: t.label, a: t.assigned, pri: t.pri })),
      agents: s.agents.filter((a) => !a.hidden).map((a) => ({ k: a.kind, r: a.role || a.vt, st: a.st, f: a.f, x: +a.x.toFixed(1), y: +a.y.toFixed(1), cart: !!a.cart })),
      vehicles: s.vehicles.length, carts: s.carts.map((c) => c.st), staff: s.staff.map((x) => x.role), milestones: Object.keys(s.milestones),
      convos: s.convos.map((c) => c.text), lost: s.lost,
    });
  }
}
