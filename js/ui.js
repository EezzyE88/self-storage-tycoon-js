// HTML UI: HUD, modes, build palette + PLACE→PREVIEW→CONFIRM, inspector, feed, tutorial, overlays, save/load.
import { TOOLS, CATEGORIES, ROLES, SIZES, MARKETS, CART_COST, OFFICE_HOURS, TIERS, FLOOR_H } from './data.js';
import { fmtTime, dayOf, productKey } from './sim.js';
import { BEATS, toolUnlocked, unlockBeat, stepState, curBeat, LESSONS, lessonById, lessonAllowed } from './tutorial.js';
import { SCENARIOS, scenarioProgress, SB_PRESETS, sbDefaults } from './scenarios.js';
import { financialTime } from './finance.js';
import { guideFor } from './handbook.js';
import { verticalLayout, verticalDone, verticalCheck, authoredPlacement } from './blueprint.js';

const PIN = {
  repair: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 5.5a4 4 0 0 0 4.9 4.9l-8.3 8.3a2 2 0 0 1-2.8-2.8l8.3-8.3"/><path d="M14.5 5.5 17 3"/></svg>',
  makeready: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3v9"/><path d="M6 21l2-9h8l2 9"/><path d="M9 16v5M12 16v5M15 16v5"/></svg>',
  clean: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z"/></svg>',
  lock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
  auction: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4l6 6"/><path d="M11 7l6 6"/><path d="M12.5 5.5l-4 4 6 6 4-4"/><path d="M10 12l-7 7"/><path d="M3 21h8"/></svg>',
  late: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v18"/><path d="M16.5 7.5c-.7-1.2-2.3-2-4.5-2-2.8 0-4.5 1.4-4.5 3.2 0 4.3 9 2.5 9 6.8 0 1.8-1.8 3.2-4.5 3.2-2.3 0-4-.9-4.7-2.2"/></svg>',
  blocked: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><circle cx="12" cy="12" r="8.5"/><path d="M7 12h10"/></svg>',
  power: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11h10.2L20 7H6.3"/><circle cx="9" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg>',
  ready: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  person: '<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7z"/></svg>',
  fit: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
};
const I = {
  pause: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>',
  menu: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  build: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M3 21h18M5 21V10l7-5 7 5v11"/><path d="M9 21v-6h6v6"/></svg>',
  operate: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-4 4-6 7-6s6 2 7 6"/></svg>',
  business: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>',
  growth: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/></svg>',
  rotL: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M4 12a8 8 0 1 0 3-6.2"/><path d="M4 4v5h5"/></svg>',
  rotR: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M20 12a8 8 0 1 1-3-6.2"/><path d="M20 4v5h-5"/></svg>',
  plus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  minus: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M5 12h14"/></svg>',
  view: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16M4 16h16"/><circle cx="9" cy="8" r="2"/><circle cx="15" cy="16" r="2"/></svg>',
  logo: '<svg viewBox="0 0 48 48" fill="none" aria-label="Self Storage Tycoon"><path d="M6 20 24 8l18 12" stroke="#f5c542" stroke-width="4" stroke-linejoin="round"/><rect x="9" y="21" width="30" height="21" rx="2" fill="currentColor"/><path d="M13 26h22M13 30.5h22M13 35h22" stroke="#16202b" stroke-width="2.2" opacity=".55"/></svg>',
};
const money = (v, dec = false) => (v < 0 ? '-' : '') + '$' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: dec ? 2 : 0, minimumFractionDigits: dec ? 2 : 0 });
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const pct = (v) => Math.round(v * 100) + '%';
const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const LOST = { noSize: 'Size not available', noClimate: 'Wanted climate control', noReady: 'Nothing rent-ready', price: 'Rent too high', convenience: 'Not convenient enough', shopping: 'Kept shopping', service: 'No one at the office' };
export const MILESTONES = { first_makeready: 'First make-ready', first_lease_after_turnover: 'Leased a turned-over unit', first_expansion: 'First expansion commissioned', first_cart_trip: 'Interior cart trip completed', first_repair: 'First repair', first_delegated: 'Delegated work completed', first_climate: 'Climate units open', first_upper: 'Upper floor open', graduated: 'Maple Street graduate', first_retention: 'Kept a tenant from leaving', first_auction: 'First lien auction', first_loan: 'Financed growth' };
const EXP = { access: 'Access', convenience: 'Convenience', cleanliness: 'Cleanliness', security: 'Security', climate: 'Climate', service: 'Service', value: 'Value', comfort: 'Comfort' };

export class UI {
  constructor(game) {
    this.g = game; this.root = document.getElementById('ui'); this.bubRoot = document.getElementById('bubbles');
    this.tab = null; this.cat = 'units'; this.tool = null; this.plan = null; this.planArgs = null; this.climate = false; this.flip = false;
    this.sel = null; this.toasts = []; this.bubbles = []; this.lastSheet = 0; this.tutMin = false; this.modal = null; this.title = true;
    this.root.innerHTML = `
      <div id="pins"></div><svg id="blueprint" aria-label="Suggested building placement"></svg>
      <div class="hud">
        <div class="chip brand">${I.logo}<div class="nm" id="pname">Maple Street Storage<small id="pmode">Tutorial</small></div></div>
        <div class="chip" data-a="finances" role="button" aria-label="Open finances"><div class="cash num" id="cash">$0<small>Cash</small></div><i id="goalbar" class="goalbar" hidden aria-hidden="true"><b></b></i></div>
        <div class="chip clock" data-a="calendar" role="button" aria-label="Open calendar"><b class="num" id="clock">7:00 AM</b><span id="date">Day 1</span><span class="sbflag" id="sbflag" hidden></span></div>
        <div class="spacer"></div>
        <div class="chip speed" id="speed"><button data-a="speed" data-v="0" aria-label="Pause">${I.pause}</button><button data-a="speed" data-v="1">1x</button><button data-a="speed" data-v="2">2x</button><button data-a="speed" data-v="4">4x</button></div>
        <button class="iconbtn" data-a="menu" aria-label="Menu">${I.menu}</button>
      </div>
      <div class="viewctl">
        <div class="seg floorseg" id="floors"><button data-a="view" data-v="ext" class="on">EXT</button><button data-a="view" data-v="0">F1</button><button data-a="view" data-v="1">F2</button></div>
        <div class="seg rotseg"><button data-a="rot" data-v="-1" aria-label="Rotate view left">${I.rotL}</button><button data-a="rot" data-v="1" aria-label="Rotate view right">${I.rotR}</button></div>
        <button class="viewmore" data-a="viewMore" aria-label="More camera controls" aria-expanded="false">${I.view}</button>
        <div class="viewextra">
          <div class="seg"><button data-a="zoom" data-v="1.25" aria-label="Zoom in">${I.plus}</button><button data-a="zoom" data-v="0.8" aria-label="Zoom out">${I.minus}</button><button data-a="fit" aria-label="Fit property">${PIN.fit}</button></div>
          <div class="seg"><button data-a="photo" aria-label="Photo mode" title="Photo mode (P)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg></button></div>
        </div>
      </div>
      <button class="coach" id="coach" data-a="coach" hidden><span class="ct" id="coachT"></span><span class="co" id="coachO"></span></button>
      <div class="feed" id="feed"></div>
      <div id="tut"></div>
      <div id="guide" hidden><i class="gring"></i><span class="glbl"></span></div>
      <div id="sheet"></div>
      <div id="abar"></div>
      <nav class="tabs" id="tabs">
        <button data-a="tab" data-v="build">${I.build}Build</button>
        <button data-a="tab" data-v="operate">${I.operate}Operate<span class="badge" id="taskBadge" hidden>0</span></button>
        <button data-a="tab" data-v="business">${I.business}Business</button>
        <button data-a="tab" data-v="growth">${I.growth}Growth</button>
      </nav>
      <div id="modal"></div>`;
    this.$ = (id) => document.getElementById(id);
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('pointerdown', (e) => { if (e.target.closest('.sheet, .modal, .tut, .actionbar')) this.menuTouch = true; }, true);
    const menuUp = () => { if (this.menuTouch) { this.menuTouch = false; this.menuScrollUntil = performance.now() + 200; } };
    window.addEventListener('pointerup', menuUp, true); window.addEventListener('pointercancel', menuUp, true);
    this.root.addEventListener('scroll', () => { this.menuScrollUntil = performance.now() + 200; }, { capture: true, passive: true });
    // phone sheets: swipe the grab bar / header up to expand, down to shrink or close
    let sw = null;
    this.root.addEventListener('pointerdown', (e) => { const h = e.target.closest('.sheet .grab, .sheet header'); if (!h || e.target.closest('button.x')) return; sw = { y: e.clientY, id: e.pointerId }; }, true);
    this.root.addEventListener('pointerup', (e) => {
      if (!sw || sw.id !== e.pointerId) return; const dy = e.clientY - sw.y; sw = null; if (Math.abs(dy) < 28) return;
      this.swipedAt = performance.now();
      if (dy < 0) this.sheetTall = true; else if (this.sheetTall) this.sheetTall = false; else { this.select(null); this.setTab(null); return; }
      this.applySheetSize();
    }, true);
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.showTitle();
  }
  get sim() { return this.g.sim; }
  get rend() { return this.g.rend; }
  sfx(k) { this.g.audio.play(k); }
  pauseForPopup(kind) {
    if (this.title) return;
    this.popupBlocks ||= new Set();
    if (this.popupBlocks.has(kind)) return;
    this.popupBlocks.add(kind);
    if (this.sim.s.speed !== 0) this.do({ type: 'speed', v: 0 });
  }
  resumePopup(kind) {
    if (!this.popupBlocks || !this.popupBlocks.has(kind)) return;
    this.popupBlocks.delete(kind);
    if (!this.popupBlocks.size && !this.title) this.do({ type: 'speed', v: 1 });
  }

  // ------------------------------------------------------------ clicks
  onClick(e) {
    const el = e.target.closest('[data-a]'); if (!el) return;
    this.g.audio.unlock();
    const a = el.dataset.a, v = el.dataset.v;
    switch (a) {
      case 'speed': if (!(this.popupBlocks && this.popupBlocks.size && +v > 0)) this.do({ type: 'speed', v: +v }); this.sfx('click'); break;
      case 'finances': this.showFinances(); this.sfx('click'); break;
      case 'calendar': this.showCalendar(); this.sfx('click'); break;
      case 'tab': this.setTab(this.tab === v ? null : v); this.sfx('tab'); break;
      case 'staffHelp': this.hireRoleFocus = ROLES[v] ? v : null; this.select(null); this.setTab('operate'); this.jumpSection('Hire capacity'); this.sfx('click'); break;
      case 'section': this.jumpSection(v); this.sfx('click'); break;
      case 'cat': this.cat = v; this.renderSheet(true); this.sfx('click'); break;
      case 'tool': this.pickTool(v); break;
      case 'goTool': if (TOOLS[v]) { this.select(null); this.cat = TOOLS[v].cat; this.setTab('build'); this.pickTool(v); } break; // opening checklist shortcuts
      case 'cancelTool': this.pickTool(null); break;
      case 'confirm': this.confirmPlan(); break;
      case 'flip': this.flip = !this.flip; this.replan(); break;
      case 'climate': this.climate = !this.climate; this.replan(); break;
      case 'view': this.setView(v === 'ext' ? 'ext' : +v); this.sfx('click'); break;
      case 'rot': this.rend.rotate(+v); this.sfx('click'); break;
      case 'zoom': this.rend.zoomBy(+v); break;
      case 'fit': this.rend.fitProperty(this.safeRect()); this.sfx('click'); break;
      case 'viewMore': { const ctl = el.closest('.viewctl'); const open = !ctl.classList.contains('open'); ctl.classList.toggle('open', open); el.setAttribute('aria-expanded', String(open)); this.sfx('click'); break; }
      case 'coach': this.runCoach(); break;
      case 'pin': { const k = el.dataset.k; const sel = k === 'cart' ? { kind: 'cart', id: +el.dataset.id } : k === 'dirt' ? { kind: 'dirt', f: +el.dataset.f, x: +el.dataset.x, y: +el.dataset.y } : +el.dataset.id; if (this.tool) this.pickTool(null); this.sfx('click'); this.select(sel); break; }
      case 'sheetGrow': if (performance.now() - (this.swipedAt || 0) < 350) break; this.sheetTall = !this.sheetTall; this.applySheetSize(); break;
      case 'overlay': { this.rend.setOverlay(this.rend.overlay === v ? null : v); this.renderSheet(true); this.sfx('click'); const L = { security: 'Security map: cross = dark and unwatched, stripe = lit only, dot = camera only, no mark = lit and on camera.', clean: 'Cleanliness map: cross = dirty, stripe = getting dirty.', carts: 'Cart map: cross = empty corral, stripe = running low, check = stocked.', hvac: 'HVAC map: cross = overloaded, stripe = no HVAC.', power: 'Power map: cross = shut off, over electrical capacity.' }; if (this.rend.overlay && !this.tab && L[v]) this.toast(L[v]); break; }
      case 'close': this.select(null); this.setTab(null); break;
      case 'cmd': { const act = JSON.parse(el.dataset.cmd); const result = this.do(act, true); if (result.ok && ['loan', 'borrow'].includes(act.type) && this.sim.s.lesson?.id === 'financing') { this.do({ type: 'tutFlag', flag: 'finAck' }); this.sim.poll(); this.renderTut(true); } if (act.type === 'renovate') { this.sim.poll(); if (!this.sim.s.objects[this.sel]) { const nu = this.sim.objs('unit').filter((u) => u.id > act.unit).pop(); this.sel = nu ? nu.id : null; } } if (['commission', 'delegateTask', 'delegateTaskFor', 'ownerTask', 'ownerMakeReady', 'renovate', 'collect', 'policy', 'borrow', 'payoff', 'loan', 'repay', 'ad'].includes(act.type)) this.renderSheet(true); break; }
      case 'sel': this.select(+v, true); break;
      case 'convo': this.do({ type: 'convo', id: +el.dataset.id, i: +el.dataset.i }, true); this.renderFeed(true); if (!this.sim.s.convos.length) this.resumePopup('convo'); break;
      case 'tutNext': { const b = curBeat(this.sim); if (b) this.do({ type: 'tutFlag', flag: b.flag || b.id }); this.renderTut(true); this.sim.poll(); this.sfx('confirm'); break; }
      case 'tutSkip': this.do({ type: 'tutSkip' }); this.renderTut(true); break;
      case 'lessonStart': this.resumePopup('lessonOffer'); this.do({ type: 'lesson', op: 'start', id: v }); this.sim.poll(); this.tutMin = false; this.renderTut(true); this.renderSheet(true); this.sfx('confirm'); break;
      case 'rush': this.rush = !this.rush; this.replan(); this.sfx('click'); break;
      case 'convoAll': this.convoAll = !this.convoAll; this.renderFeed(true); break;
      case 'lessonEnd': this.do({ type: 'lesson', op: 'end' }); this.renderTut(true); break;
      case 'lessonLater': this.resumePopup('lessonOffer'); this.do({ type: 'lesson', op: 'dismiss', id: v }); this.renderTut(true); break;
      case 'tutMin': this.tutMin = !this.tutMin; this.renderTut(true); break;
      case 'suggestPlacement': this.suggestPlacement(); break;
      case 'showPlacement': this.autoPanKey=null; this.guideScrolled=null; this.setTab(null); this.sel=null; this.renderSheet(true); this.showBlueprintTarget(); break;
      case 'recheckLayout': this.toast(verticalCheck(this.sim)); break;
      case 'tutWhy': this.tutWhy = !this.tutWhy; this.renderTut(true); break;
      case 'menu': this.showMenu(); break;
      case 'handbook': this.showHandbook(); this.sfx('click'); break;
      case 'modalClose': this.closeModal(); break;
      case 'tabFromModal': this.closeModal(); this.setTab(v); break;
      case 'new': this.guardNew(() => { this.closeModal(); this.g.newGame(v); this.title = false; this.sfx('confirm'); }); break;
      case 'replaceYes': { const run = this.pendingNew; this.pendingNew = null; if (run) this.g.keepCurrent(this.contSave).then(() => run()); break; }
      case 'replaceNo': this.pendingNew = null; if (this.title) this.showTitle(); else this.closeModal(); break;
      case 'restoreKept': { const k = this.g.localsave.getKept(); if (!k) break;
        (async () => { const cur = this.g.playing() ? { code: await this.g.saveCode(), meta: this.g.saveMeta(), at: Math.floor(Date.now() / 1000) } : this.g.localsave.get().main;
          if (await this.g.loadCode(k.code)) { if (cur) this.g.localsave.keep(cur); this.closeModal(); this.sfx('confirm'); const m = k.meta || {}; this.toast(`Restored your previous game: ${m.name || 'Saved game'}, Day ${+m.day || 1}, ${money(+m.cash || 0)} cash.${cur ? ' The game you left is now the previous game.' : ''}`, 'good'); this.g.autosave(); }
          else this.toast('The previous game could not be loaded.', 'bad'); })(); break; }
      case 'scenarios': this.showScenarios(); this.sfx('click'); break;
      case 'sandboxSetup': this.showSandbox(); this.sfx('click'); break;
      case 'sbOpt': { const k = el.dataset.k, val = JSON.parse(v);
        if (k === 'kind') { const keep = { start: this.sb.start, goal: this.sb.goal, market: this.sb.market }; this.sb = { ...sbDefaults(val), ...keep }; }
        else if (k === 'preset') { const P = SB_PRESETS[val]; Object.assign(this.sb, { preset: val, cash: P.cash, demand: P.demand, costs: P.costs, wear: P.wear }); }
        else { this.sb[k] = val; if (['cash', 'demand', 'costs', 'wear'].includes(k) && this.sb.kind === 'business') this.sb.preset = 'custom'; if (k === 'start' && val === 'empty') this.sb.staff = 'owner'; }
        this.showSandbox(); this.sfx('click'); break; }
      case 'sbAdv': this.sbAdv = !this.sbAdv; this.showSandbox(); this.sfx('click'); break;
      case 'sbFunds': this.do({ type: 'sbFunds', amt: +v }, true); this.setMeta(this.g.metaName(), this.g.modeLabel(this.sim.s)); this.renderSheet(true); break;
      case 'sbSet': this.do({ type: 'sbSet', k: el.dataset.k, v: JSON.parse(v) }, true); this.setMeta(this.g.metaName(), this.g.modeLabel(this.sim.s)); this.renderSheet(true); break;
      case 'sbStart': { const sb = { ...this.sb }; this.guardNew(() => { this.closeModal(); this.g.newGame('custom', sb); this.title = false; this.sfx('confirm'); }); break; }
      case 'switchProp': this.g.switchProperty(+v); this.sfx('tab'); break;
      case 'acquire': { const r = this.g.acquire(v, el.dataset.m); this.toast(r.msg, r.ok ? 'good' : 'bad'); this.renderSheet(true); break; }
      case 'transfer': { const r = this.g.transfer(+el.dataset.from, +el.dataset.to, +v); this.toast(r.msg, r.ok ? '' : 'bad'); this.renderSheet(true); break; }
      case 'scenMin': this.scMin = !this.scMin; this.renderTut(true); break;
      case 'saveCode': this.showSave(); break;
      case 'saveFile': this.g.saveFile(); break;
      case 'loadOpen': this.showLoad(); break;
      case 'gfx': { const g = this.g; if (g.autoQ) { g.autoQ = false; g.rend.setQuality(2); } else if (g.rend.quality > 0) g.rend.setQuality(g.rend.quality - 1); else { g.autoQ = true; g.rend.setQuality(2); } this.showMenu(); break; }
      case 'battery': this.g.battery = !this.g.battery; this.showMenu(); break;
      case 'photo': this.closeModal(); this.g.showcase.enterPhoto(); break;
      case 'tour': this.closeModal(); this.g.showcase.startTour(); if (!this.sim.s.speed) this.do({ type: 'speed', v: 1 }); break;
      case 'lens': this.g.showcase.setLens(!this.g.showcase.lensPref); this.showMenu(); break;
      case 'continue': { const d = this.contSave; if (!d) break;
        const told = (r, note) => { const m = r.meta || {}; this.closeModal(); this.sfx('confirm'); this.toast(`${note}Restored ${m.name || 'your game'}: Day ${+m.day || 1}${m.time ? ', ' + m.time : ''}, ${money(+m.cash || 0)} cash (${this.ago((r.at || 0) * 1000)}${r.src === 'server' ? ', from the save server' : ''}).`, note ? 'bad' : 'good'); };
        this.g.loadCode(d.code).then(async (ok) => {
          if (ok) return told(d, d.src === 'backup' ? 'The latest autosave was missing, so the backup was used. ' : '');
          const b = this.contBackup; if (b && b !== d && await this.g.loadCode(b.code)) return told(b, 'The latest autosave was damaged, so the previous one was used. ');
          this.contSave = null; this.showTitle(); this.toast('That autosave could not be loaded, and no backup worked. Load a save code or file instead.', 'bad');
        }); break; }
      case 'loadCode': { const code = this.root.querySelector('#loadTa').value; this.g.keepCurrent(this.contSave).then(() => this.g.loadCode(code)).then((ok) => { if (ok) { this.closeModal(); this.toast('Save loaded', 'good'); } else { this.toast('That save code could not be read', 'bad'); const ta = this.root.querySelector('#loadTa'); if (ta) { ta.value = ''; ta.placeholder = 'That save code could not be read. Paste the full code, starting with SST1.'; ta.classList.add('err'); } } }); break; }
      case 'loadFile': this.root.querySelector('#loadFile').click(); break;
      case 'copy': { // the clipboard promise can reject (permission denied); fall back to execCommand and only claim success when it worked
        const ta = this.root.querySelector('#saveTa'); ta.select();
        const fallback = () => { let ok = false; try { ok = !!(document.execCommand && document.execCommand('copy')); } catch (e2) { ok = false; } this.toast(ok ? 'Save code copied' : 'Could not copy - the code is selected, use your device copy', ok ? 'good' : 'bad'); };
        try { const pr = navigator.clipboard && navigator.clipboard.writeText(ta.value); if (pr && pr.then) pr.then(() => this.toast('Save code copied', 'good'), fallback); else fallback(); } catch (err) { fallback(); }
        break; }
      case 'music': this.g.audio.musicOn = !this.g.audio.musicOn; this.g.audio.applyVol(); this.showMenu(); break;
      case 'fps': this.g.showFps = !this.g.showFps; document.getElementById('fps').hidden = !this.g.showFps; this.showMenu(); break;
      case 'focus': this.rend.lookAt(+el.dataset.x, +el.dataset.y); break;
      case 'rent': { const k = el.dataset.k; const cur = this.sim.s.market.ask[k]; this.do({ type: 'setRent', key: k, v: cur + (+v) }); this.renderSheet(true); this.sfx('click'); break; }
      case 'policy': this.do({ type: 'policy', key: v, v: !this.sim.s.policies[v] }); this.renderSheet(true); this.sfx('click'); break;
    }
  }
  onInput(e) {
    const el = e.target; if (el.dataset.vol) this.g.audio.setVol(el.dataset.vol, +el.value);
    if (el.id === 'loadFile' && el.files[0]) { el.files[0].text().then((t) => this.g.keepCurrent(this.contSave).then(() => this.g.loadCode(t))).then((ok) => { if (ok) { this.closeModal(); this.toast('Save loaded', 'good'); } else this.toast('That file is not a valid save', 'bad'); }); }
  }
  do(action, feedback = false) {
    const r = this.sim.dispatch(action) || {};
    if (feedback && r.msg) this.toast(r.msg, r.ok ? 'good' : 'bad');
    if (feedback) this.sfx(r.ok ? 'click' : 'refuse');
    return r;
  }

  // ------------------------------------------------------------ tabs / sheets
  setTab(t) {
    if (t === 'growth' && this.plan && this.plan.args) this.growthPlanArgs = { ...this.plan.args };
    this.tab = t; if (t !== 'build' && this.tool) this.pickTool(null); if (!t && this.sel == null) this.sheetTall = false;
    if (t) this.sel = null, this.rend.setSelection(null);
    if (t === 'business') this.do({ type: 'tutFlag', flag: 'businessOpened' });
    for (const b of this.root.querySelectorAll('#tabs button')) b.classList.toggle('on', b.dataset.v === t);
    this.renderSheet(true);
  }
  setView(v) {
    this.rend.setView(v);
    for (const b of this.root.querySelectorAll('#floors button')) b.classList.toggle('on', String(b.dataset.v) === String(v));
    if (this.tool) this.replan();
  }
  select(id, keepTab = false) {
    this.sel = id; this.rend.setSelection(typeof id === 'number' ? id : null);
    if (id == null && !this.tab) this.sheetTall = false;
    if (id != null && !keepTab) { this.tab = null; for (const b of this.root.querySelectorAll('#tabs button')) b.classList.remove('on'); }
    const o = typeof id === 'number' && this.sim.s.objects[id];
    if (o && o.type === 'corral') this.do({ type: 'tutFlag', flag: 'corralInspected' });
    this.renderSheet(true);
    if (id != null) requestAnimationFrame(() => this.keepSelVisible());
  }
  renderSheet(force = false) {
    const box = this.$('sheet');
    if (this.tool) { box.innerHTML = ''; return; }
    let html = '';
    if (this.sel != null) html = this.inspector();
    else if (this.tab === 'build') html = this.buildSheet();
    else if (this.tab === 'operate') html = this.operateSheet();
    else if (this.tab === 'business') html = this.businessSheet();
    else if (this.tab === 'growth') html = this.growthSheet();
    if (!html) { box.innerHTML = ''; return; }
    const key = this.sel != null ? 'sel:' + JSON.stringify(this.sel) : this.tab;
    const body = box.querySelector('.body'); const st = body && this.sheetKey === key ? body.scrollTop : 0; this.sheetKey = key;
    const cats = box.querySelector('.cats'); const cs = cats ? cats.scrollLeft : 0;
    if (!force && this.sheetHtml === html) return;
    const wasOpen = !!box.firstChild; this.sheetHtml = html; box.innerHTML = html;
    if (!wasOpen && box.firstChild) box.firstChild.classList.add('enter');
    const nb = box.querySelector('.body'); if (nb) nb.scrollTop = st;
    const nc = box.querySelector('.cats'); if (nc) { nc.scrollLeft = cs; const on = nc.querySelector('button.on'); if (on) { const r = on.getBoundingClientRect(), cr = nc.getBoundingClientRect(); if (r.left < cr.left || r.right > cr.right) nc.scrollLeft += r.left - cr.left - 14; } }
    const cv = box.querySelector('canvas.chart'); if (cv) this.drawChart(cv);
    if (this.sel != null && nb) { // lead every inspector with its single most useful action
      const btn = nb.querySelector('.btn.go, .btn.pri, button.btn[data-a="cmd"]:not(.danger)');
      if (btn && !btn.closest('.primary')) { const w = document.createElement('div'); w.className = 'primary'; const row = btn.parentElement; w.appendChild(btn); nb.prepend(w); if (row && row.classList.contains('row') && !row.children.length) row.remove(); }
    }
  }
  jumpSection(label) {
    const body = this.$('sheet').querySelector('.body'); if (!body) return;
    const heading = [...body.querySelectorAll('h3[data-section]')].find((h) => h.dataset.section === label);
    if (heading) body.scrollTop += heading.getBoundingClientRect().top - body.getBoundingClientRect().top - 8;
  }
  sheet(title, sub, body, extra = '') {
    const sections = { Operate: [['Work queue', 'Jobs'], ['Staff', 'Staff'], ['Hire capacity', 'Hire'], ['Carts', 'Carts'], ['Policies', 'Policies']], Business: [['Bills &amp; reserve', 'Bills'], ['Your market', 'Demand'], ['Asking rents', 'Pricing'], ['Collections', 'Collections'], ['Financing', 'Financing'], ['Operating performance', 'Statement']], Growth: [['Growth Readiness', 'Readiness'], ['Operator career', 'Career'], ['Customer experience', 'Experience'], ['Lessons', 'Lessons'], ['Acquisitions', 'Properties']] }[title];
    if (sections) {
      const jumps = [];
      body = body.replace(/<h3>(.*?)<\/h3>/g, (html, text) => {
        const section = sections.find(([prefix]) => text.startsWith(prefix)); if (!section) return html;
        jumps.push(`<button data-a="section" data-v="${section[0]}">${section[1]}</button>`);
        return `<h3 data-section="${section[0]}">${text}</h3>`;
      });
      const order = title === 'Business' ? ['Bills', 'Financing', 'Pricing', 'Demand', 'Collections', 'Statement'] : sections.map(([, label]) => label);
      jumps.sort((a, b) => order.findIndex((label) => a.endsWith(`>${label}</button>`)) - order.findIndex((label) => b.endsWith(`>${label}</button>`)));
      extra += `<nav class="section-shortcuts" aria-label="${title} sections">${jumps.join('')}</nav>`;
    }
    return `<div class="sheet${this.sheetTall ? ' tall' : ''}"><button class="grab" data-a="sheetGrow" aria-label="Expand or shrink panel"><i></i></button><header><h2>${esc(title)}${sub ? `<span class="sub">${sub}</span>` : ''}</h2><button class="x" data-a="close" aria-label="Close">${I.x}</button></header>${extra}<div class="body">${body}</div></div>`;
  }

  // ------------------------------------------------------------ BUILD
  buildSheet() {
    const s = this.sim.s; const cats = CATEGORIES.filter((c) => Object.values(TOOLS).some((t) => t.cat === c.id));
    const catHtml = `<div class="cats">${cats.map((c) => `<button data-a="cat" data-v="${c.id}" class="${c.id === this.cat ? 'on' : ''}">${c.name}</button>`).join('')}</div>`;
    const tools = Object.entries(TOOLS).filter(([, t]) => t.cat === this.cat);
    const focus = this.tutFocus();
    const cards = tools.map(([k, t]) => {
      const locked = !toolUnlocked(this.sim, k);
      const cost = t.cost != null ? money(t.cost * (1)) : t.costPerCell != null ? `${money(t.costPerCell)} / cell` : 'Free';
      return `<button class="tool ${locked ? 'locked' : ''} ${focus && focus.tool === k ? 'pulse' : ''}" data-a="tool" data-v="${k}"><b>${t.name}</b><span class="c">${locked ? (s.tut.on && (k === 'office' || k === 'gate') ? 'Built' : 'Unlocks after the tutorial') : cost}</span><span class="d">${t.desc}</span></button>`;
    }).join('');
    return this.sheet('Build', s.creative ? 'Creative mode: instant and free' : s.sb && (s.sb.unlimited || s.sb.instant) ? [s.sb.unlimited ? 'Free Build funds' : '', s.sb.instant ? 'Instant construction' : ''].filter(Boolean).join(' · ') + '. Costs are still recorded.' : 'Place, preview, then confirm', `<div class="build-help"><button class="btn sm" data-a="handbook">Builder's handbook</button><span>How, why and when to use every build item</span></div><div class="tools">${cards}</div>`, catHtml);
  }
  pickTool(k) {
    if (k && !toolUnlocked(this.sim, k)) { this.toast(this.sim.s.tut.on && (k === 'office' || k === 'gate') ? 'Maple Street already has this' : 'Unlocks when you finish the tutorial', 'bad'); this.sfx('refuse'); return; }
    this.buildPlacing = false; this.root?.classList.remove('is-placing'); this.tool = k; this.plan = null; this.planArgs = null; this.flip = false; this.rend.setPreview(null);
    if (k) { this.sel = null; this.rend.setSelection(null); this.sfx('click'); }
    this.renderSheet(true); this.renderActionBar();
  }
  toolFloor() { const v = this.rend.view; return v === 1 ? 1 : 0; }
  placeStart(cell) { if (!this.tool || !cell) return; this.buildPlacing = true; this.root?.classList.add('is-placing'); this.planArgs = { a: { x: cell.x, y: cell.y }, b: { x: cell.x, y: cell.y } }; this.replan(); this.sfx('place'); }
  finishPlacement() { if (!this.buildPlacing) return; this.buildPlacing = false; this.root?.classList.remove('is-placing'); this.renderActionBar(); }
  placeMove(cell) {
    if (!this.tool || !this.planArgs || !cell) return; const T = TOOLS[this.tool]; if (T.shape === 'tap') { this.planArgs.a = this.planArgs.b = { x: cell.x, y: cell.y }; this.replan(); return; }
    if (this.planArgs.b.x === cell.x && this.planArgs.b.y === cell.y) return;
    const hint=this.currentBlueprintPlan();
    if(hint?.tool===this.tool && Math.abs(cell.x-hint.b.x)<=1 && Math.abs(cell.y-hint.b.y)<=1 && Math.abs(this.planArgs.a.x-hint.a.x)<=1 && Math.abs(this.planArgs.a.y-hint.a.y)<=1) { this.planArgs.a={...hint.a}; this.planArgs.axis=hint.axis; this.planArgs.dir=hint.dir; cell=hint.b; }
    else { delete this.planArgs.axis; delete this.planArgs.dir; }
    this.planArgs.b = { x: cell.x, y: cell.y }; this.replan();
  }
  replan() {
    if (!this.tool || !this.planArgs) { this.renderActionBar(); return; }
    const T = TOOLS[this.tool];
    const a = { tool: this.tool, a: this.planArgs.a, b: T.shape === 'tap' ? this.planArgs.a : this.planArgs.b, axis:this.planArgs.axis, dir:this.planArgs.dir, f: this.toolFloor(), climate: this.climate, flip: this.flip, rush: this.canRush() && this.rush };
    if (['doorStd', 'doorWide', 'doorAuto', 'elevator', 'office', 'gate', 'hvac', 'keypad', 'canopy', 'aisle', 'loading', 'parking', 'walk', 'shell1', 'shell2'].includes(this.tool) || T.cat === 'site') a.f = 0;
    if (this.tool.startsWith('du')) a.f = 0;
    this.plan = this.sim.plan(a); this.plan.args = a;
    this.rend.setPreview(this.plan, this.planArgs.a); this.renderActionBar();
  }
  canRush() { const s = this.sim.s; return !s.creative && (s.coTier || 1) >= 2; }
  confirmPlan() {
    if (!this.plan) return;
    const tutorialNeedsLiveFrontage = this.sim.s.tut && this.sim.s.tut.on && (curBeat(this.sim) || {}).id === 'expand' && this.plan.status !== 'valid';
    if (tutorialNeedsLiveFrontage) {
      this.sfx('refuse');
      this.toast('For this lesson, face the unit doors toward the connected drive aisle until the preview turns green.', 'bad');
      return;
    }
    const r = this.sim.dispatch({ type: 'build', ...this.plan.args });
    if (r.ok) { this.sfx('confirm'); this.toast(r.msg + (this.sim.instantOn() ? '' : ' - construction started'), 'good'); this.plan = null; this.planArgs = null; this.rend.setPreview(null); }
    else { this.sfx('refuse'); this.toast(r.msg || 'Cannot build here', 'bad'); }
    this.renderActionBar();
  }
  renderActionBar() {
    const box = this.$('abar'); if (!this.tool) { box.innerHTML = ''; return; }
    const T = TOOLS[this.tool], R0 = this.plan; const rush = this.canRush() && this.rush && R0 && R0.dur;
    const R = R0 && rush ? { ...R0, cost: Math.round(R0.cost * 1.25), dur: R0.dur * 0.5 } : R0;
    if (this.buildPlacing) {
      box.innerHTML = `<div class="actionbar placing" aria-live="polite"><b>${R?.count || 0}${T.unit ? ' units' : ' cells'} · ${money(R?.cost || 0)}</b><span>${R?.status === 'valid' ? 'Valid' : R?.status === 'incomplete' ? 'Needs setup' : 'Invalid'} · Lift finger to review</span></div>`;
      return;
    }
    if(!R) { box.innerHTML=`<div class="actionbar idle-strip"><b>${T.name}</b><span>Hold to place${this.toolFloor()?' · F2':''}</span><button class="x" data-a="cancelTool" aria-label="Stop building">${I.x}</button></div>`; return; }
    let status = `<div class="status idle"><span class="ic">i</span><span>${T.shape === 'tap' ? 'Press and hold the map to place.' : 'Press and hold, then drag to size it. Drag normally to pan; two fingers also pan/zoom.'}${this.toolFloor() ? ' Placing on Floor 2.' : ''}</span></div>`;
    if (R) {
      const ic = R.status === 'valid' ? '&#10003;' : R.status === 'incomplete' ? '!' : '&#215;';
      const txt = R.status === 'valid' ? (this.tool === 'demolish' ? esc(R.label) : 'Correct — ready to build') : R.status === 'incomplete' ? 'Will build, but not earn yet: ' + esc(R.missing.join('; ')) : esc(R.reasons.join('; '));
      status = `<div class="status ${R.status}"><span class="ic">${ic}</span><span>${txt}</span></div>`;
      if (R.warn && R.warn.length) status += `<div class="status incomplete"><span class="ic">!</span><span>${esc(R.warn.join('; '))}</span></div>`;
      if (R.status !== 'invalid' && !this.sim.s.creative && R.cost) {
        status += this.spendingHtml(R.cost, this.sim.planDailyCost(R), 'after build');
        const inv = this.sim.investment(R);
        if (inv) status += `<details class="build-details"><summary>Payback &amp; build terms</summary><div class="refund-note">${inv.range ? `Steady-state payback ${Math.floor(inv.range[0])}–${Math.ceil(inv.range[1])} months at ${pct(inv.lowOccupancy)}–${pct(inv.highOccupancy)} occupancy` : 'Payback: not enough comparable demand/rent evidence yet'}. Selected construction only; add required infrastructure and staffing. Lease-up, future repairs and missed payments can extend payback.</div><p class="note">Undo within 30 min is a full refund; cancelling later refunds 60% of the unbuilt share.</p></details>`;
      }
      if (R.status !== 'invalid' && R.dur && !this.sim.instantOn() && (this.sim.s.creative || !R.cost)) status += `<div class="refund-note">Undo within 30 min is a full refund; cancelling later refunds 60% of the unbuilt share.</div>`;
    }
    const isUnit = T.unit; const isInterior = isUnit && T.access === 'interior';
    const costTxt = R ? `${money(R.cost)}<small>${R.count ? R.count + (isUnit ? ' unit' + (R.count > 1 ? 's' : '') : T.shape === 'tap' ? '' : ' cells') : ''}${R.dur ? ' · ~' + Math.max(1, Math.round(R.dur / 60)) + 'h build' : ''}${R.opex ? ' · +' + money(R.opex, true) + '/day' : ''}</small>` : '&nbsp;';
    const wasOpen = !!box.firstChild;
    box.innerHTML = `<div class="actionbar${wasOpen ? '' : ' enter'}"><div class="top"><div class="nm">${T.name}<small>${T.desc}</small></div><button class="x" data-a="cancelTool" aria-label="Stop building">${I.x}</button></div><div class="review-body">${status}${this.sim.s.tut?.on && curBeat(this.sim)?.id==='expand' && R.status!=='valid' ? '<p class="note">Confirm unlocks when the doors face a connected aisle. Try Flip doors or move the row beside the aisle.</p>' : ''}</div>
      <div class="bot"><div class="cost">${costTxt}</div>
      ${isUnit ? `<button class="btn sm" data-a="flip">Flip doors</button>` : ''}
      ${this.canRush() && T.cat !== 'site' && this.tool !== 'demolish' ? `<button class="btn sm ${this.rush ? 'pri' : ''}" data-a="rush" title="Rush contractors: +25% cost, twice as fast">Rush ${this.rush ? 'on' : 'off'}</button>` : ''}
      ${isInterior ? `<button class="btn sm ${this.climate ? 'pri' : ''}" data-a="climate">Climate ${this.climate ? 'on' : 'off'}</button>` : ''}
      <button class="btn pri" data-a="confirm" ${!R || R.status === 'invalid' || (this.sim.s.tut && this.sim.s.tut.on && (curBeat(this.sim) || {}).id === 'expand' && R.status !== 'valid') ? 'disabled' : ''}>Confirm</button></div></div>`;
  }

  // ------------------------------------------------------------ INSPECTOR
  condBar(c) { const cl = c < 0.2 ? 'r' : c < 0.45 ? 'a' : ''; return `<div class="row"><div class="bar"><i class="${cl}" style="width:${Math.round(c * 100)}%"></i></div><span class="pill ${c < 0.2 ? 'r' : c < 0.45 ? 'a' : 'g'}">${c < 0.2 ? 'Failed' : c < 0.45 ? 'Needs repair' : 'Good'} · ${pct(c)}</span></div>`; }
  delegationHtml(t, obj = null) {
    if (this.sim.s.tut?.on && !this.sim.s.tut.done) return '';
    const d = this.sim.taskDelegation(t); if (!d || d.status === 'assigned') return '';
    const name = ROLES[d.role].name;
    const action = obj != null ? { type: 'delegateTaskFor', obj } : { type: 'delegateTask', task: t.id };
    return `<p class="note">${esc(d.message)}</p>` + (d.status === 'available'
      ? this.cmdBtn(`Delegate to ${name}`, action, 'pri')
      : d.status === 'missing' ? `<button class="btn pri" data-a="staffHelp" data-v="${d.role}">Review ${name} hire · ${money(ROLES[d.role].wage, true)}/day</button>` : '');
  }
  officeCoverageHtml() {
    const sim = this.sim, s = sim.s;
    if (!s.open || (s.tut?.on && !s.tut.done) || s.staff.some(st => st.role === 'clerk')) return '';
    return `<p class="note">The Owner also runs the office. Sending the Owner out can leave shoppers waiting. A Clerk covers 8 AM–6 PM for ${money(ROLES.clerk.wage)}/day.</p><button class="btn sm" data-a="staffHelp" data-v="clerk">Review office coverage</button>`;
  }
  taskActions(o) {
    const s = this.sim.s; const t = s.tasks.find((x) => x.obj === o.id);
    const ownerCan = t ? ROLES.owner.can.includes(t.need) : !(o.type === 'elevator' || o.type === 'hvac');
    const owner = s.staff.find((x) => x.role === 'owner'), hrs = t ? this.sim.taskHours(t) : 0, ownerLeft = owner ? this.sim.workRemaining(owner) : 0;
    let h = '';
    if (t) {
      h += this.delegationHtml(t);
      const who = t.assigned === 'vendor' ? 'Vendor booked' : t.assigned ? (s.staff.find((x) => x.id === t.assigned) || {}).name || 'Assigned' : 'Waiting in queue';
      h += `<div class="item"><div class="grow"><b>${esc(t.label)}</b><small>${who}${t.prog ? ' · ' + pct(t.prog) : ''} · ${hrs}h work${t.type === 'repair' && !t.vendor ? ' · Vendor ' + money(t.need === 'repair_complex' ? 650 : 250) + ' cash now' : ''}</small></div></div><div class="row wrap" style="margin-top:6px">`;
      if (!t.assigned && ownerCan) h += `<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerTask', task: t.id })}' ${hrs > ownerLeft ? 'disabled' : ''}>${t.type === 'repair' && this.sim.pressureOn() ? `Owner: quick fix · ${hrs}h` : `Send Owner · ${hrs}h`}</button>`;
      if (!t.assigned || (t.assigned !== 'vendor' && !ownerCan)) h += `<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'callVendor', task: t.id })}'>Call vendor (${money(t.need === 'repair_complex' ? 650 : 250)})</button>`;
      h += `</div>`;
      if (!t.assigned && ownerCan) h += this.officeCoverageHtml();
      if (t.type === 'repair' && this.sim.pressureOn()) h += `<p class="note">Owner quick fix restores at least 72% condition. A Tech or vendor restores 100%.</p>`;
      if (!t.vendor) h += this.spendingHtml(t.need === 'repair_complex' ? 650 : 250, 0, 'after vendor');
      if (!ownerCan) h += `<p class="note">The Owner can't service this equipment. Hire a Tech or call a vendor.</p>`;
      else if (!t.assigned && hrs > ownerLeft) h += `<p class="note">Owner has ${ownerLeft}h available today; this job needs ${hrs}h. Wait for tomorrow or delegate it.</p>`;
    } else if (o.cond != null && o.cond < 0.8 && ownerCan) {
      if (o.quickFix && this.sim.pressureOn() && o.cond >= 0.45) {
        h += `<p class="note">Temporary Owner repair · ${pct(o.cond)} condition. Another quick fix will not restore full condition. A Tech can restore it fully.</p>`;
        h += this.delegationHtml({ need: 'repair_simple', total: this.sim.repairWork(o), prog: 0 }, o.id);
        h += this.cmdBtn('Vendor: full service ($250)', { type: 'cv', op: 'vendorFor', obj: o.id });
        h += this.spendingHtml(250, 0, 'after vendor');
      } else h += `<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerTaskFor', obj: o.id })}'>Owner: service now</button>`;
    }
    return h;
  }
  inspector() {
    const sim = this.sim, s = sim.s, D = sim.D;
    if (typeof this.sel === 'object' && this.sel && this.sel.kind === 'cart') {
      const c = s.carts.find((x) => x.id === this.sel.id); if (!c) return '';
      const t = s.tasks.find((x) => x.type === 'carts' && x.cart === c.id);
      return this.sheet(c.st === 'damaged' ? 'Damaged cart' : 'Stranded cart', `Floor ${c.f + 1} · left ${Math.round((s.t - (c.since || s.t)) / 60)}h ago`,
        `<p class="note">Carts left away from a corral aren't available to the next customer. Porters recover them automatically when "Porters recover carts" is on.</p>
        ${t ? `<div class="row wrap">${!t.assigned ? `<button class="btn pri" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerTask', task: t.id })}'>Owner: return it</button>` : `<span class="pill b">${t.assigned === 'vendor' ? 'Vendor' : 'Assigned'}</span>`}</div>` : '<p class="note">A recovery task will be created if it stays out.</p>'}`);
    }
    if (typeof this.sel === 'object' && this.sel && this.sel.kind === 'dirt') {
      const c = this.sel; const d = s.dirt[c.f][c.y * s.W + c.x];
      const t = s.tasks.find((x) => x.type === 'clean' && x.f === c.f && Math.abs(x.x - c.x) + Math.abs(x.y - c.y) < 6);
      return this.sheet('Dirty area', `Dirt ${pct(d)}`, `<p class="note">Customers notice dirty loading areas and hallways (Cleanliness).</p><div class="row wrap">${t ? (t.assigned ? `<span class="pill b">Cleaning assigned</span>` : `<button class="btn pri" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerTask', task: t.id })}'>Send Owner to clean</button>`) : `<button class="btn pri" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerClean', f: c.f, x: c.x, y: c.y })}'>Send Owner to clean</button>`}</div>`);
    }
    const o = s.objects[this.sel]; if (!o) { this.sel = null; return ''; }
    const nm = sim.objName(o);
    if (o.cstate === 'construction') {
      const ord = s.orders.find((q) => q.id === o.order);
      if (!ord) return this.sheet(nm, 'Under construction', '');
      const { undo, refund } = sim.cancelRefund(ord);
      return this.sheet(nm, 'Under construction', `<div class="kv"><span>Order</span><span>${esc(ord.label)}</span><span>Progress</span><span>${ord.waiting ? (sim.groundPredecessor(ord) ? 'Waiting for earlier paving' : 'Waiting for building shell') : pct(ord.prog)}</span><span>Cost</span><span>${money(ord.cost)}</span></div>
        <div class="bar"><i style="width:${Math.round(ord.prog * 100)}%"></i></div>
        <div class="row" style="margin-top:10px"><button class="btn danger" data-a="cmd" data-cmd='${JSON.stringify({ type: 'cancelOrder', id: ord.id })}'>${undo ? 'Undo' : 'Cancel'} (refund ${money(refund)})</button></div>
        <p class="note">${undo ? 'Undo refunds everything within 30 game-minutes of committing.' : 'Cancelling mid-build refunds 60% of the unbuilt share.'}</p>`);
    }
    const html = this.objSheet(o, nm).replace('<div class="body">', '<div class="body">' + this.diagnosticHtml(o.id));
    if (!o.unpowered) return html;
    const P = D.power; const warnBox = `<div class="status invalid" style="margin-bottom:10px"><span class="ic">!</span><span>No power - demand ${P ? P.demand.toFixed(1) + ' kW exceeds ' + P.cap + ' kW' : 'exceeds'} service. Add an Electrical Service Upgrade or remove other loads.</span></div>`;
    return html.replace('<div class="body">', '<div class="body">' + warnBox);
  }
  objSheet(o, nm) {
    const sim = this.sim, s = sim.s, D = sim.D;
    switch (o.type) {
      case 'stairs': return this.sheet('Stairwell', 'Floors 1-2', `<p class="note">People walk between floors here. Carts cannot use stairs, so upper-floor units still need a working elevator to rent. During an elevator outage, tenants without carts take the stairs.</p>`);
      case 'power': { const P = D.power; return this.sheet('Electrical Service', `+${TOOLS.power.kw} kW`, `<div class="kv"><span>Property capacity</span><span>${P.cap} kW</span><span>Demand</span><span>${P.demand.toFixed(1)} kW</span><span>Shut off</span><span>${P.shed.length}</span></div><p class="note">Utility capacity is shared by the whole property.</p>`); }
      case 'water': { const sh = s.objects[o.serves]; const n = sim.objs('restroom').concat(sim.objs('fountain')).filter((r) => D.shellAt[r.y * s.W + r.x] === o.serves).length; return this.sheet('Water Service', sh ? 'Serves adjacent building' : '', `<div class="kv"><span>Fixtures served</span><span>${n}</span></div><p class="note">Restrooms and fountains in this building run on this hookup.</p>`); }
      case 'restroom': {
        const ok = sim.amenityWorks(o), dirt = o.dirt || 0;
        return this.sheet('Restroom', ok ? (dirt > 0.6 ? 'Needs cleaning' : 'Open') : 'Closed', `<div class="kv"><span>Status</span><span>${ok ? 'Open' : !sim.hasWater(D.shellAt[o.y * s.W + o.x]) ? 'No water service' : 'No power'}</span><span>Cleanliness</span><span>${pct(1 - dirt)}</span><span>Uses</span><span>${o.uses || 0}</span><span>Comfort score</span><span>${pct(s.exp.comfort)}</span></div>
          ${dirt > 0.3 ? `<div class="row" style="margin-top:10px"><button class="btn pri" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerRoom', obj: o.id })}'>Owner: clean now</button></div>` : ''}
          <p class="note">Long visits (move-ins, move-outs, big loads) use it most. Porters clean it once it gets dirty; a dirty restroom hurts comfort.</p>`);
      }
      case 'fountain': return this.sheet('Water Fountain', sim.amenityWorks(o) ? 'Working' : 'Not working', `${this.condBar(o.cond)}${this.taskActions(o)}<p class="note">${sim.hasWater(D.shellAt[o.y * s.W + o.x]) ? 'A small comfort boost for tenants in this building.' : 'This building needs a Water Service hookup.'}</p>`);
      case 'unit': {
        const L = o.lease && s.leases[o.lease], tn = L && s.tenants[L.tenant];
        const state = o.cstate === 'built' ? '<span class="pill a">Built · not ready</span>' : o.cstate === 'ready' ? '<span class="pill b">Ready to commission</span>' :
          o.commercial === 'occupied' ? (L && L.status !== 'current' ? this.stagePill(L) + (o.overlock ? '<span class="pill r">Overlocked</span>' : '') : '<span class="pill g">Occupied</span>') : o.commercial === 'ready' ? '<span class="pill g">Rent-ready</span>' : o.commercial === 'reserved' ? '<span class="pill b">Reserved · move-in pending</span>' : o.commercial === 'unready' ? '<span class="pill a">Needs make-ready</span>' : '<span class="pill">—</span>';
        const key = productKey(o.size, o.env), ask = s.market.ask[key];
        let h = `<div class="row wrap">${state}<span class="pill">${o.access === 'drive' ? 'Drive-up' : 'Interior'}</span>${o.env === 'climate' ? '<span class="pill b">Climate</span>' : ''}${o.f ? '<span class="pill">Floor 2</span>' : ''}</div>`;
        h += `<div class="kv"><span>Size</span><span>${o.size} (${SIZES[o.size].sqft} sq ft)</span><span>Asking rent</span><span>${money(ask)}/mo</span><span>Market rent</span><span>${money(Math.round(sim.marketRent(o)))}/mo</span>`;
        if (o.access === 'interior' && o.cstate === 'operating') h += `<span>Convenience</span><span>${pct(o.conv ?? 1)}</span>`;
        h += `<span>Security</span><span>${pct(sim.unitSecurity(o))}</span></div>`;
        if (L) h += `<h3>Tenant</h3><div class="kv"><span>Name</span><span>${esc(tn ? tn.name : '—')}</span><span>Rent</span><span>${money(L.rent)}/mo</span><span>Next bill</span><span>Day ${L.nextBill}</span><span>Satisfaction</span><span>${tn ? pct(tn.sat) : '—'}</span>${tn && tn.leaving ? '<span>Status</span><span>Moving out</span>' : ''}${L.status !== 'current' ? `<span>Owes</span><span>${money(sim.owed(L))} · ${sim.day - L.dueSince} days late</span>` : ''}${tn && tn.cramped ? '<span>Note</span><span>Feels cramped in this size</span>' : ''}</div>`;
        if (L && L.status !== 'current') { const b = []; const d = sim.day - L.dueSince;
          if (['pastdue', 'delinquent', 'lien'].includes(L.status) && d >= 30) b.push(this.cmdBtn('Send lien notice', { type: 'collect', op: 'notice', lease: L.id }, 'pri'));
          if (!L.planTried && L.status !== 'auction' && L.status !== 'plan') b.push(this.cmdBtn('Offer payment plan', { type: 'collect', op: 'plan', lease: L.id }));
          if (L.fees > 0) b.push(this.cmdBtn('Waive fees', { type: 'collect', op: 'waive', lease: L.id }));
          if (L.status === 'auction') b.push(this.cmdBtn('Pull from auction', { type: 'collect', op: 'hold', lease: L.id }));
          if (b.length) h += `<div class="row wrap" style="margin-top:6px">${b.join('')}</div>`; }
        if (o.blocked) h += `<div class="miss"><b>Customers can't reach this unit</b><ul>${(o.missing || []).map((m) => `<li>${esc(m)}</li>`).join('')}</ul><small>It won't rent until access is restored.</small></div>`;
        if ((o.cstate === 'built' || o.cstate === 'ready') && o.missing && o.missing.length) h += `<div class="miss"><b>Why it can't open yet</b><ul>${o.missing.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
        const acts = [];
        if (o.cstate === 'ready') acts.push(`<button class="btn go" data-a="cmd" data-cmd='${JSON.stringify({ type: 'commission', unit: o.id })}'>Commission unit</button>`);
        if (o.cstate === 'ready' && o.order) acts.push(`<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'commission', order: o.order })}'>Commission whole order</button>`);
        if (o.cstate === 'ready') { const allReady = sim.objs('unit').filter((u) => u.cstate === 'ready').length, inOrder = o.order ? sim.objs('unit').filter((u) => u.cstate === 'ready' && u.order === o.order).length : 1; if (allReady > inOrder) acts.push(`<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'commission', all: true })}'>Commission all ${allReady} ready units</button>`); }
        const mr = s.tasks.find((t) => t.type === 'makeready' && t.obj === o.id);
        if (mr) { const mh = sim.taskHours(mr), ow = s.staff.find((x) => x.role === 'owner'), left = ow ? sim.workRemaining(ow) : 0; acts.push(mr.assigned ? `<span class="pill b">Make-ready ${mr.prog ? pct(mr.prog) : 'assigned'}</span>` : `<button class="btn pri ${this.tutFocus() && this.tutFocus().obj === o.id ? 'pulse' : ''}" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerMakeReady', unit: o.id })}' ${mh > left ? 'disabled' : ''}>Owner Make-Ready · ${mh}h</button>`); }
        for (const op of sim.renovateOptions ? sim.renovateOptions(o) : []) acts.push(op.ok ? `<button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'renovate', unit: o.id, kind: op.kind })}'>${op.label} · ${money(op.cost)}</button>` : `<button class="btn" disabled title="${esc(op.why)}">${op.label} · ${esc(op.why)}</button>`);
        if (acts.length) h += `<div class="row wrap" style="margin-top:8px">${acts.join('')}</div>`;
        return this.sheet(nm, `${o.access === 'drive' ? 'Drive-up' : 'Interior'} ${o.size}`, h);
      }
      case 'light': case 'camera': {
        const inside = !!D.shellAt[o.y * s.W + o.x];
        return this.sheet(nm, inside ? 'Interior' : 'Exterior', `${this.condBar(o.cond)}<div class="kv"><span>Coverage radius</span><span>${TOOLS[o.type].radius} cells</span><span>Daily cost</span><span>${money(o.type === 'light' ? 0.5 : 0.35, true)}</span></div>${this.taskActions(o)}<p class="note">${o.type === 'light' ? 'Dark hallways block new interior units and hurt security.' : 'Visible camera coverage lifts security quality.'}</p>`);
      }
      case 'gate': {
        const q = s.gateQ.length;
        return this.sheet('Entrance Gate', 'Keypad access', `${this.condBar(o.cond)}<div class="kv"><span>Vehicles in line</span><span>${q}</span><span>Access hours</span><span>6 AM - 10 PM</span></div>${this.taskActions(o)}`);
      }
      case 'door': {
        return this.sheet(nm, o.keypad ? 'With keypad' : 'No keypad', `${o.kind === 'auto' ? this.condBar(o.cond) : ''}<div class="kv"><span>Cart speed</span><span>${o.kind === 'std' ? 'Slow' : o.kind === 'wide' ? 'Good' : 'Fast'}</span>${o.keypad ? `<span>Keypad</span><span>${o.keypad === 'operating' ? pct(o.kcond ?? 1) : 'Installing'}</span>` : ''}</div>${o.kind === 'auto' ? this.taskActions(o) : ''}`);
      }
      case 'elevator': {
        const waiting = o.q.reduce((a, q) => a + q.length, 0);
        return this.sheet('Freight Elevator', o.cond < 0.2 ? 'Out of service' : `Floor ${Math.round(o.pos) + 1}`, `${this.condBar(o.cond)}<div class="kv"><span>Waiting</span><span>${waiting}</span><span>Riding</span><span>${o.riders.length}</span><span>Average wait</span><span>${Math.round(o.avgWait || 0)} min</span><span>Trips</span><span>${o.trips}</span><span>Capacity</span><span>4 people · a cart takes 2</span></div>${this.taskActions(o)}`);
      }
      case 'hvac': {
        const hv = D.hvac[o.serves]; return this.sheet('HVAC Plant', 'Climate control', `${this.condBar(o.cond)}<div class="kv"><span>Zone capacity</span><span>${hv ? Math.round(hv.cap) : 0} cells</span><span>Climate load</span><span>${hv ? Math.round(hv.load) : 0} cells</span></div>${this.taskActions(o)}<p class="note">Each climate unit loads the plant by its area. Over capacity, climate customers are unhappy.</p>`);
      }
      case 'corral': {
        const at = sim.cartsAt(o.id).length, all = s.carts.filter((c) => c.home === o.id).length, stranded = s.carts.filter((c) => (c.st === 'stranded' || c.st === 'damaged')).length, inuse = s.carts.filter((c) => c.st === 'inuse').length;
        return this.sheet(o.name, `Floor ${(o.f || 0) + 1}`, `<div class="stats"><div class="stat"><small>At corral</small><b>${at}</b></div><div class="stat"><small>In use</small><b>${inuse}</b></div><div class="stat"><small>Stranded (all)</small><b>${stranded}</b></div><div class="stat"><small>Homed here</small><b>${all}</b></div></div>
          <div class="row wrap" style="margin-top:10px"><button class="btn pri" data-a="cmd" data-cmd='${JSON.stringify({ type: 'buyCarts', corral: o.id, n: 1 })}'>Buy 1 cart (${money(CART_COST)})</button><button class="btn" data-a="cmd" data-cmd='${JSON.stringify({ type: 'buyCarts', corral: o.id, n: 2 })}'>Buy 2 (${money(CART_COST * 2)})</button></div>
          <p class="note">Interior customers park at loading, take a cart here, go through the wide door and down the hallway. Empty corral = waiting or carrying by hand.</p>`);
      }
      case 'office': {
        const staff = esc(s.staff.map((st) => ROLES[st.role].name + ' ' + st.name).join(', '));
        return this.sheet('Office', `Open ${OFFICE_HOURS[0]} AM - ${OFFICE_HOURS[1] - 12} PM`, `<div class="kv"><span>Waiting customers</span><span>${s.officeQ.length}</span><span>Staff</span><span>${esc(staff)}</span><span>Service quality</span><span>${pct(s.exp.service)}</span></div><p class="note">Walk-in prospects need someone at the office. The Owner serves when not out on a task; a Clerk covers office hours.</p>`);
      }
      case 'shell': {
        const units = sim.objs('unit').filter((u) => D.shellAt[u.y * s.W + u.x] === o.id);
        const hv = D.hvac[o.id];
        return this.sheet(nm, `${o.w}x${o.h} cells`, `<div class="kv"><span>Units</span><span>${units.length}</span><span>Occupied</span><span>${units.filter((u) => u.lease).length}</span><span>HVAC</span><span>${hv && hv.cap ? Math.round(hv.load) + ' / ' + Math.round(hv.cap) : 'None'}</span></div><p class="note">Use the floor selector (F1/F2) to see inside. Interiors need hallways, a door to the outside, lights, and for Floor 2 an elevator.</p>`);
      }
      case 'canopy': return this.sheet('Covered Canopy', '', '<p class="note">Loading under cover keeps interior customers dry on rainy days.</p>');
      default: return this.sheet(nm, '', '');
    }
  }
  pickAt(cell) {
    const sim = this.sim, s = sim.s, D = sim.D; if (!cell || !sim.inb(cell.x, cell.y)) return null;
    const f = this.rend.view === 1 ? 1 : 0, i = cell.y * s.W + cell.x, WH = s.W * s.H;
    const at = (D.at.get(f * WH + i) || []).map((id) => s.objects[id]).filter(Boolean);
    const order = ['light', 'camera', 'elevator', 'corral', 'door', 'hvac', 'gate', 'unit', 'office', 'canopy'];
    at.sort((a, b) => order.indexOf(a.type) - order.indexOf(b.type));
    const cart = s.carts.find((c) => (c.st === 'stranded' || c.st === 'damaged') && (c.f || 0) === f && Math.floor(c.x) === cell.x && Math.floor(c.y) === cell.y);
    if (cart) return { kind: 'cart', id: cart.id };
    if (this.rend.view === 'ext') { // exterior: roofs hide interiors, pick the shell
      const ext = at.filter((o) => !D.shellAt[i] || o.type === 'shell');
      if (ext.length) return ext[0].id;
      if (D.shellAt[i]) return D.shellAt[i];
    }
    if (at.length) return at[0].id;
    if (D.unitAt[f][i]) return D.unitAt[f][i];
    if (s.dirt[f][i] > 0.3) return { kind: 'dirt', f, x: cell.x, y: cell.y };
    if (D.shellAt[i]) return D.shellAt[i];
    return null;
  }
  tapMap(cell) {
    const p = this.pickAt(cell);
    if (p == null) { if (this.sel != null) this.select(null); return; }
    this.sfx('click'); this.select(p);
  }

  // ------------------------------------------------------------ OPERATE
  operateSheet() {
    const sim = this.sim, s = sim.s;
    const staffName = (id) => { const st = s.staff.find((x) => x.id === id); return st ? `${ROLES[st.role].name} ${st.role === 'owner' ? '' : esc(st.name)}` : ''; };
    const tasks = [...s.tasks].sort((a, b) => (b.pri - a.pri) || (a.created - b.created));
    const owner = s.staff.find((x) => x.role === 'owner'), ownerLeft = owner ? sim.workRemaining(owner) : 0;
    let h = this.diagnosticHtml() + this.officeCoverageHtml() + `<h3>Work queue (${tasks.length})</h3><div class="list">`;
    if (!tasks.length) h += `<p class="note">Nothing waiting. Equipment wear, move-outs, dirt and stranded carts create work here.</p>`;
    for (const t of tasks.slice(0, 14)) {
      const ownerCan = ROLES.owner.can.includes(t.need), hrs = sim.taskHours(t);
      const who = t.assigned === 'vendor' ? 'Vendor booked' : t.assigned ? staffName(t.assigned) + (t.queued ? ' (queued)' : '') : t.unreachable ? 'Unreachable - check routes' : 'Unassigned';
      const loc = t.obj && s.objects[t.obj] ? s.objects[t.obj] : t.x != null ? t : null;
      h += `<div class="item job"><div class="grow"><b>${t.pri >= 2 ? '<span class="pill r">Urgent</span> ' : ''}${esc(t.label)}</b><small>${who}${t.prog ? ' · ' + pct(t.prog) : ''} · ${hrs}h work</small>${!t.assigned ? this.delegationHtml(t) : ''}${!t.assigned && (t.need === 'repair_complex' || t.need === 'repair_simple') ? this.spendingHtml(t.need === 'repair_complex' ? 650 : 250, 0, 'after vendor') : ''}</div><div class="row wrap">
        ${loc ? `<button class="btn sm" data-a="focus" data-x="${loc.x}" data-y="${loc.y}">View</button>` : ''}
        ${!t.assigned && ownerCan ? `<button class="btn sm" data-a="cmd" data-cmd='${JSON.stringify({ type: 'ownerTask', task: t.id })}' ${hrs > ownerLeft ? 'disabled' : ''}>Owner · ${hrs}h</button>` : ''}
        ${!t.assigned && (t.need === 'repair_complex' || t.need === 'repair_simple') ? `<button class="btn sm" data-a="cmd" data-cmd='${JSON.stringify({ type: 'callVendor', task: t.id })}'>Vendor</button>` : ''}
        <button class="btn sm" data-a="cmd" data-cmd='${JSON.stringify({ type: 'taskPri', task: t.id, pri: t.pri >= 2 ? 0 : 2 })}'>${t.pri >= 2 ? 'Normal' : 'Urgent'}</button></div></div>`;
    }
    h += `</div><h3>Staff</h3><div class="list">`;
    for (const st of s.staff) {
      const ag = s.agents.find((a) => a.sid === st.id); const t = ag && ag.task && s.tasks.find((x) => x.id === ag.task);
      const doing = !ag ? 'Needs an office' : t ? esc(t.label) : ag.st === 'office' ? 'At the office' : ag.st === 'home' ? 'Returning to office' : ag.st;
      const cap = sim.workCapacity(st), officeTxt = st.role === 'owner' && (st.officeUsed || 0) ? ` · ${st.officeUsed}h office` : '', capTxt = cap ? ` · ${sim.workRemaining(st)}h of ${cap}h available today${officeTxt}` : '';
      h += `<div class="item"><div class="grow"><b>${ROLES[st.role].name} · ${esc(st.name)}</b><small>${doing}${ag && ag.queue && ag.queue.length ? ` · ${ag.queue.length} queued` : ''}${capTxt} · ${st.wage ? money(st.wage) + '/day' : 'unpaid'}</small></div>${st.role !== 'owner' ? `<button class="btn sm danger" data-a="cmd" data-cmd='${JSON.stringify({ type: 'fire', id: st.id })}'>Let go</button>` : ''}</div>`;
    }
    const focus = this.tutFocus();
    const roleWhy = { porter: 'Adds another 8h/day for make-ready, cleaning and carts.', tech: 'Adds another 8h/day for repairs, including elevators and HVAC.', clerk: 'Handles office shoppers so those 0.5h service blocks stop consuming Owner capacity.', manager: 'Automates commissioning, vendor escalation, cart restocking and monthly pricing.' };
    h += `</div><h3>Hire capacity</h3><div class="list">${['porter', 'tech', 'clerk', 'manager'].sort((a, b) => Number(b === this.hireRoleFocus) - Number(a === this.hireRoleFocus)).map((r) => { const E = sim.staffingEvidence(r); return `<div class="item"><div class="grow"><b>${ROLES[r].name} · ${money(ROLES[r].wage, true)}/day</b><small>${roleWhy[r]} ${esc(E.evidence)} Payroll adds ${money(E.monthlyWages)} over 30 employed days; no guaranteed return.</small>${this.spendingHtml(0, ROLES[r].wage, 'after hire')}</div><button class="btn ${r === 'porter' && focus && focus.tab === 'operate' ? 'pri pulse' : ''}" data-a="cmd" data-cmd='${JSON.stringify({ type: 'hire', role: r })}'>Hire</button></div>`; }).join('')}</div>
      <p class="note">Owner, Porters and Techs each have 8 task-hours per game day. Each in-person office shopper costs the Owner 0.5h without a Clerk. Employed at 7:00 AM: one daily wage accrues. Hire after 7:00 AM: first wage tomorrow. Letting someone go keeps today's accrued wage owed. Routine bills settle weekly.</p>`;
    if (sim.hasManager() || s.mgrLog.length) h += `<h3>Manager log</h3><div class="kv">${s.mgrLog.length ? s.mgrLog.slice(0, 8).map((l) => `<span>Day ${dayOf(l.t)} ${fmtTime(l.t)}</span><span>${esc(l.msg)}</span>`).join('') : '<span>No decisions yet</span><span></span>'}</div>`;
    h += `<h3>Overlays</h3><div class="row wrap">${[['security', 'Security'], ['carts', 'Carts'], ['hvac', 'HVAC'], ['clean', 'Cleanliness'], ['power', 'Power']].map(([k, n]) => `<button class="btn sm ${this.rend.overlay === k ? 'pri' : ''}" data-a="overlay" data-v="${k}">${n}</button>`).join('')}</div>`;
    if (this.rend.overlay === 'security') h += `<p class="note legend">Each patch shows a mark as well as a color. <b>No mark</b> (green): lit and on camera. <b>Dot</b> (blue): camera only. <b>One stripe</b> (yellow): lit only. <b>Cross</b> (red): dark and unwatched - where thieves look first.</p>`;
    if (this.rend.overlay === 'clean') h += `<p class="note legend"><b>No mark</b> (green): clean. <b>One stripe</b> (amber): getting dirty. <b>Cross</b> (red): dirty - customers notice.</p>`;
    if (this.rend.overlay === 'hvac') h += `<p class="note legend"><b>Blue, no mark</b>: building has climate capacity. <b>Cross</b> (red): HVAC overloaded. <b>One stripe</b> (grey): no HVAC. Outlined boxes are climate units; filled circles are HVAC plants.</p>`;
    if (this.rend.overlay === 'carts') h += `<p class="note legend">Circles are cart corrals. <b>Check</b> (green): stocked. <b>One stripe</b> (amber): running low. <b>Cross</b> (red): empty. Small rings mark stranded or damaged carts.</p>`;
    if (this.rend.overlay === 'power') h += `<p class="note legend"><b>No mark</b> (green): powered. <b>Cross</b> (red): shut off because demand exceeds electrical service. Yellow squares are electrical services.</p>`;
    h += `<h3>Carts</h3><div class="list">`;
    for (const q of sim.objs('corral')) h += `<div class="item"><div class="grow"><b>${esc(q.name)}</b><small>${sim.cartsAt(q.id).length} available · target ${q.target || 2}</small></div><button class="btn sm" data-a="sel" data-v="${q.id}">Inspect</button></div>`;
    const str = s.carts.filter((q) => q.st === 'stranded' || q.st === 'damaged').length;
    h += `</div><p class="note">${s.carts.length} carts total · ${str} stranded or damaged.</p>`;
    h += `<h3>Policies</h3><div class="list">
      <div class="item"><div class="grow"><b>Porters recover carts</b><small>Porters return stranded carts to their corral</small></div><button class="toggle ${s.policies.porterCarts ? 'on' : ''}" data-a="policy" data-v="porterCarts" aria-label="Toggle"></button></div>
      <div class="item"><div class="grow"><b>Owner handles chores</b><small>When the office is quiet, the Owner automatically spends available daily work hours on make-readies, cleaning and cart runs. Techs automatically handle repairs; without a Tech, choose an Owner quick fix or a vendor.</small></div><button class="toggle ${s.policies.ownerChores ? 'on' : ''}" data-a="policy" data-v="ownerChores" aria-label="Toggle"></button></div>
      <div class="item"><div class="grow"><b>Preventive maintenance</b><small>Techs service equipment before it fails</small></div><button class="toggle ${s.policies.preventive ? 'on' : ''}" data-a="policy" data-v="preventive" aria-label="Toggle"></button></div></div>`;
    return this.sheet('Operate', `${s.staff.length} staff · ${tasks.length} tasks`, h);
  }

  // ------------------------------------------------------------ BUSINESS
  cmdBtn(label, cmd, cls = '', dis = false) { return `<button class="btn sm ${cls}" data-a="cmd" data-cmd='${JSON.stringify(cmd).replace(/'/g, '&#39;')}' ${dis ? 'disabled' : ''}>${label}</button>`; }
  stagePill(L) {
    const st = this.sim.stageOf(L), cls = { current: 'g', pastdue: 'a', plan: 'b', delinquent: 'r', lien: 'r', notice: 'r', auction: 'r' }[L.status] || 'a';
    return `<span class="pill ${cls}">${st}</span>`;
  }
  reportHtml() {
    const sim = this.sim, s = sim.s, R = s.mkt && s.mkt.reports[s.mkt.reports.length - 1];
    if (!R) return sim.pressureOn() || s.mode !== 'tutorial' ? `<h3>Monthly report</h3><p class="note">Your first report card arrives on Day ${Math.max(31, Math.ceil((sim.day - 1) / 30) * 30 + 1)}: a grade, what changed, and the top things to fix.</p>` : '';
    const chg = (a, b, f) => b == null ? '' : ` <span class="${a >= b ? 'up' : 'down'}">${a >= b ? '▲' : '▼'} ${f(Math.abs(a - b))}</span>`;
    const L = R.lost || {}; const lostN = Object.values(L).reduce((a, b) => a + b, 0);
    return `<h3>Monthly report · Month ${R.month}</h3><div class="report"><div class="grade g${R.grade}">${R.grade}</div><div class="rgrow">
      <div class="kv"><span>Occupancy</span><span>${pct(R.occ)} (${R.occN}/${R.units})</span><span>Rent roll</span><span>${money(R.roll)}${chg(R.roll, R.rollPrev, money)}</span><span>Operating contribution</span><span class="${R.contrib < 0 ? 'neg' : ''}">${money(R.contrib)}</span><span>Reputation</span><span>${pct(R.rep)}${chg(R.rep, R.repPrev, pct)}</span><span>Reviews</span><span>${R.rating != null ? R.rating.toFixed(1) + ' ★' : 'Not enough yet'}</span><span>Leases / move-outs</span><span>${R.leases} / ${R.moveouts}</span>${R.upkeep != null ? `<span>Upkeep</span><span class="${R.upkeep < 6 ? 'neg' : ''}">${R.upkeep}/10</span><span>Growth</span><span>${R.growPts}/15</span>` : ''}<span>Unconverted shoppers</span><span>${lostN}</span></div>${R.stale ? `<p class="note">${R.stale} job${R.stale > 1 ? 's' : ''} waiting 2+ days.</p>` : ''}${R.upkeep != null ? `<p class="note">Rent roll ${R.growth >= 0 ? '+' : ''}${Math.round(R.growth * 100)}% over 3 months.</p>` : ''}${(() => { const ti = this.g.tierInfo && !s.scenario && this.g.tierInfo(), nx = ti && ti.next; return nx ? `<p class="note goalnote"><b>Next goal: ${esc(nx.name)}.</b> Rent roll ${money(ti.roll)} of ${money(nx.roll)}/mo (${Math.round(Math.min(1, ti.roll / nx.roll) * 100)}%)${nx.props > 1 ? `, properties ${ti.n} of ${nx.props}` : ''}. Unlocks ${nx.perks.map(esc).join('; ')}.</p>` : ''; })()}
      <small class="note">${esc(R.season)}${R.comps.length ? ' · Competing with ' + esc(R.comps.join(', ')) : ''}</small></div></div>
      ${R.sug.length ? `<div class="list sug">${R.sug.map((t, i) => `<div class="item"><span class="num">${i + 1}</span><div class="grow">${esc(t)}</div></div>`).join('')}</div>` : '<p class="note">Nothing urgent. Keep it up.</p>'}`;
  }
  advertisingHtml() {
    const sim = this.sim, s = sim.s, active = sim.activeAd();
    const recent = (s.mkt.adHistory || []).slice(-1)[0];
    const roi = (a) => a ? (a.revenue || 0) - (a.cost || 0) : 0;
    let h = '<h3>Advertising</h3>';
    if (active) {
      const net = roi(active), days = Math.max(0, active.until - sim.day + 1);
      h += '<div class="item"><div class="grow"><b>' + esc(active.label) + '</b><small>' + days + ' day' + (days === 1 ? '' : 's') + ' left · ' + (active.inquiries || 0) + ' extra shopper' + ((active.inquiries || 0) === 1 ? '' : 's') + ' attributed · ' + (active.leases || 0) + ' lease' + ((active.leases || 0) === 1 ? '' : 's') + ' · first-month rent ' + money(active.revenue || 0) + '</small></div><span class="pill ' + (net >= 0 ? 'g' : 'a') + '">' + (net >= 0 ? '+' : '') + money(net) + ' vs spend</span></div>';
      h += '<p class="note">Only the campaign-created share of shoppers is attributed here. A campaign cannot fix bad pricing, no vacancy, poor access or weak reviews.</p>';
    } else {
      const ready = sim.objs('unit').filter((u) => u.cstate === 'operating' && u.commercial === 'ready' && !u.blocked);
      const bySize = {};
      for (const u of ready) (bySize[u.size] ||= []).push(u);
      h += '<p class="note">Ads create more shoppers, not guaranteed leases. Focus on a size you actually have vacant and competitively priced. The simple break-even below is campaign cost ÷ current asking rent.</p><div class="list">';
      h += '<div class="item"><div class="grow"><b>Local search · 30 days</b><small>+15% shopper traffic across all sizes · $500. Best when several sizes have vacancy.</small>' + this.spendingHtml(500, 0, 'after campaign') + '</div>' + this.cmdBtn('Run $500', { type: 'ad', kind: 'local' }, '', !s.open) + '</div>';
      for (const sz of Object.keys(MARKETS[s.market.id].demand)) {
        const units = bySize[sz] || [], ask = s.market.ask[productKey(sz, 'std')] || MARKETS[s.market.id].rent[sz], be = Math.max(1, Math.ceil(250 / Math.max(1, ask)));
        h += '<div class="item"><div class="grow"><b>Target ' + esc(sz) + ' · 30 days</b><small>+50% ' + esc(sz) + ' shopper traffic · $250 · ' + units.length + ' rent-ready now · roughly ' + be + ' new lease' + (be === 1 ? '' : 's') + ' at ' + money(ask) + '/mo to cover the spend.</small>' + this.spendingHtml(250, 0, 'after campaign') + '</div>' + this.cmdBtn('Run $250', { type: 'ad', kind: 'size', target: sz }, '', !s.open) + '</div>';
      }
      h += '</div>';
      if (recent) {
        const net = roi(recent);
        h += '<p class="note"><b>Last campaign:</b> ' + esc(recent.label) + ' · ' + (recent.inquiries || 0) + ' extra shoppers · ' + (recent.leases || 0) + ' leases · ' + money(recent.revenue || 0) + ' first-month rent against ' + money(recent.cost || 0) + ' spend (' + (net >= 0 ? '+' : '') + money(net) + ').</p>';
      }
    }
    return h;
  }

  marketHtml() {
    const sim = this.sim, s = sim.s; if (!sim.pressureOn()) return '';
    let h = `<h3>Your market</h3><div class="list">`;
    const sv = sim.season(); h += `<div class="item"><div class="grow"><b>${esc(sim.seasonName())}</b><small>Shopper traffic is ${sv >= 1 ? 'up' : 'down'} ${Math.round(Math.abs(sv - 1) * 100)}% vs. an average month. Costs have risen ${Math.round((sim.costIdx() - 1) * 1000) / 10}% and market rents ${Math.round((sim.rentIdx() - 1) * 1000) / 10}% since Day 1.</small></div></div>`;
    for (const c of s.mkt.comp) {
      const open = sim.day >= c.opens;
      h += `<div class="item"><div class="grow"><b>${esc(c.name)} · ${c.dist} mi away</b><small>${open ? `Open since Day ${c.opens}. Charges about ${Math.round((1 - c.price) * 100)}% under market and is taking ~${Math.round(sim.compShare() * 100 / Math.max(1, sim.openComps().length))}% of local shoppers. A strong reputation limits that; tenants paying well above their price are more likely to leave.` : `Under construction, opens Day ${c.opens}. Expect it to undercut market rents by ~${Math.round((1 - c.price) * 100)}%.`}</small></div><span class="pill ${open ? 'r' : 'y'}">${open ? 'Open' : 'Coming'}</span></div>`;
    }
    if (!s.mkt.comp.length) h += `<div class="item"><div class="grow"><b>No direct competitors yet</b><small>Developers watch busy markets. A new facility nearby would take shoppers and push prices down.</small></div></div>`;
    h += `</div>`;
    h += this.advertisingHtml();
    // why shoppers didn't sign
    const lost = sim.lostRecent(30); const tot = Object.values(lost).reduce((a, b) => a + b, 0);
    const WHY = { noReady: ['Nothing ready to rent', 'Turn vacant units over faster, or build more of what sells out.'], noSize: ['Size not offered', 'You have no units of the size they wanted. Build some.'], noClimate: ['Needed climate control', 'Add an HVAC plant and climate units.'], price: ['Too expensive', 'Your asking rent is well above market for them.'], competitor: ['Went to a competitor', 'A cheaper facility nearby. Close the price gap or out-compete on quality.'], convenience: ['Inconvenient', 'Long walks, cart shortages or elevator waits.'], reputation: ['Put off by reputation', 'Low reputation and reviews. Fix what customers complain about.'], shopping: ['Kept shopping', 'Normal: some shoppers always compare.'], service: ['Gave up waiting', 'Nobody at the counter. A Clerk keeps the office covered.'] };
    h += `<h3>Why shoppers didn't sign · 30 days</h3>`;
    if (!tot) h += `<p class="note">No lost shoppers in the last 30 days.</p>`;
    else h += `<div class="list">${Object.entries(lost).sort((a, b) => b[1] - a[1]).map(([k, n]) => { const w = WHY[k] || [k, '']; return `<div class="item"><div class="grow"><b>${w[0]}</b><small>${w[1]}</small></div><b class="num">${n}</b></div>`; }).join('')}</div>`;
    // reviews
    const rv = (s.mkt.reviews || []).slice(-3).reverse(); const r = sim.rating();
    h += `<h3>Reviews${r != null ? ` · ${r.toFixed(1)} ★` : ''}</h3>`;
    h += rv.length ? `<div class="list">${rv.map((x) => `<div class="item"><div class="grow"><b class="stars">${'★'.repeat(x.stars)}<i>${'★'.repeat(5 - x.stars)}</i></b><small>"${esc(x.text)}" · ${esc(x.name)}, Day ${dayOf(x.t)}</small></div></div>`).join('')}</div><p class="note">About 40% of shoppers look online first. Good reviews bring more of them in; bad ones turn them away.</p>` : `<p class="note">Tenants post reviews over time. They reflect what they actually experienced on the property.</p>`;
    return h;
  }
  collectionsHtml() { // GDD §36
    const sim = this.sim, s = sim.s, P = s.policies, day = sim.day;
    const late = Object.values(s.leases).filter((L) => L.status !== 'current').sort((a, b) => a.dueSince - b.dueSince);
    const order = ['pastdue', 'plan', 'delinquent', 'lien', 'notice', 'auction'];
    const counts = order.map((k) => [k, late.filter((L) => L.status === k).length]).filter(([, n]) => n);
    let h = `<h3>Collections</h3>`;
    h += `<div class="ladder">${order.map((k) => { const n = late.filter((L) => L.status === k).length; return `<div class="rung ${n ? 'on' : ''}"><b>${n}</b><small>${sim.stageOf({ status: k })}</small></div>`; }).join('')}</div>`;
    if (!late.length) h += `<p class="note">Every tenant is current. Missed payments move through past due, delinquent (overlocked at 15 days), lien-eligible (30 days), a 14-day lien notice, then the Saturday auction.</p>`;
    else {
      h += `<div class="list">`;
      for (const L of late.slice(0, 8)) {
        const u = s.objects[L.unit], tn = s.tenants[L.tenant]; if (!u) continue;
        const d = day - L.dueSince, acts = [];
        if (['pastdue', 'delinquent', 'lien'].includes(L.status) && d >= 30) acts.push(this.cmdBtn('Lien notice', { type: 'collect', op: 'notice', lease: L.id }, 'pri'));
        if (['pastdue', 'delinquent', 'lien', 'notice'].includes(L.status) && !L.planTried) acts.push(this.cmdBtn('Offer plan', { type: 'collect', op: 'plan', lease: L.id }));
        if (L.fees > 0) acts.push(this.cmdBtn('Waive fees', { type: 'collect', op: 'waive', lease: L.id }));
        if (u.overlock && L.status !== 'auction') acts.push(this.cmdBtn('Remove overlock', { type: 'collect', op: 'unlock', lease: L.id }));
        if (L.status === 'auction') acts.push(this.cmdBtn('Pull from auction', { type: 'collect', op: 'hold', lease: L.id }));
        const when = L.status === 'notice' ? ` · auction eligible Day ${L.noticeUntil}` : L.status === 'auction' ? ` · auction Day ${L.auctionDay}, 10 AM` : L.status === 'plan' ? ` · balance due Day ${L.planDue}` : '';
        h += `<div class="item stack"><div class="grow"><div class="acct"><b>${esc(u.name)} · ${esc(tn ? tn.name : 'Tenant')}</b>${this.stagePill(L)}${u.overlock ? '<span class="pill r">Overlocked</span>' : ''}</div><small>${d} days late · owes ${money(sim.owed(L))}${when}</small></div><div class="row wrap acts">${acts.join('')}<button class="btn sm" data-a="sel" data-v="${u.id}">View</button></div></div>`;
      }
      h += `</div>`;
    }
    const A = s.auction; const res = A && (A.result || A.prev);
    if (A && !A.done) h += `<p class="note"><b>Next auction:</b> Day ${A.day}, 10 AM at the office · ${late.filter((L) => L.status === 'auction').length} lot(s)</p>`;
    if (res && res.sold && res.sold.length) h += `<p class="note">Last ${res.mode === 'auction' ? 'auction' : 'clean-out'}: ${res.sold.map((x) => `Unit ${x.num}${res.mode === 'auction' ? ' ' + money(x.price) : ''}`).join(', ')}${res.mode === 'auction' ? ` · total ${money(res.total)}` : ''}</p>`;
    h += `<div class="list">
      <div class="item"><div class="grow"><b>Late fee</b><small>Added once, 5 days after a missed payment</small></div><div class="row">${[0, 20, 40].map((v) => this.cmdBtn(v ? money(v) : 'None', { type: 'policy', key: 'lateFee', v }, P.lateFee === v ? 'pri' : '')).join('')}</div></div>
      <div class="item"><div class="grow"><b>Overlock at 15 days</b><small>Delinquent tenants can't access their unit until they pay</small></div><button class="toggle ${P.overlock ? 'on' : ''}" data-a="policy" data-v="overlock" aria-label="Toggle overlock"></button></div>
      <div class="item"><div class="grow"><b>Automatic lien notices</b><small>Send the notice at 30 days without asking. A Manager does this anyway.</small></div><button class="toggle ${P.autoNotice ? 'on' : ''}" data-a="policy" data-v="autoNotice" aria-label="Toggle automatic notices"></button></div>
      <div class="item"><div class="grow"><b>Resolution</b><small>Auction recovers money; clean-out and donate costs $120 but is quieter</small></div><div class="row">${this.cmdBtn('Auction', { type: 'policy', key: 'resolution', v: 'auction' }, P.resolution === 'auction' ? 'pri' : '')}${this.cmdBtn('Clean-out', { type: 'policy', key: 'resolution', v: 'clearout' }, P.resolution === 'clearout' ? 'pri' : '')}</div></div>
      <div class="item"><div class="grow"><b>Retention offers</b><small>Staff offer 10% off to tenants leaving over price</small></div><button class="toggle ${P.retention ? 'on' : ''}" data-a="policy" data-v="retention" aria-label="Toggle retention offers"></button></div></div>`;
    return h;
  }
  financingHtml() { // GDD §37: a simple, readable loan model
    const sim = this.sim, s = sim.s, ox = sim.dailyOpex(), pay = s.staff.reduce((a, st) => a + st.wage, 0);
    const burn = ox.total + pay, lim = sim.loanLimit(), { rate, months } = sim.loanTerms();
    let h = `<h3>Financing</h3><div class="list">`;
    for (const d of s.debt) {
      h += `<div class="item"><div class="grow"><b>Term loan · ${money(d.bal)} left</b><small>${money(d.orig)} at ${(d.rate * 100).toFixed(1)}% · ${money(d.pmt)}/mo · ${d.months - d.paid} payments left · next Day ${d.next}</small></div>${this.cmdBtn('Pay off', { type: 'payoff', id: d.id }, '', s.cash < d.bal)}</div>`;
    }
    const tut = s.mode === 'tutorial' && !s.tut.done;
    const opts = [10000, 25000, 50000, 100000].filter((v) => v <= lim);
    h += `<div class="item"><div class="grow"><b>Expansion loan</b><small>${tut ? 'Opens after the tutorial: early growth is cash-funded.' : lim ? `Approved up to ${money(lim)} · ${(rate * 100).toFixed(1)}% · ${months} months. Payments are capped at 45% of your rent roll.` : 'Your rent roll is too small to support loan payments yet.'}</small></div></div>`;
    if (opts.length) h += `<div class="loanopts">${opts.map((v) => { const pm = sim.loanPmt(v, rate, months); return `<button class="loanopt" data-a="cmd" data-cmd='${JSON.stringify({ type: 'borrow', amt: v })}'><b>${money(v)}</b><small>${money(pm)}/mo · cash after ${money(s.cash + v)}</small></button>`; }).join('')}</div>`;
    const room = sim.creditLimit() - s.loan.bal;
    h += `<div class="item"><div class="grow"><b>Credit line · ${s.loan.bal > 0 ? money(s.loan.bal) + ' owed' : 'not in use'}</b><small>${money(room)} available · ~1.2%/month · for short cash gaps${burn > 0 ? ` · cash covers ~${Math.max(0, Math.floor(s.cash / burn))} days of costs` : ''}</small></div>
      ${room >= 1000 ? this.cmdBtn(`Borrow ${money(Math.min(room, 5000))}`, { type: 'loan', amt: Math.min(room, 5000) }) : ''}
      ${s.loan.bal > 0 ? this.cmdBtn(`Repay ${money(Math.min(s.loan.bal, 5000))}`, { type: 'repay', amt: Math.min(s.loan.bal, 5000) }, '', s.cash < Math.min(s.loan.bal, 5000)) : ''}</div></div>`;
    h += `<p class="note">Loans show exactly what you commit to each month. Nothing here forecasts future rent: build previews show cash before and after.</p>`;
    return h;
  }
  sandboxHtml() {
    const sim = this.sim, s = sim.s, B = s.sb, free = B.unlimited;
    const R = sim.opResult(30), P = sim.sbGoalProgress();
    const wear = s.opts.wear ?? 1, gl = (k, label) => `<button class="btn sm ${B.goal && B.goal.k === k ? 'pri' : ''}" data-a="sbSet" data-k="goal" data-v='${JSON.stringify(k)}'>${label}</button>`;
    const flags = [free ? 'Unlimited funds' : `Started with ${money(B.cash0 || 0)}`, `Demand ×${s.opts.demand ?? 1}`, `Costs ×${s.opts.costs ?? 1}`, wear ? `Wear ×${wear}` : 'Maintenance off', (B.tiers === 'all' ? 'All perks unlocked' : 'Perks earned'), B.instant ? 'Instant construction ON' : 'Normal build times'];
    let h = `<div class="sb-panel"><h3>${free ? 'Free Build' : 'Business sandbox'}${B.modified ? ' <span class="sb-mod">Modified</span>' : ''}</h3><p class="note">${flags.join(' · ')}</p>
      <div class="kv"><span>Operating result, last ${R.n || 0} days</span><span class="${R.amt < 0 ? 'neg' : ''}">${money(R.amt)}</span></div>
      <p class="note">Rent and fees minus operating costs, payroll, services and interest. Construction, loans and sandbox funds are not counted.</p>
      ${free ? `<div class="kv"><span>Free Build funds used</span><span>${money(B.subsidy || 0)}</span></div><p class="note">Spending beyond your cash. A business would have needed this money from somewhere.</p>` : `<div class="kv"><span>Sandbox funds added</span><span>${money(B.injected || 0)}</span></div>`}
      <h3>Goal</h3><p class="note">${P ? `${esc(B.goal.label)}: ${esc(P.text)}${B.goal.done ? ` · <b>Met on day ${B.goal.done}</b>` : ''}` : 'No goal. Pick one if you want a target.'}</p>
      <div class="row wrap">${gl(null, 'None')}${gl('occ', '90% leased')}${gl('profit', '$3k in 30 days')}${gl('units', '40 units')}${gl('backlog', 'No backlog')}</div>
      <h3>Sandbox controls</h3><div class="row wrap"><button class="btn sm" data-a="sbSet" data-k="instant" data-v="${!B.instant}">Instant construction: ${B.instant ? 'on' : 'off'}</button>
      ${free ? '' : `<button class="btn sm" data-a="sbFunds" data-v="10000">Add $10,000</button><button class="btn sm" data-a="sbFunds" data-v="50000">Add $50,000</button><button class="btn sm" data-a="sbSet" data-k="unlimited" data-v="true">Switch to Free Build</button>`}</div>
      <p class="note">${free ? 'Instant construction can be switched any time. It is recorded in the log.' : 'Added funds, Free Build and instant construction are recorded and mark this save as Modified. Switching to Free Build cannot be undone.'}</p>`;
    // cash shortage: what is driving it, what still earns, how to recover (Business only)
    const ox = sim.dailyOpex(), pay = s.staff.reduce((a, st) => a + st.wage, 0), debt = s.debt.reduce((a, d) => a + d.pmt, 0) / 30, burn = ox.total + pay + debt;
    if (!free && (s.cash < 0 || (burn > 0 && s.cash < burn * 14))) {
      const leased = sim.objs('unit').filter((u) => u.lease).length, vac = sim.objs('unit').filter((u) => u.cstate === 'operating' && !u.lease && !u.blocked).length;
      h += `<div class="sb-short"><b>${s.cash < 0 ? 'Cash is negative' : `Cash covers about ${Math.max(0, Math.floor(s.cash / burn))} days of costs`}</b>
        <div class="kv"><span>Operating costs / day</span><span>${money(ox.total)}</span><span>Payroll / day</span><span>${money(pay)}</span>${debt ? `<span>Loan payments / day</span><span>${money(debt)}</span>` : ''}</div>
        <p class="note">Still earning: ${leased} leased unit${leased === 1 ? '' : 's'} (${money(sim.rentRollPaying())}/mo from paying tenants)${vac ? `, plus ${vac} vacant unit${vac === 1 ? '' : 's'} ready to rent` : ''}. ${s.cash < 0 ? 'New construction and hiring need cash. ' : ''}Ways to recover: fill vacant units or adjust prices in Pricing, let staff go in Staff, draw on the credit line below if offered, or add sandbox funds.</p></div>`;
    }
    if (B.log && B.log.length) h += `<details class="sb-log"><summary>Sandbox log (${B.log.length})</summary>${B.log.slice(-8).reverse().map((e) => `<div>Day ${e.day}: ${esc(e.msg)}</div>`).join('')}</details>`;
    return h + '</div>';
  }
  businessSheet() {
    const sim = this.sim, s = sim.s; const occ = sim.occupancy(), roll = sim.rentRoll(), ox = sim.dailyOpex();
    const pay = s.staff.reduce((a, st) => a + st.wage, 0);
    const paying = sim.rentRollPaying(), rcv = sim.receivables();
    const last = s.days.slice(-29); const sum = (k) => last.reduce((a, d) => a + (d[k] || 0), 0) + (s.today[k] || 0);
    const collected = sum('rent'), costs = sum('opex') + sum('payroll'), capex = sum('capex');
    let h = s.sb ? this.sandboxHtml() : '';
    h += `<div class="stats">
      <div class="stat"><small>Cash</small><b class="${s.cash < 0 ? 'neg' : ''}">${money(s.cash)}</b><div class="n">Money you have now. Unpaid rent is not included.</div></div>
      <div class="stat"><small>Owed to you</small><b>${money(rcv.amt)}</b><div class="n">${rcv.n ? `${rcv.n} account${rcv.n > 1 ? 's' : ''} behind · not cash until paid` : 'Every tenant is paid up'}</div></div>
      <div class="stat"><small>Monthly rent roll</small><b>${money(roll)}</b><div class="n">${money(paying)} from paying tenants${roll - paying > 0 ? ` · ${money(roll - paying)} past due` : ''} · ${occ.occ} of ${occ.n} units leased (${pct(occ.pct)})</div></div>
      <div class="stat"><small>Rent collected, last 30 days</small><b>${money(collected)}</b><div class="n">Received, already in cash</div></div>
      <div class="stat"><small>Operating cost / day</small><b>${money(ox.total + pay)}</b><div class="n">${money(ox.total, true)} ops${ox.tax ? ` (incl. ${money(ox.tax, true)} tax & insurance)` : ''} + ${money(pay)} payroll</div></div>
      </div>`;
    h += this.financialHtml() + this.diagnosticHtml();
    h += this.reportHtml() + this.marketHtml();
    // GDD §63.1–63.2: operating contribution, with capital and financing shown separately
    const anc = sum('anc'), svc = sum('service'), marketing = sum('marketing');
    const result = collected + anc - costs - svc - marketing - sum('interest');
    const C = sim.cashWindow(30);
    h += `<h3>Operating performance · 30 calendar days</h3><div class="kv stmt">
      <span>Rent and fees collected</span><span>${money(collected + anc)}</span>
      <span>Operating expenses incurred</span><span>${money(-sum('opex'))}</span>
      <span>Payroll incurred</span><span>${money(-sum('payroll'))}</span>
      <span>Vendors and advertising</span><span>${money(-svc - marketing)}</span>
      <span>Interest incurred</span><span>${money(-sum('interest'))}</span>
      <span class="tot">Operating result</span><span class="tot ${result < 0 ? 'neg' : ''}">${money(result)}</span></div>
      <p class="note">Collected rent and fees minus expenses incurred. Rent remains monthly and lumpy. Weekly payment does not record the same expense again. Construction, principal payments, loans and added funds are separate cash movements.</p>
      <h3>Actual cash flow · 30 calendar days</h3><div class="kv"><span>Cash in</span><span>${money(C.incoming)}</span><span>Cash out</span><span>${money(-C.outgoing)}</span><span>Net cash change${C.complete ? '' : ' (retained history only)'}</span><span>${money(C.net)}</span></div>`;
    h += this.collectionsHtml();
    if (!sim.unlimited()) h += this.financingHtml();
    h += `
      <h3>Last 14 days</h3><canvas class="chart" width="520" height="120"></canvas><p class="note">Bars above the line: rent collected (green). Below the line: operating + payroll (solid red), then construction (grey with stripes). A monthly-billing business looks lumpy day to day.</p>`;
    h += `<h3>Asking rents</h3><div class="list">`;
    const M = MARKETS[s.market.id];
    const products = new Set(sim.objs('unit').map((u) => productKey(u.size, u.env)));
    for (const k of Object.keys(s.market.ask)) {
      if (!products.has(k) && !k.endsWith('std')) continue;
      const [sz, env] = k.split('|'); const mk = Math.round(sim.marketRent({ size: sz, env })); const ask = s.market.ask[k];
      const units = sim.objs('unit').filter((u) => productKey(u.size, u.env) === k && u.cstate === 'operating'); const vac = units.filter((u) => !u.lease).length;
      const d = ask / mk - 1;
      h += `<div class="item"><div class="grow"><b>${sz}${env === 'climate' ? ' climate' : ''}</b><small>Market ${money(mk)} · ${units.length} units · ${vac} vacant ${Math.abs(d) > 0.02 ? `· <span class="pill ${d > 0 ? 'a' : 'b'}">${d > 0 ? '+' : ''}${Math.round(d * 100)}%</span>` : ''}</small></div>
        <div class="stepper"><button data-a="rent" data-k="${k}" data-v="-5" aria-label="Lower rent">-</button><b class="num" style="min-width:48px;text-align:center">${money(ask)}</b><button data-a="rent" data-k="${k}" data-v="5" aria-label="Raise rent">+</button></div></div>`;
    }
    h += `</div><p class="note">Asking rent affects how strongly the market responds. Existing leases keep their rent unless you run a rent review.</p>`;
    const rv = [...products].map((k) => ({ k, p5: sim.rentReviewPreview(k, 0.05), p10: sim.rentReviewPreview(k, 0.1) })).filter((r) => r.p5.n);
    h += `<h3>Existing-tenant rent review</h3>`;
    if (!rv.length) h += `<p class="note">No tenants are eligible. Tenants qualify after 6 months without an increase, when they pay below your asking rent.</p>`;
    else {
      h += `<div class="list">${rv.map(({ k, p5, p10 }) => { const [sz, env] = k.split('|'); return `<div class="item"><div class="grow"><b>${sz}${env === 'climate' ? ' climate' : ''}</b><small>${p5.n} eligible tenant${p5.n > 1 ? 's' : ''} below asking</small></div>
        <button class="btn sm" data-a="cmd" data-cmd='${JSON.stringify({ type: 'rentReview', key: k, pct: 0.05 })}'>+5% (+${money(p5.delta)}/mo)</button><button class="btn sm" data-a="cmd" data-cmd='${JSON.stringify({ type: 'rentReview', key: k, pct: 0.1 })}'>+10% (+${money(p10.delta)}/mo)</button></div>`; }).join('')}</div>
        <p class="note">Increases never exceed your current asking rent. Tenants notice: satisfaction drops and move-out risk is higher for 60 days.</p>`;
    }
    const P = sim.D.power;
    if (P) {
      const shells = sim.objs('shell').filter((o) => o.cstate === 'operating');
      h += `<h3>Utilities</h3><div class="kv"><span>Electrical service</span><span class="${P.demand > P.cap ? 'neg' : ''}">${P.demand.toFixed(1)} / ${P.cap} kW${P.shed.length ? ` · ${P.shed.length} shut off` : P.demand > P.cap * 0.85 ? ' · near limit' : ''}</span>
        ${shells.map((sh, k) => `<span>Water · Building ${k + 1}</span><span>${sim.D.water.has(sh.id) ? 'Connected' : 'None'}</span>`).join('')}</div>
        <p class="note">Elevators and HVAC plants draw the most power. When demand exceeds service, amenities shut off first, then HVAC, then elevators.</p>`;
    }
    const lost = Object.entries(s.lost).sort((a, b) => b[1] - a[1]);
    if (lost.length) h += `<h3>Lost demand</h3><div class="kv">${lost.map(([k, v]) => `<span>${LOST[k] || k}</span><span>${v}</span>`).join('')}</div>`;
    h += `<h3>Recent ledger</h3><div class="kv">${s.ledger.slice(-8).reverse().map((l) => `<span>Day ${dayOf(l.t)} · ${esc(l.note || l.cat)}</span><span style="color:${l.amt < 0 ? 'var(--red)' : 'var(--green)'}">${money(l.amt)}</span>`).join('')}</div>`;
    return this.sheet('Business', `${MARKETS[s.market.id].name}`, h);
  }
  drawChart(cv) {
    const s = this.sim.s, g = cv.getContext('2d'), W = cv.width, H = cv.height; g.clearRect(0, 0, W, H);
    const days = [...s.days.slice(-13), s.today]; const n = 14;
    const max = Math.max(50, ...days.map((d) => Math.max(d.rent, d.opex + d.payroll + d.capex)));
    const mid = H * 0.55, bw = W / n;
    g.fillStyle = '#d6cfc0'; g.fillRect(0, mid, W, 1);
    days.forEach((d, k) => {
      const x = (n - days.length + k) * bw + bw * 0.18, w = bw * 0.64;
      const up = (d.rent / max) * (mid - 12); g.fillStyle = '#2f8f5b'; g.fillRect(x, mid - up, w, up);
      const c1 = ((d.opex + d.payroll) / max) * (H - mid - 14); g.fillStyle = '#c8412f'; g.fillRect(x, mid + 1, w, c1);
      const c2 = (d.capex / max) * (H - mid - 14); g.fillStyle = '#9aa1a8'; g.fillRect(x, mid + 1 + c1, w, c2);
      if (c2 > 2) { g.save(); g.beginPath(); g.rect(x, mid + 1 + c1, w, c2); g.clip(); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5; for (let q = -c2; q < w + c2; q += 5) { g.beginPath(); g.moveTo(x + q, mid + 1 + c1); g.lineTo(x + q + c2, mid + 1 + c1 + c2); g.stroke(); } g.restore(); }
      g.fillStyle = '#6c737b'; g.font = '10px system-ui'; g.textAlign = 'center'; if (k % 2 === 0 || days.length < 8) g.fillText(String(d.day), x + w / 2, H - 2);
    });
    g.fillStyle = '#6c737b'; g.textAlign = 'left'; g.font = '10px system-ui'; g.fillText(money(Math.round(max)), 4, 11);
    g.textAlign = 'right'; g.fillText('Rent in \u2191', W - 4, 11); g.fillText('Costs out \u2193', W - 4, mid + 13);
  }

  // ------------------------------------------------------------ GROWTH
  growthSheet() {
    const sim = this.sim, s = sim.s;
    let h = '';
    // not open yet: the opening checklist comes first (the coach sends players here; on phones it used to sit below the fold)
    if (!s.open) {
      const iss = sim.openingIssues();
      const nReady = sim.objs('unit').filter((u) => u.cstate === 'ready').length, nUnits = sim.objs('unit').length;
      const fix = (m) => /gate/i.test(m) ? (sim.objs('gate').length ? '' : this.issueBtn('Place a gate', 'gate')) : /No operating office/.test(m) ? (sim.objs('office').length ? '<small> (being built)</small>' : this.issueBtn('Place an office', 'office')) : /Office door/.test(m) ? this.issueBtn('Pave a walkway', 'walk') : /commissioned/.test(m) ? (nReady ? `<button class="btn sm go" data-a="cmd" data-cmd='${JSON.stringify({ type: 'commission', all: true })}'>Commission ${nReady} ready</button>` : nUnits ? '<small> (units under construction)</small>' : this.issueBtn('Build units', 'du5x10')) : '';
      h += `<h3>Open for business</h3>${iss.length ? `<div class="miss"><b>Before you can open</b><ul>${iss.map((m) => `<li>${esc(m)} ${fix(m)}</li>`).join('')}</ul></div>` : '<p class="note">Everything needed is in place.</p>'}<button class="btn go" data-a="cmd" data-cmd='${JSON.stringify({ type: 'open' })}' ${iss.length ? 'disabled' : ''}>Open property</button>`;
    }
    if (s.scenario) { const prog = scenarioProgress(sim); h += `<h3>Scenario goals · ${esc(s.scenario.name)}</h3><div class="kv">${prog.map((g) => `<span>${g.met ? '&#10003; ' : ''}${esc(g.label)}</span><span>${this.fmtGoal(g, g.cur)}</span>`).join('')}<span>Deadline</span><span>Day ${s.scenario.deadline} (${s.scenario.status})</span></div>`; }
    const growthPlan = this.growthPlanArgs ? sim.plan(this.growthPlanArgs) : null;
    if (growthPlan && this.growthPlanArgs.rush && (s.coTier || 1) >= 2 && !sim.instantOn() && growthPlan.dur) {
      growthPlan.cost = Math.round(growthPlan.cost * 1.25); growthPlan.dur *= 0.5;
    }
    const readiness = sim.growthReadiness(growthPlan);
    h += `<h3>Growth Readiness</h3>${growthPlan ? `<p class="note">Selected proposal: ${esc(growthPlan.label)} · ${money(growthPlan.cost)}. Includes selected construction only.</p>` : ''}<p class="note"><b>${readiness.title}</b></p><div class="list">${readiness.checks.map((c) => `<div class="item"><div class="grow"><b>${c.ok ? '&#10003;' : '!'} ${c.label}</b><small>${esc(c.detail)}</small></div></div>`).join('')}</div><p class="note">LAYOUT → OPERATIONS → ECONOMICS → GROWTH. Complete expansion packages aim for 12–18 months; reuse of existing infrastructure and spare capacity can pay back faster. Evidence is advisory, not a hidden score or build restriction.</p>`;
    if (this.g.tierInfo && !s.creative && !s.scenario && !(s.mode === 'tutorial' && !s.tut.done)) {
      const ti = this.g.tierInfo(), nx = ti.next;
      h += `<h3>Operator career</h3><div class="career"><div class="tier"><small>Level ${ti.cur.n} of ${TIERS.length}</small><b>${ti.cur.name}</b></div>`;
      if (nx) { const pr = Math.min(1, ti.roll / nx.roll), pp = Math.min(1, ti.n / nx.props);
        h += `<div class="goal"><span>Next: <b>${nx.name}</b></span><div class="bar"><i style="width:${Math.round(pr * 100)}%"></i></div><small>Portfolio rent roll ${money(ti.roll)} of ${money(nx.roll)}/mo${nx.props > 1 ? ` · Properties ${ti.n} of ${nx.props}` : ''}</small>${nx.props > 1 ? `<div class="bar"><i style="width:${Math.round(pp * 100)}%"></i></div>` : ''}<small class="perks">Unlocks: ${nx.perks.map(esc).join(' · ')}</small></div>`; }
      h += `<small class="perks">Your perks: ${TIERS.filter((T) => T.n <= ti.cur.n).flatMap((T) => T.perks).map(esc).join(' · ')}</small></div>`;
    }
    h += `<h3>Customer experience</h3><div class="list">${Object.entries(EXP).map(([k, n]) => { const v = s.exp[k]; return `<div class="row" style="font-size:13px"><span style="width:92px;color:var(--muted)">${n}</span><div class="bar"><i class="${v < 0.5 ? 'r' : v < 0.7 ? 'a' : ''}" style="width:${Math.round(v * 100)}%"></i></div><b class="num" style="width:38px;text-align:right">${pct(v)}</b></div>`; }).join('')}</div>
      <p class="note">Reputation ${pct(sim.reputation())}. Built from what customers actually experienced on the property, not from what you built.</p>`;
    h += this.diagnosticHtml();
    h += `<h3>Milestones</h3><div class="list">${Object.entries(MILESTONES).map(([k, n]) => `<div class="item"><div class="grow"><b>${n}</b>${s.milestones[k] != null ? `<small>Day ${dayOf(s.milestones[k])}</small>` : ''}</div><span class="pill ${s.milestones[k] != null ? 'g' : ''}">${s.milestones[k] != null ? 'Done' : '—'}</span></div>`).join('')}</div>`;
    if (s.mode === 'tutorial') {
      const chapters = [...new Set(BEATS.map((b) => b.chapter))];
      h += `<h3>Tutorial</h3><div class="list">${chapters.map((c) => { const idx = BEATS.map((b, i) => b.chapter === c ? i : -1).filter((i) => i >= 0); const done = s.tut.done || idx.every((i) => i < s.tut.beat); const cur = !done && idx.includes(s.tut.beat); return `<div class="item"><div class="grow"><b>${c}</b></div><span class="pill ${done ? 'g' : cur ? 'a' : ''}">${done ? 'Done' : cur ? 'Now' : 'Later'}</span></div>`; }).join('')}</div>`;
    }
    if (!s.scenario && !(s.tut && s.tut.on)) {
      const avail = LESSONS.filter((L) => lessonAllowed(sim, L)); s.lessonsDone = s.lessonsDone || {};
      if (avail.length) h += `<h3>Lessons</h3><div class="list">${avail.map((L) => `<div class="item"><div class="grow"><b>${L.title}</b><small>${L.steps.length} steps${s.lessonsDone[L.id] ? ` · done Day ${s.lessonsDone[L.id]}` : ''}</small></div>${s.lesson && s.lesson.id === L.id ? '<span class="pill b">In progress</span>' : `<button class="btn sm ${s.lessonsDone[L.id] ? '' : 'pri'}" data-a="lessonStart" data-v="${L.id}" ${s.lesson ? 'disabled' : ''}>${s.lessonsDone[L.id] ? 'Replay' : 'Start'}</button>`}</div>`).join('')}</div>`;
    }
    h += this.portfolioHtml();
    return this.sheet('Growth', `Reputation ${pct(sim.reputation())}`, h);
  }

  // ------------------------------------------------------------ FEED / TOASTS / BUBBLES
  toast(text, kind = '') {
    // one message at a time on phones; a repeat of a visible message refreshes it instead of stacking
    const dup = this.toasts.find((t) => t.text === text); if (dup) { dup.t = performance.now(); dup.el.classList.remove('out'); return; }
    const feed = this.$('feed'); const el = document.createElement('div'); el.className = 'toast ' + kind; el.innerHTML = `<span class="dot"></span><span>${esc(text)}</span>`;
    feed.appendChild(el); this.toasts.push({ el, t: performance.now(), text });
    while (this.toasts.length > (this.phone() ? 1 : 3)) { const o = this.toasts.shift(); o.el.remove(); }
  }
  renderFeed(force = false) {
    const s = this.sim.s; const key = s.convos.map((c) => c.id).join(',') + ':' + (s.convos.length ? Math.floor(s.t / 15) : 0) + ':' + !!this.convoAll;
    if (!force && key === this.convoKey) return; this.convoKey = key;
    const feed = this.$('feed');
    for (const el of feed.querySelectorAll('.convo')) el.remove();
    const frag = document.createDocumentFragment();
    // phone declutter: one request at a time, most urgent first (critical, then soonest to expire)
    const urg = (c) => (c.sev === 'critical' ? 0 : 1e6) + (c.ttl ? Math.max(0, c.ttl - (s.t - c.t)) : 5e5);
    const order = s.convos.slice().sort((a, b) => urg(a) - urg(b)); const cap = this.convoAll ? 3 : 1;
    if (order.length) this.pauseForPopup('convo'); else this.resumePopup('convo');
    if (order.length > cap) { const m = document.createElement('button'); m.className = 'convo more'; m.dataset.a = 'convoAll'; m.textContent = this.convoAll ? 'Show fewer' : `+${order.length - cap} more request${order.length - cap > 1 ? 's' : ''} waiting`; frag.appendChild(m); }
    else if (this.convoAll && order.length <= 1) this.convoAll = false;
    for (const c of order.slice(0, cap).reverse()) {
      const el = document.createElement('div'); el.className = 'convo ' + (c.sev || 'attention');
      // no countdowns (concept §9): say calmly what happens if the player leaves it; only collections keep a real-world date
      const defA = c.def != null && c.actions && c.actions[c.def]; const due = c.ttl ? c.t + c.ttl : null;
      const calm = c.key && String(c.key).startsWith('lien') && due ? `Lien decision due Day ${dayOf(due)}. If you leave it: ${defA ? defA.label : 'nothing happens'}.` : defA && c.actions.length > 1 ? `No rush. If you leave it, the game picks: ${defA.label}.` : '';
      el.innerHTML = `<div class="who"><span class="sev">${c.sev === 'critical' ? 'Critical' : 'Attention'}</span>${esc(c.who || 'Tenant')}</div><div class="tx">"${esc(c.text)}"</div><div class="acts">${(c.actions || []).map((a, i) => `<button class="btn sm ${i === 0 ? 'pri' : ''}" data-a="convo" data-id="${c.id}" data-i="${i}">${esc(a.label)}</button>`).join('')}${c.obj && this.sim.s.objects[c.obj] ? `<button class="btn sm" data-a="focus" data-x="${this.sim.s.objects[c.obj].x}" data-y="${this.sim.s.objects[c.obj].y}">View</button>` : ''}${c.overlay ? `<button class="btn sm" data-a="overlay" data-v="${c.overlay}">Show ${c.overlay} map</button>` : ''}</div>${calm ? `<small class="calm">${esc(calm)}</small>` : ''}`;
      frag.appendChild(el);
    }
    feed.prepend(frag);
  }
  addBubble(th) {
    // Merge identical customer thoughts without letting rapid repeats pin a bubble on-screen forever.
    // On phones, routine shopper outcomes get a short real-time cooldown; Business still keeps the full lost-demand totals.
    const now = performance.now();
    const same = this.bubbles.find((b) => b.th.text === th.text);
    if (same) {
      same.n = (same.n || 1) + 1;
      same.el.innerHTML = `<span class="i">${th.kind === 'bad' ? '&#9888;' : th.kind === 'good' ? '&#9786;' : '&#8226;'}</span>${esc(th.text)} <b class="n">×${same.n}</b>`;
      return;
    }
    const routine = th.text === 'Nothing ready to rent today.' || th.text === "I'll keep shopping.";
    this.bubbleSeen ||= new Map();
    const seen = this.bubbleSeen.get(th.text) || 0;
    if (this.phone() && routine && now - seen < 12000) return;
    this.bubbleSeen.set(th.text, now);
    if (this.bubbles.length >= (this.phone() ? 2 : 7)) { const o = this.bubbles.shift(); o.el.remove(); }
    const el = document.createElement('div'); el.className = 'bub ' + th.kind;
    el.innerHTML = `<span class="i">${th.kind === 'bad' ? '&#9888;' : th.kind === 'good' ? '&#9786;' : '&#8226;'}</span>${esc(th.text)}`;
    this.bubRoot.appendChild(el); this.bubbles.push({ el, th, t: now, ag: th.ag });
  }
  updateBubbles() {
    const now = performance.now(), s = this.sim.s; const placed = [];
    for (const b of [...this.bubbles].reverse()) {
      const age = (now - b.t) / 1000;
      if (age > 4.5) { b.el.remove(); this.bubbles = this.bubbles.filter((x) => x !== b); continue; }
      const ag = s.agents.find((a) => a.id === b.ag); const m = ag && this.rend.pool.ppl.get(ag.id);
      const x = m ? m.position.x : b.th.x, z = m ? m.position.z : b.th.y, y = m ? m.position.y : (b.th.f || 0) * 1.9;
      const p = this.rend.project(x, z, y + 1.1);
      const hide = (this.rend.view === 0 && y > 1) || (m && !m.visible && this.rend.view !== 'ext');
      let py = p.y; for (const q of placed) if (Math.abs(q.x - p.x) < 120 && Math.abs(q.y - py) < 26) py = q.y - 28;
      placed.push({ x: p.x, y: py });
      const half=Math.min(b.el.offsetWidth||220,innerWidth-16)/2; const px=Math.max(half+8,Math.min(innerWidth-half-8,p.x));
      b.el.style.left = px + 'px'; b.el.style.top = py + 'px'; b.el.style.opacity = hide || !p.vis || !this.mapPointClear({x:px,y:py}) ? 0 : age > 3.8 ? 0 : 1;
    }
    for (const t of [...this.toasts]) if (now - t.t > 4200) { t.el.classList.add('out'); if (now - t.t > 4600) { t.el.remove(); this.toasts = this.toasts.filter((x) => x !== t); } }
  }
  onEvent(e) {
    const s = this.sim.s;
    switch (e.type) {
      case 'thought': this.addBubble(e); break;
      case 'complete': this.toast(`${e.label} finished${e.units ? ` - ${e.ready}/${e.units} units ready to commission` : ''}`, 'good'); this.sfx('complete'); break;
      case 'commissioned': this.sfx('confirm'); break;
      case 'lease': { const u = s.objects[e.unit]; this.toast(`New lease: ${u ? u.name : 'unit'} at ${money(e.rent)}/mo`, 'good'); this.sfx('lease'); break; }
      case 'moveout': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'A unit'} moved out - needs make-ready`); break; }
      case 'fault': { const o = s.objects[e.obj]; if (!o && s.carts.some((c) => c.id === e.obj)) { this.toast('A cart was damaged - it needs repair'); break; } this.toast(`${o ? this.sim.objName(o) : 'Equipment'} has failed`, 'bad'); this.sfx('fault'); break; }
      case 'repaired': this.sfx('repair'); break;
      case 'rentready': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'Unit'} is rent-ready`, 'good'); this.sfx('complete'); break; }
      case 'rent': if (s.speed <= 2) this.sfx('rent'); break;
      case 'refuse': break;
      case 'gate': this.sfx('gate'); break;
      case 'keypad': this.sfx('keypad'); break;
      case 'rollup': if (this.rend.view !== 'ext' || !(e.f > 0)) this.sfx('rollup'); break;
      case 'cart_take': case 'cart_return': this.sfx('cart'); break;
      case 'elevator': this.sfx('chime'); break;
      case 'work_start': case 'work_tick': this.sfx('work'); break;
      case 'convo': this.sfx('attention'); this.renderFeed(true); break;
      case 'tut_skip': { const t = this.root.querySelector('#pname small'); if (t && this.sim.s.mode === 'tutorial') t.textContent = 'Career'; break; }
      case 'milestone': if (e.k === 'graduated') { const t = this.root.querySelector('#pname small'); if (t) t.textContent = 'Career'; }
        if (MILESTONES[e.k]) { if (!this.g.showcase) this.toast('Milestone: ' + MILESTONES[e.k], 'good'); this.sfx('milestone'); } break;
      case 'hire': this.sfx('confirm'); break;
      case 'weather': if (e.w === 'rain') this.toast('Rain rolling in'); break;
      case 'tier_up': { const T = TIERS[e.tier - 1]; if (T) { this.toast(`Promoted: ${T.name}. Unlocked ${T.perks.join('; ')}`, 'good'); this.sfx('milestone'); } break; }
      case 'lesson_offer': this.sfx('attention'); this.renderTut(true); break;
      case 'lesson_done': this.toast(`Lesson complete: ${e.title}`, 'good'); this.sfx('milestone'); this.renderTut(true); break;
      case 'tut_beat': { const b = curBeat(this.sim); this.tutMin = false; if (b && b.focus) { const f = b.focus(this.sim); if (f && f.view != null && this.rend.view !== f.view) this.setView(f.view); if (f && (f.obj || f.cell)) { const o = f.obj && s.objects[f.obj]; const c = o || f.cell; if (c) this.rend.lookAt(c.x, c.y); } } this.autoPanKey = null; this.renderTut(true); break; }
      case 'tut_done': this.sfx('milestone'); this.renderTut(true); break;
      case 'comp_announce': this.toast(`Competitor: ${e.name} is being built ${e.dist} mi away and opens Day ${e.opens}. See Business → Your market.`, 'bad'); this.sfx('attention'); break;
      case 'comp_open': this.toast(`${e.name} opened, pricing about ${Math.round((1 - e.price) * 100)}% under market`, 'bad'); break;
      case 'review': if (e.stars <= 2 || e.stars === 5) this.toast(`${e.stars}-star review: "${e.text}"`, e.stars <= 2 ? 'bad' : 'good'); break;
      case 'report': this.toast(`Month ${e.month} report card: grade ${e.grade}. Open Business to read it.`, e.grade <= 'B' ? 'good' : 'bad'); this.sfx('milestone'); break;
      case 'lost': break;
      case 'access_lost': this.toast(`${e.n > 1 ? e.n + ' units' : e.name} lost customer access - ${e.why}`, 'bad'); this.sfx('fault'); break;
      case 'cash_warn': this.toast(e.msg, 'bad'); this.sfx('attention'); break;
      case 'power_shed': this.toast(`Power capacity exceeded - ${e.name} shut off`, 'bad'); this.sfx('attention'); break;
      case 'power_restored': break;
      case 'sb_goal': this.sfx('milestone'); this.toast(`Goal met: ${e.label}. Keep playing - the facility is still yours.`, 'good'); break;
      case 'scenario_end': this.sfx(e.won ? 'milestone' : 'attention'); this.toast(e.won ? 'Scenario complete' : 'Scenario failed', e.won ? 'good' : 'bad'); this.renderTut(true); break;
      case 'rent_review': this.sfx('rent'); break;
      case 'manager': if (s.speed <= 2) this.toast(/^(Clerk|Manager) /.test(e.msg) ? e.msg : 'Manager: ' + e.msg); this.renderFeed(true); break;
      case 'pastdue': { const u = s.objects[e.unit]; if (s.speed <= 2) this.toast(`${u ? u.name : 'A unit'} missed its rent payment`); break; }
      case 'overlock': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'A unit'} overlocked for non-payment`, 'bad'); break; }
      case 'lien_notice': { const u = s.objects[e.unit]; this.toast(`Lien notice sent - ${u ? u.name : 'unit'}`); break; }
      case 'auction_scheduled': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'A unit'} goes to auction on Day ${e.day} at 10 AM`, 'bad'); this.sfx('attention'); break; }
      case 'auction_start': this.toast(`Auction day: ${e.units.length} unit${e.units.length > 1 ? 's' : ''} up for bid`, 'good'); this.sfx('attention'); break;
      case 'auction_sold': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'Unit'}: ${e.what || 'contents'} sold for ${money(e.price)}${e.war ? ' after a bidding war' : ''}${e.tier === 'junk' ? ' ($80 haul-away)' : ''}`, e.tier === 'junk' ? '' : 'good'); this.sfx('rent'); break; }
      case 'drama': if (!this.g.showcase) this.toast(e.title + (e.sub ? ' - ' + e.sub : ''), 'bad'); this.sfx('attention'); break;
      case 'auction_end': if (e.mode !== 'auction') this.toast(`${e.n} delinquent unit${e.n > 1 ? 's' : ''} cleared out and donated`); break;
      case 'paid_up': { const u = s.objects[e.unit]; if (s.speed <= 2) this.toast(`${u ? u.name : 'A tenant'} paid ${money(e.amt)} and is current again`, 'good'); break; }
      case 'plan_broken': { const u = s.objects[e.unit]; this.toast(`${u ? u.name : 'A tenant'} missed their payment plan`, 'bad'); break; }
      case 'retained': { const u = s.objects[e.unit]; this.sfx('confirm'); break; }
      case 'loan': this.sfx('confirm'); break;
      case 'loan_paid': this.toast('A loan is paid off', 'good'); this.sfx('milestone'); break;
      case 'convo_expired': this.renderFeed(true); break;
    }
  }

  // ------------------------------------------------------------ TUTORIAL CARD
  tutFocus() { const b = curBeat(this.sim); return b && b.focus ? b.focus(this.sim) : null; }
  renderTut(force = false) {
    const s = this.sim.s, box = this.$('tut');
    if (s.scenario && !this.title) { this.renderScenario(force); return; }
    const b = this.title ? null : curBeat(this.sim);
    if (!b) {
      this.guideStep = null;
      // one card at a time on phones: hold a new lesson offer while banners or notifications are up, but never longer than 12 s
      if (s.lessonOffer !== this.offerSeen) { this.offerSeen = s.lessonOffer; this.offerT = performance.now(); }
      const held = this.phone() && performance.now() - (this.offerT || 0) < 12000 && ((this.g.showcase && this.g.showcase.bannerBusy && this.g.showcase.bannerBusy()) || this.toasts.length > 0);
      const off = !this.title && !held && s.lessonOffer && lessonById(s.lessonOffer);
      if (off) this.pauseForPopup('lessonOffer'); else this.resumePopup('lessonOffer');
      const key = 'offer:' + (off ? off.id : '');
      if (!force && key === this.tutKey) return; this.tutKey = key; this.rend.setFocus(null);
      box.innerHTML = off ? `<div class="tut offer"><div class="ch"><span>Optional lesson</span></div><h4>${off.title}</h4><p class="intro">${off.body}</p><div class="row"><button class="btn pri" data-a="lessonStart" data-v="${off.id}">Start lesson</button><button class="skip" data-a="lessonLater" data-v="${off.id}">Not now</button></div></div>` : '';
      return;
    }
    const isLesson = !!s.lesson;
    const st = stepState(this.sim, this); const cur = st.cur, step = b.steps[cur];
    const showBtn = !!b.button && (!b.buttonWhen || b.buttonWhen(this.sim));
    const bk = isLesson ? 'L' + s.lesson.id : s.tut.beat;
    const key = [bk, this.tutMin, cur, st.done.join(''), showBtn, this.tutWhy].join(':');
    this.guideStep = step; this.guideKey = bk + ':' + cur;
    if (!force && key === this.tutKey) return; this.tutKey = key;
    // map focus follows the current step
    const oid = step && step.obj ? step.obj(this.sim) : null;
    const bp=this.currentBlueprintPlan();
    const cell=bp ? bp.a : step?.cell;
    const f = oid ? { obj: oid } : cell ? { cell, f: bp?.f ?? step.f ?? 0 } : this.tutFocus();
    this.rend.setFocus(f);
    const n = b.steps.length, doneN = st.done.filter((x, i) => x || i < cur).length;
    const li = (x, i, cls) => `<li class="${cls}"><span class="ck">${cls === 'done' ? '&#10003;' : i + 1}</span><span class="tx">${x.t}${cls === 'cur' && x.d ? `<details class="step-help"><summary>Instructions</summary><span class="how">${x.d}</span></details>` : ''}</span></li>`;
    let items = '';
    b.steps.forEach((x, i) => { if (i === cur) items += li(x, i, 'cur');  });
    box.innerHTML = `<div class="tut ${this.tutMin ? 'min' : ''} ${showBtn ? 'has-btn' : ''}"><div class="ch"><span>${isLesson ? 'Lesson' : `${b.chapter} · Part ${s.tut.beat + 1} of ${BEATS.length}`}</span><button class="mini" data-a="tutMin">${this.tutMin ? 'Show' : 'Hide'}</button></div>
      <div class="tut-body"><h4>${b.title}</h4><p class="intro">${b.body}</p>
      <div class="prog"><i style="width:${Math.round(100 * doneN / n)}%"></i><span>Step ${Math.min(cur + 1, n)} of ${n}</span></div>
      <ol class="steps">${items}</ol>
      ${b.why ? `<div class="why ${this.tutWhy ? 'open' : ''}"><button class="mini" data-a="tutWhy">${this.tutWhy ? 'Hide' : 'Why this matters'}</button>${this.tutWhy ? `<p>${b.why}</p>` : ''}</div>` : ''}
      </div><div class="row tut-actions">${(step?.blueprint || step?.placement) ? '<button class="btn sm" data-a="suggestPlacement">Use suggested placement</button><button class="btn sm" data-a="showPlacement">Show me where</button>' + (b.id==='up' ? '<button class="skip" data-a="recheckLayout">Recheck my layout</button>' : '') : ''}${showBtn ? `<button class="btn pri" data-a="tutNext">${b.button}</button>` : (step?.placement||step?.blueprint ? '<span class="mini">Hold at Start, drag to End. Review, then Confirm.</span>' : '<span class="mini">Follow the steps - the ring shows where to tap</span>')}${isLesson ? '<button class="skip" data-a="lessonEnd">End lesson</button>' : '<button class="skip" data-a="tutSkip">Skip tutorial</button>'}</div></div>`;
  }
  currentBlueprintPlan() {
    const step=stepState(this.sim,this).cur, st=curBeat(this.sim)?.steps[step];
    if(this.sim.s.lesson?.id!=='up') return authoredPlacement(this.sim,st);
    const key=st?.blueprint;
    const l=verticalLayout(this.sim); if(!l?.plans) return null;
    return l.plans[key==='lights' ? (this.sim.objs('light').some(o=>(o.f||0)===0&&o.x>=l.sh.x&&o.x<l.sh.x+l.sh.w&&o.y>=l.sh.y&&o.y<l.sh.y+l.sh.h&&this.sim.s.hall[0][this.sim.idx(o.x,o.y)]) ? 'light2' : 'light') : key] || null;
  }
  suggestPlacement() {
    const a=this.currentBlueprintPlan(); if(!a) { this.toast(this.sim.s.lesson?.id==='up' ? verticalCheck(this.sim) : 'The suggested spot is blocked. Choose another valid placement or clear the taught area.'); return; }
    this.setView(a.f); this.pickTool(a.tool); this.flip=!!a.flip; this.climate=!!a.climate;
    this.planArgs={a:{...a.a},b:{...a.b},axis:a.axis,dir:a.dir}; this.replan(); this.showBlueprintTarget();
  }
  showBlueprintTarget() {
    const a=this.currentBlueprintPlan(); if(!a) return;
    this.rend.lookAt((a.a.x+a.b.x)/2,(a.a.y+a.b.y)/2);
    this.autoPanKey=null;
  }
  guideVisible(el) {
    if(!el || el.disabled || (el.closest('details:not([open])') && !el.matches('summary'))) return false; const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2||r.top<0||r.bottom>innerHeight||r.left<0||r.right>innerWidth) return false;
    const body=el.closest('.body, .review-body, .tut-body');
    if(body) {const b=body.getBoundingClientRect(); if(r.top<b.top||r.bottom>b.bottom||r.left<b.left||r.right>b.right)return false;}
    const hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);
    return !!hit && (el===hit||el.contains(hit));
  }
  mapPointClear(p) {
    return !['.tut','.sheet','.actionbar','.hud','.viewctl','.tabs','#feed .convo','.modal','#celebrate.on'].some(sel=>[...this.root.ownerDocument.querySelectorAll(sel)].some(el=>{const r=el.getBoundingClientRect();return r.width>0&&p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom;}));
  }
  updateBlueprint() {
    const box=this.$('blueprint'); if(!box) return;
    if(this.title||this.modalOpen()||!curBeat(this.sim)||this.menuTouch) {box.innerHTML='';return;}
    const l=this.sim.s.lesson?.id==='up'?verticalLayout(this.sim):null,a=this.currentBlueprintPlan(); if(!a&&!l?.plans) {box.innerHTML='';return;}
    const project=(x,y,f=0)=>this.rend.project(x,y,f*FLOOR_H);
    const polygon=(a,b,f,color,label)=>{const x=Math.min(a.x,b.x),y=Math.min(a.y,b.y),w=Math.abs(b.x-a.x)+1,h=Math.abs(b.y-a.y)+1; const pts=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]].map(([x,y])=>project(x,y,f)); if(!pts.every(p=>p.vis))return '';const c=project(x+w/2,y+h/2,f);return `<polygon points="${pts.map(p=>p.x+','+p.y).join(' ')}" fill="${color}" fill-opacity=".12" stroke="${color}" stroke-width="2" stroke-dasharray="6 4"/><text x="${c.x}" y="${c.y}" class="bp-label">${label}</text>`;};
    let html=l?.plans ? polygon(l.plans.shell2.a,l.plans.shell2.b,0,'#7adbe8',`${l.sh.w} × ${l.sh.h} · 2 floors`)+polygon(l.plans.aisle.a,l.plans.aisle.b,0,'#7adbe8','Drive aisle') : '';
    if(a) { const planned=this.sim.plan(a),items=planned.items||[], cells=items.filter(c=>c.x!=null&&c.y!=null); const start=cells.length?{x:Math.min(...cells.map(c=>c.x)),y:Math.min(...cells.map(c=>c.y))}:a.a,end=cells.length?{x:Math.max(...cells.map(c=>c.x)),y:Math.max(...cells.map(c=>c.y))}:a.b; html+=polygon(start,end,a.f,'#ffd23a',TOOLS[a.tool].name); for(const u of planned.units||[]) {html+=polygon({x:u.x,y:u.y},{x:u.x+u.w-1,y:u.y+u.h-1},a.f,'#ffd23a','');const c=project(u.x+u.w/2+u.dir[0]*u.w/2,u.y+u.h/2+u.dir[1]*u.h/2,a.f),d=project(u.x+u.w/2+u.dir[0]*(u.w/2+.6),u.y+u.h/2+u.dir[1]*(u.h/2+.6),a.f);if(c.vis&&d.vis)html+=`<line x1="${c.x}" y1="${c.y}" x2="${d.x}" y2="${d.y}" stroke="#ffd23a" stroke-width="4"/><circle cx="${d.x}" cy="${d.y}" r="3" fill="#ffd23a"/>`; }for(const [c,label] of [[a.a,'Start here'],[a.b,'End here']]){const p=project(c.x+.5,c.y+.5,a.f);if(p.vis)html+=`<circle cx="${p.x}" cy="${p.y}" r="7" fill="#ffd23a"/><text x="${p.x}" y="${p.y+(label==='Start here'?-15:23)}" class="bp-label">${a.a.x===a.b.x&&a.a.y===a.b.y ? (label==='Start here'?'Place here':'') : label}</text>`;}}
    if(l?.plans) for(const [c,label] of [[l.door,'Entrance'],[l.outer,'Loading'],[l.plans.elevator.a,'Elevator']]) {const p=project(c.x+.5,c.y+.5,a?.f||0);if(p.vis)html+=`<text x="${p.x}" y="${p.y-9}" class="bp-label secondary">${label}</text>`;}
    box.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`); if(box.innerHTML!==html)box.innerHTML=html;
  }
  // Coach ring: points at the current step's DOM control, or the control that leads to it, or its map spot.
  guideTarget() {
    const step = this.guideStep; if (!step || this.title || this.modalOpen()) return null;
    const vis = (el) => this.guideVisible(el) ? el : null;
    const q = (sel) => vis(this.root.querySelector(sel));
    let sel = step.sel;
    if (sel) {
      let el = q(sel);
      const tm = /data-a="tool"\]\[data-v="(\w+)"/.exec(sel);
      if (!el && tm) { // walk the menu path: Build tab -> category -> tool
        const T = TOOLS[tm[1]];
        if (this.tool === tm[1]) el = null; else if (this.tab !== 'build') el = q('#tabs [data-v="build"]'); else el = q(`.cats [data-v="${T.cat}"]`);
        if (el) return { el, lbl: this.tab !== 'build' ? 'Open Build' : 'Tap ' + CATEGORIES.find((c) => c.id === T.cat).name };
      }
      if (!el && /^\.cats/.test(sel) && this.tab !== 'build') { el = q('#tabs [data-v="build"]'); if (el) return { el, lbl: 'Open Build' }; }
      if (!el && /data-cmd\*='"role"/.test(sel) && this.tab !== 'operate') { el = q('#tabs [data-v="operate"]'); if (el) return { el, lbl: 'Open Operate' }; }
      if (!el && /overlay/.test(sel) && this.tab !== 'operate') { el = q('#tabs [data-v="operate"]'); if (el) return { el, lbl: 'Open Operate' }; }
      if (el) return { el, lbl: step.lbl || (sel === '#speed [data-v="4"]' ? 'Speed up' : 'Tap here') };
    }
    const oid = step.obj && step.obj(this.sim); const o = oid && this.sim.s.objects[oid];
    const bp=this.currentBlueprintPlan(); const sc=bp?.a||step.cell;
    const c = o ? { x: o.x + (o.w || 1) / 2, y: o.y + (o.h || 1) / 2, f: o.f || 0 } : sc ? { x: sc.x + 0.5, y: sc.y + 0.5, f: bp?.f ?? step.f ?? 0 } : null;
    if (c) {
      let p = this.rend.project(c.x, c.y, c.f * FLOOR_H);
      if (this.autoPanKey !== this.guideKey && !this.pointerBusy) { this.autoPanKey = this.guideKey; if (this.panClear(p, c)) p = this.rend.project(c.x, c.y, c.f * FLOOR_H); }
      if (p.vis && this.mapPointClear(p)) return { x: p.x, y: p.y, lbl: step.lbl || (/drag/i.test(step.t) ? 'Drag here' : 'Tap here'), map: true };
    }
    return null;
  }
  // Once per step: if the map target sits under the tutorial card, a sheet or off-screen, pan it into the clear area.
  panClear(p, c) {
    const W = innerWidth, H = innerHeight;
    const els = [this.root.querySelector('.tut'), this.$('sheet').firstChild, this.$('abar').firstChild].filter(Boolean);
    const rs = els.map((e) => e.getBoundingClientRect()).filter((r) => r.width > 0);
    const hit = rs.some((r) => p.x > r.left - 24 && p.x < r.right + 24 && p.y > r.top - 40 && p.y < r.bottom + 24);
    const off = !p.vis || p.y < 70 || p.y > H - 100 || p.x < 20 || p.x > W - 70;
    if (!hit && !off) return false;
    let top = 64, bot = H - 96, left = 8, right = W - 64;
    for (const r of rs) {
      if (r.width > W * 0.6) { if ((r.top + r.bottom) / 2 > H / 2) bot = Math.min(bot, r.top); else top = Math.max(top, r.bottom); }
      else if (r.left < W / 2 && r.right < W * 0.6) left = Math.max(left, r.right);
      else if (r.bottom > H * 0.45 && r.top > H * 0.3) bot = Math.min(bot, r.top);
    }
    if (bot - top < 80) return false;
    if (!p.vis) { this.rend.lookAt(c.x - 0.5, c.y - 0.5); p = this.rend.project(c.x, c.y, c.f * FLOOR_H); }
    this.rend.pan((left + right) / 2 - p.x, (top + bot) / 2 - p.y);
    return true;
  }
  updateGuide() {
    const g = this.$('guide'); if (!g) return;
    if (this.menuTouch || this.pointerBusy || performance.now() < (this.menuScrollUntil || 0)) { g.hidden = true; return; }
    const s = this.sim.s;
    if (s.tut && s.tut.on && s.tut.beat === 0 && !this.title) { const sig = [this.rend.zoom.toFixed(3), this.rend.rot, this.rend.center.x.toFixed(2), this.rend.center.z.toFixed(2)].join(','); if (this.lookSig == null) this.lookSig = sig; else if (performance.now() - (this.lookT0 || (this.lookT0 = performance.now())) < 2500) this.lookSig = sig; else if (sig !== this.lookSig) this.tutLooked = true; }
    const t = curBeat(this.sim) ? this.guideTarget() : null;
    if (!t) { if (!g.hidden) g.hidden = true; return; }
    let x, y, w, h;
    if (t.el) {
      if (this.guideScrolled !== this.guideKey) {
        this.guideScrolled = this.guideKey;
        const body = t.el.closest('.sheet .body');
        if (body) { const r = t.el.getBoundingClientRect(), br = body.getBoundingClientRect(); if (r.top < br.top || r.bottom > br.bottom) body.scrollTop += r.top - br.top - 8; }
      }
      const body = t.el.closest('.sheet .body');
      if (body) { const r = t.el.getBoundingClientRect(), br = body.getBoundingClientRect(); if (r.top < br.top || r.bottom > br.bottom) { g.hidden = true; return; } }
      const r = t.el.getBoundingClientRect(); x = r.left - 4; y = r.top - 4; w = r.width + 8; h = r.height + 8;
    } else { w = h = 46; x = t.x - 23; y = t.y - 23; }
    g.hidden = false; g.classList.toggle('map', !!t.map);
    g.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`; g.style.width = Math.round(w) + 'px'; g.style.height = Math.round(h) + 'px';
    const lb = g.lastChild; if (lb.textContent !== t.lbl) lb.textContent = t.lbl;
    g.classList.toggle('below', y < 120);
  }

  fmtGoal(g, v) { return g.fmt === 'pct' ? pct(v) : g.fmt === 'money' ? (v === -1 ? 'needs 30 days' : money(Math.round(v))) : g.fmt === 'min' ? (v >= 99 ? 'no elevator' : v.toFixed(1) + ' min') : String(Math.round(v)); }
  renderScenario(force) {
    const sim = this.sim, s = sim.s, sc = s.scenario, box = this.$('tut');
    const prog = scenarioProgress(sim);
    const key = JSON.stringify([sc.status, this.scMin, sim.day, prog.map((g) => [g.met, this.fmtGoal(g, g.cur)]), sc.badDays]);
    if (!force && key === this.scKey) return; this.scKey = key; this.rend.setFocus(null);
    const left = sc.deadline - sim.day + 1;
    const again = this.scShown === sc.id + sc.status; this.scShown = sc.id + sc.status;
    box.innerHTML = `<div class="tut scen ${this.scMin ? 'min' : ''} ${again && box.firstChild ? 'noanim' : ''}"><div class="ch"><span>Scenario · ${esc(sc.name)}</span><button class="mini" data-a="scenMin">${this.scMin ? 'Show' : 'Hide'}</button></div>
      <h4>${sc.status === 'won' ? 'Scenario complete' : sc.status === 'lost' ? 'Scenario failed' : `Day ${sim.day} of ${sc.deadline} · ${left} left`}</h4>
      <ul class="goals">${prog.map((g) => `<li class="${g.met ? 'met' : ''}"><span class="ck">${g.met ? '&#10003;' : ''}</span><span>${esc(g.label)}</span><b>${this.fmtGoal(g, g.cur)}</b></li>`).join('')}</ul>
      <p class="fail ${sc.badDays ? 'on' : ''}">Fail: net liquid position (cash minus committed bills and credit line) below ${money(sc.fail.cashBelow)} for ${sc.fail.cashDays} days${sc.badDays ? ` · ${sc.badDays} so far` : ''}, or the deadline passes. Reserve is advisory.</p>
      ${sc.status !== 'active' ? `<p>${sc.status === 'won' ? `Finished on day ${sc.endDay}. Keep playing this property as a sandbox if you like.` : esc(sc.why || '')}</p><div class="row"><button class="btn pri" data-a="scenarios">Scenarios</button></div>` : ''}</div>`;
  }
  showScenarios() {
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Scenarios</h2><button class="x" data-a="${this.title ? 'showTitleBack' : 'modalClose'}" aria-label="Close">${I.x}</button></div>
      <p class="note">Each scenario starts with its goals and fail condition in view. Goals are checked every morning.</p>
      <div class="menu-list">${Object.entries(SCENARIOS).map(([id, S]) => `<div class="scen-card"><b>${esc(S.name)}</b><p>${esc(S.blurb)}</p><ul>${S.goals.map((g) => `<li>${esc(g.label)}</li>`).join('')}<li>Deadline: day ${S.deadline}</li><li class="f">Fail: cash minus committed bills and credit line below ${money(S.fail.cashBelow)} for ${S.fail.cashDays} days</li></ul><button class="btn pri" data-a="new" data-v="sc:${id}">Start ${esc(S.name)}</button></div>`).join('')}</div></div></div>`;
    const x = this.root.querySelector('[data-a="showTitleBack"]'); if (x) x.onclick = () => this.showTitle();
  }
  showSandbox() {
    this.sb ||= sbDefaults('business');
    const b = this.sb, free = b.kind === 'free';
    const opt = (k, v, label) => `<button class="btn sm ${JSON.stringify(b[k]) === JSON.stringify(v) ? 'pri' : ''}" data-a="sbOpt" data-k="${k}" data-v='${JSON.stringify(v)}'>${label}</button>`;
    const card = (k, v, title, text) => `<button class="sb-card ${JSON.stringify(b[k]) === JSON.stringify(v) ? 'on' : ''}" data-a="sbOpt" data-k="${k}" data-v='${JSON.stringify(v)}'><b>${title}</b><span>${text}</span></button>`;
    const wearTxt = { 0: 'Off: nothing new wears out. Damage that already exists stays until repaired, and repairs still work.', 0.5: 'Gentle: equipment wears at half speed.', 1: 'Normal wear and repair work.', 1.5: 'Harsh: equipment wears 50% faster.' }[b.wear] || '';
    const goals = { occ: 'Lease 90% of rentable units (at least 5 units open).', profit: 'Reach a $3,000 operating result over 30 days. Counts rent and fees minus operating costs, payroll, services and interest. Construction, loans and sandbox funds are excluded.', units: 'Build and open 40 units.', backlog: 'Go 7 days in a row with no repair or cleaning jobs open.' };
    const adv = this.sbAdv ? `<div class="sb-adv">
        ${b.start === 'empty' ? `<h3>Market</h3><div class="row wrap">${opt('market', 'blank', 'Suburban')}${opt('market', 'urban', 'Urban infill')}${opt('market', 'rural', 'Rural highway')}</div>
        <p class="note">${esc(MARKETS[b.market].name)}: ${Object.entries(MARKETS[b.market].rent).map(([k, v]) => `${k} ${money(v)}`).join(' · ')}. Suburban is the best-tested lot.</p>` : ''}
        ${free ? '' : `<h3>Starting cash</h3><div class="row wrap">${opt('cash', 35000, '$35,000')}${opt('cash', 60000, '$60,000')}${opt('cash', 120000, '$120,000')}${opt('cash', 250000, '$250,000')}</div>`}
        <h3>Customer demand</h3><div class="row wrap">${opt('demand', 0.75, 'Low')}${opt('demand', 1, 'Normal')}${opt('demand', 1.3, 'High')}</div>
        <h3>Operating costs</h3><div class="row wrap">${opt('costs', 0.8, 'Low (-20%)')}${opt('costs', 1, 'Normal')}${opt('costs', 1.25, 'High (+25%)')}</div>
        <h3>Maintenance</h3><div class="row wrap">${opt('wear', 0, 'Off')}${opt('wear', 0.5, 'Gentle')}${opt('wear', 1, 'Normal')}${opt('wear', 1.5, 'Harsh')}</div><p class="note">${wearTxt}</p>
        <h3>Starting staff</h3><div class="row wrap">${opt('staff', 'owner', 'Owner only')}${b.start === 'starter' ? opt('staff', 'basic', 'Owner + porter ($55/day)') : ''}</div>${b.start === 'empty' ? '<p class="note">Staff work from an office. On an empty lot, build one and then hire.</p>' : ''}
        <h3>Company perks</h3><div class="row wrap">${opt('tiers', 'earn', 'Earn by growing')}${opt('tiers', 'all', 'All unlocked')}</div><p class="note">Perks: rush construction, priority vendors, better loan rates, a demand bonus. Every building tool is available either way.</p>
        <h3>Instant construction</h3><div class="row wrap">${opt('instant', false, 'Off')}${opt('instant', true, 'On')}</div><p class="note">On: valid builds finish the moment you confirm. Costs are still charged and recorded. Shown on the HUD while on.</p>
      </div>` : '';
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal sb-setup"><div class="row"><h2 style="flex:1">Sandbox</h2><button class="x" data-a="${this.title ? 'showTitleBack' : 'modalClose'}" aria-label="Close">${I.x}</button></div>
      <p class="note">Build and run a facility on your own terms. No campaign steps. The same rules as the main game.</p>
      <div class="sb-cards">${card('kind', 'business', 'Business sandbox', 'Limited cash. Building costs money and takes time. The business has to pay its way.')}${card('kind', 'free', 'Free Build', 'Unlimited funds, optional instant building. Every cost and rent payment is still recorded, so you can see if the design works as a business.')}</div>
      <h3>Property</h3><div class="sb-cards">${card('start', 'empty', 'Empty lot', 'Bare land with a street entrance. Build everything yourself.')}${card('start', 'starter', 'Starter facility', 'The Maple Street layout: 23 units, 22 leased, an office, and some worn equipment.')}</div>
      ${free ? `<h3>Maintenance</h3><div class="row wrap">${opt('wear', 0, 'Off')}${opt('wear', 1, 'Normal')}</div><p class="note">${wearTxt}</p>` : `<h3>Difficulty</h3><div class="row wrap">${Object.entries(SB_PRESETS).map(([k, P]) => opt('preset', k, P.label)).join('')}</div>
      <p class="note">${b.preset === 'custom' ? `Custom: ${money(b.cash)} to start, demand ×${b.demand}, costs ×${b.costs}, wear ×${b.wear}.` : esc(SB_PRESETS[b.preset].blurb)}</p>`}
      <h3>Optional goal</h3><div class="row wrap">${opt('goal', null, 'None')}${opt('goal', 'occ', '90% leased')}${opt('goal', 'profit', '$3k in 30 days')}${opt('goal', 'units', '40 units')}${opt('goal', 'backlog', 'No backlog')}</div>
      <p class="note">${b.goal ? esc(goals[b.goal]) + ' After the goal is met, keep playing.' : 'Play for whatever you want. You can set a goal later in Business.'}</p>
      <button class="btn sm" data-a="sbAdv" style="margin-top:6px">${this.sbAdv ? 'Hide' : 'Show'} advanced settings</button>${adv}
      <div class="row" style="margin-top:14px;align-items:center"><button class="btn pri" data-a="sbStart">Start ${free ? 'Free Build' : 'Business sandbox'}</button><span class="note" style="margin:0 0 0 10px">Starts paused. Press 1x when you are ready.</span></div></div></div>`;
    const x = this.root.querySelector('[data-a="showTitleBack"]'); if (x) x.onclick = () => this.showTitle();
  }

  portfolioHtml() {
    const C = this.g.company; if (!C) return '';
    const cur = C.active; let h = `<h3>Portfolio</h3><div class="list">`;
    C.props.forEach((p, k) => {
      const sm = p.sim, o = sm.occupancy();
      h += `<div class="item"><div class="grow"><b>${esc(p.name)}${k === cur ? ' <span class="pill b">Here</span>' : ''}</b><small>${money(sm.s.cash)} cash · ${o.occ}/${o.n} leased · ${money(sm.rentRoll())}/mo · rep ${pct(sm.reputation())}</small></div>
        ${k !== cur ? `<button class="btn sm pri" data-a="switchProp" data-v="${k}">Go</button>` : ''}
        ${k !== cur && this.sim.s.cash >= 10000 ? `<button class="btn sm" data-a="transfer" data-from="${cur}" data-to="${k}" data-v="10000">Send $10k</button>` : ''}</div>`;
    });
    const total = C.props.reduce((a, p) => a + p.sim.s.cash, 0), roll = C.props.reduce((a, p) => a + p.sim.rentRoll(), 0);
    h += `</div><p class="note">Company: ${C.props.length} propert${C.props.length > 1 ? 'ies' : 'y'} · ${money(total)} total cash · ${money(roll)}/mo rent roll. All properties run on the same clock; each keeps its own books.</p>`;
    if (C.feed.length) h += `<h3>Company attention</h3><div class="list">${C.feed.slice(0, 6).map((e) => `<div class="item"><div class="grow"><b>${esc(e.prop)}</b><small>Day ${dayOf(e.t)} · ${esc(e.msg)}</small></div>${C.props[e.k] && e.k !== cur ? `<button class="btn sm" data-a="switchProp" data-v="${e.k}">Go</button>` : ''}</div>`).join('')}</div>`;
    if (!this.sim.s.creative && (this.sim.s.mode !== 'tutorial' || this.sim.s.tut.done)) {
      const offers = this.g.offers();
      h += `<h3>Acquisitions</h3><div class="list">${offers.map((of) => `<div class="item"><div class="grow"><b>${esc(of.name)}</b><small>${esc(of.desc)}</small></div><button class="btn sm ${this.sim.s.cash >= of.price ? 'pri' : ''}" data-a="acquire" data-v="${of.kind}" data-m="${of.market}" ${this.sim.s.cash >= of.price ? '' : 'disabled'}>Buy ${money(of.price)}</button></div>`).join('')}</div>
        <p class="note">Paid from this property's cash. Prices include $5,000 of opening working cash for the new property; send more from here to fund construction.</p>`;
    } else if (this.sim.s.mode === 'tutorial' && !this.sim.s.tut.done) h += `<p class="note">Finish the tutorial to unlock acquisitions and a multi-property company.</p>`;
    return h;
  }

  // ------------------------------------------------------------ HUD (per frame, cheap)
  update(dt) {
    const s = this.sim.s; const now = performance.now();
    if (!this.title && this.modalOpen()) this.pauseForPopup('modal');
    const cash = Math.round(s.cash);
    const sub = this.cashSub; if (cash !== this.hCash || sub !== this.hSub) { this.hCash = cash; this.hSub = sub; const el = this.$('cash'); el.innerHTML = `${money(cash)}<small>${sub || (s.creative ? 'Creative' : 'Cash')}</small>`; el.classList.toggle('neg', cash < 0); }
    if (now - (this.goalT || 0) > 1000) { // next career goal, always visible as a thin bar under the cash
      this.goalT = now; const gb = this.$('goalbar'); const on = this.g.tierInfo && !this.title && !s.creative && !s.scenario && !(s.mode === 'tutorial' && !s.tut.done);
      const ti = on && this.g.tierInfo(), nx = ti && ti.next; gb.hidden = !nx;
      if (nx) { const pr = Math.min(1, Math.min(ti.roll / nx.roll, ti.n / nx.props)); gb.firstChild.style.width = Math.round(pr * 100) + '%'; gb.title = `Next: ${nx.name} - rent roll ${money(ti.roll)} of ${money(nx.roll)}/mo${nx.props > 1 ? `, ${ti.n} of ${nx.props} properties` : ''}`; }
    }
    const tm = fmtTime(s.t); if (tm !== this.hTime) { this.hTime = tm; this.$('clock').textContent = tm; const d = dayOf(s.t); this.$('date').textContent = `Day ${d} · ${DOW[(d - 1) % 7]}${s.weather === 'rain' ? ' · Rain' : ''}`; }
    if (s.speed !== this.hSpeed) { this.hSpeed = s.speed; for (const b of this.root.querySelectorAll('#speed button')) b.classList.toggle('on', +b.dataset.v === s.speed); }
    const hasF2 = this.sim.objs('shell').some((x) => x.floors > 1);
    if (hasF2 !== this.hF2) { this.hF2 = hasF2; this.root.querySelector('#floors [data-v="1"]').disabled = !hasF2; if (!hasF2 && this.rend.view === 1) this.setView(0); }
    const open = s.tasks.filter((t) => !t.assigned).length; if (open !== this.hTasks) { this.hTasks = open; const b = this.$('taskBadge'); b.hidden = !open; b.textContent = open; }
    this.root.classList.toggle('has-sheet', !!(this.$('sheet').firstChild || this.$('abar').firstChild));
    document.body.classList.toggle('sheet-open', this.root.classList.contains('has-sheet')); // lets the milestone banner move clear of the sheet
    if (now - this.lastSheet > 400) { this.lastSheet = now; if (!this.pointerBusy && !this.menuTouch && now >= (this.menuScrollUntil || 0)) this.renderSheet(); this.renderFeed(); this.renderTut(); if (this.tool && this.plan && s.structV !== this.planV) { this.planV = s.structV; this.replan(); } }
    if (now - (this.lastTutR || 0) > 150) { this.lastTutR = now; this.renderTut(); }
    if (now - (this.lastCoach || 0) > 450) { this.lastCoach = now; this.slowHud(); this.renderCoach(); this.computePins(); }
    this.updateBubbles(); this.updatePins(); this.updateGuide(); this.updateBlueprint();
  }
  setMeta(name, mode) {
    this.$('pname').innerHTML = `${esc(name)}<small>${esc(mode)}</small>`;
    // overrides stay visible on phones too, where the name chip is hidden
    const B = this.sim && this.sim.s.sb, f = this.$('sbflag'); if (!f) return;
    const t = !B ? '' : [B.unlimited ? 'Free Build' : '', B.instant ? 'Instant' : '', !B.unlimited && B.injected ? 'Funds added' : ''].filter(Boolean).join(' · ');
    const sh = !B ? '' : [B.unlimited ? 'Free' : '', B.instant ? 'Inst' : '', !B.unlimited && B.injected ? '+Funds' : ''].filter(Boolean).join('·');
    f.innerHTML = `<span class="l">${esc(t)}</span><span class="s">${esc(sh)}</span>`; f.hidden = !t; f.title = t ? 'Sandbox overrides in effect: ' + mode : ''; f.setAttribute('aria-label', t);
  }

  // ------------------------------------------------------------ PHONE-FIRST HUD: coach line, pins, labels, fit
  phone() { return innerWidth <= 700 || innerHeight <= 520; }
  safeRect() { // screen area not covered by HUD, tabs, open sheet
    const W = innerWidth, H = innerHeight, land = innerHeight <= 520 && innerWidth > innerHeight;
    const hud = this.root.querySelector('.hud').getBoundingClientRect().bottom + 8;
    const tabs = this.$('tabs').getBoundingClientRect();
    const sh = this.$('sheet').firstElementChild || this.$('abar').firstElementChild; const sr = sh && sh.getBoundingClientRect();
    let top = hud + (this.$('coach').hidden ? 0 : 40), bottom = land ? H - 8 : tabs.top - 8, left = land ? tabs.right + 8 : 8, right = W - 64;
    if (sr) { if (land) right = Math.min(right, sr.left - 8); else bottom = Math.min(bottom, sr.top - 8); }
    return { top, bottom, left, right };
  }
  keepSelVisible() {
    const sl = this.sel; const o = typeof sl === 'number' ? this.sim.s.objects[sl] : sl && sl.kind === 'cart' ? this.sim.s.carts.find((c) => c.id === sl.id) : sl; if (!o || o.x == null) return;
    const r = this.safeRect(), p = this.rend.project(o.x + (o.w || 1) / 2, o.y + (o.h || 1) / 2, (o.f || 0) * 1.9 + 1);
    let dx = 0, dy = 0; const mx = (r.left + r.right) / 2, my = (r.top + r.bottom) / 2;
    if (p.y > r.bottom - 20 || p.y < r.top + 20) dy = my - p.y; if (p.x > r.right - 20 || p.x < r.left + 20) dx = mx - p.x;
    if (dx || dy) this.rend.pan(dx, dy);
  }
  applySheetSize() { const el = this.$('sheet').firstElementChild; if (el) el.classList.toggle('tall', !!this.sheetTall); }
  slowHud() {
    const sim = this.sim, s = sim.s; const oc = sim.occupancy();
    if (!oc.n || s.creative) { this.cashSub = null; return; }
    const actual = sim.cashWindow(1), n = Math.round(actual.net);
    this.cashSub = `${oc.occ}/${oc.n} · today${actual.complete ? '' : ' (partial)'} ${n >= 0 ? '+' : '-'}${Math.abs(n).toLocaleString()}`;
  }
  ownerStatus() {
    const s = this.sim.s, owner = s.staff.find((x) => x.role === 'owner'); if (!owner) return '';
    const ag = s.agents.find((g) => g.sid === owner.id), left = this.sim.workRemaining(owner);
    const busy = ag && (ag.task || (ag.queue && ag.queue.length));
    return `Owner: ${busy ? 'working' : 'free'} · ${left}h available`;
  }
  coachHint() {
    const sim = this.sim, s = sim.s, D = sim.D; const objs = Object.values(s.objects);
    const T = (text, act, kind = 'warn') => ({ text, act, kind });
    if (!D) return null;
    if (D.power && D.power.shed && D.power.shed.length) return T(`Power overloaded: ${D.power.shed.length} ${D.power.shed.length === 1 ? 'thing is' : 'things are'} shut off. Add an Electrical Service.`, { tab: 'build', cat: 'utilities' }, 'bad');
    const blocked = objs.filter((o) => o.type === 'unit' && o.blocked);
    if (blocked.length) return T(`${blocked.length > 1 ? blocked.length + ' units' : sim.objName(blocked[0])} can't be reached by customers. Tap to see why.`, { sel: blocked[0].id }, 'bad');
    const el = objs.find((o) => o.type === 'elevator' && o.cstate === 'operating' && o.cond < 0.2);
    if (el) return T('The freight elevator is out of service. Upper units cannot rent.', { sel: el.id }, 'bad');
    const open = s.tasks.filter((t) => !t.assigned);
    const rep = open.filter((t) => (t.type === 'repair') && s.objects[t.obj]).sort((a, b) => b.pri - a.pri)[0];
    if (rep) { const d = sim.taskDelegation(rep); return T(`${sim.objName(s.objects[rep.obj])} needs repair. ${d && d.status === 'missing' ? 'A Tech can handle repairs for you.' : d ? d.message : 'Review repair options.'}`, { sel: rep.obj }); }
    const mr = open.find((t) => t.type === 'makeready' && s.objects[t.obj]);
    if (mr) return T(`${sim.objName(s.objects[mr.obj])} needs a make-ready before it can rent again.`, { sel: mr.obj });
    const ready = objs.filter((o) => o.type === 'unit' && o.cstate === 'ready');
    if (ready.length) return T(`${ready.length} new ${ready.length === 1 ? 'unit is' : 'units are'} ready to commission.`, { sel: ready[0].id }, 'good');
    if (!s.open && s.mode !== 'tutorial') { const iss = sim.openingIssues(); return T(iss.length ? `Not open yet: ${iss[0].charAt(0).toLowerCase() + iss[0].slice(1)}${iss.length > 1 ? ` (+${iss.length - 1} more)` : ''}. Tap for the checklist.` : 'Ready to open. Tap to open for business.', { tab: 'growth' }); }
    const late = Object.values(s.leases).filter((L) => L.status !== 'current');
    if (late.length) { const u = objs.find((o) => o.lease === late[0].id); return T(`${late.length} ${late.length === 1 ? 'tenant is' : 'tenants are'} past due on rent.`, u ? { sel: u.id } : { tab: 'business' }); }
    const room = open.find((t) => t.type === 'cleanroom' && s.objects[t.obj]); if (room) return T('A restroom needs cleaning.', { sel: room.obj });
    const cl = open.find((t) => t.type === 'clean'); if (cl) return T(`The ${cl.label.replace(/^Clean /, '').toLowerCase()} needs cleaning.`, { dirt: { kind: 'dirt', f: cl.f || 0, x: cl.x, y: cl.y } });
    const cart = open.find((t) => t.type === 'carts'); if (cart) return T('A cart was left away from its corral.', { sel: { kind: 'cart', id: cart.cart } });
    if (s.cash < 0 && !s.creative) return T('Cash is negative. Check Business for the credit line and costs.', { tab: 'business' }, 'bad');
    const oc = sim.occupancy();
    const vacancies = sim.operations().ready.length;
    if (oc.n >= 4 && oc.pct >= 0.95) {
      if (oc.occ === oc.n) return T(`All ${oc.n} operating units are leased. Check demand and Growth Readiness before adding units.`, { tab: 'growth', section: 'Growth Readiness' }, 'good');
      if (vacancies) return T(`Nearly full: ${oc.occ}/${oc.n} leased · ${vacancies} rent-ready ${vacancies === 1 ? 'vacancy' : 'vacancies'}. Check asking rents before expanding.`, { tab: 'business', section: 'Asking rents' }, 'ok');
      return T(`Nearly full: ${oc.occ}/${oc.n} leased. Remaining units need turnover, commissioning or access before renting.`, { tab: 'operate', section: 'Jobs' }, 'warn');
    }
    if (vacancies && s.open) return T(`${vacancies} rent-ready units vacant. Check demand and asking rents before expanding.`, { tab: 'business', section: 'Asking rents' }, 'ok');
    return T('All caught up.', null, 'ok');
  }
  renderCoach() {
    const s = this.sim.s, el = this.$('coach');
    const hide = this.title || this.modalOpen() || (s.tut && s.tut.on && !s.tut.done) || !!s.lesson || !!s.lessonOffer || this.root.classList.contains('has-sheet');
    const h = hide ? null : this.coachHint(); this.coachAct = h && h.act;
    if (!h) { if (!el.hidden) { el.hidden = true; this.root.classList.remove('has-coach'); } return; }
    const key = h.text + '|' + h.kind + '|' + this.ownerStatus();
    if (key !== this.coachKey || el.hidden) { this.coachKey = key; el.className = 'coach ' + h.kind + (h.act ? ' act' : ''); this.$('coachT').textContent = h.text; this.$('coachO').textContent = this.ownerStatus(); }
    if (el.hidden) { el.hidden = false; this.root.classList.add('has-coach'); }
  }
  issueBtn(label, tool) { return `<button class="btn sm" data-a="goTool" data-v="${tool}">${label}</button>`; }
  runCoach() {
    const a = this.coachAct; if (!a) return; this.sfx('click');
    if (a.tab) { if (a.cat) this.cat = a.cat; this.select(null); this.setTab(a.tab); if (a.section) this.jumpSection(a.section); return; }
    const sel = a.sel ?? a.dirt; this.select(sel);
    const o = typeof sel === 'number' ? this.sim.s.objects[sel] : sel.kind === 'cart' ? this.sim.s.carts.find((c) => c.id === sel.id) : sel;
    if (o && (o.f || 0) === 1 && this.rend.view !== 1 && this.sim.objs('shell').some((x) => x.floors > 1)) this.setView(1);
  }
  computePins() {
    const sim = this.sim, s = sim.s, pins = [], seen = new Set();
    const add = (k, o, extra = {}) => { const key = k + ':' + (extra.key || o.id); if (seen.has(key)) return; seen.add(key); pins.push({ k, key, x: o.x + (o.w || 1) / 2, y: o.y + (o.h || 1) / 2, f: o.f || 0, id: o.id, ...extra }); };
    for (const t of s.tasks) {
      const o = t.obj != null && s.objects[t.obj];
      const who = t.assigned ? 1 : 0;
      if (t.type === 'repair' || t.type === 'pm') { if (o) add('repair', o, { who }); }
      else if (t.type === 'makeready') { if (o) add('makeready', o, { who }); }
      else if (t.type === 'cleanroom') { if (o) add('clean', o, { who }); }
      else if (t.type === 'clean') add('clean', { x: t.x, y: t.y, f: t.f || 0, id: 'd' + t.id }, { who, dirt: 1, key: 'c' + t.id });
      else if (t.type === 'carts') { const c = s.carts.find((q) => q.id === t.cart); if (c) add('cart', { x: Math.floor(c.x), y: Math.floor(c.y), f: c.f || 0, id: c.id }, { who, cart: 1 }); }
    }
    for (const o of Object.values(s.objects)) {
      if (o.type === 'unit') {
        if (o.blocked) add('blocked', o);
        else if (o.cstate === 'ready') add('ready', o);
        else if (o.lease && s.leases[o.lease] && s.leases[o.lease].status === 'auction') add('auction', o);
        else if (o.overlock) add('lock', o);
        else if (o.lease && s.leases[o.lease] && s.leases[o.lease].status !== 'current') add('late', o);
      }
      if (o.unpowered) add('power', o);
    }
    this.pinList = pins.slice(0, 40);
  }
  updatePins() {
    const root = this.$('pins'); if (!root) return;
    const R = this.rend, list = this.title ? [] : (this.pinList || []); const pool = (this.pinPool ||= new Map()); const live = new Set();
    const placed = [];
    const viewOk = (f) => R.view === 'ext' || R.view === 1 || f === 0;
    for (const p of list) {
      if (!viewOk(p.f)) continue;
      const pr = R.project(p.x, p.y, p.f * 1.9 + 2.3); if (!pr.vis || pr.x < -20 || pr.y < -20 || pr.x > innerWidth + 20 || pr.y > innerHeight + 20) continue;
      // cluster: pins whose screen positions overlap fold into the first one as a count badge
      const cl = placed.find((q) => q.pin && Math.abs(q.x + 17 - pr.x) < 28 && Math.abs(q.y + 40 - pr.y) < 30);
      if (cl) { cl.n++; continue; }
      let el = pool.get(p.key);
      if (!el) { el = document.createElement('button'); el.className = 'pin'; el.dataset.a = 'pin'; pool.set(p.key, el); root.appendChild(el); }
      const sig = p.k + p.who; if (el.dataset.sig !== sig) { el.dataset.sig = sig; el.className = 'pin ' + p.k; el.innerHTML = PIN[p.k] + (p.who ? `<span class="who">${PIN.person}</span>` : ''); el.setAttribute('aria-label', { repair: 'Needs repair', makeready: 'Needs make-ready', clean: 'Needs cleaning', late: 'Rent past due', lock: 'Overlocked for non-payment', auction: 'Scheduled for auction', blocked: 'No customer access', power: 'No power', cart: 'Stranded cart', ready: 'Ready to commission' }[p.k]); }
      el.dataset.k = p.cart ? 'cart' : p.dirt ? 'dirt' : 'obj'; el.dataset.id = p.cart ? p.id : p.id; if (p.dirt) { el.dataset.f = p.f; el.dataset.x = p.x - 0.5; el.dataset.y = p.y - 0.5; }
      el.style.transform = `translate(${Math.round(pr.x - 17)}px, ${Math.round(pr.y - 40)}px)`; live.add(p.key); placed.push({ x: pr.x - 17, y: pr.y - 40, w: 34, h: 40, pin: true, n: 1, el });
    }
    for (const q of placed) { let c = q.el.querySelector('.cnt'); if (q.n > 1) { if (!c) { c = document.createElement('span'); c.className = 'cnt'; q.el.appendChild(c); } c.textContent = q.n; q.el.dataset.n = q.n; } else if (c) { c.remove(); delete q.el.dataset.n; } }
    for (const [k, el] of pool) if (!live.has(k)) { el.remove(); pool.delete(k); }
    this.updateLabels(placed);
  }
  updateLabels(placed) {
    const root = this.$('pins'), R = this.rend, s = this.sim.s;
    const pool = (this.lblPool ||= []); let n = 0;
    const px = (R.canvas.clientHeight || 800) / (R.frustum / R.zoom); // screen px per world unit
    const show = !this.title && px >= 24 && !this.tool;
    if (show) {
      for (const o of Object.values(s.objects)) {
        if (o.type !== 'unit' || o.cstate === 'construction' || n >= 90) continue;
        const f = o.f || 0; if (!(R.view === 'ext' ? (o.access === 'drive' && f === 0) : R.view === f)) continue;
        const w0 = o.w || 1, h0 = o.h || 1, dr = o.dir || [0, 0]; const cx = o.x + w0 / 2 + dr[0] * (w0 / 2 + 0.15), cy = o.y + h0 / 2 + dr[1] * (h0 / 2 + 0.15);
        const pr = R.project(cx, cy, f * 1.9 + 0.95); if (!pr.vis || pr.x < 0 || pr.y < 0 || pr.x > innerWidth || pr.y > innerHeight) continue;
        const txt = String(o.num ?? String(o.name || '').replace(/^Unit\s*/, '')); const w = 8 + txt.length * 7.5, r = { x: pr.x - w / 2, y: pr.y - 9, w, h: 18 };
        if (placed.some((q) => r.x < q.x + q.w + 2 && r.x + r.w + 2 > q.x && r.y < q.y + q.h + 1 && r.y + r.h + 1 > q.y)) continue;
        placed.push(r);
        let el = pool[n]; if (!el) { el = document.createElement('span'); el.className = 'ulbl'; pool.push(el); root.appendChild(el); }
        if (el.textContent !== txt) el.textContent = txt;
        const st = o.commercial === 'occupied' ? 'occ' : o.commercial === 'ready' ? 'vac' : 'wip'; if (el.dataset.st !== st) { el.dataset.st = st; el.className = 'ulbl ' + st; }
        el.style.transform = `translate(${Math.round(r.x)}px, ${Math.round(r.y)}px)`; el.hidden = false; n++;
      }
    }
    for (let k = n; k < pool.length; k++) if (!pool[k].hidden) pool[k].hidden = true;
  }

  // ------------------------------------------------------------ TITLE / MENU / SAVE
  guardNew(run) { // New game never silently replaces a game the player has (pre-merge fix 1)
    const g = this.g, meta = g.playing() ? g.saveMeta() : this.contSave && this.contSave.meta;
    if (!meta) return run();
    this.pendingNew = run; const keep = g.localsave.ok;
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal confirm-new"><h2>Start a new game?</h2>
      <p>Your current game: <b>${esc(meta.name || 'Saved game')}</b> · Day ${+meta.day || 1} · ${money(+meta.cash || 0)}.</p>
      <p class="note">${keep ? 'It will be kept as your <b>previous game</b>. You can restore it from the title screen or the menu.' : 'This browser cannot store a second game, so the new game will replace it. Make a save code first if you want to keep it.'}</p>
      <div class="row wrap" style="margin-top:10px"><button class="btn pri" data-a="replaceYes">Start new game</button>${keep ? '' : '<button class="btn" data-a="saveCode">Make a save code</button>'}<button class="btn" data-a="replaceNo">Cancel</button></div></div></div>`;
  }
  keptLabel() { const k = this.g.localsave && this.g.localsave.getKept(); if (!k) return ''; const m = k.meta || {}; return `${esc(m.name || 'Saved game')} · Day ${+m.day || 1} · ${money(+m.cash || 0)}`; }
  showTitle() {
    this.title = true;
    this.$('modal').innerHTML = `<div class="title">${I.logo.replace('<svg', '<svg class="logo"')}<h1>Self Storage Tycoon</h1><p>Build, operate and grow a self-storage property. Every unit, cart, door and customer is simulated.</p>
      <div class="choices">${this.contSave ? `<button class="btn go" data-a="continue">Continue <small>${esc(this.contSave.meta.name || 'Saved game')}${this.contSave.meta.mode ? ' · ' + esc(this.contSave.meta.mode) : ''} · Day ${+this.contSave.meta.day || 1} · ${money(+this.contSave.meta.cash || 0)} · ${this.ago(this.contSave.at * 1000)}</small></button>` : ''}${this.keptLabel() ? `<button class="btn" data-a="restoreKept">Restore previous game <small>${this.keptLabel()}</small></button>` : ''}<button class="btn ${this.contSave ? '' : 'pri'}" data-a="new" data-v="maple">Maple Street <small>Tutorial · take over a small facility</small></button>
      <button class="btn" data-a="scenarios">Scenarios <small>Turnaround, Go Vertical, Climate Boom</small></button>
      <button class="btn" data-a="sandboxSetup">Sandbox <small>Business or Free Build, on your terms</small></button>
      <button class="btn" data-a="loadOpen">Load a save <small>Paste code or open file</small></button></div>
      <div class="title-live"><i></i>Live · Maple Street Storage, operating in real time</div><div class="title-build">Build ${esc(this.g.BUILD ? this.g.BUILD.name : 'dev')}</div></div>`;
  }
  ago(ms) { const d = Math.max(0, (Date.now() - ms) / 1000); return d < 60 ? 'saved just now' : d < 3600 ? `saved ${Math.round(d / 60)} min ago` : d < 86400 ? `saved ${Math.round(d / 3600)} h ago` : `saved ${Math.round(d / 86400)} d ago`; }
  autosaveNote() {
    const L = this.g.localsave;
    if (L?.lastErr === 'storage full') return 'Latest autosave failed: browser storage is full. Export a save code or file now to keep your progress.';
    if (L && L.ok) return L.lastAt ? `Autosave is on in this browser (${this.ago(L.lastAt).replace('saved ', 'last saved ')}). It saves each in-game day and when you leave, and keeps the previous save as a backup.${L.lastErr ? ' Note: ' + L.lastErr + '.' : ''} Codes and files move a game between devices.` : 'Autosave is on in this browser. It saves each in-game day and when you leave, and keeps the previous save as a backup. Codes and files move a game between devices.';
    const c = this.g.cloud;
    if (c.ok === false) return 'Autosave is offline right now. Save with a code or a file to keep your progress.';
    if (c.lastAt) return `Autosave is on (${this.ago(c.lastAt).replace('saved ', 'last saved ')}). It saves each in-game day and when you leave. Codes and files are backups you can move between devices.`;
    return 'Autosave is on. It saves each in-game day and when you leave. Codes and files are backups you can move between devices.';
  }
  spendingHtml(spend, extraDaily = 0, label = 'after action') {
    const P = this.sim.financialPosition({ spend, extraDaily });
    return `<p class="note spending">Cash ${label}: <b>${money(P.cash)}</b> · committed bills ${money(P.committed)} · reserve ${money(P.reserve)} · <b class="${P.available < 0 ? 'neg' : ''}">Available after bills &amp; reserve: ${money(P.available)}</b>${extraDaily ? ' (includes added daily obligations once operating/employed)' : ''}.</p>`;
  }
  diagnosticHtml(obj = null) {
    const rows = this.sim.diagnostics().filter((d) => obj == null || d.obj === obj).slice(0, obj == null ? 4 : 2);
    if (!rows.length) return '';
    return `<h3>What needs attention</h3><div class="list">${rows.map((d) => `<div class="item"><div class="grow"><b>${esc(d.cause)}</b><small>${esc(d.effect)} → ${esc(d.consequence)}</small><small><b>Action:</b> ${esc(d.action)}</small></div></div>`).join('')}</div>`;
  }
  financialHtml() {
    const sim = this.sim, P = sim.financialPosition(), F = sim.scheduledOutlook();
    return `<h3>Bills &amp; reserve</h3><div class="kv"><span>Unpaid committed bills</span><span>${money(P.committed)}</span><span>Next weekly settlement</span><span>Day ${sim.nextSettlementDay()} · 7:00 AM</span><span>Recommended reserve</span><span>${money(P.reserve)}</span><span>Available after bills &amp; reserve</span><span class="${P.available < 0 ? 'neg' : ''}">${money(P.available)}</span><span>Net liquid position</span><span>${money(P.netLiquid)}</span></div>
      <p class="note">Reserve: $500 + 14 future financial days of predictable costs and scheduled loan payments. Accrued bills are separate. Net liquid position subtracts bills and credit-line debt, without subtracting reserve.</p>
      <h3>Scheduled next 30 days</h3><div class="kv"><span>Current-tenant bills</span><span>${money(F.inflow)}</span><span>Weekly bills &amp; loan payments</span><span>${money(-F.outflow)}</span><span>Scheduled net cash movement</span><span class="${F.net < 0 ? 'neg' : ''}">${money(F.net)}</span><span>Cash at end</span><span>${money(F.cashAfter)}</span><span>Bills still owed at end</span><span>${money(F.committedAfter)}</span><span>At-risk receivables</span><span>${money(F.atRisk)}</span></div>
      <p class="note">${F.averageBill ? `If one average tenant misses a scheduled payment: ${money(F.downside)} net cash movement, ${money(F.averageBill)} less cushion.` : 'No current-tenant bills scheduled; there is no payment cushion to model.'} Current leases only. New rentals, overdue collections and optional future spending excluded; existing staffing/assets held constant. Scheduled payments are not guaranteed collections.</p>`;
  }
  cashWindow(days) { return this.sim.cashWindow(days); }
  showFinances() {
    const sim = this.sim, s = sim.s, rcv = sim.receivables();
    const W = [1, 7, 30].map((d) => [d, this.cashWindow(d)]);
    const cats = { rent: 'Rent collected', anc: 'Late fees & auctions', opex: 'Operating costs', payroll: 'Payroll', service: 'Vendors / service', marketing: 'Advertising', capex: 'Construction / capital', debt: 'Loan principal', interest: 'Interest', loan: 'Loan proceeds', inject: 'Added funds', subsidy: 'Sandbox funds', other: 'Other', settle_opex: 'Weekly operating bills', settle_payroll: 'Weekly payroll', settle_interest: 'Weekly credit interest' };
    const w30 = W[2][1], grouped = w30.categories;
    const groupHtml = Object.entries(grouped).sort((a,b) => Math.abs(b[1]) - Math.abs(a[1])).map(([k,v]) => '<span>' + esc(cats[k] || k) + '</span><span class="' + (v < 0 ? 'neg' : '') + '">' + (v >= 0 ? '+' : '') + money(v) + '</span>').join('');
    const recent = s.ledger.slice(-16).reverse().map((x) => '<div class="item"><div class="grow"><b>' + esc(x.note || cats[x.cat] || 'Cash movement') + '</b><small>Day ' + dayOf(x.t) + ' · ' + fmtTime(x.t) + ' · ' + esc(cats[x.cat] || x.cat || 'Other') + '</small></div><b class="' + (x.amt < 0 ? 'neg' : '') + '">' + (x.amt >= 0 ? '+' : '') + money(x.amt) + '</b></div>').join('');
    this.$('modal').innerHTML = '<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Finances</h2><button class="x" data-a="modalClose" aria-label="Close">' + I.x + '</button></div>' +
      '<div class="stats"><div class="stat"><small>Cash now</small><b>' + money(s.cash) + '</b><div class="n">What is actually in the account.</div></div><div class="stat"><small>Owed to you</small><b>' + money(rcv.amt) + '</b><div class="n">' + rcv.n + ' account' + (rcv.n === 1 ? '' : 's') + ' behind; not cash until collected.</div></div></div>' + this.financialHtml() +
      '<h3>Actual cash movement</h3><div class="kv">' + W.map(([d,w]) => '<span>' + d + ' calendar day' + (d === 1 ? '' : 's') + (w.complete ? '' : ' (partial history)') + '</span><span class="' + (w.net < 0 ? 'neg' : '') + '">' + (w.net >= 0 ? '+' : '') + money(w.net) + ' · in ' + money(w.incoming) + ' / out ' + money(w.outgoing) + '</span>').join('') + '</div>' +
      '<p class="note">Rent arrives monthly. Routine expenses accrue at 7:00 AM and settle weekly. Construction, vendors and advertising spend cash immediately.</p>' +
      '<h3>Where 30 calendar days of cash went</h3><div class="kv">' + (groupHtml || '<span>No transactions yet</span><span></span>') + '</div>' +
      '<details class="finance-details"><summary>Recent transactions</summary><div class="list">' + (recent || '<p class="note">No cash movement recorded yet.</p>') + '</div></details>' +
      '<div class="row" style="margin-top:10px"><button class="btn" data-a="tabFromModal" data-v="business">Open full Business statement</button></div></div></div>';
  }
  calendarEvents() {
    const s = this.sim.s, now = s.t, day = dayOf(now), E = [];
    const add = (t, label, detail, kind='') => { if (Number.isFinite(t) && t >= now - 1) E.push({ t, label, detail, kind }); };
    if (s.scenario && s.scenario.status === 'active') add((s.scenario.deadline - 1) * 1440 + 7 * 60, 'Final scenario goal checkpoint', s.scenario.name || 'Scenario');
    const bills = new Map();
    for (const L of Object.values(s.leases)) {
      if (L.nextBill >= day && L.status === 'current') { const x = bills.get(L.nextBill) || { n:0, amt:0 }; x.n++; x.amt += L.rent; bills.set(L.nextBill, x); }
      if (L.planDue) add((L.planDue - 1) * 1440 + 7 * 60, 'Payment plan due', (s.objects[L.unit] || {}).name || 'Tenant account');
      if (L.noticeUntil) add((L.noticeUntil - 1) * 1440 + 7 * 60, 'Lien notice period ends', (s.objects[L.unit] || {}).name || 'Tenant account');
      if (L.auctionDay) add((L.auctionDay - 1) * 1440 + 10 * 60, 'Lien auction', (s.objects[L.unit] || {}).name || 'Scheduled unit', 'important');
    }
    for (const [d,x] of bills) add((d - 1) * 1440 + 7 * 60, 'Tenant billing day', x.n + ' tenant' + (x.n===1?'':'s') + ' · ' + money(x.amt) + ' current-tenant bills; collection not guaranteed');
    add(financialTime(this.sim.nextSettlementDay()), 'Weekly expense settlement', money(this.sim.committedBills()) + ' accrued so far; more accrues before settlement');
    for (const d of s.debt || []) if (d.next) add((d.next - 1) * 1440 + 7 * 60, 'Term-loan payment', money(d.pmt) + ' scheduled');
    for (const o of s.orders.filter((x) => x.st === 'construction')) if (!o.waiting) add(now + Math.max(1, Math.ceil((1 - (o.prog || 0)) * o.dur)), 'Estimated construction finish', o.label || 'Construction');
    for (const cp of (s.mkt && s.mkt.comp || [])) if (cp.opens >= day) add((cp.opens - 1) * 1440 + 8 * 60, 'Competitor opens', cp.name);
    return E.sort((a,b) => a.t - b.t).slice(0, 40);
  }
  showCalendar() {
    const E = this.calendarEvents(), now = this.sim.s.t;
    const rows = E.map((e) => { const d=dayOf(e.t), same=d===dayOf(now); return '<div class="item"><div class="grow"><b>' + esc(e.label) + '</b><small>' + esc(e.detail || '') + '</small></div><span class="pill ' + (e.kind==='important'?'r':same?'a':'b') + '">Day ' + d + '<br>' + fmtTime(e.t) + '</span></div>'; }).join('');
    this.$('modal').innerHTML = '<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Calendar</h2><button class="x" data-a="modalClose" aria-label="Close">' + I.x + '</button></div>' +
      '<p class="note">Day ' + dayOf(now) + ' · ' + fmtTime(now) + '. Dates below come from current leases, collections, loans, construction, competitors and scenario state; estimated construction dates can move if prerequisites block work.</p>' +
      '<div class="list">' + (rows || '<p class="note">No important scheduled dates yet.</p>') + '</div></div></div>';
  }
  modalOpen() { return !!this.$('modal').firstChild; }
  closeModal() { this.$('modal').innerHTML = ''; this.title = false; this.resumePopup('modal'); this.renderTut(true); }
  showMenu() {
    const a = this.g.audio;
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Menu</h2><button class="x" data-a="modalClose" aria-label="Close">${I.x}</button></div>
      <div class="menu-list"><button class="btn" data-a="handbook">Builder\'s handbook <small>How, why and when to use every build item</small></button><button class="btn" data-a="saveCode">Save game (copy code)</button><button class="btn" data-a="saveFile">Save game (download file)</button><button class="btn" data-a="loadOpen">Load game</button>${this.keptLabel() ? `<button class="btn" data-a="restoreKept">Restore previous game <small>${this.keptLabel()}</small></button>` : ''}</div>
      <h3>Audio</h3>${['master', 'sfx', 'music', 'amb'].map((k) => `<label class="slider"><span>${{ master: 'Master', sfx: 'Effects', music: 'Music', amb: 'Ambience' }[k]}</span><input type="range" min="0" max="1" step="0.05" value="${a.vol[k]}" data-vol="${k}"></label>`).join('')}
      <div class="row wrap"><button class="btn sm" data-a="music">Music ${a.musicOn ? 'on' : 'off'}</button><button class="btn sm" data-a="fps">Performance stats ${this.g.showFps ? 'on' : 'off'}</button></div>
      <h3>Graphics</h3><div class="row wrap"><button class="btn sm" data-a="gfx">Quality: ${this.g.autoQ ? 'Auto (' : ''}${['Low', 'Medium', 'High'][this.g.rend.quality]}${this.g.autoQ ? ')' : ''}</button><button class="btn sm" data-a="battery">Battery saver ${this.g.battery ? 'on' : 'off'}</button><button class="btn sm" data-a="lens">Miniature lens ${this.g.showcase && this.g.showcase.lensPref ? 'on' : 'off'}</button></div>
      <h3>Showcase</h3><div class="menu-list"><button class="btn" data-a="photo">Photo mode <small>Light, looks, lens and a shutter (P)</small></button><button class="btn" data-a="tour">Cinematic tour <small>The camera wanders your property. Tap to stop.</small></button></div>
      <p class="note">Tip: tap any customer, car or staff member to follow them and read their story.</p>
      <h3>New game</h3><div class="menu-list"><button class="btn" data-a="new" data-v="maple">Maple Street tutorial</button><button class="btn" data-a="scenarios">Scenarios</button><button class="btn" data-a="sandboxSetup">Sandbox</button></div>
      <h3>Controls</h3><p class="note">Drag to pan, pinch or scroll to zoom, rotate with the side buttons (Q/E). On touch, press and hold then drag to place a build; a quick drag pans. Two fingers pan/zoom. Space pauses, 1-3 set speed, Esc cancels.</p>
      <p class="note" id="autosaveNote">${this.autosaveNote()}</p>
      <p class="note build">Build ${esc(this.g.BUILD ? this.g.BUILD.name : 'dev')} · ${esc(this.g.BUILD ? this.g.BUILD.date : '')}. Mention this when you send feedback.</p></div></div>`;
  }
  showHandbook() {
    const cost = (t) => t.cost != null ? money(t.cost) : t.costPerCell != null ? money(t.costPerCell) + ' / cell' : 'No build price';
    const place = (t) => t.shape === 'tap' ? 'Press-and-hold placement' : t.shape === 'row' ? 'Press-hold-drag row' : 'Press-hold-drag area';
    const groups = CATEGORIES.map((cat) => {
      const rows = Object.entries(TOOLS).filter(([, t]) => t.cat === cat.id);
      if (!rows.length) return '';
      const items = rows.map(([k, t]) => {
        const g = guideFor(k, t);
        return '<details class="handbook-item"><summary><span><b>' + esc(t.name) + '</b><small>' + esc(cost(t)) + ' · ' + esc(place(t)) + '</small></span><span aria-hidden="true">›</span></summary>' +
          '<div class="handbook-copy"><p><b>What it does</b><br>' + esc(t.desc) + '</p><p><b>How to use it</b><br>' + esc(g.how) + '</p><p><b>Why it matters</b><br>' + esc(g.why) + '</p><p><b>When to use it</b><br>' + esc(g.when) + '</p></div></details>';
      }).join('');
      return '<section class="handbook-section"><h3>' + esc(cat.name) + '</h3>' + items + '</section>';
    }).join('');
    this.$('modal').innerHTML = '<div class="modal-bg"><div class="modal handbook"><div class="row"><h2 style="flex:1">Builder\'s handbook</h2><button class="x" data-a="modalClose" aria-label="Close">' + I.x + '</button></div>' +
      '<p class="note">Every item in the Build menu is listed here. The handbook explains the current game rules; build previews remain the final authority for whether a specific placement is valid.</p>' + groups + '</div></div>';
  }

  async showSave() {
    const code = await this.g.saveCode();
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Save code</h2><button class="x" data-a="modalClose" aria-label="Close">${I.x}</button></div>
      <p class="note">Copy this code somewhere safe. Paste it into Load to resume exactly here (Day ${dayOf(this.sim.s.t)}, ${fmtTime(this.sim.s.t)}).</p><textarea id="saveTa" readonly>${code}</textarea><div class="row" style="margin-top:8px"><button class="btn pri" data-a="copy">Copy</button><button class="btn" data-a="saveFile">Download file</button></div></div></div>`;
  }
  showLoad() {
    this.$('modal').innerHTML = `<div class="modal-bg"><div class="modal"><div class="row"><h2 style="flex:1">Load game</h2><button class="x" data-a="${this.title ? 'showTitle' : 'modalClose'}" aria-label="Close">${I.x}</button></div>
      <p class="note">Paste a save code, or open a .sst save file.</p><textarea id="loadTa" placeholder="Paste save code"></textarea>
      <div class="row" style="margin-top:8px"><button class="btn pri" data-a="loadCode">Load code</button><button class="btn" data-a="loadFile">Open file</button><input type="file" id="loadFile" hidden></div></div></div>`;
    const x = this.root.querySelector('[data-a="showTitle"]'); if (x) x.onclick = () => this.showTitle();
  }
}
