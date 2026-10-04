// Optional presentation diagnostics. CPU timings, not GPU timings. Never touches simulation state.
export class PerformanceStats {
  constructor(capacity = 300) { this.capacity = capacity; this.enabled = false; this.reset(); }
  reset() { this.samples = []; this.cursor = 0; this.total = 0; this.updatedAt = 0; }
  record(sample) {
    if (!this.enabled) return;
    this.samples[this.cursor] = sample;
    this.cursor = (this.cursor + 1) % this.capacity; this.total++;
  }
  snapshot() {
    const a = this.samples, intervals = a.map(s => s.frameMs).sort((x,y) => x-y);
    const percentile = p => intervals.length ? intervals[Math.ceil(p * intervals.length) - 1] : 0;
    const mean = key => a.length ? a.reduce((n,s) => n + s[key],0) / a.length : 0;
    const last = a.length ? a[(this.cursor + a.length - 1) % a.length] : {};
    return { samples: a.length, total: this.total, frameMs: { p50: percentile(.5), p95: percentile(.95), p99: percentile(.99) }, cpuMs: { simulation: mean('simMs'), render: mean('renderMs'), ui: mean('uiMs') }, ...last.info, quality: last.quality, dpr: last.dpr, throttled: !!last.throttled };
  }
  text() {
    const s = this.snapshot(), ms = n => n.toFixed(1);
    return `Frame p50/95/99 ${ms(s.frameMs.p50)}/${ms(s.frameMs.p95)}/${ms(s.frameMs.p99)} ms${s.throttled ? ' · drawing throttled' : ''}\nCPU sim/render/UI ${ms(s.cpuMs.simulation)}/${ms(s.cpuMs.render)}/${ms(s.cpuMs.ui)} ms\n${s.calls || 0} calls · ${s.triangles || 0} triangles · ${s.geometries || 0} geom · ${s.textures || 0} tex · DPR ${s.dpr || 1}`;
  }
}
