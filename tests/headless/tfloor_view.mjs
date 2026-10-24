import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {UI} from '../../js/ui.js';
import {tickVertical} from '../../js/vertical.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
// The shared CPU fixture predates Canvas image data and complete frames.
// Supply only the missing browser APIs; production map/frame code still runs.
const context=document.createElement('canvas').getContext('2d');
context.createImageData=(width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4)});
globalThis.MockWebGLRenderer.prototype.render=()=>{};
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
 // Use the normal frame path: it updates both lamp animation and the ground map.
 const pick=f=>{const el={dataset:{a:'floorPick',building:String(shell.id),v:String(f)}};ui.onClick({target:{closest:()=>el}});r.frame(.016);};
 const groundOutdoor=()=>r.anim.filter(a=>a.k==='light'&&!a.inside&&(a.o.f||0)===0);
 assert.ok(groundOutdoor().length>0,'fixture exercises outdoor ground lamps');
 assert.ok(groundOutdoor().every(a=>a.glow===null),'outdoor ground lamps use the light map');
 const illuminated=a=>a.glow?a.glow.visible:(a.mesh.visible&&a.pool>0&&r.lampU.uLampK.value>0);
 const units=()=>new Set(r.staticG.children.filter(m=>m.visible&&sim.s.objects[m.userData.obj]?.type==='unit').map(m=>m.userData.obj)).size;
 pick(0);assert.equal(units(),23);assert.equal(ui.floorBuilding,shell.id);assert.ok(r.lampU.uLampK.value>0);assert.ok(groundOutdoor().some(illuminated));
 pick(1);assert.equal(r.view,1);assert.equal(units(),fitout?14:0);
 assert.equal(r.lampU.uLampK.value,0,'ground light map must not illuminate upper-floor views');
 assert.ok(r.anim.filter(a=>a.k==='light'&&(a.o.f||0)===0).every(a=>!a.mesh.visible&&(a.glow===null||!a.glow.visible)));
 if(fitout)assert.ok(r.anim.some(a=>a.k==='light'&&a.o.f===1&&a.mesh.visible&&a.glow.visible));
 const html=ui.floorsHtml();assert.match(html,/Floor 2 · Viewing/);assert.match(html,fitout?/14 units/:/Structure built · No units fitted out/);
 pick(0);assert.equal(units(),23);assert.ok(r.lampU.uLampK.value>0,'returning to F1 restores ground illumination');assert.ok(groundOutdoor().some(illuminated));assert.ok(r.anim.some(a=>a.k==='light'&&(a.o.f||0)===0&&illuminated(a)));
 assert.ok(r.anim.filter(a=>a.k==='light'&&a.o.f===1).every(a=>!a.glow.visible));
 pick('ext');assert.equal(r.view,'ext');assert.ok(r.lampU.uLampK.value>0,'Exterior retains ground illumination');assert.ok(r.anim.filter(a=>a.k==='light'&&!a.inside).every(a=>a.mesh.visible&&illuminated(a)));
 assert.equal(JSON.stringify(sim.s),state);
 console.log(`PASS ${fitout?'fitted-out':'empty'} F2: actual chooser action, F1 → F2 → F1 → Exterior, light visibility, exact state preservation`);
}
