import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {normalizeSaveName} from './save_name_baseline.mjs';
const mem=new Map();
globalThis.window={localStorage:{getItem:k=>mem.get(k)||null,setItem:(k,v)=>mem.set(k,String(v)),removeItem:k=>mem.delete(k)}};
const {saveAPI,makeMaple,Sim,localsave}=await import('../fixtures/save-name/api.mjs');
const main=readFileSync('js/main.js','utf8'),copy=x=>JSON.parse(JSON.stringify(x));
const make=(source=main)=>{const g=saveAPI(source);g.beginSaveSession=()=>{};g.ui={title:false};g.rend={view:'ext'};g.attach=function(sim,kind,{view}={}){this.sim=sim;this.rend.view=view;};return g;};
let n=0;async function test(name,fn){await fn();console.log('PASS '+name);n++;}
await test('single property Save reload Continue retains Unicode name, feed, view and complete paused state',async()=>{
 const g=make(),sim=makeMaple(99);sim.s.speed=0;g.sim=sim;const name='Eddie’s Storage — Café 🗝️';g.company={props:[{name,sim}],active:0,feed:[{msg:'Retained company feed'}]};
 const before=copy(sim.s),source=JSON.stringify(g.company.feed),json=g.saveJSON();assert.equal(JSON.parse(json).company,1);assert.deepEqual(copy(sim.s),before);
 const meta=g.saveMeta();assert.equal(meta.name,name);localsave.put(g.rawSaveCode(json),meta);
 const fresh=make(),rec=localsave.get().main;assert.ok(await fresh.loadCode(rec.code,true));assert.equal(fresh.metaName(),name);assert.equal(fresh.ui.title,false);assert.deepEqual(copy(fresh.sim.s),before);assert.deepEqual(JSON.stringify(fresh.company.feed),source);assert.equal(fresh.rend.view,'ext');
});
await test('raw and compressed export import retain complete state and name without mutating source',async()=>{
 const g=make(),sim=makeMaple(7);sim.s.speed=0;g.sim=sim;g.company={props:[{name:'Custom Gate Test',sim}],active:0,feed:[]};
 const before=copy(sim.s);
 for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){const fresh=make();assert.ok(await fresh.loadCode(code));assert.equal(fresh.metaName(),'Custom Gate Test');assert.deepEqual(copy(fresh.sim.s),before);assert.deepEqual(copy(g.sim.s),before);}
});
await test('production file export creates a loadable named save with unchanged complete state',async()=>{
 const g=make(),sim=makeMaple(17);sim.s.speed=0;g.sim=sim;g.company={props:[{name:'Exported Company',sim}],active:0,feed:[]};
 const before=copy(sim.s),prior=URL.createObjectURL;let blob,clicked=false;
 URL.createObjectURL=b=>{blob=b;return 'blob:disposable';};globalThis.document={createElement:()=>({click(){clicked=true;}})};
 try{await g.saveFile();assert.ok(clicked);const p=await g.prepareLoad(await blob.text());assert.ok(p.ok);assert.equal(p.company.props[0].name,'Exported Company');assert.deepEqual(copy(p.company.props[0].sim.s),before);assert.deepEqual(copy(sim.s),before);}
 finally{URL.createObjectURL=prior;delete globalThis.document;}
});
await test('legacy bare saves remain loadable and can be resaved in existing portfolio format',async()=>{
 const old=execFileSync('git',['show','4ffb204de7fe61e1f7691b8426bb072a875ca134:js/main.js'],{encoding:'utf8'}),g=make(old);const sim=makeMaple(11);sim.s.speed=0;g.sim=sim;g.company={props:[{name:'Maple Street Storage',sim}],active:0,feed:[]};
 const raw=g.saveJSON();assert.equal(JSON.parse(raw).company,undefined);
 for(const code of [g.rawSaveCode(raw),await g.saveCode(raw)]){const fresh=make();assert.ok(await fresh.loadCode(code));assert.equal(fresh.metaName(),'Maple Street Storage');assert.deepEqual(copy(fresh.sim.s),copy(sim.s));assert.equal(JSON.parse(fresh.saveJSON()).company,1);}
});
await test('multi-property serialization remains byte-identical and full states reload with active index and feed',async()=>{
 const g=make(),a=makeMaple(7),b=makeMaple(99);a.s.speed=b.s.speed=0;g.sim=b;g.company={props:[{name:'First',sim:a},{name:'Second',sim:b}],active:1,feed:[{msg:'Portfolio'}]};
 const old=make(execFileSync('git',['show','4ffb204de7fe61e1f7691b8426bb072a875ca134:js/main.js'],{encoding:'utf8'}));Object.assign(old,{sim:g.sim,company:g.company,rend:g.rend});
 assert.equal(g.saveJSON(),old.saveJSON());
 const p=await g.prepareLoad(await g.saveCode());assert.ok(p.ok);assert.equal(p.company.active,1);assert.deepEqual(copy(p.company.feed),copy(g.company.feed));for(let i=0;i<2;i++)assert.deepEqual(copy(p.company.props[i].sim.s),copy(g.company.props[i].sim.s));
});
await test('running-save load retains established pause-on-load and does not advance cash clock or RNG',async()=>{
 const g=make(),sim=makeMaple(8);sim.s.speed=4;g.sim=sim;g.company={props:[{name:'Running company',sim}],active:0,feed:[]};const before=copy(sim.s),p=await g.prepareLoad(await g.saveCode());assert.ok(p.ok);assert.deepEqual(copy(p.company.props[0].sim.s),{...before,speed:0});assert.equal(sim.s.speed,4);
});
await test('no-company fallback, malformed portfolio refusal and existing name sanitization remain',async()=>{
 const g=make();g.sim=makeMaple(7);assert.equal(JSON.parse(g.saveJSON()).company,undefined);
 const state=copy(g.sim.s);assert.equal((await g.prepareLoad(JSON.stringify({company:1,props:[{name:3,s:state}]}))).ok,false);
 const p=await g.prepareLoad(JSON.stringify({company:1,active:0,feed:[],props:[{name:'<script>Unsafe</script>',s:state}]}));assert.ok(p.ok);assert.equal(p.company.props[0].name,'scriptUnsafe/script');
});
await test('exact whole-file parent restoration rejects undeclared source drift',()=>{
 const old=execFileSync('git',['show','4ffb204de7fe61e1f7691b8426bb072a875ca134:js/main.js'],{encoding:'utf8'});
 assert.equal(normalizeSaveName(main,'js/main.js'),old);assert.equal(normalizeSaveName(old,'js/main.js'),old);
 for(const drift of [main+'\n// unrelated\n',main.replace('props.length > 0','props.length >= 0')])assert.throws(()=>normalizeSaveName(drift,'js/main.js'));
});
console.log(n+' single-property name persistence groups passed');
