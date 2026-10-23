import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { makeMaple } from '../../js/maple.js';
import { BEATS, curBeat, tutorialText } from '../../js/tutorial.js';
import { UI, guideLabelPlacement } from '../../js/ui.js';

let groups = 0;
const test = (name, fn) => { fn(); groups++; console.log('PASS', name); };
const rect = (left, top, width, height) => ({left, top, width, height, right:left+width, bottom:top+height});

test('cards and completion banners use the same live role number without changing state', () => {
  const sim = makeMaple();
  sim.s.tut.beat = 1;
  const before = JSON.stringify(sim.s);
  assert.equal(curBeat(sim).title, 'Turn over Unit 1007');
  // Exercise the production event-handler branch, including its actual game binding.
  const source = readFileSync('js/showcase.js', 'utf8');
  const branch = source.split('\n').find(line => line.includes("case 'tut_done':"));
  const calls = [];
  const context = {game:{sim}, s:sim.s, BEATS, tutorialText, e:{type:'tut_done',beat:1}, celebrate:(...args)=>calls.push(args), officeAt:()=>null};
  vm.runInNewContext(`switch(e.type) { ${branch} }`, context);
  assert.equal(calls[0][1], 'Turn over Unit 1007');
  assert.equal(JSON.stringify(sim.s), before);
  // A migrated role reference must use its actual number, never a replacement literal.
  const unit = sim.s.objects[sim.s.unitRoles.mapleTurnover];
  unit.num = 1098;
  assert.equal(curBeat(sim).title, 'Turn over Unit 1098');
  assert.equal(tutorialText(sim, 'Unit 107 and Unit 203'), `Unit 1098 and Unit ${sim.s.objects[sim.s.unitRoles.mapleInteriorMoveout].num}`);
});

test('tutorial names the existing speed, rotation and repair controls', () => {
  const text = BEATS.flatMap(b => b.steps.map(s => s.d || '')).join(' ');
  assert.doesNotMatch(text, /top right|Flip doors|red wrench/);
  assert.match(text, /top left/);
  assert.match(text, /tap <b>Rotate<\/b>/);
  assert.match(text, /orange wrench pin/);
  // The action bar's invalid-placement hint during the lesson must name the same control.
  const ui = readFileSync('js/ui.js', 'utf8');
  assert.doesNotMatch(ui, /Try Flip doors/);
  assert.match(ui, /Confirm unlocks when the doors face a connected aisle\. Tap Rotate or move the row beside the aisle\./);
});

for (const [width, height] of [[390,844],[375,667]]) {
  test(`${width}×${height} caption geometry avoids price, tabs, instructions and viewport edges`, () => {
    const label = {width:88,height:28};
    // Confirm sits within the review panel; its price is directly above, tabs below.
    const panel = rect(8,height-418,width-16,350), tabs = rect(0,height-62,width,62);
    assert.equal(guideLabelPlacement(rect(18,height-112,88,44),label,width,height,[panel,tabs]),null);
    const target = rect(130,280,50,44);
    const topCard = rect(8,210,width-16,65);
    const p = guideLabelPlacement(target,label,width,height,[topCard]);
    assert.equal(p.below,true);
    assert.equal(guideLabelPlacement(target,label,width,height,[topCard,rect(0,324,width,100)]),null);
    for (const left of [-3,width-42]) {
      const p = guideLabelPlacement(rect(left,280,44,44),label,width,height,[]);
      assert.ok(p.center-label.width/2>=8);
      assert.ok(p.center+label.width/2<=width-8);
    }
    assert.equal(guideLabelPlacement(target,{width:width,height:28},width,height,[]),null);
  });

  test(`${width}×${height} production pointer hides redundant/blocked captions and preserves state`, () => {
    globalThis.innerWidth=width; globalThis.innerHeight=height;
    const sim=makeMaple(), before=JSON.stringify(sim.s), ui=Object.create(UI.prototype);
    const classes=new Set();
    const label={textContent:'',style:{},getBoundingClientRect:()=>rect(0,0,88,28)};
    const guide={hidden:true,style:{},lastChild:label,classList:{remove:k=>classes.delete(k),toggle:(k,on)=>on?classes.add(k):classes.delete(k)}};
    const target={getBoundingClientRect:()=>rect(20,height-112,80,40),closest:()=>null};
    let obstacles=[rect(8,height-418,width-16,350),rect(0,height-62,width,62)];
    ui.g={sim}; ui.title=true; ui.$=()=>guide;
    ui.root={querySelectorAll:()=>obstacles.map(r=>({getBoundingClientRect:()=>r}))};
    ui.guideTarget=()=>({el:target,lbl:'Tap here'});
    ui.updateGuide();
    assert.equal(guide.hidden,false); assert.ok(classes.has('nolabel'));
    // With room, the caption reappears and uses its measured position.
    obstacles=[]; ui.updateGuide(); assert.ok(!classes.has('nolabel')); assert.ok(label.style.left);
    target.closest=s=>s==='#tut'?{}:null;
    ui.updateGuide(); assert.ok(classes.has('nolabel'));
    ui.pointerBusy=true; ui.updateGuide(); assert.equal(guide.hidden,true);
    assert.equal(JSON.stringify(sim.s),before);
    delete globalThis.innerWidth; delete globalThis.innerHeight;
  });
}
console.log(`ALL PASS: ${groups} guidance groups. Rectangle/DOM-double checks only; rendered browser and physical Safari NOT TESTED.`);
