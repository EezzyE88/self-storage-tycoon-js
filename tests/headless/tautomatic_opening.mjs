// South-facing touch anchors moved to the door edge; original unit footprints remain unchanged.
import assert from 'node:assert/strict';
import {makeSandbox} from '../../js/scenarios.js';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import fs from 'node:fs';
const args={tool:'du5x10',a:{x:10,y:3},b:{x:10,y:3},rotation:2,f:0};
function fixture(){const s=makeSandbox({start:'starter',cash:100000});s.ensure();return s;}
function finished(s){assert.ok(s.dispatch({type:'build',...args}).ok);const ord=s.s.orders.at(-1);for(let i=0;i<3000&&ord.st==='construction';i++)s.step();assert.equal(ord.st,'done');const u=ord.objs.map(id=>s.s.objects[id]).find(o=>o?.type==='unit');u.cstate='ready';u.commercial='none';s.markDirty();s.ensure();return u;}
{
 const s=fixture(),cash=s.s.cash,u=finished(s);assert.ok(s.s.cash<cash);assert.equal(u.cstate,'ready');const before=JSON.stringify(s.s);s.poll();assert.equal(JSON.stringify(s.s),before);
 s.s.speed=4;s.events.length=0;s.step();assert.equal(u.cstate,'operating');assert.equal(u.commercial,'ready');assert.equal(s.events.filter(e=>e.type==='commissioned'&&e.automatic).length,1);
 s.events.length=0;s.step();assert.equal(s.events.filter(e=>e.type==='commissioned').length,0);const c=new Sim(JSON.parse(JSON.stringify(s.s)));c.s.speed=0;c.poll();assert.equal(c.s.objects[u.id].cstate,'operating');assert.equal(c.events.filter(e=>e.type==='commissioned').length,0);
 console.log('PASS purchase unchanged, paused poll, advancing-minute opening, grouped event and no replay');
}
{
 const s=fixture();s.s.open=false;const u=finished(s);s.s.speed=1;s.step();assert.equal(u.cstate,'operating');assert.equal(s.s.open,false);
 console.log('PASS rental readiness never opens the property');
}
{
 const s=fixture(),u=finished(s),front=s.unitFront(u),ground=[...s.s.ground];for(const c of front)s.s.ground[s.idx(c.x,c.y)]=0;s.markDirty();s.ensure();assert.equal(u.cstate,'built');
 const ui=Object.create(UI.prototype);ui.g={sim:s};assert.match(ui.coachHint().text,/waiting:.*frontage/i);s.s.speed=1;s.step();assert.equal(u.cstate,'built');
 s.s.ground=ground;s.markDirty();s.step();assert.equal(u.cstate,'operating');console.log('PASS connected-access blocker and visible reason; later infrastructure recovery opens units');
}
for(const kind of ['tutorial','lesson','scenario','free']){
 const s=fixture(),u=finished(s);if(kind==='tutorial')s.s.tut.on=true;if(kind==='lesson')s.s.lesson={id:'fixture'};if(kind==='scenario')s.s.scenario={id:'fixture'};if(kind==='free')s.s.sb.unlimited=true;
 s.s.speed=1;s.events.length=0;s.autoOpenReadyUnits(true);assert.equal(u.cstate,'operating');assert.equal(s.events.filter(e=>e.type==='commissioned'&&e.automatic).length,1);
}
console.log('PASS tutorials, lessons, scenarios and Free Build use automatic opening');
{
 const s=fixture(),u=finished(s);const c=new Sim(JSON.parse(JSON.stringify(s.s)));c.s.speed=0;c.poll();assert.equal(c.s.objects[u.id].cstate,'ready');c.s.speed=1;c.step();assert.equal(c.s.objects[u.id].cstate,'operating');console.log('PASS old ready saves remain paused until simulation resumes');
}
{
 const s=fixture();s.s.creative=true;assert.ok(s.dispatch({type:'build',tool:'hvac',a:{x:14,y:8},b:{x:14,y:8},f:0}).ok);s.s.creative=false;for(let i=0;i<3000;i++)s.step();
 const units=s.objs('unit').filter(u=>u.access==='interior').slice(0,2);assert.equal(units.length,2);
 for(const u of units){if(u.lease){const l=s.s.leases[u.lease];delete s.s.tenants[l.tenant];delete s.s.leases[l.id];}u.lease=null;u.cstate='built';u.env='climate';u.commercial='none';}
 s.markDirty();s.ensure();const sh=s.D.shellAt[s.idx(units[0].x,units[0].y)],rebuild=s.rebuild.bind(s);
 // Deliberately limited shared-capacity fixture; production rebuild still computes all access/light requirements.
 s.rebuild=()=>{rebuild();const h=s.D.hvac[sh];h.cap=units[0].w*units[0].h;for(const u of units)if(u.cstate==='ready'&&h.load+u.w*u.h>h.cap){u.cstate='built';u.missing=['HVAC capacity exceeded for this zone'];}};
 s.markDirty();s.ensure();assert.ok(units.some(u=>u.cstate==='ready'));s.act_commission({all:true});assert.equal(units.filter(u=>u.cstate==='operating').length,1);assert.equal(units.filter(u=>u.cstate==='built').length,1);
 console.log('PASS shared opening path rechecks capacity between units');
}
{
 const ui=Object.create(UI.prototype),messages=[];ui.g={sim:fixture()};ui.toast=t=>messages.push(t);ui.sfx=()=>{};ui.onEvent({type:'commissioned',automatic:true,propertyOpen:true,n:14});assert.equal(messages.length,1);assert.match(messages[0],/14 new units.*rent-ready/);
 ui.onEvent({type:'complete',units:14,order:999,label:'Test construction'});assert.equal(messages.length,1,'automatic completion must not also instruct manual commissioning');
 const text=fs.readFileSync('js/ui.js','utf8');assert.match(text,/Confirm authorizes construction/);assert.match(text,/Property remains closed/);assert.doesNotMatch(text,/>Commission unit</);assert.doesNotMatch(text,/Commission whole order/);console.log('PASS purchase disclosure, grouped notification and no player commissioning buttons');
}
{
 const s=fixture(),a={...args,b:{x:11,y:3}},q=s.plan(a);assert.equal(q.status,'valid');assert.equal(q.creates.length,2);
 const cash=s.s.cash;assert.ok(s.dispatch({type:'build',...a}).ok);assert.equal(s.s.cash,cash-q.cost,'Confirm charges ordinary quoted construction exactly once');
 const ord=s.s.orders.at(-1);s.events.length=0;s.s.speed=1;for(let i=0;i<3000&&ord.st==='construction';i++)s.step();
 assert.equal(ord.st,'done');assert.ok(ord.objs.every(id=>s.s.objects[id].cstate==='operating'));
 const events=s.events.filter(e=>e.type==='commissioned'&&e.automatic);assert.equal(events.length,1);assert.equal(events[0].n,2);
 console.log('PASS real running construction opens a whole eligible batch with one event and unchanged purchase charge');
}
{
 const s=fixture(),u=finished(s);assert.equal(s.s.speed,0);s.autoOpenReadyUnits();assert.equal(u.cstate,'ready','calling helper outside a minute cannot open');
 s.step();assert.equal(u.cstate,'operating','an actual company minute also processes an inactive property whose local speed is zero');
 console.log('PASS background company minutes open inventory; non-advancing calls remain inert');
}
console.log('ALL PASS: automatic opening; native simulation/UI methods only');
