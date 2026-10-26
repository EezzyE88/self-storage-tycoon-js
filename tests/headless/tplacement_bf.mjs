// Real planning, UI handlers and save data; disposable native fixtures, no rendered-browser claim.
import assert from 'node:assert/strict';
import {Sim,newState} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {TOOLS,SIZES,G} from '../../js/data.js';
import {makeMaple} from '../../js/maple.js';
import {BEATS} from '../../js/tutorial.js';

let checks=0;
const test=(name,fn)=>{fn();checks++;console.log('PASS '+name);};
const fresh=()=>{const s=new Sim(newState({mode:'sandbox',creative:true}));s.s.tut={on:false,done:true};s.ensure();return s;};
function uiFor(sim,tool='du5x10') {
  const u=Object.create(UI.prototype),boxes={};
  u.g={sim,audio:{unlock(){},play(){}},rend:{view:'ext',setPreview(){},setSelection(){}}};
  u.title=false;u.tool=tool;u.buildRotation=0;
  u.root={classList:{add(){},remove(){},contains(){return false;}},querySelectorAll(){return[];}};
  u.$=id=>boxes[id]||={innerHTML:'',firstChild:null};u.canRush=()=>false;
  u.renderSheet=()=>{};u.renderTut=()=>{};u.currentBlueprintPlan=()=>null;u.upgradeHtml=()=>'';
  u.spendingHtml=()=>'';u.toast=()=>{};u.sfx=()=>{};
  return {u,boxes};
}
const click=(u,a)=>u.onClick({target:{closest:()=>({dataset:{a}})}});
const arm=(u,args)=>{u.planArgs={a:{...args.a},b:{...args.b}};u.buildRotation=args.rotation;u.climate=!!args.climate;u.replan();};
const dirs=[[0,-1],[1,0],[0,1],[-1,0]];
for(const tool of Object.keys(TOOLS).filter(k=>TOOLS[k].unit))for(let rotation=0;rotation<4;rotation++)for(const sign of [-1,1])test(`${tool} facing ${rotation}, drag ${sign}: touched door edge, single and three-unit row`,()=>{
  const sim=fresh(),sz=SIZES[TOOLS[tool].size],axisX=rotation%2===0,a={x:20,y:20};
  const before=JSON.stringify(sim.s);
  for(const count of [1,3]) {
    const b={x:a.x+(axisX?sign*(count*sz.w-1):0),y:a.y+(axisX?0:sign*(count*sz.w-1))};
    const p=sim.plan({tool,a,b,rotation,f:0});assert.equal(p.count,count);assert.equal(p.cost,TOOLS[tool].cost*count);
    const edge=[];
    for(const unit of p.units) {
      assert.deepEqual(unit.dir,dirs[rotation]);assert.deepEqual([unit.w,unit.h],axisX?[sz.w,sz.d]:[sz.d,sz.w]);
      // Use the real door-front cells to check the user-visible contract, independently of the planner's anchor formula.
      const cells=sim.unitFront(unit).map(c=>({x:c.x-unit.dir[0],y:c.y-unit.dir[1]}));
      assert.ok(cells.every(c=>(axisX?c.y:c.x)===(axisX?a.y:a.x)),'all doors stay on the touched edge');
      assert.ok(cells.every(c=>sign*((axisX?c.x:c.y)-(axisX?a.x:a.y))>=0),'the row grows with the drag');
      edge.push(...cells.map(c=>axisX?c.x:c.y));
    }
    assert.ok(edge.includes(axisX?a.x:a.y),'the first unit includes the touched corner');
    edge.sort((x,y)=>x-y);assert.equal(edge.length,count*sz.w);assert.equal(new Set(edge).size,edge.length);
    assert.ok(edge.every((v,i)=>i===0||v===edge[i-1]+1),'the row is contiguous');
    assert.equal(new Set(p.items.map(c=>`${c.x},${c.y}`)).size,count*sz.w*sz.d);
  }
  assert.equal(JSON.stringify(sim.s),before,'previews never buy, advance time or alter saved state');
});

test('four UI rotations preserve a reverse drag, count, touch anchor, quotation and manual Pause',()=>{
  const sim=fresh(),{u}=uiFor(sim);arm(u,{a:{x:20,y:20},b:{x:15,y:20},rotation:0});
  const before=JSON.stringify(sim.s),a={...u.planArgs.a},count=u.plan.count,cost=u.plan.cost,first=structuredClone(u.plan.units);
  for(let r=1;r<=4;r++){click(u,'rotateBuild');assert.equal(u.plan.count,count);assert.equal(u.plan.cost,cost);assert.deepEqual(u.planArgs.a,a);assert.ok(u.planArgs.b[r%2?'y':'x']<a[r%2?'y':'x']);}
  assert.deepEqual(u.plan.units,first);click(u,'cancelTool');assert.equal(sim.s.speed,0);assert.equal(JSON.stringify(sim.s),before);
});
test('diagonal reverse drags follow the actual row axis when rotated',()=>{
  const sim=fresh(),{u}=uiFor(sim);arm(u,{a:{x:20,y:20},b:{x:14,y:29},rotation:0});
  const n=u.plan.count;click(u,'rotateBuild');assert.equal(u.plan.count,n);assert.ok(u.planArgs.b.y<u.planArgs.a.y);
});
test('incomplete interior suggestion exposes blockers before and after Move there without spending or opening',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:false,done:true};sim.s.cash=60000;sim.s.speed=0;
  const {u,boxes}=uiFor(sim,'iu5x5');arm(u,{a:{x:16,y:5},b:{x:16,y:5},rotation:0});
  assert.equal(u.plan.status,'invalid');const before=JSON.stringify(sim.s),n=u.nearestValidPlacement();assert.ok(n);
  assert.ok(n.missing.includes('Hallway is dark - add a light'));
  assert.match(boxes.abar.innerHTML,/Nearest buildable spot:/);assert.doesNotMatch(boxes.abar.innerHTML,/Nearest working spot/);
  for(const missing of n.missing)assert.ok(boxes.abar.innerHTML.includes(missing));
  click(u,'snapPlacement');assert.equal(u.plan.status,'incomplete');assert.equal(u.plan.count,1);
  assert.match(boxes.abar.innerHTML,/Will build, but not earn yet/);
  for(const missing of u.plan.missing)assert.ok(boxes.abar.innerHTML.includes(missing));
  assert.equal(JSON.stringify(sim.s),before,'Move there changes only the preview');
  click(u,'confirm');assert.equal(sim.s.speed,0);const order=sim.s.orders.at(-1);
  assert.ok(order);const units=order.objs.map(id=>sim.s.objects[id]).filter(o=>o.type==='unit');
  assert.equal(units.length,1);sim.completeOrder(order);sim.step();
  assert.notEqual(units[0].cstate,'operating');assert.ok(units[0].missing.some(x=>/dark|light/i.test(x)));
  const restored=new Sim(structuredClone(sim.s));assert.equal(restored.s.objects[units[0].id].cstate,units[0].cstate);assert.equal(restored.s.cash,sim.s.cash);assert.equal(restored.s.speed,0);
});
test('suggestions retain row count, revalidate through real planning and cannot bypass physical frontage',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:false,done:true};sim.s.cash=60000;sim.s.speed=0;
  const {u}=uiFor(sim);arm(u,{a:{x:13,y:15},b:{x:15,y:15},rotation:0});
  const count=u.plan.count,before=JSON.stringify(sim.s),n=u.nearestValidPlacement();assert.ok(n);
  click(u,'snapPlacement');assert.equal(u.plan.count,count);assert.notEqual(u.plan.status,'invalid');
  assert.ok(!u.plan.missing.includes('Door faces no drive aisle yet'));assert.equal(JSON.stringify(sim.s),before);
  // Removing every aisle must invalidate even a previously cached suggestion.
  sim.s.ground=sim.s.ground.map(()=>0);sim.markDirty();sim.ensure();u.replan();assert.equal(u.nearestValidPlacement(),null);
});
test('climate changes invalidate cached readiness and list all missing capacity requirements',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:false,done:true};const {u,boxes}=uiFor(sim,'iu5x5');
  arm(u,{a:{x:16,y:5},b:{x:16,y:5},rotation:0});const old=u.nearestValidPlacement();
  u.climate=true;u.replan();const n=u.nearestValidPlacement();assert.ok(n);assert.notEqual(n,old);
  assert.ok(n.missing.some(x=>/HVAC/.test(x)));for(const m of n.missing)assert.ok(boxes.abar.innerHTML.includes(m));
});
test('F reaches real frontage six cells away while retaining a single unit',()=>{
  const sim=fresh();for(let x=16;x<=24;x++)sim.s.ground[sim.idx(x,13)]=G.ASPHALT;
  sim.markDirty();sim.ensure();const {u}=uiFor(sim);arm(u,{a:{x:20,y:20},b:{x:20,y:20},rotation:0});
  assert.ok(u.plan.missing.includes('Door faces no drive aisle yet'));
  const n=u.nearestValidPlacement();assert.ok(n);assert.equal(n.a.y,14);assert.equal(n.rotation,0);
  click(u,'snapPlacement');assert.equal(u.plan.count,1);assert.ok(!u.plan.missing.includes('Door faces no drive aisle yet'));
});
test('another property cannot reuse a cached placement from an identical preview key',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:false,done:true};const {u}=uiFor(sim,'iu5x5');
  arm(u,{a:{x:16,y:5},b:{x:16,y:5},rotation:0});assert.ok(u.nearestValidPlacement());
  const other=new Sim(structuredClone(sim.s));other.s.hall=other.s.hall.map(h=>h.map(()=>0));other.markDirty();other.ensure();
  u.g.sim=other;u.replan();assert.equal(u.nearestValidPlacement(),null);
});
test('additional invalid placement blockers remain accessible and do not erase incomplete setup reasons',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:false,done:true};const {u,boxes}=uiFor(sim,'du10x20');arm(u,{a:{x:3,y:1},b:{x:8,y:1},rotation:0});
  assert.equal(u.plan.status,'invalid');assert.ok(u.plan.reasons.length>1);assert.match(boxes.abar.innerHTML,/<summary>\+\d+ more placement blocker/);
  for(const reason of u.plan.reasons)assert.ok(boxes.abar.innerHTML.includes(reason));
});
test('tutorial suggested placement remains reachable in both idle and planned build bars',()=>{
  const sim=makeMaple(4242);sim.s.tut={on:true,beat:BEATS.findIndex(b=>b.id==='expand'),flags:{},done:false};
  const {u,boxes}=uiFor(sim,'du10x10');delete u.currentBlueprintPlan;u.tab='build';u.cat='units';u.buildRotation=null;
  u.setView=v=>u.rend.view=v;u.showBlueprintTarget=()=>{};u.plan=null;u.renderActionBar();
  assert.match(boxes.abar.innerHTML,/data-a="suggestPlacement"/);click(u,'suggestPlacement');
  assert.equal(u.plan.status,'valid');assert.equal(u.plan.count,4);assert.equal(u.plan.args.axis,'y');assert.match(boxes.abar.innerHTML,/data-a="suggestPlacement"/);
});
console.log(`${checks} B/F placement groups passed; no browser or physical-device claim`);
