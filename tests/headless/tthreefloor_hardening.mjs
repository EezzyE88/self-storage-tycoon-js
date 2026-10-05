import assert from 'node:assert/strict';
import {base,full} from './tthreefloor.mjs';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {sweepElevator} from '../../js/vertical.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const clone=s=>new Sim(JSON.parse(JSON.stringify(s.s)));
const sim=clone(base), sh=sim.objs('shell')[0], modal={innerHTML:''};
const ui=Object.create(UI.prototype);ui.g={sim};ui.$=()=>modal;ui.pauseForPopup=()=>{};ui.resumePopup=()=>{};ui.renderTut=()=>{};ui.spendingHtml=()=>'';
ui.g.rend={view:1,setView(v){this.view=v;},setPreview(v){this.preview=v;}};
ui.showVertical(sh.id);assert.ok(ui.verticalQuote);assert.ok(ui.rend.preview);assert.equal(ui.rend.view,2);
// Candidate 22 addendum C: unavailable optional stairs revert instead of invalidating the valid package.
{const cost=ui.verticalQuote.cost;ui.onInput({target:{dataset:{verticalOption:'stairs'},checked:true}});assert.ok(ui.verticalQuote);assert.equal(ui.verticalQuote.cost,cost);assert.equal(ui.verticalQuote.stairs,false);assert.ok(ui.rend.preview);assert.match(modal.innerHTML,/data-vertical-option="stairs"[^>]*disabled/);assert.match(modal.innerHTML,/no stairwell/);assert.match(modal.innerHTML,/data-a="verticalConfirm"/);}
ui.onInput({target:{dataset:{verticalOption:'stairs'},checked:false}});assert.ok(ui.verticalQuote);ui.closeModal();assert.equal(ui.rend.preview,null);assert.equal(ui.rend.view,1);
for(const u of sim.objs('unit').filter(u=>u.f===1))delete sim.s.objects[u.id];sim.markDirty();sim.ensure();ui.showVertical(sh.id);assert.equal(ui.verticalQuote,null);assert.match(modal.innerHTML,/data-vertical-option="fitout"/);ui.onInput({target:{dataset:{verticalOption:'fitout'},checked:false}});assert.ok(ui.verticalQuote);assert.equal(ui.verticalQuote.fitout,false);ui.closeModal();
console.log('PASS invalid optional-stair and empty-layout quotes remain recoverable; abandoned ghosts and future floor selection cleared');
const Renderer=await loadRenderer(), r=new Renderer({clientWidth:393,clientHeight:720},clone(base));const before=JSON.stringify(r.sim.s);r.setView(2);for(const overlay of ['security','clean','carts','power','hvac']){r.overlay=overlay;r.drawOverlay();}assert.equal(JSON.stringify(r.sim.s),before);
console.log('PASS all five overlays safely handle an unallocated proposed floor without mutating the save');
let ticks=0, journeys=0,maxWait=0;
for(let floors=3;floors<=5;floors++)for(let seed=1;seed<=24;seed++){
 const s=clone(full);s.s.agents=[];s.s.carts=[];const el=s.objs('elevator')[0];Object.assign(el,{servedFloors:Array.from({length:floors},(_,i)=>i),q:Array.from({length:floors},()=>[]),riders:[],pos:0,tgt:null,door:0});
 let rng=seed;const rnd=()=>((rng=Math.imul(rng,1664525)+1013904223>>>0)/4294967296);s.wear=()=>{};
 for(let j=0;j<100;j++){const f=Math.floor(rnd()*floors);let dest=Math.floor(rnd()*(floors-1));if(dest>=f)dest++;const a={id:20000+j,kind:'cust',f,x:el.x+.5,y:el.y+.5,st:'walk',pi:0,cart:rnd()<.6?30000+j:null,exp:{elev:0}};s.s.agents.push(a);if(a.cart)s.s.carts.push({id:a.cart,f,st:'inuse',x:a.x,y:a.y});s.joinElevator(a,el,dest);}
 const targets=new Map(s.s.agents.map(a=>[a.id,a.elevDest]));
 for(let k=0;k<15000&&s.s.agents.some(a=>a.elev);k++){s.s.t++;sweepElevator(s,el);ticks++;assert.ok(el.pos>=0&&el.pos<=floors-1);assert.ok(el.riders.reduce((n,r)=>n+r.slots,0)<=4);const ids=[...el.q.flat(),...el.riders.map(r=>r.a)];assert.equal(new Set(ids).size,ids.length);}
 assert.ok(s.s.agents.every(a=>!a.elev),'queue must drain');for(const a of s.s.agents){assert.equal(a.f,targets.get(a.id));if(a.cart)assert.equal(s.cartById(a.cart).f,a.f);maxWait=Math.max(maxWait,a.elevWaited);}journeys+=100;
}
console.log(JSON.stringify({stress:'3–5-floor dispatcher, 72 seeded bursts, 100 mixed passengers per burst, wear disabled to isolate algorithm',journeys,ticks,maxWait}));
// New arrivals cannot replace an aged priority; cancellation removes every reference.
{
 const s=clone(full),el=s.objs('elevator')[0];s.s.agents=[];s.s.carts=[];Object.assign(el,{q:[[],[],[]],riders:[],pos:0,tgt:null,door:0});s.wear=()=>{};
 const add=(id,f,dest)=>{const a={id,kind:'cust',f,x:el.x+.5,y:el.y+.5,st:'walk',pi:0,exp:{elev:0}};s.s.agents.push(a);s.joinElevator(a,el,dest);return a;};
 const aged=add(50000,2,0);aged.elevT0=s.s.t-100;const cancel=add(50001,1,2);s.leaveElevator(cancel);assert.ok(!el.q.flat().includes(cancel.id));
 let pickup=null;for(let k=0;k<1000;k++){s.s.t++;if(k%2===0)add(51000+k,0,1);sweepElevator(s,el);if(aged.inElev&&pickup===null)pickup=k;assert.ok(el.riders.reduce((n,r)=>n+r.slots,0)<=4);}
 assert.ok(pickup!==null&&pickup<50);assert.equal(aged.f,0);
 console.log(JSON.stringify({continuousArrivals:500,agedCallPickupTick:pickup,cancelledCallerRemoved:true}));
}
// Ordinary full simulation, including finances, scheduling, staff and visitors.
for(let seed=1;seed<=4;seed++){
 const s=clone(base);s.s.rngS=seed;s.s.open=true;const R=s.verticalPlan(sh.id);const cash=s.s.cash;assert.ok(s.dispatch({type:'verticalUpgrade',...R}).ok);assert.equal(s.s.cash,cash-R.cost);let commissioned=false,seenUpper=false;
 for(let i=0;i<30*1440;i++){s.step();s.events.length=0;const ord=s.s.orders.find(o=>o.vertical?.f===2);if(ord?.st==='done'&&!commissioned){assert.ok(s.dispatch({type:'commission',order:ord.id}).ok);commissioned=true;}if(s.s.agents.some(a=>a.kind==='cust'&&a.f===2))seenUpper=true;assert.ok(Number.isFinite(s.s.cash));for(const el of s.objs('elevator'))assert.ok(el.riders.reduce((n,r)=>n+r.slots,0)<=4);}
 assert.ok(commissioned,'ordinary simulation must complete expansion');assert.equal(s.s.objects[sh.id].floors,3);console.log(JSON.stringify({playthroughSeed:seed,minutes:43200,commissioned,seenUpper,cash:s.s.cash,leases:s.objs('unit').filter(u=>u.lease).length,agents:s.s.agents.length}));
}
console.log('PASS 7,200 mixed elevator journeys and four 30-day full simulation playthroughs');
