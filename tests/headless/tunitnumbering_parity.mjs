// Run against a verified, unchanged parent checkout: node .../tunitnumbering_parity.mjs /absolute/parent.
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {makeMaple} from '../../js/maple.js';
import {Sim} from '../../js/sim.js';
import {makeScenario} from '../../js/scenarios.js';
const root=process.argv[2];if(!root)throw Error('Pass the unchanged 9700d9d parent checkout');
const old=await import(pathToFileURL(resolve(root,'js/maple.js')));
const oldScenarios=await import(pathToFileURL(resolve(root,'js/scenarios.js')));
const copy=x=>JSON.parse(JSON.stringify(x));
function comparable(v){
 if(typeof v==='string')return v.replace(/Unit \d+\b/g,'Unit <number>');
 if(Array.isArray(v))return v.map(comparable);
 if(v&&typeof v==='object')return Object.fromEntries(Object.entries(v).filter(([k])=>!['unitNumbering','unitRoles','unitNo','unitNumber','num'].includes(k)).map(([k,x])=>[k,comparable(x)]));
 return v;
}
for(const seed of [7,99,9711]){
 const a=old.makeMaple(seed),b=makeMaple(seed);a.act_tutSkip();b.act_tutSkip();
 assert.deepEqual(comparable(b.s),comparable(a.s),'authored start gameplay parity');
 const migrated=new Sim(copy(a.s));
 assert.deepEqual(comparable(migrated.s),comparable(a.s),'actual parent state migration preserves gameplay');
 for(let day=0;day<30;day++){
   for(let i=0;i<1440;i++){a.step();b.step();migrated.step();a.events=[];b.events=[];migrated.events=[];}
   assert.deepEqual(comparable(b.s),comparable(a.s),`new start seed ${seed} day ${day}`);
   assert.deepEqual(comparable(migrated.s),comparable(a.s),`migration seed ${seed} day ${day}`);
 }
 console.log(`PASS parent/new/migrated exact daily gameplay parity: seed ${seed}, 30 days`);
}
for(const id of ['comeback','turnaround','vertical','climate']){
 const a=oldScenarios.makeScenario(id,9711),b=makeScenario(id,9711),migrated=new Sim(copy(a.s));
 assert.deepEqual(comparable(b.s),comparable(a.s),id+' start');assert.deepEqual(comparable(migrated.s),comparable(a.s),id+' migration');
 console.log('PASS actual parent scenario start/migration parity:',id);
}
