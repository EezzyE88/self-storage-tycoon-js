// Procedural WebAudio: property sounds + calm generative music. Unlocked by the first user gesture.
export class Audio {
  constructor() { this.ctx = null; this.vol = { master: 0.75, sfx: 0.6, music: 0.4, amb: 0.35 }; this.last = {}; this.musicOn = true; this.background = false; this.sources = new Set(); this.reverbs = []; }
  unlock() {
    if (this.background || document.hidden) return;
    if (this.ctx) { if (this.ctx.state !== 'running') this.ctx.resume().then(() => { if (!this.background && !document.hidden) { this.nextNote = this.ctx.currentTime + 0.1; this.applyVol(); } else this.ctx.suspend().catch(() => {}); }).catch(() => {}); else this.applyVol(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    // Smooth the entire mix, with headroom for several events in one simulation frame.
    this.master = c.createGain(); this.master.gain.value = 0;
    const soft = c.createBiquadFilter(); soft.type = 'lowpass'; soft.frequency.value = 3400; soft.Q.value = 0.45;
    const comp = c.createDynamicsCompressor();
    comp.threshold.value = -18; comp.knee.value = 18; comp.ratio.value = 3;
    comp.attack.value = 0.018; comp.release.value = 0.28;
    this.master.connect(soft); soft.connect(comp); comp.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.gain.value = 0; this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.gain.value = 0; this.mus.connect(this.master);
    this.amb = c.createGain(); this.amb.gain.value = 0; this.amb.connect(this.master);
    // Wet returns pass through their own volume bus: Effects=0 and Music off silence their tails too.
    const len = Math.ceil(c.sampleRate * 1.3), buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 4); }
    const wet = bus => {
      const send = c.createGain(), rv = c.createConvolver(), filter = c.createBiquadFilter();
      send.gain.value = 0.16; rv.buffer = buf; this.reverbs.push({ rv, buf }); filter.type = 'lowpass'; filter.frequency.value = 2200; filter.Q.value = 0.4;
      send.connect(rv); rv.connect(filter); filter.connect(bus); return send;
    };
    this.revSfx = wet(this.sfx); this.revMusic = wet(this.mus);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.applyVol(); this.startAmbience(); this.nextNote = c.currentTime + 1;
  }
  applyVol() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.ramp(this.master.gain, this.background ? 0 : this.vol.master, t, 0.035);
    this.ramp(this.sfx.gain, this.vol.sfx, t, 0.035);
    this.ramp(this.mus.gain, this.musicOn ? this.vol.music * 0.5 : 0, t, 0.08);
    this.ramp(this.amb.gain, this.vol.amb * 0.4, t, 0.08);
  }
  setBackground(hidden) {
    this.background = hidden;
    const c = this.ctx; if (!c || !hidden) return;
    // Cancel both playing and delayed cues before Safari freezes audio time.
    this.master.gain.cancelScheduledValues(c.currentTime);
    this.master.gain.setValueAtTime(0, c.currentTime); this.master.gain._tgt = 0;
    for (const source of this.sources) { try { source.stop(c.currentTime); } catch (_) {} }
    this.sources.clear();
    for (const {rv,buf} of this.reverbs) { rv.buffer = null; rv.buffer = buf; }
    this.nextNote = c.currentTime + 0.1; this.lift = 0;
    c.suspend().catch(() => {});
  }
  setVol(k, v) { if (!(k in this.vol) || !Number.isFinite(v)) return; this.vol[k] = Math.max(0, Math.min(1, v)); this.applyVol(); }
  envelope(gain, dur, attack) {
    // A rounded onset and an exact silent endpoint avoid clicks at source start/stop.
    const curve = new Float32Array(96), a = Math.min(Math.max(attack, 0.015), dur * 0.45);
    for (let i = 0; i < curve.length; i++) {
      const t = i / (curve.length - 1) * dur;
      curve[i] = gain * Math.pow(Math.sin(Math.min(1, t / a) * Math.PI / 2), 2) * Math.pow(1 - t / dur, 2);
    }
    curve[0] = curve[curve.length - 1] = 0; return curve;
  }
  tone(freq, dur, { type = 'sine', gain = 0.08, attack = 0.025, dest = this.sfx, slide = 0, delay = 0, rev = 0 } = {}) {
    const c = this.ctx; if (!c || this.background || document.hidden || c.state !== 'running' || !(dur > 0)) return; const t = c.currentTime + Math.max(0, delay);
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueCurveAtTime(this.envelope(gain, dur, attack), t, dur);
    o.connect(g); g.connect(dest);
    let send;
    if (rev) { send = c.createGain(); send.gain.value = rev; g.connect(send); send.connect(dest === this.sfx ? this.revSfx : this.revMusic); }
    this.sources.add(o);
    o.onended = () => { this.sources.delete(o); o.disconnect(); g.disconnect(); send?.disconnect(); };
    o.start(t); o.stop(t + dur + 0.015);
  }
  noise(dur, { gain = 0.035, freq = 700, q = 0.5, type = 'bandpass', delay = 0, dest = this.sfx, sweep = 0 } = {}) {
    const c = this.ctx; if (!c || this.background || document.hidden || c.state !== 'running' || !(dur > 0)) return; const t = c.currentTime + Math.max(0, delay);
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (sweep) f.frequency.linearRampToValueAtTime(Math.max(20, freq + sweep), t + dur);
    const g = c.createGain(); g.gain.setValueCurveAtTime(this.envelope(gain, dur, 0.04), t, dur);
    src.connect(f); f.connect(g); g.connect(dest);
    this.sources.add(src);
    src.onended = () => { this.sources.delete(src); src.disconnect(); f.disconnect(); g.disconnect(); };
    src.start(t); src.stop(t + dur + 0.015);
  }
  throttle(k, ms) { const n = performance.now(); if (this.last[k] != null && n - this.last[k] < ms) return false; this.last[k] = n; return true; }
  play(k) {
    if (!this.ctx || this.background || document.hidden || this.ctx.state !== 'running') return;
    // Real-time limits, independent of 1x/2x/4x. Routine property activity remains a background layer.
    const cooldown = {click:90, tab:140, confirm:400, refuse:650, place:100, complete:1200, rent:1800,
      lease:1100, gate:1800, keypad:1600, rollup:1500, cart:1600, chime:1400, fault:2800,
      repair:900, work:1800, attention:2200, milestone:2200, flourish:2200, shutter:600};
    if (!(k in cooldown) || !this.throttle(k, cooldown[k])) return;
    if (['gate','keypad','rollup','cart','chime','work'].includes(k) && !this.throttle('property', 350)) return;
    if (['rent','lease','complete','repair','milestone','flourish'].includes(k) && !this.throttle('success', 300)) return;
    switch (k) {
      case 'click': this.tone(420, 0.10, { gain: 0.045 }); break;
      case 'tab': this.tone(392, 0.14, { gain: 0.04 }); this.tone(523, 0.16, { gain: 0.025, delay: 0.065 }); break;
      case 'confirm': [392,494,587].forEach((f,i)=>this.tone(f,0.24,{gain:0.045,delay:i*0.075,rev:0.18})); break;
      case 'refuse': this.tone(294, 0.23, { gain: 0.045 }); this.tone(262, 0.28, { gain: 0.032, delay: 0.14 }); break;
      case 'place': this.noise(0.14, { gain: 0.022, freq: 480, q: 0.45 }); this.tone(220, 0.18, { gain: 0.04 }); break;
      case 'complete': [330,392,494].forEach((f,i)=>this.tone(f,0.38,{gain:0.04,delay:i*0.10,rev:0.22})); break;
      case 'rent': this.tone(659, 0.23, { gain: 0.03 }); this.tone(784, 0.30, { gain: 0.025, delay: 0.11, rev: 0.2 }); break;
      case 'lease': [392,494,659].forEach((f,i)=>this.tone(f,0.36,{gain:0.045,delay:i*0.11,rev:0.22})); break;
      case 'gate': this.noise(0.85, { gain: 0.025, freq: 220, q: 0.5, sweep: 80 }); this.tone(85, 0.8, { gain: 0.016, attack: 0.1 }); break;
      case 'keypad': [587,659].forEach((f,i)=>this.tone(f,0.13,{gain:0.017,delay:i*0.14})); break;
      case 'rollup': this.noise(0.65, { gain: 0.025, freq: 650, q: 0.45, sweep: -250 }); this.noise(0.3,{gain:0.009,freq:1100,q:0.5,delay:0.18}); break;
      case 'cart': this.noise(0.45, { gain: 0.018, freq: 380, q: 0.5 }); break;
      case 'chime': this.tone(659, 0.55, { gain: 0.025, rev: 0.2 }); this.tone(523, 0.65, { gain: 0.02, delay: 0.25, rev: 0.2 }); break;
      case 'fault': this.tone(440, 0.26, { gain: 0.045 }); this.tone(349, 0.32, { gain: 0.04, delay: 0.18 }); break;
      case 'repair': [330,415,494].forEach((f,i)=>this.tone(f,0.28,{gain:0.035,delay:i*0.09})); break;
      case 'work': this.noise(0.14, { gain: 0.018, freq: 650, q: 0.45 }); this.noise(0.14, { gain: 0.014, freq: 520, q: 0.45, delay: 0.20 }); break;
      case 'attention': this.tone(523, 0.25, { gain: 0.045 }); this.tone(659, 0.32, { gain: 0.035, delay: 0.16, rev: 0.18 }); break;
      case 'milestone': [392,494,587,784].forEach((f,i)=>this.tone(f,0.5,{gain:0.045,delay:i*0.13,rev:0.25})); break;
      case 'flourish': [392,494,587,784].forEach((f,i)=>this.tone(f,0.8,{gain:0.025,delay:0.2+i*0.11,rev:0.25})); this.lift=1; break;
      case 'shutter': this.noise(0.1, { gain: 0.03, freq: 1000, q: 0.45 }); this.tone(330, 0.13, { gain: 0.018, delay: 0.06 }); break;
    }
  }
  thunder(delay = 0) {
    if (!this.ctx) return;
    const d = Math.max(0, delay);
    this.noise(2.8, { gain: 0.055, freq: 105, q: 0.7, type: 'lowpass', delay: d, dest: this.amb });
    this.tone(43, 2.6, { type: 'sine', gain: 0.055, attack: 0.08, delay: d, dest: this.amb, slide: -8 });
    this.tone(58, 1.7, { type: 'triangle', gain: 0.026, attack: 0.03, delay: d + 0.18, dest: this.amb, slide: -14 });
    this.noise(1.2, { gain: 0.018, freq: 520, q: 0.5, type: 'bandpass', delay: d + 0.12, dest: this.amb });
  }
  startAmbience() {
    const c = this.ctx; const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    this.ambG = c.createGain(); this.ambG.gain.value = 0.18; src.connect(f); f.connect(this.ambG); this.ambG.connect(this.amb); src.start();
    const hum = c.createOscillator(); hum.type = 'sine'; hum.frequency.value = 58; const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 160;
    this.humG = c.createGain(); this.humG.gain.value = 0; hum.connect(hf); hf.connect(this.humG); this.humG.connect(this.amb); hum.start();
    const rs = c.createBufferSource(); rs.buffer = this.noiseBuf; rs.loop = true; const rf = c.createBiquadFilter(); rf.type = 'bandpass'; rf.frequency.value = 1100; rf.Q.value = 0.4;
    this.rainG = c.createGain(); this.rainG.gain.value = 0; rs.connect(rf); rf.connect(this.rainG); this.rainG.connect(this.amb); rs.start();
  }
  // called each frame with coarse world state
  update({ night = 0, rain = false, hvac = 0, speed = 1, mode = 'day' }) {
    const c = this.ctx; if (!c || this.background || document.hidden || c.state !== 'running') return; const t = c.currentTime;
    // automation events pile up if re-issued every frame: only touch a param when its target moves
    this.ramp(this.ambG.gain, 0.08 + (1 - night) * 0.06, t, 0.5);
    this.ramp(this.humG.gain, Math.min(0.05, hvac * 0.02), t, 0.5);
    this.ramp(this.rainG.gain, rain ? 0.025 : 0, t, 0.45);
    if (!this.musicOn || this.vol.music <= 0) return;
    this.music(t, night, mode);
  }
  ramp(param, v, t, tc) { if (param._tgt != null && Math.abs(param._tgt - v) < 0.004) return; param._tgt = v; if (param.cancelAndHoldAtTime) param.cancelAndHoldAtTime(t); else param.cancelScheduledValues(t); param.setTargetAtTime(v, t, tc); }
  // ---------------------------------------------------------------- adaptive score (GDD 50.16-50.18)
  // Warm, optimistic, loop-friendly: soft pads, electric-piano chords, round bass, marimba phrases and brushed
  // shaker at 84 BPM. Layers fade in and out with the game state instead of switching tracks.
  music(t, night, mode) {
    const c = this.ctx;
    if (!this.lay) {
      this.lay = {}; this.layT = {};
      for (const k of ['pad', 'keys', 'bass', 'mel', 'perc']) { const g = c.createGain(); g.gain.value = 0; g.connect(this.mus); this.lay[k] = g; }
      this.padF = c.createBiquadFilter(); this.padF.type = 'lowpass'; this.padF.frequency.value = 1400; this.padF.connect(this.lay.pad);
      this.bassF = c.createBiquadFilter(); this.bassF.type = 'lowpass'; this.bassF.frequency.value = 420; this.bassF.connect(this.lay.bass);
      this.step = 0; this.nextNote = Math.max(this.nextNote || 0, t + 0.1);
    }
    const MIX = {
      title: { pad: 1, keys: 1, bass: 1, mel: 1, perc: 0.9 }, day: { pad: 0.9, keys: 0.9, bass: 0.85, mel: 0.7, perc: 0.55 },
      build: { pad: 1, keys: 0.8, bass: 0.9, mel: 0.35, perc: 0.7 }, night: { pad: 1, keys: 0.6, bass: 0.55, mel: 0.35, perc: 0 },
      photo: { pad: 1, keys: 0.7, bass: 0.4, mel: 0.9, perc: 0 }, quiet: { pad: 0.8, keys: 0.35, bass: 0.2, mel: 0.15, perc: 0 },
    }[mode] || { pad: 1, keys: 0.8, bass: 0.8, mel: 0.6, perc: 0.5 };
    this.lift = Math.max(0, (this.lift || 0) - 0.004); // milestone: arrangement briefly fills out
    for (const k in MIX) { const v = Math.min(1, MIX[k] + (this.lift > 0 ? 0.25 : 0)); this.layT[k] = v; this.ramp(this.lay[k].gain, v, t, 1.8); }
    this.ramp(this.padF.frequency, night > 0.5 ? 850 : 1500, t, 2);
    const E = 60 / 84 / 2; // eighth note
    // D major: Dmaj9 Bm9 Gmaj7 A7sus4 | Em9 Gmaj9 F#m7 A7sus4 (semitones from D)
    const PROG = [[0, 4, 7, 11, 14], [-3, 0, 4, 7, 11], [-7, -3, 0, 4, 7], [-5, 0, 2, 5, 7], [2, 5, 9, 12, 14], [-7, -3, 2, 4, 9], [4, 7, 11, 14, 16], [-5, 0, 2, 5, 7]];
    const root = 146.83, hz = (n, o = 0) => root * Math.pow(2, n / 12 + o);
    const rnd = (n) => { let x = Math.imul(n ^ 0x9e3779b9, 0x85ebca6b); x ^= x >>> 13; x = Math.imul(x, 0xc2b2ae35); x ^= x >>> 16; return (x >>> 0) / 4294967296; };
    // After music was muted or updates stopped, resume here rather than replaying missed bars.
    if (this.nextNote < t - 0.15) this.nextNote = t + 0.05;
    while (this.nextNote < t + 0.6) {
      const st = this.step++, e8 = st % 8, bar = Math.floor(st / 8), ch = PROG[bar % 8];
      const swing = e8 % 2 ? E * 0.14 : 0, d = Math.max(0, this.nextNote + swing - t);
      const L = this.layT;
      if (e8 === 0 && L.pad > 0.02) { // pad: whole bar, slow swell
        for (const n of ch.slice(0, 4)) { this.tone(hz(n), E * 8.6, { type: 'sine', gain: 0.022, attack: 1.1, dest: this.padF, delay: d, rev: 0.5 }); this.tone(hz(n) * 1.004, E * 8.6, { type: 'triangle', gain: 0.008, attack: 1.3, dest: this.padF, delay: d }); }
      }
      if (L.keys > 0.02 && (e8 === 0 || e8 === 3 || (e8 === 6 && rnd(bar) < 0.5))) { // electric piano stabs
        const soft = e8 === 0 ? 1 : 0.7;
        for (const n of ch.slice(1)) { this.tone(hz(n, 1), 1.3, { type: 'sine', gain: 0.018 * soft, attack: 0.008, dest: this.lay.keys, delay: d, rev: 0.35 }); this.tone(hz(n, 2), 0.3, { type: 'sine', gain: 0.0018 * soft, attack: 0.025, dest: this.lay.keys, delay: d }); }
      }
      if (L.bass > 0.02 && (e8 === 0 || e8 === 3 || e8 === 5)) { // round bass
        const n = e8 === 5 ? ch[0] + 7 : ch[0]; const f = hz(n, n > 6 ? -2 : -1);
        this.tone(f, e8 === 0 ? E * 2.6 : E * 1.4, { type: 'triangle', gain: e8 === 0 ? 0.11 : 0.075, attack: 0.012, dest: this.bassF, delay: d });
      }
      if (L.mel > 0.02) { // marimba phrases from chord tones, denser on the title and in daytime
        const dens = mode === 'title' ? 0.42 : mode === 'night' ? 0.12 : mode === 'photo' ? 0.3 : 0.24;
        if (rnd(st * 7 + 3) < dens && !(e8 === 7 && rnd(st) < 0.6)) {
          const pool = [ch[1], ch[2], ch[3], ch[4], ch[1] + 12]; const n = pool[Math.floor(rnd(st * 13 + bar) * pool.length)];
          const f = hz(n, 1); this.tone(f, 0.55, { type: 'sine', gain: 0.034, attack: 0.003, dest: this.lay.mel, delay: d, rev: 0.45 }); this.tone(f * 2, 0.18, { type: 'sine', gain: 0.002, attack: 0.025, dest: this.lay.mel, delay: d });
        }
      }
      if (L.perc > 0.02) { // brushed shaker, soft kick, rim
        this.noise(0.05, { gain: e8 % 2 ? 0.006 : 0.01, freq: 1800, q: 0.4, type: 'bandpass', delay: d, dest: this.lay.perc });
        if (e8 === 0 || (e8 === 4 && mode === 'title')) this.tone(95, 0.2, { type: 'sine', gain: 0.07, attack: 0.004, slide: -50, dest: this.lay.perc, delay: d });
        if (e8 === 2 || e8 === 6) this.noise(0.03, { gain: 0.008, freq: 900, q: 0.4, delay: d, dest: this.lay.perc });
      }
      this.nextNote += E;
    }
  }
}
