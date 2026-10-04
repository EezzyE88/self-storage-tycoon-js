import { loadRenderer } from './renderer-fixture.mjs';
// Actual Three.js scene construction with a stubbed GPU and canvas. This is NOT an FPS/GPU benchmark.
import { performance } from 'node:perf_hooks';
import { makeMaple } from '../../js/maple.js';
import { makeSandbox } from '../../js/scenarios.js';
import { buildMaxLot } from '../stress/maxlot.mjs';
const base = process.argv[2];
const Renderer = await loadRenderer(base);
const warnings=[]; console.warn=(...a)=>warnings.push(a.join(' '));
const stats = root => { let meshes=0,casters=0,triangles=0; const geo=new Set(),mat=new Set(); root.traverse(o=>{if(o.isMesh){meshes++;casters+=!!o.castShadow;triangles+=(o.geometry.index?.count || o.geometry.attributes.position.count)/3*(o.count||1);geo.add(o.geometry);mat.add(o.material)}}); return { meshes, shadowCasters:casters, sceneTriangles:triangles, uniqueGeometries:geo.size, uniqueMaterialRefs:mat.size }; };
const results={ environment:'Node scene construction; mocked WebGL/canvas, no GPU, no physical Safari', source:base||'working tree', scenes:{} };
for(const name of ['maple','dense']) {
 const state=name==='maple'?makeMaple(20261004):makeSandbox({kind:'free',instant:true,seed:20261004});
 const sim=state; if(name==='dense')buildMaxLot(sim,{aisleW:1});
 const r=new Renderer({clientWidth:393,clientHeight:720},sim); const start=performance.now(); r.rebuildStatic();
 results.scenes[name]={units:sim.objs('unit').length,...stats(r.staticG),rebuildCpuMs:+(performance.now()-start).toFixed(2)};
 if(name==='maple') {
 let created=0,disposed=0;const make=r.personMesh.bind(r);r.personMesh=a=>{const before=r.customerFree?.length||0;const m=make(a);if(!before)created++;return m};const dispose=r.disposeTree.bind(r);r.disposeTree=m=>{disposed++;dispose(m)};
 const t=performance.now();for(let batch=0;batch<200;batch++){const people=Array.from({length:20},(_,i)=>({id:batch*20+i,kind:'cust',look:batch*20+i}));r.syncPool(r.pool.ppl,people,a=>r.personMesh(a),()=>{},.016);r.syncPool(r.pool.ppl,[],a=>r.personMesh(a),()=>{},.016)}
 results.customerChurn={customers:4000,peakConcurrent:20,createdGroups:created,disposedGroups:disposed,retainedGroups:r.customerFree?.length||0,cpuMs:+(performance.now()-t).toFixed(2)};
 }
}
if(warnings.length)throw Error(warnings.join('\n'));
console.log(JSON.stringify(results,null,2));
