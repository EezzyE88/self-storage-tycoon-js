import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeSandbox} from '../../js/scenarios.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {TOOLS,OPEX,POWER,G} from '../../js/data.js';
import {attachmentCoverage,mountedOn,retrofitEligible} from '../../js/unitupgrades.js';
import {ReserveWait} from '../../js/reservewait.js';
const a={tool:'du5x10',a:{x:10,y:2},b:{x:14,y:2},rotation:2,f:0};
function fixture(){const s=makeSandbox({start:'starter',cash:100000});s.s.open=false;s.ensure();return s;}
function buy(s,args){const R=s.plan(args);assert.notEqual(R.status,'invalid',R.reasons.join(';'));const cash=s.s.cash;const r=s.dispatch({type:'build',...args,upgradeStamp:R.upgradeStamp});assert.ok(r.ok,r.msg);assert.equal(s.s.cash,cash-R.cost);return {R,ord:s.s.orders.find(o=>o.id===r.order)};}
function finish(s,ord){for(let n=0;n<7000&&ord.st==='construction';n++)s.step();assert.equal(ord.st,'done');s.ensure();}
function vacant(s){const u=s.objs('unit').find(u=>u.cstate==='operating'&&!u.lease);assert.ok(u);return u;}
assert.equal(TOOLS.light.cost,200);assert.equal(TOOLS.camera.cost,500);assert.equal(OPEX.light,.35);assert.equal(POWER.load.light,.2);assert.equal(POWER.load.camera,.05);
for(const lighting of ['none','interior','outside','both'])for(const outsideCameras of [false,true]){
 const s=fixture(),before=JSON.stringify(s.s),R=s.plan({...a,lighting,outsideCameras});
 assert.equal(JSON.stringify(s.s),before,'planning must not mutate state');
 assert.equal(R.upgrades.counts.unitLight,['interior','both'].includes(lighting)?5:0);
 if(['outside','both'].includes(lighting))assert.ok(R.upgrades.counts.light>0&&R.upgrades.counts.light<5,'wall lights shared');else assert.equal(R.upgrades.counts.light,0);
 assert.equal(R.upgrades.counts.camera,outsideCameras?1:0);
 const {ord}=buy(s,{...a,lighting,outsideCameras});assert.equal(s.s.speed,0);assert.equal(s.s.open,false);assert.equal(ord.objs.length,5+Object.values(R.upgrades.counts).reduce((x,y)=>x+y,0));
 for(const o of ord.objs.map(id=>s.s.objects[id]).filter(o=>o.mount))assert.equal(s.s.objects[o.mount.host].type,'unit');
}
console.log('PASS all eight lighting/camera combinations, shared suggestions, exact charges and host IDs');
{
 const s=fixture(),args={...a,lighting:'both',outsideCameras:true},R=s.plan(args),key=R.upgrades.options.find(o=>o.fixture.type==='light').key;
 const off=s.plan({...args,excludedFixtures:[key]});assert.deepEqual(off.upgrades.options.map(o=>o.key),R.upgrades.options.map(o=>o.key));assert.equal(off.upgrades.counts.light,0);assert.equal(R.cost-off.cost,100);
 const cash=s.s.cash;assert.equal(s.dispatch({type:'build',...args,upgradeStamp:'stale'}).ok,false);assert.equal(s.s.cash,cash);assert.equal(s.s.orders.length,0);
 const {ord}=buy(s,args),paid=s.s.cash;s.poll();assert.equal(s.s.cash,paid);assert.equal(ord.prog,0);const saved=new Sim(JSON.parse(JSON.stringify(s.s)));saved.poll();assert.equal(saved.s.orders.find(o=>o.id===ord.id).prog,0);
 assert.equal(saved.dispatch({type:'cancelOrder',id:ord.id}).refund,R.cost);assert.equal(saved.s.cash,cash);assert.ok(!saved.objs('light').some(o=>o.mount));assert.ok(!saved.objs('unitLight').length);
 s.dispatch({type:'cancelOrder',id:ord.id});
 const late=buy(s,{...args,lighting:'outside'}).ord;s.s.t+=31;late.prog=.25;const expected=Math.round(late.cost*.75*.6);assert.equal(s.dispatch({type:'cancelOrder',id:late.id}).refund,expected);
}
console.log('PASS stable deselection, stale-quote refusal, paused load/poll, combined full and partial refunds');
{
 const s=fixture();s.s.ground[s.idx(10,4)]=G.ASPHALT;s.markDirty();s.ensure();
 const single={...a,b:{...a.a},lighting:'both',outsideCameras:true}, {ord}=buy(s,single);finish(s,ord);
 const u=s.s.objects[ord.objs[0]],items=mountedOn(s,u.id);assert.equal(items.length,3);assert.equal(s.s.open,false);assert.equal(u.cstate,'operating');
 const light=items.find(o=>o.type==='light'),cam=items.find(o=>o.type==='camera'),privateLight=items.find(o=>o.type==='unitLight');
 assert.ok(attachmentCoverage(s,light).some(c=>c.x===10&&c.y===4));assert.ok(attachmentCoverage(s,cam).every(c=>c.y>=4));assert.ok(!attachmentCoverage(s,cam).some(c=>c.x===u.x&&c.y===u.y));
 s.s.t=23*60;assert.ok(s.unitSecurity(u)>.8);assert.equal(privateLight.unpowered,false);
 const R=s.plan({...single,b:{x:11,y:2}});assert.equal(R.status,'invalid','existing unit overlap still rejected');
 // Physical wall and diagonal corner blockers in an otherwise identical shared area.
 const p=light.mount.frontage,idx=s.idx(p.x+1,p.y);s.D.solid[idx]=1;assert.ok(!attachmentCoverage(s,light).some(c=>c.x===p.x+2&&c.y===p.y));s.D.solid[idx]=0;
 s.D.solid[s.idx(p.x+1,p.y)]=1;assert.ok(!attachmentCoverage(s,light).some(c=>c.x===p.x+1&&c.y===p.y+1));s.markDirty();s.ensure();
 // Normal service choices and capacity, including mounted camera reachable service point.
 cam.cond=.1;light.cond=.1;s.markDirty();s.ensure();
 for(const o of [cam,light]){const t=s.ensureRepairTask(o);assert.ok(s.taskCell(t));assert.equal(s.taskHours(t),1.5);}
 const job=s.ensureRepairTask(cam),cash=s.s.cash;assert.ok(s.dispatch({type:'callVendor',task:job.id}).ok);assert.equal(s.s.cash,cash-250);s.finishTask(job,null);assert.equal(cam.cond,1);
 const t=s.ensureRepairTask(light);s.finishTask(t,{role:'owner'});assert.equal(light.cond,.72);assert.equal(cam.cond,1);
 // Low capacity sheds attachments via existing light/camera priorities, not host unit power.
 s.s.powerBase=0;s.markDirty();s.ensure();assert.equal(light.unpowered,true);assert.equal(cam.unpowered,true);assert.equal(privateLight.unpowered,true);assert.ok(!u.unpowered);
 const copy=new Sim(JSON.parse(JSON.stringify(s.s)));copy.ensure();assert.equal(mountedOn(copy,u.id).length,3);assert.equal(copy.s.open,false);
 const dem=s.plan({tool:'demolish',a:{x:u.x,y:u.y},b:{x:u.x,y:u.y},f:0});assert.match(dem.warn.join(' '),/attached fixtures/);const task=s.ensureRepairTask(light);assert.ok(s.dispatch({type:'build',tool:'demolish',a:{x:u.x,y:u.y},b:{x:u.x,y:u.y},f:0}).ok);assert.equal(mountedOn(s,u.id).length,0);assert.ok(!s.s.tasks.some(t=>t.id===task.id));
}
console.log('PASS real construction, shared security, wall/corner masks, maintenance outcomes, load shedding and demolition cleanup');
{
 const s=fixture(),u=vacant(s),args={tool:'unitRetrofit',unit:u.id,lighting:'both',outsideCameras:true},R=s.plan(args),cash=s.s.cash,commercial=u.commercial;
 assert.ok(R.creates.length);const r=s.dispatch({type:'unitRetrofit',...args,upgradeStamp:R.upgradeStamp});assert.ok(r.ok,r.msg);assert.equal(s.s.cash,cash-R.cost);assert.equal(u.cstate,'operating');assert.equal(u.commercial,commercial);assert.equal(u.blocked,true);assert.equal(retrofitEligible(s,u),false);
 const ord=s.s.orders.find(o=>o.id===r.order),saved=new Sim(JSON.parse(JSON.stringify(s.s)));saved.poll();assert.equal(saved.s.objects[u.id].retrofitOrder,ord.id);assert.equal(saved.s.objects[u.id].blocked,true);
 assert.equal(s.dispatch({type:'unitRetrofit',...args,upgradeStamp:R.upgradeStamp}).ok,false);assert.equal(s.s.cash,cash-R.cost);
 assert.ok(s.dispatch({type:'cancelOrder',id:ord.id}).ok);assert.ok(!u.retrofitOrder);assert.equal(u.commercial,commercial);assert.equal(s.s.cash,cash);assert.equal(u.blocked,false);
 const next=s.plan(args),q=s.dispatch({type:'unitRetrofit',...args,upgradeStamp:next.upgradeStamp});finish(s,s.s.orders.find(o=>o.id===q.order));assert.ok(!u.retrofitOrder);assert.equal(u.commercial,commercial);assert.equal(u.cstate,'operating');assert.equal(s.s.open,false);
 assert.equal(s.plan(args).status,'invalid','no duplicate private/outside fixture purchases');
 u.lease=999;assert.equal(s.plan(args).status,'invalid');
}
console.log('PASS retrofit rental hold, charge-once, save/load, cancel/refund, completion and no duplicate or occupied installation');
{
 const s=fixture();const light=s.objs('light')[0],cam=s.objs('camera')[0];assert.ok(light);
 const before=light.cond;s.rnd=()=>.5;s.newDay(s.day+1);assert.ok(Math.abs(before-light.cond-.003)<1e-9,'half-rate wear');
 if(cam){const c=cam.cond;s.newDay(s.day+2);assert.ok(Math.abs(c-cam.cond-.004)<1e-9);}
 assert.equal(s.dailyOpex().lights,Math.round(s.objs('light').filter(o=>o.cstate==='operating').length*.35*s.costIdx()*100)/100);
 const waiter=new ReserveWait(),base={...a,lighting:'outside'};waiter.pending={args:base};assert.ok(waiter.matches(base));assert.ok(!waiter.matches({...base,lighting:'both'}));assert.ok(!waiter.matches({...base,outsideCameras:true}));
 for(const key of ['lesson','scenario']){const t=fixture();t.s[key]={id:'test'};assert.equal(t.plan({...a,lighting:'both'}).status,'invalid');}
 const old=fixture(),cash=old.s.cash;new Sim(JSON.parse(JSON.stringify(old.s))).poll();assert.equal(old.s.cash,cash);assert.ok(!old.objs('unitLight').length);
}
console.log('PASS standalone affordability, unchanged camera wear, reserve selection identity and teaching/legacy guards');
{
 const s=fixture(),ui=Object.create(UI.prototype),els={abar:{innerHTML:''}};ui.g={sim:s,rend:{setPreview(R){this.preview=R;}}};ui.$=id=>els[id];ui.renderTut=()=>{};ui.reserveWait=null;ui.do=a=>s.dispatch(a);
 const u=vacant(s);ui.beginRetrofit(u.id);assert.equal(s.s.speed,0);ui.changeUpgrade('lighting','both');assert.match(els.abar.innerHTML,/Confirm/);assert.match(els.abar.innerHTML,/cannot rent during installation/);assert.match(els.abar.innerHTML,/Include outside cameras/);assert.ok(ui.rend.preview.upgrades);ui.endRetrofit();assert.equal(s.s.speed,0);
 const html=ui.upgradeHtml(s.plan({...a,lighting:'both'}),{lighting:'both'});for(const label of ['None','Interior','Outside wall','Both'])assert.ok(html.includes(label));
}
console.log('PASS actual UI retrofit review/options/preview and manual Pause preservation');
{
 const s=fixture();for(const o of s.objs('light'))delete s.s.objects[o.id];s.markDirty();s.ensure();
 const inside={tool:'iu5x5',a:{x:16,y:7},b:{x:16,y:7},rotation:1,f:0};
 const privateOnly=s.plan({...inside,lighting:'interior'});assert.ok(privateOnly.missing.some(m=>/dark/.test(m)),'private light must not satisfy hallway readiness');
 const outside=s.plan({...inside,lighting:'outside'});assert.equal(outside.status,'valid',outside.reasons.join(';'));assert.equal(outside.upgrades.counts.light,1);assert.ok(!outside.missing.some(m=>/dark/.test(m)));
 const {ord}=buy(s,{...inside,lighting:'outside'});finish(s,ord);const u=s.s.objects[ord.objs[0]];assert.equal(u.cstate,'operating');assert.equal(s.s.open,false);const mounted=mountedOn(s,u.id)[0];assert.ok(s.D.lit[0][s.idx(17,7)]>=.5);
 const neighboring=s.plan({...inside,a:{x:16,y:8},b:{x:16,y:8},lighting:'outside'});assert.equal(neighboring.upgrades.counts.light,0,'reuse working mounted coverage');
 // When the fixture is pending, do not purchase a duplicate or claim readiness.
 mounted.cstate='construction';s.markDirty();s.ensure();const pending=s.plan({...inside,a:{x:16,y:8},b:{x:16,y:8},lighting:'outside'});assert.equal(pending.upgrades.counts.light,0);assert.ok(pending.upgrades.pending.length);assert.ok(pending.missing.some(m=>/dark/.test(m)));
}
console.log('PASS mounted hallway light satisfies real readiness, private light does not, working/pending coverage avoids duplicate purchase');
console.log('ALL PASS: unit upgrades (native simulation/UI methods; no browser or Safari claim)');
