// MG-01 Move-Out Turnaround, play screen. Adapted from the owner-approved standalone Revision 3 preview
// (EezzyE88/mg01-preview 042eb42, index.html sha256 4c415fe6...): same sweep-then-mop grid, coverage rules,
// tools, Pause, page-hidden auto-pause and synthesized audio. Integration changes only: scoped DOM/CSS, a Leave
// button instead of Reset, audio routed into the game's own sound-effects bus, and the result handed back to SST
// through callbacks. It never touches game state itself.
const CSS = `#mg01{position:fixed;inset:0;z-index:900;color-scheme:dark;--navy:#121c27;--panel:#1d2c39;--line:#40515d;--text:#f1f4f2;--muted:#b9c4c7;background:var(--navy);color:var(--text);font-family:system-ui,-apple-system,Arial,sans-serif;overflow:hidden;touch-action:none}
#mg01 *{box-sizing:border-box}#mg01 button{font:inherit;min-height:44px;border-radius:12px;border:1px solid #657380;background:#263744;color:#fff;padding:0 14px;touch-action:manipulation}#mg01 button:focus-visible{outline:3px solid #c7e5d7;outline-offset:2px}#mg01 button:disabled{opacity:.42}
#mg01 .mg-app{height:100%;display:flex;flex-direction:column;gap:7px;padding:calc(8px + env(safe-area-inset-top)) 10px calc(8px + env(safe-area-inset-bottom))}
#mg01 .mg-top{display:flex;align-items:center;gap:8px;justify-content:space-between}#mg01 .mg-heading{min-width:0}#mg01 .mg-heading strong{display:block;font-size:16px;line-height:1.18;letter-spacing:.02em}#mg01 .mg-heading span{display:block;font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#mg01 .mg-top button{padding:0 10px;font-size:12px;flex:0 0 auto}
#mg01 .mg-meters{display:grid;grid-template-columns:1fr 1fr;gap:8px}#mg01 .mg-meter{min-width:0;border:1px solid var(--line);border-radius:10px;background:var(--panel);padding:7px 9px}#mg01 .mg-meter span{display:flex;align-items:center;justify-content:space-between;font-size:12px;font-weight:700}#mg01 .mg-meter b{font-variant-numeric:tabular-nums}#mg01 .mg-track{height:5px;border-radius:9px;background:#40515d;overflow:hidden;margin-top:5px}#mg01 .mg-fill{height:100%;width:0;background:#b6cdb3;transition:width .09s linear}#mg01 .mg-meter.inactive{opacity:.58}
#mg01 .mg-hint{font-size:12px;color:var(--muted);text-align:center;min-height:16px;line-height:1.25}
#mg01 .mg-scene{position:relative;flex:1;min-height:0;border:1px solid #485966;border-radius:13px;overflow:hidden;background:#26323b}#mg01 canvas{width:100%;height:100%;display:block;touch-action:none;user-select:none;-webkit-user-select:none}
#mg01 .mg-cue{position:absolute;top:11px;left:50%;transform:translateX(-50%);background:#142029eb;color:#e9f6e8;border:1px solid #95af9f;padding:8px 13px;border-radius:12px;font-weight:750;font-size:14px;pointer-events:none;opacity:0;transition:opacity .15s;white-space:nowrap}#mg01 .mg-cue.show{opacity:1}
#mg01 .mg-footer{display:flex;gap:8px;align-items:center}#mg01 .mg-tool{flex:1;background:#293b46;color:#f1f4f2;font-weight:720}#mg01 .mg-tool.selected{background:#bdd2ba;color:#132226;border-color:#d3dfcb}#mg01 .mg-tool:disabled{color:#9fb0b8}#mg01 .mg-pause{flex:0 0 62px;padding:0 5px;font-size:12px}#mg01 .mg-leave{flex:0 0 58px;padding:0 5px;font-size:12px}#mg01 .mg-leave.done{flex:1 1 100%;background:#c9d7bd;color:#142229;font-weight:750;font-size:15px}
#mg01 .mg-result{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#112029e8;border:1px solid #9dc2a1;padding:18px 20px;border-radius:16px;text-align:center;min-width:230px;max-width:calc(100% - 24px);pointer-events:none;display:none}#mg01 .mg-result strong{display:block;font-size:25px;letter-spacing:.045em}#mg01 .mg-result span{display:block;font-size:12px;color:#dde7de;margin-top:4px}#mg01 .mg-result.visible{display:block}
#mg01 .mg-veil{position:absolute;inset:0;background:#101820d9;display:none;align-items:center;justify-content:center;flex-direction:column;gap:8px}#mg01 .mg-veil.visible{display:flex}#mg01 .mg-veil strong{font-size:22px}#mg01 .mg-veil small{color:#c7d2d4;text-align:center;padding:0 16px}#mg01 .mg-veil button{background:#c9d7bd;color:#142229;font-weight:750;min-width:150px}
#mg01 .mg-note{font-size:10px;color:#aab6b9;text-align:center;min-height:12px}
@media(max-height:700px){#mg01 .mg-app{gap:5px;padding-top:calc(5px + env(safe-area-inset-top));padding-bottom:calc(5px + env(safe-area-inset-bottom))}#mg01 .mg-meter{padding:5px 8px}#mg01 .mg-track{margin-top:3px}#mg01 .mg-heading strong{font-size:14px}#mg01 .mg-heading span{font-size:10px}#mg01 .mg-hint{font-size:11px}#mg01 .mg-top button{min-height:42px}}`;
const esc = (v) => String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// opts: { unitName, hours, audio: { ctx, dest } | null, soundOn, onFinish() -> {ok,msg}, onLeave(), onClose() }
export function playMoveOut(opts) {
  if (!document.getElementById('mg01-style')) { const st = document.createElement('style'); st.id = 'mg01-style'; st.textContent = CSS; document.head.appendChild(st); }
  const host = document.createElement('div'); host.id = 'mg01'; host.setAttribute('role', 'dialog'); host.setAttribute('aria-modal', 'true'); host.setAttribute('aria-label', 'Move-Out Turnaround');
  host.innerHTML = `<main class="mg-app">
<header class="mg-top"><div class="mg-heading"><strong>MOVE-OUT TURNAROUND</strong><span>${esc(opts.unitName)} · Owner make-ready · ${esc(opts.hours)}h · game paused</span></div><button data-k="sound" type="button" aria-pressed="true">Sound On</button></header>
<div class="mg-meters"><div class="mg-meter" data-k="sweepBox"><span>SWEEP <b data-k="sweepPct">0%</b></span><div class="mg-track"><div class="mg-fill" data-k="sweepFill"></div></div></div><div class="mg-meter inactive" data-k="mopBox"><span>MOP <b data-k="mopPct">Locked</b></span><div class="mg-track"><div class="mg-fill" data-k="mopFill"></div></div></div></div>
<div class="mg-hint" data-k="hint" aria-live="polite">Drag the broom across the dusty floor.</div>
<section class="mg-scene"><canvas data-k="scene" aria-label="Empty storage unit floor. Drag on the floor to clean." role="application"></canvas><div class="mg-cue" data-k="cue" role="status" aria-live="polite"></div><div class="mg-result" data-k="result"><strong>UNIT CLEAN</strong><span data-k="resultText">SWEEP 100% · MOP 100%</span></div><div class="mg-veil" data-k="veil"><strong>PAUSED</strong><small>Cleaning and audio stopped</small><button data-k="resume" type="button">Resume cleaning</button></div></section>
<footer class="mg-footer"><button type="button" class="mg-tool selected" data-k="sweepTool" aria-pressed="true">Broom</button><button type="button" class="mg-tool" data-k="mopTool" disabled aria-pressed="false">Mop · Locked</button><button type="button" class="mg-pause" data-k="pause">Pause</button><button type="button" class="mg-leave" data-k="leave">Leave</button></footer>
<div class="mg-note" data-k="note">One finger · Full floor, including walls and doorway · Leave returns the job unchanged</div>
</main>`;
  document.body.appendChild(host);
  const $ = (k) => host.querySelector(`[data-k="${k}"]`), canvas = $('scene'), ctx = canvas.getContext('2d', { alpha: false });
  const NX = 44, NY = 68, N = NX * NY, coverS = new Uint8Array(N), coverM = new Uint8Array(N);
  let sweepCount = 0, mopCount = 0, tool = 'sweep', complete = false, paused = false, dragging = false, pointerId = null, last = null, pointer = null, moveAt = 0, cueUntil = 0, paintQueued = false, closed = false, finished = null;
  let cw = 375, ch = 500, room = { x: 35, y: 76, w: 305, h: 380 };
  let audioAllowed = opts.soundOn !== false, audioGain = null, audioFilter = null, audioNode = null, masterGain = null, audioState = 'off';
  const AC = opts.audio && opts.audio.ctx, DEST = opts.audio && opts.audio.dest;
  const timers = new Set(); const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); if (!closed) fn(); }, ms); timers.add(id); return id; };
  const now = () => performance.now(); const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  function hash(x, y, seed = 0) { let z = Math.imul(x + 1699, 374761393) ^ Math.imul(y + seed + 101, 668265263); z = Math.imul(z ^ (z >>> 13), 1274126177); return ((z ^ (z >>> 16)) >>> 0) / 4294967295; }
  function layout() { if (closed) return; const dpr = Math.min(devicePixelRatio || 1, 2), r = canvas.getBoundingClientRect(); cw = Math.max(1, r.width); ch = Math.max(1, r.height); canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); const frame = Math.max(12, Math.min(30, cw * .056)); room = { x: frame + 6, y: Math.max(49, ch * .125), w: cw - 2 * (frame + 6), h: ch - Math.max(49, ch * .125) - Math.max(22, ch * .055) }; render(); }
  function progress() { const ps = sweepCount / N, pm = mopCount / N; $('sweepPct').textContent = Math.floor(ps * 100) + '%'; $('mopPct').textContent = tool === 'sweep' && ps < 1 ? 'Locked' : Math.floor(pm * 100) + '%'; $('sweepFill').style.width = (ps * 100) + '%'; $('mopFill').style.width = (pm * 100) + '%'; $('mopBox').classList.toggle('inactive', tool === 'sweep'); $('sweepBox').classList.toggle('inactive', tool === 'mop'); }
  function updateButtons() {
    $('sweepTool').classList.toggle('selected', tool === 'sweep'); $('mopTool').classList.toggle('selected', tool === 'mop'); $('sweepTool').setAttribute('aria-pressed', String(tool === 'sweep')); $('mopTool').setAttribute('aria-pressed', String(tool === 'mop'));
    $('mopTool').disabled = sweepCount < N || paused || complete; $('sweepTool').disabled = paused || complete; $('mopTool').textContent = sweepCount < N ? 'Mop · Locked' : 'Mop'; $('pause').textContent = paused ? 'Paused' : 'Pause'; $('pause').disabled = complete;
    $('veil').classList.toggle('visible', paused && !complete); $('result').classList.toggle('visible', complete);
    for (const k of ['sweepTool', 'mopTool', 'pause']) $(k).hidden = complete;
    $('leave').textContent = complete ? 'Back to the property' : 'Leave'; $('leave').classList.toggle('done', complete);
    $('hint').textContent = complete ? (finished && finished.ok ? 'The unit is clean and rent-ready.' : 'The unit is clean.') : paused ? 'Cleaning paused.' : tool === 'sweep' ? (sweepCount === N ? 'Sweep complete. Select Mop when ready.' : 'Drag the broom across the dusty floor.') : 'Mop the grime to reveal clean concrete.';
  }
  const recentWet = [];
  function draw() {
    ctx.fillStyle = '#27343d'; ctx.fillRect(0, 0, cw, ch); const r = room;
    ctx.fillStyle = '#45525a'; ctx.fillRect(r.x - 13, r.y - 31, r.w + 26, 31); ctx.fillStyle = '#56646b'; ctx.fillRect(r.x - 11, r.y - 29, r.w + 22, 8); ctx.fillStyle = '#39464f'; ctx.fillRect(r.x - 17, r.y - 31, 16, r.h + 45); ctx.fillRect(r.x + r.w + 1, r.y - 31, 16, r.h + 45);
    ctx.fillStyle = '#adb1a9'; ctx.fillRect(r.x, r.y, r.w, r.h); const gx = r.w / NX, gy = r.h / NY;
    for (let y = 0; y < NY; y++) for (let x = 0; x < NX; x++) {
      const id = y * NX + x, px = r.x + x * gx, py = r.y + y * gy, h = hash(x, y), s = coverS[id], m = coverM[id], dirty = !s ? 1 : 0, grimy = !m ? 1 : 0; const concrete = 164 + Math.floor((h - .5) * 13); ctx.fillStyle = `rgb(${concrete},${concrete + 1},${concrete - 3})`; ctx.fillRect(px, py, gx + .34, gy + .34);
      if (grimy) { const a = m ? 0 : (s ? .21 : .30); ctx.fillStyle = `rgba(88,73,57,${a * (.72 + hash(x, y, 20) * .55)})`; ctx.fillRect(px, py, gx + .34, gy + .34); }
      if (dirty) { ctx.fillStyle = `rgba(92,86,69,${.18 + hash(x, y, 11) * .18})`; ctx.fillRect(px, py, gx + .34, gy + .34); }
      if ((hash(x, y, 42) > .76) && (!s || !m)) { ctx.fillStyle = (!s ? '#796e58' : '#77766a'); ctx.globalAlpha = !s ? .4 : .18; ctx.fillRect(px + gx * hash(x, y, 9) * .72, py + gy * .3, Math.max(.7, gx * .33), Math.max(.65, gy * .23)); ctx.globalAlpha = 1; }
    }
    ctx.strokeStyle = '#9d9f97'; ctx.lineWidth = .9; ctx.beginPath(); ctx.moveTo(r.x + r.w * .51, r.y); ctx.lineTo(r.x + r.w * .51, r.y + r.h); for (let j = 1; j < 5; j++) { ctx.moveTo(r.x, r.y + j * r.h / 5); ctx.lineTo(r.x + r.w, r.y + j * r.h / 5); } ctx.stroke(); ctx.strokeStyle = '#68747b'; ctx.lineWidth = 5; ctx.strokeRect(r.x - 2, r.y - 2, r.w + 4, r.h + 4);
    ctx.fillStyle = '#606a6a'; ctx.fillRect(r.x - 11, r.y + r.h + 1, r.w + 22, 9); ctx.fillStyle = '#b9b6aa'; ctx.fillRect(r.x, r.y + r.h - 5, r.w, 5);
    ctx.fillStyle = '#e1e6e4'; ctx.font = 'bold 11px system-ui,sans-serif'; ctx.textAlign = 'center'; ctx.fillText('REAR WALL', cw / 2, Math.max(19, r.y - 12)); ctx.fillStyle = '#c5cbcb'; ctx.font = '10px system-ui,sans-serif'; ctx.fillText('DOORWAY', cw / 2, Math.min(ch - 6, r.y + r.h + 22));
    const t = now(); for (const a of recentWet) { if (t - a.time > 720) continue; const life = 1 - (t - a.time) / 720; ctx.fillStyle = `rgba(225,239,234,${.23 * life})`; ctx.fillRect(r.x + a.x * gx, r.y + a.y * gy, gx + .4, gy + .4); }
    if (pointer && !paused && !complete) { const p = pointer; ctx.save(); ctx.translate(clamp(p.x, r.x, r.x + r.w), clamp(p.y, r.y, r.y + r.h)); ctx.rotate(clamp(p.angle || 0, -.7, .7)); if (tool === 'sweep') { ctx.fillStyle = '#9f7d57'; ctx.fillRect(-17, -5, 34, 12); ctx.strokeStyle = '#e0c79f'; ctx.lineWidth = 1.7; for (let k = -15; k <= 16; k += 4) { ctx.beginPath(); ctx.moveTo(k, 7); ctx.lineTo(k + 1, 13); ctx.stroke(); } } else { ctx.fillStyle = '#aec2c1'; ctx.fillRect(-20, -7, 40, 14); ctx.fillStyle = '#dee7df'; for (let k = -17; k < 20; k += 6) ctx.fillRect(k, 7, 4, 5); } ctx.strokeStyle = '#7f8c84'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -35); ctx.stroke(); ctx.restore(); }
  }
  function render() { if (paintQueued || closed) return; paintQueued = true; requestAnimationFrame(() => { paintQueued = false; if (closed) return; draw(); if (recentWet.length) { const t = now(); while (recentWet.length && t - recentWet[0].time > 750) recentWet.shift(); if (recentWet.length) render(); } }); }
  function cue(text) { $('cue').textContent = text; $('cue').classList.add('show'); cueUntil = now() + 1300; later(() => { if (now() >= cueUntil - 5) $('cue').classList.remove('show'); }, 1350); }
  function local(e) { const b = canvas.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  function floor(p) { const r = room; return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h; }
  function sweepCell(cx, cy, rad) { let newCells = 0, dirtyCells = 0; const arr = tool === 'sweep' ? coverS : coverM; const xmin = Math.max(0, Math.floor((cx - rad) * NX)), xmax = Math.min(NX - 1, Math.ceil((cx + rad) * NX)), ymin = Math.max(0, Math.floor((cy - rad) * NY)), ymax = Math.min(NY - 1, Math.ceil((cy + rad) * NY)); for (let y = ymin; y <= ymax; y++) for (let x = xmin; x <= xmax; x++) { const dx = (x + .5) / NX - cx, dy = (y + .5) / NY - cy; if (dx * dx + dy * dy > rad * rad) continue; const id = y * NX + x; if (!arr[id]) { arr[id] = 1; newCells++; if (tool === 'mop') { recentWet.push({ x, y, time: now() }); if (recentWet.length > 850) recentWet.shift(); } } else dirtyCells++; } if (tool === 'sweep') sweepCount += newCells; else mopCount += newCells; return { newCells, dirtyCells }; }
  function cleanSegment(a, b) { const r = room; const s = { x: clamp((a.x - r.x) / r.w, 0, 1), y: clamp((a.y - r.y) / r.h, 0, 1) }, e = { x: clamp((b.x - r.x) / r.w, 0, 1), y: clamp((b.y - r.y) / r.h, 0, 1) }; const dist = Math.hypot((b.x - a.x) / r.w, (b.y - a.y) / r.h); const steps = Math.max(1, Math.ceil(dist * NY * 2.5)); let added = 0, over = 0; const radius = tool === 'sweep' ? .033 : .041; for (let k = 0; k <= steps; k++) { const t = k / steps; const v = sweepCell(s.x + (e.x - s.x) * t, s.y + (e.y - s.y) * t, radius); added += v.newCells; over += v.dirtyCells; } progress(); return added / (added + over + 1); }
  function finishIfReady() {
    if (tool === 'sweep' && sweepCount === N) { stopStroke(); cue('SWEEP COMPLETE · 100%'); updateButtons(); audioDing('pass'); }
    if (tool === 'mop' && mopCount === N && !complete) {
      stopStroke(); complete = true;
      // Hand the result to SST at the moment the floor is truly clean: exactly once, even if the screen is never closed.
      try { finished = opts.onFinish() || { ok: false }; } catch (e) { console.warn(e); finished = { ok: false, msg: 'The result could not be applied.' }; }
      $('resultText').textContent = finished.ok ? 'Rent-ready now · SWEEP 100% · MOP 100%' : (finished.msg || 'SWEEP 100% · MOP 100%');
      cue('UNIT CLEAN'); updateButtons(); audioDing('job');
    }
  }
  function onDown(e) { if (paused || complete || dragging) return; const p = local(e); if (!floor(p)) return; e.preventDefault(); try { canvas.setPointerCapture?.(e.pointerId); } catch (_) { /* synthetic pointers are not active native pointers */ } dragging = true; pointerId = e.pointerId; last = p; pointer = { ...p, angle: 0 }; moveAt = now(); unlockAudio(); stopSound(); render(); }
  function onMove(e) { if (!dragging || e.pointerId !== pointerId || paused || complete) return; e.preventDefault(); const p = local(e), r = room, prev = last; const bx = clamp(p.x, r.x, r.x + r.w), by = clamp(p.y, r.y, r.y + r.h), ax = clamp(prev.x, r.x, r.x + r.w), ay = clamp(prev.y, r.y, r.y + r.h); const distance = Math.hypot(bx - ax, by - ay), dt = Math.max(10, now() - moveAt); pointer = { x: bx, y: by, angle: Math.atan2(by - ay, bx - ax) * .15 }; last = p; moveAt = now(); if (distance < 1.2) { stopSound(); return; } const fraction = cleanSegment({ x: ax, y: ay }, { x: bx, y: by }); const speed = clamp(distance / dt / 1.0, 0, 1); soundStroke(speed, fraction); render(); finishIfReady(); }
  function stopStroke() { dragging = false; pointerId = null; last = null; pointer = null; stopSound(); render(); }
  function onEnd(e) { if (!dragging || e.pointerId !== pointerId) return; const p = local(e); if (last && Math.hypot(p.x - last.x, p.y - last.y) > 1.2) { cleanSegment(last, p); finishIfReady(); } stopStroke(); }
  function startMop() { if (paused || complete || sweepCount < N) return; stopStroke(); tool = 'mop'; if (audioFilter) audioFilter.frequency.value = 420; updateButtons(); progress(); render(); cue('MOP READY'); }
  function startSweep() { if (paused || complete || tool === 'sweep') return; stopStroke(); tool = 'sweep'; updateButtons(); progress(); render(); }
  function pause() { if (complete) return; stopStroke(); paused = !paused; updateButtons(); render(); }
  function silent() { audioAllowed = !audioAllowed; $('sound').textContent = audioAllowed ? 'Sound On' : 'Sound Off'; $('sound').setAttribute('aria-pressed', String(audioAllowed)); if (!audioAllowed) stopSound(); else unlockAudio(); }
  // Locally synthesized bristle/fabric noise on the game's own audio context; no assets or network requests.
  function unlockAudio() {
    if (!audioAllowed || !AC || !DEST) return;
    if (!audioNode) {
      try {
        masterGain = AC.createGain(); masterGain.gain.value = .55; masterGain.connect(DEST);
        const buf = AC.createBuffer(1, Math.floor(AC.sampleRate * 2.7), AC.sampleRate), out = buf.getChannelData(0); let prev = 0;
        for (let i = 0; i < out.length; i++) { const white = (Math.random() * 2 - 1); prev = .88 * prev + .12 * white; out[i] = white * .65 + prev * .35; }
        audioGain = AC.createGain(); audioGain.gain.value = 0; audioFilter = AC.createBiquadFilter(); audioFilter.type = 'bandpass'; audioFilter.frequency.value = tool === 'sweep' ? 1800 : 420; audioFilter.Q.value = .7;
        audioGain.connect(audioFilter); audioFilter.connect(masterGain); audioNode = AC.createBufferSource(); audioNode.buffer = buf; audioNode.loop = true; audioNode.connect(audioGain); audioNode.start();
      } catch (e) { audioNode = null; return; }
    }
    if (AC.state === 'suspended') AC.resume().catch(() => {});
  }
  function stopSound() { audioState = 'off'; if (AC && audioGain) { const t = AC.currentTime; audioGain.gain.cancelScheduledValues(t); audioGain.gain.setTargetAtTime(0, t, .025); } }
  let strokeTimer = null;
  function soundStroke(speed, fraction) { if (!audioAllowed || !AC || AC.state !== 'running' || !audioGain) return; const t = AC.currentTime; audioState = tool; audioGain.gain.cancelScheduledValues(t); audioFilter.frequency.setTargetAtTime(tool === 'sweep' ? 950 + 1800 * speed + 600 * fraction : 220 + 560 * speed + 160 * fraction, t, .035); audioFilter.Q.setTargetAtTime(tool === 'sweep' ? .48 : .9, t, .05); const base = tool === 'sweep' ? .14 : .12, amount = base + speed * (tool === 'sweep' ? .16 : .13); audioGain.gain.setTargetAtTime(amount * (.72 + .28 * fraction), t, .028); if (strokeTimer) { clearTimeout(strokeTimer); timers.delete(strokeTimer); } strokeTimer = later(() => { if (now() - moveAt > 95) stopSound(); }, 110); }
  function audioDing(kind) { if (!audioAllowed || !AC || AC.state !== 'running' || !masterGain) return; const t = AC.currentTime; for (let k = 0; k < (kind === 'job' ? 2 : 1); k++) { const osc = AC.createOscillator(), g = AC.createGain(); osc.type = 'sine'; osc.frequency.value = kind === 'job' ? ([523, 659][k]) : 480; g.gain.setValueAtTime(0, t + k * .10); g.gain.linearRampToValueAtTime(.065, t + k * .10 + .015); g.gain.exponentialRampToValueAtTime(.0001, t + k * .1 + .29); osc.connect(g); g.connect(masterGain); osc.start(t + k * .10); osc.stop(t + k * .10 + .31); } }
  const onHidden = () => { if (document.hidden) { stopStroke(); if (!paused && !complete) { paused = true; updateButtons(); } } };
  const onBlur = () => { if (dragging) stopStroke(); };
  const onLost = () => { if (dragging) stopStroke(); };
  function close() {
    if (closed) return; closed = true; stopSound();
    for (const id of timers) clearTimeout(id); timers.clear();
    document.removeEventListener('visibilitychange', onHidden); window.removeEventListener('blur', onBlur); window.removeEventListener('resize', layout); ro.disconnect();
    try { if (audioNode) audioNode.stop(); } catch (_) { /* already stopped */ }
    // Let the gain ramp settle before disconnecting from the game's bus.
    const nodes = [audioNode, audioGain, audioFilter, masterGain]; setTimeout(() => { for (const n of nodes) try { n && n.disconnect(); } catch (_) { /* already disconnected */ } }, 120);
    host.remove(); opts.onClose && opts.onClose(finished);
  }
  function leave() { if (closed) return; if (!complete) { try { opts.onLeave(); } catch (e) { console.warn(e); } } close(); }
  canvas.addEventListener('pointerdown', onDown); canvas.addEventListener('pointermove', onMove); canvas.addEventListener('pointerup', onEnd); canvas.addEventListener('pointercancel', onEnd); canvas.addEventListener('lostpointercapture', onLost);
  document.addEventListener('visibilitychange', onHidden); window.addEventListener('blur', onBlur);
  $('mopTool').addEventListener('click', startMop); $('sweepTool').addEventListener('click', startSweep); $('pause').addEventListener('click', pause); const resume = () => { if (!paused || complete || closed) return; paused = false; updateButtons(); render(); };
  // Resume is idempotent, so it also answers the lift itself: a tap whose synthesized click is dropped still resumes.
  $('resume').addEventListener('click', resume); $('resume').addEventListener('pointerup', resume); $('leave').addEventListener('click', leave); $('sound').addEventListener('click', silent);
  if (!audioAllowed) { $('sound').textContent = 'Sound Off'; $('sound').setAttribute('aria-pressed', 'false'); }
  window.addEventListener('resize', layout); const ro = new ResizeObserver(layout); ro.observe(canvas);
  layout(); progress(); updateButtons();
  // Read-only snapshot for tests and diagnostics. No writes.
  const inspect = () => Object.freeze({ N, sweepCount, mopCount, sweepPercent: Math.floor(sweepCount / N * 100), mopPercent: Math.floor(mopCount / N * 100), tool, complete, paused, dragging, closed, finished, audioAllowed, audioState, room: { ...room }, viewport: { width: cw, height: ch } });
  return { close, leave, inspect, host };
}
