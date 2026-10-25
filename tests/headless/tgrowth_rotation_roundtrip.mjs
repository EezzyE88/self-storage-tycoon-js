import assert from 'node:assert/strict';
import {makeSandbox} from '../../js/scenarios.js';
import {UI} from '../../js/ui.js';

function fixture(){
 const sim=makeSandbox({start:'empty',cash:100000});sim.ensure();
 const boxes={},cls={add(){},remove(){},toggle(){}},ui=Object.create(UI.prototype);
 ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(R){this.preview=R;},setSelection(){},setView(v){this.view=v;},lookAt(){}}};
 ui.root={classList:cls,querySelectorAll:()=>[]};ui.$=key=>boxes[key]||={innerHTML:'',firstChild:null,classList:cls};
 ui.sfx=()=>{};ui.toast=()=>{};ui.renderSheet=()=>{};ui.renderTut=()=>{};ui.syncFloorUi=()=>{};ui.spendingHtml=()=>'';
 return {sim,ui};
}
function snapshot(ui){
 const R=ui.plan;
 return {
  rotation:ui.buildRotation,argsRotation:R.args.rotation,
  units:R.units.map(u=>({x:u.x,y:u.y,w:u.w,h:u.h,f:u.f,dir:[...u.dir]})),
  options:structuredClone(ui.upgradeOptions),
  fixtures:R.creates.filter(o=>o.mount).map(o=>structuredClone(o)),
  counts:structuredClone(R.upgrades.counts),
  suggestions:R.upgrades.options.map(o=>({key:o.key,selected:o.selected,fixture:structuredClone(o.fixture),cells:structuredClone(o.cells)})),
  cost:R.cost,daily:R.opex,duration:R.dur,status:R.status,missing:[...R.missing],stamp:R.upgradeStamp,
 };
}
const failed=[];
for(let rotation=0;rotation<4;rotation++){
 try{
  let checked=0;
  for(const lighting of ['none','interior','outside','both'])for(const outsideCameras of [false,true]){
   const {sim,ui}=fixture();ui.pickTool('du5x10');ui.buildRotation=rotation;
   ui.planArgs={a:{x:12,y:12},b:rotation%2?{x:12,y:15}:{x:15,y:12}};ui.replan();
   ui.changeUpgrade('lighting',lighting);ui.changeUpgrade('outsideCameras',outsideCameras);
   if(ui.plan.upgrades.options.length)ui.changeUpgrade('excludedFixtures',[ui.plan.upgrades.options[0].key]);
   assert.notEqual(ui.plan.status,'invalid');assert.equal(ui.plan.units.length,4);
   const before=snapshot(ui),state=JSON.stringify(sim.s),cash=sim.s.cash,time=sim.s.t;
   ui.setTab('growth',true);assert.equal(ui.tool,null);assert.ok(ui.growthProposal);
   assert.equal(ui.returnGrowthProposal(),true);
   assert.deepEqual(snapshot(ui),before,`F${rotation}: ${lighting}, cameras ${outsideCameras}: exact proposal must round-trip`);
   assert.equal(JSON.stringify(sim.s),state,'navigation cannot mutate simulation/save state');
   assert.equal(sim.s.cash,cash);assert.equal(sim.s.t,time);assert.equal(sim.s.speed,0);assert.equal(sim.s.open,false);assert.equal(sim.s.orders.length,0);
   // A second return checks that restored selections remain stable across repeated navigation.
   ui.setTab('growth',true);assert.equal(ui.returnGrowthProposal(),true);assert.deepEqual(snapshot(ui),before);checked++;
  }
  console.log(`PASS rotation ${rotation}: ${checked} lighting/camera combinations preserve footprints, doors, fixture selections, costs and quote; Pause/closed property/save state unchanged`);
 }catch(e){failed.push(rotation);console.error(`FAIL rotation ${rotation}\n${e.stack}`);}
}
{
 const {sim,ui}=fixture();ui.pickTool('du5x10');ui.planArgs={a:{x:12,y:12},b:{x:15,y:12}};ui.replan();const before=snapshot(ui);
 ui.setTab('growth',true);delete ui.growthProposal.args.rotation;assert.equal(ui.returnGrowthProposal(),true);assert.deepEqual(snapshot(ui),before);assert.equal(sim.s.speed,0);
 console.log('PASS older/unrotated proposal without rotation retains the existing null-rotation behavior');
}
if(failed.length){console.error(`${failed.length} rotation groups failed`);process.exitCode=1;}else console.log('ALL PASS: Growth rotation round-trip; native UI methods only');
