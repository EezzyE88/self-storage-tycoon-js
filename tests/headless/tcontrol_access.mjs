// Camera/layout-method checks with controlled rectangles; not a browser or device test.
import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
import {FLOOR_H} from '../../js/data.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
for(const [width,height] of [[375,667],[390,844]]) {
  const sim=makeMaple(3);sim.s.speed=0;
  const rend=new Renderer({clientWidth:width,clientHeight:height},sim);
  rend.aspect=width/height;rend.zoom=1;rend.updateCamera();
  const ui=Object.create(UI.prototype);ui.g={sim,rend};ui.title=false;ui.tool='du5x10';
  ui.plan={args:{a:{x:13,y:3},b:{x:13,y:14},f:0},units:[{x:13,y:3,w:1,h:12,f:0}]};
  const rect={top:271,bottom:height-284,left:8,right:width-8};ui.safeRect=()=>rect;
  const state=JSON.stringify(sim.s);assert.equal(ui.framePlacementReview(),true);
  for(const x of [13,14])for(const y of [3,15])for(const z of [0,FLOOR_H]) {
    const p=rend.project(x,y,z);
    assert.ok(p.x>=rect.left+11&&p.x<=rect.right-11,`x ${p.x}`);
    assert.ok(p.y>=rect.top+11&&p.y<=rect.bottom-11,`y ${p.y}`);
  }
  assert.equal(JSON.stringify(sim.s),state,'camera framing does not modify simulation/save state');
  assert.equal(sim.s.speed,0);
  console.log(`PASS ${width}x${height} real camera math: 12-cell footprint fits controlled review rectangle; state and Pause exact`);
}
const ui=Object.create(UI.prototype),styles=new Map();
globalThis.innerWidth=375;globalThis.innerHeight=667;
ui.root={style:{getPropertyValue:k=>styles.get(k),setProperty:(k,v)=>styles.set(k,v)},
 querySelectorAll:()=>[{getBoundingClientRect:()=>({width:180,height:48,bottom:105})},{getBoundingClientRect:()=>({width:150,height:92,bottom:157})}],
 querySelector:()=>({getBoundingClientRect:()=>({width:310,height:96,top:165,bottom:261})})};
ui.syncControlLayout();assert.equal(styles.get('--controls-bottom'),'165px');assert.equal(styles.get('--review-top'),'269px');
console.log('PASS layout variables reserve both measured control and scenario-card extents');
let frame,frames=0;globalThis.requestAnimationFrame=cb=>{frame=cb};
ui.root.querySelector=()=>null;ui.g={sim:makeMaple(),rend:{}};ui.tool='du5x10';ui.title=false;
ui.plan={args:{a:{x:1,y:1},b:{x:2,y:1},f:0}};ui.modalOpen=()=>false;ui.framePlacementReview=()=>frames++;
ui.schedulePlacementFrame();frame();ui.schedulePlacementFrame();assert.equal(frames,1);
ui.schedulePlacementFrame(true);frame();assert.equal(frames,2);
ui.plan.args.b.x=3;ui.pointerBusy=true;ui.schedulePlacementFrame();frame();assert.equal(frames,2);
ui.pointerBusy=false;ui.schedulePlacementFrame();frame();assert.equal(frames,3);
console.log('PASS review framing is once per plan, explicit resize/details request, and deferred past active pointer gestures');

// Both modal timings matter: already open at request, or opened before queued work runs.
for(const opensAfterQueue of [false,true]) {
  let modal=!opensAfterQueue,queued=null,fits=0;
  globalThis.requestAnimationFrame=cb=>queued=cb;
  const u=Object.create(UI.prototype);u.root={querySelector:()=>null};u.title=false;u.tool='du5x10';
  u.plan={args:{a:{x:1,y:1},b:{x:1,y:12},f:0}};u.modalOpen=()=>modal;
  u.framePlacementReview=()=>{fits++;return true};
  // Resize may arrive after this same placement already fitted before the modal opened.
  if(!opensAfterQueue) u.placementFrameKey=JSON.stringify([u.tool,u.plan.args]);
  u.schedulePlacementFrame(true);
  if(opensAfterQueue){assert.ok(queued);modal=true;queued();}
  else assert.equal(queued,null,'do not queue work beneath an existing modal');
  assert.equal(fits,0);assert.ok(!u.placementFrameKey,'blocked placement is not marked handled');
  modal=false;u.schedulePlacementFrame();assert.ok(queued);queued();
  assert.equal(fits,1);assert.equal(u.placementFrameFits,true);
  u.schedulePlacementFrame();assert.equal(fits,1);
}
console.log('PASS existing and newly opened modals retain framing for dismissal, then frame once');

{
  const sim=makeMaple(3);sim.s.speed=0;
  const rend=new Renderer({clientWidth:375,clientHeight:667},sim);
  rend.aspect=375/667;rend.zoom=1;rend.updateCamera();
  const u=Object.create(UI.prototype);u.g={sim,rend};
  u.plan={args:{a:{x:2,y:2},b:{x:31,y:21},f:0},creates:[{x:2,y:2,w:30,h:20,f:0,floors:3}]};
  u.safeRect=()=>({left:8,right:367,top:271,bottom:383});
  const state=JSON.stringify(sim.s);
  assert.equal(u.framePlacementReview(),false,'large footprint remains obstructed at existing minimum zoom');
  assert.equal(rend.zoom,.3,'existing zoom floor preserved');
  assert.equal(JSON.stringify(sim.s),state,'failed fit does not mutate simulation/save or Pause');
  // A movement request that a pan limit prevents must also not count as success.
  const clamped=Object.create(UI.prototype);clamped.plan={args:{a:{x:0,y:0},b:{x:0,y:0},f:0}};
  clamped.g={rend:{project:(x,y,z)=>({x:700+x,y:700+y-z}),zoomBy(){},pan(){}}};
  clamped.safeRect=u.safeRect;
  assert.equal(clamped.framePlacementReview(),false,'final projection checked after a clamped/no-op pan');
}
console.log('PASS final bounds detect zoom-floor and pan-limit obstruction, preserving state and zoom limits');

{
  let expanded=true,reframes=0;
  const values=new Map(),u=Object.create(UI.prototype);
  const rect=r=>({getBoundingClientRect:()=>r});
  u.root={style:{getPropertyValue:k=>values.get(k),setProperty:(k,v)=>values.set(k,v)},
    querySelectorAll:selector=>[
      rect({width:180,height:48,bottom:105}),rect({width:150,height:92,bottom:157}),
      ...(selector.includes('.viewextra')?[rect(expanded?{width:150,height:60,bottom:219}:{width:0,height:0,bottom:0})]:[])],
    querySelector:()=>null};
  u.schedulePlacementFrame=force=>{assert.equal(force,true);reframes++};
  u.syncControlLayout();assert.equal(values.get('--controls-bottom'),'227px');
  assert.equal(values.get('--review-top'),'227px');assert.equal(reframes,1);
  u.syncControlLayout();assert.equal(reframes,1,'unchanged measured controls never force recurring correction');
  expanded=false;u.syncControlLayout();assert.equal(values.get('--controls-bottom'),'165px');
  assert.equal(values.get('--review-top'),'165px');assert.equal(reframes,2,'closing controls refreshes the usable region');
}
console.log('PASS visible expanded controls reserve their true extent; open/close reframes once and stable layout does not');

{
  let queued,attempts=0;
  globalThis.requestAnimationFrame=cb=>queued=cb;
  const u=Object.create(UI.prototype);u.root={querySelector:()=>null};u.title=false;u.tool='du5x10';
  u.plan={args:{a:{x:1,y:1},b:{x:1,y:12}}};u.modalOpen=()=>false;
  u.framePlacementReview=()=>{attempts++;return false};
  u.schedulePlacementFrame();queued();assert.equal(u.placementFrameFits,false);
  u.schedulePlacementFrame();assert.equal(attempts,1,'an impossible fit must not fight the player every frame');
}
console.log('PASS unsuccessful bounded attempt remains false without repeated automatic camera correction');
