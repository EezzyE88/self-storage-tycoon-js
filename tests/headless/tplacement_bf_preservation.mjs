import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {Sim} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
const parent=path.resolve(process.argv[2]);
const {Sim:ParentSim}=await import(pathToFileURL(path.join(parent,'js/sim.js')));
const {UI:ParentUI}=await import(pathToFileURL(path.join(parent,'js/ui.js')));
const text=(dir,file)=>readFileSync(path.join(dir,file),'utf8');
let files=0;
for(const dir of ['js','css','vendor'])for(const entry of readdirSync(dir,{withFileTypes:true})) {
  if(!entry.isFile())continue;
  const file=dir+'/'+entry.name;if(['js/sim.js','js/ui.js'].includes(file))continue;
  assert.deepEqual(readFileSync(file),readFileSync(path.join(parent,file)),file);files++;
}
for(const file of ['index.html','manifest.webmanifest','icon-180.png','icon-512.png']){assert.deepEqual(readFileSync(file),readFileSync(path.join(parent,file)));files++;}
assert.equal(text('.','js/sim.js').replace(Sim.prototype.planUnits.toString(),'[UNIT PLANNING]'),text(parent,'js/sim.js').replace(ParentSim.prototype.planUnits.toString(),'[UNIT PLANNING]'));
console.log('PASS simulation is byte-identical outside unit footprint planning; readiness, construction, automatic opening and economics unchanged');
for(const name of Object.getOwnPropertyNames(ParentUI.prototype)) {
  if(['constructor','onClick','rotateBuild','renderActionBar'].includes(name))continue;
  const a=Object.getOwnPropertyDescriptor(UI.prototype,name),b=Object.getOwnPropertyDescriptor(ParentUI.prototype,name);
  for(const key of ['value','get','set'])if(typeof b[key]==='function')assert.equal(a[key].toString(),b[key].toString(),name);
}
const snapCase="      case 'snapPlacement': { const n=this.nearestValidPlacement(); if(n){ this.buildRotation=n.rotation; this.planArgs={a:n.a,b:n.b}; this.replan(); } break; }\n";
assert.equal(UI.prototype.onClick.toString().replace(snapCase,''),ParentUI.prototype.onClick.toString());
const normalize=(src,klass)=>{
  for(const method of ['onClick','rotateBuild','renderActionBar','nearestValidPlacement'])if(klass.prototype[method])src=src.replace(klass.prototype[method].toString(),method==='nearestValidPlacement'?'':`[${method}]`);
  return src.replace("const NO_AISLE = 'Door faces no drive aisle yet';\n",'').replace('  // Find a nearby buildable footprint, retaining unit count and all readiness requirements.\n  \n','');
};
assert.equal(normalize(text('.','js/ui.js'),UI),normalize(text(parent,'js/ui.js'),ParentUI));
console.log('PASS other UI methods and all remaining module text unchanged, including Pause, acquisition/borrowing reviews, compact P02 labels and saves');
assert.ok(!text('.','js/ui.js').includes('showCommissionCard'));
assert.ok(!text('.','js/ui.js').includes('toolResume'));
console.log(`PASS ${files} other production files byte-identical; A/C/D/E/G excluded`);
