import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';
function el(){return{innerHTML:'',firstChild:null,querySelector:()=>null,querySelectorAll:()=>[],classList:{add(){},remove(){},toggle(){}},setAttribute(){}};}
function fixture(kind,instant,speed){const sim=makeSandbox({kind,instant,cash:100000});sim.s.speed=speed;const ui=Object.create(UI.prototype),boxes={};ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(){},setSelection(){}}};ui.title=false;ui.root={classList:el().classList,querySelectorAll:()=>[]};ui.$=k=>boxes[k]||=el();ui.sfx=()=>{};ui.toast=()=>{};ui.renderTut=()=>{};ui.syncFeedbackProperty=()=>{};ui.spendingHtml=()=>'';ui.buildSheet=()=>'';return{ui,sim};}
for(const kind of ['business','free'])for(const instant of [false,true])for(const setup of ['paused','expanded','running','pauseDuringReview']){
 const {ui,sim}=fixture(kind,instant,setup==='paused'?0:1);
 if(setup==='expanded')ui.pauseForPopup('panel');
 ui.pickTool('aisle');ui.placeStart({x:10,y:10});ui.placeMove({x:12,y:12});ui.finishPlacement();
 if(setup==='pauseDuringReview')ui.requestSpeed(0);
 const t=sim.s.t,orders=sim.s.orders.length;assert.notEqual(ui.plan.status,'invalid');
 ui.onClick({target:{closest:()=>({dataset:{a:'confirm'}})}});
 assert.equal(sim.s.speed,setup==='running'?1:0,`${kind}/${instant}/${setup}`);assert.equal(sim.s.t,t,'Confirm never advances time');
 assert.ok(sim.s.orders.length>orders,'real construction dispatched');
 if(setup!=='running'){ui.requestSpeed(2);assert.equal(sim.s.speed,2,'explicit speed remains available');}
 console.log(`PASS ${kind}, instant=${instant}, ${setup}: placement and real Confirm`);
}
