import { BEATS } from './tutorial.js';
// Showcase layer: living title screen, cinematic tour, follow-cam with tenant stories, photo mode,
// milestone celebrations and money pops. Presentation only: reads the simulation, never changes it.
import { NAMES_FIRST, NAMES_LAST, FLOOR_H, MIN_PER_DAY } from './data.js';
import { fmtTime, dayOf } from './sim.js';
import { PostFX, LOOK_NAMES } from './post.js';
import { WorldFX } from './fx.js';
import { MILESTONES } from './ui.js';

const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const money = (v) => (v < 0 ? '-' : '') + '$' + Math.abs(Math.round(v)).toLocaleString();
const h32 = (n) => { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0); };
const lerp = (a, b, k) => a + (b - a) * k;
const QUARTER = Math.PI / 2, BASE_AZ = Math.PI / 4;

const STORIES = {
  '5x5': ['Holiday decorations and a few boxes of books', 'Files and samples from a home business', 'Camping gear between trips', "A college student's winter clothes"],
  '5x10': ['Between apartments for the summer', 'Inventory for a small online shop', "Grandma's china and photo albums", 'Kayaks, bikes and beach chairs'],
  '10x10': ['Renovating the kitchen, so the dining room lives here', 'New in town and still house hunting', 'A one-bedroom apartment, packed to the ceiling', 'Downsizing now the kids have moved out'],
  '10x20': ['A whole house between closings', "A contractor's tools and materials", 'Restoring a classic car, one part at a time', 'Furniture from a family estate'],
};
const VISIT = { movein: 'Move-in day', moveout: 'Moving out', access: 'Quick visit', bigaccess: 'Big haul', prospect: 'Shopping for storage' };
const ROLE_LINE = { owner: 'That\'s you. Handles whatever needs doing.', porter: 'Keeps carts, halls and units ready.', tech: 'Fixes doors, gates, lights and elevators.', clerk: 'Runs the counter and signs new leases.' };
const TASK = { makeready: 'Make-ready', clean: 'Cleaning', carts: 'Cart run', clean_restroom: 'Cleaning the restroom', pm: 'Preventive maintenance' };
const TOD = [['live', 'Live'], [8.2, 'Morning'], [12.5, 'Noon'], [18.2, 'Golden'], [19.5, 'Dusk'], [22.5, 'Night']];
const WX = [['live', 'Live'], ['fair', 'Clear'], ['rain', 'Rain']];
const IC = {
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.6"/></svg>',
  film: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linejoin="round"><rect x="3" y="6" width="13" height="12" rx="2"/><path d="M16 10.5 21 8v8l-5-2.5z"/></svg>',
  x: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6 6 18"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v8h14v-8"/></svg>',
  eye: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></svg>',
};

export function installShowcase(game) {
  const rend = game.rend, ui = game.ui;
  const post = new PostFX(rend); rend.post = post;
  const fx = new WorldFX(rend); rend.fx = fx;
  const body = document.body;

  // ---------------------------------------------------------------- DOM layers
  const layer = document.createElement('div'); layer.id = 'showcase'; body.appendChild(layer);
  layer.innerHTML = `<div id="pops" aria-hidden="true"></div><div id="celebrate" aria-live="polite"></div><div id="followCard" hidden></div>
    <div id="photoBar" hidden></div><div id="flash"></div><div id="shot" hidden></div><div id="reticle"></div><div id="tourChip" hidden></div>`;
  const $ = (id) => document.getElementById(id);
  { // money pops live in the world layer: under the HUD, sheets and dialogs, above the map pins
    const uiRoot = document.getElementById('ui'), pins = document.getElementById('pins');
    if (uiRoot) { const pp = $('pops'); if (pins && pins.parentNode === uiRoot) pins.after(pp); else uiRoot.prepend(pp); }
  }

  const sc = {
    mode: null, // null | 'attract' | 'tour' | 'follow'
    photo: false, lensPref: true, tod: 'live', wx: 'live', freeze: false, follow: null,
    shot: null, shotT: 0, az: rend.azimuth, baseZoom: 1, todT: 16.8, pops: [], seenFull: new WeakMap(), rentAgg: null,
    post, fx,
  };
  game.showcase = sc;

  // ---------------------------------------------------------------- camera director
  function pois() {
    const s = game.sim.s, out = [];
    const objs = Object.values(s.objects);
    const office = objs.find((o) => o.type === 'office'); if (office) out.push({ x: office.x + (office.w || 1) / 2, z: office.y + (office.h || 1) / 2, z0: 1.9 });
    const gate = objs.find((o) => o.type === 'gate'); if (gate) out.push({ x: gate.x + 0.5, z: gate.y + 0.5, z0: 2.1 });
    const shells = objs.filter((o) => o.type === 'shell'); for (const b of shells.slice(0, 3)) out.push({ x: b.x + b.w / 2, z: b.y + b.h / 2, z0: 1.5 });
    const units = objs.filter((o) => o.type === 'unit' && o.access === 'drive'); if (units.length) { const u = units[h32(Math.floor(performance.now() / 9000)) % units.length]; out.push({ x: u.x + 0.5, z: u.y + 0.5, z0: 2.4 }); }
    const busy = s.agents.filter((a) => !a.hidden && a.kind === 'cust'); if (busy.length) { const a = busy[h32(busy.length + Math.floor(performance.now() / 7000)) % busy.length]; out.push({ x: a.x, z: a.y, z0: 2.8, ag: a.id }); }
    const vs = s.vehicles.filter((v) => !v.parked); if (vs.length) { const v = vs[0]; out.push({ x: v.x, z: v.y, z0: 2.2, veh: v.id }); }
    const p = s.parcel; out.push({ x: (p.x0 + p.x1) / 2, z: (p.y0 + p.y1) / 2, z0: 1, wide: true });
    return out;
  }
  let shotN = 0;
  function nextShot() {
    const P = pois(); shotN++;
    let pick = shotN % 4 === 1 ? P[P.length - 1] : P[h32(shotN * 977 + P.length) % P.length];
    const wide = !!pick.wide;
    sc.shot = { x: pick.x, z: pick.z, zoom: sc.baseZoom * (wide ? 1.05 : Math.min(2.3, pick.z0 * 0.85)), dur: wide ? 11 : 8 + (h32(shotN) % 30) / 10, azV: (h32(shotN * 13) % 2 ? 1 : -1) * (wide ? 0.05 : 0.075), elev: wide ? 0.66 : 0.52 + (h32(shotN * 7) % 12) / 100, ag: pick.ag, veh: pick.veh };
    sc.shotT = 0;
  }
  function trackPos(ag, veh) { // live world position of an agent (or the car it is riding in)
    const s = game.sim.s;
    if (ag != null) {
      const a = s.agents.find((x) => x.id === ag); if (!a) return null;
      if (a.hidden && a.veh != null) { const m = rend.pool.veh.get(a.veh); if (m) return { x: m.position.x, z: m.position.z, y: 0, inCar: true }; const v = s.vehicles.find((x) => x.id === a.veh); return v ? { x: v.x, z: v.y, y: 0, inCar: true } : null; }
      const m = rend.pool.ppl.get(a.id); if (m) return { x: m.position.x, z: m.position.z, y: m.position.y };
      return { x: a.x, z: a.y, y: (a.f || 0) * FLOOR_H };
    }
    if (veh != null) { const m = rend.pool.veh.get(veh); if (m) return { x: m.position.x, z: m.position.z, y: 0 }; }
    return null;
  }
  function titleOffset() { const w = rend.canvas.clientWidth, h = rend.canvas.clientHeight; return w >= 900 && h >= 600 ? w * 0.2 : 0; }
  function measureBase() { // zoom that frames the facility for the current screen
    const z = rend.zoom, c = rend.center.clone(), az = rend.azimuth, el = rend.camElev;
    rend.camElev = 0.66; sc.internal = true; try { rend.fitProperty(); } finally { sc.internal = false; } const bz = rend.zoom;
    rend.zoom = z; rend.center.copy(c); rend.azimuth = az; rend.camElev = el; rend.updateCamera();
    return bz;
  }
  function cinematic(dt) {
    const c = rend.center;
    if (sc.mode === 'follow') {
      const f = sc.follow, p = trackPos(f.ag, f.veh);
      if (!p) { if (!f.goneAt) { f.goneAt = performance.now(); renderFollow(true); } if (performance.now() - f.goneAt > 2600) stopFollow(); return; }
      const k = 1 - Math.exp(-dt * 3.5); c.x = lerp(c.x, p.x, k); c.z = lerp(c.z, p.z + (p.y || 0) * 0.0, k);
      rend.zoom = lerp(rend.zoom, f.zoom, 1 - Math.exp(-dt * 1.6));
      rend.updateCamera(); return;
    }
    if (!sc.shot || sc.shotT > sc.shot.dur) nextShot();
    const S = sc.shot; sc.shotT += dt;
    let tx = S.x, tz = S.z; const tp = (S.ag != null || S.veh != null) && trackPos(S.ag, S.veh); if (tp) { tx = tp.x; tz = tp.z; }
    const off = sc.mode === 'attract' ? titleOffset() : 0; // keep the subject clear of the title card
    if (off) { const wpp = rend.frustum / rend.zoom / (rend.canvas.clientHeight || 1); tx -= Math.cos(rend.azimuth) * off * wpp; tz += Math.sin(rend.azimuth) * off * wpp; }
    const k = 1 - Math.exp(-dt * 0.55);
    c.x = lerp(c.x, tx, k); c.z = lerp(c.z, tz, k);
    rend.zoom = lerp(rend.zoom, S.zoom, 1 - Math.exp(-dt * 0.4));
    rend.camElev = lerp(rend.camElev || 0.72, S.elev, 1 - Math.exp(-dt * 0.5));
    sc.az += S.azV * dt; rend.azimuth = rend.targetAz = sc.az;
    rend.updateCamera();
  }
  function settleCamera(hard) { // back to the gameplay camera: nearest quarter view, standard tilt
    const kq = Math.round((rend.azimuth - BASE_AZ) / QUARTER);
    rend.targetAz = BASE_AZ + kq * QUARTER; rend.rot = ((kq % 4) + 4) % 4;
    if (hard) rend.azimuth = rend.targetAz;
    sc.elevBack = true; if (hard) { rend.camElev = 0.72; sc.elevBack = false; }
    rend.updateCamera();
  }
  function startAttract() {
    sc.mode = 'attract'; body.classList.add('attract'); sc.az = rend.azimuth; sc.baseZoom = measureBase(); sc.shot = null; shotN = 0; sc.todT = 17.4;
    post.mode = 'strong'; post.focus = 0.5; post.strength = 0.75;
  }
  function stopAttract() {
    if (sc.mode !== 'attract') return;
    sc.mode = null; body.classList.remove('attract'); rend.todOverride = null; rend.weatherOverride = null; settleCamera(true); applyLens();
  }
  function startTour() {
    stopFollow(true); sc.mode = 'tour'; sc.az = rend.azimuth; sc.baseZoom = measureBase(); sc.shot = null; shotN = 0;
    if (!sc.photo) { post.mode = 'strong'; post.strength = 0.6; post.focus = 0.5; }
    $('tourChip').hidden = sc.photo; $('tourChip').innerHTML = `${IC.film}<span>Cinematic tour</span><small>Tap anywhere to stop</small>`;
    renderPhotoBar();
  }
  function stopTour() {
    if (sc.mode !== 'tour') return; sc.mode = null; $('tourChip').hidden = true; settleCamera(false); applyLens(); renderPhotoBar();
  }
  sc.startTour = startTour; sc.stopTour = stopTour;
  function applyLens() { if (sc.photo) { post.mode = 'strong'; return; } if (sc.mode === 'attract' || sc.mode === 'tour') return; post.mode = sc.lensPref ? 'subtle' : 'off'; }
  sc.setLens = (on) => { sc.lensPref = on; applyLens(); };

  // ---------------------------------------------------------------- follow cam + tenant story
  function nameFor(a) {
    const s = game.sim.s;
    if (a.kind === 'staff') { const st = game.sim.staffOf ? game.sim.staffOf(a) : null; const role = { owner: 'Owner', porter: 'Porter', tech: 'Tech', clerk: 'Clerk' }[a.role] || 'Staff'; return { name: a.role === 'owner' ? 'You' : (st && st.name) || role, role }; }
    const tn = a.tenant && s.tenants[a.tenant];
    if (tn) return { name: tn.name, role: VISIT[a.vt] || 'Tenant' };
    const L = a.look || a.id; return { name: `${NAMES_FIRST[L % NAMES_FIRST.length]} ${NAMES_LAST[Math.floor(L / 7) % NAMES_LAST.length]}`, role: VISIT[a.vt] || 'Visitor' };
  }
  function activity(a) {
    const s = game.sim.s, u = a.unit && s.objects[a.unit], un = u ? u.name : 'their unit';
    if (a.kind === 'staff') {
      const t = a.task && s.tasks.find((x) => x.id === a.task);
      const tl = t ? (TASK[t.type] || (t.type.startsWith('repair') ? 'Repair' : t.type)) + (t.obj && s.objects[t.obj] ? ' · ' + (s.objects[t.obj].name || game.sim.objName(s.objects[t.obj])) : '') : null;
      return { office: 'At the office', walk: tl ? `Heading to a job: ${tl}` : 'Walking the property', work: tl ? `Working: ${tl}` : 'Working', home: 'Heading back to the office', elev: a.inElev ? 'Riding the elevator' : 'Waiting for the elevator', idle: 'Between jobs', toCorral: 'Fetching a cart', retCart: 'Returning a cart' }[a.st] || 'On shift';
    }
    const moving = a.vt === 'movein' ? 'Unloading into ' + un : a.vt === 'moveout' ? 'Emptying ' + un : 'Getting things from ' + un;
    return { arrive: 'Pulling up to the gate', gateq: 'Waiting in line at the gate', drive: a.vt === 'prospect' ? 'Parking at the office' : `Driving to ${un}`, toOffice: 'Walking to the office', office: a.vt === 'prospect' ? 'At the counter, asking about sizes' : 'At the counter', toCorral: 'Grabbing a cart', waitCart: 'Waiting for a free cart', walk: `Walking to ${un}`, elev: a.inElev ? 'Riding the elevator' : 'Waiting for the elevator', atunit: moving, toRest: 'Heading to the restroom', inRest: 'In the restroom', retCart: 'Returning the cart', back: 'Walking back to the car', leave: 'Driving away', done: 'Leaving' }[a.st] || 'Visiting';
  }
  function story(a) {
    const s = game.sim.s;
    if (a.kind === 'staff') return ROLE_LINE[a.role] || '';
    if (a.vt === 'prospect') return `Looking for a ${a.climate ? 'climate-controlled ' : ''}${a.size || 'unit'}${a.keen ? ', and ready to sign today' : ''}.`;
    const u = a.unit && s.objects[a.unit]; const size = (u && u.size) || a.size || '10x10';
    const list = STORIES[size] || STORIES['10x10']; return list[h32(a.tenant || a.look || a.id) % list.length] + '.';
  }
  function startFollow(target) {
    if (sc.mode === 'tour') stopTour();
    const a = target.ag != null ? game.sim.s.agents.find((x) => x.id === target.ag) : null;
    sc.follow = { ...target, zoom: Math.max(rend.zoom, 2.6), since: performance.now() };
    if (a) sc.follow.nm = nameFor(a);
    sc.mode = 'follow'; ui.select(null); game.audio.play('click'); renderFollow(true);
  }
  function stopFollow(silent) { if (sc.mode !== 'follow') return; sc.mode = null; sc.follow = null; $('followCard').hidden = true; body.classList.remove('following'); if (!silent) game.audio.play('click'); }
  sc.stopFollow = stopFollow;
  let lastCard = 0;
  function renderFollow(force) {
    const el = $('followCard'); const f = sc.follow; if (!f) { el.hidden = true; return; }
    const now = performance.now(); if (!force && now - lastCard < 250) return; lastCard = now;
    const s = game.sim.s, a = f.ag != null && s.agents.find((x) => x.id === f.ag);
    body.classList.add('following');
    if (!a) { el.hidden = false; el.innerHTML = `<div class="fc-top"><span class="fc-av">${IC.eye}</span><div class="fc-nm"><b>${esc(f.nm ? f.nm.name : 'Visitor')}</b><small>Has left the property</small></div><button class="fc-x" data-f="stop" aria-label="Stop following">${IC.x}</button></div>`; return; }
    const nm = nameFor(a), tn = a.tenant && s.tenants[a.tenant];
    const th = [...s.thoughts].reverse().find((t) => t.ag === a.id && s.t - t.t < 180);
    const mood = tn ? tn.sat : null, moodTxt = mood == null ? '' : mood > 0.78 ? 'Happy' : mood > 0.6 ? 'Content' : mood > 0.45 ? 'Mixed' : 'Unhappy';
    const L = tn && tn.lease && s.leases[tn.lease];
    const since = tn ? Math.max(0, Math.floor((s.t - tn.since) / MIN_PER_DAY)) : null;
    const u = a.unit && s.objects[a.unit];
    const initials = nm.name.split(' ').map((w) => w[0]).join('').slice(0, 2);
    el.hidden = false;
    el.innerHTML = `<div class="fc-top"><span class="fc-av ${a.kind === 'staff' ? 'staff ' + a.role : ''}">${esc(initials)}</span><div class="fc-nm"><b>${esc(nm.name)}</b><small>${esc(nm.role)}${u ? ' · ' + esc(u.name) : ''}</small></div><button class="fc-x" data-f="stop" aria-label="Stop following">${IC.x}</button></div>
      <div class="fc-act"><i class="dot"></i>${esc(activity(a))}</div>
      <p class="fc-story">${esc(story(a))}</p>
      ${th ? `<div class="fc-th ${th.kind}">\u201c${esc(th.text)}\u201d</div>` : ''}
      <div class="fc-meta">${mood != null ? `<span>Mood <b>${moodTxt}</b><i class="bar"><i style="width:${Math.round(mood * 100)}%"></i></i></span>` : ''}${L ? `<span>Rent <b>${money(L.rent)}/mo</b></span>` : ''}${since != null && a.vt !== 'movein' ? `<span>Tenant <b>${since ? since + ' d' : 'new'}</b></span>` : ''}${u ? `<button class="fc-go" data-f="unit" data-id="${u.id}">Open unit</button>` : ''}</div>`;
  }
  $('followCard').addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]'); if (!b) return; e.stopPropagation();
    if (b.dataset.f === 'stop') stopFollow();
    else if (b.dataset.f === 'unit') { const id = +b.dataset.id; stopFollow(true); ui.select(id, true); }
  });
  function pickMover(x, y) { // nearest visible person or car to a screen point
    let best = null, bd = 22;
    const s = game.sim.s;
    for (const a of s.agents) {
      if (a.hidden) continue; const m = rend.pool.ppl.get(a.id); if (!m || !m.visible) continue;
      const p = rend.project(m.position.x, m.position.z, m.position.y + 0.45); const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { bd = d; best = { ag: a.id }; }
    }
    if (best) return best;
    bd = 26;
    for (const v of s.vehicles) {
      const m = rend.pool.veh.get(v.id); if (!m) continue; const p = rend.project(m.position.x, m.position.z, 0.4); const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) { const a = s.agents.find((q) => q.veh === v.id && q.kind === 'cust'); if (a) { bd = d; best = { ag: a.id }; } }
    }
    return best;
  }

  // ---------------------------------------------------------------- input hooks
  const origPan = rend.pan.bind(rend);
  rend.pan = (dx, dy) => { if (sc.internal) return origPan(dx, dy); if (sc.mode === 'tour') stopTour(); else if (sc.mode === 'follow') stopFollow(true); origPan(dx, dy); };
  const origTap = ui.tapMap.bind(ui);
  ui.tapMap = (cell, x, y) => {
    if (sc.photo) { if (y != null) { post.focus = 1 - y / (rend.canvas.clientHeight || 1); reticle(x, y); renderPhotoBar(); } return; }
    if (sc.mode === 'tour') { stopTour(); return; }
    if (x != null && !ui.tool) { const m = pickMover(x, y); if (m) { startFollow(m); return; } }
    if (sc.mode === 'follow') stopFollow(true);
    origTap(cell);
  };
  function reticle(x, y) { const r = $('reticle'); r.style.left = x + 'px'; r.style.top = y + 'px'; r.classList.remove('on'); void r.offsetWidth; r.classList.add('on'); }
  const origAttach = game.attach.bind(game);
  game.attach = (sim, kind) => { clearCrowd(); if (sc.mode === 'attract') stopAttract(); stopFollow(true); if (sc.mode === 'tour') stopTour(); sc.pops.length = 0; $('pops').innerHTML = ''; const r = origAttach(sim, kind); const o = sim.occupancy(); sc.seenFull.set(sim, o.n > 0 && o.occ >= o.n); return r; };
  const origEvent = ui.onEvent.bind(ui);
  ui.onEvent = (e) => { origEvent(e); onEvent(e); };

  // ---------------------------------------------------------------- celebrations + money pops
  let banQ = [], banBusy = false;
  function celebrate(kicker, title, sub, at) {
    if (at) fx.burst(at.x, at.z, at.f || 0);
    banQ.push({ kicker, title, sub }); if (banQ.length > 3) banQ.shift(); if (!banBusy) nextBanner();
  }
  sc.celebrate = celebrate;
  sc.bannerBusy = () => banBusy || banQ.length > 0; // the UI holds lesson offers until celebrations finish
  function nextBanner() {
    const b = banQ.shift(); const el = $('celebrate'); if (!b) { banBusy = false; return; } banBusy = true;
    game.audio.play('flourish');
    el.innerHTML = `<div class="cb"><span class="cb-k"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 6.6L21 9l-5.2 4.2L17.6 20 12 16.2 6.4 20l1.8-6.8L3 9l6.6-.4z"/></svg>${esc(b.kicker)}</span><b>${esc(b.title)}</b>${b.sub ? `<small>${esc(b.sub)}</small>` : ''}</div>`;
    el.classList.remove('on'); void el.offsetWidth; el.classList.add('on');
    setTimeout(() => { el.classList.remove('on'); setTimeout(nextBanner, 450); }, 3600);
  }
  function officeAt() { const o = Object.values(game.sim.s.objects).find((q) => q.type === 'office'); return o ? { x: o.x + (o.w || 1) / 2, z: o.y + (o.h || 1) / 2, f: 0 } : { x: rend.center.x, z: rend.center.z, f: 0 }; }
  function pop(x, z, f, text, cls) {
    if (ui.title) return;
    // phone declutter: merge a pop into a recent identical one nearby instead of stacking labels
    const near = sc.pops.find((q) => q.base === text && q.t < 0.8 && Math.hypot(q.x - x, q.z - z) < 6 && Math.abs(q.y - ((f || 0) * FLOOR_H + 1.4)) < 1);
    if (near) { near.n = (near.n || 1) + 1; near.el.textContent = `${text} ×${near.n}`; return; }
    if (sc.pops.length > (innerWidth < 700 ? 6 : 14)) return;
    const el = document.createElement('div'); el.className = 'mpop ' + (cls || ''); el.textContent = text; $('pops').appendChild(el);
    sc.pops.push({ x, z, y: (f || 0) * FLOOR_H + 1.4, t: 0, el, base: text });
  }
  function onEvent(e) {
    if (ui.title) return;
    const s = game.sim.s;
    switch (e.type) {
      case 'lease': pop(e.x + 0.5, e.y + 0.5, e.f, `+${money(e.rent)}/mo`, 'lease'); checkFull(); break;
      case 'rent': { if (s.speed > 2) break; const A = sc.rentAgg; if (A && performance.now() - A.t < 900) { A.amt += e.amt; A.el.textContent = `+${money(A.amt)}`; } else { const o = officeAt(); pop(o.x, o.z, 0, `+${money(e.amt)}`, 'rent'); const P = sc.pops[sc.pops.length - 1]; sc.rentAgg = P ? { t: performance.now(), amt: e.amt, el: P.el } : null; } break; }
      case 'repaired': if (e.x != null) pop(e.x + 0.5, e.y + 0.5, e.f, 'Fixed', 'fix'); break;
      case 'rentready': pop(e.x + 0.5, e.y + 0.5, e.f, 'Rent-ready', 'fix'); break;
      case 'tier_up': celebrate('Promoted', ['', 'Owner-operator', 'Local operator', 'Regional operator', 'Portfolio operator', 'Storage magnate'][e.tier] || 'New level', 'New perks unlocked in Growth'); break;
      case 'lesson_done': celebrate('Lesson complete', e.title, ''); break;
      case 'milestone': if (MILESTONES[e.k] && !String(e.k).startsWith('scenario_')) celebrate('Milestone', MILESTONES[e.k], milestoneSub(e.k), officeAt()); break;
      case 'commissioned': if (e.n >= 2) celebrate('Grand opening', `${e.n} new units open`, 'Now visible to shoppers. Leasing starts today.', { x: e.x + 0.5, z: e.y + 0.5, f: e.f }); break;
      case 'scenario_end': if (e.won) celebrate('Scenario complete', s.scenario ? s.scenario.name || 'Goals met' : 'Goals met', `Finished on day ${game.sim.day}`, officeAt()); break;
      case 'tut_done': if (s.tut.done) celebrate('Graduated', 'Maple Street is yours', 'The full game is unlocked. Build whatever you like.', officeAt()); else if (BEATS[e.beat] && BEATS[e.beat + 1] && e.beat > 0) celebrate(`Part ${e.beat + 1} of ${BEATS.length} complete`, BEATS[e.beat].title.replace(/\.$/, ''), `Next: ${BEATS[e.beat + 1].title.replace(/\.$/, '')}`, officeAt()); break;
      case 'moveout': checkFull(); break;
      case 'auction_start': auctionCrowd(e.units); { const u = s.objects[e.units[0]]; celebrate('Auction day', `${e.units.length} unit${e.units.length > 1 ? 's' : ''} up for bid`, 'Bidders are gathering at the doors. Sales close in about an hour.', u ? { x: u.x + 0.5, z: u.y + 0.5, f: u.f || 0 } : officeAt()); } break;
      case 'auction_sold': pop(e.x + 0.5, e.y + 0.5, e.f, `Sold ${money(e.price)}`, 'lease'); fx.burst(e.x + 0.5, e.y + 0.5, e.f || 0); cheer(e.unit); break;
      case 'auction_end': setTimeout(clearCrowd, 2500); if (e.mode === 'auction' && e.n) celebrate('Auction closed', `${e.n} lot${e.n > 1 ? 's' : ''} sold for ${money(e.total)}`, 'Units need a clean-out before they rent again.', officeAt()); break;
      case 'retained': { const u = s.objects[e.unit]; if (u) pop(u.x + 0.5, u.y + 0.5, u.f || 0, 'Staying', 'fix'); break; }
      case 'paid_up': { const u = s.objects[e.unit]; if (u && e.amt > 0) pop(u.x + 0.5, u.y + 0.5, u.f || 0, `+${money(e.amt)}`, 'rent'); break; }
    }
  }
  // ---------------------------------------------------------------- auction set piece (GDD §36): a visible crowd of bidders
  sc.crowd = [];
  function auctionCrowd(units) {
    clearCrowd(); const sim = game.sim;
    for (const id of units.slice(0, 4)) {
      const u = sim.s.objects[id]; if (!u) continue; const fc = sim.unitFront(u)[0]; if (!fc) continue;
      const f = u.f || 0, cx = fc.x + 0.5, cz = fc.y + 0.5, ux = u.x + (u.w || 1) / 2, uz = u.y + (u.h || 1) / 2;
      const ang = Math.atan2(cx - ux, cz - uz); const n = 4 + (id % 3);
      for (let k = 0; k < n; k++) {
        const m = rend.personMesh({ id: 9000 + id * 10 + k, look: id * 31 + k * 7 });
        const a = ang + (k - (n - 1) / 2) * 0.42, r = 1.15 + (k % 2) * 0.45;
        m.position.set(cx + Math.sin(a) * r * 0.9, f * FLOOR_H, cz + Math.cos(a) * r * 0.9);
        m.rotation.y = Math.atan2(ux - m.position.x, uz - m.position.z);
        m.userData.base = m.position.y; m.userData.ph = k * 1.7; m.userData.unit = id; m.userData.f = f;
        rend.scene.add(m); sc.crowd.push(m);
      }
    }
  }
  function cheer(unit) { for (const m of sc.crowd) if (m.userData.unit === unit) m.userData.jump = 0.6; }
  function clearCrowd() { for (const m of sc.crowd) { rend.scene.remove(m); rend.disposeTree(m); } sc.crowd = []; }
  function updateCrowd(dt) {
    if (!sc.crowd.length) return;
    const t = performance.now() / 1000;
    for (const m of sc.crowd) {
      const d = m.userData; let y = d.base + Math.max(0, Math.sin(t * 2.2 + d.ph)) * 0.025;
      if (d.jump > 0) { d.jump -= dt; y += Math.sin((0.6 - d.jump) / 0.6 * Math.PI * 2) ** 2 * 0.22; }
      m.position.y = y; m.visible = rend.view === 'ext' || rend.view === d.f;
    }
  }
  sc.auctionCrowd = auctionCrowd; sc.clearCrowd = clearCrowd;
  function milestoneSub(k) {
    return { first_retention: 'A tenant who was leaving decided to stay.', first_auction: 'A delinquent account resolved through a lien sale.', first_loan: 'Borrowed capital is working for the property.', first_makeready: 'A vacant unit is clean and back on the market.', first_lease_after_turnover: 'Turnover to new lease: the core loop works.', first_expansion: 'More doors, more rent.', first_cart_trip: 'Carts are moving goods indoors.', first_repair: 'Broken equipment is back in service.', first_delegated: 'Your staff finished a job without you.', first_climate: 'Climate-controlled storage is open.', first_upper: 'Your first upper floor is open.' }[k] || '';
  }
  function checkFull() {
    const sim = game.sim, o = sim.occupancy(); const full = o.n > 0 && o.occ >= o.n;
    const was = sc.seenFull.get(sim);
    if (full && was === false) celebrate('Fully leased', `${o.n}/${o.n} units occupied`, `${game.metaName ? game.metaName() : 'Your property'} has no vacancies.`, officeAt());
    sc.seenFull.set(sim, full);
  }
  function updatePops(dt) {
    for (let i = sc.pops.length - 1; i >= 0; i--) {
      const P = sc.pops[i]; P.t += dt;
      const p = rend.project(P.x, P.z, P.y); const k = P.t / 1.9;
      P.el.style.transform = `translate(${p.x}px, ${p.y - k * 46}px) translate(-50%, -50%) scale(${0.8 + Math.min(1, P.t * 6) * 0.2})`;
      P.el.style.opacity = String(Math.max(0, Math.min(1, P.t * 8)) * (1 - Math.max(0, (k - 0.6) / 0.4)));
      if (P.t > 1.9) { P.el.remove(); sc.pops.splice(i, 1); }
    }
  }

  // ---------------------------------------------------------------- photo mode
  function enterPhoto() {
    if (sc.photo) return; stopFollow(true); ui.select(null); if (ui.tool) ui.pickTool(null); ui.setTab(null);
    sc.photo = true; body.classList.add('photo-mode'); post.mode = 'strong'; post.strength = 0.8; post.focus = 0.5; $('tourChip').hidden = true;
    sc.freezeSpeed = null; renderPhotoBar(); game.audio.play('tab');
  }
  function exitPhoto() {
    if (!sc.photo) return; sc.photo = false; body.classList.remove('photo-mode'); $('photoBar').hidden = true; $('shot').hidden = true;
    if (sc.freeze) { sc.freeze = false; if (sc.freezeSpeed != null) ui.do({ type: 'speed', v: sc.freezeSpeed }); }
    rend.todOverride = null; rend.weatherOverride = null; sc.tod = 'live'; sc.wx = 'live'; post.look = 'natural';
    if (sc.mode === 'tour') stopTour(); applyLens(); game.audio.play('tab');
  }
  sc.enterPhoto = enterPhoto; sc.exitPhoto = exitPhoto;
  function chips(key, list, cur) { return list.map(([v, n]) => `<button class="pchip ${String(cur) === String(v) ? 'on' : ''}" data-p="${key}" data-v="${v}">${n}</button>`).join(''); }
  function renderPhotoBar() {
    const el = $('photoBar'); if (!sc.photo) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML = `<div class="pb-top"><span class="pb-t">${IC.cam}Photo mode</span><span class="pb-hint">Drag to frame · pinch to zoom · tap to focus</span><button class="pb-done" data-p="done">Done</button></div>
      <div class="pb-rows">
        <div class="pb-row"><span class="pb-l">Light</span><div class="pb-chips">${chips('tod', TOD, sc.tod)}</div></div>
        <div class="pb-row"><span class="pb-l">Look</span><div class="pb-chips">${chips('look', Object.entries(LOOK_NAMES), post.look)}</div></div>
        <div class="pb-row"><span class="pb-l">Sky</span><div class="pb-chips">${chips('wx', WX, sc.wx)}<button class="pchip ${sc.freeze ? 'on' : ''}" data-p="freeze">${sc.freeze ? 'Frozen' : 'Freeze time'}</button><button class="pchip ${sc.mode === 'tour' ? 'on' : ''}" data-p="tour">${IC.film}Tour</button><button class="pchip" data-p="rot" data-v="-1">Rotate</button></div></div>
        <div class="pb-row"><span class="pb-l">Lens</span><label class="pb-sl"><span>Miniature</span><input type="range" min="0" max="1" step="0.05" value="${post.strength}" data-ps="strength"></label><label class="pb-sl"><span>Focus</span><input type="range" min="0.1" max="0.9" step="0.01" value="${post.focus.toFixed(2)}" data-ps="focus"></label></div>
      </div>
      <button class="pb-shutter" data-p="snap" aria-label="Take photo"><i></i></button>`;
  }
  $('photoBar').addEventListener('click', (e) => {
    const b = e.target.closest('[data-p]'); if (!b) return; e.stopPropagation(); game.audio.unlock();
    const k = b.dataset.p, v = b.dataset.v;
    if (k === 'done') { exitPhoto(); return; }
    if (k === 'snap') { snap(); return; }
    if (k === 'tod') { sc.tod = v === 'live' ? 'live' : +v; rend.todOverride = v === 'live' ? null : +v; }
    if (k === 'look') post.look = v;
    if (k === 'wx') { sc.wx = v; rend.weatherOverride = v === 'live' ? null : v; }
    if (k === 'freeze') { sc.freeze = !sc.freeze; if (sc.freeze) { sc.freezeSpeed = game.sim.s.speed; ui.do({ type: 'speed', v: 0 }); } else ui.do({ type: 'speed', v: sc.freezeSpeed || 1 }); }
    if (k === 'tour') { if (sc.mode === 'tour') stopTour(); else startTour(); }
    if (k === 'rot') rend.rotate(+v);
    game.audio.play('click'); renderPhotoBar();
  });
  $('photoBar').addEventListener('input', (e) => { const k = e.target.dataset.ps; if (!k) return; post[k] = +e.target.value; });
  for (const ev of ['pointerdown', 'wheel']) $('photoBar').addEventListener(ev, (e) => e.stopPropagation());

  async function snap() {
    // render one frame and copy it in the same task (the drawing buffer is not preserved)
    const src = rend.canvas; rend.frame(0);
    const W = src.width, H = src.height, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
    g.drawImage(src, 0, 0);
    const s = game.sim.s, k = H / 900;
    const name = game.metaName ? (game.company && game.company.props[game.company.active] ? game.company.props[game.company.active].name : 'Self Storage Tycoon') : 'Self Storage Tycoon';
    const hour = rend.todOverride != null ? rend.todOverride * 60 : s.t % 1440;
    const line2 = `Day ${dayOf(s.t)} · ${fmtTime(Math.floor(s.t / 1440) * 1440 + hour)}`;
    const pad = 26 * k; g.save();
    const grd = g.createLinearGradient(0, H - 150 * k, 0, H); grd.addColorStop(0, 'rgba(10,16,24,0)'); grd.addColorStop(1, 'rgba(10,16,24,0.55)'); g.fillStyle = grd; g.fillRect(0, H - 150 * k, W, 150 * k);
    // mark
    const mx = pad, my = H - pad - 44 * k, ms = 44 * k;
    g.strokeStyle = '#f5c542'; g.lineWidth = 4 * k; g.lineJoin = 'round'; g.beginPath(); g.moveTo(mx + ms * 0.12, my + ms * 0.42); g.lineTo(mx + ms * 0.5, my + ms * 0.16); g.lineTo(mx + ms * 0.88, my + ms * 0.42); g.stroke();
    g.fillStyle = '#f6f3ec'; g.fillRect(mx + ms * 0.19, my + ms * 0.44, ms * 0.62, ms * 0.44);
    g.fillStyle = '#16202b'; for (let i = 0; i < 3; i++) g.fillRect(mx + ms * 0.27, my + ms * (0.54 + i * 0.1), ms * 0.46, ms * 0.04);
    g.fillStyle = '#f6f3ec'; g.textBaseline = 'alphabetic';
    g.font = `900 ${24 * k}px Satoshi, 'General Sans', system-ui, sans-serif`; g.fillText(name, mx + ms + 14 * k, my + 20 * k);
    g.font = `500 ${15 * k}px Satoshi, 'General Sans', system-ui, sans-serif`; g.fillStyle = 'rgba(246,243,236,0.85)'; g.fillText(line2 + ' · Self Storage Tycoon', mx + ms + 14 * k, my + 42 * k);
    g.restore();
    // flash + shutter
    const fl = $('flash'); fl.classList.remove('on'); void fl.offsetWidth; fl.classList.add('on'); game.audio.play('shutter');
    const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
    if (!blob) return;
    const url = URL.createObjectURL(blob); if (sc.lastUrl) URL.revokeObjectURL(sc.lastUrl); sc.lastUrl = url; sc.lastBlob = blob;
    const fname = `storage-tycoon-day${dayOf(s.t)}.jpg`; sc.lastName = fname;
    const el = $('shot'); el.hidden = false;
    el.innerHTML = `<div class="sh-card"><img src="${url}" alt="Your photo"><div class="sh-row"><button class="btn pri" data-s="share">${IC.share}${navigator.share && matchMedia('(pointer: coarse)').matches ? 'Share' : 'Save photo'}</button><button class="btn" data-s="close">Keep shooting</button></div></div>`;
    window.__lastPhoto = { w: W, h: H, bytes: blob.size };
  }
  $('shot').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-s]'); if (!b) { if (e.target.id === 'shot') $('shot').hidden = true; return; }
    if (b.dataset.s === 'close') { $('shot').hidden = true; return; }
    const f = new File([sc.lastBlob], sc.lastName, { type: 'image/jpeg' });
    try { if (navigator.canShare && navigator.share && navigator.canShare({ files: [f] }) && matchMedia('(pointer: coarse)').matches) { await navigator.share({ files: [f], title: 'Self Storage Tycoon' }); return; } } catch (err) { if (err && err.name === 'AbortError') return; }
    const a = document.createElement('a'); a.href = sc.lastUrl; a.download = sc.lastName; document.body.appendChild(a); a.click(); a.remove(); ui.toast('Photo saved', 'good');
  });
  $('tourChip').addEventListener('click', () => stopTour());

  // ---------------------------------------------------------------- per-frame
  rend.onFrame = (dt) => {
    if (ui.title && sc.mode !== 'attract' && !sc.photo) startAttract();
    else if (!ui.title && sc.mode === 'attract') stopAttract();
    if (sc.mode === 'attract') {
      const hh = sc.todT, rate = hh > 16.5 && hh < 20.5 ? 0.07 : hh > 20.5 || hh < 5.5 ? 0.16 : 0.3; // linger on golden hour and dusk
      sc.todT = (sc.todT + dt * rate) % 24; rend.todOverride = sc.todT; rend.weatherOverride = 'fair';
      cinematic(dt);
    } else if (sc.mode === 'tour' || sc.mode === 'follow') cinematic(dt);
    if (sc.elevBack) { rend.camElev = lerp(rend.camElev || 0.72, 0.72, 1 - Math.exp(-dt * 4)); if (Math.abs(rend.camElev - 0.72) < 0.002) { rend.camElev = 0.72; sc.elevBack = false; } rend.updateCamera(); }
    if (sc.mode === 'follow') renderFollow(false);
    updatePops(dt); updateCrowd(dt);
  };
  // initial state
  { const o = game.sim.occupancy(); sc.seenFull.set(game.sim, o.n > 0 && o.occ >= o.n); }
  applyLens();
  return sc;
}
export { IC as SHOW_ICONS };
