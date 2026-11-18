// Opening camera for Go Vertical and Climate Boom: production attach/saveJSON/loadCode in a vm, real Renderer.
// Presentation only: a new phone start centres the office and entrance with the neighbouring setting in view; saved cameras and player controls unchanged.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName,makeScenario} from '../../js/scenarios.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
let n=0;const test=async(name,f)=>{await f();console.log('PASS '+name);n++;};
const Renderer=await loadRenderer();

function harness(){
  const main=readFileSync('js/main.js','utf8');const calls=[];const timers=[];
  const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},
    localsave:{ok:false},savearchive:{},cloud:{ok:false},installTutorial(){},window:{innerWidth:390},setTimeout:(f,ms)=>{timers.push([f,ms]);calls.push(['timeout',ms]);},
    CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
  const g=context.game;
  const sim=makeMaple(7);const rend=new Renderer({clientWidth:390,clientHeight:844},sim);
  rend.setSim=function(s){this.sim=s;};
  for(const k of ['lookAt','fitProperty','applyCamState']){const orig=rend[k].bind(rend);rend[k]=(...a)=>{calls.push([k]);return orig(...a);};}
  g.rend=rend;g.ui={title:false,phone:()=>true,safeRect:()=>({top:60,bottom:700,left:8,right:382}),tool:null,setTab(){},resetSession(v){rend.view=v??'ext';},renderActionBar(){},setMeta(){},renderTut(){},renderFeed(){},onEvent(){}};
  g.beginSaveSession=()=>{};g.metaName=()=>'Maple Street Storage';
  g.sim=sim;g.company={props:[{name:'Maple Street Storage',sim}],active:0,feed:[]};
  return {g,rend,calls,timers,sim};
}
const savedCam=g=>{const j=JSON.parse(g.saveJSON());return j.company?j.props[j.active].s.uiCam:j.uiCam;};
const cam=r=>({x:r.center.x,z:r.center.z,zoom:r.zoom,rot:r.rot,az:r.azimuth,taz:r.targetAz});


const RECT={top:60,bottom:700,left:8,right:382};
const inRect=(r,x,y,z=0)=>{const p=r.project(x,y,z);return p.x>=RECT.left-0.5&&p.x<=RECT.right+0.5&&p.y>=RECT.top-0.5&&p.y<=RECT.bottom+0.5;};
const fresh=(id)=>{const h=harness();const s=id==='maple'?makeMaple(3):makeScenario(id);s.s.speed=0;h.g.company={props:[{name:id,sim:s}],active:0,feed:[]};h.g.metaName=()=>id;h.calls.length=0;h.g.attach(s,'sc:'+id);return {...h,s};};
const office=s=>Object.values(s.s.objects).find(o=>o.type==='office'),gate=s=>Object.values(s.s.objects).find(o=>o.type==='gate');
const sceneryOnScreen=r=>{let n=0;const m=new r.camera.matrixWorld.constructor();r.envG.traverse(o=>{if(!o.isInstancedMesh)return;for(let i=0;i<o.count;i++){o.getMatrixAt(i,m);const e=m.elements;const p=r.project(e[12],e[14],e[13]);if(p.x>=RECT.left&&p.x<=RECT.right&&p.y>=RECT.top&&p.y<=RECT.bottom)n++;}});return n;};
for(const id of ['vertical','climate']) await test(id+': opening keeps office and entrance central with the setting in view; the 60 ms phone re-fit keeps it',async()=>{
  const {rend,timers,calls,s}=fresh(id);const now=cam(rend);
  assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','timeout'],'one footprint fit inside the opening fit, then the delayed re-fit');
  const before=JSON.stringify(s.s);timers.forEach(([f])=>f());const after=cam(rend);
  for(const k of Object.keys(now))assert.ok(Math.abs(after[k]-now[k])<1e-9,'delayed re-fit lands on the same opening framing: '+k);
  assert.equal(JSON.stringify(s.s),before,'framing never touches simulation state');assert.equal(s.s.speed,0,'still paused');
  const o=office(s),g=gate(s);
  for(const x of [o.x,o.x+o.w])for(const y of [o.y,o.y+o.h])assert.ok(inRect(rend,x,y),'office on screen');
  assert.ok(inRect(rend,g.x+.5,g.y+.5),'entrance gate on screen');assert.ok(inRect(rend,g.x+.5,g.y+1.5),'street at the entrance on screen');
  const a=rend.project(o.x,o.y),b=rend.project(o.x+o.w,o.y+o.h);assert.ok(Math.hypot(b.x-a.x,b.y-a.y)>=40,'office large enough to recognise and tap');
  assert.ok(sceneryOnScreen(rend)>=8,'neighbouring setting visible: '+sceneryOnScreen(rend));
  const p=s.s.parcel,c=rend.center;assert.ok(c.x>p.x0&&c.x<p.x1+1&&c.z>p.y0&&c.z<p.y1+1,'zoom pivot is on the playable lot');
  const oc={x:o.x+o.w/2,z:o.y+o.h/2};assert.ok(Math.hypot(c.x-oc.x,c.z-oc.z)<Math.abs(c.z-(p.y0-7)),'zoom pivot nearer the office than the rear setting row');
  rend.zoomBy(1.25);assert.ok(inRect(rend,o.x+o.w/2,o.y+o.h/2),'first zoom-in keeps the office on screen');
  const plain=new Renderer({clientWidth:390,clientHeight:844},s);plain.rot=rend.rot;plain.azimuth=rend.azimuth;plain.fitProperty(RECT);
  assert.ok(now.zoom<plain.zoom*0.5,'wider than the office-only fit');
  assert.ok(Math.abs(rend.tapZoom.base-plain.tapZoom.base)<1e-9,'double-tap cycle keeps the normal footprint base');assert.equal(rend.tapZoom.step,0);
});
await test('Comeback, Turnaround and Maple keep their existing opening framing',async()=>{
  for(const id of ['comeback','turnaround','maple']){const {rend,calls}=fresh(id);assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','timeout']);
    assert.equal(rend.fitOpening(RECT),false);}
});
await test('Fit button still uses the footprint fit in the new settings',async()=>{
  const {rend,s}=fresh('vertical');const plain=new Renderer({clientWidth:390,clientHeight:844},s);plain.fitProperty(RECT);
  rend.fitProperty(RECT);assert.ok(Math.abs(rend.zoom-plain.zoom)<1e-9);
});
for(const id of ['vertical','climate']) await test(id+': a saved player camera restores exactly, with no opening fit or re-fit',async()=>{
  const {g,rend,calls}=fresh(id);rend.rotate(1);rend.rotate(1);rend.zoom=1.4;rend.center.set(14.5,0,11);rend.view='ext';
  const want={x:14.5,z:11,zoom:1.4,rot:2};const code=await g.saveCode();assert.deepEqual(savedCam(g),{v:1,...want});
  rend.rotate(1);rend.zoom=0.5;rend.center.set(1,0,1);calls.length=0;
  assert.equal(await g.loadCode(code,true),true);const c=cam(rend);
  assert.deepEqual({x:c.x,z:c.z,zoom:c.zoom,rot:c.rot},want);assert.deepEqual(calls.map(c=>c[0]),['applyCamState']);assert.equal(g.sim.s.speed,0);
});
console.log(`${n} opening camera checks passed`);
