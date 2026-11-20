// FS-01: genuine fresh factories and immutable legacy control, production save/UI/adapter methods.
// Synthetic storage and companies; real browser/IndexedDB qualification is separate.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
const control=process.env.FS01_CONTROL_ROOT;
assert.ok(control,'FS01_CONTROL_ROOT must identify the retained exact legacy checkout');
assert.equal(execFileSync('git',['-C',control,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),'5ce4cfa76d3e1386ab4e3a9746b84bfe6c1313f3');
const mem=new Map(),operations=[];let blocked=false;
globalThis.window={localStorage:{getItem(k){operations.push(['get',k]);return mem.get(k)??null;},setItem(k,v){operations.push(['set',k]);if(blocked)throw Error('quota');mem.set(k,String(v));},removeItem(k){operations.push(['remove',k]);if(blocked)throw Error('quota');mem.delete(k);}}};
const legacy=await import(pathToFileURL(path.join(control,'tests/fixtures/save-name/api.mjs')));
const current=await import('../fixtures/save-name/api.mjs');
const {SAVE_GENERATION,SAVE_KEYS}=await import('../../js/savegeneration.js');
const {savearchive}=await import('../../js/savearchive.js');
const {UI}=await import('../../js/ui.js');
const {cloud}=await import('../../js/cloud.js');
const main=readFileSync('js/main.js','utf8'),legacyMain=readFileSync(path.join(control,'js/main.js'),'utf8');
const copy=x=>JSON.parse(JSON.stringify(x));
const make=(api=current,source=main,seed=7)=>{
 const g=api.saveAPI(source);g.beginSaveSession=()=>{};g.ui={title:false};g.rend={view:'ext'};
 g.attach=function(sim,kind,{view}={}){this.sim=sim;this.rend.view=view;};
 const sim=api.makeMaple(seed);sim.s.speed=0;g.sim=sim;g.company={props:[{name:'Maple FS-01 fixture',sim}],active:0,feed:[{msg:'Retain feed'}]};return g;
};
let n=0;async function test(name,fn){await fn();n++;console.log('PASS '+name);}
const old=make(legacy,legacyMain),oldState=copy(old.sim.s),oldJSON=old.saveJSON(),oldRaw=old.rawSaveCode(oldJSON),oldCompressed=await old.saveCode(oldJSON);
const sentinels={'sst.autosave.main':JSON.stringify({code:oldRaw,meta:old.saveMeta()}),'sst.autosave.backup':'legacy-backup-bytes','sst.kept.previous':'legacy-kept-bytes','sst.kept.archive':'legacy-archive-bytes','sst.kept.archive.unreadable':'legacy-quarantine','sst.probe':'legacy-probe-sentinel','sst.probe.archive':'legacy-probe-archive-sentinel'};
for(const [k,v] of Object.entries(sentinels))mem.set(k,v);operations.length=0;
const intact=()=>{for(const [k,v] of Object.entries(sentinels))assert.equal(mem.get(k),v,k);};
await test('fresh Maple adds only generation identity and empty supply sales to the exact legacy factory',()=>{
 const g=make(),s=copy(g.sim.s);assert.equal(s.saveGeneration,SAVE_GENERATION);delete s.saveGeneration;
 const expected=copy(oldState);
 expected.policies.supplies=true;
 expected.supplies={v:1,n:0,sold:0,revenue:0,cost:0,log:[]};
 assert.deepEqual(s,expected);
 assert.equal(g.sim.s.cash,26000);assert.equal(Object.values(g.sim.s.leases).length,22);assert.equal(Object.values(g.sim.s.objects).filter(o=>o.type==='unit').length,23);
});
await test('real legacy bare/company raw/compressed saves reject before any incoming rebuild',async()=>{
 const g=make();let rebuilds=0;const original=current.Sim.prototype.rebuild;
 current.Sim.prototype.rebuild=function(...a){rebuilds++;return original.apply(this,a);};
 const before=g.saveJSON(),disk=JSON.stringify([...mem]);
 try{for(const code of [oldRaw,oldCompressed,old.rawSaveCode(JSON.stringify(oldState)),await old.saveCode(JSON.stringify(oldState))]){const p=await g.prepareLoad(code);assert.equal(p.ok,false);assert.equal(p.reason,'save-generation');}}
 finally{current.Sim.prototype.rebuild=original;}
 assert.equal(rebuilds,0);assert.equal(g.saveJSON(),before);assert.equal(JSON.stringify([...mem]),disk);intact();
});
await test('missing unknown mixed and malformed generations reject atomically across all properties',async()=>{
 const g=make(),second=make(current,main,99),good=JSON.parse(g.saveJSON());let rebuilds=0;const original=current.Sim.prototype.rebuild;
 current.Sim.prototype.rebuild=function(...a){rebuilds++;return original.apply(this,a);};
 try{for(const variant of ['missing-root','unknown-root','missing-property','mixed','malformed-last']){
  const j=copy(good);j.props.push({name:'Second',s:copy(second.sim.s)});
  if(variant==='missing-root')delete j.saveGeneration;if(variant==='unknown-root')j.saveGeneration='unknown';
  if(variant==='missing-property')delete j.props[1].s.saveGeneration;if(variant==='mixed')j.props[1].s.saveGeneration='legacy';
  if(variant==='malformed-last')j.props[1].s.W=0;
  const p=await g.prepareLoad(g.rawSaveCode(JSON.stringify(j)));assert.equal(p.ok,false,variant);
 }}finally{current.Sim.prototype.rebuild=original;}
 assert.equal(rebuilds,0);intact();
});
await test('genuinely fresh raw compressed and bare saves retain complete state name feed and Pause',async()=>{
 const g=make(),before=copy(g.sim.s);assert.equal(JSON.parse(g.saveJSON()).saveGeneration,SAVE_GENERATION);
 for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode(),g.rawSaveCode(JSON.stringify(g.sim.s)),await g.saveCode(JSON.stringify(g.sim.s))]){
  const loaded=make();const p=await loaded.prepareLoad(code);assert.ok(p.ok);loaded.applyLoad(p);assert.deepEqual(copy(loaded.sim.s),before);assert.equal(loaded.sim.s.speed,0);
  if(JSON.parse(await g.decodeSave(code)).company){assert.equal(loaded.metaName(),g.metaName());assert.deepEqual(copy(loaded.company.feed),copy(g.company.feed));}
 }
 const running=make();running.sim.s.speed=4;const p=await running.prepareLoad(await running.saveCode());assert.ok(p.ok);assert.equal(p.company.props[0].sim.s.speed,0);assert.equal(running.sim.s.speed,4);intact();
});
await test('fresh synthetic portfolio preserves active state and names without advancing either world',async()=>{
 const g=make(),b=make(current,main,99);g.company.props.push({name:'Other fixture',sim:b.sim});g.company.active=1;g.sim=b.sim;
 const j=JSON.parse(g.saveJSON()),p=await g.prepareLoad(await g.saveCode());assert.ok(p.ok);assert.equal(p.company.active,1);
 for(let i=0;i<2;i++){const expected=copy(j.props[i].s);delete expected.uiView;delete expected.uiCam;assert.deepEqual(copy(p.company.props[i].sim.s),expected);}assert.equal(p.view,j.props[j.active].s.uiView);assert.deepEqual(copy(p.company.feed),j.feed);intact();
});
await test('main backup kept archive and quarantine operate only on fresh namespace with generation metadata',()=>{
 const g=make(),r={code:g.rawSaveCode(g.saveJSON()),meta:g.saveMeta()};assert.equal(r.meta.saveGeneration,SAVE_GENERATION);
 assert.ok(current.localsave.put(r.code,r.meta));assert.ok(current.localsave.put(r.code,r.meta));assert.equal(current.localsave.get().main.meta.saveGeneration,SAVE_GENERATION);
 assert.ok(current.localsave.keep(r));const g2=make(current,main,99),r2={code:g2.rawSaveCode(g2.saveJSON()),meta:g2.saveMeta()};
 assert.ok(savearchive.keep(r2,x=>current.localsave.keep(x),false).ok);assert.equal(savearchive.list()[0].meta.saveGeneration,SAVE_GENERATION);
 assert.ok(savearchive.settle(r.code));mem.set(SAVE_KEYS.archive,'unreadable fresh archive');assert.ok(savearchive.keep(r,x=>current.localsave.keep(x),false).ok);
 assert.equal(mem.get(SAVE_KEYS.archive+'.unreadable'),'unreadable fresh archive');current.localsave.clear();intact();
 assert.ok(operations.every(([,k])=>!k.startsWith('sst.')||k.startsWith('sst.fresh1.')),'candidate adapters never even read legacy keys');
});
await test('unsupported UI import retains pasted bytes and never reaches confirmation or preservation',async()=>{
 const g=make(),ta={value:oldCompressed,classList:{add(){}},setAttribute(){}},error={},before=g.saveJSON(),disk=JSON.stringify([...mem]);let confirmations=0;
 const ui=Object.create(UI.prototype);ui.g=g;ui.root={querySelector:(selector)=>selector==='#loadError'?error:ta};ui.showImportConfirm=()=>confirmations++;
 assert.equal(await ui.importSave(oldCompressed,'code'),false);assert.equal(ta.value,oldCompressed);assert.match(error.textContent,/different or unsupported generation/);assert.equal(confirmations,0);assert.equal(g.saveJSON(),before);assert.equal(JSON.stringify([...mem]),disk);intact();
});
await test('unsupported in-memory state cannot be relabelled by exporting it',()=>{
 const g=make();g.sim=old.sim;g.company={props:[{name:'Legacy state',sim:old.sim}],active:0,feed:[]};assert.throws(()=>g.saveJSON(),/unsupported save generation/);intact();
});
await test('disabled legacy server cannot be enabled by client status and never performs any request',async()=>{
 const prior=globalThis.fetch;let calls=0;globalThis.fetch=()=>{calls++;throw Error('must never fetch');};
 try{assert.equal(cloud.enabled,false);cloud.ok=true;assert.equal(await cloud.get(),null);assert.equal(await cloud.put('x',{}),false);cloud.beacon('x',{});await cloud.clear();assert.equal(calls,0);}finally{globalThis.fetch=prior;}
});
await test('fresh storage failure leaves legacy bytes intact and reports failure honestly',()=>{
 const g=make();blocked=true;try{assert.equal(current.localsave.put(g.rawSaveCode(g.saveJSON()),g.saveMeta()),false);assert.equal(current.localsave.lastErr,'storage full');}finally{blocked=false;}
 intact();const ui=Object.create(UI.prototype);ui.g={localsave:{ok:false},durable:{status:'unavailable'}};assert.match(ui.autosaveNote(),/never uses the legacy save server/);
});
console.log(`${n} FS-01 focused native groups passed; legacy code rejection is intentional, not migration support`);
