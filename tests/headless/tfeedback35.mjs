import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeMaple} from '../../js/maple.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {COMPLAINTS,diagnoseComplaint,diagnoseRequest} from '../../js/complaints.js';
import {complaintCopy,requestCopy} from '../../js/feedbackcopy.js';
import {climateInventory,climateRemedy} from '../../js/climateavailability.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
let n=0;const test=(name,f)=>{f();n++;console.log('PASS '+name);};
function setup(){const sim=makeMaple(35);sim.s.tut={on:false,done:true,flags:{}};for(const u of sim.objs('unit'))Object.assign(u,{env:'std',commercial:'occupied',cstate:'operating',blocked:false});return sim;}
function uiFor(sim){const ui=Object.create(UI.prototype);ui.g={sim};return ui;}
function climateLoss(sim,u){const ag={id:900,kind:'cust',size:u.size,x:2,y:3,f:0};assert.equal(sim.decideLease({size:u.size,climate:true},ag),null);return sim.s.thoughts.at(-1);}
function plain(html){return html.replace(/<details\b[^>]*>[\s\S]*?<\/details>/g,'').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();}
const samples=['Loading bays are full.','Gate line is backing up.',"My gate code isn't working.","Nobody answered. I'm leaving.",'No one at the office.',"I can't get to my unit from here.","I can't reach my unit.","I can't find the office entrance.",'No carts at Maple.','Elevator is down - carrying it up the stairs.','The hallway is dark.','That restroom needs cleaning.','No restroom in this building?','The elevator has no power.','The elevator is out of service.',"I've been waiting forever for the elevator.",'No 10x10 available.','I need climate control.','Too expensive for me.','Not convenient enough.',"I'll keep shopping.",'The place down the road is cheaper.','The reviews put me off.','Nothing ready to rent today.'];
test('every registered complaint receives concise what/why/next without mutating state',()=>{
 const sim=setup(),before=JSON.stringify(sim.s);assert.equal(samples.length,COMPLAINTS.length);
 for(let i=0;i<samples.length;i++){const th={text:samples[i],kind:'bad',t:0,requestedSize:'10x10'},d=diagnoseComplaint(sim,th);assert.equal(d.id,COMPLAINTS[i][0]);const c=complaintCopy(th,d);for(const v of Object.values(c)){assert.ok(v.length>0);assert.ok(v.split(/\s+/).length<=22,v);}}
 assert.equal(JSON.stringify(sim.s),before);
});
test('absent climate stock is distinguished from unavailable matching stock',()=>{
 const sim=setup(),u=sim.objs('unit')[0];let th=climateLoss(sim,u),d=diagnoseComplaint(sim,th);assert.equal(d.climate.historical.total,0);assert.match(complaintCopy(th,d).why,/No matching climate units/);
 u.env='climate';th=climateLoss(sim,u);d=diagnoseComplaint(sim,th);assert.equal(d.climate.historical.total,1);assert.equal(d.climate.historical.counts.eligible,0);assert.match(complaintCopy(th,d).why,/occupied or reserved/);
});
test('historical occupied stock stays historical when current stock becomes ready',()=>{
 const sim=setup(),u=sim.objs('unit')[0];u.env='climate';const th=climateLoss(sim,u),saved=JSON.stringify(th);Object.assign(u,{commercial:'ready',lease:null});const before=JSON.stringify(sim.s),d=diagnoseComplaint(sim,th),html=uiFor(sim).feedbackSheet();
 assert.equal(d.climate.historical.counts.eligible,0);assert.equal(d.climate.current.counts.eligible,1);assert.match(html,/At report time · 1 matching climate units · 0 ready to offer/);assert.match(html,/Current inventory · 1 matching climate units · 1 ready to offer/);assert.match(complaintCopy(th,d).why,/occupied or reserved/);assert.equal(JSON.stringify(th),saved);assert.equal(JSON.stringify(sim.s),before);
});
test('make-ready, blocked, unfinished and mixed blockers remain distinct',()=>{
 for(const [state,pattern] of [[{commercial:'unready',lease:null},/make-ready/],[{commercial:'ready',blocked:true},/access-blocked/],[{commercial:'ready',cstate:'built'},/unfinished/],[{commercial:'unready',lease:null,blocked:true},/make-ready; access-blocked/]]){
  const sim=setup(),u=sim.objs('unit')[0];Object.assign(u,{env:'climate'},state);const th=climateLoss(sim,u),d=diagnoseComplaint(sim,th);assert.match(complaintCopy(th,d).why,pattern);assert.equal(d.climate.historical.counts.eligible,0);
 }
});
test('matching totals are unique units while condition counts can overlap and lists stay bounded',()=>{
 const sim=setup(),u=sim.objs('unit')[0];for(const x of sim.objs('unit').filter(x=>x.size===u.size))Object.assign(x,{env:'climate',commercial:'unready',lease:null,blocked:true});
 const r=climateInventory(sim,u.size),sum=r.counts.makeReady+r.counts.blocked;assert.equal(sum,r.total*2);assert.equal(r.counts.eligible,0);const html=uiFor(sim).climateUnitsHtml({climate:{historical:r,current:r}});assert.match(html,/Condition counts can overlap/);assert.match(html,new RegExp(r.total+' matching climate units · 0 ready to offer'));
});
test('snapshot eligibility is not a new power or commissioning validation',()=>{
 const sim=setup(),u=sim.objs('unit')[0];Object.assign(u,{env:'climate',commercial:'ready',unpowered:true,missing:['HVAC issue']});const r=climateInventory(sim,u.size);assert.equal(r.counts.eligible,1);assert.doesNotMatch(climateRemedy(r),/currently eligible/);assert.match(climateRemedy(r),/in this inventory snapshot/);
});
test('legacy and malformed snapshots never fabricate report-time inventory',()=>{
 const sim=setup();for(const climateAvailability of [undefined,{v:1,units:null}]){const th={text:'I need climate control.',kind:'bad',requestedSize:'10x10',t:0,climateAvailability};sim.s.thoughts=[th];const d=diagnoseComplaint(sim,th),html=uiFor(sim).feedbackSheet();assert.match(complaintCopy(th,d).why,/older report/);assert.doesNotMatch(html,/<summary>At report time/);assert.match(html,/<summary>Current inventory/);}
});
test('standard availability retains full, make-ready, access, construction and size-specific causes',()=>{
 const sim=setup();for(const [availability,pattern] of [['full',/All units were occupied/],['makeReady',/needed make-ready/],['access',/blocked rental access/],['construction',/unfinished/],['sizeFull',/of this size/]]){const th={text:'Nothing ready to rent today.',kind:'bad',availability};assert.match(complaintCopy(th,diagnoseComplaint(sim,th)).why,pattern);}
});
test('overflow available, absent and unknown remain different observations',()=>{
 const sim=setup();for(const [overflowAvailable,pattern] of [[true,/overflow parking was available/],[false,/no free reachable/],[undefined,/not recorded/]]){const th={text:'Loading bays are full.',kind:'bad',overflowAvailable};assert.match(complaintCopy(th,diagnoseComplaint(sim,th)).why,pattern);}
});
test('both historical office losses avoid diagnosing present shortage or automatic hiring',()=>{
 const sim=setup();sim.s.officeQ=[];for(const text of ['No one at the office.',"Nobody answered. I'm leaving."]){const th={text,kind:'bad'},d=diagnoseComplaint(sim,th),copy=complaintCopy(th,d);assert.equal(d.category,'Recorded service loss');assert.match(d.remedy,/Historical losses alone/);assert.doesNotMatch(d.remedy,/hire a Clerk|Keep the Owner available|Finish queued chores/);assert.match(copy.next,/current office/);}
});
test('visible cards are concise while context, inspection actions and original repeated text stay expandable',()=>{
 const sim=setup(),u=sim.objs('unit')[0];u.env='climate';const th=climateLoss(sim,u);th.n=3;const before=JSON.stringify(sim.s),html=uiFor(sim).feedbackSheet(),visible=plain(html);
 assert.match(visible,/Why then:/);assert.match(visible,/Next:/);assert.ok(visible.split(/\s+/).length<100);assert.doesNotMatch(visible,/Adding stock does not guarantee|These remedies describe|Counts can overlap/);assert.match(html,/Customer report: I need climate control\. ×3/);assert.match(html,/Report context/);assert.match(html,/data-property=/);assert.match(html,/View reported location/);assert.match(html,/Review business/);assert.doesNotMatch(html,/<details[^>]*\bopen\b/);assert.equal(JSON.stringify(sim.s),before);
});
test('all supported request families have short guidance and retain detailed costs and choices',()=>{
 const sim=setup(),u=sim.objs('unit')[0];for(const key of ['gate99','carts99','elev99','light99','bi99','rate99','mo99','size99','secrisk']){const c={id:99,key,obj:u.id,text:'Pending request',actions:[{label:'Keep original',cost:50}],t:0},before=JSON.stringify(c),d=diagnoseRequest(sim,c),copy=requestCopy(c,d);assert.ok(copy.why&&copy.next);assert.equal(JSON.stringify(c),before);sim.s.convos=[c];const html=uiFor(sim).feedbackSheet();assert.match(html,/Decision needed now/);assert.match(html,/Existing response choices retain their costs and consequences/);assert.ok(html.includes(d.remedy.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;')));}
});
test('staff-handled request does not tell the Owner a decision is needed now',()=>{
 const sim=setup();sim.s.convos=[{id:1,key:'rate99',text:'Rent question',staffHandling:{sid:99},t:0}];const html=uiFor(sim).feedbackSheet();assert.match(html,/Staff handling now/);assert.doesNotMatch(html,/Decision needed now/);
});
test('customer strings and recorded sizes remain escaped in cards and context',()=>{
 const sim=setup();sim.s.thoughts=[{kind:'bad',text:'No <img src=x onerror=alert(1)> available.',requestedSize:'<script>x</script>',t:0}];const html=uiFor(sim).feedbackSheet();assert.doesNotMatch(html,/<img src=x|<script>x/);assert.match(html,/&lt;script&gt;/);assert.match(html,/&lt;img/);
});
// Exercise production save/export/sanitization/loading with historical snapshots and older reports.
const main=readFileSync('js/main.js','utf8'),ctx=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},savearchive:{},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,setTimeout,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',ctx);
for(const legacy of [false,true]){
 const sim=setup(),u=sim.objs('unit')[0];u.env='climate';const th=climateLoss(sim,u);if(legacy)delete th.climateAvailability;const reports=JSON.stringify(sim.s.thoughts),g=ctx.game;g.sim=sim;g.company={props:[{name:'Feedback test',sim}],active:0,feed:[]};g.ui={title:false};g.rend={view:0};g.attach=function(s){this.sim=s;};
 const json=g.saveJSON();for(const code of [g.rawSaveCode(json),await g.saveCode(json)]){assert.equal(await g.loadCode(code),true);assert.equal(JSON.stringify(g.sim.s.thoughts),reports);assert.equal(g.sim.s.speed,0);assert.match(uiFor(g.sim).feedbackSheet(),/Why then:/);}
 n++;console.log('PASS SST0/SST1 production save/load preserves '+(legacy?'legacy':'snapshot')+' report');
}
console.log(n+' concise feedback checks passed; fixtures do not establish physical-iPhone acceptance');
