import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {UI} from '../../js/ui.js';
import {tickVertical} from '../../js/vertical.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
for(const fitout of [false,true]) {
 const sim=makeMaple(4401);sim.s.cash=1000000;sim.s.open=false;sim.ensure();
 const shell=sim.objs('shell')[0],plan=sim.verticalPlan(shell.id,{fitout});
 assert.ok(plan.ok);assert.ok(sim.dispatch({type:'verticalUpgrade',...plan}).ok);
 const order=sim.s.orders.at(-1);
 for(let k=0;k<50000&&order.st==='construction';k++){sim.s.t++;tickVertical(sim,order);sim.ensure();for(const e of sim.objs('elevator'))sim.updateElevator(e);}
 assert.equal(order.st,'done');
 const r=new Renderer({clientWidth:390,clientHeight:844},sim);r.rebuildStatic();r.todOverride=23;
 const ui=Object.create(UI.prototype);ui.g={sim,rend:r,audio:{unlock(){}}};ui.syncFloorUi=()=>{};ui.closeModal=()=>{};ui.sfx=()=>{};
 const state=JSON.stringify(sim.s);
 const pick=f=>{const el={dataset:{a:'floorPick',building:String(shell.id),v:String(f)}};ui.onClick({target:{closest:()=>el}});r.updateAnim(.016,1);};
 const units=()=>new Set(r.staticG.children.filter(m=>m.visible&&sim.s.objects[m.userData.obj]?.type==='unit').map(m=>m.userData.obj)).size;
 pick(0);assert.equal(units(),23);assert.equal(ui.floorBuilding,shell.id);
 pick(1);assert.equal(r.view,1);assert.equal(units(),fitout?14:0);
 assert.ok(r.anim.filter(a=>a.k==='light'&&(a.o.f||0)===0).every(a=>!a.mesh.visible&&!a.glow.visible));
 if(fitout)assert.ok(r.anim.some(a=>a.k==='light'&&a.o.f===1&&a.mesh.visible&&a.glow.visible));
 const html=ui.floorsHtml();assert.match(html,/Floor 2 · Viewing/);assert.match(html,fitout?/14 units/:/Structure built · No units fitted out/);
 pick(0);assert.equal(units(),23);assert.ok(r.anim.some(a=>a.k==='light'&&(a.o.f||0)===0&&a.glow.visible));
 assert.ok(r.anim.filter(a=>a.k==='light'&&a.o.f===1).every(a=>!a.glow.visible));
 pick('ext');assert.equal(r.view,'ext');assert.ok(r.anim.filter(a=>a.k==='light'&&!a.inside).every(a=>a.mesh.visible&&a.glow.visible));
 assert.equal(JSON.stringify(sim.s),state);
 console.log(`PASS ${fitout?'fitted-out':'empty'} F2: actual chooser action, F1 → F2 → F1 → Exterior, light visibility, exact state preservation`);
}
