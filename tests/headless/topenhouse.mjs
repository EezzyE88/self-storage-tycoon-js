process.on('uncaughtException',e=>{console.error(e.stack.replace(/data:[^\s)]+/g,'<scene module>'));process.exit(1);});
// Real Three.js scene graph with stubbed Canvas/GPU. No rendering/device claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {makeMaple} from '../../js/maple.js';
import {ensureFloors} from '../../js/vertical.js';

const ctx=new Proxy({}, {get:(o,k)=>k in o?o[k]:/Gradient/.test(k)?()=>({addColorStop(){}}):k==='measureText'?t=>({width:String(t).length*6}):()=>{},set:(o,k,v)=>(o[k]=v,true)});
globalThis.document={createElement:()=>({getContext:()=>ctx})};
globalThis.window={innerWidth:390,innerHeight:844,devicePixelRatio:3};
globalThis.matchMedia=()=>({matches:true});
globalThis.MockGPU=class{shadowMap={};setPixelRatio(){}setSize(){}};
async function load(file){let code=readFileSync(file,'utf8');code=code.replace(/from '([^']+)'/g,(_,p)=>'from '+JSON.stringify(pathToFileURL(p==='three'?process.cwd()+'/vendor/three.module.min.js':process.cwd()+'/js/'+p.replace('./','')).href));code=code.replace('new THREE.WebGLRenderer(','new globalThis.MockGPU(');return(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).Renderer;}
const {loadRenderer}=await import('../performance/renderer-fixture.mjs');
const Next=await loadRenderer();
const warnings=[];console.warn=(...a)=>warnings.push(a.join(' '));
const sim=makeMaple(4401);sim.ensure();sim.s.speed=0;
const state=JSON.stringify(sim.s),r=new Next({clientWidth:390,clientHeight:844},sim);
r.rebuildStatic();assert.equal(warnings.length,0,warnings.join('\n'));
assert.equal(JSON.stringify(sim.s),state,'scene build cannot write game state');
assert.ok(r.openHouse.batches.size>0);
const all=[...r.openHouse.batches.values()].flatMap(b=>b.parts);
assert.equal(all.filter(p=>p.wall).length,3*(sim.objs('unit').length+sim.objs('office').length));
assert.equal(all.filter(p=>p.kind==='roof').length,0);
for(const rotation of [0,Math.PI/2,Math.PI,Math.PI*1.5]){
 r.azimuth=rotation;r.updateCamera();r.openHouse.update();
 for(const b of r.openHouse.batches.values())for(let i=0;i<b.parts.length;i++){
  const p=b.parts[i];if(!p.wall)continue;
  const e=b.mesh.instanceMatrix.array.slice(i*16,i*16+16);
  assert.ok([...e].every(Number.isFinite));
  assert.ok(Math.abs(e[5]-.16)<1e-5 || Math.abs(e[5]-p.h)<1e-5);
 }
 for(const f of ['ext',0,1,2]){r.setView(f);for(const b of r.openHouse.batches.values())assert.equal(b.mesh.visible,f==='ext'||f===b.f);}
}
assert.equal(JSON.stringify(sim.s),state,'rotation/floor changes preserve Pause and complete state');
const u=sim.objs('unit')[0],old=u.lease;
u.lease=null;r.openHouse.update();
let checked=0;
for(const b of r.openHouse.batches.values())for(let i=0;i<b.parts.length;i++)if(b.parts[i].o===u&&b.parts[i].leased){assert.equal(b.mesh.instanceMatrix.array[i*16],0);checked++;}
assert.ok(checked>=3);u.lease=old;r.openHouse.update();
r.setView('ext');const saved=JSON.stringify(sim.s);
for(const h of [7,12,18.4,23]){r.todOverride=h;r.updateSky(.016);assert.ok(r.hemi.intensity>=.8);r.updateAnim(.016,r.nightK);r.updateDynamic(.016);}
assert.equal(JSON.stringify(sim.s),saved,'lighting/animation do not write game state');
const n=r.staticG.children.length;r.rebuildStatic();assert.equal(r.staticG.children.length,n,'rebuild does not accumulate decoration');
assert.equal(JSON.stringify(sim.s),saved);
const stats=renderer=>{let meshes=0,instances=0,casters=0;renderer.staticG.traverse(o=>{if(o.isMesh){meshes++;casters+=+o.castShadow;if(o.isInstancedMesh)instances+=o.count;}});return{meshes,instances,casters};};
const counts={candidate:stats(r)};
if(process.argv[2]){const Base=await load(process.argv[2]);const base=new Base({clientWidth:390,clientHeight:844},sim);base.rebuildStatic();counts.baseline=stats(base);
 for(const method of ['setPreview','boundsOf','pan','zoomAt','setView','applyView','updateDynamic','posePerson','doorFinish'])if(Base.prototype[method])assert.equal(Next.prototype[method].toString(),Base.prototype[method].toString(),method+' remains V62');
}
// Synthetic scene-only fixtures exercise every entrance direction and real
// upper-floor batches. They are not a claim of playing or constructing a site.
const fixture=makeMaple(4410),sample=fixture.objs('unit')[0];
for(const [i,dir] of [[0,[1,0]],[1,[0,1]],[2,[-1,0]],[3,[0,-1]]]){
 const id=fixture.s.nextId++;fixture.s.objects[id]={...structuredClone(sample),id,num:900+i,f:i%3,dir,w:1,h:1,lease:null};
}
fixture.objs('shell')[0].floors=3;ensureFloors(fixture.s,3);fixture.s.structV++;fixture.ensure();
const fixtureState=JSON.stringify(fixture.s),upper=new Next({clientWidth:375,clientHeight:667},fixture);upper.rebuildStatic();
for(const f of [0,1,2]){upper.setView(f);for(const b of upper.openHouse.batches.values())assert.equal(b.mesh.visible,f===b.f);}
for(const b of upper.openHouse.batches.values())for(const p of b.parts)if(p.leased){assert.ok(p.x-p.w/2>=p.o.x && p.x+p.w/2<=p.o.x+p.o.w);assert.ok(p.z-p.d/2>=p.o.y && p.z+p.d/2<=p.o.y+p.o.h);}
assert.equal(JSON.stringify(fixture.s),fixtureState);assert.equal(warnings.length,0,warnings.join('\n'));
console.log('PASS four entrance directions, 1x1 fixtures and occupied/empty contents remain within footprints on floors 0/1/2');
console.log('PASS Open House scene construction: four camera orientations, floor visibility, lease decoration, day/night, animation, rebuild stability and complete state isolation');
console.log(JSON.stringify({environment:'CPU scene graph; Canvas/GPU stubbed; WebGL and physical iPhone NOT TESTED',units:sim.objs('unit').length,batches:r.openHouse.batches.size,counts}));
