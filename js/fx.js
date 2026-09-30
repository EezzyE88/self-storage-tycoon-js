// World presentation effects: headlight pools at night, wet paving and rain ripples, celebration sparkles.
// Presentation only. Reads renderer + sim state, never mutates the simulation.
import * as THREE from 'three';
import { G, FLOOR_H } from './data.js';

function glowTex(inner, outer = 'rgba(255,240,200,0)') {
  const c = document.createElement('canvas'); c.width = c.height = 128; const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 2, 64, 64, 62); gr.addColorStop(0, inner); gr.addColorStop(1, outer);
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function rippleTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  g.strokeStyle = 'rgba(220,235,250,0.9)'; g.lineWidth = 3; g.beginPath(); g.arc(32, 32, 26, 0, 7); g.stroke();
  const t = new THREE.CanvasTexture(c); return t;
}
function sparkTex() {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 30); gr.addColorStop(0, 'rgba(255,255,240,1)'); gr.addColorStop(0.25, 'rgba(255,220,120,0.9)'); gr.addColorStop(1, 'rgba(255,200,80,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  g.fillStyle = 'rgba(255,250,230,0.9)'; g.fillRect(31, 4, 2, 56); g.fillRect(4, 31, 56, 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export class WorldFX {
  constructor(rend) {
    this.rend = rend; this.g = new THREE.Group(); rend.scene.add(this.g);
    this.tx = { head: glowTex('rgba(255,244,214,0.95)'), ripple: rippleTex(), spark: sparkTex() };
    this.headMat = new THREE.MeshBasicMaterial({ map: this.tx.head, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    this.headGeo = new THREE.PlaneGeometry(1, 1);
    rend.geo.fxPlane = this.headGeo; rend.mat.fxHead = this.headMat; rend._shared = null; // shared: pool disposal must not free them
    // rain ripples
    const N = 48; this.rip = [];
    this.ripMat = new THREE.MeshBasicMaterial({ map: this.tx.ripple, transparent: true, depthWrite: false, opacity: 0.5 });
    for (let i = 0; i < N; i++) { const m = new THREE.Mesh(this.headGeo, this.ripMat.clone()); m.rotation.x = -Math.PI / 2; m.visible = false; m.renderOrder = 3; m.userData.t = Math.random(); this.g.add(m); this.rip.push(m); }
    this.bursts = [];
    this.wet = 0; this.night = 0;
  }
  sky(dt, night, rain) {
    this.night = night; this.wet += ((rain ? 1 : 0) - this.wet) * Math.min(1, dt * 0.35);
    const gm = this.rend.ground && this.rend.ground.material;
    if (gm) { gm.roughness = 0.95 - this.wet * 0.42; gm.metalness = this.wet * 0.12; const k = 1 - this.wet * 0.16; gm.color.setRGB(k, k, k * 1.01); }
  }
  pavedCell() {
    const s = this.rend.sim.s;
    for (let tries = 0; tries < 8; tries++) {
      const x = Math.floor(Math.random() * s.W), y = Math.floor(Math.random() * s.H), gc = s.ground[y * s.W + x];
      if (gc === G.ASPHALT || gc === G.STREET || gc === G.LOADING || gc === G.PARKING || gc === G.CONCRETE || gc === G.SIDEWALK) {
        if (this.rend.sim.D && this.rend.sim.D.shellAt && this.rend.sim.D.shellAt[y * s.W + x]) continue;
        return [x + Math.random(), y + Math.random()];
      }
    }
    return null;
  }
  update(dt) {
    const R = this.rend;
    // headlights: a soft pool of light ahead of every vehicle after dark
    const hl = Math.max(0, (this.night - 0.35) / 0.65);
    this.headMat.opacity = hl * 0.55;
    for (const m of R.pool.veh.values()) {
      let h = m.userData.head;
      if (!h) { h = new THREE.Mesh(this.headGeo, this.headMat); h.rotation.x = -Math.PI / 2; h.scale.set(2.2, 1.3, 1); h.position.set(1.7, 0.04, 0); h.renderOrder = 4; h.castShadow = false; m.add(h); m.userData.head = h; }
      h.visible = hl > 0.02;
    }
    // ripples
    const wet = this.wet;
    for (const m of this.rip) {
      if (wet < 0.05) { m.visible = false; continue; }
      m.userData.t += dt * 1.4;
      if (m.userData.t >= 1) { m.userData.t = 0; const p = Math.random() < wet ? this.pavedCell() : null; m.userData.on = !!p; if (p) m.position.set(p[0], 0.035, p[1]); }
      const t = m.userData.t, sc = 0.1 + t * 0.55; m.scale.set(sc, sc, 1);
      m.material.opacity = (1 - t) * 0.55 * wet; m.visible = m.userData.on && m.material.opacity > 0.01;
    }
    // bursts
    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const B = this.bursts[i]; B.t += dt;
      const a = B.pts.geometry.attributes.position, v = B.vel;
      for (let k = 0; k < a.count; k++) {
        v[k * 3 + 1] -= dt * 3.2; v[k * 3] *= 1 - dt * 0.8; v[k * 3 + 2] *= 1 - dt * 0.8;
        a.setXYZ(k, a.getX(k) + v[k * 3] * dt, Math.max(B.y0 + 0.05, a.getY(k) + v[k * 3 + 1] * dt), a.getZ(k) + v[k * 3 + 2] * dt);
      }
      a.needsUpdate = true;
      const life = B.t / B.dur; B.pts.material.opacity = Math.max(0, 1 - life * life); B.pts.material.size = 0.34 * (1 - life * 0.5) + Math.sin(B.t * 20) * 0.03;
      if (B.ring) { const s = 1 + B.t * 7; B.ring.scale.set(s, s, 1); B.ring.material.opacity = Math.max(0, 0.7 - B.t * 0.6); }
      if (B.t >= B.dur) { this.g.remove(B.pts); B.pts.geometry.dispose(); B.pts.material.dispose(); if (B.ring) { this.g.remove(B.ring); B.ring.material.dispose(); } this.bursts.splice(i, 1); }
    }
  }
  // gentle celebratory sparkle (GDD 50.18: "gentle milestone flourish")
  burst(x, z, f = 0, n = 70) {
    if (this.bursts.length > 5) return;
    const y0 = f * FLOOR_H + 0.6;
    const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3);
    for (let k = 0; k < n; k++) {
      pos[k * 3] = x; pos[k * 3 + 1] = y0 + 0.6; pos[k * 3 + 2] = z;
      const a = Math.random() * Math.PI * 2, sp = 1.2 + Math.random() * 2.6;
      vel[k * 3] = Math.cos(a) * sp; vel[k * 3 + 1] = 3.2 + Math.random() * 3.4; vel[k * 3 + 2] = Math.sin(a) * sp;
    }
    const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const pm = new THREE.PointsMaterial({ map: this.tx.spark, size: 0.34, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, color: 0xffe3a0 });
    const pts = new THREE.Points(gg, pm); pts.renderOrder = 30; pts.frustumCulled = false; this.g.add(pts);
    const ring = new THREE.Mesh(this.headGeo, new THREE.MeshBasicMaterial({ map: this.rend.tx.ring, transparent: true, depthWrite: false, color: 0xffd36a, opacity: 0.7 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, f * FLOOR_H + 0.06, z); ring.renderOrder = 29; this.g.add(ring);
    this.bursts.push({ pts, vel, t: 0, dur: 2.4, y0: f * FLOOR_H, ring });
  }
}
