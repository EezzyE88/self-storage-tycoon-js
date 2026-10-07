// Scene/CPU comparisons only. Mocked Canvas/WebGL cannot establish visual quality, FPS or GPU memory.
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {loadRenderer} from './renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox} from '../../js/scenarios.js';
import {buildMaxLot} from '../stress/maxlot.mjs';
import {tickVertical} from '../../js/vertical.js';
const Base=await loadRenderer('e0137369d255640d9edde443b1a6e289bc20c8c7'),Next=await loadRenderer();
const median=a=>a.sort((a,b)=>a-b)[Math.floor(a.length/2)];
function upper(){const s=makeMaple(30);s.s.cash=1000000;s.s.open=false;const sh=s.objs('shell')[0];for(let f=1;f<3;f++){const p=s.verticalPlan(sh.id);assert.ok(p.ok);assert.ok(s.dispatch({type:'verticalUpgrade',...p}).ok);const ord=s.s.orders.at(-1);for(let i=0;i<50000&&ord.st==='construction';i++){s.s.t++;tickVertical(s,ord);s.ensure();for(const e of s.objs('elevator'))s.updateElevator(e);}assert.equal(ord.st,'done');}return s;}
function stats(r){let meshes=0,shadowCasters=0,triangles=0;const geometry=new Set(),material=new Set(),textures=new Set();r.scene.traverse(o=>{if(o.isMesh){meshes++;shadowCasters+=+o.castShadow;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.count||1);geometry.add(o.geometry);const ms=Array.isArray(o.material)?o.material:[o.material];for(const m of ms){material.add(m);if(m.map)textures.add(m.map);}}});return {meshes,shadowCasters,triangles,geometries:geometry.size,materials:material.size,mappedTextures:textures.size};}
const result={environment:'Node/Three.js with stubbed Canvas/WebGL. Scene counts and CPU submission work only; no GPU, actual draws, raster screenshots or physical-iPhone acceptance.',baseline:'e0137369d255640d9edde443b1a6e289bc20c8c7',scenes:{}};
for(const name of ['day','night','rain','upperF3','dense']){
 const sim=name==='upperF3'?upper():name==='dense'?makeSandbox({kind:'free',instant:true,seed:30}):makeMaple(30);if(name==='dense')buildMaxLot(sim,{aisleW:1});
 sim.s.speed=4;sim.s.agents=Array.from({length:name==='dense'?100:20},(_,i)=>({id:9000+i,kind:'cust',st:'walk',look:i,x:4+i%8,y:4+Math.floor(i/8),f:0,carry:i%3===0}));
 const saved=JSON.stringify(sim.s);const rs=[new Base({clientWidth:393,clientHeight:720},sim),new Next({clientWidth:393,clientHeight:720},sim)];const metrics=[];
 for(const r of rs){r.todOverride=name==='night'?23:12;r.weatherOverride=name==='rain'?'rain':'clear';r.rebuildStatic();if(name==='upperF3')r.setView(2);r.updateSky(.016);r.updateDynamic(.016);}
 const samples=rs.map(()=>({rebuild:[],dynamic:[],ground:[]}));
 for(let repeat=0;repeat<9;repeat++)for(const j of repeat%2?[1,0]:[0,1]){const r=rs[j];let t=performance.now();r.rebuildStatic();samples[j].rebuild.push(performance.now()-t);t=performance.now();r.drawGround();samples[j].ground.push(performance.now()-t);t=performance.now();for(let k=0;k<180;k++){r.time+=.016;r.updateDynamic(.016);}samples[j].dynamic.push((performance.now()-t)/180);}
 for(let j=0;j<2;j++)metrics.push({...stats(rs[j]),rebuildMedianMs:+median(samples[j].rebuild).toFixed(3),groundMedianMs:+median(samples[j].ground).toFixed(3),dynamicFrameMedianMs:+median(samples[j].dynamic).toFixed(3)});
 assert.equal(JSON.stringify(sim.s),saved);assert.equal(metrics[1].shadowCasters,metrics[0].shadowCasters);assert.equal(metrics[1].geometries,metrics[0].geometries);assert.equal(metrics[1].materials,metrics[0].materials);assert.equal(metrics[1].mappedTextures,metrics[0].mappedTextures);
 assert.equal(metrics[1].meshes-metrics[0].meshes,sim.s.agents.length*2);result.scenes[name]={units:sim.objs('unit').length,people:sim.s.agents.length,baseline:metrics[0],candidate:metrics[1]};
}
console.log(JSON.stringify(result,null,2));
