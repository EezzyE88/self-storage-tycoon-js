// Player camera survives save/reload/Continue beside (not inside) the simulation state.
// Production saveJSON/prepareLoad/applyLoad/attach run in a vm with spies; the camera methods run on the real Renderer.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
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

await test('round trip restores rotation, zoom, center and floor; no phone re-fit; nothing left in sim state; still paused',async()=>{
  const {g,rend,calls,sim}=harness();sim.s.speed=2;const tut=JSON.stringify(sim.s.tut);
  rend.rotate(1);rend.rotate(1);rend.rotate(1);rend.zoom=1.7;rend.center.set(12.25,0,19.5);rend.view=0;
  const want={x:12.25,z:19.5,zoom:1.7,rot:3};const code=await g.saveCode();
  assert.deepEqual(savedCam(g),{v:1,...want});
  rend.rotate(1);rend.zoom=1;rend.center.set(1,0,1);calls.length=0;
  assert.equal(await g.loadCode(code,true),true);
  const c=cam(rend);assert.deepEqual({x:c.x,z:c.z,zoom:c.zoom,rot:c.rot},want);assert.equal(c.az,c.taz);assert.ok(Math.abs(c.az-(Math.PI/4+3*Math.PI/2))<1e-9);
  assert.equal(rend.view,0);assert.equal(g.sim.s.uiCam,undefined);assert.equal(g.sim.s.uiView,undefined);assert.equal(g.sim.s.speed,0);assert.equal(JSON.stringify(g.sim.s.tut),tut);
  assert.deepEqual(calls.map(c=>c[0]),['applyCamState'],'no default lookAt, no fitProperty and no 60 ms re-fit');
});
await test('saves without a camera (older builds, raw legacy JSON) keep the default framing',async()=>{
  const {g,rend,calls,sim}=harness();const legacy=JSON.stringify(sim.s);
  for(const code of [legacy,'SST0.'+btoa(unescape(encodeURIComponent(legacy)))]){calls.length=0;assert.equal(await g.loadCode(code,true),true);
    assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','timeout']);}
});
await test('invalid cameras are rejected without failing the load',async()=>{
  const {g,calls,sim}=harness();
  const bad=[NaN,'1',null,[1],{v:2,x:1,z:1,zoom:1,rot:0},{v:1,x:1,z:1,zoom:1,rot:5},{v:1,x:1,z:1,zoom:1,rot:1.5},{v:1,x:1,z:1,zoom:0,rot:0},{v:1,x:1,z:1,zoom:99,rot:0},
    {v:1,x:-9,z:1,zoom:1,rot:0},{v:1,x:1,z:sim.s.H+9,zoom:1,rot:0},{v:1,x:'1',z:1,zoom:1,rot:0},{v:1,x:1,z:1,zoom:1}];
  for(const c of bad){const s={...JSON.parse(JSON.stringify(sim.s)),uiCam:c};const p=await g.prepareLoad(JSON.stringify(s));assert.equal(p.ok,true);assert.equal(p.cam,null,JSON.stringify(c));
    calls.length=0;g.applyLoad(p,true);assert.equal(calls[0][0],'lookAt');assert.equal(g.sim.s.uiCam,undefined);}
});
await test('a save made mid-rotation records the settled rotation, and load does not resume the turn',async()=>{
  const {g,rend}=harness();rend.rotate(1);assert.notEqual(rend.azimuth,rend.targetAz,'turn still easing');
  const saved=savedCam(g);assert.equal(saved.rot,1);assert.equal('azimuth' in saved,false);
  assert.equal(await g.loadCode(g.saveJSON(),true),true);assert.equal(rend.rot,1);assert.equal(rend.azimuth,rend.targetAz);
});
await test('tour, follow, attract and photo cameras are never saved; the last player camera is kept',async()=>{
  const {g,rend}=harness();rend.zoom=1.3;rend.center.set(10,0,10);g.showcase={mode:null,photo:false};
  assert.equal(savedCam(g).zoom,1.3);
  for(const sc of [{mode:'tour'},{mode:'follow'},{mode:'attract'},{mode:null,photo:true}]){g.showcase=sc;rend.zoom=3.9;rend.center.set(30,0,5);
    const c=savedCam(g);assert.equal(c.zoom,1.3);assert.equal(c.x,10);}
  const fresh=harness();fresh.g.showcase={mode:'tour'};assert.equal(savedCam(fresh.g),undefined,'no player camera yet: none written');
});
await test('portfolio saves restore the active property camera and strip it from every property',async()=>{
  const {g,rend}=harness();const other=makeMaple(9);g.company={props:[{name:'A',sim:g.sim},{name:'B',sim:other}],active:0,feed:[]};
  rend.zoom=2.2;rend.center.set(14,0,12);const json=JSON.parse(g.saveJSON());json.props[1].s.uiCam={v:1,x:3,z:3,zoom:1,rot:2};
  const p=await g.prepareLoad(JSON.stringify(json));assert.equal(p.ok,true);assert.equal(p.cam.zoom,2.2);
  for(const q of p.company.props){assert.equal(q.sim.s.uiCam,undefined);assert.equal(q.sim.s.uiView,undefined);}
});
await test('switching properties and new games keep today\'s framing',async()=>{
  const {g,calls}=harness();calls.length=0;g.attach(makeMaple(3),'switch');assert.deepEqual(calls.map(c=>c[0]),['lookAt','fitProperty','timeout']);
  assert.equal(g.lastCam,null);
});
console.log(`${n} camera save checks passed`);
