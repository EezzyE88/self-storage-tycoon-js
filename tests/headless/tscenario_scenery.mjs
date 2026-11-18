// Real Three.js scene construction under the existing CPU harness. No rendered/GPU claim.
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {registerHooks} from 'node:module';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeScenario} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
registerHooks({resolve(specifier, context, next) {
  return specifier === 'three' ? {url:new URL('../../vendor/three.module.min.js',import.meta.url).href,shortCircuit:true} : next(specifier,context);
}});
const THREE = await import('three');
const Renderer = await loadRenderer();
const digest = (r, includeColor = true) => {
  const objects = [];
  r.envG.traverse(o => {if(o.isInstancedMesh) objects.push([o.geometry.type,includeColor ? o.material.color.getHex() : null,Array.from(o.instanceMatrix.array)]);});
  return createHash('sha256').update(JSON.stringify(objects)).digest('hex');
};
const rows = [], signatures = new Set(), geometrySignatures = new Set();
for (const id of ['comeback','turnaround','vertical','climate']) {
  const sim = makeScenario(id); sim.s.speed = 0;
  const before = JSON.stringify(sim.s), r = new Renderer({clientWidth:390,clientHeight:844},sim);
  r.rebuildStatic();
  assert.equal(JSON.stringify(sim.s),before,id+' render must not mutate cash, clock, Pause, goals or any saved state');
  assert.equal(r.envG.children[0].name,'scenery-'+id);
  let meshes = 0, instances = 0;
  r.envG.traverse(o => {
    if (!o.isInstancedMesh) return;
    meshes++; instances += o.count;
    assert.equal(o.castShadow,false,'background must not add shadow-map draws');
    o.geometry.computeBoundingBox();
    for (let n=0;n<o.count;n++) {
      const m=new THREE.Matrix4(); o.getMatrixAt(n,m);
      const b=o.geometry.boundingBox.clone().applyMatrix4(m),p=sim.s.parcel;
      assert.ok(b.max.x<=p.x0-1.19 || b.min.x>=p.x1+1.19 || b.max.z<=p.y0-1.19 || b.min.z>=p.y1+1.19,id+' scenery must stay off the playable parcel and boundary');
      assert.ok(b.max.z<=p.y1+.51,id+' entrance foreground must stay open');
    }
  });
  assert.ok(meshes<=20,'bounded background material/draw batches');
  const signature=digest(r); signatures.add(signature); geometrySignatures.add(digest(r,false));
  r.clearGroup(r.envG); r.buildEnvironment(); assert.equal(digest(r),signature,'deterministic scenery');
  const saved=JSON.stringify(sim.s), restored=new Sim(JSON.parse(saved));
  r.sim=restored; r.resizeWorld();
  assert.equal(digest(r),signature,'existing scenario identity restores setting without a new save field');
  assert.equal(JSON.stringify(sim.s),before,'rebuilding and restoring setting must remain read-only');
  rows.push({id,meshes,instances,signature});
}
assert.equal(signatures.size,4,'four distinct settings');
assert.equal(geometrySignatures.size,4,'geometry and placement differ independently of palette');

const sim=makeScenario('comeback'),r=new Renderer({clientWidth:375,clientHeight:667},sim);
const oldMaterials=[];r.envG.traverse(o=>{if(o.material)oldMaterials.push(o.material);});
let disposals=0;for(const m of oldMaterials)m.addEventListener('dispose',()=>disposals++);
r.sim=makeScenario('turnaround');r.resizeWorld();
assert.equal(r.envG.children[0].name,'scenery-turnaround','same-sized property switch changes setting');
assert.equal(disposals,oldMaterials.length,'old background materials released');
r.sim=makeMaple();r.resizeWorld();
assert.equal(r.environment,null,'normal Maple keeps its original environment');
assert.equal(r.outer.material.color.getHexString(),'86b85a','original outer terrain restored');
assert.ok(r.envG.children.length>1,'original environment builder retained');
r.sim=makeScenario('vertical');r.resizeWorld();
assert.equal(r.worldW,36);assert.equal(r.worldH,28);assert.equal(r.envG.children[0].name,'scenery-vertical');
assert.equal(r.ground.geometry.parameters.width,36,'different-sized property rebuilds ground planes');
console.log('PASS four distinct settings; unchanged serialized state/Pause; old-save derivation; outside-parcel geometry; deterministic batching; same-size/default/resized switches; material disposal');
console.log(JSON.stringify({environment:'CPU scene construction only; no rendered phone, GPU/FPS or enjoyment result',scenes:rows},null,2));
