import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple,makeEmptyLot} from '../../js/maple.js';
import {makeScenario,makeSandbox,modeLabel,sandboxName,SCENARIOS} from '../../js/scenarios.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY} from '../../js/data.js';
import {normalizeNumbering,validateNumbering,allocateNumber,nameUnit,numberCapacity,reserveNumbers} from '../../js/unitnumbering.js';
import {curBeat,installTutorial} from '../../js/tutorial.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {UI} from '../../js/ui.js';
const clone=x=>JSON.parse(JSON.stringify(x));
const check=s=>{assert.ok(validateNumbering(s));const us=Object.values(s.objects).filter(o=>o.type==='unit');assert.equal(new Set(us.map(o=>o.num)).size,us.length);for(const u of us)assert.equal(Math.floor(u.num/1000),(u.f||0)+1);};
// Real legacy numbering/layout, synthesized from the unchanged authored footprints.
function legacy(sim=makeMaple(9711)) {
 const s=clone(sim.s),counts={drive:101,interior:201,upper:301};
 for(const u of Object.values(s.objects).filter(o=>o.type==='unit').sort((a,b)=>a.id-b.id)){
   const old=u.num,key=u.access==='drive'?'drive':u.f>0?'upper':'interior';u.num=counts[key]++;u.name='Unit '+u.num;
   for(const t of s.tasks.filter(t=>t.obj===u.id))t.label=t.label?.replace(`Unit ${old}`,u.name);
   for(const target of s.scenario?.targets||[])if(target.ids.includes(u.id))target.num=u.num;
 }
 delete s.unitNumbering;delete s.unitRoles;s.unitNo=counts;return s;
}
const main=readFileSync('js/main.js','utf8');
const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FINANCIAL_MINUTE,makeMaple,makeEmptyLot,makeScenario,makeSandbox,SCENARIOS,installTutorial,BUILD:{name:'test'},cloud:{ok:false},savearchive:{},localsave:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes are'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+main.slice(main.indexOf('function makeMapleSeedPrice'),main.indexOf('game.rend = createStartupRenderer'))+';globalThis.game=game;',context);
const g=context.game;g.ui=null;g.attach=function(sim){this.sim=sim;};
let passed=0;const test=async(name,fn)=>{await fn();passed++;console.log('PASS',name);};
await test('authored starts and all five floors share unique property-local sequences',()=>{
 for(const sim of [makeMaple(),makeMaple(9711,{mirror:true}),...Object.keys(SCENARIOS).map(k=>makeScenario(k)),makeEmptyLot(),makeSandbox({})])check(sim.s);
 const s=makeEmptyLot().s;
 for(let f=0;f<5;f++)for(let i=0;i<3;i++){const o={id:s.nextId++,type:'unit',f};nameUnit(s,o);s.objects[o.id]=o;assert.equal(o.num,(f+1)*1000+i+1);}
 check(s);
});
await test('migration preserves IDs, money, RNG, relationships, custom names and history; refreshes linked active text',()=>{
 const old=legacy(),u=Object.values(old.objects).find(o=>o.num===107),custom=Object.values(old.objects).find(o=>o.num===101);
 custom.name='My special unit';old.convos=[{id:900,obj:u.id,text:'Unit 107 needs work; $107 stays $107.',actions:[{label:'Pay $107',action:{unit:u.id}}]}];
 old.ledger.push({amt:107,cat:'rent',t:old.t,note:'Unit 107 historical payment'});
 const before=clone(old);normalizeNumbering(old);check(old);
 for(const k of ['cash','t','speed','rngS','nextId','leases','tenants','visits','orders','staff','agents','ledger','milestones','finance'])assert.deepEqual(old[k],before[k],k);
 assert.deepEqual(Object.keys(old.objects),Object.keys(before.objects));
 for(const [id,o] of Object.entries(old.objects)){const a=clone(o),b=clone(before.objects[id]);delete a.num;delete b.num;delete a.name;delete b.name;assert.deepEqual(a,b);}
 const job=old.tasks.find(t=>t.obj===u.id);assert.equal(job.obj,u.id);assert.match(job.label,/1007/);assert.equal(old.convos[0].text,'Unit 1007 needs work; $107 stays $107.');
 assert.equal(old.objects[custom.id].name,'My special unit');assert.equal(old.unitRoles.mapleTurnover,u.id);
 const stable=clone(old);normalizeNumbering(old);assert.deepEqual(old,stable);
 const sim=new Sim(old);sim.s.tut.beat=1;assert.match(curBeat(sim).title,/1007/);assert.equal(curBeat(sim).focus(sim).obj,u.id);
 const active=makeMaple(9711),job0=active.s.tasks[0];active.act_ownerTask({task:job0.id,forceOwner:true});
 for(let i=0;i<600&&job0.prog<.25;i++)active.step();assert.ok(job0.prog>=.25&&job0.prog<1);
 const activeOld=legacy(active),restored=new Sim(clone(activeOld));
 for(const k of ['cash','t','rngS','agents','staff','leases','tenants'])assert.deepEqual(restored.s[k],activeOld[k],k);
 for(let i=0;i<activeOld.tasks.length;i++){const a=clone(activeOld.tasks[i]),b=clone(restored.s.tasks[i]);delete a.label;delete b.label;assert.deepEqual(a,b);}
});
await test('Comeback target IDs, footprint mappings, earned progress and missing-space anchors survive migration',()=>{
 const s=legacy(makeScenario('comeback')),before=clone(s.scenario);
 const missing=s.scenario.targets[0];delete s.objects[missing.id];normalizeNumbering(s);check(s);
 for(let i=0;i<6;i++){const a=clone(s.scenario.targets[i]),b=clone(before.targets[i]);delete a.num;delete b.num;assert.deepEqual(a,b);assert.ok(s.scenario.targets[i].num>=1001);}
 for(const key of ['earned','ownerDone','staffDone','status','acknowledged'])assert.deepEqual(s.scenario[key],before[key]);
});
await test('production SST0/SST1 loads migrate every portfolio property once and leave input exports untouched',async()=>{
 const s=legacy(),json=JSON.stringify(s),portfolio=JSON.stringify({company:1,active:1,feed:[],props:[{name:'A',s},{name:'B',s:clone(s)}]});
 for(const text of [json,portfolio])for(const code of [g.rawSaveCode(text),await g.saveCode(text)]){
   const result=await g.prepareLoad(code);assert.ok(result.ok,result.msg);for(const p of result.company.props){check(p.sim.s);assert.equal(p.sim.s.speed,0);assert.equal(p.sim.s.cash,s.cash);}
   if(result.company.props.length===2)assert.equal(result.company.active,1);
   const again=await g.prepareLoad(await g.saveCode(JSON.stringify(result.company.props[0].sim.s)));assert.ok(again.ok);assert.deepEqual(clone(again.company.props[0].sim.s.unitNumbering),clone(result.company.props[0].sim.s.unitNumbering));
 }
 assert.equal(JSON.stringify(s),json);
});
await test('bad numbering rejects the entire load before replacing the current company',async()=>{
 g.company={sentinel:true};const before=g.company;
 for(const corrupt of [s=>s.unitNumbering.version=99,s=>s.unitNumbering.next[0]=1001,s=>{s.objects[4].num=s.objects[3].num;},s=>s.objects[3].num=2001]){
   const s=clone(makeMaple().s);corrupt(s);const r=await g.prepareLoad(JSON.stringify({company:1,active:0,props:[{name:'Good',s:legacy()},{name:'Bad',s}]}));assert.equal(r.ok,false);assert.equal(g.company,before);
 }
});
await test('split keeps first child number, allocates second, and refuses exhaustion before money or IDs change',()=>{
 const sim=makeMaple();sim.act_tutSkip();const u=sim.objs('unit')[0],L=sim.s.leases[u.lease];delete sim.s.tenants[L.tenant];delete sim.s.leases[L.id];u.lease=null;u.commercial='ready';
 const num=u.num;assert.ok(sim.act_renovate({unit:u.id,kind:'split'}).ok);sim.ensure();check(sim.s);
 const children=sim.objs('unit').filter(o=>o.size==='5x10'&&o.x===u.x&&o.y>=u.y&&o.y<u.y+u.h);assert.equal(children.length,2);assert.equal(children[0].num,num);assert.equal(children[1].num,1024);
 const other=sim.objs('unit').find(o=>o.access==='drive'&&o.size==='10x10');other.lease=null;sim.s.unitNumbering.next[0]=2000;
 const before=JSON.stringify(sim.s);assert.equal(sim.act_renovate({unit:other.id,kind:'split'}).ok,false);assert.equal(JSON.stringify(sim.s),before);
});
await test('reservations survive reload, block collisions and retire cancelled numbers without reusing them',()=>{
 const sim=makeMaple();const creates=[{type:'unit',f:1},{type:'unit',f:1}];reserveNumbers(sim.s,creates);assert.deepEqual(creates.map(c=>c.unitNumber),[2001,2002]);
 sim.s.orders.push({id:999,st:'construction',tiles:[],objs:[],cells:[],vertical:{phase:0,ids:[],creates}});const loaded=new Sim(clone(sim.s));assert.equal(allocateNumber(loaded.s,1),2003);
 loaded.s.orders[0].st='cancelled';assert.equal(allocateNumber(loaded.s,1),2004);
 loaded.s.unitNumbering.next[4]=5999;assert.equal(numberCapacity(loaded.s,[{type:'unit',f:4}]).ok,true);assert.equal(numberCapacity(loaded.s,[{type:'unit',f:4},{type:'unit',f:4}]).ok,false);assert.equal(allocateNumber(loaded.s,4),5999);assert.throws(()=>allocateNumber(loaded.s,4));
 const bad=clone(sim.s);delete bad.orders[0].vertical.creates[0].unitNumber;assert.throws(()=>new Sim(bad),/Missing reserved/);
 const lot=makeSandbox({kind:'business',cash:100000,tiers:'all'}),args={type:'build',tool:'du5x10',a:{x:6,y:8},b:{x:6,y:8}};
 assert.notEqual(lot.plan(args).status,'invalid');lot.s.unitNumbering.next[0]=2000;const before=JSON.stringify(lot.s);
 assert.equal(lot.dispatch(args).ok,false);assert.equal(JSON.stringify(lot.s),before);
 const full=makeMaple();full.s.cash=1000000;full.s.unitNumbering.next[1]=3000;full.ensure();const snapshot=JSON.stringify(full.s);
 assert.equal(full.dispatch({type:'verticalUpgrade',shell:full.objs('shell')[0].id,stamp:full.s.structV}).ok,false);assert.equal(JSON.stringify(full.s),snapshot);
});
await test('acquired property has its own sequence and does not renumber the original property',()=>{
 const sim=makeMaple();sim.s.cash=1000000;g.sim=sim;g.company={active:0,feed:[],props:[{name:'Original',sim}]};g.ui=null;
 const nums=sim.objs('unit').map(o=>o.num);assert.ok(g.acquire('facility','maple').ok);assert.deepEqual(sim.objs('unit').map(o=>o.num),nums);check(g.company.props[1].sim.s);assert.equal(g.company.props[1].sim.objs('unit')[0].num,1001);
});
await test('overflow legacy migration does not partially rewrite units; UI explains historical numbers',()=>{
 const s=legacy();for(let i=0;i<1000;i++)s.objects[10000+i]={id:10000+i,type:'unit',f:0,num:10000+i};const before=JSON.stringify(s);assert.throws(()=>normalizeNumbering(s));assert.equal(JSON.stringify(s),before);
 const ui=Object.create(UI.prototype);ui.g={sim:new Sim(legacy())};assert.match(ui.numberingInfo(),/Previous unit numbers/);assert.match(ui.numberingInfo(),/1007/);
});
console.log(`ALL PASS: ${passed} numbering and migration groups; physical Safari NOT TESTED`);
