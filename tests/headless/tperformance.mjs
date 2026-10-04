import assert from 'node:assert/strict';
import { PerformanceStats } from '../../js/performance.js';
import { loadRenderer } from '../performance/renderer-fixture.mjs';
import { makeMaple } from '../../js/maple.js';
import { UI } from '../../js/ui.js';
let n=0;function test(name,f){f();n++;console.log('PASS '+name)}
const sample=(frameMs=16)=>({frameMs,simMs:2,renderMs:4,uiMs:1,info:{calls:22,triangles:100,geometries:7,textures:9},dpr:2,quality:2});
test('disabled diagnostics allocate no samples',()=>{const p=new PerformanceStats(5);for(let i=0;i<20;i++)p.record(sample());assert.equal(p.snapshot().samples,0)});
test('bounded window percentiles and latest renderer counts',()=>{const p=new PerformanceStats(5);p.enabled=true;for(let i=1;i<=10;i++)p.record({...sample(i),info:{calls:i}});const s=p.snapshot();assert.equal(s.samples,5);assert.equal(s.total,10);assert.deepEqual(s.frameMs,{p50:8,p95:10,p99:10});assert.equal(s.calls,10);assert.equal(s.cpuMs.render,4);p.reset();assert.equal(p.snapshot().samples,0)});
test('throttled redraws explicitly labeled',()=>{const p=new PerformanceStats();p.enabled=true;p.record({...sample(250),throttled:true});assert.match(p.text(),/drawing throttled/)});
const Renderer=await loadRenderer();const sim=makeMaple();const r=new Renderer({clientWidth:393,clientHeight:720},sim);
const make=a=>r.personMesh(a),noop=()=>{};
test('customer recycling resets appearance/carry/pose and fresh snap',()=>{r.syncPool(r.pool.ppl,[{id:1,kind:'cust',look:1}],make,noop,.016);const m=r.pool.ppl.get(1);m.userData.box.visible=true;m.userData.legs.scale.y=.5;m.rotation.y=2;r.syncPool(r.pool.ppl,[],make,noop,.016);r.syncPool(r.pool.ppl,[{id:2,kind:'cust',look:123}],make,m=>assert.equal(m.userData.fresh,true),.016);assert.equal(r.pool.ppl.get(2),m);assert.equal(m.rotation.y,0);assert.equal(m.userData.legs.scale.y,.32);assert.equal(m.userData.box.visible,false);const fresh=r.personMesh({id:3,kind:'staff',look:123});assert.equal(m.userData.body.material.color.getHex(),fresh.userData.body.material.color.getHex());assert.equal(m.userData.head.material,fresh.userData.head.material);r.disposeTree(fresh)});
test('recycling bounds retained meshes without capping active customers',()=>{r.clearDynamic();r.syncPool(r.pool.ppl,Array.from({length:71},(_,id)=>({id,kind:'cust'})),make,noop,.016);assert.equal(r.pool.ppl.size,71);r.syncPool(r.pool.ppl,[],make,noop,.016);assert.equal(r.customerFree.length,24)});
test('property switch cleanup disposes retained private materials, preserves shared skin',()=>{let disposed=0,skinDisposed=0;for(const m of r.customerFree)m.userData.body.material.addEventListener('dispose',()=>disposed++);r.mat.skin[0].addEventListener('dispose',()=>skinDisposed++);r.clearDynamic();assert.equal(disposed,24);assert.equal(skinDisposed,0);assert.equal(r.customerFree.length,0);assert.equal(r.dynG.children.length,0)});
test('staff meshes never enter customer cache',()=>{r.syncPool(r.pool.ppl,[{id:1,kind:'staff',role:'tech'}],make,noop,.016);r.syncPool(r.pool.ppl,[],make,noop,.016);assert.equal(r.customerFree.length,0)});
test('mobile tiny prop shadows disabled; geometry and selection tags retained',()=>{const m=r.box(.3,.2,.3,r.mat.skin[0],0,0,0,1,{obj:42});assert.equal(m.castShadow,false);assert.equal(m.userData.obj,42);assert.equal(m.userData.f,1);assert.ok(r.box(2,1,2,r.mat.skin[0],0,0,0).castShadow);r.mobile=false;assert.ok(r.box(.3,.2,.3,r.mat.skin[0],0,0,0).castShadow)});
function coach(occupied,ready){const u=Object.create(UI.prototype);u.g={sim:{D:{},s:{objects:{},tasks:[],leases:{},open:true,cash:100,mode:'sandbox'},occupancy:()=>({n:25,occ:occupied,pct:occupied/25}),operations:()=>({ready:Array(ready)})}};return u.coachHint()}
test('95% occupancy identifies rent-ready vacancy and pricing action',()=>{const h=coach(24,1);assert.match(h.text,/Nearly full: 24\/25/);assert.match(h.text,/1 rent-ready vacancy/);assert.equal(h.act.tab,'business')});
test('near-full turnover cannot be presented as a rentable vacancy',()=>{const h=coach(24,0);assert.match(h.text,/need turnover/);assert.equal(h.act.tab,'operate')});
test('only 100% operating occupancy says all operating units leased',()=>{assert.match(coach(25,0).text,/All 25 operating units are leased/)});
console.log(`${n} performance/UI regressions passed`);
