// Controlled CPU/DOM fixture, not rendered browser or physical Safari evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
const source=readFileSync('js/ui.js','utf8');
const events=source.slice(source.indexOf("    window.addEventListener('resize'"),source.indexOf('    this.showTitle();'));
const results=[];
for(const [width,height] of [[375,667],[390,844]]) {
  const sim=makeSandbox({kind:'free',instant:true});sim.s.speed=0;
  const canvas={clientWidth:width,clientHeight:height,getBoundingClientRect:()=>({left:0,top:0,width,height})};
  const rend=new Renderer(canvas,sim);rend.aspect=width/height;rend.view=0;
  rend.zoom=3.5;rend.lookAt(13,8);rend.pan(25,-20);
  const snapshot=()=>({zoom:rend.zoom,center:rend.center.toArray(),view:rend.view,
    rotation:{rot:rend.rot,azimuth:rend.azimuth,targetAz:rend.targetAz}});
  const u=Object.create(UI.prototype),styles=new Map(),elements=new Map(),listeners={},winListeners={};
  const cls={toggle(){},contains(){return false},add(){},remove(){}};
  u.g={sim,rend};u.title=false;u.tool='du5x10';u.buildRotation=0;
  u.$=id=>{if(!elements.has(id))elements.set(id,{classList:cls,innerHTML:'',firstChild:null});return elements.get(id)};
  let expanded=false;
  u.root={classList:cls,style:{getPropertyValue:k=>styles.get(k),setProperty:(k,v)=>styles.set(k,v)},
    querySelector:()=>null,querySelectorAll:selector=>selector.includes('.hud')?[{getBoundingClientRect:()=>({width:150,height:expanded?120:48,bottom:expanded?220:148})}]:[],
    addEventListener:(name,fn)=>(listeners[name]??=[]).push(fn)};
  document.body={classList:cls};globalThis.innerWidth=width;globalThis.innerHeight=height;
  u.modalOpen=()=>false;u.safeRect=()=>({left:8,right:width-8,top:271,bottom:height-284});
  // Unrelated HUD effects are stubbed; placement, update/layout, confirmation,
  // simulation dispatch, preview scene construction and camera math run normally.
  for(const k of ['pauseForPopup','resumePopup','syncFloorUi','renderCareerGoal','renderSheet',
    'renderFeed','renderTut','syncOrientation','slowHud','renderCoach','computePins',
    'updateBubbles','updatePins','frameStep','updateGuide','updateBlueprint','sfx','toast'])u[k]=()=>{};
  u.lastSheet=performance.now();u.lastTutR=performance.now();u.lastCoach=performance.now();
  let revealed=0;u.revealBuildTerms=()=>revealed++;
  vm.runInNewContext(`(function(){${events}}).call(ui)`,{ui:u,window:{addEventListener:(n,f)=>winListeners[n]=f}});
  const queue=[];globalThis.requestAnimationFrame=f=>queue.push(f);
  const flush=()=>{let count=0;while(queue.length){assert.ok(++count<20,'bounded frame queue');queue.shift()()}};
  const before=snapshot(),state=JSON.stringify(sim.s);
  u.placeStart({x:13,y:8});assert.equal(u.buildPlacing,true);assert.equal(u.plan.count,1);
  assert.notEqual(u.plan.status,'invalid');u.finishPlacement();
  assert.match(u.$('abar').innerHTML,/data-a="confirm"/);
  u.update(0);flush();
  const review=snapshot();assert.deepEqual(review,before,'ordinary review never changes camera');
  assert.equal(JSON.stringify(sim.s),state,'preview and UI update preserve simulation state');
  // Measured controls change, details toggle, animation completion and viewport resize.
  expanded=true;u.syncControlLayout();
  for(const f of listeners.toggle||[])f({target:{closest:()=>true}});
  for(const f of listeners.animationend||[])f({target:{matches:()=>true}});
  winListeners.resize();rend.resize();flush();
  assert.equal(revealed,1,'opening terms still reveals its content');
  assert.equal(styles.get('--controls-bottom'),'228px','layout measurements still update');
  assert.deepEqual(snapshot(),before,'layout/details/animation/resize preserve player camera');
  const unitCount=sim.objs('unit').length;
  u.confirmPlan();u.update(0);flush();
  assert.equal(sim.objs('unit').length,unitCount+1,'Confirm builds exactly one unit');
  assert.equal(u.plan,null);assert.equal(sim.s.speed,0);
  const afterConfirm=snapshot();assert.deepEqual(afterConfirm,before,'Confirm preserves camera');
  // Manual controls work and subsequent UI updates leave their result alone.
  rend.pan(12,-8);rend.zoomBy(.9);const manual=snapshot();
  assert.notDeepEqual(manual,before);u.update(0);flush();assert.deepEqual(snapshot(),manual);
  const oldAspect=rend.aspect;canvas.clientWidth=width+30;rend.resize();
  assert.notEqual(rend.aspect,oldAspect,'renderer resize still updates projection aspect');
  assert.deepEqual(snapshot(),manual,'resize preserves zoom, center, view and rotation');
  // Explicit property fit remains callable; scheduler helper still supports an explicit request.
  rend.fitProperty(u.safeRect());assert.notDeepEqual(snapshot(),manual);
  u.plan=sim.plan({tool:'du5x10',a:{x:16,y:8},b:{x:16,y:8},f:0});
  u.plan.args={tool:'du5x10',a:{x:16,y:8},b:{x:16,y:8},f:0};
  u.schedulePlacementFrame(true);assert.equal(queue.length,1);flush();
  results.push({width,height,before,review,afterConfirm});
  console.log(`PASS ${width}x${height}: ordinary review, update/layout/details/animation/resize, Confirm, Pause, manual camera and explicit framing`);
}
console.log(JSON.stringify({qualification:'controlled CPU/DOM fixture; NOT rendered browser evidence',results},null,2));
