// Deterministic F2 cancellation arithmetic (addendum E). Only construction is ticked (tickVertical), so no rent,
// wages or other cash moves interfere; every cash change must be an explicit, separate ledger entry.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {tickVertical,verticalRefund,cancellationBreakdown} from '../../js/vertical.js';

const main=readFileSync('js/main.js','utf8');
const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},savearchive:{list:()=>[],push:()=>true,wouldDrop:()=>null},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);
const g=context.game;g.ui={title:false};g.attach=function(s){this.sim=s;};

const sim=makeMaple(3);sim.s.cash=1000000;const SH=sim.objs('shell')[0].id,sh=()=>sim.s.objects[SH];
const ledger=()=>sim.s.ledger.filter(x=>x.cat==='capex').map(x=>[x.amt,x.note]);const L0=ledger().length;
const tick=(n,ord)=>{for(let i=0;i<n;i++){sim.s.t++;tickVertical(sim,ord);}};
const log=[];

// 1. Original commitment: $17,810, reinforcement $396 included.
const Q1=sim.verticalPlan(SH);assert.equal(Q1.cost,17810);const reinf=Q1.rows.find(r=>r.label==='Structural reinforcement').cost;assert.equal(reinf,396);
let cash=sim.s.cash;assert.ok(sim.dispatch({type:'verticalUpgrade',...Q1}).ok);assert.equal(sim.s.cash,cash-17810);let ord=sim.s.orders.at(-1);
assert.equal(ord.vertical.stages.reduce((n,t)=>n+t.cost,0),17810,'stage costs sum to the package');log.push(['commit',17810]);

// 2. Full undo inside the 30-minute grace window.
tick(20,ord);let B=cancellationBreakdown(sim,ord);assert.equal(B.undo,true);assert.equal(B.refund,17810);assert.equal(B.penalty,0);assert.equal(B.nonRefundable,0);assert.equal(B.cashAfter,cash);
assert.ok(sim.dispatch({type:'cancelOrder',id:ord.id}).ok);assert.equal(sim.s.cash,cash,'full undo restores cash exactly');assert.equal(sh().plannedMaxFloors??sh().floors,1);log.push(['undo',17810]);
assert.equal(sim.verticalPlan(SH).cost,17810,'nothing retained after a full undo');

// 3. Recommit and cancel after reinforcement completes (partial cancellation).
cash=sim.s.cash;const Q2=sim.verticalPlan(SH);sim.dispatch({type:'verticalUpgrade',...Q2});ord=sim.s.orders.at(-1);assert.equal(sim.s.cash,cash-17810);log.push(['recommit',17810]);
while(ord.vertical.phase<1)tick(1,ord);tick(100,ord); // 100 minutes into the structure stage
const V=ord.vertical,st=V.stages[V.phase];assert.equal(st.kind,'structure');
const remaining=V.stages.slice(V.phase+1).reduce((n,t)=>n+t.cost,0)+st.cost*(1-V.elapsed/st.dur),expected=Math.round(remaining*0.6);
B=cancellationBreakdown(sim,ord);
assert.equal(B.undo,false);assert.equal(B.refund,expected);assert.equal(B.refund,verticalRefund(sim,ord).refund);
assert.deepEqual(B.completed,[{kind:'reinforce',cost:396}]);assert.deepEqual(B.retained,[{kind:'reinforce',cost:396}],'4. exact retained reinforcement value');
assert.ok(Math.abs(B.completedCost+B.inProgressBuilt+B.unbuilt-17810)<1e-9,'charge = completed + in progress + unbuilt');
assert.ok(Math.abs(B.penalty-(B.unbuilt-B.refund))<1e-9);assert.equal(B.nonRefundable,17810-expected);
const pre=sim.s.cash;assert.ok(sim.dispatch({type:'cancelOrder',id:ord.id}).ok);assert.equal(sim.s.cash-pre,expected,'refund paid exactly');assert.equal(B.cashAfter,sim.s.cash);
log.push(['partial cancel',expected,'retained',396,'penalty',Math.round(B.penalty*100)/100,'in-progress consumed',Math.round(B.inProgressBuilt*100)/100]);
assert.equal(sh().plannedMaxFloors,2);assert.equal(sh().structuralRightsPaid,396);assert.equal(sh().floors,1,'no floor added by a cancelled package');

// 5-6. Exact second quote omits the retained reinforcement; no duplicated charge for it.
const Q3=sim.verticalPlan(SH);assert.equal(Q3.cost,17810-396);assert.ok(!Q3.rows.some(r=>r.label==='Structural reinforcement'));
cash=sim.s.cash;sim.dispatch({type:'verticalUpgrade',...Q3});ord=sim.s.orders.at(-1);assert.equal(sim.s.cash,cash-17414);assert.equal(ord.vertical.stages[0].cost,0,'reinforcement stage not charged again');log.push(['second quote commit',17414]);

// 7. Reload through the production SST1 path without another charge, then finish.
tick(500,ord);g.sim=sim;g.company={props:[{name:'Maple',sim}],active:0,feed:[]};const before=sim.s.cash,capexBefore=ledger().length;
assert.equal(await g.loadCode(await g.saveCode()),true);const R=g.sim;assert.equal(R.s.cash,before);assert.equal(R.s.ledger.filter(x=>x.cat==='capex').length,capexBefore);
const o2=R.s.orders.at(-1);for(let i=0;i<60000&&o2.st==='construction';i++){R.s.t++;tickVertical(R,o2);}assert.equal(o2.st,'done');assert.equal(R.s.cash,before,'completion and handover charge nothing');assert.equal(R.s.objects[SH].floors,2);
assert.ok(R.dispatch({type:'commission',order:o2.id}).ok);assert.equal(R.s.cash,before);

// Separate ledger entries: original, undo refund, recommitment, partial refund, second commitment.
const entries=JSON.parse(JSON.stringify(R.s.ledger.filter(x=>x.cat==='capex').slice(L0).map(x=>[x.amt,x.note]))); // reloaded state lives in the VM realm
assert.deepEqual(entries,[[-17810,'Building 12 → F2'],[17810,'Cancelled: Building 12 → F2'],[-17810,'Building 12 → F2'],[expected,'Cancelled: Building 12 → F2'],[-17414,'Building 12 → F2']]);
const net=-entries.reduce((n,[a])=>n+a,0);assert.equal(net,17810-expected+17414);
console.log('cancellation ledger',JSON.stringify(entries));console.log('steps',JSON.stringify(log));
console.log(`PASS F2 cancellation arithmetic: $17,810 commit, full undo $17,810, partial refund $${expected} after reinforcement (retained $396), second quote $17,414 with no duplicated reinforcement, production reload without a second charge; net spent $${net}`);
