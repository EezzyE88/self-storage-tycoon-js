// Self Storage Tycoon Visual Lab — isolated presentation-only candidate.
// Designed against source 53fb2b38c4f15fd651d3cf478a815e1408b8e4d9.
// No simulation writes, event consumption, storage, audio, timers or global listeners.
const PALETTE = Object.freeze({
  unitWall: ['#f1eee7', 0.88],
  unitWall2: ['#d9d5cd', 0.88],
  roof: ['#366b70', 0.72],
  roofTrim: ['#28565d', 0.75],
  door: ['#da763e', 0.50],
  doorInt: ['#367f81', 0.52],
  office: ['#e5e3dc', 0.84],
  officeTrim: ['#286c70', 0.72],
  shellWall: ['#e3ded5', 0.86],
  shellRoof: ['#37686e', 0.74],
  cart: ['#3b829d', 0.53],
  boxc: ['#b69166', 0.87],
  metal: ['#8c9ca2', 0.47],
});

export class MapleVisualLab {
  constructor(renderer) {
    if (!renderer || !renderer.mat || !renderer.sim?.s) throw new TypeError('Expected an SST Renderer with simulation');
    this.renderer = renderer;
    this.enabled = false;
    this.original = new Map();
  }

  setEnabled(enabled) {
    const next = !!enabled;
    if (this.enabled === next) return this.enabled;
    if (next) {
      for (const [key, [hex, roughness]] of Object.entries(PALETTE)) {
        const material = this.renderer.mat[key];
        if (!material?.color?.clone || typeof material.color.set !== 'function') continue;
        this.original.set(key, { material, color: material.color.clone(), roughness: material.roughness });
        material.color.set(hex);
        material.roughness = roughness;
        material.needsUpdate = true;
      }
    } else {
      for (const { material, color, roughness } of this.original.values()) {
        material.color.copy(color);
        material.roughness = roughness;
        material.needsUpdate = true;
      }
      this.original.clear();
    }
    this.enabled = next;
    return this.enabled;
  }

  // Read-only interpretation of the exact current customer state, not a synthetic visit.
  currentVisit() {
    const s = this.renderer.sim.s;
    const a = (s.agents || []).find(a => a.kind === 'cust' && a.unit && s.objects?.[a.unit]?.access === 'interior');
    if (!a) return null;
    const veh = (s.vehicles || []).find(v => v.id === a.veh);
    return Object.freeze({agentId:a.id, unitId:a.unit, phase:a.st, hidden:!!a.hidden,
      vehicleId:veh?.id ?? null, parkingCell:veh?.parked ?? null, speed:s.speed});
  }

  dispose() { this.setEnabled(false); }
}

// Explicit opt-in lab. Everything lives in memory; no simulator actions or save settings.
export function installVisualLab(game) {
  const lab = new MapleVisualLab(game.rend);
  const panel = document.createElement('details');
  panel.id = 'visual-lab';
  panel.innerHTML = '<summary>Visual Lab · Original</summary><p>Maple Street · visual only · session only</p><button type="button" aria-pressed="false">Try experimental palette</button><p data-visit></p><button type="button" data-close>Close Lab</button>';
  document.body.append(panel);
  const summary = panel.querySelector('summary'), toggle = panel.querySelector('button'), visit = panel.querySelector('[data-visit]');
  function update() {
    const s = game.sim.s;
    const eligible = s.market?.id === 'maple' && !game.ui.title;
    const expandedLesson = ((s.tut?.on && !s.tut.done) || s.lesson) && !game.ui.tutMin;
    panel.hidden = !eligible || game.ui.modalOpen() || !!game.ui.tab || !!game.ui.tool || !!expandedLesson;
    if (!eligible) lab.setEnabled(false);
    const label = `Visual Lab · ${lab.enabled ? 'Experimental' : 'Original'}`;
    if (summary.textContent !== label) {
      summary.textContent = label;
      toggle.textContent = lab.enabled ? 'Restore original palette' : 'Try experimental palette';
      toggle.setAttribute('aria-pressed', String(lab.enabled));
    }
    const a = lab.currentVisit();
    const status = a ? `Live customer ${a.agentId} · ${a.phase}${a.hidden ? ' · inside unit' : ''}${a.speed === 0 ? ' · paused' : ''}` : 'Waiting for an interior customer visit';
    if (visit.textContent !== status) visit.textContent = status;
  }
  const onToggle = () => { lab.setEnabled(!lab.enabled); update(); };
  // Native button/summary activation must not also invoke the game's Space/Enter shortcuts.
  const onKey = e => { if (e.key === ' ' || e.key === 'Enter') e.stopPropagation(); };
  panel.addEventListener('keydown', onKey);
  const close = panel.querySelector('[data-close]');
  const dispose = () => { lab.dispose(); toggle.removeEventListener('click', onToggle); panel.removeEventListener('keydown', onKey); close.removeEventListener('click', dispose); panel.remove(); game.visualLab = null; };
  toggle.addEventListener('click', onToggle);
  close.addEventListener('click', dispose);
  update();
  return { lab, update, reset() { lab.setEnabled(false); panel.open = false; }, dispose };
}
