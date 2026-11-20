process.on('uncaughtException',e=>{console.error(e.stack.replace(/data:[^\s)]+/g,'<scene module>'));process.exit(1);});
// Office fit-out: decoration-only parts inside the existing footprint, for every door side and position.
// Real Three.js scene graph with stubbed Canvas/GPU. No rendering/device claim.
import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
const {loadRenderer}=await import('../performance/renderer-fixture.mjs');
const Next=await loadRenderer();
let passed=0;const test=(name,fn)=>{fn();passed++;console.log('PASS',name);};
const warnings=[];console.warn=(...a)=>warnings.push(a.join(' '));
const sim=makeMaple(4401);sim.ensure();sim.s.speed=0;
const state=JSON.stringify(sim.s),r=new Next({clientWidth:390,clientHeight:844},sim);
r.rebuildStatic();
const office=Object.getPrototypeOf(r.openHouse).office;
const build=o=>{const parts=[];office.call({room(){},part(_o,kind,x,y,z,w,h,d){parts.push({kind,x,y,z,w,h,d});}},o);return parts;};
// Every legal door: each side of a 5x4 footprint (both rotations) and each cell along that side.
const configs=[];
for(const [w,h] of [[5,4],[4,5]])for(const dir of [[1,0],[-1,0],[0,1],[0,-1]]){
  const ox=10,oy=10,len=dir[0]?h:w;
  for(let k=0;k<len;k++)configs.push({type:'office',x:ox,y:oy,w,h,f:0,door:{dir,x:dir[0]?(dir[0]>0?ox+w:ox-1):ox+k,y:dir[1]?(dir[1]>0?oy+h:oy-1):oy+k}});
}
const ext=p=>({x0:p.x-p.w/2,x1:p.x+p.w/2,y0:p.y-p.h/2,y1:p.y+p.h/2,z0:p.z-p.d/2,z1:p.z+p.d/2});
test('Maple scene builds the fit-out without warnings or game-state writes',()=>{
  assert.equal(warnings.length,0,warnings.join('\n'));
  assert.equal(JSON.stringify(sim.s),state,'scene build cannot write game state');
  const kinds=new Set([...r.openHouse.batches.values()].map(b=>b.kind));
  for(const k of ['ohCounter','ohScreen','ohSofa','ohCrate','ohTape','darkMetal','stair','officeTrim'])assert.ok(kinds.has(k),k);
});
test('every door configuration keeps all parts inside the footprint, on the floor and below the wall',()=>{
  for(const o of configs){const ps=build(o);assert.ok(ps.length>=30,'parts '+ps.length);
    for(const p of ps){const e=ext(p);
      assert.ok(e.x0>=o.x+.06-1e-9&&e.x1<=o.x+o.w-.06+1e-9&&e.z0>=o.y+.06-1e-9&&e.z1<=o.y+o.h-.06+1e-9,p.kind+' outside '+JSON.stringify(o.door));
      assert.ok(e.y0>=.1-1e-9,p.kind+' below floor slab');assert.ok(e.y1<=1.5+1e-9,p.kind+' taller than 1.5');
      assert.ok(p.w>0&&p.h>0&&p.d>0,p.kind+' degenerate');}}
});
test('the cell inside the door stays clear in every configuration',()=>{
  for(const o of configs){const d=o.door.dir,cx=o.door.x-d[0],cz=o.door.y-d[1];
    for(const p of build(o)){const e=ext(p);assert.ok(e.x1<=cx+1e-9||e.x0>=cx+1-1e-9||e.z1<=cz+1e-9||e.z0>=cz+1-1e-9,p.kind+' in door landing '+JSON.stringify(o.door));}}
});
test('no two parts intersect (stacked or touching parts allowed)',()=>{
  const t=.005;
  for(const o of configs){const es=build(o).map(p=>({p,e:ext(p)}));
    for(let a=0;a<es.length;a++)for(let b=a+1;b<es.length;b++){const A=es[a].e,B=es[b].e;
      const hit=A.x0<B.x1-t&&B.x0<A.x1-t&&A.y0<B.y1-t&&B.y0<A.y1-t&&A.z0<B.z1-t&&B.z0<A.z1-t;
      assert.ok(!hit,es[a].p.kind+' x '+es[b].p.kind+' '+JSON.stringify(o.door)+' '+o.w+'x'+o.h);}}
});
test('counter faces the door across the full room and leaves a staff gate',()=>{
  for(const o of configs){const ps=build(o),c=ps.filter(p=>p.kind==='ohCounter').sort((a,b)=>b.w*b.d-a.w*a.d)[0],d=o.door.dir;
    const along=d[0]?c.d:c.w,room=d[0]?o.h:o.w;assert.ok(along>=room-1.2-1e-9&&along<=room-1+1e-9,'counter length '+along);
    const depthFromDoor=d[0]?(d[0]>0?o.x+o.w-c.x:c.x-o.x):(d[1]>0?o.y+o.h-c.z:c.z-o.y),D=d[0]?o.w:o.h;
    assert.ok(depthFromDoor>D-1.5&&depthFromDoor<D-1,'counter depth '+depthFromDoor);}
});
console.log('LIMIT: CPU scene graph only; WebGL pixels, Safari and physical iPhone not tested.');
console.log(`ALL PASS: ${passed} office fit-out groups (${configs.length} door configurations)`);
