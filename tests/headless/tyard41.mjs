import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
// Exercise the production camera methods without constructing WebGL or resolving browser import maps.
const source=readFileSync(new URL('../../js/render.js',import.meta.url),'utf8');
const face=new Function(source.match(/faceYardExtension\(\) \{([\s\S]*?)\n  \}/)[1]);
const rotate=new Function('dir',source.match(/rotate\(dir\) \{([^}]+)\}/)[1]);
let calls=0; const r={rot:3,targetAz:7*Math.PI/4,azimuth:7*Math.PI/4,zoom:1.7,center:{x:11,z:3},updateCamera(){calls++}};
face.call(r);
assert.equal(r.rot,0);assert.ok(Math.abs(Math.sin(r.azimuth)-Math.SQRT1_2)<1e-10);assert.equal(r.azimuth,r.targetAz);assert.equal(r.zoom,1.7);assert.deepEqual(r.center,{x:11,z:3});assert.equal(calls,1);
rotate.call(r,1);assert.equal(r.rot,1);assert.ok(Math.abs(r.targetAz-r.azimuth-Math.PI/2)<1e-10);
const uiSource=readFileSync(new URL('../../js/ui.js',import.meta.url),'utf8');
const initial=uiSource.slice(uiSource.indexOf('  previewYardInfill(key)'),uiSource.indexOf('  yardInfillHtml()'));
const returning=uiSource.slice(uiSource.indexOf('  returnGrowthProposal()'),uiSource.indexOf('  previewYardInfill(key)'));
assert.match(initial,/faceYardExtension/);assert.doesNotMatch(returning,/faceYardExtension/);
const css=readFileSync(new URL('../../css/game.css',import.meta.url),'utf8');assert.match(css, /\.yard-choice \.grow > small \{ display:block; margin-top:6px;/);
console.log('PASS door-side orientation, manual rotation, unchanged zoom/center, initial-only framing and separate card lines');

import {UI} from '../../js/ui.js';
import {Sim} from '../../js/sim.js';
import {gunzipSync} from 'node:zlib';
function ui(sm){const u=Object.create(UI.prototype);u.g={sim:sm,audio:{play(){}}};u.g.rend={view:0,setView(v){this.view=v},setPreview(){},setOverlay(){},setSelection(){},lookAt(x,y){this.look=[x,y]}};u.root={querySelector(){return null},querySelectorAll(){return []},classList:{add(){},remove(){},toggle(){}}};const els={};u.$=id=>els[id]||={innerHTML:'',querySelector(){return null},classList:{add(){}}};u.title=false;u.toasts=[];u.renderSheet=()=>{};u.renderActionBar=()=>{};u.renderTut=()=>{};u.syncFloorUi=()=>{};u.toast=()=>{};return u;}

const code=readFileSync(new URL('../fixtures/candidate40/06-investment.sst',import.meta.url),'utf8').trim();
const raw=JSON.parse(gunzipSync(Buffer.from(code.slice(5),'base64')));const sm=new Sim(raw.company?raw.props[raw.active].s:raw);const u=ui(sm);
u.rend.rot=3;u.rend.targetAz=7*Math.PI/4;u.rend.azimuth=u.rend.targetAz;u.rend.zoom=1.7;u.rend.updateCamera=()=>{};u.rend.faceYardExtension=()=>face.call(u.rend);
const before=JSON.stringify(sm.s);u.previewYardInfill('one-10');assert.equal(u.rend.rot,0);assert.equal(u.rend.zoom,1.7);assert.equal(JSON.stringify(sm.s),before);
rotate.call(u.rend,1);const angle=u.rend.targetAz;u.setTab('growth');u.returnGrowthProposal();assert.equal(u.rend.targetAz,angle);assert.equal(u.rend.rot,1);assert.equal(u.plan.cost,620);assert.ok(u.yardGuide);assert.equal(JSON.stringify(sm.s),before);
console.log('PASS actual UI preview sets door-side view once; Growth return preserves manual angle, plan, guide and simulation');
