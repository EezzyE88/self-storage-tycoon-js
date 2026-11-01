import assert from 'node:assert/strict';
import { UI } from '../../js/ui.js';

let checks = 0;
const test = (name, fn) => { fn(); console.log('PASS ' + name); checks++; };

function fixture() {
  const box = {
    _html: '',
    get innerHTML(){ return this._html; },
    set innerHTML(v){ this._html = v; },
    get firstChild(){ return this._html ? {} : null; },
    querySelector(){ return null; },
  };
  const ui = Object.create(UI.prototype);
  ui.retrofitReview = null;
  ui.verticalPreviewing = false;
  ui.tool = 'du5x5';
  ui.planArgs = {a:{x:10,y:10},b:{x:10,y:10}};
  ui.plan = {
    status:'incomplete', cost:420, count:1, dur:318, opex:.25,
    reasons:[], missing:['Door faces no drive aisle yet'], warn:[],
    args:{tool:'du5x5',lighting:'none',outsideCameras:false},
    creates:[{type:'unit',x:10,y:10,w:1,h:1,dir:[0,-1]}], units:[{dir:[0,-1]}],
  };
  ui.buildPlacing = false;
  ui.placementPeek = false;
  ui.placementFrameKey = null;
  ui.projectProposal = null;
  ui.rush = false;
  ui.climate = false;
  ui.$ = id => id === 'abar' ? box : null;
  ui.pauseForPopup = () => {};
  ui.resumePopup = () => {};
  ui.canRush = () => false;
  ui.placementMismatch = () => null;
  ui.currentBlueprintPlan = () => null;
  ui.toolFloor = () => 0;
  ui.nearestValidPlacement = () => null;
  ui.upgradeHtml = () => '';
  ui.rotationHtml = () => '<button data-a="rotateBuild">Rotate</button>';
  ui.firstGateGuidance = () => null;
  ui.firstGateHtml = () => '';
  ui.g = {audio:{unlock(){}}, saveStartup:false};
  ui.sfx = () => {};
  Object.defineProperty(ui, 'sim', {value:{
    s:{creative:false,cash:60000,tut:{on:false},speed:0},
    unlimited:()=>false,
    financialPosition:()=>({cash:59580,committed:0,reserve:0,available:59580}),
    planDailyCost:()=>.25,
    autoOpenEnabled:()=>true,
    investment:()=>null,
    instantOn:()=>false,
  }});
  return {ui,box};
}

test('full unit review exposes Peek and keeps financial/warning/Confirm surfaces',()=>{
  const {ui,box}=fixture();
  ui.renderActionBar();
  assert.match(box.innerHTML,/data-a="placementPeek">Peek</);
  assert.match(box.innerHTML,/review-commitment/);
  assert.match(box.innerHTML,/data-a="confirm"/);
  assert.match(box.innerHTML,/Door faces no drive aisle yet/);
});

test('Peek renders only compact preview controls: no Confirm, money, options, or rotation',()=>{
  const {ui,box}=fixture(); ui.placementPeek=true; ui.renderActionBar();
  assert.match(box.innerHTML,/peek-review/);
  assert.match(box.innerHTML,/Show review/);
  assert.match(box.innerHTML,/show review to confirm/);
  assert.match(box.innerHTML,/data-a="cancelTool"/);
  assert.doesNotMatch(box.innerHTML,/data-a="confirm"/);
  assert.doesNotMatch(box.innerHTML,/review-commitment/);
  assert.doesNotMatch(box.innerHTML,/unit-options/);
  assert.doesNotMatch(box.innerHTML,/rotateBuild/);
});

test('Peek survives a UI-only requote/rerender without touching plan state',()=>{
  const {ui,box}=fixture(); ui.placementPeek=true;
  const before=JSON.stringify(ui.plan);
  ui.plan = {...ui.plan, cost:425, args:{...ui.plan.args, upgradeStamp:'requote'}};
  ui.renderActionBar();
  assert.equal(ui.placementPeek,true);
  assert.match(box.innerHTML,/peek-review/);
  assert.equal(ui.plan.cost,425);
  assert.equal(ui.plan.args.upgradeStamp,'requote');
  assert.notEqual(JSON.stringify(ui.plan),before);
});


test('one intentional placementPeek activation toggles Peek and restores the full review',()=>{
  const {ui,box}=fixture(); ui.renderActionBar();
  const button={dataset:{a:'placementPeek',v:undefined},closest:s=>s==='[data-a]'?button:null};
  ui.onClick({target:button});
  assert.equal(ui.placementPeek,true); assert.match(box.innerHTML,/peek-review/);
  ui.onClick({target:button});
  assert.equal(ui.placementPeek,false); assert.match(box.innerHTML,/data-a="confirm"/);
});

test('Peek persists deliberately through rotate/replan',()=>{
  const {ui}=fixture(); ui.placementPeek=true; ui.buildRotation=null;
  ui.plan.count=1; ui.plan.units=[{dir:[0,-1],x:10,y:10}];
  let replans=0; ui.replan=()=>{replans++;};
  ui.rotateBuild();
  assert.equal(replans,1); assert.equal(ui.placementPeek,true); assert.equal(ui.buildRotation,1);
});

console.log(`${checks} compact-Peek native checks passed`);
