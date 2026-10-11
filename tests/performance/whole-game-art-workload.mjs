// Scene counts only: no physical FPS/GPU/thermal claims.
import assert from 'node:assert/strict';
import {loadRenderer} from './renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox} from '../../js/scenarios.js';
import {buildMaxLot} from '../stress/maxlot.mjs';
const Base=await loadRenderer('f70b81a0298a438577db1ee35934655e7858353f'),Next=await loadRenderer();
function stats(r){let meshes=0,triangles=0,shadowCasters=0;const mats=new Set(),textures=new Set();r.scene.traverse(o=>{if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);shadowCasters+=+o.castShadow;for(const m of Array.isArray(o.material)?o.material:[o.material]){mats.add(m);if(m.map)textures.add(m.map);}});return{meshes,triangles,shadowCasters,materials:mats.size,mappedTextures:textures.size};}
const report={environment:'Node scene construction with Canvas/WebGL stubs. Actual WebGL captures are recorded separately. No GPU/performance acceptance.',baseline:'f70b81a0298a438577db1ee35934655e7858353f',scenes:{}};
for(const name of ['maple','dense']){
 const sm=name==='dense'?makeSandbox({kind:'free',instant:true,seed:4401}):makeMaple(4401);if(name==='dense')buildMaxLot(sm,{aisleW:1});sm.ensure();const before=JSON.stringify(sm.s);
 const views=[new Base({clientWidth:393,clientHeight:844},sm),new Next({clientWidth:393,clientHeight:844},sm)];
 const s=views.map(r=>{r.rebuildStatic();r.updateAnim(.016,0);return stats(r);});
 assert.equal(JSON.stringify(sm.s),before);assert.ok(s[1].shadowCasters<=s[0].shadowCasters+1);
 report.scenes[name]={units:sm.objs('unit').length,baseline:s[0],candidate:s[1],meshIncrease:s[1].meshes-s[0].meshes,triangleIncrease:s[1].triangles-s[0].triangles};
}
console.log(JSON.stringify(report,null,2));
