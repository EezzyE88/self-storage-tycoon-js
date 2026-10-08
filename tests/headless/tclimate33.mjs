import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import vm from 'node:vm';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {UI} from '../../js/ui.js';
import {diagnoseComplaint,complaintKey} from '../../js/complaints.js';
import {climateInventory,climateCauseKey,validClimateSnapshot} from '../../js/climateavailability.js';
const exact=readFileSync(new URL('./fixtures/decideLease-c32.js.txt',import.meta.url),'utf8');
const baseline=Function('MARKETS','clamp','return function '+exact.trim())(MARKETS,(v,a,b)=>Math.max(a,Math.min(b,v)));
let n=0;const test=(name,f)=>{f();n++;console.log('PASS '+name);};
function setup(seed=33){const sim=makeMaple(seed);sim.s.tut={on:false,done:true,flags:{}};for(const u of sim.objs('unit'))Object.assign(u,{env:'std',commercial:'occupied',cstate:'operating',blocked:false});return {sim,u:sim.objs('unit')[0]};}
function lose(sim,size){const ag={id:900,kind:'cust',size,x:2,y:3,f:0};assert.equal(sim.decideLease({size,climate:true},ag),null);return sim.s.thoughts.at(-1);}
for(const [name,changes,pattern] of [
 ['absent',null,/No matching-size climate stock/],
 ['occupied',{env:'climate',commercial:'occupied'},/wait for turnover/],
 ['reserved',{env:'climate',commercial:'reserved'},/reserved climate stock/],
 ['make-ready',{env:'climate',commercial:'unready',lease:null},/make-ready jobs/],
 ['blocked',{env:'climate',commercial:'ready',blocked:true,missing:['Door needs hallway'],accessHold:72},/freight route/],
 ['unfinished',{env:'climate',commercial:'ready',cstate:'built',missing:['HVAC capacity exceeded for this zone']},/commissioning checklist/]])test(name+' records stock and provides cause-specific guidance',()=>{
 const {sim,u}=setup();if(changes)Object.assign(u,changes);const th=lose(sim,u.size),d=diagnoseComplaint(sim,th);
 assert.ok(validClimateSnapshot(th.climateAvailability));assert.match(d.remedy,pattern);assert.match(d.cause,/At report time/);assert.match(d.cause,/Current matching climate inventory/);
 assert.equal(sim.s.lost.noClimate,1);if(changes){assert.equal(th.climateAvailability.units[0].id,u.id);assert.deepEqual(th.climateAvailability.units[0].missing,u.missing||[]);}
});
test('mixed/overlapping states retain every applicable count and remedy',()=>{
 const {sim,u}=setup(),other=sim.objs('unit').find(x=>x.size===u.size&&x.id!==u.id);
 Object.assign(u,{env:'climate',commercial:'unready',lease:null,blocked:true});Object.assign(other,{env:'climate',commercial:'reserved'});
 const th=lose(sim,u.size),r=th.climateAvailability,d=diagnoseComplaint(sim,th);assert.equal(r.counts.makeReady,1);assert.equal(r.counts.blocked,1);assert.equal(r.counts.reserved,1);
 for(const p of [/make-ready/,/blocked/,/reserved/])assert.match(d.remedy,p);
});
test('wrong-size stock and climate noSize keep original outcome category',()=>{
 const {sim,u}=setup();Object.assign(u,{env:'climate',commercial:'ready'});const size='unknown-size',th=lose(sim,size);assert.equal(th.complaint,'noSize');assert.equal(sim.s.lost.noSize,1);assert.equal(th.climateAvailability.total,0);assert.match(diagnoseComplaint(sim,th).remedy,/No matching-size/);
});
test('report stays historical after current stock and prerequisites change; save/reload retains snapshot',()=>{
 const {sim,u}=setup();Object.assign(u,{env:'climate',commercial:'ready',blocked:true,f:1,missing:['Disconnected freight entrance']});const th=lose(sim,u.size),before=JSON.stringify(th);
 Object.assign(u,{commercial:'ready',blocked:false,missing:[]});const r=diagnoseComplaint(sim,th);assert.equal(r.climate.historical.counts.blocked,1);assert.equal(r.climate.current.counts.eligible,1);assert.equal(JSON.stringify(th),before);
 const loaded=new Sim(JSON.parse(JSON.stringify(sim.s)));assert.deepEqual(loaded.s.thoughts.at(-1).climateAvailability,th.climateAvailability);assert.match(diagnoseComplaint(loaded,loaded.s.thoughts.at(-1)).cause,/At report time/);
});
test('legacy and malformed reports acknowledge unknown history; standard ready stock excluded',()=>{
 const {sim,u}=setup();u.commercial='ready';const th={text:'I need climate control.',kind:'bad',requestedSize:u.size,requestedClimate:true};
 for(const climateAvailability of [undefined,{v:1,units:null}]){const r=diagnoseComplaint(sim,{...th,climateAvailability});assert.match(r.cause,/not recorded/);assert.equal(r.climate.current.counts.eligible,0);}
});
test('diagnostics read stored readiness and never revalidate or consume RNG',()=>{
 const {sim,u}=setup();Object.assign(u,{env:'climate',commercial:'ready',missing:['HVAC capacity exceeded for this zone'],unpowered:true});
 const before=JSON.stringify(sim.s),events=JSON.stringify(sim.events);const r=climateInventory(sim,u.size);assert.equal(r.counts.eligible,1);assert.equal(JSON.stringify(sim.s),before);assert.equal(JSON.stringify(sim.events),events);
 u.cstate='built';assert.equal(climateInventory(sim,u.size).counts.eligible,0);
});
test('snapshot list is bounded while counts and omitted totals stay complete',()=>{
 const {sim,u}=setup();for(let i=0;i<30;i++){const added={...u,id:10000+i,env:'climate',commercial:'unready',lease:null};sim.s.objects[added.id]=added;sim.D.byType.unit.push(added);}
 const th=lose(sim,u.size),r=th.climateAvailability;assert.equal(r.total,30);assert.equal(r.units.length,12);assert.equal(r.omitted,18);assert.equal(r.counts.makeReady,30);assert.ok(validClimateSnapshot(r));
});
function uiFor(sim){const ui=Object.create(UI.prototype);ui.g={sim,rend:{pool:{ppl:new Map()},project:()=>({x:100,y:100})}};ui.feedbackSim=sim;ui.bubbles=[];ui.toasts=[];ui.bubbleSeen=new Map();ui.phone=()=>true;ui.bindComplaintBubble=()=>{};ui.bubRoot={appendChild(){}};return ui;}
let now=10000;globalThis.performance={now:()=>now};globalThis.document={createElement(){return {innerHTML:'',remove(){}};}};
test('4x burst groups identical causes across sizes and separates other causes without extending expiry',()=>{
 const {sim,u}=setup(),ui=uiFor(sim);sim.s.speed=4;const sizes=[...new Set(sim.objs('unit').map(u=>u.size))].slice(0,2);const cash=sim.s.cash;
 for(let i=0;i<8;i++){sim.s.t+=25;const th=lose(sim,sizes[i%2]);ui.addBubble(th);}
 assert.equal(ui.bubbles.length,1);assert.match(ui.bubbles[0].el.innerHTML,/×8/);assert.equal(sim.s.lost.noClimate,8);assert.equal(sim.s.cash,cash);
 const old=ui.bubbles[0];Object.assign(u,{env:'climate',commercial:'unready',lease:null});sim.s.t+=25;ui.addBubble(lose(sim,u.size));assert.equal(ui.bubbles.length,2);assert.notEqual(climateCauseKey(sim.s.thoughts.at(-1).climateAvailability),old.th.availability);
 assert.notEqual(complaintKey(sim.s.thoughts.at(-1)),complaintKey(old.th));now=14600;ui.updateBubbles();assert.equal(ui.bubbles.length,0);ui.addBubble(old.th);assert.equal(ui.bubbles.length,0);now=22100;ui.addBubble(old.th);assert.equal(ui.bubbles.length,1);
});
test('feedback exposes historical and current unit inspection through existing guarded navigation',()=>{
 const {sim,u}=setup();Object.assign(u,{env:'climate',commercial:'ready',blocked:true,missing:['Door needs hallway']});lose(sim,u.size);const ui=uiFor(sim);const before=JSON.stringify(sim.s),html=ui.feedbackSheet();
 for(const p of [/At report time/,/Current inventory/,/View reported Unit/,/Inspect current Unit/,/Door needs hallway/,/data-property/])assert.match(html,p);
 assert.equal(JSON.stringify(sim.s),before);
});
test('monthly climate suggestion describes recorded losses, no promised leases or automatic HVAC purchase',()=>{
 const {sim}=setup();sim.s.days=Array.from({length:30},()=>({rent:100,opex:1,payroll:1,service:0,marketing:0}));sim.s.mkt.lostLog=[{d:sim.day,r:'noClimate',sz:'5x5',climate:true},{d:sim.day,r:'noClimate',sz:'10x10',climate:true}];sim.monthReport(sim.day);
 const report=sim.s.mkt.reports.at(-1);assert.ok(report);const all=JSON.stringify(report);assert.match(all,/climate-related availability losses/);assert.match(all,/does not guarantee leases/);assert.doesNotMatch(all,/would capture|An HVAC plant/);
});
test('legacy monthly advice is corrected at display time without rewriting saved history',()=>{
 const {sim}=setup();sim.s.days=Array.from({length:30},()=>({rent:100}));sim.monthReport(sim.day);const r=sim.s.mkt.reports.at(-1);
 r.sug=['27 shoppers needed climate control. An HVAC plant plus climate units would capture them.'];const ui=uiFor(sim),before=JSON.stringify(sim.s),html=ui.reportHtml();assert.match(html,/27 climate-related availability losses/);assert.doesNotMatch(html,/would capture/);assert.equal(JSON.stringify(sim.s),before);
});
function normalized(s){const copy=JSON.parse(JSON.stringify(s));delete copy.thoughts;for(const a of copy.agents)if(a.complaintKeys)a.complaintKeys=a.complaintKeys.map(k=>{const arr=JSON.parse(k);return JSON.stringify(arr.slice(0,11));});return copy;}
function pair(seed,changes){const a=setup(seed).sim,b=setup(seed).sim;changes(a);changes(b);b.decideLease=baseline;return [a,b];}
const states=[null,{env:'climate',commercial:'occupied'},{env:'climate',commercial:'reserved'},{env:'climate',commercial:'unready',lease:null},{env:'climate',commercial:'ready',blocked:true},{env:'climate',commercial:'ready',cstate:'built'}, {env:'std',commercial:'ready',lease:null}, {env:'climate',commercial:'ready',lease:null,missing:['Climate zone has no HVAC capacity']}];
test('2048 directed offers across 128 seeds equal exact Candidate 32 outcomes and non-report state',()=>{
 let accepted=0,rejected=0;
 for(let seed=1;seed<=128;seed++)for(const state of states)for(const climate of [false,true]){
  const [a,b]=pair(seed,s=>{if(state)Object.assign(s.objs('unit')[0],state);});const v={size:a.objs('unit')[0].size,climate},ag={id:900,kind:'cust',size:v.size,x:2,y:3,f:0};
  assert.deepEqual(a.decideLease(v,{...ag}),b.decideLease(v,{...ag}));assert.deepEqual(normalized(a.s),normalized(b.s));assert.deepEqual(a.events.filter(e=>e.type!=='thought'),b.events.filter(e=>e.type!=='thought'));
  if(state?.env==='std'&&state.commercial==='ready'&&climate){if(a.s.today.leases)accepted++;else rejected++;assert.equal(a.s.lost.noClimate||0,0,'fallback rejection remains market outcome');}
 }
 assert.ok(accepted>0 && rejected>0);console.log(`  standard fallback: ${accepted} accepted, ${rejected} rejected`);
});
test('8 seeded one-day simulations (11520 ticks) preserve RNG, economic state and non-thought events',()=>{
 for(let seed=1;seed<=8;seed++){
  const [a,b]=pair(seed,()=>{});
  for(let t=0;t<1440;t++){a.step();b.step();assert.deepEqual(a.events.filter(e=>e.type!=='thought'),b.events.filter(e=>e.type!=='thought'));a.events=[];b.events=[];}
  assert.deepEqual(normalized(a.s),normalized(b.s));
 }
});
// Exercise the real compressed/plain exporter, validator and loader in addition to JSON reconstruction.
{
 const main=readFileSync('js/main.js','utf8'),ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},savearchive:{},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
 vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
 const {sim,u}=setup();Object.assign(u,{env:'climate',commercial:'unready',lease:null});lose(sim,u.size);const snapshot=JSON.stringify(sim.s.thoughts.at(-1).climateAvailability),g=ctx.game;
 g.sim=sim;g.company={props:[{name:'Climate test',sim}],active:0,feed:[]};g.ui={title:false};g.rend={view:0};g.attach=function(s){this.sim=s;};
 const json=g.saveJSON();for(const code of [g.rawSaveCode(json),await g.saveCode(json)]){assert.equal(await g.loadCode(code),true);assert.equal(JSON.stringify(g.sim.s.thoughts.at(-1).climateAvailability),snapshot);assert.equal(g.sim.s.speed,0);}
 n++;console.log('PASS actual SST0/SST1 save/export/validation/load preserve climate snapshot and pause');
}
console.log(n+' climate diagnostics checks passed (Node/DOM fixtures, not Safari acceptance)');
