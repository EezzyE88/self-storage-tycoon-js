import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {base,full} from './tthreefloor.mjs';
import {tickVertical} from '../../js/vertical.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
const clone=sim=>new Sim(JSON.parse(JSON.stringify(sim.s)));
const storage=new Map();globalThis.window={localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v),removeItem:k=>storage.delete(k)}};
const {localsave}=await import('../../js/localsave.js');
const main=readFileSync('js/main.js','utf8'),ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave,cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
const g=ctx.game;g.ui={title:false};g.attach=function(s){this.sim=s;};
function session(sim){g.sim=clone(sim);g.company={props:[{name:'Outgoing',sim:g.sim}],active:0,feed:[]};}
const ui=Object.create(UI.prototype),modal={innerHTML:''};ui.g={sim:clone(full),company:{props:[{}]}};ui.root={querySelectorAll:()=>[]};ui.$=()=>modal;ui.pauseForPopup=()=>{};ui.resumePopup=()=>{};ui.renderTut=()=>{};ui.spendingHtml=()=>'';ui.g.rend={view:1,setView(v){this.view=v},setPreview(v){this.preview=v}};
for(const f of [0,1,2]){ui.sel=ui.sim.objs('unit').find(u=>(u.f||0)===f).id;assert.match(ui.inspector(),new RegExp(`Floor ${f+1}`));}
ui.g.sim=makeMaple();ui.sel=ui.sim.objs('unit').find(u=>u.num===107).id;for(const expanded of [false,true]){ui.sheetTall=expanded;const html=ui.inspector();assert.match(html,/data-cmd='[^']*ownerMakeReady/);assert.match(html,/dock-actions/);}
assert.ok(ui.sim.dispatch({type:'ownerMakeReady',unit:ui.sel,forceOwner:true}).ok);assert.match(ui.inspector(),/assigned \/ responding/);
console.log('PASS dynamic F1/F2/F3 identity and Unit 107 compact/Details action continuity');
ui.g.sim=clone(base);assert.ok(ui.sim.dispatch({type:'commission',all:true}).ok);const unrelated=ui.sim.objs('unit').find(u=>u.f===1);unrelated.cstate='ready';unrelated.commercial='none';ui.sim.markDirty();ui.sim.ensure();const sh=ui.sim.objs('shell')[0];ui.showVertical(sh.id,{stairs:true});assert.ok(ui.verticalQuote);assert.equal(ui.verticalReview.stairs,false);assert.match(modal.innerHTML,/Preview on map/);assert.match(modal.innerHTML,/Demand evidence/);assert.match(modal.innerHTML,/No existing stairwell/);ui.closeModal();ui.showFloors();assert.match(modal.innerHTML,/F2/);
const R=ui.sim.verticalPlan(sh.id);ui.sim.dispatch({type:'verticalUpgrade',...R});const ord=ui.sim.s.orders.at(-1);ui.showFloors();assert.match(modal.innerHTML,/F3 · 0% · reinforce/);
while(ord.st==='construction'){if(ord.vertical.phase>=2)assert.equal(ui.completedFloors(ui.sim.s.objects[sh.id]),2);ui.sim.s.t++;tickVertical(ui.sim,ord);ui.sim.ensure();for(const el of ui.sim.objs('elevator'))ui.sim.updateElevator(el);}
const event=ui.sim.events.findLast(e=>e.type==='complete');assert.equal(event.ready,14);assert.equal(event.units,14);assert.ok(Number.isInteger(event.totalReady));assert.equal(ui.sim.events.filter(e=>e.type==='access_lost').length,0);
const newUnits=ui.sim.objs('unit').filter(u=>u.order===ord.id),otherReady=ui.sim.objs('unit').filter(u=>u.cstate==='ready'&&u.order!==ord.id);const cash=ui.sim.s.cash;ui.sim.dispatch({type:'commission',order:ord.id});assert.ok(newUnits.every(u=>u.cstate==='operating'));assert.ok(otherReady.every(u=>u.cstate==='ready'));assert.equal(ui.sim.s.cash,cash);
const target=newUnits[0];for(const fc of ui.sim.unitFront(target))ui.sim.s.hall[target.f][ui.sim.idx(fc.x,fc.y)]=0;ui.sim.markDirty();ui.sim.ensure();assert.ok(target.blocked);assert.ok(ui.sim.events.some(e=>e.type==='access_lost'));
console.log('PASS completion order count, scoped zero-charge commissioning, atomic handover and real disconnected-unit incident');
const maple=makeMaple(),shell=maple.objs('shell')[0];maple.s.cash=1000000;assert.equal(maple.verticalPlan(shell.id).cost,17810);assert.equal(maple.verticalPlan(shell.id,{fitout:false}).cost,12470);assert.equal(base.verticalPlan(shell.id).cost,10210);assert.equal(base.verticalPlan(shell.id,{fitout:false}).cost,4870);
for(const partial of [false,true]){const s=clone(base),R=s.verticalPlan(sh.id),initial=s.s.cash;s.dispatch({type:'verticalUpgrade',...R});const q=s.s.orders.at(-1);if(partial){while(q.vertical.phase<1){s.s.t++;tickVertical(s,q);s.ensure();}for(let k=0;k<100;k++){s.s.t++;tickVertical(s,q);s.ensure();}}const detail=s.cancelRefund(q);assert.equal(detail.refund,partial?Math.round(detail.refundable*.6):R.cost);assert.ok(s.dispatch({type:'cancelOrder',id:q.id}).ok);assert.equal(s.s.cash,initial-R.cost+detail.refund);const next=s.verticalPlan(sh.id);assert.equal(next.cost,partial?R.cost-396:R.cost);assert.ok(s.s.ledger.some(l=>l.cat==='construction_fact'&&l.penalty===detail.penalty));const before=s.s.cash;assert.ok(s.dispatch({type:'verticalUpgrade',...next}).ok);assert.equal(s.s.cash,before-next.cost);assert.ok(s.s.ledger.some(l=>l.note.startsWith('Recommitment:')));}
console.log('PASS exact F2/F3 full/structure-only prices, full undo, proportional partial refund, retained reinforcement, re-quote and separate ledger facts');
session(full);localsave.put(g.rawSaveCode(g.saveJSON()),g.saveMeta());localsave.keep({code:'older-code',meta:{name:'Earlier',day:1,cash:100}});let slots=JSON.stringify([...storage]),company=g.company;assert.equal(await g.loadCode('garbage',true),false);assert.equal(g.company,company);assert.equal(JSON.stringify([...storage]),slots);const incoming=await g.loadCode(await g.saveCode(),true);assert.ok(incoming);assert.equal(g.company,company);assert.equal(JSON.stringify([...storage]),slots);assert.ok(localsave.keepPreserving({code:g.rawSaveCode(g.saveJSON()),meta:g.saveMeta()}));assert.equal(localsave.archives()[0].meta.name,'Earlier');assert.equal(localsave.getKept().meta.name,'Outgoing');
console.log('PASS real import parser/migration is non-mutating; outgoing and earlier games retained separately');
session(base);const c21=readFileSync('tests/fixtures/candidate21-three-floor-save.json','utf8'),old=JSON.parse(c21);assert.equal(await g.loadCode(c21),true);assert.equal(g.sim.s.cash,old.cash);assert.deepEqual(JSON.parse(JSON.stringify(g.sim.s.objects)),old.objects);assert.deepEqual(JSON.parse(JSON.stringify(g.sim.s.orders)),old.orders);console.log('PASS committed immutable Candidate 21 F3 save migration preserves cash, objects and orders');
const outgoing={code:g.rawSaveCode(g.saveJSON()),meta:g.saveMeta()},imported={code:g.rawSaveCode(JSON.stringify(base.s)),meta:{name:'Imported',day:base.day,cash:base.s.cash}};
let beforeTransaction=JSON.stringify([...storage]),realSet=window.localStorage.setItem,failOnce=true;
window.localStorage.setItem=(k,v)=>{if(k==='sst.autosave.main'&&failOnce){failOnce=false;throw Error('quota');}return realSet(k,v);};
assert.equal(localsave.activateImport(outgoing,imported),false);assert.equal(JSON.stringify([...storage]),beforeTransaction);window.localStorage.setItem=realSet;
assert.equal(localsave.activateImport(outgoing,imported),true);assert.equal(localsave.get().main.code,imported.code);assert.equal(localsave.getKept().code,outgoing.code);assert.equal(await g.loadCode(localsave.get().main.code),true);assert.equal(g.sim.s.cash,base.s.cash);
console.log('PASS atomic import quota rollback and reload from the persisted incoming slot');
const rows=[];
for(const seed of [1,2,3,4]){
 const s=clone(full);s.s.rngS=seed;s.s.open=true;const sets=Object.fromEntries(['selected','entered','waiting','riding','visited','cart','returned','cartReturned'].map(k=>[k,new Set()]));const snapshots=new Set();
 for(let i=0;i<43200;i++){
  s.step();for(const e of s.events)if(e.type==='lease'&&e.f===2)sets.selected.add(e.unit);s.events=[];
  for(const el of s.objs('elevator')){assert.ok(el.riders.reduce((n,r)=>n+r.slots,0)<=4);const ids=[...el.q.flat(),...el.riders.map(r=>r.a)];assert.equal(ids.length,new Set(ids).size);}
  for(const a of s.s.agents){if(a.kind!=='cust'||s.s.objects[a.unit]?.f!==2)continue;const unit=s.s.objects[a.unit],building=s.D.shellAt[s.idx(unit.x,unit.y)];if(s.D.shellAt[s.idx(Math.floor(a.x),Math.floor(a.y))]===building)sets.entered.add(a.id);if(a.st==='elev'&&!a.inElev)sets.waiting.add(a.id);if(a.inElev)sets.riding.add(a.id);if(a.st==='atunit'&&a.f===2){assert.equal(s.D.shellAt[s.idx(Math.floor(a.x),Math.floor(a.y))],building);sets.visited.add(a.id);}if(a.cart&&a.f===2)sets.cart.add(a.id);if(a.f===0&&sets.visited.has(a.id)){sets.returned.add(a.id);if(sets.cart.has(a.id))sets.cartReturned.add(a.id);}
   const stage=a.st==='elev'?(a.inElev?'riding':'waiting'):a.f===2&&a.path?'travelling':null;
   if(stage&&!snapshots.has(stage)){snapshots.add(stage);session(s);const code=await g.saveCode();assert.equal(await g.loadCode(code),true);const expected=clone(s),loaded=g.sim;expected.s.speed=0;for(let k=0;k<120;k++){expected.step();loaded.step();expected.events=[];loaded.events=[];}assert.deepEqual(JSON.parse(JSON.stringify(loaded.s)),JSON.parse(JSON.stringify(expected.s)));}
  }
 }
 let drainMinutes=0;for(;drainMinutes<1440&&[...sets.visited].some(id=>!sets.returned.has(id));drainMinutes++){s.step();s.events=[];for(const a of s.s.agents)if(a.f===0&&sets.visited.has(a.id)){sets.returned.add(a.id);if(sets.cart.has(a.id))sets.cartReturned.add(a.id);}}
 assert.ok([...sets.visited].every(id=>sets.returned.has(id)),`seed ${seed}: a visited F3 customer failed to return within one additional day`);
 for(const k of ['selected','entered','waiting','riding','visited','cart','returned','cartReturned'])assert.ok(sets[k].size>0,`seed ${seed} missing ${k}`);assert.deepEqual([...snapshots].sort(),['riding','travelling','waiting']);rows.push({seed,minutes:43200,drainMinutes,...Object.fromEntries(Object.entries(sets).map(([k,v])=>[k,v.size])),reloadStages:[...snapshots],failures:0});
}
console.log(JSON.stringify({candidate22OrdinaryGameplay:rows}));
console.log('PASS four ordinary 30-day fixed-seed runs with matching F3 leases, correct-building visits, freight/cart round trips and actual SST1 waiting/riding/travelling reload replay');
