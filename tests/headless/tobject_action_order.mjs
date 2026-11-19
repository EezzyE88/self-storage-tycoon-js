// Phase 1 object-sheet action order (native; rendered qualification is separate).
// Status first, everyday fixes, hand-offs, hire offers; removal last in a closed More… section after the body.
import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
let n=0;const test=(name,f)=>{f();console.log('PASS '+name);n++;};
function fixture(){const sim=makeMaple(15);sim.s.speed=0;const ui=Object.create(UI.prototype);ui.g={sim,audio:{unlock(){}},rend:{view:0,setSelection(){}}};ui.title=false;ui.sfx=()=>{};ui.toast=()=>{};ui.root={querySelectorAll:()=>[]};return{ui,sim};}
const at=(h,re)=>{const m=h.match(re);return m?m.index:-1;};
const parts=h=>{const body=h.indexOf('<div class="body">'),rail=h.indexOf('class="dock-actions"'),status=h.indexOf('object-status'),more=h.indexOf('data-more-actions');return{body,rail,status,more,head:h.slice(0,body),tail:more>=0?h.slice(more):''};};
const btns=h=>(h.match(/<button\b[^>]*>[\s\S]*?<\/button>/g)||[]).map(b=>b.replace(/\s+/g,' '));
test('rail orders fixes, then hand-offs, then hire offers; only the hire offer loses pri',()=>{const {ui}=fixture();ui.sel=null;
 const owner=`<button class="btn" data-a="cmd" data-cmd='{"type":"ownerTask","task":1,"forceOwner":true}'>Send Owner · 1h</button>`,vendor=`<button class="btn" data-a="cmd" data-cmd='{"type":"callVendor","task":1}'>Call vendor</button>`,hire=`<button class="btn pri" data-a="staffHelp" data-v="tech">Review Tech hire · $20.00/day</button>`,other='<button class="btn" data-a="x">Info</button>';
 ui.sel=99999;ui.removalActions=()=>'';const h=ui.sheet('Entrance Gate','Keypad access',hire+vendor+other+owner);const p=parts(h),rail=h.slice(p.rail,p.body);
 assert.ok(at(rail,/ownerTask/)<at(rail,/callVendor/)&&at(rail,/callVendor/)<at(rail,/staffHelp/),'fix < hand-off < offer');
 assert.match(rail,/class="btn" data-a="staffHelp"/);assert.doesNotMatch(rail,/data-a="x"/);assert.match(h.slice(p.body),/data-a="x">Info/);});
test('status precedes actions on object sheets; tab sheets keep their summary in the body',()=>{const {ui,sim}=fixture();const u=sim.objs('unit').find(u=>u.commercial==='occupied');ui.sel=u.id;ui.sheetTall=false;
 const h=ui.inspector(),p=parts(h);assert.ok(p.status>0&&p.status<p.body,'status before body');assert.ok(p.rail<0||p.status<p.rail,'status before rail');assert.match(h.slice(p.status,p.body),/Occupied/);
 ui.sel=null;const t=ui.sheet('Operate','', '<h3>Staff</h3>x');assert.doesNotMatch(t,/object-status|data-more-actions/);assert.ok(t.indexOf('class="dock-summary"')>t.indexOf('<div class="body">'));});
test('every removal control sits only in a closed More… after the body, with the same buttons as removalActions',()=>{const {ui,sim}=fixture();
 for(const o of [sim.objs('unit').find(u=>u.lease),sim.objs('unit').find(u=>!u.lease),sim.objs('light')[0],sim.objs('door')[0],sim.objs('corral')[0],sim.objs('shell')[0],sim.objs('office')[0]].filter(Boolean)){ui.sel=o.id;for(const tall of [false,true]){ui.sheetTall=tall;
  const expect=btns(ui.removalActions());const h=ui.inspector(),p=parts(h);assert.ok(expect.length,'removable '+o.type);assert.ok(p.more>p.body,o.type+' More after body');
  assert.match(p.tail,/^data-more-actions="true"><summary>More…<\/summary>/);assert.doesNotMatch(h,/<details class="more-actions"[^>]* open/);
  assert.deepEqual(btns(p.tail),expect,o.type+' same removal buttons');assert.doesNotMatch(p.head,/data-a="remove(?:Object|Cart|Keypad|Floor)"|gateRemove/,o.type+' no removal before body');}}});
test('gate review and sheets without removal: gate review in More…, dirt has none',()=>{const {ui,sim}=fixture();const g=sim.objs('gate')[0];ui.sel=g.id;ui.sheetTall=false;const h=ui.inspector(),p=parts(h);
 assert.match(p.tail,/data-a="gateRemove"/);assert.doesNotMatch(p.head,/gateRemove/);ui.sel={kind:'dirt',f:0,x:10,y:10};assert.doesNotMatch(ui.inspector(),/data-more-actions/);});
test('More… open state survives the background refresh of the same sheet only',()=>{const {ui,sim}=fixture();const u=sim.objs('unit').find(u=>u.lease);ui.sel=u.id;ui.sheetTall=false;ui.syncFeedbackProperty=()=>{};ui.pauseForPopup=()=>{};ui.resumePopup=()=>{};ui.drawChart=()=>{};
 const more={open:false},box={innerHTML:'',firstChild:{classList:{add(){}}},querySelector:s=>s==='[data-more-actions]'?more:null,querySelectorAll:()=>[]};ui.$=()=>box;
 ui.renderSheet(true);assert.equal(more.open,false);more.open=true;ui.renderSheet(true);assert.equal(more.open,true,'kept on refresh');ui.sel=sim.objs('light')[0].id;ui.renderSheet(true);assert.equal(more.open,false,'closed on a different sheet');});
console.log(`ALL PASS: ${n} object action order groups`);
