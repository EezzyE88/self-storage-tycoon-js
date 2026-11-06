import assert from 'node:assert/strict';
import {makeMaple} from '../../js/maple.js';
import {MapleVisualLab} from '../../js/visual-lab.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
const a=makeMaple(4401),b=makeMaple(4401);a.ensure();b.ensure();
const r=new Renderer({clientWidth:390,clientHeight:844},a),lab=new MapleVisualLab(r);
const original=Object.fromEntries(Object.entries(r.mat).filter(([k,m])=>m.color).map(([k,m])=>[k,[m.color.getHex(),m.roughness]]));
const materials=()=>Object.fromEntries(Object.entries(r.mat).filter(([k,m])=>m.color).map(([k,m])=>[k,[m.color.getHex(),m.roughness]]));
for(let i=0;i<2000;i++){
 if(i%53===0)lab.setEnabled(!lab.enabled);
 if(i%211===0)r.rebuildStatic();
 a.step();b.step();assert.deepEqual(a.s,b.s,'identical deterministic simulation at minute '+i);assert.deepEqual(a.events,b.events);a.events.length=b.events.length=0;
}
lab.dispose();assert.deepEqual(materials(),original);
for(const speed of [0,1,2,4]){a.s.speed=speed;const state=JSON.stringify(a.s);for(let i=0;i<10;i++){lab.setEnabled(true);r.rebuildStatic();lab.currentVisit();lab.setEnabled(false);}assert.equal(JSON.stringify(a.s),state);assert.deepEqual(materials(),original);}
console.log('PASS real Three.js shared materials/rebuild/dispose exact restore; 2000-minute deterministic on/off state and event parity; read-only at Pause/1x/2x/4x');
