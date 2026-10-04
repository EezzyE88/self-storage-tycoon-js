// Three.js presentation layer. Reads sim.s / sim.D; never mutates simulation state.
import * as THREE from 'three';
import { G, FLOOR_H, TOOLS } from './data.js';

const CELL = 32; // px per cell on ground textures
const WALL_H = 1.25; // drive-up unit height
const COL = {
  grass: '#7fa35a', grass2: '#739852', asphalt: '#4a4d52', concrete: '#c9c4b8', street: '#3b3e43', sidewalk: '#d8d3c7',
  loading: '#4f5257', parking: '#4c4f54', stripe: '#f1efe6', yellow: '#e8b923', hall: '#e4e0d6', shellFloor: '#bdb8ad',
  unitWall: '#e7dfcf', unitWall2: '#d9cfbb', roof: '#6d747c', roofTrim: '#565c63', door: '#d9772b', doorInt: '#2f5e8e',
  shellWall: '#d4ccbb', shellRoof: '#7b8288', office: '#f0ebe0', officeTrim: '#1f3a5f', glass: '#8fb3c8',
};
function tex(canvas, repeat = false) {
  const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }
function hash(n) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n ^= n >>> 4; n = Math.imul(n, 0x27d4eb2d); n ^= n >>> 15; return (n >>> 0) / 4294967296; }

// ---------------------------------------------------------------- shared textures
function rollupTexture() {
  const c = mkCanvas(64, 64), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.fillRect(0, 0, 64, 64);
  for (let y = 0; y < 64; y += 5) { g.fillStyle = 'rgba(0,0,0,0.16)'; g.fillRect(0, y, 64, 1.4); g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(0, y + 1.5, 64, 1); }
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(0, 60, 64, 4); g.fillRect(28, 52, 8, 3);
  return tex(c);
}
function badgeTexture(kind) {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  const def = {
    rent: { bg: '#2f8f5b', fg: '#fff', text: 'FOR\nRENT', shape: 'tag' },
    turn: { bg: '#e0a526', fg: '#1b1b1b', text: 'MAKE\nREADY', shape: 'diamond' },
    fault: { bg: '#c8412f', fg: '#fff', text: '!', shape: 'tri' },
    commission: { bg: '#2f5e8e', fg: '#fff', text: 'READY?', shape: 'round' },
    missing: { bg: '#6b6f76', fg: '#fff', text: '?', shape: 'round' },
    unready: { bg: '#e0a526', fg: '#1b1b1b', text: 'TURN', shape: 'diamond' },
    reserved: { bg: '#6a4fa0', fg: '#fff', text: 'HELD', shape: 'round' },
    lien: { bg: '#8a2f2f', fg: '#fff', text: 'LATE', shape: 'round' },
    task: { bg: '#f2c230', fg: '#1b1b1b', text: '', shape: 'wrench' },
  }[kind];
  g.save(); g.translate(64, 64);
  g.fillStyle = def.bg; g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 6;
  g.beginPath();
  if (def.shape === 'tri') { g.moveTo(0, -52); g.lineTo(54, 44); g.lineTo(-54, 44); g.closePath(); }
  else if (def.shape === 'diamond') { g.moveTo(0, -58); g.lineTo(58, 0); g.lineTo(0, 58); g.lineTo(-58, 0); g.closePath(); }
  else if (def.shape === 'tag') { g.moveTo(-50, -38); g.lineTo(34, -38); g.lineTo(58, 0); g.lineTo(34, 38); g.lineTo(-50, 38); g.closePath(); }
  else g.arc(0, 0, 52, 0, Math.PI * 2);
  g.fill(); g.stroke();
  g.fillStyle = def.fg; g.textAlign = 'center'; g.textBaseline = 'middle';
  if (def.shape === 'wrench') {
    g.lineWidth = 12; g.strokeStyle = def.fg; g.lineCap = 'round'; g.beginPath(); g.moveTo(-22, 22); g.lineTo(14, -14); g.stroke();
    g.beginPath(); g.arc(20, -20, 14, 0.6, Math.PI * 2 - 0.9); g.stroke();
  } else {
    const lines = def.text.split('\n'); const fs = lines.length > 1 ? 30 : def.text.length > 2 ? 26 : 64;
    g.font = `800 ${fs}px system-ui, sans-serif`;
    lines.forEach((l, k) => g.fillText(l, def.shape === 'tag' ? -6 : 0, (k - (lines.length - 1) / 2) * (fs + 2) + (def.shape === 'tri' ? 10 : 0)));
  }
  g.restore();
  return tex(c);
}
function plaqueTexture(text) {
  const c = mkCanvas(96, 40), g = c.getContext('2d');
  g.fillStyle = '#1f2a36'; g.fillRect(0, 0, 96, 40); g.fillStyle = '#f4f1e8'; g.font = '700 26px system-ui, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 48, 21);
  return tex(c);
}
function signTexture(text, bg = COL.officeTrim) {
  const c = mkCanvas(256, 64), g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, 256, 64); g.fillStyle = '#f5c542'; g.fillRect(0, 56, 256, 8);
  g.fillStyle = '#fff'; g.font = '800 34px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 128, 30);
  return tex(c);
}
function glowTexture(inner = 'rgba(255,226,160,0.85)') {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, inner); gr.addColorStop(0.55, 'rgba(255,210,140,0.28)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128); return tex(c);
}
function ringTexture() {
  const c = mkCanvas(128, 128), g = c.getContext('2d');
  g.strokeStyle = '#ffd23a'; g.lineWidth = 10; g.beginPath(); g.arc(64, 64, 52, 0, Math.PI * 2); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 3; g.beginPath(); g.arc(64, 64, 44, 0, Math.PI * 2); g.stroke();
  return tex(c);
}

export class Renderer {
  constructor(canvas, sim) {
    this.canvas = canvas; this.sim = sim;
    const touch = matchMedia('(pointer: coarse)').matches, dpr = window.devicePixelRatio || 1; this.mobile = touch;
    // phones: DPR 2 already smooths edges, so skip MSAA; iPhones report DPR 3, which triples fill cost for little gain
    const r = new THREE.WebGLRenderer({ canvas, antialias: !(touch && dpr >= 2), powerPreference: 'high-performance' });
    r.setPixelRatio(Math.min(dpr, 2));
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.05;
    this.r = r; this.quality = 2;
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0xcfd8dc, 80, 160);
    this.view = 'ext'; // 'ext' | 0 | 1
    this.overlay = null;
    this.rot = 0; this.azimuth = Math.PI / 4; this.targetAz = this.azimuth;
    this.zoom = 1; this.center = new THREE.Vector3(sim.s.W / 2, 0, sim.s.H / 2 + 1);
    this.camera = new THREE.OrthographicCamera(-10, 10, 10, -10, -200, 400);
    this.frustum = 30;
    this.tx = { rollup: rollupTexture(), glow: glowTexture(), glowCool: glowTexture('rgba(210,230,255,0.8)'), ring: ringTexture(), badges: {}, plaques: {} };
    for (const k of ['rent', 'turn', 'fault', 'commission', 'missing', 'unready', 'reserved', 'lien', 'task']) this.tx.badges[k] = badgeTexture(k);
    this.mat = this.makeMaterials();
    this.geo = { box: new THREE.BoxGeometry(1, 1, 1), plane: new THREE.PlaneGeometry(1, 1), cyl: new THREE.CylinderGeometry(0.5, 0.5, 1, 10), sph: new THREE.SphereGeometry(0.5, 12, 8), cone: new THREE.ConeGeometry(0.5, 1, 8) };
    this.geo.edges = new THREE.EdgesGeometry(this.geo.box); this.mat.edgeDark = new THREE.LineBasicMaterial({ color: 0x3c4046 }); this.ringGeo = {};
    this.setupLights();
    this.groundCanvas = mkCanvas(sim.s.W * CELL, sim.s.H * CELL);
    this.groundTex = tex(this.groundCanvas);
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(sim.s.W, sim.s.H), new THREE.MeshStandardMaterial({ map: this.groundTex, roughness: 0.95 }));
    ground.rotation.x = -Math.PI / 2; ground.position.set(sim.s.W / 2, 0, sim.s.H / 2); ground.receiveShadow = true;
    this.scene.add(ground); this.ground = ground;
    const outer = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x6f944f, roughness: 1 }));
    outer.rotation.x = -Math.PI / 2; outer.position.set(sim.s.W / 2, -0.02, sim.s.H / 2); outer.receiveShadow = true; this.scene.add(outer); this.outer = outer; this.worldW = sim.s.W; this.worldH = sim.s.H;
    // floor-2 plate
    this.f2Canvas = mkCanvas(sim.s.W * CELL, sim.s.H * CELL); this.f2Tex = tex(this.f2Canvas);
    this.f2Plate = new THREE.Mesh(new THREE.PlaneGeometry(sim.s.W, sim.s.H), new THREE.MeshStandardMaterial({ map: this.f2Tex, transparent: true, alphaTest: 0.5, roughness: 0.9 }));
    this.f2Plate.rotation.x = -Math.PI / 2; this.f2Plate.position.set(sim.s.W / 2, FLOOR_H, sim.s.H / 2); this.f2Plate.receiveShadow = true; this.scene.add(this.f2Plate);
    // overlay plane (security / carts / hvac / clean)
    this.ovCanvas = mkCanvas(sim.s.W * 16, sim.s.H * 16); this.ovTex = tex(this.ovCanvas); this.ovTex.magFilter = THREE.NearestFilter;
    this.ovPlane = new THREE.Mesh(new THREE.PlaneGeometry(sim.s.W, sim.s.H), new THREE.MeshBasicMaterial({ map: this.ovTex, transparent: true, depthWrite: false, opacity: 0.85 }));
    this.ovPlane.rotation.x = -Math.PI / 2; this.ovPlane.position.set(sim.s.W / 2, 0.03, sim.s.H / 2); this.ovPlane.renderOrder = 5; this.ovPlane.visible = false; this.scene.add(this.ovPlane);
    this.staticG = new THREE.Group(); this.scene.add(this.staticG);
    this.dynG = new THREE.Group(); this.scene.add(this.dynG);
    this.previewG = new THREE.Group(); this.scene.add(this.previewG);
    this.envG = new THREE.Group(); this.scene.add(this.envG);
    this.buildEnvironment();
    this.customerFree = [];
    this.pool = { veh: new Map(), ppl: new Map(), cart: new Map() };
    this.anim = []; // per-object animated parts {kind, id, mesh}
    this.lastStruct = -1; this.lastGroundT = -1e9;
    this.focus = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: this.tx.ring, transparent: true, depthWrite: false, depthTest: false }));
    this.focus.rotation.x = -Math.PI / 2; this.focus.renderOrder = 20; this.focus.visible = false; this.scene.add(this.focus);
    this.selMesh = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)), new THREE.LineBasicMaterial({ color: 0xffd23a, depthTest: false }));
    this.selMesh.renderOrder = 21; this.selMesh.visible = false; this.scene.add(this.selMesh);
    this.rain = null; this.time = 0;
    this.resize();
  }
  makeMaterials() {
    const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, ...o });
    return {
      unitWall: std(COL.unitWall), unitWall2: std(COL.unitWall2), roof: std(COL.roof, { roughness: 0.6, metalness: 0.3 }), roofTrim: std(COL.roofTrim),
      door: std(COL.door, { map: this.tx.rollup, roughness: 0.55, metalness: 0.2 }), doorInt: std(COL.doorInt, { map: this.tx.rollup, roughness: 0.55, metalness: 0.2 }),
      doorDark: std('#2a2c30'), shellWall: std(COL.shellWall), shellWallCut: std('#b8ae9b'), shellRoof: std(COL.shellRoof, { roughness: 0.55, metalness: 0.35 }),
      office: std(COL.office), officeTrim: std(COL.officeTrim), glass: std(COL.glass, { roughness: 0.15, metalness: 0.4, transparent: true, opacity: 0.75 }),
      metal: std('#9aa1a8', { metalness: 0.6, roughness: 0.4 }), darkMetal: std('#3c4046', { metalness: 0.5, roughness: 0.5 }), yellow: std('#e8b923'),
      lamp: new THREE.MeshStandardMaterial({ color: 0xfff4d6, emissive: 0xffd88a, emissiveIntensity: 0 }), lampOff: std('#555'),
      trunk: std('#6b4f35'), leaf: std('#4f7a3a'), leaf2: std('#5e8a41'), fence: std('#8b9096', { metalness: 0.5, roughness: 0.5 }),
      mesh: new THREE.MeshStandardMaterial({ color: 0x8b9096, transparent: true, opacity: 0.35, side: THREE.DoubleSide, metalness: 0.4 }),
      canopy: std('#e9e4d8', { transparent: true, opacity: 0.88, side: THREE.DoubleSide }), hvac: std('#c7ccd1', { metalness: 0.35, roughness: 0.5 }),
      scaffold: new THREE.LineBasicMaterial({ color: 0xe8b923 }), build: std('#cfc7b5', { transparent: true, opacity: 0.8 }),
      skin: [std('#f1c9a5'), std('#d9a57a'), std('#a8714a'), std('#6e4a2f')],
      stair: std('#a9a399'), rest: std('#dfe9ee'), restDoor: std('#4a7a96'), water: std('#3f86b8', { metalness: 0.3 }), xfmr: std('#6f8a6a', { metalness: 0.3, roughness: 0.6 }), offBadge: new THREE.MeshBasicMaterial({ color: 0xd2452f }),
      cart: std('#2f7fb8', { metalness: 0.3 }), cartDmg: std('#8a3a2a'), boxc: std('#b98d5a'),
      elevShaft: std('#9aa4ad', { transparent: true, opacity: 0.45 }), elevCab: std('#d9dee3', { metalness: 0.4 }),
      head: new THREE.MeshStandardMaterial({ color: 0xfff6d8, emissive: 0xfff0c0, emissiveIntensity: 0 }), tail: new THREE.MeshStandardMaterial({ color: 0x8a1c1c, emissive: 0xff2a2a, emissiveIntensity: 0 }),
    };
  }
  setupLights() {
    this.hemi = new THREE.HemisphereLight(0xdfeaf5, 0x5b6b43, 0.9); this.scene.add(this.hemi);
    const sun = new THREE.DirectionalLight(0xfff1d8, 2.2); sun.castShadow = true;
    sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048); const sc = sun.shadow.camera; sc.left = -34; sc.right = 34; sc.top = 34; sc.bottom = -34; sc.near = 1; sc.far = 140;
    sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
    this.sun = sun; this.scene.add(sun); this.scene.add(sun.target);
    this.ambient = new THREE.AmbientLight(0x6a7da8, 0.0); this.scene.add(this.ambient);
  }
  resizeWorld() { // a property of a different size was attached: rebuild the world-sized planes, textures and scenery
    const s = this.sim.s; if (this.worldW === s.W && this.worldH === s.H) return;
    this.worldW = s.W; this.worldH = s.H;
    const redo = (mesh, cw, ch, y) => {
      const cv = mkCanvas(cw, ch), t = tex(cv); if (mesh.material.map) mesh.material.map.dispose(); mesh.material.map = t; mesh.material.needsUpdate = true;
      mesh.geometry.dispose(); mesh.geometry = new THREE.PlaneGeometry(s.W, s.H); mesh.position.set(s.W / 2, y ?? mesh.position.y, s.H / 2); return [cv, t];
    };
    [this.groundCanvas, this.groundTex] = redo(this.ground, s.W * CELL, s.H * CELL);
    [this.f2Canvas, this.f2Tex] = redo(this.f2Plate, s.W * CELL, s.H * CELL);
    [this.ovCanvas, this.ovTex] = redo(this.ovPlane, s.W * 16, s.H * 16); this.ovTex.magFilter = THREE.NearestFilter;
    this.outer.position.set(s.W / 2, -0.02, s.H / 2);
    this.clearGroup(this.envG); this.buildEnvironment();
  }
  buildEnvironment() {
    const s = this.sim.s, p = s.parcel;
    // trees: deterministic scatter outside the parcel
    const spots = [];
    for (let k = 0; k < 260; k++) {
      const x = -30 + hash(k * 3 + 1) * (s.W + 60), y = -30 + hash(k * 7 + 2) * (s.H + 50);
      if (x > p.x0 - 1.2 && x < p.x1 + 2.2 && y > p.y0 - 1.2 && y < p.y1 + 5.5) continue;
      if (y > p.y1 + 0.8) continue; // street band + foreground stays clear
      spots.push([x, y, 0.8 + hash(k * 11) * 0.9]);
    }
    for (let x = 1; x < s.W; x += 5) spots.push([x + 0.5, p.y1 + 4.8, 0.55]);
    const trunkG = new THREE.CylinderGeometry(0.08, 0.12, 1, 6), leafG = new THREE.IcosahedronGeometry(0.7, 0);
    const trunks = new THREE.InstancedMesh(trunkG, this.mat.trunk, spots.length), leaves = new THREE.InstancedMesh(leafG, this.mat.leaf, spots.length);
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3();
    spots.forEach(([x, y, k], i) => {
      m.compose(v.set(x, 0.5 * k, y), q.identity(), sc.set(k, k, k)); trunks.setMatrixAt(i, m);
      q.setFromEuler(new THREE.Euler(hash(i) * 3, hash(i + 9) * 3, 0));
      m.compose(v.set(x, 1.25 * k, y), q, sc.set(k * 1.1, k * 1.25, k * 1.1)); leaves.setMatrixAt(i, m);
      leaves.setColorAt(i, new THREE.Color().setHSL(0.26 + hash(i * 5) * 0.06, 0.38, 0.3 + hash(i * 13) * 0.1));
    });
    trunks.castShadow = leaves.castShadow = true; this.envG.add(trunks, leaves);
    // neighbours: a couple of simple buildings across the street for context
    for (let k = 0; k < 5; k++) {
      const b = new THREE.Mesh(this.geo.box, new THREE.MeshStandardMaterial({ color: ['#c9b79c', '#b7c0c7', '#d8cbb3', '#a9b3a0', '#cfc2b0'][k], roughness: 0.9 }));
      const w = 5 + hash(k) * 4, h = 1.6 + hash(k + 3) * 1.8;
      b.scale.set(w, h, 4); b.position.set(3 + k * 9 + hash(k + 7) * 2, h / 2, p.y0 - 7); b.castShadow = b.receiveShadow = true; this.envG.add(b);
    }
  }
  // graphics level: 2 = full, 1 = lighter (lower resolution + smaller shadows), 0 = lowest (DPR 1, no shadows)
  setQuality(q) {
    q = Math.max(0, Math.min(2, q)); if (q === this.quality) return; this.quality = q;
    const dpr = window.devicePixelRatio || 1;
    this.r.setPixelRatio(q === 2 ? Math.min(dpr, 2) : q === 1 ? Math.min(dpr, 1.5) : 1);
    const ms = q === 2 ? (this.mobile ? 1024 : 2048) : 512;
    this.sun.castShadow = q > 0;
    if (this.sun.shadow.mapSize.x !== ms) { this.sun.shadow.mapSize.set(ms, ms); if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; } }
    this.resize();
  }
  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.r.setSize(w, h, false); this.aspect = w / h; this.updateCamera(); if (this.post) this.post.resize();
  }
  updateCamera() {
    this.camV = (this.camV || 0) + 1;
    const f = this.frustum / this.zoom, a = this.aspect || 1;
    const c = this.camera; c.left = -f * a / 2; c.right = f * a / 2; c.top = f / 2; c.bottom = -f / 2; c.updateProjectionMatrix();
    const el = this.camElev || 0.72, d = 80;
    c.position.set(this.center.x + Math.sin(this.azimuth) * Math.cos(el) * d, Math.sin(el) * d, this.center.z + Math.cos(this.azimuth) * Math.cos(el) * d);
    c.lookAt(this.center);
  }
  pan(dx, dy) { // screen pixels
    const f = this.frustum / this.zoom, h = this.canvas.clientHeight || 1; const k = f / h;
    const right = new THREE.Vector3(Math.cos(this.azimuth), 0, -Math.sin(this.azimuth));
    const fwd = new THREE.Vector3(-Math.sin(this.azimuth), 0, -Math.cos(this.azimuth));
    this.center.addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.sin(this.camElev || 0.72));
    const s = this.sim.s; this.center.x = Math.max(-4, Math.min(s.W + 4, this.center.x)); this.center.z = Math.max(-4, Math.min(s.H + 4, this.center.z));
    this.updateCamera();
  }
  fitProperty(rect) { // frame the whole parcel inside the uncovered screen area
    const s = this.sim.s, w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    rect = rect || { top: 60, bottom: h - 80, left: 8, right: w - 64 };
    let X0 = 1e9, X1 = -1e9, Y0 = 1e9, Y1 = -1e9; // frame what is built (plus a margin); an empty lot frames the whole parcel
    for (const o of Object.values(s.objects)) { if (o.x == null) continue; X0 = Math.min(X0, o.x); Y0 = Math.min(Y0, o.y); X1 = Math.max(X1, o.x + (o.w || 1)); Y1 = Math.max(Y1, o.y + (o.h || 1)); }
    if (X1 - X0 < 8 || Y1 - Y0 < 8) { X0 = 0; Y0 = 0; X1 = s.W; Y1 = s.H; } else { X0 = Math.max(0, X0 - 2); Y0 = Math.max(0, Y0 - 2); X1 = Math.min(s.W, X1 + 2); Y1 = Math.min(s.H, Y1 + 2); }
    this.center.set((X0 + X1) / 2, 0, (Y0 + Y1) / 2); this.updateCamera();
    const bb = () => { let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of [[X0, Y0], [X1, Y0], [X0, Y1], [X1, Y1]]) for (const z of [0, 2.5]) { const p = this.project(x, y, z); x0 = Math.min(x0, p.x); x1 = Math.max(x1, p.x); y0 = Math.min(y0, p.y); y1 = Math.max(y1, p.y); } return { x0, x1, y0, y1 }; };
    let b = bb(); const k = Math.min((rect.right - rect.left) / (b.x1 - b.x0), (rect.bottom - rect.top) / (b.y1 - b.y0)) * 0.97;
    this.zoom = Math.max(0.25, Math.min(4.2, this.zoom * k)); this.updateCamera();
    b = bb(); this.pan((rect.left + rect.right) / 2 - (b.x0 + b.x1) / 2, (rect.top + rect.bottom) / 2 - (b.y0 + b.y1) / 2);
  }
  zoomBy(k) { this.zoom = Math.max(0.3, Math.min(4.2, this.zoom * k)); this.updateCamera(); }
  rotate(dir) { this.rot = (this.rot + dir + 4) % 4; this.targetAz = this.targetAz + dir * Math.PI / 2; }
  lookAt(x, y) { this.center.set(x + 0.5, 0, y + 0.5); this.updateCamera(); }
  floorY() { return this.view === 1 ? FLOOR_H : 0; }
  cellAt(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    const rc = new THREE.Raycaster(); rc.setFromCamera(ndc, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -this.floorY()); const pt = new THREE.Vector3();
    if (!rc.ray.intersectPlane(plane, pt)) return null;
    return { x: Math.floor(pt.x), y: Math.floor(pt.z), fx: pt.x, fy: pt.z };
  }
  project(x, y, h = 0) {
    const v = new THREE.Vector3(x, h, y).project(this.camera);
    const w = this.canvas.clientWidth, hh = this.canvas.clientHeight;
    return { x: (v.x + 1) / 2 * w, y: (1 - v.y) / 2 * hh, vis: v.z < 1 && v.z > -1 };
  }

  // ================================================================ GROUND TEXTURES
  drawGround() {
    const sim = this.sim, s = sim.s, D = sim.D, g = this.groundCanvas.getContext('2d'), W = s.W, H = s.H, C = CELL;
    const p = s.parcel;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, gv = s.ground[i], px = x * C, py = y * C, h = hash(i * 17 + 3);
      let base;
      switch (gv) {
        case G.ASPHALT: base = COL.asphalt; break; case G.CONCRETE: base = COL.concrete; break; case G.STREET: base = COL.street; break;
        case G.LOADING: base = COL.loading; break; case G.PARKING: base = COL.parking; break; case G.SIDEWALK: base = COL.sidewalk; break;
        default: base = COL.grass;
      }
      g.fillStyle = base; g.fillRect(px, py, C, C);
      if (gv === G.GRASS) { g.fillStyle = `rgba(${h < 0.5 ? '30,60,10' : '210,230,140'},0.05)`; g.fillRect(px, py, C, C); for (let k = 0; k < 6; k++) { g.fillStyle = hash(i * 31 + k) < 0.5 ? 'rgba(40,70,20,0.18)' : 'rgba(200,220,120,0.14)'; g.fillRect(px + hash(i * 7 + k) * C, py + hash(i * 13 + k) * C, 2, 3); } }
      else if (gv === G.ASPHALT || gv === G.STREET || gv === G.PARKING || gv === G.LOADING) { for (let k = 0; k < 5; k++) { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(px + hash(i * 5 + k) * C, py + hash(i * 3 + k) * C, 1.5, 1.5); } }
      else if (gv === G.CONCRETE || gv === G.SIDEWALK) { g.strokeStyle = 'rgba(0,0,0,0.12)'; g.lineWidth = 1; g.strokeRect(px + 0.5, py + 0.5, C - 1, C - 1); }
      if (gv === G.LOADING) {
        g.strokeStyle = COL.yellow; g.lineWidth = 2; g.strokeRect(px + 2, py + 2, C - 4, C - 4);
        g.save(); g.beginPath(); g.rect(px + 2, py + 2, C - 4, C - 4); g.clip(); g.strokeStyle = 'rgba(232,185,35,0.45)'; g.lineWidth = 2;
        for (let k = -C; k < C; k += 8) { g.beginPath(); g.moveTo(px + k, py + C); g.lineTo(px + k + C, py); g.stroke(); } g.restore();
      }
      if (gv === G.PARKING) { g.fillStyle = COL.stripe; const vert = s.ground[i - 1] === G.PARKING || s.ground[i + 1] === G.PARKING; if (vert) g.fillRect(px, py + 2, 2, C - 4); else g.fillRect(px + 2, py, C - 4, 2); }
      if (gv === G.STREET && y === p.y1 + 2) { if (x % 2 === 0) { g.fillStyle = COL.yellow; g.fillRect(px + 4, py + C - 2, C - 8, 3); } }
    }
    // curb line where street meets sidewalk
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, (p.y1 + 2) * C - 2, W * C, 2); g.fillRect(0, (p.y1 + 4) * C, W * C, 2);
    // pending ground (under construction)
    for (const [i, v] of D.pendingGround) { const x = i % W, y = (i / W) | 0; this.hatch(g, x * C, y * C, C, 'rgba(232,185,35,0.55)', 'rgba(60,60,60,0.25)'); }
    // building floors + halls on floor 1
    for (const sh of sim.objs('shell')) {
      g.fillStyle = COL.shellFloor; g.fillRect(sh.x * C, sh.y * C, sh.w * C, sh.h * C);
      for (let y = sh.y; y < sh.y + sh.h; y++) for (let x = sh.x; x < sh.x + sh.w; x++) this.drawHallCell(g, s, 0, x, y);
    }
    this.drawDirt(g, 0);
    // property line
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.setLineDash([6, 6]); g.lineWidth = 2; g.strokeRect(p.x0 * C, p.y0 * C, (p.x1 - p.x0 + 1) * C, (p.y1 - p.y0 + 1) * C); g.setLineDash([]);
    this.groundTex.needsUpdate = true;
    // floor-2 plate
    const f2 = this.f2Canvas.getContext('2d'); f2.clearRect(0, 0, this.f2Canvas.width, this.f2Canvas.height);
    for (const sh of sim.objs('shell')) if (sh.floors > 1 && sh.cstate !== 'construction') {
      f2.fillStyle = COL.shellFloor; f2.fillRect(sh.x * C, sh.y * C, sh.w * C, sh.h * C);
      for (let y = sh.y; y < sh.y + sh.h; y++) for (let x = sh.x; x < sh.x + sh.w; x++) this.drawHallCell(f2, s, 1, x, y);
    }
    this.drawDirt(f2, 1);
    this.f2Tex.needsUpdate = true;
  }
  drawHallCell(g, s, f, x, y) {
    const i = y * s.W + x, v = s.hall[f][i], C = CELL; if (!v) return;
    g.fillStyle = COL.hall; g.fillRect(x * C, y * C, C, C);
    g.fillStyle = 'rgba(0,0,0,0.12)';
    if (!s.hall[f][i - 1]) g.fillRect(x * C, y * C, 2, C); if (!s.hall[f][i + 1]) g.fillRect(x * C + C - 2, y * C, 2, C);
    if (!s.hall[f][i - s.W]) g.fillRect(x * C, y * C, C, 2); if (!s.hall[f][i + s.W]) g.fillRect(x * C, y * C + C - 2, C, 2);
    if (v === 2) this.hatch(g, x * C, y * C, C, 'rgba(232,185,35,0.5)', 'rgba(0,0,0,0.1)');
  }
  hatch(g, px, py, C, a, b) {
    g.save(); g.beginPath(); g.rect(px, py, C, C); g.clip(); g.fillStyle = b; g.fillRect(px, py, C, C); g.strokeStyle = a; g.lineWidth = 4;
    for (let k = -C; k < C * 2; k += 10) { g.beginPath(); g.moveTo(px + k, py); g.lineTo(px + k - C, py + C); g.stroke(); } g.restore();
  }
  drawDirt(g, f) {
    const s = this.sim.s, C = CELL;
    for (let i = 0; i < s.W * s.H; i++) { const d = s.dirt[f][i]; if (d < 0.18) continue; const x = i % s.W, y = (i / s.W) | 0;
      for (let k = 0; k < 4; k++) { g.fillStyle = `rgba(92,70,40,${Math.min(0.5, d * 0.45)})`; g.beginPath(); g.ellipse(x * C + hash(i + k * 7) * C, y * C + hash(i * 3 + k) * C, 3 + d * 6, 2 + d * 4, hash(i + k), 0, 7); g.fill(); } }
  }

  // ================================================================ STATIC SCENE
  isShared(x) {
    if (!this._shared) { this._shared = new Set([...Object.values(this.geo), ...Object.values(this.mat).flat()]); }
    return this._shared.has(x) || Object.values(this.tx.plaques).includes(x) || Object.values(this.ringGeo).includes(x);
  }
  disposeTree(root) { // free per-instance GPU resources; shared geometries/materials/textures stay cached
    root.traverse((o) => {
      if (o.geometry && !this.isShared(o.geometry)) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) if (!this.isShared(m)) m.dispose();
    });
  }
  clearGroup(g) { while (g.children.length) { const c = g.children[0]; g.remove(c); this.disposeTree(c); } }
  clearStatic() { this.clearGroup(this.staticG); this.anim = []; this.badges = []; }
  add(mesh, f = 0, tag = {}) { mesh.userData = { f, ...tag }; mesh.castShadow = mesh.castShadow ?? true;
    // Tiny box props retain appearance/selection, but phones skip their shadow-map draw.
    if (this.mobile && mesh.geometry === this.geo.box && Math.max(mesh.scale.x, mesh.scale.y, mesh.scale.z) <= 0.85) mesh.castShadow = false; this.staticG.add(mesh); return mesh; }
  box(w, h, d, mat, x, y, z, f = 0, tag = {}) {
    const m = new THREE.Mesh(this.geo.box, mat); m.scale.set(w, h, d); m.position.set(x, y + f * FLOOR_H, z); m.castShadow = true; m.receiveShadow = true; return this.add(m, f, tag);
  }
  plaque(text) { if (!this.tx.plaques[text]) this.tx.plaques[text] = new THREE.MeshBasicMaterial({ map: plaqueTexture(text) }); return this.tx.plaques[text]; }
  faceMesh(w, h, mat, cx, cy, cz, dir, f = 0, tag = {}) { // a vertical plane facing dir [dx,dy]
    const m = new THREE.Mesh(this.geo.plane, mat); m.scale.set(w, h, 1); m.position.set(cx, cy + f * FLOOR_H, cz);
    m.rotation.y = Math.atan2(dir[0], dir[1]); m.castShadow = false; m.receiveShadow = true; return this.add(m, f, tag);
  }
  rebuildStatic() {
    const sim = this.sim, s = sim.s; this.clearStatic();
    this.drawGround(); this.lastGroundT = s.t;
    for (const o of Object.values(s.objects)) {
      try { this.buildObj(o); } catch (e) { console.warn('render obj', o.type, e); }
    }
    this.buildFence();
    this.applyView();
  }
  scaffold(o, x, z, w, d, h, f) {
    const ord = this.sim.s.orders.find((q) => q.id === o.order);
    const e = new THREE.LineSegments(this.geo.edges, this.mat.scaffold); e.scale.set(w, h, d); e.position.set(x, h / 2 + f * FLOOR_H, z); this.add(e, f);
    const fill = this.box(w * 0.96, 1, d * 0.96, this.mat.build, x, 0, z, f);
    this.anim.push({ k: 'build', mesh: fill, ord, h, f });
    // corner poles
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) this.box(0.06, h + 0.3, 0.06, this.mat.yellow, x + sx * w / 2, (h + 0.3) / 2, z + sz * d / 2, f);
  }
  buildObj(o) {
    const f = o.f || 0; const S = this.sim.s;
    const inConst = o.cstate === 'construction';
    switch (o.type) {
      case 'unit': {
        const cx = o.x + o.w / 2, cz = o.y + o.h / 2; const H = o.access === 'drive' ? WALL_H : 1.05;
        if (inConst) { this.scaffold(o, cx, cz, o.w, o.h, H, f); break; }
        const body = this.box(o.w - 0.06, H, o.h - 0.06, (o.num % 2) ? this.mat.unitWall : this.mat.unitWall2, cx, H / 2, cz, f, { obj: o.id });
        if (o.access === 'drive') { this.box(o.w + 0.1, 0.08, o.h + 0.1, this.mat.roof, cx, H + 0.04, cz, f, { obj: o.id }); }
        else this.box(o.w - 0.02, 0.05, o.h - 0.02, this.mat.roofTrim, cx, H + 0.02, cz, f, { obj: o.id });
        const along = o.dir[0] !== 0 ? o.h : o.w;
        const fx = cx + o.dir[0] * (o.w / 2 + 0.005), fz = cz + o.dir[1] * (o.h / 2 + 0.005);
        this.faceMesh(along * 0.78, H * 0.74, this.mat.doorDark, fx, H * 0.37, fz, o.dir, f);
        const door = this.faceMesh(along * 0.78, H * 0.74, o.access === 'drive' ? this.mat.door : this.mat.doorInt, fx + o.dir[0] * 0.01, H * 0.37, fz + o.dir[1] * 0.01, o.dir, f, { obj: o.id });
        this.anim.push({ k: 'rollup', mesh: door, o, H });
        this.faceMesh(0.42, 0.17, this.plaque(String(o.num)), fx + o.dir[0] * 0.012, H * 0.87, fz + o.dir[1] * 0.012, o.dir, f);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.tx.badges.rent, depthTest: false, transparent: true }));
        sp.scale.set(0.75, 0.75, 1); sp.position.set(cx, H + 0.7 + f * FLOOR_H, cz); sp.renderOrder = 10; this.add(sp, f, { obj: o.id, badge: true });
        this.badges.push({ sp, o });
        break;
      }
      case 'shell': {
        const cx = o.x + o.w / 2, cz = o.y + o.h / 2, H = o.floors * FLOOR_H;
        if (inConst) { this.scaffold(o, cx, cz, o.w, o.h, H, 0); break; }
        const t = 0.14;
        for (let k = 0; k < o.floors; k++) {
          const y0 = k * FLOOR_H, tag = { shellWall: true, wf: k, shell: o.id };
          const walls = [
            [o.w, t, cx, o.y + t / 2], [o.w, t, cx, o.y + o.h - t / 2], [t, o.h, o.x + t / 2, cz], [t, o.h, o.x + o.w - t / 2, cz]];
          for (const [w, d, x, z] of walls) { const m = this.box(w, FLOOR_H, d, this.mat.shellWall, x, y0 + FLOOR_H / 2, z, 0, tag); m.userData.y0 = y0; }
          // window band
          if (k === o.floors - 1) this.box(o.w + 0.02, 0.12, o.h + 0.02, this.mat.roofTrim, cx, y0 + FLOOR_H - 0.3, cz, 0, { roof: true });
        }
        const roof = this.box(o.w + 0.2, 0.14, o.h + 0.2, this.mat.shellRoof, cx, H + 0.07, cz, 0, { roof: true, shell: o.id });
        for (let k = 1; k < 4; k++) this.box(0.08, 0.1, o.h + 0.2, this.mat.roofTrim, o.x + o.w * k / 4, H + 0.17, cz, 0, { roof: true });
        const sign = this.faceMesh(Math.min(4, o.w * 0.5), 0.55, new THREE.MeshBasicMaterial({ map: this.signTex('STORAGE') }), cx, H - 0.45, o.y + o.h + 0.02, [0, 1], 0, { roof: true });
        break;
      }
      case 'office': {
        const cx = o.x + o.w / 2, cz = o.y + o.h / 2;
        if (inConst) { this.scaffold(o, cx, cz, o.w, o.h, 1.7, 0); break; }
        this.box(o.w - 0.1, 1.7, o.h - 0.1, this.mat.office, cx, 0.85, cz, 0, { obj: o.id });
        this.box(o.w + 0.1, 0.16, o.h + 0.1, this.mat.officeTrim, cx, 1.78, cz, 0, { obj: o.id });
        const d = o.door.dir; const fx = cx + d[0] * (o.w / 2 - 0.04), fz = cz + d[1] * (o.h / 2 - 0.04);
        const len = d[0] ? o.h : o.w;
        this.faceMesh(len * 0.8, 0.8, this.mat.glass, fx + d[0] * 0.02, 0.95, fz + d[1] * 0.02, d, 0);
        const dxw = o.door.x + 0.5 - d[0] * 0.5, dzw = o.door.y + 0.5 - d[1] * 0.5;
        this.faceMesh(0.6, 1.1, this.mat.officeTrim, dxw + d[0] * 0.03, 0.55, dzw + d[1] * 0.03, d, 0);
        this.faceMesh(0.45, 0.9, this.mat.glass, dxw + d[0] * 0.04, 0.5, dzw + d[1] * 0.04, d, 0);
        this.box(d[0] ? 0.6 : 1.2, 0.06, d[0] ? 1.2 : 0.6, this.mat.officeTrim, dxw + d[0] * 0.3, 1.35, dzw + d[1] * 0.3, 0);
        const sg = this.faceMesh(2.2, 0.55, new THREE.MeshBasicMaterial({ map: this.signTex('OFFICE') }), fx + d[0] * 0.03, 2.15, fz + d[1] * 0.03, d, 0);
        this.box(0.05, 0.5, 0.05, this.mat.darkMetal, fx, 1.95, fz, 0);
        break;
      }
      case 'gate': {
        const y = o.y + 1; // fence line z
        if (inConst) { this.scaffold(o, o.x + 0.5, o.y + 0.9, 3, 0.3, 1.2, 0); break; }
        for (const px of [o.x - 1, o.x + 2]) this.box(0.18, 1.5, 0.18, this.mat.darkMetal, px, 0.75, y, 0);
        const panel = new THREE.Group();
        const frame = new THREE.Mesh(this.geo.box, this.mat.darkMetal); frame.scale.set(3, 0.08, 0.06); frame.position.y = 1.2; panel.add(frame);
        const frame2 = frame.clone(); frame2.position.y = 0.12; panel.add(frame2);
        for (let k = 0; k <= 12; k++) { const b = new THREE.Mesh(this.geo.box, this.mat.darkMetal); b.scale.set(0.035, 1.1, 0.035); b.position.set(-1.5 + k * 0.25, 0.66, 0); panel.add(b); }
        panel.position.set(o.x + 0.5, 0, y); panel.traverse((c) => { c.castShadow = true; }); this.add(panel, 0, { obj: o.id });
        this.anim.push({ k: 'gate', mesh: panel, o, x0: o.x + 0.5 });
        // keypad pedestal at the apron, driver side
        this.box(0.14, 0.9, 0.14, this.mat.darkMetal, o.x - 0.8, 0.45, y + 0.6, 0, { obj: o.id });
        const kp = this.box(0.26, 0.3, 0.12, this.mat.yellow, o.x - 0.8, 1.0, y + 0.6, 0, { obj: o.id });
        this.anim.push({ k: 'keypadLed', mesh: kp, o });
        break;
      }
      case 'door': {
        const cx = o.x + 0.5 + o.dir[0] * 0.5, cz = o.y + 0.5 + o.dir[1] * 0.5;
        if (inConst) { this.scaffold(o, cx, cz, o.dir[0] ? 0.3 : 1, o.dir[0] ? 1 : 0.3, 1.4, 0); break; }
        const wide = o.kind !== 'std';
        const w = wide ? 0.95 : 0.55;
        this.faceMesh(w + 0.12, 1.45, this.mat.officeTrim, cx + o.dir[0] * 0.08, 0.72, cz + o.dir[1] * 0.08, o.dir, 0, { obj: o.id, doorFrame: true });
        const panel = this.faceMesh(w, 1.3, o.kind === 'std' ? this.mat.doorInt : this.mat.glass, cx + o.dir[0] * 0.09, 0.65, cz + o.dir[1] * 0.09, o.dir, 0, { obj: o.id });
        this.anim.push({ k: 'door', mesh: panel, o, cx, cz, w });
        if (o.keypad) { const kp = this.box(0.12, 0.2, 0.08, o.keypad === 'operating' ? this.mat.yellow : this.mat.build, cx + o.dir[0] * 0.12 + (o.dir[1] ? 0.62 : 0), 0.95, cz + o.dir[1] * 0.12 + (o.dir[0] ? 0.62 : 0), 0, { obj: o.id }); }
        if (wide) this.box(o.dir[0] ? 0.5 : 1.4, 0.05, o.dir[0] ? 1.4 : 0.5, this.mat.officeTrim, cx + o.dir[0] * 0.3, 1.55, cz + o.dir[1] * 0.3, 0);
        break;
      }
      case 'elevator': {
        const cx = o.x + 0.5, cz = o.y + 0.5, H = 2 * FLOOR_H;
        if (inConst) { this.scaffold(o, cx, cz, 0.9, 0.9, H, 0); break; }
        for (let f2 = 0; f2 < 2; f2++) {
          const e = new THREE.LineSegments(this.geo.edges, this.mat.edgeDark);
          e.scale.set(0.92, FLOOR_H, 0.92); e.position.set(cx, f2 * FLOOR_H + FLOOR_H / 2, cz); this.add(e, f2, { obj: o.id });
          this.box(0.92, 0.04, 0.92, this.mat.yellow, cx, f2 * FLOOR_H + 0.02, cz, 0, { obj: o.id, fl: f2 });
        }
        const cab = this.box(0.78, 1.25, 0.78, this.mat.elevCab, cx, 0.63, cz, 0, { obj: o.id, cab: true });
        this.anim.push({ k: 'elev', mesh: cab, o });
        break;
      }
      case 'light': {
        const cx = o.x + 0.5, cz = o.y + 0.5, inside = !!this.sim.D.shellAt[o.y * S.W + o.x], unitTop = !inside && this.sim.D.unitAt[0][o.y * S.W + o.x];
        if (inConst) { this.scaffold(o, cx, cz, 0.3, 0.3, 1.0, f); break; }
        const lampH = inside ? 1.6 : unitTop ? 1.55 : 2.6;
        if (!inside && !unitTop) this.box(0.08, lampH, 0.08, this.mat.darkMetal, cx, lampH / 2, cz, f, { obj: o.id });
        const head = this.box(inside ? 0.5 : 0.36, 0.1, inside ? 0.18 : 0.24, this.mat.lamp.clone(), cx, lampH, cz, f, { obj: o.id });
        const glow = new THREE.Mesh(this.geo.plane, new THREE.MeshBasicMaterial({ map: this.tx.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 }));
        const R = TOOLS.light.radius * 2; glow.scale.set(R, R, 1); glow.rotation.x = -Math.PI / 2; glow.position.set(cx, f * FLOOR_H + 0.05, cz); glow.renderOrder = 4; glow.castShadow = false;
        this.add(glow, f, { glow: true, inside });
        this.anim.push({ k: 'light', mesh: head, glow, o, inside });
        break;
      }
      case 'camera': {
        const cx = o.x + 0.5, cz = o.y + 0.5, inside = !!this.sim.D.shellAt[o.y * S.W + o.x];
        if (inConst) { this.scaffold(o, cx, cz, 0.3, 0.3, 1.0, f); break; }
        const h = inside ? 1.55 : 2.3;
        if (!inside) this.box(0.07, h, 0.07, this.mat.darkMetal, cx, h / 2, cz, f, { obj: o.id });
        const cam = this.box(0.14, 0.14, 0.34, this.mat.office, cx, h, cz, f, { obj: o.id });
        this.box(0.1, 0.1, 0.04, this.mat.darkMetal, cx, h, cz + 0.18, f);
        this.anim.push({ k: 'cam', mesh: cam, o });
        break;
      }
      case 'hvac': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.9, 0.9, 0.9, 0); break; }
        this.box(0.9, 0.8, 0.9, this.mat.hvac, cx, 0.4, cz, 0, { obj: o.id });
        this.box(0.94, 0.05, 0.94, this.mat.darkMetal, cx, 0.82, cz, 0, { obj: o.id });
        const fan = new THREE.Group();
        for (let k = 0; k < 3; k++) { const b = new THREE.Mesh(this.geo.box, this.mat.darkMetal); b.scale.set(0.7, 0.02, 0.12); b.rotation.y = k * Math.PI / 3; fan.add(b); }
        fan.position.set(cx, 0.86, cz); this.add(fan, 0, { obj: o.id }); this.anim.push({ k: 'fan', mesh: fan, o });
        break;
      }
      case 'stairs': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.9, 0.9, 2 * FLOOR_H, 0); break; }
        const N = 7;
        for (let k = 0; k < N; k++) { const h = (k + 1) * FLOOR_H / N; this.box(0.8, h, 0.9 / N, this.mat.stair, cx, h / 2, o.y + 0.05 + (k + 0.5) * 0.9 / N, 0, { obj: o.id }); }
        this.box(0.04, 0.9, 0.9, this.mat.darkMetal, o.x + 0.08, FLOOR_H / 2 + 0.45, cz, 0, { obj: o.id });
        this.box(0.92, 0.04, 0.92, this.mat.yellow, cx, FLOOR_H + 0.02, cz, 1, { obj: o.id, fl: 1 });
        break;
      }
      case 'power': case 'water': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.8, 0.8, 0.9, 0); break; }
        if (o.type === 'power') { this.box(0.9, 0.12, 0.9, this.mat.hvac, cx, 0.06, cz, 0, { obj: o.id }); this.box(0.7, 0.85, 0.6, this.mat.xfmr, cx, 0.54, cz, 0, { obj: o.id }); this.box(0.5, 0.06, 0.08, this.mat.yellow, cx, 0.7, cz + 0.31, 0, { obj: o.id }); }
        else { this.box(0.14, 0.7, 0.14, this.mat.water, cx, 0.35, cz, 0, { obj: o.id }); this.box(0.5, 0.12, 0.12, this.mat.water, cx, 0.55, cz, 0, { obj: o.id }); this.box(0.3, 0.1, 0.3, this.mat.darkMetal, cx, 0.05, cz, 0, { obj: o.id }); }
        break;
      }
      case 'restroom': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.95, 0.95, 1.4, f); break; }
        this.box(0.96, 1.4, 0.96, this.mat.rest, cx, 0.7, cz, f, { obj: o.id });
        const hd = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => S.hall[f][(o.y + dy) * S.W + o.x + dx] === 1) || [0, 1];
        this.box(hd[0] ? 0.03 : 0.36, 1.0, hd[1] ? 0.03 : 0.36, this.mat.restDoor, cx + hd[0] * 0.49, 0.5, cz + hd[1] * 0.49, f, { obj: o.id });
        const dot = this.box(0.14, 0.14, 0.14, this.mat.water, cx, 1.5, cz, f, { obj: o.id }); this.anim.push({ k: 'rest', mesh: dot, o });
        break;
      }
      case 'fountain': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.4, 0.4, 0.9, f); break; }
        const hd = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => !S.hall[f][(o.y + dy) * S.W + o.x + dx]) || [1, 0];
        const px = cx + hd[0] * 0.36, pz = cz + hd[1] * 0.36;
        this.box(0.26, 0.8, 0.26, this.mat.metal, px, 0.4, pz, f, { obj: o.id });
        this.box(0.34, 0.06, 0.34, this.mat.water, px, 0.82, pz, f, { obj: o.id });
        break;
      }
      case 'corral': {
        const cx = o.x + 0.5, cz = o.y + 0.5;
        if (inConst) { this.scaffold(o, cx, cz, 0.9, 0.9, 0.5, f); break; }
        this.box(0.9, 0.05, 0.05, this.mat.yellow, cx, 0.5, o.y + 0.05, f, { obj: o.id });
        this.box(0.05, 0.05, 0.9, this.mat.yellow, o.x + 0.05, 0.5, cz, f, { obj: o.id });
        this.box(0.05, 0.05, 0.9, this.mat.yellow, o.x + 0.95, 0.5, cz, f, { obj: o.id });
        for (const [px, pz] of [[0.05, 0.05], [0.95, 0.05], [0.05, 0.95], [0.95, 0.95]]) this.box(0.05, 0.5, 0.05, this.mat.darkMetal, o.x + px, 0.25, o.y + pz, f, { obj: o.id });
        break;
      }
      case 'canopy': {
        const cx = o.x + o.w / 2, cz = o.y + o.h / 2;
        if (inConst) { this.scaffold(o, cx, cz, o.w, o.h, 1.5, 0); break; }
        const roof = this.box(o.w, 0.06, o.h, this.mat.canopy, cx, 1.55, cz, 0, { obj: o.id, canopy: true });
        for (const [px, pz] of [[o.x + 0.1, o.y + 0.1], [o.x + o.w - 0.1, o.y + 0.1], [o.x + 0.1, o.y + o.h - 0.1], [o.x + o.w - 0.1, o.y + o.h - 0.1]]) this.box(0.07, 1.55, 0.07, this.mat.darkMetal, px, 0.78, pz, 0);
        break;
      }
    }
  }
  signTex(t) { this.tx.signs ||= {}; return (this.tx.signs[t] ||= signTexture(t)); }
  buildFence() {
    const s = this.sim.s, p = s.parcel, gate = this.sim.objs('gate')[0];
    const segs = [];
    const gx0 = gate ? gate.x - 1 : -99, gx1 = gate ? gate.x + 2 : -99;
    const run = (x0, z0, x1, z1) => segs.push([x0, z0, x1, z1]);
    run(p.x0, p.y0, p.x1 + 1, p.y0); run(p.x0, p.y0, p.x0, p.y1 + 1); run(p.x1 + 1, p.y0, p.x1 + 1, p.y1 + 1);
    if (gate) { run(p.x0, p.y1 + 1, gx0, p.y1 + 1); run(gx1, p.y1 + 1, p.x1 + 1, p.y1 + 1); } else run(p.x0, p.y1 + 1, p.x1 + 1, p.y1 + 1);
    const H = 1.2;
    for (const [x0, z0, x1, z1] of segs) {
      const len = Math.hypot(x1 - x0, z1 - z0); if (len < 0.1) continue;
      const m = new THREE.Mesh(this.geo.plane, this.mat.mesh); m.scale.set(len, H, 1); m.position.set((x0 + x1) / 2, H / 2, (z0 + z1) / 2); m.rotation.y = x0 === x1 ? Math.PI / 2 : 0; this.add(m, 0);
      const rail = new THREE.Mesh(this.geo.box, this.mat.fence); rail.scale.set(x0 === x1 ? 0.04 : len, 0.04, x0 === x1 ? len : 0.04); rail.position.set((x0 + x1) / 2, H, (z0 + z1) / 2); this.add(rail, 0);
      const n = Math.max(1, Math.round(len / 2));
      for (let k = 0; k <= n; k++) { const t = k / n; this.box(0.06, H + 0.05, 0.06, this.mat.fence, x0 + (x1 - x0) * t, (H + 0.05) / 2, z0 + (z1 - z0) * t, 0); }
    }
  }
  setView(v) { this.view = v; this.applyView(); }
  applyView() {
    const v = this.view;
    this.f2Plate.visible = v !== 0;
    for (const m of this.staticG.children) {
      const u = m.userData;
      if (u.roof) { m.visible = v === 'ext'; continue; }
      if (u.canopy) { m.material.opacity = v === 'ext' ? 0.88 : 0.35; }
      if (u.shellWall) {
        const shell = this.sim.s.objects[u.shell];
        if (v === 'ext') { m.visible = true; this.setWallH(m, FLOOR_H); }
        else if (v === 0) { m.visible = u.wf === 0; this.setWallH(m, 0.45); }
        else { m.visible = u.wf <= 1; this.setWallH(m, u.wf === 1 ? 0.45 : FLOOR_H); }
        continue;
      }
      if (u.fl != null && u.fl === 1) { m.visible = v !== 0; continue; }
      if (u.f === 1) m.visible = v !== 0;
      else m.visible = true;
    }
    this.ovPlane.position.y = this.floorY() + 0.04;
  }
  setWallH(m, h) {
    const y0 = m.userData.y0 || 0; m.scale.y = h; m.position.y = y0 + h / 2;
  }

  // ================================================================ DYNAMIC
  vehMesh(v) {
    const dims = { sedan: [1.35, 0.62, 0.42], suv: [1.45, 0.7, 0.55], pickup: [1.6, 0.7, 0.5], van: [1.7, 0.75, 0.75], box: [2.1, 0.85, 0.95] }[v.type] || [1.4, 0.65, 0.5];
    const g = new THREE.Group(); const [L, W, Hh] = dims;
    const paint = new THREE.MeshStandardMaterial({ color: v.color, roughness: 0.35, metalness: 0.45 });
    const body = new THREE.Mesh(this.geo.box, paint); body.scale.set(L, Hh * 0.55, W); body.position.y = 0.12 + Hh * 0.275; g.add(body);
    if (v.type === 'box') {
      const cargo = new THREE.Mesh(this.geo.box, new THREE.MeshStandardMaterial({ color: 0xf2f0ea, roughness: 0.7 })); cargo.scale.set(L * 0.66, Hh, W * 1.02); cargo.position.set(-L * 0.17, 0.12 + Hh * 0.5 + 0.05, 0); g.add(cargo);
      const cab = new THREE.Mesh(this.geo.box, paint); cab.scale.set(L * 0.3, Hh * 0.75, W); cab.position.set(L * 0.35, 0.12 + Hh * 0.45, 0); g.add(cab);
    } else if (v.type === 'pickup') {
      const cab = new THREE.Mesh(this.geo.box, this.mat.glass); cab.scale.set(L * 0.35, Hh * 0.45, W * 0.9); cab.position.set(L * 0.1, 0.12 + Hh * 0.75, 0); g.add(cab);
    } else {
      const cab = new THREE.Mesh(this.geo.box, this.mat.glass); cab.scale.set(L * (v.type === 'van' ? 0.8 : 0.55), Hh * 0.45, W * 0.88); cab.position.set(v.type === 'van' ? -L * 0.05 : -L * 0.05, 0.12 + Hh * 0.75, 0); g.add(cab);
      const top = new THREE.Mesh(this.geo.box, paint); top.scale.set(L * (v.type === 'van' ? 0.78 : 0.5), 0.05, W * 0.86); top.position.set(-L * 0.05, 0.12 + Hh + 0.0, 0); g.add(top);
    }
    const tire = new THREE.Mesh(this.geo.box, this.mat.doorDark); tire.scale.set(L * 0.9, 0.16, W * 1.04); tire.position.y = 0.1; g.add(tire);
    const hl = new THREE.Mesh(this.geo.box, this.mat.head); hl.scale.set(0.03, 0.08, W * 0.8); hl.position.set(L / 2 + 0.01, 0.3, 0); g.add(hl);
    const tl = new THREE.Mesh(this.geo.box, this.mat.tail); tl.scale.set(0.03, 0.08, W * 0.8); tl.position.set(-L / 2 - 0.01, 0.3, 0); g.add(tl);
    g.traverse((c) => { c.castShadow = true; });
    return g;
  }
  personMesh(a) {
    const reusable = a.kind === 'cust' && !a.role;
    if (reusable && this.customerFree.length) {
      const g = this.customerFree.pop();
      g.userData.body.material.color.setHSL(hash(a.look || a.id), 0.45, 0.5);
      g.userData.head.material = this.mat.skin[Math.floor(hash((a.look || a.id) + 5) * 4)];
      g.position.set(0, 0, 0); g.rotation.set(0, 0, 0); g.visible = true;
      g.userData.legs.scale.y = 0.32; g.userData.box.visible = false;
      return g;
    }
    const g = new THREE.Group();
    const vestCol = { owner: 0x1f3a5f, porter: 0x2f8f5b, tech: 0xd9772b, clerk: 0x6a4fa0 }[a.role];
    const shirtHue = hash(a.look || a.id) ;
    const shirt = new THREE.MeshStandardMaterial({ color: vestCol ?? new THREE.Color().setHSL(shirtHue, 0.45, 0.5), roughness: 0.8 });
    const legs = new THREE.Mesh(this.geo.cyl, new THREE.MeshStandardMaterial({ color: 0x34393f })); legs.scale.set(0.2, 0.32, 0.2); legs.position.y = 0.16; g.add(legs);
    const body = new THREE.Mesh(this.geo.cyl, shirt); body.scale.set(0.27, 0.32, 0.22); body.position.y = 0.46; g.add(body);
    const head = new THREE.Mesh(this.geo.sph, this.mat.skin[Math.floor(hash((a.look || a.id) + 5) * 4)]); head.scale.setScalar(0.2); head.position.y = 0.72; g.add(head);
    if (vestCol != null) { // hi-vis stripe + cap: role cue beyond colour
      const stripe = new THREE.Mesh(this.geo.cyl, this.mat.yellow); stripe.scale.set(0.285, 0.04, 0.235); stripe.position.y = 0.5; g.add(stripe);
      const cap = new THREE.Mesh(this.geo.cyl, shirt); cap.scale.set(0.21, 0.06, 0.21); cap.position.y = 0.82; g.add(cap);
      if (a.role === 'tech') { const tb = new THREE.Mesh(this.geo.box, this.mat.cartDmg); tb.scale.set(0.16, 0.1, 0.07); tb.position.set(0, 0.3, 0.16); g.add(tb); }
    }
    const box = new THREE.Mesh(this.geo.box, this.mat.boxc); box.scale.set(0.24, 0.18, 0.2); box.position.set(0.2, 0.5, 0); box.visible = false; g.add(box);
    g.userData.box = box; g.userData.legs = legs; g.userData.body = body; g.userData.head = head; g.userData.reusableCustomer = reusable;
    g.traverse((c) => { c.castShadow = true; });
    return g;
  }
  cartMesh() {
    const g = new THREE.Group();
    const bed = new THREE.Mesh(this.geo.box, this.mat.cart); bed.scale.set(0.5, 0.05, 0.32); bed.position.y = 0.14; g.add(bed);
    const rails = new THREE.Mesh(this.geo.box, this.mat.cart); rails.scale.set(0.04, 0.4, 0.3); rails.position.set(-0.24, 0.35, 0); g.add(rails);
    const wh = new THREE.Mesh(this.geo.box, this.mat.doorDark); wh.scale.set(0.46, 0.08, 0.34); wh.position.y = 0.05; g.add(wh);
    const load = new THREE.Mesh(this.geo.box, this.mat.boxc); load.scale.set(0.38, 0.22, 0.26); load.position.set(0.03, 0.28, 0); load.visible = false; g.add(load);
    g.userData.load = load; g.userData.bed = bed;
    g.traverse((c) => { c.castShadow = true; });
    return g;
  }
  floorVisible(f) { return this.view === 'ext' ? true : this.view === 0 ? f === 0 : true; }
  syncPool(map, items, make, upd, dt) {
    const seen = new Set();
    for (const it of items) {
      seen.add(it.id); let m = map.get(it.id);
      if (!m) { m = make(it); m.userData.fresh = true; map.set(it.id, m); this.dynG.add(m); }
      upd(m, it, dt); m.userData.fresh = false;
    }
    for (const [id, m] of map) if (!seen.has(id)) { this.dynG.remove(m);
      if (map === this.pool.ppl && m.userData.reusableCustomer && this.customerFree.length < 24) this.customerFree.push(m);
      else this.disposeTree(m);
      map.delete(id); }
  }
  clearDynamic() {
    for (const map of Object.values(this.pool)) {
      for (const m of map.values()) { this.dynG.remove(m); this.disposeTree(m); }
      map.clear();
    }
    for (const m of this.customerFree) this.disposeTree(m);
    this.customerFree.length = 0;
  }
  smooth(m, x, y, z, dt, k = 18, snap = 3) {
    if (m.userData.fresh || Math.hypot(m.position.x - x, m.position.z - z) > snap) { m.position.set(x, y, z); return; }
    const a = 1 - Math.exp(-k * dt); m.position.x += (x - m.position.x) * a; m.position.z += (z - m.position.z) * a; m.position.y += (y - m.position.y) * Math.min(1, a * 1.5);
  }
  face(m, dx, dz, dt) {
    if (Math.abs(dx) + Math.abs(dz) < 1e-4) return; const tgt = Math.atan2(-dz, dx);
    let d = tgt - m.rotation.y; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    m.rotation.y += d * Math.min(1, dt * 12);
  }
  updateDynamic(dt) {
    const sim = this.sim, s = sim.s;
    const snap = s.speed >= 4 ? 6 : 3;
    this.syncPool(this.pool.veh, s.vehicles, (v) => this.vehMesh(v), (m, v) => {
      const px = m.position.x, pz = m.position.z;
      this.smooth(m, v.x, 0, v.y, dt, 14, snap);
      const dx = m.position.x - px, dz = m.position.z - pz;
      if (Math.abs(dx) + Math.abs(dz) > 0.002) this.face(m, dx, dz, dt); else if (m.userData.fresh) m.rotation.y = Math.atan2(-(v.hy || 0), v.hx || 1);
      m.visible = this.view !== 1 || true;
    }, dt);
    const people = s.agents.filter((a) => !a.hidden);
    this.syncPool(this.pool.ppl, people, (a) => this.personMesh(a), (m, a) => {
      let y = (a.f || 0) * FLOOR_H;
      if (a.inElev && a.elev) { const el = s.objects[a.elev]; if (el) y = el.pos * FLOOR_H; }
      const px = m.position.x, pz = m.position.z;
      const ox = a.kind === 'staff' ? 0.12 : -0.08;
      this.smooth(m, a.x + ox * 0.5, y, a.y + ox * 0.3, dt, 16, snap);
      const dx = m.position.x - px, dz = m.position.z - pz; const mv = Math.hypot(dx, dz);
      if (mv > 0.001) this.face(m, dx, dz, dt);
      m.userData.legs.scale.y = 0.32 * (1 + (mv > 0.003 ? Math.sin(this.time * 18 + a.id) * 0.08 : 0));
      m.userData.box.visible = !!a.carry && !a.cart;
      m.visible = this.floorVisible(Math.round(y / FLOOR_H)) && !(this.view === 'ext' && sim.D.shellAt[Math.floor(a.y) * s.W + Math.floor(a.x)]);
      if (this.view === 0 && y > 0.5) m.visible = false;
    }, dt);
    // carts: corral slots / with agent / stranded
    const agentOf = new Map(); for (const a of s.agents) if (a.cart) agentOf.set(a.cart, a);
    const slot = new Map();
    this.syncPool(this.pool.cart, s.carts, () => this.cartMesh(), (m, c) => {
      let x = c.x, z = c.y, y = (c.f || 0) * FLOOR_H, rot = null;
      const a = agentOf.get(c.id);
      if (a) {
        const pm = this.pool.ppl.get(a.id);
        if (pm) { const r = pm.rotation.y; x = pm.position.x + Math.cos(r) * 0.42; z = pm.position.z - Math.sin(r) * 0.42; y = pm.position.y; rot = r; }
        else { x = a.x; z = a.y; }
        m.userData.load.visible = true;
      } else if (c.st === 'corral') {
        const k = slot.get(c.corral) || 0; slot.set(c.corral, k + 1);
        const co = s.objects[c.corral]; if (co) { x = co.x + 0.3 + (k % 3) * 0.2; z = co.y + 0.5 + Math.floor(k / 3) * 0.12 - 0.1; y = (co.f || 0) * FLOOR_H + (k >= 6 ? 0.02 : 0); rot = Math.PI / 2; }
        m.userData.load.visible = false;
      } else { m.userData.load.visible = false; rot = (hash(c.id) - 0.5) * 2.5; }
      if (!a && c.st === 'corral' && m.userData.fresh) m.position.set(x, y, z);
      this.smooth(m, x, y, z, dt, 20, snap + 2);
      if (rot != null) m.rotation.y = rot;
      m.userData.bed.material = c.cond < 0.2 || c.st === 'damaged' ? this.mat.cartDmg : this.mat.cart;
      m.visible = this.floorVisible(c.f || 0) && !(this.view === 'ext' && sim.D.shellAt[Math.floor(z) * s.W + Math.floor(x)]) && !(this.view === 0 && y > 0.5);
    }, dt);
  }
  updateAnim(dt, night) {
    const sim = this.sim, s = sim.s;
    for (const A of this.anim) {
      const o = A.o;
      switch (A.k) {
        case 'build': { if (!A.ord) break; const p = Math.max(0.02, A.ord.prog); A.mesh.scale.y = A.h * p; A.mesh.position.y = A.f * FLOOR_H + A.h * p / 2; A.mesh.material.opacity = A.ord.waiting ? 0.35 : 0.8; break; }
        case 'rollup': { const tgt = o.doorOpen ? 0.12 : 1; const cur = A.mesh.scale.y / (A.H * 0.74); const n = cur + (tgt - cur) * Math.min(1, dt * 5); A.mesh.scale.y = A.H * 0.74 * n; A.mesh.position.y = (o.f || 0) * FLOOR_H + A.H * 0.74 - A.H * 0.74 * n / 2; break; }
        case 'gate': { A.mesh.position.x = A.x0 - (o.open || 0) * 2.8; break; }
        case 'keypadLed': { A.mesh.material = o.cond < 0.2 ? this.mat.cartDmg : this.mat.yellow; break; }
        case 'door': { const open = o.openT != null && s.t - o.openT < 3; A.cur = (A.cur || 0) + ((open ? 1 : 0) - (A.cur || 0)) * Math.min(1, dt * 8); const side = o.dir[1] ? [1, 0] : [0, 1]; A.mesh.position.x = A.cx + o.dir[0] * 0.09 + side[0] * A.cur * A.w * 0.8; A.mesh.position.z = A.cz + o.dir[1] * 0.09 + side[1] * A.cur * A.w * 0.8; break; }
        case 'elev': { A.mesh.position.y = o.pos * FLOOR_H + 0.63; A.mesh.visible = !(this.view === 0 && o.pos > 0.5); A.mesh.material = !sim.works(o) ? this.mat.cartDmg : this.mat.elevCab; break; }
        case 'light': {
          const on = sim.works(o); const flick = o.cond < 0.45 && on ? (Math.sin(this.time * 23 + o.id) > 0.6 ? 0.25 : 1) : 1;
          const lvl = (A.inside ? 0.85 : night) * (on ? 1 : 0) * flick;
          A.mesh.material.emissiveIntensity = on ? (A.inside ? 1.2 : 0.3 + night * 1.8) * flick : 0;
          A.mesh.material.color.set(on ? 0xfff4d6 : 0x444444);
          A.glow.material.opacity = lvl * (A.inside ? (this.view === 'ext' ? 0 : 0.55) : 0.75);
          A.glow.visible = A.glow.material.opacity > 0.01 && (A.glow.userData.f === 0 || this.view !== 0);
          break;
        }
        case 'rest': { A.mesh.material = !sim.amenityWorks(o) ? this.mat.cartDmg : (o.dirt || 0) > 0.6 ? this.mat.yellow : this.mat.water; const busy = o.busyUntil != null && s.t < o.busyUntil; const k = busy ? 1.35 + Math.sin(this.time * 6) * 0.2 : 1; A.mesh.scale.set(k, k, k); break; }
        case 'fan': { if (o.cond >= 0.2 && !o.unpowered) A.mesh.rotation.y += dt * 9 * (s.speed || 0.3); break; }
        case 'cam': { if (o.cond >= 0.2 && !o.unpowered) A.mesh.rotation.y = Math.sin(this.time * 0.6 + o.id) * 0.7; break; }
      }
    }
    // unit badges
    for (const B of this.badges || []) {
      const u = B.o; let k = null;
      if (u.cstate === 'built') k = u.missing && u.missing.length ? 'missing' : 'commission';
      else if (u.cstate === 'ready') k = 'commission';
      else if (u.cstate === 'operating') {
        if (u.blocked) k = 'missing';
        else if (u.commercial === 'unready') k = sim.s.tasks.some((t) => t.type === 'makeready' && t.obj === u.id && t.assigned) ? 'task' : 'turn';
        else if (u.commercial === 'ready') k = 'rent'; else if (u.commercial === 'reserved') k = 'reserved';
        else if (u.lease && sim.s.leases[u.lease] && sim.s.leases[u.lease].status !== 'current') k = 'lien';
      }
      B.sp.visible = !!k && (this.view !== 'ext' || u.access === 'drive') && this.floorVisible(u.f || 0) && !(this.view === 0 && (u.f || 0) > 0);
      if (k && B.sp.material.map !== this.tx.badges[k]) { B.sp.material.map = this.tx.badges[k]; B.sp.material.needsUpdate = true; }
      if (k) { const bob = Math.sin(this.time * 3 + u.id) * 0.05; B.sp.position.y = (u.f || 0) * FLOOR_H + (u.access === 'drive' ? WALL_H : 1.05) + 0.62 + bob; }
    }
  }
  // day/night + weather
  lightning() { this.lightningAt = performance.now(); }
  updateSky(dt) {
    const s = this.sim.s, h = this.todOverride != null ? this.todOverride : (s.t % 1440) / 60;
    const dayK = Math.max(0, Math.min(1, (h < 12 ? (h - 5.8) / 1.6 : (19.6 - h) / 1.6)));
    const golden = Math.max(0, 1 - Math.abs(h - 18.4) / 1.2) + Math.max(0, 1 - Math.abs(h - 6.8) / 1.0);
    const rain = (this.weatherOverride || s.weather) === 'rain' ? 1 : 0;
    const night = 1 - dayK; this.nightK = night; this.rainK = rain; this.goldenK = golden;
    const sunA = ((h - 6) / 13) * Math.PI;
    const sx = Math.cos(sunA) * 40, sy = Math.max(8, Math.sin(sunA) * 50);
    this.sun.position.set(this.center.x + sx, sy, this.center.z + 22); this.sun.target.position.copy(this.center);
    const lf = rain && this.lightningAt ? performance.now() - this.lightningAt : 9999;
    const flash = lf < 85 ? 1 : lf > 130 && lf < 210 ? 0.45 : 0;
    this.sun.intensity = (0.15 + dayK * 2.3) * (1 - rain * 0.45) + flash * 2.8;
    this.sun.color.setRGB(1, 0.93 - golden * 0.2, 0.84 - golden * 0.35);
    this.hemi.intensity = 0.55 + dayK * 0.45 - rain * 0.1 + flash * 1.25;
    this.hemi.color.setRGB(0.55 + dayK * 0.35, 0.62 + dayK * 0.3, 0.8 + dayK * 0.15);
    this.ambient.intensity = night * 0.9 + flash * 0.75;
    const sky = new THREE.Color().setRGB(0.12 + dayK * 0.57 + golden * 0.12 - rain * 0.12, 0.09 + dayK * 0.7 - rain * 0.1, 0.17 + dayK * 0.72 - rain * 0.05);
    if (flash) sky.lerp(new THREE.Color(0xe8efff), flash * 0.62);
    this.scene.background = sky; this.scene.fog.color.copy(sky);
    this.mat.head.emissiveIntensity = night * 2.2; this.mat.tail.emissiveIntensity = night * 1.2;
    // rain particles
    if (rain && !this.rain) {
      const n = 900, pos = new Float32Array(n * 3); for (let i = 0; i < n; i++) { pos[i * 3] = Math.random() * 60 - 8; pos[i * 3 + 1] = Math.random() * 14; pos[i * 3 + 2] = Math.random() * 50 - 6; }
      const gg = new THREE.BufferGeometry(); gg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      this.rain = new THREE.Points(gg, new THREE.PointsMaterial({ color: 0xbfd2e6, size: 0.06, transparent: true, opacity: 0.55, depthWrite: false })); this.scene.add(this.rain);
    }
    if (this.rain) {
      this.rain.visible = !!rain;
      if (rain) { const a = this.rain.geometry.attributes.position; for (let i = 0; i < a.count; i++) { let y = a.getY(i) - dt * 16; if (y < 0) y += 14; a.setY(i, y); } a.needsUpdate = true; }
    }
    if (this.fx) this.fx.sky(dt, night, rain, golden);
    return night;
  }

  // ================================================================ PREVIEW / OVERLAYS / FOCUS
  setPreview(R, anchor = null) {
    this.clearGroup(this.previewG);
    if (!R) return;
    const col = R.status === 'invalid' ? 0xd2452f : R.status === 'incomplete' ? 0xe8a91f : 0x39b36b;
    const okMat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.45, depthWrite: false, depthTest: false });
    const badMat = new THREE.MeshBasicMaterial({ color: 0xd2452f, transparent: true, opacity: 0.6, depthWrite: false, depthTest: false });
    const seen = new Set();
    for (const it of R.items || []) {
      const k = (it.f || 0) + ':' + it.x + ',' + it.y; if (seen.has(k)) continue; seen.add(k);
      const m = new THREE.Mesh(this.geo.plane, it.ok ? okMat : badMat); m.rotation.x = -Math.PI / 2; m.scale.set(0.94, 0.94, 1);
      m.position.set(it.x + 0.5, (it.f || 0) * FLOOR_H + 0.06, it.y + 0.5); m.renderOrder = 30; this.previewG.add(m);
    }
    const ghost = new THREE.MeshStandardMaterial({ color: col, transparent: true, opacity: 0.35, depthWrite: false });
    const drivePreview = TOOLS[R.tool] && TOOLS[R.tool].access === 'drive';
    const frontageMat = new THREE.MeshBasicMaterial({ color: 0xffd23a, transparent: true, opacity: 0.95, depthWrite: false, depthTest: false });
    for (const u of R.units || []) {
      const H = drivePreview ? WALL_H : 1.05;
      const m = new THREE.Mesh(this.geo.box, u.ok === false ? badMat : ghost); m.scale.set(u.w - 0.08, H, u.h - 0.08); m.position.set(u.x + u.w / 2, (u.f || 0) * FLOOR_H + H / 2, u.y + u.h / 2); this.previewG.add(m);
      // Door/frontage direction: keep the arrow and add a bright strip along the whole door edge.
      if (drivePreview) {
        const edge = new THREE.Mesh(this.geo.box, frontageMat);
        const alongX = u.dir[1] !== 0;
        edge.scale.set(alongX ? Math.max(0.35, u.w - 0.12) : 0.18, 0.08, alongX ? 0.18 : Math.max(0.35, u.h - 0.12));
        edge.position.set(
          u.x + u.w / 2 + u.dir[0] * (u.w / 2 + 0.12),
          (u.f || 0) * FLOOR_H + 0.10,
          u.y + u.h / 2 + u.dir[1] * (u.h / 2 + 0.12)
        );
        edge.renderOrder = 32; this.previewG.add(edge);
      }
      const ar = new THREE.Mesh(this.geo.cone, new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false })); ar.scale.set(0.22, 0.34, 0.22);
      ar.position.set(u.x + u.w / 2 + u.dir[0] * (u.w / 2 + 0.25), (u.f || 0) * FLOOR_H + 0.25, u.y + u.h / 2 + u.dir[1] * (u.h / 2 + 0.25));
      ar.rotation.set(u.dir[1] * Math.PI / 2, 0, -u.dir[0] * Math.PI / 2); ar.renderOrder = 33; this.previewG.add(ar);
    }
    if (anchor && Number.isFinite(anchor.x) && Number.isFinite(anchor.y)) {
      const f = R.args && Number.isFinite(R.args.f) ? R.args.f : 0;
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.26, 0.43, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.98, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(anchor.x + 0.5, f * FLOOR_H + 0.11, anchor.y + 0.5);
      ring.renderOrder = 35; this.previewG.add(ring);
      const dot = new THREE.Mesh(new THREE.CircleGeometry(0.11, 24), new THREE.MeshBasicMaterial({ color: 0xffd23a, depthWrite: false, depthTest: false, side: THREE.DoubleSide }));
      dot.rotation.x = -Math.PI / 2; dot.position.copy(ring.position); dot.position.y += 0.01; dot.renderOrder = 36; this.previewG.add(dot);
    }
    for (const c of R.creates || []) {
      if (c.type === 'light' || c.type === 'camera') {
        const r = TOOLS[c.type].radius; const ring = new THREE.Mesh((this.ringGeo[r] ||= new THREE.RingGeometry(r - 0.08, r, 48)), new THREE.MeshBasicMaterial({ color: c.type === 'light' ? 0xffe08a : 0x7fb7ff, transparent: true, opacity: 0.8, depthTest: false }));
        ring.rotation.x = -Math.PI / 2; ring.position.set(c.x + 0.5, (c.f || 0) * FLOOR_H + 0.07, c.y + 0.5); ring.renderOrder = 32; this.previewG.add(ring);
      }
    }
  }
  setOverlay(kind) { this.overlay = kind; this.ovPlane.visible = !!kind; this.lastOv = -1; }
  drawOverlay() {
    const sim = this.sim, s = sim.s, D = sim.D, g = this.ovCanvas.getContext('2d'), C = 16, W = s.W, f = this.view === 1 ? 1 : 0;
    g.clearRect(0, 0, this.ovCanvas.width, this.ovCanvas.height);
    const cell = (i, c) => { g.fillStyle = c; g.fillRect((i % W) * C, ((i / W) | 0) * C, C, C); };
    // status is never color alone (concept §11): every state also gets a mark
    const mark = (px, py, m, sz = C) => { if (!m) return; g.save(); g.strokeStyle = 'rgba(20,24,30,0.75)'; g.fillStyle = 'rgba(20,24,30,0.75)'; g.lineWidth = Math.max(2, sz / 7); const a = sz * 0.22, b = sz * 0.78;
      if (m === 'x') { g.beginPath(); g.moveTo(px + a, py + a); g.lineTo(px + b, py + b); g.moveTo(px + b, py + a); g.lineTo(px + a, py + b); g.stroke(); }
      else if (m === '/') { g.beginPath(); g.moveTo(px + a, py + b); g.lineTo(px + b, py + a); g.stroke(); }
      else if (m === '.') { g.beginPath(); g.arc(px + sz / 2, py + sz / 2, sz * 0.14, 0, 7); g.fill(); }
      else if (m === 'v') { g.beginPath(); g.moveTo(px + a, py + sz * 0.52); g.lineTo(px + sz * 0.43, py + b); g.lineTo(px + b, py + a); g.stroke(); }
      g.restore(); };
    const cellM = (i, c, m) => { cell(i, c); mark((i % W) * C, ((i / W) | 0) * C, m); };
    if (this.overlay === 'security') {
      for (let i = 0; i < W * s.H; i++) {
        if (!D.walk[f][i] && !(f === 0 && D.solid[i] && !D.shellAt[i])) continue;
        const lit = D.lit[f][i] >= 0.5, cam = D.cam[f][i];
        if (cam && lit) cell(i, 'rgba(64,170,110,0.55)'); else if (cam) cellM(i, 'rgba(70,130,220,0.5)', '.'); else if (lit) cellM(i, 'rgba(240,200,70,0.5)', '/'); else cellM(i, 'rgba(200,60,50,0.5)', 'x');
      }
    } else if (this.overlay === 'clean') {
      for (let i = 0; i < W * s.H; i++) { if (!D.walk[f][i]) continue; const d = s.dirt[f][i]; if (d > 0.55) cellM(i, 'rgba(200,60,50,0.6)', 'x'); else if (d > 0.25) cellM(i, 'rgba(230,170,50,0.5)', '/'); else cell(i, 'rgba(64,170,110,0.35)'); }
    } else if (this.overlay === 'hvac') {
      for (const sh of sim.objs('shell')) {
        const hv = D.hvac[sh.id]; const c = !hv || hv.cap <= 0 ? 'rgba(120,120,120,0.35)' : hv.load > hv.cap ? 'rgba(200,60,50,0.5)' : 'rgba(70,170,220,0.45)';
        const hm = !hv || hv.cap <= 0 ? '/' : hv.load > hv.cap ? 'x' : null;
        for (let y = sh.y; y < sh.y + sh.h; y++) for (let x = sh.x; x < sh.x + sh.w; x++) cellM(y * W + x, c, (x + y) % 2 === 0 ? hm : null);
      }
      for (const u of sim.objs('unit')) if (u.env === 'climate' && (u.f || 0) === f) { g.strokeStyle = '#8fe0ff'; g.lineWidth = 2; g.strokeRect(u.x * C + 1, u.y * C + 1, u.w * C - 2, u.h * C - 2); }
      for (const hvo of sim.objs('hvac')) { g.fillStyle = '#8fe0ff'; g.beginPath(); g.arc(hvo.x * C + 8, hvo.y * C + 8, 7, 0, 7); g.fill(); }
    } else if (this.overlay === 'power') {
      for (const o of Object.values(s.objects)) {
        if (o.cstate !== 'operating' || !sim.powerKey(o) || (o.type !== 'gate' && o.type !== 'office' && (o.f || 0) !== f && o.type !== 'elevator')) continue;
        const col = o.unpowered ? 'rgba(210,60,45,0.85)' : 'rgba(64,170,110,0.75)';
        if (o.w && o.h) { g.fillStyle = col; g.fillRect(o.x * C, o.y * C, o.w * C, o.h * C); }
        else { g.fillStyle = col; g.beginPath(); g.arc(o.x * C + 8, o.y * C + 8, o.type === 'elevator' || o.type === 'hvac' ? 12 : 7, 0, 7); g.fill(); }
        if (o.unpowered) mark(o.x * C - 4, o.y * C - 4, 'x', 24);
      }
      for (const p of sim.objs('power')) { g.strokeStyle = '#f1d24a'; g.lineWidth = 3; g.strokeRect(p.x * C + 1, p.y * C + 1, C - 2, C - 2); }
    } else if (this.overlay === 'carts') {
      for (let i = 0; i < W * s.H; i++) if (D.walk[f][i]) cell(i, 'rgba(255,255,255,0.12)');
      for (const co of sim.objs('corral')) { if ((co.f || 0) !== f) continue; const n = sim.cartsAt(co.id).length; g.fillStyle = n === 0 ? 'rgba(200,60,50,0.8)' : n < (co.target || 2) ? 'rgba(230,170,50,0.8)' : 'rgba(64,170,110,0.8)'; g.beginPath(); g.arc(co.x * C + 8, co.y * C + 8, 14, 0, 7); g.fill(); mark(co.x * C - 4, co.y * C - 4, n === 0 ? 'x' : n < (co.target || 2) ? '/' : 'v', 24); g.fillStyle = '#fff'; g.font = '700 12px system-ui'; g.textAlign = 'center'; g.fillText(String(n), co.x * C + 8, co.y * C + 12); }
      for (const c of s.carts) if ((c.st === 'stranded' || c.st === 'damaged') && (c.f || 0) === f) { g.strokeStyle = '#d2452f'; g.lineWidth = 3; g.beginPath(); g.arc(c.x * C, c.y * C, 7, 0, 7); g.stroke(); }
    }
    this.ovTex.needsUpdate = true;
  }
  setFocus(fc) { this.focusT = fc; }
  setSelection(o) { this.sel = o; }
  boundsOf(o) {
    if (!o) return null; const f = o.f || 0;
    if (o.w) return { x: o.x, y: o.y, w: o.w, h: o.h, f, H: o.type === 'shell' ? o.floors * FLOOR_H : o.type === 'office' ? 1.8 : o.type === 'canopy' ? 1.6 : 1.2 };
    if (o.type === 'gate') return { x: o.x - 1, y: o.y, w: 3, h: 1, f: 0, H: 1.5 };
    return { x: o.x, y: o.y, w: 1, h: 1, f, H: o.type === 'elevator' ? 2 * FLOOR_H : o.type === 'light' ? 2.7 : 1.1 };
  }

  // ================================================================ FRAME
  frame(dt) {
    const sim = this.sim, s = sim.s; this.time += dt;
    if (this.onFrame) this.onFrame(dt);
    if (Math.abs(this.targetAz - this.azimuth) > 1e-3) { this.azimuth += (this.targetAz - this.azimuth) * Math.min(1, dt * 8); this.updateCamera(); }
    if (s.structV !== this.lastStruct) { this.lastStruct = s.structV; sim.ensure(); this.rebuildStatic(); }
    else if (s.t - this.lastGroundT >= 60) { this.lastGroundT = s.t; this.drawGround(); }
    if (this.overlay && (this.lastOv < 0 || this.time - this.lastOv > 0.5)) { this.lastOv = this.time; this.drawOverlay(); }
    const night = this.updateSky(dt);
    this.updateAnim(dt, night);
    this.updateDynamic(dt);
    // focus ring
    const fc = this.focusT;
    if (fc && (fc.obj || fc.cell)) {
      const o = fc.obj && s.objects[fc.obj]; const b = o ? this.boundsOf(o) : { x: fc.cell.x, y: fc.cell.y, w: 1, h: 1, f: fc.f || 0 };
      if (b) { const sz = Math.max(b.w, b.h) + 0.8 + Math.sin(this.time * 4) * 0.15; this.focus.visible = true; this.focus.scale.set(sz, sz, 1); this.focus.position.set(b.x + b.w / 2, (b.f || 0) * FLOOR_H + 0.08, b.y + b.h / 2); }
    } else this.focus.visible = false;
    const so = this.sel && s.objects[this.sel]; const sb = so && this.boundsOf(so);
    if (sb) { this.selMesh.visible = true; this.selMesh.scale.set(sb.w + 0.08, sb.H + 0.08, sb.h + 0.08); this.selMesh.position.set(sb.x + sb.w / 2, sb.f * FLOOR_H + sb.H / 2, sb.y + sb.h / 2); }
    else this.selMesh.visible = false;
    if (this.fx) this.fx.update(dt);
    if (this.post && this.post.active()) this.post.render(this.scene, this.camera); else this.r.render(this.scene, this.camera);
  }
}
