import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {position} from '../../js/finance.js';
import {monthlyReportPeriods,periodText} from '../../js/reporting.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS '+name);};
const daily=day=>({day,rent:100,anc:0,opex:1,payroll:1,service:0,marketing:0,interest:0,leases:0,moveouts:0});
function setup(day=31,first=1){const sim=makeMaple(34);sim.s.tut={on:false,done:true,flags:{}};sim.s.t=(day-1)*1440;sim.s.days=Array.from({length:day-first},(_,i)=>daily(first+i));sim.s.today=daily(day);sim.s.mkt.reports=[];sim.s.mkt.lostLog=[];return sim;}
const loss=(d,r='noSize',climate=false)=>({d,r,sz:'10x10',climate});
function uiFor(sim){const ui=Object.create(UI.prototype);ui.g={sim};return ui;}
test('monthly shopper counts include first and last completed days, excluding outside/today/future',()=>{
 const sim=setup();sim.s.mkt.lostLog=[loss(0),loss(1),loss(30),loss(31),loss(32)];sim.monthReport(31);const R=sim.s.mkt.reports.at(-1);
 assert.equal(R.lost.noSize,2);assert.deepEqual(R.period,{start:1,end:30});assert.equal(R.collected,3000);assert.equal(R.contrib,2940);
});
test('all recorded loss categories use the same completed monthly endpoints',()=>{
 const sim=setup(61,31);for(const r of ['noSize','noReady','noClimate','service','price','competitor','convenience','shopping','reputation'])sim.s.mkt.lostLog.push(loss(30,r),loss(31,r),loss(60,r),loss(61,r));
 sim.monthReport(61);const R=sim.s.mkt.reports.at(-1);for(const v of Object.values(R.lost))assert.equal(v,2);assert.deepEqual(R.period,{start:31,end:60});
});
test('size recommendation includes earliest completed-day losses',()=>{
 const sim=setup();sim.s.mkt.lostLog=[loss(1),loss(1,'noReady'),loss(30),loss(31)];sim.monthReport(31);
 assert.ok(sim.s.mkt.reports.at(-1).sug.some(t=>t.startsWith('3 shoppers wanted a 10x10')));
});
test('partial first report uses the actual retained financial-day range',()=>{
 const sim=setup(31,11);sim.s.mkt.lostLog=[loss(10),loss(11),loss(30),loss(31)];sim.monthReport(31);const R=sim.s.mkt.reports.at(-1);
 assert.deepEqual(R.period,{start:11,end:30});assert.equal(R.lost.noSize,2);assert.equal(R.collected,2000);
});
test('current rolling period includes today but excludes expired and future losses',()=>{
 const sim=setup(381,351);sim.s.mkt.lostLog=[loss(351),loss(352),loss(381),loss(382)];assert.equal(sim.lostRecent(30).noSize,2);
 const d=sim.diagnostics().find(d=>d.cause.includes('10x10'));assert.ok(d.cause.startsWith('2 shoppers'));
});
test('saved monthly 14 and rolling 20 stay independent and display their dates',()=>{
 const sim=setup(361,331);sim.s.mkt.lostLog=Array.from({length:14},()=>loss(340));sim.monthReport(361);const R=sim.s.mkt.reports.at(-1),stored=JSON.stringify(R);
 sim.s.t=380*1440+825;sim.s.mkt.lostLog.push(...Array.from({length:20},()=>loss(380)));const ui=uiFor(sim);
 assert.match(ui.reportHtml(),/completed Days 331–360/);assert.match(ui.reportHtml(),/generated Day 361/);assert.match(ui.diagnosticHtml(),/Days 352–381, today so far/);assert.match(ui.diagnosticHtml(),/20 shoppers wanted 10x10/);assert.equal(JSON.stringify(R),stored);
});
test('standard and climate availability counts are labeled separately',()=>{
 const sim=setup();sim.s.mkt.lostLog=[loss(30),loss(30,'noSize',true),loss(30,'noClimate',true)];const ui=uiFor(sim),html=ui.diagnosticHtml();
 assert.match(html,/1 shoppers wanted 10x10 and/);assert.match(html,/2 shoppers wanted 10x10 climate/);assert.match(html,/separate standard and climate/);
});
test('historical service losses with empty queue do not diagnose current shortage or advise hiring',()=>{
 const sim=setup();sim.s.officeQ=[];sim.s.mkt.lostLog=Array.from({length:7},()=>loss(30,'service'));sim.operations();const before=JSON.stringify(sim.s);const d=sim.diagnostics().find(d=>d.cause.includes('service-related'));
 assert.match(d.cause,/0 waiting now; 0 being served/);assert.match(d.effect,/Historical office losses/);assert.match(d.consequence,/do not establish a current staffing shortage/);assert.doesNotMatch(d.action,/hire|Clerk|Free Owner/i);assert.equal(JSON.stringify(sim.s),before);
});
test('resolved staffing does not turn old losses into an automatic Clerk recommendation',()=>{
 const sim=setup();sim.s.staff.push({id:999,role:'clerk',wage:20});sim.s.agents.push({id:1000,kind:'staff',role:'clerk',sid:999,st:'office'});sim.s.officeQ=[];sim.s.mkt.lostLog=[loss(30,'service')];
 const d=sim.diagnostics().find(d=>d.cause.includes('service-related'));assert.doesNotMatch(d.action,/Clerk|hire/i);assert.match(d.effect,/no shoppers at the office now/);
});
test('active service is counted separately from waiting, without claiming Owner use',()=>{
 const sim=setup();sim.s.agents.push({id:900,serveT:25,serveBy:999},{id:901,serveT:0});sim.s.officeQ=[900,901];
 let d=sim.diagnostics().find(d=>d.cause.includes('waiting now'));assert.match(d.cause,/1 waiting now; 1 being served/);assert.match(d.action,/whether waits persist/);assert.doesNotMatch(d.consequence,/Owner/);
 sim.s.officeQ=[900];d=sim.diagnostics().find(d=>d.cause.includes('waiting now'));assert.match(d.cause,/0 waiting now; 1 being served/);assert.match(d.action,/Let current service finish/);
});
test('empty office with no recent service losses produces no office warning',()=>{
 const sim=setup();assert.ok(!sim.diagnostics().some(d=>d.cause.includes('waiting now')));
});
test('legacy monthly report labels original window and preserves original values',()=>{
 const sim=setup();sim.monthReport(31);const R=sim.s.mkt.reports.at(-1);delete R.period;R.lost={noSize:14};R.sug=['14 shoppers wanted a 10x10 and found none available.'];const before=JSON.stringify(sim.s);const html=uiFor(sim).reportHtml();
 assert.match(html,/Saved legacy report/);assert.match(html,/Shopper counts: Days 2–30/);assert.match(html,/original totals retained/);assert.equal(JSON.stringify(sim.s),before);
});
test('unknown legacy dates are disclosed instead of fabricated',()=>{
 assert.equal(periodText(monthlyReportPeriods({}).shoppers),'Dates not recorded');assert.equal(monthlyReportPeriods({day:31,period:{start:9,end:1}}).legacy,true);
});
test('whole-dollar display discrepancy remains independently rounded cents, not altered finances',()=>{
 const sim={s:{cash:10875.6,finance:{accrued:{opex:309.24},lastDay:381},staff:[{wage:20}],loan:{bal:0},debt:[]},day:381,mod:825,dailyOpex:()=>({total:83.16})};const P=position(sim);
 assert.deepEqual(P,{cash:10875.6,committed:309.24,reserve:1944.24,available:8622.12,netLiquid:10566.36});assert.deepEqual([P.cash,P.committed,P.reserve,P.available].map(Math.round),[10876,309,1944,8622]);
});
// Exercise the unchanged production SST0/SST1 exporter, sanitizer, validator and loader.
const main=readFileSync('js/main.js','utf8'),ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},savearchive:{},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
for(const legacy of [false,true]){
 const sim=setup();sim.s.mkt.lostLog=[loss(1),loss(30,'service')];sim.monthReport(31);if(legacy)delete sim.s.mkt.reports.at(-1).period;
 const snapshot=JSON.stringify(sim.s.mkt.reports),g=ctx.game;g.sim=sim;g.company={props:[{name:'Reporting test',sim}],active:0,feed:[]};g.ui={title:false};g.rend={view:0};g.attach=function(s){this.sim=s;};
 const json=g.saveJSON();for(const code of [g.rawSaveCode(json),await g.saveCode(json)]){assert.equal(await g.loadCode(code),true);assert.equal(JSON.stringify(g.sim.s.mkt.reports),snapshot);assert.equal(g.sim.s.speed,0);}
 n++;console.log('PASS production SST0/SST1 save/load retains '+(legacy?'legacy':'new')+' monthly report');
}
console.log(n+' reporting-period and office-guidance checks passed (Node/DOM fixtures, not Safari acceptance)');
