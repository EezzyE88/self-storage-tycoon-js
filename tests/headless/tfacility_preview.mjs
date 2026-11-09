// AG-01: the read-only operating-facility preview uses the same constructor as acquire(), is deterministic and never mutates the source.
// Actual main.js game methods loaded in a VM (same slicing as tacquisition_review); no rendered-browser claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,join} from 'node:path';
import vm from 'node:vm';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {portfolioCareer} from '../../js/career.js';
import {installTutorial} from '../../js/tutorial.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
function gameAt(dir=resolve('.')) {
  const src=readFileSync(join(dir,'js/main.js'),'utf8');
  const ctx=vm.createContext({Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,portfolioCareer,installTutorial,localsave,savearchive,cloud:{ok:false},Audio:class{},performance,console,BUILD:{name:'facility-preview-test'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
  vm.runInContext(src.slice(src.indexOf('const game = {'),src.indexOf('// initial world'))+src.slice(src.indexOf('const WORKING_FLOAT'),src.indexOf('// Save codes'))+src.slice(src.indexOf('function validState('),src.indexOf('function makeMapleSeedPrice'))+src.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+'\nglobalThis.game=game;globalThis.WF=WORKING_FLOAT;',ctx);
  return {g:ctx.game,WF:ctx.WF};
}
// Fixtures: a graduated-campaign-like Maple source (tutorial done) and a starter sandbox; various clock times and portfolio sizes.
function fixture({start='maple',t=780,cash=250000,extra=0}={}) {
  const {g,WF}=gameAt();
  let sim;
  if(start==='maple'){sim=makeMaple(4242);sim.s.tut.done=true;sim.s.tut.on=false;sim.s.coTier=2;}
  else sim=makeSandbox({start:'starter',cash});
  sim.s.cash=cash;sim.s.speed=0;sim.s.convos=[];
  for(let i=0;i<t;i++)sim.step();sim.events.length=0;
  g.sim=sim;g.company={props:[{name:'Maple Street Storage',sim}],active:0,feed:[]};
  for(let k=0;k<extra;k++){const p=makeSandbox({cash:1000});g.company.props.push({name:'Other yard '+k,sim:p});}
  return {g,sim,WF};
}
const state=sim=>JSON.stringify(sim.s);
const all=f=>JSON.stringify(f.g.company.props.map(p=>[p.name,p.sim.s]))+JSON.stringify(f.g.company.feed)+f.g.company.active;
const facts=sim=>{const o=sim.occupancy();return {units:o.n,leased:o.occ,roll:sim.rentRoll(),opexDay:sim.dailyOpex().total,staff:sim.s.staff.map(x=>x.role)};};
const cases=[{start:'maple',t:780},{start:'maple',t:1440*3+600},{start:'maple',t:1440*9+1200,extra:1},{start:'starter',t:780},{start:'starter',t:2000,extra:2},{start:'maple',t:300,extra:3}];
let n=0;function test(name,fn){fn();n++;console.log('PASS '+name);}

test('preview builds from the shared constructor and leaves every property, the feed and the active index unchanged',()=>{
  for(const c of cases){const f=fixture(c);const before=all(f),src=state(f.sim);
    const p=f.g.facilityPreview();assert.ok(p);f.g.buildFacility(f.sim,f.g.company.props);f.g.offers();
    assert.equal(state(f.sim),src);assert.equal(all(f),before);assert.equal(f.g.company.props.length,1+(c.extra||0));}
});
test('two previews are identical (deterministic) and repeated previews do not drift',()=>{
  for(const c of cases){const f=fixture(c);const a=f.g.buildFacility(f.sim,f.g.company.props),b=f.g.buildFacility(f.sim,f.g.company.props);
    assert.equal(state(a),state(b));assert.deepEqual(f.g.facilityPreview(),f.g.facilityPreview());}
});
test('preview state equals the property a real purchase creates (after the same opening cash), for every case',()=>{
  for(const c of cases){const f=fixture(c);const pv=f.g.buildFacility(f.sim,f.g.company.props),info=f.g.facilityPreview();
    pv.money(f.WF,'other','Opening working cash from '+f.g.company.props[f.g.company.active].name);
    const r=f.g.acquire('facility','maple');assert.ok(r.ok,r.msg);const bought=f.g.company.props.at(-1).sim;
    assert.equal(state(pv),state(bought));
    const ff=facts(bought);assert.deepEqual({units:info.units,leased:info.leased,roll:info.roll,opexDay:info.opexDay,staff:info.staff},ff);
    const ti=f.g.tierInfo();assert.equal(info.career.roll,ti.roll);assert.equal(info.career.n,ti.n);assert.equal(info.career.qualified,ti.qualified&&ti.qualified.name);}
});
test('mirror parity and seed follow the portfolio exactly as acquire() does; maple.js mirror flag is reset after preview',()=>{
  const names=['Oak Ridge Storage','Cedar Point Storage','Willow Creek Storage','Pine Hollow Storage'];
  for(const c of cases){const f=fixture(c),props=f.g.company.props;const k=props.filter(p=>p.sim.s.mirror!=null||names.includes(p.name)).length;
    const a=f.g.buildFacility(f.sim,props);assert.equal(a.s.mirror,k%2===0);assert.equal(a.s.seed,makeMaple(1000+props.length*77).s.seed);
    assert.ok(!makeMaple(5).s.mirror);assert.equal(JSON.stringify(makeMaple(77).s.objects),JSON.stringify(makeMaple(77).s.objects));}
});
test('negative control: a divergent constructor (other seed) is detected by the equality check',()=>{
  const f=fixture();const real=f.g.buildFacility(f.sim,f.g.company.props);
  const wrong=makeMaple(1000+f.g.company.props.length*77+1,{mirror:false});
  assert.notEqual(JSON.stringify(real.s.leases),JSON.stringify(wrong.s.leases));
});
test('preview is unavailable when the portfolio is full and purchases stay limited',()=>{
  const f=fixture({extra:4});assert.equal(f.g.facilityPreview(),null);assert.equal(f.g.acquire('facility','maple').ok,false);
});
console.log(`${n} facility-preview groups passed`);
