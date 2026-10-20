import assert from 'node:assert/strict';
import fs from 'node:fs';

const css=fs.readFileSync('css/game.css','utf8').replace(/\/\*[\s\S]*?\*\//g,'');
const ui=fs.readFileSync('js/ui.js','utf8');
assert.match(ui,/class="rescue-bridge reserve-wait-bridge"[^\n]*<div class="row"><button[^\n]*reserveReview[^\n]*reserveResume/,'production review/resume controls remain in the scoped action row');
assert.match(ui,/class="rescue-bridge reserve-wait-bridge"[^\n]*<div class="row">[^\n]*data-a="reserveStop"/,'End wait shares the repaired row');
// Relevant selectors for the production minimized Comeback -> wait bridge -> row.
// Resolve display by specificity and source order, not just presence of flex-wrap.
const hide='.tut.min .row';
const fix='#ui .tut.comeback.min .reserve-wait-bridge > .row';
const selectors=new Set(['.row','.tut .row',hide,'.reserve-wait-bridge .row',fix]);
const rules=[];
for(const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)){
  for(const selector of match[1].split(',').map(s=>s.trim())){
    if(!selectors.has(selector))continue;
    for(const declaration of match[2].split(';')){
      const d=declaration.trim().match(/^display\s*:\s*([^!]+?)(\s*!important)?$/);
      if(d)rules.push({selector,value:d[1].trim(),weight:[!!d[2],(selector.match(/#/g)||[]).length,(selector.match(/\./g)||[]).length],order:rules.length});
    }
  }
}
function display(list){
  return [...list].sort((a,b)=>{
    for(let i=0;i<3;i++)if(a.weight[i]!==b.weight[i])return Number(a.weight[i])-Number(b.weight[i]);
    return a.order-b.order;
  }).at(-1)?.value;
}
assert.ok(rules.some(r=>r.selector===hide&&r.value==='none'),'exercise the actual minimized-panel hide rule');
assert.equal(display(rules.filter(r=>r.selector!==fix)),'none','without the scoped repair the action row is hidden');
assert.equal(display(rules),'flex','minimized wait actions must override the inherited hide rule');
assert.equal(display(rules.filter(r=>!r.selector.includes('reserve-wait-bridge'))),'none','ordinary minimized tutorial rows stay hidden');
assert.match(css,/\.reserve-wait-bridge \.row\s*\{[^}]*flex-wrap\s*:\s*wrap/);
console.log('PASS scoped wait action display wins the minimized-panel CSS cascade; ordinary minimized rows remain hidden');
