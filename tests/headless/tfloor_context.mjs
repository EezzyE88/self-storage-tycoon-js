// Real Three.js scene graph; GPU/Canvas stubbed. No physical-device claim.
import assert from 'node:assert/strict';
import {durableBaseline} from './durable_baseline.mjs';
import {atHistoricalChainHead} from './source_reader.mjs';
import {readFileSync} from 'node:fs';
import {base, full} from './tthreefloor.mjs';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {FLOOR_H} from '../../js/data.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const Renderer=await loadRenderer();
const Parent=await loadRenderer('1339648652cf61bfce23a96a60cbb54a7006c32a');
const sim=new Sim(structuredClone(full.s));
// Completed one-, two- and three-storey buildings, plus native drive-up/office.
// Small additional shells are synthetic scene fixtures in free ground cells.
const tall=sim.objs('shell')[0], shells=[tall];
for(const floors of [1,2]) {
 let cell;
 for(let y=1;y<sim.s.H-4&&!cell;y++)for(let x=1;x<sim.s.W-4;x++) {
  if(Array.from({length:16},(_,k)=>(y+(k>>2))*sim.s.W+x+(k%4)).every(i=>!sim.D.solid[i]&&!sim.D.shellAt[i])){cell={x,y};break;}
 }
 assert.ok(cell,'free fixture footprint');
 const o={...structuredClone(tall),...cell,id:sim.s.nextId++,w:4,h:4,floors};
 sim.s.objects[o.id]=o;shells.push(o);sim.markDirty();sim.ensure();
}
const saved=JSON.stringify(sim.s),warnings=[];
const warn=console.warn;console.warn=(...a)=>warnings.push(a.join(' '));
const r=new Renderer({clientWidth:393,clientHeight:720},sim);r.rebuildStatic();
console.warn=warn;assert.deepEqual(warnings,[]);
const parent=new Parent({clientWidth:393,clientHeight:720},sim);parent.rebuildStatic();
const originalScene=renderer=>renderer.staticG.children.map(m=>({visible:m.visible,position:m.position.toArray(),scale:m.scale.toArray()}));
for(const view of ['ext',0]){r.setView(view);parent.setView(view);assert.deepEqual(originalScene(r),originalScene(parent),'Exterior/F1 retained geometry matches numbering parent');assert.ok(r.contextG.children.every(g=>!g.visible));}
const drive=sim.objs('unit').find(o=>!sim.D.shellAt[o.y*sim.s.W+o.x]);
assert.ok(drive);assert.ok(sim.objs('office').length);
const contextFor=o=>r.contextG.children.find(g=>g.userData.contextIds.includes(o.id));
const camera=()=>JSON.stringify({center:r.center.toArray(),zoom:r.zoom,azimuth:r.azimuth,targetAz:r.targetAz,camera:r.camera.position.toArray(),projection:r.camera.projectionMatrix.toArray()});
const ui=Object.create(UI.prototype);ui.g={sim,rend:r,audio:{unlock(){}}};
ui.root={querySelectorAll:()=>[]};ui.renderSheet=()=>{};ui.syncFloorUi=()=>{};ui.closeModal=()=>{};ui.do=a=>sim.dispatch(a);
globalThis.requestAnimationFrame=()=>{};
for(const angle of [0,Math.PI/2,Math.PI,Math.PI*1.5]) {
 r.center.set(12.7,0,14.3);r.zoom=1.73;r.azimuth=angle;r.targetAz=angle;r.updateCamera();
 const pose=camera();
 for(const view of ['ext',0,1,2]) {
  ui.sel=null;ui.setView(view);r.openHouse.update();
  assert.equal(camera(),pose,'floor change preserves manual camera');
  for(const sh of shells) {
   assert.equal(contextFor(sh).visible,Number.isInteger(view)&&view>=sh.floors,'only below-view shells become context');
   const walls=r.staticG.children.filter(m=>m.userData.shellWall&&m.userData.shell===sh.id);
   assert.ok(walls.length);
   for(const m of walls)assert.equal(m.visible,view==='ext'||(view<sh.floors&&m.userData.wf<=view));
   assert.equal(ui.selectionOnActiveFloor(sh.id),view==='ext'||view<sh.floors);
   if(Number.isInteger(view)&&view>=sh.floors)assert.equal(ui.pickAt({x:sh.x+1,y:sh.y+1}),null,'context shell cannot be picked');
  }
  for(const o of [drive,...sim.objs('office')])assert.equal(contextFor(o).visible,Number.isInteger(view)&&view>0);
  for(const b of r.openHouse.batches.values())assert.equal(b.mesh.visible,view==='ext'||view===b.f,'only active interiors');
  for(const o of sim.objs('unit'))assert.equal(ui.selectionOnActiveFloor(o.id),view==='ext'||view===(o.f||0));
  if(Number.isInteger(view)&&view>0) {
   assert.equal(ui.pickAt({x:drive.x,y:drive.y}),null,'drive-up context cannot be picked');
   ui.select(drive.id);assert.equal(ui.sel,null);
   ui.sel=drive.id;assert.equal(ui.inspector(),'','stale references cannot inspect another floor');ui.sel=null;
   const u=sim.objs('unit').find(o=>o.f===view);assert.ok(u);
   assert.equal(ui.pickAt({x:u.x,y:u.y}),u.id,'active unit remains selectable');
   ui.select(u.id);assert.equal(ui.sel,u.id);
   const elev=sim.objs('elevator')[0];assert.ok(ui.selectionOnActiveFloor(elev.id),'served freight landing remains inspectable');
  }
  assert.equal(JSON.stringify(sim.s),saved,'complete state/save payload unchanged');
 }
}
// Switching away clears stale inspection, including carts and dirt.
ui.sel=drive.id;ui.setView(1);assert.equal(ui.sel,null);assert.equal(r.sel,null);
assert.equal(ui.selectionOnActiveFloor({kind:'dirt',f:0}),false);
assert.equal(ui.selectionOnActiveFloor({kind:'dirt',f:1}),true);
const cart=sim.s.carts[0];assert.ok(cart);assert.equal(ui.selectionOnActiveFloor({kind:'cart',id:cart.id}),(cart.f||0)===1);
// The real floor-chooser click must also preserve the manual pose.
const pose=camera();ui.onClick({target:{closest:()=>({dataset:{a:'floorPick',v:'2',building:String(tall.id)}})}});assert.equal(camera(),pose);
// Proxy floor heights are physical building heights, not lifted to the active plane.
for(const group of r.contextG.children)for(const mesh of group.children) {
 assert.ok(mesh.isInstancedMesh);assert.equal(mesh.userData.obj,undefined);
 assert.equal(mesh.count,group.userData.contextIds.length);
 assert.ok([...mesh.instanceMatrix.array].every(Number.isFinite));
 if(mesh.material===r.mat.shellWall)group.userData.contextIds.forEach((id,i)=>{
  const o=sim.s.objects[id],a=mesh.instanceMatrix.array,offset=i*16;
  if(o.type==='shell'){assert.ok(Math.abs(a[offset+5]-o.floors*FLOOR_H)<1e-5);assert.ok(Math.abs(a[offset+13]-o.floors*FLOOR_H/2)<1e-5);}
 });
}
const counts=()=>[r.contextG.children.length,r.contextG.children.reduce((n,g)=>n+g.children.reduce((n,m)=>n+m.count,0),0)];
const count=counts();r.rebuildStatic();assert.deepEqual(counts(),count,'context does not accumulate');
assert.equal(JSON.stringify(sim.s),saved);
assert.ok(r.contextG.children.length <= 5,'mixed fixture uses at most ten instanced context draws, independent of unit count');
// Keep unchanged floor-numbering/save/visual source byte-identical to the numbering parent.
// Simulation includes intentional maintenance, upgrades and entrance-route changes through d84fb59.
// Reconstruct the approved automatic-opening successor from that exact baseline so unrelated simulation drift still fails.
import {execFileSync} from 'node:child_process';
assert.equal(readFileSync('js/unitnumbering.js','utf8'),execFileSync('git',['show','1339648652cf61bfce23a96a60cbb54a7006c32a:js/unitnumbering.js'],{encoding:'utf8'}));
// Declared office fit-out: only OpenHousePresentation.office() differs from the baseline; every byte before and after it is pinned.
{const cut=t=>{const a=t.indexOf('  office(o) {'),b=t.indexOf('  update() {');assert.ok(a>0&&b>a,'office() and update() markers exist');return [t.slice(0,a),t.slice(b)];};
const [basePre,basePost]=cut(execFileSync('git',['show','1339648652cf61bfce23a96a60cbb54a7006c32a:js/openhouse.js'],{encoding:'utf8'})),[pre,post]=cut(readFileSync('js/openhouse.js','utf8'));
const wallDispatch = `      if (o.staffDoor && nx === o.staffDoor.dir[0] && nz === o.staffDoor.dir[1]) {
        this.staffDoorWall(o, H, material, nx, nz, x, z, w, d);
        continue;
      }
`;
assert.ok(pre.includes(wallDispatch));assert.equal(pre.replace(wallDispatch,''),basePre);assert.equal(post,basePost);}
let expectedVertical=execFileSync('git',['show','1339648652cf61bfce23a96a60cbb54a7006c32a:js/vertical.js'],{encoding:'utf8'});
const oldVertical="warning:!fitout?'Structure only; fit-out and commissioning are still required.': 'Copies the existing interior layout and product mix. Commission units after construction; rentals are not guaranteed.'";
const newVertical="warning:!fitout?'Structure only; fit-out and readiness requirements are still required.': 'Copies the existing interior layout and product mix. Eligible units open automatically after construction; rentals are not guaranteed.'";
assert.ok(expectedVertical.includes(oldVertical),'declared vertical.js baseline hunk exists');expectedVertical=expectedVertical.replace(oldVertical,newVertical);
// Preserve the original vertical source check at the parent of the staff-routing change.
const verticalAt = sha => execFileSync('git', ['show', sha + ':js/vertical.js'], {encoding:'utf8'});
const routingCommit = '17eb2a3b292820d67dc6688595b259aaf33a1253';
assert.equal(verticalAt(routingCommit + '^'), expectedVertical);
// GV-01 declared hunk: sweep-v1 boarding also records el.lastBoardT for the elevator-wait goal; every other byte stays pinned.
const gv01Old='el.avgWait=(el.avgWait||0)*.85+a.elevWaited*.15;sim.wear',gv01New='el.avgWait=(el.avgWait||0)*.85+a.elevWaited*.15;el.lastBoardT=s.t;sim.wear';
const routedVertical=verticalAt(routingCommit);assert.equal(routedVertical.split(gv01Old).length,2,'declared GV-01 vertical.js hunk exists once');
// PI-01C declared hunks: observational build records beside the existing commit charge and cancellation; every other byte stays pinned.
const pi01c=[["import { numberCapacity, reserveNumbers, nameUnit } from './unitnumbering.js';\n","import { numberCapacity, reserveNumbers, nameUnit } from './unitnumbering.js';\nimport { recordUnitBuild, dropUnitBuild } from './investmentresults.js';\n"],
 ["sim.money(-R.cost,'capex',ord.label);s.orders.push(ord);s.lastCommit","sim.money(-R.cost,'capex',ord.label);s.orders.push(ord);recordUnitBuild(sim,ord,R.unitCreates.length>0);s.lastCommit"],
 ["ord.st='cancelled';ord.prog=1;sim.markDirty();return{ok:true,refund,","ord.st='cancelled';ord.prog=1;dropUnitBuild(sim,ord);sim.markDirty();return{ok:true,refund,"]];
let pinnedVertical=routedVertical.replace(gv01Old,gv01New);
for(const [a,b] of pi01c){assert.equal(pinnedVertical.split(a).length,2,'declared PI-01C vertical.js hunk exists once');pinnedVertical=pinnedVertical.replace(a,b);}
assert.equal(readFileSync('js/vertical.js','utf8'), pinnedVertical);
// The exact d84fb59 simulation reconstruction moved to tfloor_context_sim_d84fb59.mjs (historical profile):
// that commit is not in the repository. Behavior replacing it, on current production simulation:
// eligible units open automatically in every mode, and the readiness text says "operating", not "commissioned".
for(const mode of ['tutorial','sandbox','scenario']){const t=new Sim(structuredClone(full.s));t.s.mode=mode;if(mode==='tutorial')t.s.tut={on:true,beat:1,flags:{},done:false};assert.equal(t.autoOpenEnabled(),true,'automatic opening in '+mode);}
{const t=new Sim(structuredClone(full.s));for(const u of t.objs('unit'))u.cstate='ready';const why=t.openingIssues();assert.ok(why.includes('No operating rent-ready units'),JSON.stringify(why));assert.ok(!why.some(x=>/commissioned/i.test(x)),JSON.stringify(why));}
// Fast-reserve intentionally changed main's clock dispatch. Preserve its exact verified implementation.
// Historical guard, read from the declared chain head (later declared main.js work: double-tap, release guard).
let actualMain=atHistoricalChainHead(()=>durableBaseline('js/main.js'));
// Permit only the exact paused-autosave hooks; retain the complete-file comparison.
assert.equal(actualMain.split('    this.autosavePaused();\n').length-1,3);
actualMain=actualMain.replaceAll('    this.autosavePaused();\n','');
const pausedHook=`  // Paused actions cannot wait for the running-time timer or an unload event.
  // Reuse the synchronous leaving path, including its stale-compression fence.
  autosavePaused() {
    if (this.sim?.s.speed === 0) return this.autosave(true);
  },
`;
assert.ok(actualMain.includes(pausedHook));actualMain=actualMain.replace(pausedHook,'');
actualMain=actualMain.replace('  // autosave: during active play (including Pause); `hide` writes locally synchronously and uses a keepalive request','  // autosave: whenever a game is running (not on the title screen); `hide` uses a keepalive request');
assert.equal(actualMain,execFileSync('git',['show','3c92a5eb6a8d906264e9019e26fa24a100bffb31:js/main.js'],{encoding:'utf8'}));
console.log('PASS mixed-height context across Exterior/F1/F2/F3, four rotations, active-floor picking/inspection, camera preservation, repeated rebuild and byte-identical complete state');
console.log('LIMIT: CPU scene graph + UI handler checks; WebGL pixels, Safari and physical iPhone not tested.');
