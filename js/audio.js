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
    }
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
  update({ night = 0, rain = false, hvac = 0, speed = 1 }) {
    const c = this.ctx; if (!c) return; const t = c.currentTime;
    this.ambG.gain.setTargetAtTime(0.12 + (1 - night) * 0.1, t, 0.5);
    this.humG.gain.setTargetAtTime(Math.min(0.08, hvac * 0.03), t, 0.5);
    this.rainG.gain.setTargetAtTime(rain ? 0.12 : 0, t, 1);
    if (!this.musicOn || this.vol.music <= 0) return;
    // generative calm music: pentatonic, slow chord pads + sparse plucks
    const scale = [0, 2, 4, 7, 9, 12, 14, 16];
    const chords = [[0, 4, 7], [-3, 0, 4], [5, 9, 12], [2, 5, 9]];
    while (this.nextNote < t + 0.5) {
      const beat = this.beat = (this.beat || 0) + 1;
      const root = 220 * (night > 0.5 ? 0.84 : 1);
      if (beat % 8 === 1) { const ch = chords[Math.floor(beat / 8) % 4]; ch.forEach((n) => this.tone(root * Math.pow(2, n / 12), 4.2, { type: 'sine', gain: 0.035, attack: 0.9, dest: this.mus, delay: this.nextNote - t, rev: 0.6 })); }
      if (Math.random() < 0.42) { const n = scale[Math.floor(Math.random() * scale.length)]; this.tone(root * 2 * Math.pow(2, n / 12), 0.9, { type: 'triangle', gain: 0.03, dest: this.mus, delay: this.nextNote - t, rev: 0.7 }); }
      this.nextNote += 0.55;
    }
  }
}
