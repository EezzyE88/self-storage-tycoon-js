// RN-01: production save envelope/restore, real Sim leases, and paused state.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {Sim,fmtTime,newState} from '../../js/sim.js';
import {makeScenario,makeSandbox,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {makeMaple} from '../../js/maple.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE,financialTime} from '../../js/finance.js';
import {installTutorial,lessonTick,lessonAllowed,lessonById} from '../../js/tutorial.js';
import {careerEligibility,portfolioCareer} from '../../js/career.js';
import {UI} from '../../js/ui.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
const main=readFileSync('js/main.js','utf8');
const ctx=vm.createContext({portfolioCareer,Sim,fmtTime,makeScenario,makeSandbox,makeMaple,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,installTutorial,localsave,savearchive,Audio:class{},performance,console,BUILD:{name:'rn01-test'},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+'function makeMapleSeedPrice(day){return 95000+(day%7)*1500;}globalThis.game=game;',ctx);
const g=ctx.game;g.attach=function(sim){this.sim=sim;installTutorial(sim)};g.ui={title:false,setMeta(){},renderFeed(){},toast(){}};g.drain=()=>{};
const s=newState({mode:'sandbox'});s.mode='sandbox';s.open=true;s.t=190*MIN_PER_DAY+360;s.finance.lastDay=190;
s.objects[999]={id:999,type:'unit',size:'10x10',env:'std',num:1010,x:5,y:5,f:0,w:2,h:2,dir:[0,1],access:'drive',cond:1,cstate:'operating'};
s.unitNumbering.next[0]=1011;s.market.ask['10x10|std']=180;
s.leases[22]={id:22,unit:999,tenant:77,rent:100,start:1,nextBill:221,status:'current',balance:0,fees:0};
s.tenants[77]={id:77,name:'RN01 Test',lease:22,sat:.8};
const sim=new Sim(s);g.sim=sim;g.company={props:[{name:'RN01',sim}],active:0,feed:[]};
assert.equal(sim.act_rentReview({key:'10x10|std',pct:.1}).ok,true);
const expected=structuredClone(s.leases[22].rentNotice),cash=s.cash,t=s.t;s.speed=0;
let n=0;
for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){
 for(let i=0;i<2;i++){
  const prep=await g.prepareLoad(code);assert.ok(prep.ok,prep.msg);
  assert.equal(g.applyLoad(prep),true);
  const S=g.sim.s,L=S.leases[22];assert.deepEqual(JSON.parse(JSON.stringify(L.rentNotice)),expected);
  assert.equal(L.rent,100);assert.equal(S.cash,cash);assert.equal(S.t,t);assert.equal(S.speed,0);
  g.sim.rnd=()=>0;S.t=financialTime(221);S.finance.lastDay=220;
  assert.equal(g.sim.financialBatch(),true);assert.equal(L.rent,110);const cashAfter=S.cash;
  assert.equal(g.sim.financialBatch(),false);assert.equal(S.cash,cashAfter);assert.equal(S.speed,0);
  n++;console.log('PASS RN-01 production save/load + exact-once bill '+(typeof code==='string'&&code.startsWith('SST')?'raw':'compressed')+' round '+(i+1));
 }
}
// Legacy saves without optional notice fields remain loadable and unchanged.
const legacy=structuredClone(s);delete legacy.leases[22].rentNotice;legacy.speed=0;
const old=await g.prepareLoad(g.rawSaveCode(JSON.stringify(legacy)));
assert.ok(old.ok,old.msg);assert.equal(g.applyLoad(old),true);assert.equal(g.sim.s.leases[22].rentNotice,undefined);assert.equal(g.sim.s.leases[22].rent,100);
n++;console.log('PASS RN-01 legacy optional-notice omission');
console.log(`${n} RN-01 production save checks passed`);
