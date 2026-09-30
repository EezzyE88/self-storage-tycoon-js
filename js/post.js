// Miniature lens: one full-screen pass over the rendered scene.
// Tilt-shift focus band (miniature-diorama depth of field), soft glow on bright lamps at night,
// a light colour grade and vignette. Presentation only. Never reads or writes simulation state.
import * as THREE from 'three';

const LOOKS = { natural: 0, film: 1, cool: 2, mono: 3, vivid: 4 };

const FRAG = /* glsl */`
precision highp float;
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float focusY, band, blurPx, glow, vign, grainAmt, time, exposure;
uniform int look;
varying vec2 vUv;

float ign(vec2 p) { return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
vec3 tap(vec2 uv) { return texture2D(tDiffuse, clamp(uv, vec2(0.0005), vec2(0.9995))).rgb; }

vec3 lod(vec2 uv, float l) { return textureLod(tDiffuse, clamp(uv, vec2(0.0005), vec2(0.9995)), l).rgb; }

void main() {
  vec2 px = 1.0 / res;
  vec3 base = tap(vUv);
  float d = abs(vUv.y - focusY);
  float k = smoothstep(band, band + 0.32, d);
  float r = k * blurPx;
  vec3 col = base;
  if (r > 0.5) { // mip-chain blur: smooth and cheap; four rotated taps hide the mip blockiness
    float l = log2(max(r, 1.0)) * 0.85;
    float a = ign(gl_FragCoord.xy) * 1.5708;
    vec2 o1 = vec2(cos(a), sin(a)) * r * 0.55 * px, o2 = vec2(-o1.y, o1.x);
    vec3 b = (lod(vUv + o1, l) + lod(vUv - o1, l) + lod(vUv + o2, l) + lod(vUv - o2, l)) * 0.25;
    col = mix(base, b, smoothstep(0.5, 2.5, r));
  }
  if (glow > 0.001) { // soft bloom from the mip chain: bright lamps and headlights bleed a warm halo
    vec3 g1 = max(lod(vUv, 2.5) - vec3(0.8), vec3(0.0));
    vec3 g2 = max(lod(vUv, 4.5) - vec3(0.55), vec3(0.0));
    col += (g1 * 0.9 + g2 * 1.4) * glow;
  }
  col *= exposure;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  vec3 c = gl_FragColor.rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (look == 1) { c = mix(vec3(l), c, 0.9); c = c * vec3(1.06, 1.0, 0.9) + vec3(0.025, 0.015, 0.0); c = mix(c, smoothstep(0.0, 1.0, c), 0.35); }
  else if (look == 2) { c = c * vec3(0.93, 1.0, 1.08); c = mix(vec3(l), c, 0.92); }
  else if (look == 3) { c = vec3(smoothstep(-0.05, 1.05, l)); c *= vec3(1.02, 1.0, 0.97); }
  else if (look == 4) { c = mix(vec3(l), c, 1.28); c = mix(c, smoothstep(0.0, 1.0, c), 0.25); }
  else { c = mix(vec3(l), c, 1.06); }
  vec2 q = vUv - 0.5; q.x *= res.x / res.y;
  c *= 1.0 - vign * smoothstep(0.35, 1.05, length(q));
  c += (ign(gl_FragCoord.xy * 1.37 + time * 31.0) - 0.5) * grainAmt;
  gl_FragColor = vec4(clamp(c, 0.0, 1.0), 1.0);
}`;

export class PostFX {
  constructor(rend) {
    this.rend = rend; const r = rend.r;
    const gl = r.getContext();
    const half = r.extensions.has('EXT_color_buffer_half_float') || r.extensions.has('EXT_color_buffer_float');
    this.rt = new THREE.WebGLRenderTarget(4, 4, { type: half ? THREE.HalfFloatType : THREE.UnsignedByteType, samples: rend.mobile ? 0 : 4, depthBuffer: true });
    this.rt.texture.minFilter = THREE.LinearMipmapLinearFilter; this.rt.texture.magFilter = THREE.LinearFilter; this.rt.texture.generateMipmaps = true;
    this.u = {
      tDiffuse: { value: this.rt.texture }, res: { value: new THREE.Vector2(4, 4) },
      focusY: { value: 0.5 }, band: { value: 0.2 }, blurPx: { value: 0 }, glow: { value: 0 }, vign: { value: 0.18 },
      grainAmt: { value: 0.012 }, time: { value: 0 }, exposure: { value: 1 }, look: { value: 0 },
    };
    this.mat = new THREE.ShaderMaterial({ uniforms: this.u, vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }', fragmentShader: FRAG, depthTest: false, depthWrite: false });
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat); this.quad.frustumCulled = false;
    this.qs = new THREE.Scene(); this.qs.add(this.quad); this.qc = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    // live settings (lerped toward targets so switching modes glides)
    this.mode = 'subtle'; // 'off' | 'subtle' (gameplay) | 'strong' (photo / cinematic)
    this.look = 'natural'; this.focus = 0.52; this.strength = 1; this.cur = { blur: 0, band: 0.3, vign: 0.16 };
    this.ok = !!gl; this.failed = false;
    this.resize();
  }
  active() { return this.ok && !this.failed && this.mode !== 'off' && this.rend.quality >= 2; }
  resize() {
    const v = this.rend.r.getDrawingBufferSize(new THREE.Vector2());
    const w = Math.max(4, v.x), h = Math.max(4, v.y);
    if (this.rt.width !== w || this.rt.height !== h) this.rt.setSize(w, h);
    this.u.res.value.set(w, h);
  }
  render(scene, camera) {
    const r = this.rend.r, dt = 1 / 60;
    const strong = this.mode === 'strong';
    const H = this.u.res.value.y, scale = H / 900; // blur radius tracks resolution
    const tgtBlur = (strong ? 9 * this.strength : 3.2) * scale;
    const tall = H > this.u.res.value.x * 1.2 ? 1.35 : 1; // portrait phones: keep more of the diorama sharp
    const tgtBand = (strong ? 0.1 + (1 - this.strength) * 0.18 : 0.3) * tall;
    const tgtVign = strong ? 0.3 : 0.16;
    const a = this.snapNext ? 1 : 0.12; this.snapNext = false; this.cur.blur += (tgtBlur - this.cur.blur) * a; this.cur.band += (tgtBand - this.cur.band) * a; this.cur.vign += (tgtVign - this.cur.vign) * a;
    this.u.blurPx.value = this.cur.blur; this.u.band.value = this.cur.band; this.u.vign.value = this.cur.vign;
    this.u.focusY.value = strong ? this.focus : 0.5;
    this.u.glow.value = Math.max(0, (this.rend.nightK || 0) - 0.15) * 1.3; // lamps only bloom after dusk
    this.u.grainAmt.value = strong ? 0.018 : 0.01;
    this.u.look.value = LOOKS[this.look] ?? 0;
    this.u.time.value = (this.u.time.value + dt) % 100;
    try {
      r.setRenderTarget(this.rt); r.render(scene, camera); r.setRenderTarget(null);
      r.render(this.qs, this.qc);
    } catch (e) { console.warn('post disabled', e); this.failed = true; r.setRenderTarget(null); r.render(scene, camera); }
  }
}
export const LOOK_NAMES = { natural: 'Natural', film: 'Warm film', cool: 'Blue hour', vivid: 'Vivid', mono: 'Mono' };
