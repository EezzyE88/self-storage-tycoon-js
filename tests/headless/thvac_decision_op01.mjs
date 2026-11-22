import assert from 'node:assert/strict';
import { hvacRepairOutlook, hvacRepairOutlookText } from '../../js/hvacdecision.js';
const plant=(id,cond,unpowered=false)=>({id,type:'hvac',cstate:'operating',cond,unpowered,serves:5});
const assess=(o,cap,load,other=[],otherCond=1)=>hvacRepairOutlook({s:{objects:Object.fromEntries([o,...other.map(id=>plant(id,otherCond))].map(p=>[p.id,p]))},D:{hvac:{5:{cap,load,plants:[o.id,...other]}}}},o,60);
const checks=[
 ['healthy',()=>{const x=assess(plant(1,1),60,40);assert.equal(x.gain,0);assert.match(hvacRepairOutlookText(x),/no(t)? increase capacity/);}],
 ['degraded sufficient',()=>{const x=assess(plant(1,.4),48,40);assert.equal(x.repairedCapacity,60);assert.equal(x.shortageNow,0);assert.match(hvacRepairOutlookText(x),/no current capacity shortage/);}],
 ['degraded shortage repaired',()=>{const x=assess(plant(1,.4),48,55);assert.equal(x.shortageNow,7);assert.equal(x.shortageAfter,0);assert.match(hvacRepairOutlookText(x),/could cover that shortage/);}],
 ['still short after repair',()=>{const x=assess(plant(1,.1),15,75);assert.equal(x.repairedCapacity,60);assert.equal(x.shortageAfter,15);assert.match(hvacRepairOutlookText(x),/still be short/);}],
 ['multiple plants',()=>{const x=assess(plant(1,.4),108,120,[2]);assert.equal(x.repairedCapacity,120);assert.equal(x.otherPlants,1);assert.match(hvacRepairOutlookText(x),/other operating HVAC plant/);}],
 ['multi plant remains short',()=>{const x=assess(plant(1,.4),108,140,[2]);assert.equal(x.shortageAfter,20);}],
 ['unpowered',()=>{const x=assess(plant(1,.1,true),60,80,[2]);assert.equal(x.gain,0);assert.match(hvacRepairOutlookText(x),/no power/);}],
 ['full but shortage from high demand',()=>{const x=assess(plant(1,1),60,75);assert.match(hvacRepairOutlookText(x),/servicing it will not fix/);}],
 ['stale zone cap after wear below 45% does not overstate repair',()=>{const x=assess(plant(1,.44),60,40);assert.equal(x.repairedCapacity,60);assert.equal(x.gain,0);assert.doesNotMatch(hvacRepairOutlookText(x),/72/);}],
 ['degraded peer counted at live capacity',()=>{const x=assess(plant(1,.1),75,130,[2],.4);assert.equal(x.repairedCapacity,108);assert.equal(x.shortageAfter,22);}],
 ['missing peer object gives no estimate',()=>{assert.equal(hvacRepairOutlook({s:{objects:{1:plant(1,.4)}},D:{hvac:{5:{cap:48,load:40,plants:[1,9]}}}},plant(1,.4),60),null);}],
 ['non-operating no outlook',()=>{assert.equal(hvacRepairOutlook({D:{hvac:{}}},{...plant(1,.3),cstate:'construction'},60),null);}],
 ['no state mutation',()=>{const o=plant(1,.4);const z={cap:48,load:55,plants:[1]};const sim={D:{hvac:{5:z}}};const before=JSON.stringify({o,sim});hvacRepairOutlook(sim,o,60);assert.equal(JSON.stringify({o,sim}),before);}],
];
for(const [name,test] of checks){test();console.log('PASS',name)}
console.log(`${checks.length}/${checks.length} OP-01 targeted checks PASS`)
