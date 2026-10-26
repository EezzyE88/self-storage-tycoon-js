import assert from 'node:assert/strict';
import {Sim,newState} from '../../js/sim.js';
import {TOOLS,SIZES,G} from '../../js/data.js';
import {UI} from '../../js/ui.js';
const fresh=()=>{const sim=new Sim(newState({mode:'sandbox',creative:true}));sim.s.tut={on:false,done:true};sim.ensure();return sim};
// Unit rotation now anchors the touched door-edge corner; these fixtures retain their original footprints.
const anchor=(x,y,r,sz)=>({x:x+(r===1?sz.d-1:0),y:y+(r===2?sz.d-1:0)});
let checks=0;const test=(n,fn)=>{fn();checks++;console.log('PASS '+n)};
for(const tool of Object.keys(TOOLS).filter(k=>TOOLS[k].unit && k.startsWith('du')))for(let rotation=0;rotation<4;rotation++)test(`${tool} single corner orientation ${rotation}`,()=>{
 const sim=fresh(),sz=SIZES[TOOLS[tool].size],p=sim.s.parcel;
 const w=rotation%2?sz.d:sz.w,h=rotation%2?sz.w:sz.d;
 // Fit each orientation exactly against a parcel corner, without stretching to two units.
 for(const [x,y]of [[p.x0,p.y0],[p.x1-w+1,p.y0],[p.x0,p.y1-h+1],[p.x1-w+1,p.y1-h+1]]) {
  const touch=anchor(x,y,rotation,sz),args={tool,a:touch,b:touch,rotation};const r=sim.plan(args);
  assert.notEqual(r.status,'invalid',r.reasons.join(';'));assert.equal(r.count,1);assert.deepEqual([r.units[0].x,r.units[0].y,r.units[0].w,r.units[0].h],[x,y,w,h]);
  assert.equal(r.cost,TOOLS[tool].cost);assert.equal(r.status,'incomplete','missing aisle remains required');
  const outside=anchor(p.x1-w+2,p.y1-h+2,rotation,sz);
  const off=sim.plan({...args,a:outside,b:outside});assert.equal(off.status,'invalid');
 }
});
for(let rotation=0;rotation<4;rotation++)test(`interior orientation ${rotation} preserves hallway requirement`,()=>{
 const sim=fresh(),args={tool:'iu5x10',a:{x:10,y:10},b:{x:10,y:10},rotation};
 assert.equal(sim.plan(args).status,'invalid');
 sim.s.objects[sim.s.nextId++]={id:sim.s.nextId-1,type:'shell',x:6,y:6,w:16,h:16,floors:1,f:0,cstate:'operating'};sim.dirty=true;sim.ensure();
 let r=sim.plan(args);assert.equal(r.status,'invalid');assert.ok(r.reasons.some(s=>s.includes('hallway frontage')));
 for(const c of sim.unitFront(r.units[0]))if(sim.inb(c.x,c.y))sim.s.hall[0][sim.idx(c.x,c.y)]=1;
 sim.dirty=true;sim.ensure();r=sim.plan(args);assert.notEqual(r.status,'invalid',r.reasons.join(';'));
});
function uiFixture(tool){const sim=fresh(),ui=Object.create(UI.prototype);ui.g={sim,rend:{view:'ext',setPreview(){}}};ui.tool=tool;ui.buildRotation=null;ui.flip=false;ui.canRush=()=>false;ui.renderActionBar=()=>{};return{sim,ui};}
for(const tool of Object.keys(TOOLS).filter(k=>TOOLS[k].unit))test(`${tool} four rotations preserve row count, cost, time and state`,()=>{
 const {sim,ui}=uiFixture(tool);ui.planArgs={a:{x:10,y:10},b:{x:18,y:10}};ui.replan();const n=ui.plan.count,cost=ui.plan.cost,t=sim.s.t,state=JSON.stringify(sim.s);const origin={...ui.planArgs.a};
 let first;
 for(let k=0;k<5;k++){ui.rotateBuild();assert.equal(ui.plan.count,n);assert.equal(ui.plan.cost,cost);assert.deepEqual(ui.planArgs.a,origin);if(k===0)first=JSON.stringify(ui.plan.units);if(k===4)assert.equal(JSON.stringify(ui.plan.units),first);}
 assert.equal(sim.s.t,t);assert.equal(JSON.stringify(sim.s),state);
});
for(const tool of Object.keys(TOOLS).filter(k=>TOOLS[k].shape==='rect'))test(`${tool} rectangle rotation swaps footprint without buying`,()=>{
 const {sim,ui}=uiFixture(tool);ui.planArgs={a:{x:12,y:12},b:{x:17,y:14}};ui.replan();const state=JSON.stringify(sim.s);ui.rotateBuild();assert.deepEqual(ui.planArgs,{a:{x:12,y:12},b:{x:14,y:17}});for(let i=0;i<3;i++)ui.rotateBuild();assert.deepEqual(ui.planArgs,{a:{x:12,y:12},b:{x:17,y:14}});assert.equal(JSON.stringify(sim.s),state);
});
for(let rotation=0;rotation<4;rotation++)test(`office ${rotation} footprint and explicit access side survive build/save`,()=>{
 const sim=fresh(),args={tool:'office',a:{x:10,y:10},b:{x:10,y:10},rotation},r=sim.plan(args),o=r.creates[0];assert.notEqual(r.status,'invalid');assert.deepEqual([o.w,o.h],rotation%2?[4,5]:[5,4]);assert.deepEqual(o.door.dir,[[0,-1],[1,0],[0,1],[-1,0]][rotation]);
 assert.ok(sim.dispatch({type:'build',...args}).ok);const restored=new Sim(JSON.parse(JSON.stringify(sim.s)));assert.deepEqual(restored.objs('office')[0].door,o.door);
});
test('occupied footprint blocks each rotation and failed build spends nothing',()=>{
 const sim=fresh();const a={tool:'du5x10',a:{x:10,y:10},b:{x:10,y:10},rotation:0};assert.ok(sim.dispatch({type:'build',...a}).ok);
 for(let rotation=0;rotation<4;rotation++){const state=JSON.stringify(sim.s);const p=sim.plan({...a,rotation});assert.equal(p.status,'invalid');assert.equal(sim.dispatch({type:'build',...a,rotation}).ok,false);assert.equal(JSON.stringify(sim.s),state);}
});
console.log(`${checks} buildability groups passed`);
