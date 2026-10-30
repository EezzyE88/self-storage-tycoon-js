import {normalizePostStage4A} from './post_stage4a_baseline.mjs';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {makeMaple} from '../../js/maple.js';
import {UI} from '../../js/ui.js';

let n=0;const test=(name,fn)=>{fn();n++;console.log('PASS',name);};
function review(args){
 const sim=makeMaple();sim.s.tut.beat=4;sim.s.speed=0;
 const ui=Object.create(UI.prototype),box={innerHTML:'',firstChild:null};
 ui.g={sim,rend:{view:'ext'}};ui.tool='du10x10';ui.plan=sim.plan({tool:ui.tool,f:0,...args});
 ui.$=()=>box;ui.schedulePlacementFrame=()=>{};
 return {sim,ui,box};
}
test('real invalid review names Rotate, keeps refusal and preserves paused company',()=>{
 const {sim,ui,box}=review({a:{x:-2,y:21},b:{x:-2,y:28}});
 assert.equal(ui.plan.status,'invalid');const before=JSON.stringify(sim.s);
 ui.renderActionBar();assert.match(box.innerHTML,/Try Rotate/);assert.doesNotMatch(box.innerHTML,/Flip doors/);
 assert.match(box.innerHTML,/data-a="rotateBuild"/);assert.match(box.innerHTML,/data-a="confirm" disabled/);
 assert.equal(JSON.stringify(sim.s),before);
});
test('real valid review retains financial terms in scroller and Confirm in fixed footer',()=>{
 const {sim,ui,box}=review({a:{x:13,y:21},b:{x:13,y:28},axis:'y'});
 assert.equal(ui.plan.status,'valid');const before=JSON.stringify(sim.s);ui.renderActionBar();
 const html=box.innerHTML,body=html.indexOf('class="review-body"'),footer=html.indexOf('class="bot"');
 for(const text of ['Cash after build','Available after bills']){const i=html.indexOf(text);assert.ok(i>body&&i<footer,text);}
 assert.ok(html.indexOf('data-a="confirm"')>footer);assert.ok(!/data-a="confirm" disabled/.test(html));
 assert.equal(JSON.stringify(sim.s),before);
});
test('short-screen CSS budget grows at 375×667 while 390×844 retains the parent budget',()=>{
 const css=readFileSync('css/game.css','utf8');
 const original=css.match(/max-height:min\((42)dvh, calc\(100dvh - var\(--review-top, 116px\) - (64)px - var\(--safe-b\) - (150)px\)\)/);
 const scoped=css.match(/@media \(max-width:(\d+)px\) and \(min-height:(\d+)px\) and \(max-height:(\d+)px\) and \(orientation:portrait\) \{\s*#ui \.actionbar:not\(\.placing\):not\(\.idle-strip\) \{ max-height:min\((\d+)dvh, calc\(100dvh - var\(--review-top, 116px\) - (\d+)px - var\(--safe-b\) - (\d+)px\)\)/);
 assert.ok(original&&scoped,'read actual stylesheet constraints');
 const budget=(h,top,safe,rule)=>Math.min(h*rule[0]/100,h-top-rule[1]-safe-rule[2]);
 const old=original.slice(1).map(Number),extra=scoped.slice(4).map(Number);
 const current=(w,h,top,safe)=>budget(h,top,safe,w<=+scoped[1]&&h>=+scoped[2]&&h<=+scoped[3]&&h>w?extra:old);
 for(const safe of [0,34]){
  const top=255;assert.ok(current(375,667,top,safe)-budget(667,top,safe,old)>=64);
  assert.equal(current(390,844,top,safe),budget(844,top,safe,old));
  assert.ok(current(375,667,top,safe)+top+safe+64<=667,'no intrusion into instruction or tabs budget');
 }
});
test('tutorial banner implementation is byte-identical to exact integration parent',()=>{
 assert.equal(normalizePostStage4A(readFileSync('js/showcase.js','utf8'),'js/showcase.js'),execFileSync('git',['show','58d11b1e3498165865553805282c91bcbd6bde51:js/showcase.js'],{encoding:'utf8'}));
});
console.log(`ALL PASS: ${n} review checks. CSS budget arithmetic/production HTML only; rendered browser sizes and physical Safari NOT TESTED.`);
