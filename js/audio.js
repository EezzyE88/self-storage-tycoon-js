// Procedural WebAudio: property sounds + calm generative music. Unlocked by the first user gesture.
export class Audio {
  constructor() { this.ctx = null; this.vol = { master: 0.8, sfx: 0.8, music: 0.45, amb: 0.5 }; this.last = {}; this.musicOn = true; }
  unlock() {
    if (this.ctx) { if (this.ctx.state !== 'running' && !document.hidden) this.ctx.resume().catch(() => {}); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const c = (this.ctx = new AC());
    this.master = c.createGain(); this.master.connect(c.destination);
    this.sfx = c.createGain(); this.sfx.connect(this.master);
    this.mus = c.createGain(); this.mus.connect(this.master);
    this.amb = c.createGain(); this.amb.connect(this.master);
    const rv = c.createConvolver(); const len = c.sampleRate * 2.2, buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = buf.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
    rv.buffer = buf; this.rev = c.createGain(); this.rev.gain.value = 0.35; this.rev.connect(rv); rv.connect(this.master);
    this.noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = this.noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.applyVol(); this.startAmbience(); this.nextNote = c.currentTime + 1;
  }
  applyVol() { if (!this.ctx) return; this.master.gain.value = this.vol.master; this.sfx.gain.value = this.vol.sfx; this.mus.gain.value = this.musicOn ? this.vol.music * 0.5 : 0; this.amb.gain.value = this.vol.amb * 0.4; }
  setVol(k, v) { this.vol[k] = v; this.applyVol(); }
  tone(freq, dur, { type = 'sine', gain = 0.2, attack = 0.005, dest = this.sfx, slide = 0, delay = 0, rev = 0 } = {}) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest); if (rev) { const r = c.createGain(); r.gain.value = rev; g.connect(r); r.connect(this.rev); }
    o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, { gain = 0.15, freq = 1200, q = 0.8, type = 'bandpass', delay = 0, dest = this.sfx, sweep = 0 } = {}) {
    const c = this.ctx; if (!c) return; const t = c.currentTime + delay;
    const src = c.createBufferSource(); src.buffer = this.noiseBuf; src.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q; if (sweep) f.frequency.linearRampToValueAtTime(freq + sweep, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + 0.02); g.gain.linearRampToValueAtTime(0, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t); src.stop(t + dur + 0.05);
  }
  throttle(k, ms) { const n = performance.now(); if (this.last[k] && n - this.last[k] < ms) return false; this.last[k] = n; return true; }
  play(k) {
    if (!this.ctx) return;
    switch (k) {
      case 'click': this.tone(880, 0.06, { type: 'triangle', gain: 0.08 }); break;
      case 'tab': this.tone(660, 0.07, { type: 'triangle', gain: 0.07 }); this.tone(990, 0.06, { type: 'triangle', gain: 0.05, delay: 0.04 }); break;
      case 'confirm': [523, 659, 784].forEach((f, i) => this.tone(f, 0.18, { type: 'triangle', gain: 0.09, delay: i * 0.06, rev: 0.3 })); break;
      case 'refuse': this.tone(220, 0.16, { type: 'square', gain: 0.05 }); this.tone(180, 0.2, { type: 'square', gain: 0.05, delay: 0.09 }); break;
      case 'place': this.noise(0.08, { gain: 0.1, freq: 900 }); this.tone(330, 0.1, { type: 'sine', gain: 0.1 }); break;
      case 'complete': if (this.throttle(k, 400)) { [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.35, { gain: 0.08, delay: i * 0.08, rev: 0.5 })); } break;
      case 'rent': if (this.throttle(k, 250)) { this.tone(1320, 0.12, { type: 'triangle', gain: 0.05 }); this.tone(1760, 0.18, { type: 'triangle', gain: 0.04, delay: 0.05, rev: 0.4 }); } break;
      case 'lease': [659, 880, 1047].forEach((f, i) => this.tone(f, 0.3, { gain: 0.08, delay: i * 0.09, rev: 0.5 })); break;
      case 'gate': if (this.throttle(k, 900)) { this.noise(1.1, { gain: 0.05, freq: 300, q: 2, sweep: 120 }); this.tone(70, 1.0, { type: 'sawtooth', gain: 0.02 }); } break;
      case 'keypad': if (this.throttle(k, 700)) [1200, 1200, 1500].forEach((f, i) => this.tone(f, 0.05, { type: 'square', gain: 0.025, delay: i * 0.11 })); break;
      case 'rollup': if (this.throttle(k, 500)) { this.noise(0.7, { gain: 0.06, freq: 1800, q: 3, sweep: -900 }); for (let i = 0; i < 7; i++) this.noise(0.03, { gain: 0.05, freq: 2500, delay: i * 0.09 }); } break;
      case 'cart': if (this.throttle(k, 600)) { this.noise(0.5, { gain: 0.04, freq: 500, q: 4 }); this.tone(1900, 0.05, { type: 'square', gain: 0.012, delay: 0.1 }); } break;
      case 'chime': if (this.throttle(k, 700)) { this.tone(988, 0.6, { gain: 0.06, rev: 0.5 }); this.tone(784, 0.8, { gain: 0.05, delay: 0.22, rev: 0.5 }); } break;
      case 'fault': if (this.throttle(k, 1500)) { this.tone(1040, 0.08, { type: 'square', gain: 0.04 }); this.tone(1040, 0.08, { type: 'square', gain: 0.04, delay: 0.16 }); this.noise(0.12, { gain: 0.06, freq: 4000, delay: 0.05 }); } break;
      case 'repair': [440, 554, 659].forEach((f, i) => this.tone(f, 0.25, { type: 'triangle', gain: 0.07, delay: i * 0.07 })); break;
      case 'work': if (this.throttle(k, 1200)) { this.noise(0.05, { gain: 0.05, freq: 2200 }); this.noise(0.05, { gain: 0.05, freq: 2600, delay: 0.14 }); } break;
      case 'attention': if (this.throttle(k, 2000)) { this.tone(740, 0.14, { gain: 0.06 }); this.tone(988, 0.2, { gain: 0.05, delay: 0.12, rev: 0.3 }); } break;
      case 'milestone': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.5, { type: 'triangle', gain: 0.07, delay: i * 0.1, rev: 0.6 })); break;
      case 'flourish': if (this.throttle(k, 1500)) { [1175, 1480, 1760, 2349, 2960].forEach((f, i) => { this.tone(f, 1.4, { gain: 0.03, delay: 0.35 + i * 0.07, rev: 0.9 }); this.tone(f * 2.01, 0.5, { gain: 0.008, delay: 0.35 + i * 0.07 }); }); this.lift = 1; } break;
      case 'shutter': this.noise(0.035, { gain: 0.14, freq: 3200, q: 0.7, type: 'highpass' }); this.tone(1800, 0.03, { type: 'square', gain: 0.03 }); this.noise(0.05, { gain: 0.1, freq: 1400, q: 1.2, delay: 0.085 }); this.tone(900, 0.04, { type: 'square', gain: 0.02, delay: 0.09 }); break;
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
    const hum = c.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 58; const hf = c.createBiquadFilter(); hf.type = 'lowpass'; hf.frequency.value = 160;
    this.humG = c.createGain(); this.humG.gain.value = 0; hum.connect(hf); hf.connect(this.humG); this.humG.connect(this.amb); hum.start();
    const rs = c.createBufferSource(); rs.buffer = this.noiseBuf; rs.loop = true; const rf = c.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 2500;
    this.rainG = c.createGain(); this.rainG.gain.value = 0; rs.connect(rf); rf.connect(this.rainG); this.rainG.connect(this.amb); rs.start();
  }
  // called each frame with coarse world state
  update({ night = 0, rain = false, hvac = 0, speed = 1, mode = 'day' }) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    // automation events pile up if re-issued every frame: only touch a param when its target moves
    this.ramp(this.ambG.gain, 0.12 + (1 - night) * 0.1, t, 0.5);
    this.ramp(this.humG.gain, Math.min(0.08, hvac * 0.03), t, 0.5);
    this.ramp(this.rainG.gain, rain ? 0.045 : 0, t, 0.45);
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
    while (this.nextNote < t + 0.6) {
      const st = this.step++, e8 = st % 8, bar = Math.floor(st / 8), ch = PROG[bar % 8];
      const swing = e8 % 2 ? E * 0.14 : 0, d = Math.max(0, this.nextNote + swing - t);
      const L = this.layT;
      if (e8 === 0 && L.pad > 0.02) { // pad: whole bar, slow swell
        for (const n of ch.slice(0, 4)) { this.tone(hz(n), E * 8.6, { type: 'sine', gain: 0.022, attack: 1.1, dest: this.padF, delay: d, rev: 0.5 }); this.tone(hz(n) * 1.004, E * 8.6, { type: 'triangle', gain: 0.008, attack: 1.3, dest: this.padF, delay: d }); }
      }
      if (L.keys > 0.02 && (e8 === 0 || e8 === 3 || (e8 === 6 && rnd(bar) < 0.5))) { // electric piano stabs
        const soft = e8 === 0 ? 1 : 0.7;
        for (const n of ch.slice(1)) { this.tone(hz(n, 1), 1.3, { type: 'sine', gain: 0.018 * soft, attack: 0.008, dest: this.lay.keys, delay: d, rev: 0.35 }); this.tone(hz(n, 3), 0.25, { type: 'sine', gain: 0.003 * soft, attack: 0.003, dest: this.lay.keys, delay: d }); }
      }
      if (L.bass > 0.02 && (e8 === 0 || e8 === 3 || e8 === 5)) { // round bass
        const n = e8 === 5 ? ch[0] + 7 : ch[0]; const f = hz(n, n > 6 ? -2 : -1);
        this.tone(f, e8 === 0 ? E * 2.6 : E * 1.4, { type: 'triangle', gain: e8 === 0 ? 0.11 : 0.075, attack: 0.012, dest: this.bassF, delay: d });
      }
      if (L.mel > 0.02) { // marimba phrases from chord tones, denser on the title and in daytime
        const dens = mode === 'title' ? 0.42 : mode === 'night' ? 0.12 : mode === 'photo' ? 0.3 : 0.24;
        if (rnd(st * 7 + 3) < dens && !(e8 === 7 && rnd(st) < 0.6)) {
          const pool = [ch[1], ch[2], ch[3], ch[4], ch[1] + 12]; const n = pool[Math.floor(rnd(st * 13 + bar) * pool.length)];
          const f = hz(n, 1); this.tone(f, 0.55, { type: 'sine', gain: 0.034, attack: 0.003, dest: this.lay.mel, delay: d, rev: 0.45 }); this.tone(f * 3.98, 0.09, { type: 'sine', gain: 0.007, attack: 0.002, dest: this.lay.mel, delay: d });
        }
      }
      if (L.perc > 0.02) { // brushed shaker, soft kick, rim
        this.noise(0.05, { gain: e8 % 2 ? 0.014 : 0.022, freq: 7000, q: 0.6, type: 'highpass', delay: d, dest: this.lay.perc });
        if (e8 === 0 || (e8 === 4 && mode === 'title')) this.tone(95, 0.2, { type: 'sine', gain: 0.07, attack: 0.004, slide: -50, dest: this.lay.perc, delay: d });
        if (e8 === 2 || e8 === 6) this.noise(0.03, { gain: 0.018, freq: 1900, q: 5, delay: d, dest: this.lay.perc });
      }
      this.nextNote += E;
    }
  }
}
