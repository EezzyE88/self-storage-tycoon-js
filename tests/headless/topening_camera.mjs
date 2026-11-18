// Opening camera for Go Vertical and Climate Boom: production attach/saveJSON/loadCode in a vm, real Renderer.
// Presentation only: frames parcel + surrounding setting at a new phone start; saved cameras and player controls unchanged.
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
for(const id of ['vertical','climate']) await test(id+': opening frames the parcel and its setting; the 60 ms phone re-fit keeps it',async()=>{
  const {rend,timers,calls,s}=fresh(id);const now=cam(rend);
  assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','fitProperty','timeout'],'standard fit, then the opening fit, then the delayed re-fit');
  const before=JSON.stringify(s.s);timers.forEach(([f])=>f());const after=cam(rend);for(const k of Object.keys(now))assert.ok(Math.abs(after[k]-now[k])<1e-9,'delayed re-fit lands on the same opening framing: '+k);
  assert.equal(JSON.stringify(s.s),before,'framing never touches simulation state');assert.equal(s.s.speed,0,'still paused');
  const p=s.s.parcel;for(const x of [p.x0,p.x1+1])for(const y of [p.y0,p.y1+1])assert.ok(inRect(rend,x,y),'parcel corner on screen');
  for(const x of [p.x0,p.x1])assert.ok(inRect(rend,x,p.y0-7,3.5),'rear setting row on screen');
  const plain=new Renderer({clientWidth:390,clientHeight:844},s);plain.rot=rend.rot;plain.azimuth=rend.azimuth;plain.fitProperty(RECT);
  assert.ok(rend.zoom<plain.zoom*0.8,'measurably wider than the office-only fit');
  assert.equal(rend.tapZoom.base,plain.tapZoom.base,'double-tap cycle keeps the normal footprint base');assert.equal(rend.tapZoom.step,0);
});
await test('Comeback, Turnaround and Maple keep their existing opening framing',async()=>{
  for(const id of ['comeback','turnaround','maple']){const {rend,calls,s}=fresh(id);assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','timeout']);
    const plain=new Renderer({clientWidth:390,clientHeight:844},s);plain.zoom=rend.zoom;plain.center.copy(rend.center);
    assert.equal(rend.fitOpening(RECT),false);}
});
await test('Fit button and double-tap still use the footprint fit in the new settings',async()=>{
  const {rend,s}=fresh('vertical');const plain=new Renderer({clientWidth:390,clientHeight:844},s);plain.fitProperty(RECT);
  rend.fitProperty(RECT);assert.equal(rend.zoom,plain.zoom);
});
for(const id of ['vertical','climate']) await test(id+': a saved player camera restores exactly, with no opening fit or re-fit',async()=>{
  const {g,rend,calls}=fresh(id);rend.rotate(1);rend.rotate(1);rend.zoom=1.4;rend.center.set(14.5,0,11);rend.view='ext';
  const want={x:14.5,z:11,zoom:1.4,rot:2};const code=await g.saveCode();assert.deepEqual(savedCam(g),{v:1,...want});
  rend.rotate(1);rend.zoom=0.5;rend.center.set(1,0,1);calls.length=0;
  assert.equal(await g.loadCode(code,true),true);const c=cam(rend);
  assert.deepEqual({x:c.x,z:c.z,zoom:c.zoom,rot:c.rot},want);assert.deepEqual(calls.map(c=>c[0]),['applyCamState']);assert.equal(g.sim.s.speed,0);
});
console.log(`${n} opening camera checks passed`);
