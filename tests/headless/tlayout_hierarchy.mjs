import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
import {UI} from '../../js/ui.js';
const Renderer=await loadRenderer(), Previous=await loadRenderer('54d432f');
const sim=makeMaple(19), saved=JSON.stringify(sim.s), canvas={clientWidth:393,clientHeight:720};
const r=new Renderer(canvas,sim), old=new Previous(canvas,sim), rect={left:8,right:385,top:160,bottom:645};
r.fitProperty(rect);old.fitProperty(rect);assert.ok(r.zoom>old.zoom*1.05,`overview must be measurably tighter: ${r.zoom}/${old.zoom}`);
for(const rot of [0,1,2,3]) {r.rot=rot;r.azimuth=Math.PI/4+rot*Math.PI/2;r.updateCamera();r.fitProperty(rect);for(const o of Object.values(sim.s.objects))for(const x of [o.x,o.x+(o.w||1)])for(const y of [o.y,o.y+(o.h||1)]){const p=r.project(x,y,0);assert.ok(p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom);}}
assert.equal(JSON.stringify(sim.s),saved);
const ui=Object.create(UI.prototype);let cameraOpen=true;const classes=new Set(['has-coach']);const coach={hidden:false};ui.g={sim};ui.$=()=>coach;ui.root={querySelector:()=>cameraOpen?{}:null,classList:{contains:()=>false,remove:c=>classes.delete(c)}};ui.renderCoach();assert.equal(coach.hidden,true);assert.equal(classes.has('has-coach'),false);
assert.equal(ui.coachLabel('Nearly full: 26/27 leased · 1 rent-ready vacancy. Check asking rents before expanding.'),'1 vacant · Review demand & rents →');assert.equal(ui.coachLabel('Gate Keypad needs repair. Tech shift is 7 AM—8 PM.'),'Gate Keypad · Repair');
ui.sheetTall=false;ui.sel=null;ui.g={sim,company:{props:[{}]}};const html=ui.sheet('Business','', '<h3>Asking rents</h3><button data-a="rent">Adjust rent</button><h3>Financing</h3>');assert.match(html,/select data-section-picker/);assert.match(html,/<option value="Asking rents">Pricing<\/option>/);assert.match(html,/Adjust rent/);
let jump;ui.renderSheet=()=>{};ui.jumpSection=v=>jump=v;ui.onInput({target:{dataset:{sectionPicker:'true'},value:'Asking rents'}});assert.equal(jump,'Asking rents');assert.equal(ui.sheetTall,true);
const finances=ui.financialHtml();assert.ok(finances.indexOf('Scheduled next 30 days')>finances.indexOf('</details>'));assert.match(finances,/payment risk/);
const source=readFileSync('js/ui.js','utf8');assert.match(source,/<summary>Audio &amp; performance<\/summary>/);assert.match(source,/data-a="saveCode"/);assert.match(source,/data-a="saveFile"/);
const css=readFileSync('css/game.css','utf8');assert.match(css,/:has\(\.viewctl.open\) #coach/);assert.match(css,/#ui \.section-picker \{ display:flex/);
console.log('PASS tighter read-only framing, occupied footprint containment, camera suppression, compact advice, complete section chooser and retained save actions');
