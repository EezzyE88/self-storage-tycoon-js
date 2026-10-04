// Optional callback diagnostics. CPU submission is not GPU time; never touches simulation state.
const MODES = ['active', 'battery', 'idle'];
export class PerformanceStats {
  constructor(capacity = 300) { this.capacity = capacity; this.enabled = false; this.reset(); }
  reset() { this.groups = Object.fromEntries(MODES.map(k => [k, []])); this.total = 0; this.updatedAt = 0; this.last = {}; this.lastDraw = {}; }
  record(sample) {
    if (!this.enabled) return;
    const mode = sample.mode || (sample.throttled ? 'idle' : 'active');
    const a = this.groups[mode]; if (!a) return;
    a.push({ ...sample, at: sample.at ?? this.total * 16 });
    if (a.length > this.capacity) a.shift();
    this.total++; this.last = sample; if (sample.drawn !== false) this.lastDraw = sample;
  }
  group(a) {
    const draws = a.filter(s => s.drawn !== false), intervals = draws.map(s => s.frameMs).filter(Number.isFinite).sort((x,y) => x-y);
    const pct = (values,p) => values.length ? values[Math.ceil(p*values.length)-1] : 0;
    const raf = a.map(s => s.rafMs).filter(Number.isFinite).sort((x,y) => x-y);
    const mean = (rows,key) => rows.length ? rows.reduce((n,s) => n + (s[key] || 0),0)/rows.length : 0;
    return { samples:a.length, draws:draws.length, skipped:a.length-draws.length, windowMs:a.length>1?a.at(-1).at-a[0].at:0,
      frameMs:{p50:pct(intervals,.5),p95:pct(intervals,.95),p99:pct(intervals,.99)},
      rafMs:{p50:pct(raf,.5),p95:pct(raf,.95),p99:pct(raf,.99)},
      cpuMs:{simulation:mean(a,'simMs'),render:mean(draws,'renderMs'),ui:mean(draws,'uiMs')},
      simulationTotalMs:a.reduce((n,s)=>n+(s.simMs||0),0) };
  }
  snapshot() {
    const modes=Object.fromEntries(MODES.map(k=>[k,this.group(this.groups[k])]));
    const mode=this.last.mode || (this.last.throttled?'idle':'active');
    return { ...modes[mode], modes, mode, total:this.total, ...this.lastDraw.info, quality:this.lastDraw.quality, dpr:this.lastDraw.dpr, throttled:mode!=='active' };
  }
  text() {
    const s=this.snapshot(), ms=n=>n.toFixed(1);
    return MODES.map(k=>{const x=s.modes[k];return `${k}: ${x.samples} RAF / ${x.draws} draws / ${x.skipped} skipped · ${(x.windowMs/1000).toFixed(1)}s window\nDraw p50/95/99 ${ms(x.frameMs.p50)}/${ms(x.frameMs.p95)}/${ms(x.frameMs.p99)} ms · RAF ${ms(x.rafMs.p50)}/${ms(x.rafMs.p95)}/${ms(x.rafMs.p99)} ms\nCPU sim/RAF ${ms(x.cpuMs.simulation)} ms (${ms(x.simulationTotalMs)} total); render/UI per draw ${ms(x.cpuMs.render)}/${ms(x.cpuMs.ui)} ms`;}).join('\n\n')+`\n\n${s.calls||0} calls · ${s.triangles||0} triangles · ${s.geometries||0} geom · ${s.textures||0} tex · DPR ${s.dpr||1}${s.throttled?' · drawing throttled':''}`;
  }
}
