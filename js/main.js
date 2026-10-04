// Boot, fixed-step simulation loop, input, save/load, test hooks.
import { FINANCIAL_MINUTE } from './finance.js';
import { Sim, fmtTime } from './sim.js';
import { TICKS_PER_SEC_1X, TIERS } from './data.js';
import { makeMaple, makeEmptyLot } from './maple.js';
import { makeScenario, makeSandbox, SCENARIOS, modeLabel, sandboxName } from './scenarios.js';
export { modeLabel };
import { MARKETS, MIN_PER_DAY, ROLES } from './data.js';
import { installTutorial } from './tutorial.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { Audio } from './audio.js';
import { cloud } from './cloud.js';
import { localsave } from './localsave.js';
import { BUILD } from './version.js';
import { installShowcase } from './showcase.js';

Renderer.prototype.setSim = function (sim) {
  this.sim = sim; this.resizeWorld();
  for (const k of ['veh', 'ppl', 'cart']) { for (const m of this.pool[k].values()) { this.dynG.remove(m); this.disposeTree(m); } this.pool[k].clear(); }
  this.lastStruct = -1; this.setPreview(null); this.setSelection(null); this.setFocus(null);
};

const canvas = document.getElementById('view');
// HUD subtitle: Maple stops saying "Tutorial" once the player graduates
const game = {
  sim: null, rend: null, ui: null, audio: new Audio(), showFps: false, acc: 0,
  company: null,
  newGame(kind, opts) {
    let sim, name;
    if (kind && kind.startsWith('sc:')) { sim = makeScenario(kind.slice(3)); name = SCENARIOS[kind.slice(3)].name; }
    else if (kind === 'custom') { sim = makeSandbox(opts); name = sandboxName(sim.s); }
    else if (kind === 'empty' || kind === 'creative') { sim = makeSandbox({ kind: kind === 'creative' ? 'free' : 'business' }); name = kind === 'creative' ? 'Free Build Lot' : 'Empty Lot'; sim.s.sb.name = name; } // quick starts (menu, tests)
    else if (kind === 'maple') { sim = makeMaple(); name = 'Maple Street Storage'; }
    else { sim = makeEmptyLot({ creative: kind === 'creative' }); name = kind === 'creative' ? 'Creative Lot' : 'Empty Lot'; }
    this.company = { props: [{ name, sim }], active: 0, feed: [] };
    this.attach(sim, kind);
  },
  metaName() { const C = this.company; if (!C) return null; const p = C.props[C.active]; return p.name + (C.props.length > 1 ? ` (${C.active + 1}/${C.props.length})` : ''); },
  switchProperty(k) {
    const C = this.company; if (!C || !C.props[k] || k === C.active) return;
    const speed = this.sim.s.speed; C.active = k; const sim = C.props[k].sim; sim.s.speed = speed;
    this.attach(sim, 'switch');
  },
  tierInfo() { // operator career: portfolio-wide rent roll + property count
    const props = this.company ? this.company.props : [{ sim: this.sim }];
    const roll = props.reduce((a, p) => a + p.sim.rentRoll(), 0), n = props.length;
    let cur = TIERS[0]; for (const T of TIERS) if (roll >= T.roll && n >= T.props) cur = T;
    return { cur, next: TIERS.find((T) => T.n === cur.n + 1) || null, roll, n };
  },
  syncTier() { // runs once a game-hour; tiers never go down
    const s = this.sim.s; if (s.creative || s.scenario || (s.mode === 'tutorial' && !s.tut.done)) return;
    const ti = this.tierInfo(); const props = this.company ? this.company.props : [{ sim: this.sim }];
    for (const p of props) if ((p.sim.s.coTier || 1) < ti.cur.n) p.sim.dispatch({ type: 'coTier', tier: ti.cur.n });
  },
  offers() { // acquisition offers (GDD §46)
    const day = this.sim.day, n = this.company ? this.company.props.length : 1;
    const out = [];
    const tier = this.sim.s.coTier || 1;
    for (const m of ['blank', 'urban', 'rural']) if (m === 'blank' || tier >= 3) out.push({ kind: 'parcel', market: m, name: `Empty parcel · ${MARKETS[m].name}`, desc: 'Raw land with street frontage. Build it from scratch.', price: { blank: 45000, urban: 70000, rural: 25000 }[m] * (1 + 0.1 * (n - 1)) });
    const mp = makeMapleSeedPrice(day);
    const fac = FACILITY_NAMES.find((nm) => !(this.company ? this.company.props : []).some((p) => p.name === nm)) || 'Oak Ridge Storage';
    out.push({ kind: 'facility', market: 'maple', name: 'Operating facility · ' + fac, fac, desc: '23 units, mostly leased, some deferred maintenance. Rent roll comes with it.', price: mp });
    return out.map((o) => ({ ...o, price: Math.round(o.price / 1000) * 1000 + WORKING_FLOAT })); // price includes the new property's opening working cash
  },
  acquire(kind, market) {
    const C = this.company, src = this.sim; if (!C) return { ok: false, msg: 'No company' };
    if (C.props.length >= 5) return { ok: false, msg: 'Portfolio is limited to 5 properties' };
    const of = this.offers().find((o) => o.kind === kind && o.market === market); if (!of) return { ok: false, msg: 'Offer not available' };
    if (src.s.cash < of.price) return { ok: false, msg: 'Not enough cash at this property' };
    let sim, name;
    if (kind === 'parcel') { sim = makeSandbox({ market, cash: 0, plain: true }); name = { blank: 'Suburban Lot', urban: 'Urban Lot', rural: 'Highway Lot' }[market] + ' ' + (C.props.length + 1); }
    else {
      const k = C.props.filter((p) => p.sim.s.mirror != null || FACILITY_NAMES.includes(p.name)).length;
      sim = makeMaple(1000 + C.props.length * 77, { mirror: k % 2 === 0 }); const s = sim.s; s.mode = 'sandbox'; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = true; s.cash = 0; name = of.fac;
      if (!s.mirror) s.mirror = false;
      for (const g of sim.objs('gate')) g.cond = 0.55 + ((C.props.length * 13) % 20) / 100;
      for (const o of sim.objs('light')) o.cond = 0.5 + ((o.id * 37) % 40) / 100;
    }
    // align to the company clock
    const t = src.s.t, d = src.day, s = sim.s, dt = t - s.t;
    s.t = t; s.finance.lastDay = t % MIN_PER_DAY <= FINANCIAL_MINUTE ? d - 1 : d; s.finance.observedFrom = d; s.today = { day: d, rent: 0, other: 0, opex: 0, payroll: 0, capex: 0, leases: 0, moveouts: 0, prospects: 0, lost: 0 };
    for (const v of s.visits) v.t += dt;
    for (const L of Object.values(s.leases)) { L.nextBill += d - 1; L.start += d - 1; }
    for (const u of sim.objs('unit')) if (u.vacatedAt != null) u.vacatedAt += dt;
    for (const tk of s.tasks) tk.created += dt;
    for (const a of s.agents) { if (a.t0 != null) a.t0 += dt; }
    s.milestones = {}; s.speed = 0; sim.markDirty(); sim.rebuild();
    src.money(-of.price, 'capex', 'Acquisition: ' + name);
    sim.money(WORKING_FLOAT, 'other', 'Opening working cash from ' + C.props[C.active].name);
    C.props.push({ name, sim }); if (this.ui) this.ui.setMeta(this.metaName(), modeLabel(src.s));
    this.note(C.active, `Acquired ${name} for $${of.price.toLocaleString()}`);
    return { ok: true, msg: `Acquired ${name}. Open the Portfolio to switch to it and send it cash.` };
  },
  transfer(from, to, amt) {
    const C = this.company; const A = C && C.props[from], B = C && C.props[to]; if (!A || !B || from === to || !Number.isFinite(amt) || amt <= 0) return { ok: false, msg: 'Invalid transfer' };
    if (A.sim.s.cash < amt) return { ok: false, msg: 'Not enough cash' };
    A.sim.money(-amt, 'other', 'Transfer to ' + B.name); B.sim.money(amt, 'other', 'Transfer from ' + A.name);
    return { ok: true, msg: `Sent $${amt.toLocaleString()} to ${B.name}` };
  },
  note(k, msg) { const C = this.company; const p = C.props[k]; C.feed.unshift({ k, prop: p.name, msg, t: p.sim.s.t }); C.feed.length = Math.min(C.feed.length, 30); },
  attach(sim, kind) {
    this.sim = sim; this.acc = 0; installTutorial(sim); // tutorial beats (Maple) + optional lessons (any non-scenario property)
    if (this.rend) this.rend.setSim(sim);
    if (this.ui) {
      this.ui.tool = null; this.ui.sel = null; this.ui.plan = null; this.ui.setTab(null); this.ui.renderActionBar();
      const s = sim.s; this.ui.setMeta(this.metaName() || (s.mode === 'tutorial' ? 'Maple Street Storage' : s.creative ? 'Creative Lot' : 'Empty Lot'), modeLabel(s));
      this.ui.hF2 = null; this.ui.renderTut(true); this.ui.renderFeed(true);
    }
    this.rend.lookAt(sim.s.market.id === 'maple' ? (sim.s.mirror ? sim.s.W - 17 : 16) : Math.round(sim.s.W / 2) - 1, sim.s.market.id === 'maple' ? 16 : Math.round(sim.s.H * 0.6));
    this.rend.zoom = (sim.s.mode === 'tutorial' ? 1.05 : 0.95) * (window.innerWidth < 600 ? 0.8 : 1); this.rend.updateCamera();
    if (this.ui && this.ui.phone()) { this.rend.fitProperty(this.ui.safeRect()); setTimeout(() => this.rend.fitProperty(this.ui.safeRect()), 60); }
    sim.events.length = 0; sim.poll(); this.drain();
  },
  drain() { const ev = this.sim.events; if (!ev.length) return; this.sim.events = []; if (this.sim === this.demo && this.ui && this.ui.title) return; /* the living title screen stays quiet */ for (const e of ev) this.ui.onEvent(e); },
  saveJSON() {
    const C = this.company;
    return C && C.props.length > 1 ? JSON.stringify({ company: 1, active: C.active, feed: C.feed, props: C.props.map((p) => ({ name: p.name, s: p.sim.s })) }) : JSON.stringify(this.sim.s);
  },
  rawSaveCode(json) { return 'SST0.' + btoa(unescape(encodeURIComponent(json))); },
  async saveCode(json = this.saveJSON()) {
    try {
      const cs = new CompressionStream('gzip'); const buf = await new Response(new Blob([json]).stream().pipeThrough(cs)).arrayBuffer();
      let bin = ''; const b = new Uint8Array(buf); for (let i = 0; i < b.length; i += 0x8000) bin += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000));
      return 'SST1.' + btoa(bin);
    } catch (e) { return this.rawSaveCode(json); }
  },
  async loadCode(code) {
    try {
      code = (code || '').trim(); let json;
      if (code.startsWith('SST1.')) { const bin = atob(code.slice(5)); const b = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) b[i] = bin.charCodeAt(i); json = await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).text(); }
      else if (code.startsWith('SST0.')) json = decodeURIComponent(escape(atob(code.slice(5))));
      else json = code;
      const st = sanitizeSave(JSON.parse(json));
      if (!st || typeof st !== 'object') return false;
      if (st && st.company && Array.isArray(st.props) && st.props.length) {
        if (st.props.length > 12 || !st.props.every((p) => p && typeof p.name === 'string' && validState(p.s)) || !Number.isInteger(st.active ?? 0) || (st.active ?? 0) < 0 || (st.active ?? 0) >= st.props.length || (st.feed != null && !Array.isArray(st.feed))) return false;
        const props = st.props.map((p) => ({ name: p.name, sim: new Sim(p.s) })); for (const p of props) p.sim.s.speed = 0;
        this.company = { props, active: st.active ?? 0, feed: st.feed || [] };
        this.attach(props[this.company.active].sim); this.ui.title = false; return true;
      }
      if (!validState(st)) return false;
      st.speed = 0; const sim = new Sim(st);
      this.company = { props: [{ name: st.scenario ? st.scenario.name : st.mode === 'tutorial' ? 'Maple Street Storage' : st.creative ? 'Creative Lot' : sandboxName(st) || 'My Property', sim }], active: 0, feed: [] };
      this.attach(sim); this.ui.title = false; return true;
    } catch (e) { console.warn(e); return false; }
  },
  saveMeta() {
    const C = this.company, s = this.sim.s, p = C && C.props[C.active];
    return { name: p ? p.name : 'Property', mode: modeLabel(s), day: this.sim.day, time: fmtTime(s.t), cash: Math.round(s.cash), props: C ? C.props.length : 1, build: BUILD.name };
  },
  // autosave: whenever a game is running (not on the title screen); `hide` uses a keepalive request
  async autosave(hide) {
    if (!this.ui || this.ui.title || (this.saving && !hide)) return false;
    const seq = this.saveSeq = (this.saveSeq || 0) + 1;
    const company = this.company, sim = this.sim;
    // Capture both before compression yields. Leaving must reach local storage synchronously.
    const json = this.saveJSON(), meta = this.saveMeta(), day = sim.day;
    this.saving = true;
    try {
      const code = hide ? this.rawSaveCode(json) : await this.saveCode(json);
      if (seq !== this.saveSeq || company !== this.company) return false;
      const local = localsave.put(code, meta);
      if (hide) { if (cloud.ok !== false || !local) cloud.beacon(code, meta); return local; }
      const remote = cloud.ok === false && local ? false : await cloud.put(code, meta);
      return local || remote;
    }
    catch (e) { return false; } finally {
      if (seq === this.saveSeq) { this.saving = false; this.lastAuto = performance.now(); this.lastAutoDay = company === this.company ? day : -1; }
    }
  },
  cloud,
  // before New game / Load replaces what the player has: copy it to the kept slot (browser storage only)
  async keepCurrent(fallback) {
    if (!localsave.ok) return false;
    if (this.sim !== this.demo && this.ui && !this.ui.title) { const meta = this.saveMeta(), json = this.saveJSON(); const code = await this.saveCode(json); return localsave.keep({ code, meta, at: Math.floor(Date.now() / 1000) }); }
    const L = localsave.get(); return localsave.keep(L.main || fallback);
  },
  modeLabel,
  playing() { return this.sim !== this.demo && this.ui && !this.ui.title; },
  async saveFile() {
    const code = await this.saveCode(); const fname = `storage-day${Math.floor(this.sim.s.t / 1440) + 1}.sst`;
    try { // iPhone: the share sheet offers "Save to Files", which a download link does not do reliably
      const f = new File([code], fname, { type: 'text/plain' });
      if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] }) && matchMedia('(pointer: coarse)').matches) { await navigator.share({ files: [f], title: 'Self Storage Tycoon save' }); return; }
    } catch (e) { if (e && e.name === 'AbortError') return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([code], { type: 'text/plain' })); a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  },
};

// initial world behind the title screen: a live, already-running Maple Street (not the tutorial copy the player gets)
function makeDemo() {
  const sim = makeMaple(4242); const s = sim.s;
  s.mode = 'sandbox'; s.tut = { on: false, beat: 99, flags: {}, done: true }; s.open = true; s.speed = 0;
  for (let i = 0; i < 200; i++) { sim.step(); sim.events.length = 0; } // warm up: morning traffic already on the lot
  return sim;
}
game.sim = game.demo = makeDemo();
game.company = { props: [{ name: 'Maple Street Storage', sim: game.sim }], active: 0, feed: [] };
const WORKING_FLOAT = 5000;
const FACILITY_NAMES = ['Oak Ridge Storage', 'Cedar Point Storage', 'Willow Creek Storage', 'Pine Hollow Storage'];
// Save codes are user-supplied: neutralise markup characters in every string and drop prototype keys,
// so a crafted save cannot inject HTML into the UI (strings are rendered via template literals).
// Structural check for an imported property state: reject anything the simulation could not run safely.
function validState(st) {
  if (!st || typeof st !== 'object') return false;
  const W = st.W, H = st.H, isInt = (n) => Number.isInteger(n);
  if (!isInt(W) || !isInt(H) || W < 12 || H < 12 || W > 96 || H > 96) return false;
  const WH = W * H, arr = (a, n) => Array.isArray(a) && a.length === n && a.every((x) => typeof x === 'number');
  if (!arr(st.ground, WH)) return false;
  for (const k of ['hall', 'dirt']) if (st[k] && !(Array.isArray(st[k]) && st[k].length === 2 && st[k].every((l) => arr(l, WH)))) return false;
  if (!st.objects || typeof st.objects !== 'object' || Array.isArray(st.objects)) return false;
  for (const o of Object.values(st.objects)) { if (!o || typeof o !== 'object' || typeof o.type !== 'string' || !isInt(o.x) || !isInt(o.y) || o.x < -2 || o.y < -2 || o.x > W + 2 || o.y > H + 2) return false; }
  for (const k of ['orders', 'carts', 'vehicles', 'agents', 'staff', 'tasks', 'ledger', 'days']) if (st[k] != null && !Array.isArray(st[k])) return false;
  if (!(st.staff || []).every((x) => x && typeof x.role === 'string' && ROLES[x.role])) return false;
  if (typeof st.t !== 'number' || st.t < 0 || typeof st.cash !== 'number') return false;
  if (!st.market || !MARKETS[st.market.id]) return false;
  if (st.finance) {
    const F = st.finance;
    if (F.version !== 1 || !isInt(F.lastDay) || F.lastDay < 0 || F.lastDay > Math.floor(st.t / MIN_PER_DAY) + 1 || !isInt(F.cycle) || F.cycle < 0 || F.cycle > 6) return false;
    if (!F.accrued || !['opex', 'payroll', 'interest'].every((k) => Number.isFinite(F.accrued[k]) && F.accrued[k] >= 0) || !Array.isArray(F.cashDays)) return false;
  }
  return true;
}
function sanitizeSave(v, depth = 0) {
  if (depth > 40) return null;
  if (typeof v === 'string') return v.replace(/[<>"`]/g, '').replace(/'/g, '\u2019').slice(0, 2000);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (Array.isArray(v)) return v.map((x) => sanitizeSave(x, depth + 1));
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) { if (k === '__proto__' || k === 'constructor' || k === 'prototype') continue; o[k.replace(/[<>"'`]/g, '')] = sanitizeSave(v[k], depth + 1); } return o; }
  return v;
}
function makeMapleSeedPrice(day) { return 95000 + (day % 7) * 1500; }
game.rend = new Renderer(canvas, game.sim);
game.ui = new UI(game);
game.attach(game.sim, 'maple');
installShowcase(game);
window.__game = game;


// ---------------------------------------------------------------- simulation stepping
const BG_EVENTS = { fault: (e, sm) => e.sev === 'critical' ? `${sm.objName(sm.s.objects[e.obj]) || 'Equipment'} failed` : null, cash_warn: (e) => e.msg, access_lost: (e) => `${e.n > 1 ? e.n + ' units' : e.name} lost customer access`, power_shed: (e) => `Power exceeded - ${e.name} shut off`, moveout: () => 'A tenant moved out', lease: () => 'New lease signed', scenario_end: (e) => e.won ? 'Scenario complete' : 'Scenario failed' };
function stepTicks(n) {
  const sim = game.sim, C = game.company;
  const others = C ? C.props.map((p, k) => ({ p, k })).filter((x) => x.p.sim !== sim) : [];
  for (let i = 0; i < n; i++) {
    sim.step(); if (sim.events.length > 400) game.drain(); if (sim.s.t % 60 === 0) game.syncTier();
    for (const { p, k } of others) {
      p.sim.step();
      for (const e of p.sim.events) { const f = BG_EVENTS[e.type]; const msg = f && f(e, p.sim); if (msg) { game.note(k, msg); if (e.type !== 'lease' && e.type !== 'moveout') game.ui.toast(`${p.name}: ${msg}`, 'bad'); } }
      p.sim.events.length = 0;
    }
  }
  game.drain();
}
let last = performance.now(), fpsT = 0, fpsN = 0, weatherFxNext = performance.now() + 12000;
game.rdt = 0; game.lastDraw = 0; game.lastInput = performance.now(); game.battery = false; game.autoQ = true;
// adaptive graphics: if the device can't hold ~36 fps for a few seconds of active play, step quality down (never back up mid-session)
let pwT = 0, pwN = 0, pwCool = performance.now() + 4000;
function perfWatch(dt, throttled) {
  if (throttled || document.hidden || !game.autoQ) { pwT = 0; pwN = 0; return; }
  pwT += dt; pwN++;
  if (pwT < 3) return;
  const fps = pwN / pwT; pwT = 0; pwN = 0;
  const now = performance.now(); if (now < pwCool) return;
  if (fps < 36 && game.rend.quality > 0) { game.rend.setQuality(game.rend.quality - 1); pwCool = now + 5000; game.ui.toast(game.rend.quality === 1 ? 'Graphics lowered for smoother play' : 'Graphics set to low for smoother play'); }
}
for (const ev of ['pointerdown', 'pointermove', 'wheel', 'keydown', 'touchstart']) window.addEventListener(ev, () => { game.lastInput = performance.now(); }, { capture: true, passive: true });
function loop(now) {
  try { tick(now); } catch (e) { console.error('loop', e && e.stack || e); }
  requestAnimationFrame(loop);
}
function tick(now) {
  if (window.__qaHold) { last = now; return; } // test hook: automated screenshots drive frames manually
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const s = game.sim.s;
  if (s.speed > 0 && !game.ui.title && !game.ui.modalOpen()) {
    game.acc += dt * TICKS_PER_SEC_1X * s.speed;
    const n = Math.min(Math.floor(game.acc), 240); game.acc -= n; if (game.acc > 20) game.acc = 0;
    if (n) stepTicks(n);
  } else if (game.ui.title && game.sim === game.demo && !document.hidden) { // living title screen: the demo property keeps operating
    game.acc += dt * TICKS_PER_SEC_1X; const n = Math.min(Math.floor(game.acc), 40); game.acc -= n; if (n) stepTicks(n);
  } else { game.sim.poll(); game.drain(); }
  if (!game.ui.title) { // autosave each in-game day and at least once a minute of play
    if (game.lastAutoDay == null) { game.lastAutoDay = game.sim.day; game.lastAuto = now; }
    else if (!game.saving && (game.sim.day !== game.lastAutoDay || (now - game.lastAuto > 60000 && s.speed > 0))) game.autosave();
  }
  // battery: when nothing is moving (paused, title or a dialog) and the player is idle, redraw ~4x a second;
  // battery saver caps drawing at ~30 fps. Simulation timing is unaffected.
  game.rdt += dt;
  const idle = (s.speed === 0 || game.ui.title || game.ui.modalOpen()) && now - game.lastInput > 1500 && Math.abs(game.rend.targetAz - game.rend.azimuth) < 1e-3 && game.rend.camV === game.drawCamV;
  const minGap = idle ? 250 : game.battery ? 32 : 0;
  if (now - game.lastDraw < minGap) return;
  const rdt = Math.min(0.25, game.rdt); game.rdt = 0; game.lastDraw = now; game.drawCamV = game.rend.camV;
  game.rend.frame(rdt);
  game.ui.update(rdt);
  perfWatch(rdt, idle || minGap > 0);
  const night = game.rend.ambient.intensity / 0.9;
  const sc = game.showcase, amode = game.ui.title ? 'title' : sc && sc.photo ? 'photo' : (s.speed === 0 || game.ui.modalOpen()) ? 'quiet' : game.ui.tool ? 'build' : night > 0.6 ? 'night' : 'day';
  const raining = (game.rend.weatherOverride || s.weather) === 'rain', weatherPlaying = raining && s.speed > 0 && !game.ui.modalOpen();
  game.audio.update({ night, rain: weatherPlaying, hvac: game.sim.objs('hvac').filter((h) => game.sim.works(h)).length, speed: s.speed, mode: amode });
  if (!game.ui.title && weatherPlaying && now >= weatherFxNext) {
    game.rend.lightning();
    game.audio.thunder(0.45 + Math.random() * 1.25);
    weatherFxNext = now + 9000 + Math.random() * 19000;
  } else if (!weatherPlaying && now >= weatherFxNext) weatherFxNext = now + 8000;
  fpsN++; fpsT += dt; if (fpsT > 0.5) { if (game.showFps) document.getElementById('fps').textContent = `${Math.round(fpsN / fpsT)} fps · ${game.sim.s.agents.length} agents`; fpsN = 0; fpsT = 0; }
}
requestAnimationFrame(loop);
window.addEventListener('resize', () => game.rend.resize());
window.addEventListener('pagehide', () => { if (!document.hidden) game.autosave(true); });
// offer "Continue" on the title screen: newest of the browser autosave and the save server, with the browser backup as fallback
game.localsave = localsave; game.BUILD = BUILD;
{ const L = localsave.get(); const pick = (d, src) => d ? { ...d, src } : null;
  const offer = (cl) => { const cands = [pick(L.main, 'browser'), pick(cl, 'server')].filter(Boolean).sort((a, b) => (b.at || 0) - (a.at || 0));
    game.ui.contSave = cands[0] || pick(L.backup, 'backup'); game.ui.contBackup = L.main && L.backup ? pick(L.backup, 'backup') : null; if (game.ui.title) game.ui.showTitle(); };
  offer(null); cloud.get().then((d) => offer(d)); }

// ---------------------------------------------------------------- input
const ptrs = new Map(); let drag = null; let pinch = null; let buildHold = null; let lastMapTap = null;
const BUILD_HOLD_MS = 240;
const DOUBLE_TAP_MS = 320, DOUBLE_TAP_PX = 28;
const mapTap = (e) => {
  const now = performance.now();
  const prev = lastMapTap;
  const isDouble = prev && now - prev.t <= DOUBLE_TAP_MS && Math.hypot(e.clientX - prev.x, e.clientY - prev.y) <= DOUBLE_TAP_PX;
  if (isDouble) {
    lastMapTap = null;
    game.rend.zoomAt(e.clientX, e.clientY, 1.65);
    return;
  }
  lastMapTap = { t: now, x: e.clientX, y: e.clientY };
  game.ui.tapMap(game.rend.cellAt(e.clientX, e.clientY), e.clientX, e.clientY);
};
const cancelBuildHold = () => { if (buildHold) clearTimeout(buildHold); buildHold = null; };
canvas.addEventListener('pointerdown', (e) => {
  game.audio.unlock(); canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY });
  game.ui.pointerBusy = true;
  if (ptrs.size === 2) { lastMapTap = null; cancelBuildHold(); const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2 }; drag = null; return; }
  const panBtn = e.button === 1 || e.button === 2 || e.shiftKey;
  const building = !!game.ui.tool && !panBtn;
  const holdBuild = building && (e.pointerType === 'touch' || e.pointerType === 'pen');
  drag = { mode: holdBuild ? 'buildPending' : building ? 'build' : 'pan', moved: false, x: e.clientX, y: e.clientY, pointerId: e.pointerId };
  if (building && !holdBuild) game.ui.placeStart(game.rend.cellAt(e.clientX, e.clientY));
  if (holdBuild) {
    cancelBuildHold();
    buildHold = setTimeout(() => {
      buildHold = null;
      const p = ptrs.get(e.pointerId);
      if (!p || !drag || drag.pointerId !== e.pointerId || drag.mode !== 'buildPending') return;
      drag.mode = 'build';
      game.ui.placeStart(game.rend.cellAt(p.x0, p.y0));
      game.ui.placeMove(game.rend.cellAt(p.x, p.y));
    }, BUILD_HOLD_MS);
  }
});
canvas.addEventListener('pointermove', (e) => {
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()]; const d = Math.hypot(a.x - b.x, a.y - b.y), cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
    if (pinch.d > 0) game.rend.zoomBy(d / pinch.d); game.rend.pan(cx - pinch.cx, cy - pinch.cy); pinch = { d, cx, cy }; return;
  }
  if (!drag) return;
  const dist = Math.hypot(e.clientX - p.x0, e.clientY - p.y0);
  if (dist > 7) { drag.moved = true; lastMapTap = null; }
  if (drag.mode === 'buildPending') {
    if (drag.moved) { cancelBuildHold(); drag.mode = 'pan'; game.rend.pan(dx, dy); }
    return;
  }
  if (drag.mode === 'pan') { if (drag.moved) game.rend.pan(dx, dy); }
  else game.ui.placeMove(game.rend.cellAt(e.clientX, e.clientY));
});
function up(e) {
  const p = ptrs.get(e.pointerId); ptrs.delete(e.pointerId);
  if (ptrs.size === 0) { game.ui.pointerBusy = false; game.ui.finishPlacement(); }
  if (pinch) { if (ptrs.size < 2) pinch = null; cancelBuildHold(); drag = null; return; }
  if (drag && drag.pointerId === e.pointerId && drag.mode === 'buildPending') cancelBuildHold();
  if (drag && drag.mode === 'pan' && !drag.moved && p && e.type === 'pointerup') mapTap(e);
  drag = null;
}
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
canvas.addEventListener('contextmenu', (e) => e.preventDefault());
// iPhone Safari ignores user-scalable=no: block page pinch/double-tap zoom so gestures drive the camera only
for (const ev of ['gesturestart', 'gesturechange', 'gestureend']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
document.addEventListener('dblclick', (e) => e.preventDefault(), { passive: false });
// iOS only unlocks WebAudio from touchend/click, and suspends ("interrupted") it when the app is backgrounded
for (const ev of ['touchend', 'click', 'keydown']) document.addEventListener(ev, () => game.audio.unlock(), { capture: true, passive: true });
try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* Safari 17+ only */ }
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { game.wasSpeed = game.sim.s.speed; game.sim.s.speed = 0; if (game.audio.ctx) game.audio.ctx.suspend(); game.autosave(true); }
  else { if (game.wasSpeed != null && game.sim.s.speed === 0) game.sim.s.speed = game.wasSpeed; game.wasSpeed = null; last = performance.now(); if (game.ui) game.ui.update && game.ui.update(true); }
});
// iOS can drop the WebGL context under memory pressure; rebuild the scene when it comes back
canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); });
canvas.addEventListener('webglcontextrestored', () => { const r = game.rend; r.lastStruct = -1; r.lastGroundT = -1e9; r.scene.traverse((o) => { const m = o.material; if (m) for (const mm of [].concat(m)) if (mm.map) mm.map.needsUpdate = true; }); });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); game.rend.zoomBy(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
window.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
  const ui = game.ui;
  if (e.key === ' ') { e.preventDefault(); ui.do({ type: 'speed', v: game.sim.s.speed ? 0 : 1 }); }
  else if (e.key === '1' || e.key === '2' || e.key === '3') ui.do({ type: 'speed', v: [1, 2, 4][+e.key - 1] });
  else if (e.key === 'q' || e.key === 'Q') game.rend.rotate(-1);
  else if (e.key === 'e' || e.key === 'E') game.rend.rotate(1);
  else if ((e.key === 'p' || e.key === 'P') && !ui.title) { const sc = game.showcase; if (sc.photo) sc.exitPhoto(); else sc.enterPhoto(); }
  else if (e.key === 'Escape' && game.showcase && game.showcase.photo) game.showcase.exitPhoto();
  else if (e.key === 'Escape' && game.showcase && (game.showcase.mode === 'tour' || game.showcase.mode === 'follow')) { game.showcase.stopTour(); game.showcase.stopFollow(); }
  else if (e.key === 'Escape') { if (ui.tool) ui.pickTool(null); else ui.select(null); }
  else if (e.key === 'Enter' && ui.plan) ui.confirmPlan();
  else if (e.key === 'f' || e.key === 'F') { game.showFps = !game.showFps; document.getElementById('fps').hidden = !game.showFps; }
  else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) { const k = 40; game.rend.pan(e.key === 'ArrowLeft' ? k : e.key === 'ArrowRight' ? -k : 0, e.key === 'ArrowUp' ? k : e.key === 'ArrowDown' ? -k : 0); }
});

// ---------------------------------------------------------------- test hooks
window.render_game_to_text = () => {
  const t = JSON.parse(game.sim.toText());
  t.view = game.rend.view; t.tab = game.ui.tab; t.tool = game.ui.tool; t.plan = game.ui.plan ? { status: game.ui.plan.status, reasons: game.ui.plan.reasons, missing: game.ui.plan.missing, cost: game.ui.plan.cost } : null;
  t.selected = game.ui.sel; t.title = game.ui.title;
  return JSON.stringify(t);
};
window.advanceTime = (ms) => {
  const s = game.sim.s; const n = Math.round((ms / 1000) * TICKS_PER_SEC_1X * Math.max(1, s.speed));
  stepTicks(n); game.rend.frame(ms / 1000); game.ui.update(ms / 1000);
};
