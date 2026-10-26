// Real game/UI save paths and localStorage; no browser/device claim.
import assert from 'node:assert/strict';
import {durableBaseline} from './durable_baseline.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';
const mem=new Map();let blocked=false;
globalThis.window={localStorage:{getItem:k=>mem.get(k)||null,setItem(k,v){if(blocked)throw Error('quota');mem.set(k,String(v));},removeItem(k){if(blocked)throw Error('quota');mem.delete(k);}}};
const {localsave}=await import('../../js/localsave.js');
const {savearchive}=await import('../../js/savearchive.js');
const {UI}=await import('../../js/ui.js');
const {Sim,fmtTime}=await import('../../js/sim.js');
const {makeMaple}=await import('../../js/maple.js');
const {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName}=await import('../../js/scenarios.js');
const {MARKETS,ROLES,MIN_PER_DAY,TIERS}=await import('../../js/data.js');
const {FINANCIAL_MINUTE}=await import('../../js/finance.js');
const {portfolioCareer}=await import('../../js/career.js');
const main=readFileSync('js/main.js','utf8');
function fixture(speed=0){
  blocked=false;mem.clear();mem.set('sst.kept.previous','manual-preservation-sentinel');mem.set('sst.kept.archive','archive-sentinel');
  const cloud={ok:false,beacon(){},put:async()=>false};
  const ctx=vm.createContext({Audio:class{},Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,TIERS,FINANCIAL_MINUTE,portfolioCareer,localsave,savearchive,cloud,performance,console,BUILD:{name:'test'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
  vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+main.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+';globalThis.game=game;',ctx);
  const g=ctx.game,sim=makeSandbox({start:'starter',cash:250000});sim.s.speed=speed;sim.s.convos=[];
  g.sim=sim;g.company={props:[{name:'Yard',sim}],active:0,feed:[]};g.rend={view:'ext',setPreview(){}};
  const ui=Object.create(UI.prototype);ui.g=g;ui.title=false;g.ui=ui;
  for(const k of ['sfx','toast','renderActionBar','renderTut','setMeta'])ui[k]=()=>{};
  // Renderer/session attachment is outside this save test; switchProperty itself is production.
  g.attach=function(s){this.sim=s;};
  localsave.put(g.rawSaveCode(g.saveJSON()),g.saveMeta());
  return {g,ui,sim,cloud};
}
const saved=()=>JSON.parse(decodeURIComponent(escape(atob(localsave.get().main.code.slice(5)))));
function current(f){assert.deepEqual(saved(),JSON.parse(f.g.saveJSON()),'legacy fallback contains latest state before the action returns');assert.equal(f.sim.s.speed,0);assert.equal(mem.get('sst.kept.previous'),'manual-preservation-sentinel');assert.equal(mem.get('sst.kept.archive'),'archive-sentinel');}
function build(f){
  for(let y=2;y<29;y++)for(let x=2;x<40;x++){
    const args={tool:'du5x10',a:{x,y},b:{x,y},f:0,rot:2};const p=f.g.sim.plan(args);
    if(p.status==='valid'){f.ui.plan={...p,args};return {args,p};}
  }throw Error('no real buildable fixture cell');
}
let n=0;async function test(name,fn){await fn();n++;console.log('PASS '+name);}
await test('paused expansion loan updates legacy fallback immediately without a frame or leave event',()=>{const f=fixture(),t=f.sim.s.t;assert.ok(f.ui.do({type:'borrow',amt:50000}).ok);assert.equal(f.sim.s.cash,300000);assert.equal(f.sim.s.t,t);current(f);});
await test('paused acquisition stores both properties atomically with exact economics',()=>{const f=fixture();assert.ok(f.g.acquire('parcel','blank').ok);assert.equal(f.sim.s.cash,200000);assert.equal(f.g.company.props[1].sim.s.cash,5000);current(f);});
await test('paused transfer preserves both ledgers and failed transfer cannot replace save',()=>{const f=fixture();f.g.acquire('parcel','blank');assert.ok(f.g.transfer(0,1,10000).ok);assert.equal(f.sim.s.cash,190000);assert.equal(f.g.company.props[1].sim.s.cash,15000);current(f);const raw=mem.get('sst.autosave.main');assert.equal(f.g.transfer(0,1,1e9).ok,false);assert.equal(mem.get('sst.autosave.main'),raw);});
await test('paused build saves charge and order before returning; duplicate confirm spends nothing',()=>{const f=fixture(),{p}=build(f),cash=f.sim.s.cash,t=f.sim.s.t,count=f.sim.s.orders.length;f.ui.confirmPlan();assert.equal(f.sim.s.cash,cash-p.cost);assert.equal(f.sim.s.orders.length,count+1);assert.equal(f.sim.s.t,t);current(f);const raw=mem.get('sst.autosave.main');f.ui.confirmPlan();assert.equal(mem.get('sst.autosave.main'),raw);});
await test('property switch saves active property and paused portfolio for fresh load',async()=>{const f=fixture();f.g.acquire('parcel','blank');f.g.transfer(0,1,10000);f.g.switchProperty(1);current(f);const prep=await f.g.prepareLoad(localsave.get().main.code);assert.ok(prep.ok);assert.equal(prep.company.active,1);assert.deepEqual(Array.from(prep.company.props,p=>p.sim.s.cash),[190000,15000]);assert.ok(prep.company.props.every(p=>p.sim.s.speed===0));});
await test('older pending compression cannot overwrite a newer paused transaction',async()=>{const f=fixture();let release;f.g.saveCode=json=>new Promise(r=>release=()=>r(f.g.rawSaveCode(json)));const pending=f.g.autosave();assert.ok(f.ui.do({type:'borrow',amt:50000}).ok);current(f);release();assert.equal(await pending,false);current(f);});
await test('repeated paused actions leave the final complete snapshot and prior backup',()=>{const f=fixture();f.ui.do({type:'borrow',amt:50000});f.g.acquire('parcel','blank');f.g.transfer(0,1,10000);const prior=localsave.get().main.code;const {p}=build(f);f.ui.confirmPlan();current(f);assert.equal(localsave.get().backup.code,prior);assert.equal(f.sim.s.cash,240000-p.cost);});
await test('running actions retain existing cadence and never force Pause or advance time',()=>{for(const speed of [1,2,4]){const f=fixture(speed),raw=mem.get('sst.autosave.main'),t=f.sim.s.t;assert.ok(f.ui.do({type:'borrow',amt:50000}).ok);assert.ok(f.g.acquire('parcel','blank').ok);assert.ok(f.g.transfer(0,1,10000).ok);assert.equal(mem.get('sst.autosave.main'),raw);assert.equal(f.sim.s.speed,speed);assert.equal(f.sim.s.t,t);}});
await test('failed commands and title-screen actions cannot overwrite autosave',()=>{const f=fixture(),raw=mem.get('sst.autosave.main');assert.equal(f.ui.do({type:'borrow',amt:-1}).ok,false);assert.equal(mem.get('sst.autosave.main'),raw);f.ui.title=true;f.ui.do({type:'borrow',amt:50000});assert.equal(mem.get('sst.autosave.main'),raw);});
await test('manual Pause checkpoints earlier running transactions without advancing time',()=>{const f=fixture(4),t=f.sim.s.t;f.ui.do({type:'borrow',amt:50000});f.ui.do({type:'speed',v:0});assert.equal(f.sim.s.t,t);current(f);});
await test('paused checkpoint keeps existing cloud fallback when local storage is unavailable',()=>{const f=fixture();let snapshot;f.cloud.ok=true;f.cloud.beacon=(code,meta)=>{snapshot={code,meta};};blocked=true;f.ui.do({type:'borrow',amt:50000});assert.ok(snapshot);assert.equal(JSON.parse(decodeURIComponent(escape(atob(snapshot.code.slice(5))))).cash,300000);assert.equal(snapshot.meta.cash,300000);blocked=false;});
await test('storage failure does not roll back or repeat a financial action and keeps error reporting',()=>{const f=fixture();blocked=true;assert.ok(f.ui.do({type:'borrow',amt:50000}).ok);assert.equal(f.sim.s.cash,300000);assert.equal(localsave.lastErr,'storage full');assert.equal(f.sim.s.speed,0);blocked=false;});
await test('no new state schema or simulation/economics changes',()=>{const f=fixture(),keys=Object.keys(f.sim.s).sort();f.ui.do({type:'borrow',amt:50000});assert.deepEqual(Object.keys(f.sim.s).sort(),keys);});
await test('only explicit save hooks differ from exact 918d31f production source',()=>{
  const parentHashes={"js/main.js": "1b6af0e30f37889a125921bd98c39714719a1fd0e4eab7c069ca7504a7fe73e1", "js/ui.js": "2133885a219efdab64409206e64e0655f462ae530e1aef5a05aeeb5e22172fe6", "js/sim.js": "4f981640eaa7827a6ecb02e5ded951f370c7735feee8676b532045d1b7702656", "js/data.js": "0cc0985de5ddacfc1a7d7fe462c1c4cdc89f07dbc26a1868020d742fd9477e66", "js/finance.js": "fc53b3d54969aedc4d36ac3cb2e9e9640de5b235d89ad04defea49088af831e9", "js/localsave.js": "fe3915174398f314eadc84a28831322fc09e4b830c15b76a20c73706465b7873", "js/savearchive.js": "2e2c5ffa4051d076d0cb4d97831d72984f3003317a79a2f8688e135b4df81347", "js/cloud.js": "cc784d86fb0d2a7165700f33a6cc2c309f5ae2bc9be079001707ca86b96676e7", "css/game.css": "c3bd69648cef68c3ed1c1e20dead80d5906f9f4ae05de6d9e53df7ab120a902e"};
  const hash=text=>createHash('sha256').update(text).digest('hex');
  const method="  // Paused actions cannot wait for the running-time timer or an unload event.\n  // Reuse the synchronous leaving path, including its stale-compression fence.\n  autosavePaused() {\n    if (this.sim?.s.speed === 0) return this.autosave(true);\n  },\n";
  const normalized=durableBaseline('js/main.js').replaceAll('    this.autosavePaused();\n','').replace(method,'').replace('  // autosave: during active play (including Pause); `hide` writes locally synchronously and uses a keepalive request','  // autosave: whenever a game is running (not on the title screen); `hide` uses a keepalive request');
  assert.equal(hash(normalized),parentHashes['js/main.js']);
  assert.equal(hash(durableBaseline('js/ui.js').replaceAll('    if (r.ok) this.g.autosavePaused?.();\n','')),parentHashes['js/ui.js']);
  for(const file of ['js/sim.js','js/data.js','js/finance.js','js/localsave.js','js/savearchive.js','js/cloud.js','css/game.css'])assert.equal(hash(durableBaseline(file)),parentHashes[file],file);
});
console.log(`ALL PASS: ${n} paused autosave regression groups`);
