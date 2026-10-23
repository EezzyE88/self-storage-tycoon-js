// CPU-only regression: real scene/matrix and lamp-map code; Canvas/GPU are fixtures.
// No rendered WebGL, shader-compilation, mobile performance or Safari claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import * as THREE from '../../vendor/three.module.min.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeScenario,makeSandbox,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {installTutorial} from '../../js/tutorial.js';
import {portfolioCareer} from '../../js/career.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
const Renderer=await loadRenderer(process.argv[2]); // optional supplied, unfixed renderer for regression sensitivity
let writes=0;
function canvas(){
 const c={width:0,height:0};let pixels;
 const ctx=new Proxy({
  createImageData:(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)}),
  putImageData:(image,x,y)=>{writes++;if(!pixels||pixels.length!==c.width*c.height*4)pixels=new Uint8ClampedArray(c.width*c.height*4);for(let j=0;j<image.height;j++)pixels.set(image.data.subarray(j*image.width*4,(j+1)*image.width*4),((j+y)*c.width+x)*4);},
  getImageData:()=>({data:pixels?.slice()??new Uint8ClampedArray(c.width*c.height*4)}),
  measureText:t=>({width:String(t).length*6})
 },{get:(o,k)=>k in o?o[k]:/Gradient/.test(k)?()=>({addColorStop(){}}):()=>{},set:(o,k,v)=>(o[k]=v,true)});
 c.getContext=()=>ctx;return c;
}
globalThis.document={createElement:()=>canvas()};
const main=readFileSync('js/main.js','utf8');
// Exercise production property attachment, not a handwritten replacement.
new Function('Renderer',main.slice(main.indexOf('Renderer.prototype.setSim'),main.indexOf('const canvas =')))(Renderer);
const image=r=>r.lampCanvas.getContext('2d').getImageData().data.slice();
function parity(r,label){const incremental=image(r);r.lampLayout='';r.updateLampMap(r.nightK??1);assert.deepEqual(image(r),incremental,label+' must equal a full rebuild');}
function build(sim,tool,a,b=a){const result=sim.dispatch({type:'build',tool,a,b,f:0});assert.ok(result.ok,result.msg);sim.ensure();}
function lot(shell=false){
 const sim=makeSandbox({kind:'free',start:'empty',instant:true,tiers:'all'});
 build(sim,'light',{x:8,y:8});if(shell)build(sim,'shell1',{x:10,y:7},{x:12,y:9});return sim;
}
const scene=(sim,width=390,height=844)=>{
 const r=new Renderer({clientWidth:width,clientHeight:height},sim);
 r.r.render=()=>{};r.todOverride=0;r.setView(0);r.frame(.016);return r;
};
// Explicit fixture: Free Build / Instant. Action effects happen before read-only snapshots.
const sim=lot(),r=scene(sim);
let n=writes;r.frame(.016);assert.equal(writes,n,'unchanged lights should not redraw');
build(sim,'shell1',{x:10,y:7},{x:12,y:9});
let before=JSON.stringify(sim.s),events=JSON.stringify(sim.events);n=writes;r.frame(.016);
assert.ok(writes>n,'building-only structural change must invalidate lamp mask');parity(r,'building added');
assert.equal(JSON.stringify(sim.s),before);assert.equal(JSON.stringify(sim.events),events);
console.log('PASS real shell build refreshes interior mask through normal frame/rebuild path without presentation state writes');
// Equal dimensions and lamp coordinates intentionally reproduce the old cache collision.
const bare=lot(),covered=lot(true),snapshots=[bare,covered].map(s=>JSON.stringify(s.s));
for(const [index,next] of [[0,bare],[1,covered],[0,bare]]){
 const eventSnapshot=JSON.stringify(next.events);r.setSim(next);n=writes;r.frame(.016);
 assert.ok(writes>n,'same-sized property switch must redraw');parity(r,'property switch '+index);
 assert.equal(JSON.stringify(next.s),snapshots[index]);assert.equal(JSON.stringify(next.events),eventSnapshot);
}
console.log('PASS production property switch refreshes same-sized, same-lamp layouts with different building masks in both directions');
// Focus on the supplied map algorithm: lamp changes, pixels and redraw avoidance.
const p=Object.create(Renderer.prototype);
p.sim={s:{W:12,H:12},D:{shellAt:new Int32Array(144)}};p.anim=[{k:'light',o:{x:4,y:4},pool:1,glow:null}];
p.lampU={uLampK:{value:0},uLampMap:{value:null}};p.lampLayout='';p.view=0;p.updateLampMap(1);
for(const [label,mutate] of [
 ['off',()=>p.anim[0].pool=0],['on',()=>p.anim[0].pool=1],
 ['added',()=>p.anim.push({k:'light',o:{x:7,y:5},pool:1,glow:null})],
 ['moved',()=>p.anim[0].o.x=3],['removed',()=>p.anim.shift()],
 ['flicker',()=>p.anim[0].pool=.25],['all removed',()=>p.anim=[]]
]){n=writes;mutate();p.updateLampMap(1);assert.ok(writes>n,label+' invalidates');parity(p,label);}
assert.ok([...image(p)].every((v,i)=>i%4===3||v===0),'removed lamps leave no residual light');
console.log('PASS lamp on/off, add/remove/move, flicker and empty layout match full pixel rebuilds');
for(const [width,height] of [[375,667],[390,844]]){
 const m=makeMaple(4401);m.ensure();before=JSON.stringify(m.s);events=JSON.stringify(m.events);const v=scene(m,width,height);
 const shader={uniforms:{},fragmentShader:THREE.ShaderLib.standard.fragmentShader};v.ground.material.onBeforeCompile(shader);
 assert.ok(v.ground.material.map&&shader.uniforms.uLampMap===v.lampU.uLampMap);
 assert.equal((shader.fragmentShader.match(/vec3 lampBase/g)||[]).length,1);
 assert.ok(THREE.ShaderChunk.lights_physical_pars_fragment.includes('vec3 diffuseColor'));
 assert.ok(THREE.ShaderChunk.uv_pars_fragment.includes('vMapUv'));
 const outdoor=v.anim.filter(a=>a.k==='light'&&!a.inside&&(a.o.f||0)===0);assert.ok(outdoor.length&&outdoor.every(a=>!a.glow));
 assert.ok(v.anim.filter(a=>a.k==='light'&&a.inside).every(a=>a.glow));
 for(const view of ['ext',0,1,2,0])for(const az of [0,Math.PI/2,Math.PI,Math.PI*1.5])for(const tod of [0,12]){
  v.setView(view);v.azimuth=v.targetAz=az;v.updateCamera();v.todOverride=tod;v.frame(.016);
  assert.equal(v.lampU.uLampK.value,(tod===0?1:0)*(view==='ext'||view===0?1:0));
  assert.equal(JSON.stringify(m.s),before);assert.equal(JSON.stringify(m.events),events);
 }
 console.log(`PASS ${width}x${height} CPU fixture: shader-source hook, indoor lamps, day/night, floors/camera and complete state/events; rendered appearance NOT TESTED`);
}
// Existing production save/load functions, isolated from DOM/storage/network adapters.
const context=vm.createContext({portfolioCareer,Sim,fmtTime,makeScenario,makeSandbox,makeMaple,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,installTutorial,localsave,savearchive,Audio:class{},performance,console,BUILD:{name:'lamp-map-test'},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+'function makeMapleSeedPrice(day){return 95000+(day%7)*1500;}globalThis.game=game;',context);
const g=context.game;g.attach=function(next){this.sim=next;installTutorial(next)};g.ui={title:false,setMeta(){},renderFeed(){},toast(){}};g.drain=()=>{};
const company=makeSandbox({kind:'business',start:'starter',instant:false});company.ensure();
g.company={props:[{name:'Disposable lamp-map company',sim:company}],active:0,feed:[]};g.sim=company;
before=g.saveJSON();const complete=JSON.stringify(company.s),queue=JSON.stringify(company.events),v=scene(company);
for(const view of ['ext',0,1,0]){v.setView(view);v.frame(.016);}
assert.equal(g.saveJSON(),before);assert.equal(JSON.stringify(company.s),complete);assert.equal(JSON.stringify(company.events),queue);
for(const [label,code] of [['raw',g.rawSaveCode(g.saveJSON())],['compressed',await g.saveCode()]]){
 const prepared=await g.prepareLoad(code);assert.ok(prepared.ok,prepared.msg);g.applyLoad(prepared);
 assert.equal(JSON.stringify(g.sim.s),complete,'complete state survives '+label+' load');assert.equal(g.sim.s.speed,0);
}
console.log('PASS complete save JSON/state/events unchanged by rendering; production raw/compressed roundtrips retain full company state and Pause');
console.log('Lamp-map regression complete; WebGL compilation, rendered appearance, FPS and physical Safari remain NOT TESTED');
