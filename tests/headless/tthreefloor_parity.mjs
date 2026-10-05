import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeScenario} from '../../js/scenarios.js';
let code=readFileSync('tests/fixtures/candidate19-sim.js','utf8');code=code.replace(/(['"])(\.\/[^'"]+)\1/g,(_,q,p)=>JSON.stringify(pathToFileURL(process.cwd()+'/js/'+p.slice(2)).href));const Old=(await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'))).Sim;
for(const [file,hash] of Object.entries(JSON.parse(readFileSync('tests/fixtures/candidate19-economy-hashes.json','utf8'))))assert.equal(createHash('sha256').update(readFileSync(file)).digest('hex'),hash);
for(const state of [makeMaple().s,makeScenario('vertical').s]){const a=new Sim(JSON.parse(JSON.stringify(state))),b=new Old(JSON.parse(JSON.stringify(state)));for(let i=0;i<1440*7;i++){a.step();b.step();a.events.length=0;b.events.length=0;}assert.deepEqual(a.s,b.s);}
console.log('PASS exact seven-day legacy simulation state/RNG/economy parity against candidate19; unchanged rates, factories and finance; save UX covered separately');
