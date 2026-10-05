import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeScenario} from '../../js/scenarios.js';
const base='da4c72a339345fa89a5375014daa2ae17158ef28';let code=execFileSync('git',['show',base+':js/sim.js'],{encoding:'utf8'});code=code.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>JSON.stringify(pathToFileURL(process.cwd()+'/js/'+p.slice(2)).href));const Old=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).Sim;
for(const file of ['js/data.js','js/finance.js','js/maple.js','js/scenarios.js','js/localsave.js'])assert.equal(readFileSync(file,'utf8'),execFileSync('git',['show',base+':'+file],{encoding:'utf8'}));
for(const state of [makeMaple().s,makeScenario('vertical').s]){const a=new Sim(JSON.parse(JSON.stringify(state))),b=new Old(JSON.parse(JSON.stringify(state)));for(let i=0;i<1440*7;i++){a.step();b.step();a.events.length=0;b.events.length=0;}assert.deepEqual(a.s,b.s);}
console.log('PASS exact seven-day legacy simulation state/RNG/economy parity against candidate19; unchanged rates, factories, finance and save slots');
