// Successor of universal Remove 1d99800: D1 host-first selection, D2 reachable idle-cart disposal,
// player-facing labels/descriptions and kept success feedback. Native simulation + production UI methods;
// no rendered-browser or Safari claim (rendered qualification is separate).
import assert from 'node:assert/strict';
import {fixture,click} from './transaction-fixture.mjs';
import {makeSandbox} from '../../js/scenarios.js';
let groups=0;const test=(n,fn)=>{fn();groups++;console.log('PASS '+n);};
const fresh=()=>makeSandbox({kind:'business',start:'empty',cash:500000,instant:true,tiers:'all'});
const build=(s,tool,x,y,b={x,y},extra={})=>{const a={tool,a:{x,y},b,f:0,...extra};const p=s.plan(a);const r=s.dispatch({type:'build',...a,upgradeStamp:p.upgradeStamp});assert.ok(r.ok,r.msg);return s.s.orders.find(q=>q.id===r.order).objs.map(id=>s.s.objects[id]);};
const RAW=/\b(unitLight|shell|surface) #|#null|\bF\d structure\b/;
function ui(sim){const f=fixture(0);f.g.sim=sim;f.ui.select=function(v){this.sel=v;};f.g.rend.view=0;return f;}
test('D1: tapping a lit unit selects the unit; mounted fixtures stay reachable from its panel',()=>{
 const s=fresh();build(s,'aisle',22,16,{x:30,y:16});const objs=build(s,'du5x5',25,15,undefined,{rotation:0,lighting:'both'});const u=objs.find(o=>o.type==='unit');
 assert.ok(objs.some(o=>o.type==='unitLight'&&o.mount?.host===u.id),'interior light mounted');
 const f=ui(s);for(const view of ['ext',0]){f.g.rend.view=view;assert.equal(f.ui.pickAt({x:u.x,y:u.y}),u.id,`view ${view}`);}
 f.ui.sel=u.id;const html=f.ui.removalActions();assert.match(html,/Remove unit…/);assert.doesNotMatch(html,/unitLight/);
 // UL-3: each mounted fixture's Remove… (same removeObject review) moved onto its row in the unit's equipment list.
 const sheet=f.ui.objSheet(u,s.objName(u));for(const m of Object.values(s.s.objects).filter(o=>o.mount?.host===u.id)){assert.match(sheet,new RegExp(`data-a="removeObject" data-v="${m.id}" aria-label="Remove (interior|wall) light #${m.id}">Remove…`));assert.doesNotMatch(html,new RegExp(`data-v="${m.id}"`));}
 assert.doesNotMatch(sheet,/unitLight/);
 const light=build(s,'light',28,18)[0];assert.equal(f.ui.pickAt({x:28,y:18}),light.id,'standalone light still selectable');
});
test('D2: each idle cart in a corral is disposable from the corral panel; in-use carts are not offered; no reassignment',()=>{
 const s=fresh();build(s,'walk',25,15);const c=build(s,'corral',25,15)[0];assert.ok(s.dispatch({type:'buyCarts',corral:c.id,n:2}).ok);
 const f=ui(s);f.ui.sel=c.id;let html=f.ui.removalActions();const ids=s.s.carts.map(x=>x.id);
 for(const id of ids)assert.match(html,new RegExp(`data-a="removeCart" data-v="${id}">Dispose of idle cart #${id}…`));
 const q=s.placeableRemoval(c.id);assert.equal(q.classification,'blocked');assert.match(q.prerequisites[0],/Cart corral #\d+ still has 2 carts\. Dispose of each idle cart from this corral’s panel first\. Carts are never moved automatically\./);
 s.s.agents.push({id:9999,kind:'staff',cart:ids[0],f:0,x:1,y:1});html=f.ui.removalActions();assert.doesNotMatch(html,new RegExp(`data-v="${ids[0]}">Dispose`));assert.match(html,new RegExp(`data-v="${ids[1]}">Dispose`));s.s.agents.pop();
 // production review/confirm path for one cart returns to the corral panel; other cart untouched
 const before=JSON.stringify(s.s.carts.find(x=>x.id===ids[1]));f.g.rend.setPreview=()=>{};f.g.rend.view=0;f.ui.syncFloorUi=()=>{};f.ui.validView=v=>v;
 click(f,'removeCart',String(ids[0]));assert.match(f.ui.$('modal').innerHTML,/Dispose|Cart #/);click(f,'removeConfirm');
 assert.ok(!s.s.carts.some(x=>x.id===ids[0]));assert.equal(JSON.stringify(s.s.carts.find(x=>x.id===ids[1])),before,'no reassignment');assert.equal(f.ui.sel,c.id,'returns to corral panel');assert.match(f.ui.lastToast,/Cart #\d+ removed\./);
});
test('labels and descriptions are player-facing and truthful',()=>{
 const s=fresh();const b=build(s,'shell2',10,2,{x:19,y:12})[0];for(let f=0;f<2;f++)build(s,'hall',10,2,{x:10,y:12},{f});build(s,'iu5x5',11,4,{x:11,y:6},{rotation:3});
 const q=s.placeableRemoval(b.id);assert.equal(q.name,`Building #${b.id}`);for(const t of [...q.charges.map(c=>c.label),...q.effects,q.name])assert.doesNotMatch(t,RAW,t);assert.ok(q.charges.some(c=>c.label===`Building #${b.id} Floor 2 structure (halls included)`));
 const g=fresh();build(g,'aisle',22,16,{x:30,y:16});build(g,'loading',24,16,{x:26,y:16});build(g,'walk',22,20,{x:24,y:20});
 const ql=g.placeableRemoval({kind:'surface',x:25,y:16,f:0,layer:'ground'});assert.equal(ql.name,'Loading zone cell (25, 16) · Floor 1');assert.match(ql.effects.join(' '),/to plain drive aisle/);
 const qw=g.placeableRemoval({kind:'surface',x:23,y:20,f:0,layer:'ground'});assert.equal(qw.name,'Walkway cell (23, 20) · Floor 1');assert.match(qw.effects.join(' '),/to grass/);
 const objs=build(g,'du5x5',25,15,undefined,{rotation:0,lighting:'interior'}),il=objs.find(o=>o.type==='unitLight'),u=objs.find(o=>o.type==='unit');
 const qi=g.placeableRemoval(il.id);assert.equal(qi.name,`Interior light #${il.id}`);assert.doesNotMatch(qi.effects.join(' '),/Also removes/);assert.match(qi.effects.join(' '),new RegExp(`Removes Interior light #${il.id} from Unit ${u.num}; the unit stays`));
 const qu=g.placeableRemoval(u.id);assert.match(qu.effects.join(' '),/Removes one vacant unit/);assert.match(qu.effects.join(' '),/Also removes attached interior light/);
 u.lease=999;g.markDirty();g.ensure();const qo=g.placeableRemoval(u.id);assert.equal(qo.classification,'blocked');assert.doesNotMatch(qo.effects.join(' '),/vacant/);assert.match(qo.effects.join(' '),/currently occupied or reserved/);
});
test('blocked review leads with what must happen first; success feedback names the asset and is kept beside autosave',()=>{
 const f=fixture(0),{ui,A}=f;A.markDirty();A.ensure();f.g.rend.setPreview=()=>{};f.g.rend.view=0;ui.syncFloorUi=()=>{};ui.validView=v=>v;ui.select=function(v){this.sel=v;};
 const leased=A.objs('unit').find(u=>u.lease);click(f,'removeObject',String(leased.id));const html=ui.$('modal').innerHTML;
 assert.ok(html.indexOf('Can’t remove yet')>-1&&html.indexOf('Can’t remove yet')<html.indexOf('Would remove'),'blocker shown before consequences');assert.match(html,/removeConfirm" disabled/);assert.doesNotMatch(html,/provisional|private candidate/i,'release review carries no candidate-only notice');click(f,'modalClose');
 let kept=null;ui.toast=(t,k,keep)=>{ui.lastToast=t;kept=keep;};const light=A.objs('light').find(l=>!l.mount);click(f,'removeObject',String(light.id));click(f,'removeConfirm');
 assert.ok(!A.s.objects[light.id]);assert.equal(ui.lastToast,`Light #${light.id} removed · $100.`);assert.equal(kept,true,'kept toast survives the Progress saved toast');assert.equal(A.s.speed,0);
});
console.log(`ALL PASS: ${groups} Remove successor groups`);
