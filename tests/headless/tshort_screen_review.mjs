// Production review quoting with controlled fixtures; geometry is checked separately in Chromium.
import assert from 'node:assert/strict';
import {UI} from '../../js/ui.js';
import {makeSandbox} from '../../js/scenarios.js';
const money = (n, decimals=false) => (n < 0 ? '-$' : '$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: decimals ? 2 : 0, maximumFractionDigits: decimals ? 2 : 0 });
function fixture(cash=100000) {
 const sim=makeSandbox({start:'starter',cash});sim.s.speed=0;
 const ui=Object.create(UI.prototype),box={innerHTML:'',firstChild:null};
 ui.g={sim,rend:{view:'ext',setPreview(){}},audio:{unlock(){}}};ui.$=()=>box;
 ui.root={querySelector:()=>null};ui.title=false;ui.tool='du5x10';ui.buildRotation=2;
 ui.currentBlueprintPlan=()=>null;ui.nearestValidPlacement=()=>null;ui.canRush=()=>true;
 ui.plan=sim.plan({tool:'du5x10',a:{x:10,y:3},b:{x:14,y:3},rotation:2,f:0});
 return {sim,ui,box};
}
for(const cash of [100000,100])for(const rush of [false,true]) {
 const {sim,ui,box}=fixture(cash);ui.rush=rush;
 const cost=rush?Math.round(ui.plan.cost*1.25):ui.plan.cost;
 const daily=sim.planDailyCost(ui.plan),P=sim.financialPosition({spend:cost,extraDaily:daily});
 const saved=JSON.stringify(sim.s);ui.renderActionBar();assert.equal(JSON.stringify(sim.s),saved,'review does not change company/time/Pause');
 const html=box.innerHTML,summary=html.match(/<div class="review-commitment">([\s\S]+?)<\/div>/)?.[1];assert.ok(summary);
 for(const amount of [P.cash,P.committed,P.reserve,P.available])assert.ok(summary.includes(money(amount)),`real quote ${amount} visible in commitment summary`);
 assert.ok(html.includes(money(cost)));assert.ok(summary.includes(money(daily,true)+'/day'));
 assert.equal((html.match(/Cash after build/g)||[]).length,1,'one financial summary, not competing quotes');
 assert.equal(/data-a="confirm" disabled/.test(html),cash<cost,'affordability unchanged');
 console.log(`PASS ${cash<cost?'insufficient':'funded'} ${rush?'rush':'ordinary'}: actual financial quote and read-only review`);
}
console.log('ALL PASS: short-screen review financial parity');
