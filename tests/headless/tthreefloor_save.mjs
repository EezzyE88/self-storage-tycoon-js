import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {base,full} from './tthreefloor.mjs';
import {Sim,fmtTime} from '../../js/sim.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H} from '../../js/data.js';
import {modeLabel,sandboxName} from '../../js/scenarios.js';
import {UI} from '../../js/ui.js';
import {tickVertical} from '../../js/vertical.js';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
const main=readFileSync('js/main.js','utf8');const context=vm.createContext({Sim,Audio:class{},fmtTime,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,BUILD:{name:'test'},localsave:{ok:true},cloud:{ok:false},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent,performance,console:{warn(){}}});
vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+';globalThis.game=game;',context);const g=context.game;g.ui={title:false};g.attach=function(s){this.sim=s;};
function session(sim){g.sim=new Sim(JSON.parse(JSON.stringify(sim.s)));g.company={props:[{name:'Original',sim:g.sim}],active:0,feed:[]};}
for(const fixture of [base,full]){session(fixture);const expected=JSON.parse(g.saveJSON());for(const code of [g.rawSaveCode(g.saveJSON()),await g.saveCode()]){assert.equal(await g.loadCode(code),true);assert.equal(g.sim.s.speed,0);assert.equal(g.sim.s.cash,expected.cash);assert.equal(JSON.stringify(g.sim.s.hall),JSON.stringify(expected.hall));assert.equal(JSON.stringify(g.sim.s.objects),JSON.stringify(expected.objects));}}
console.log('PASS actual SST0/SST1 export/load preserves F2/F3 objects, layers, charges and paused load');
session(base);let R=g.sim.verticalPlan(g.sim.objs('shell')[0].id);g.sim.dispatch({type:'verticalUpgrade',...R});for(let i=0;i<900;i++){g.sim.s.t++;tickVertical(g.sim,g.sim.s.orders.at(-1));g.sim.ensure();}const progress=JSON.stringify(g.sim.s.orders);assert.equal(await g.loadCode(await g.saveCode()),true);assert.equal(JSON.stringify(g.sim.s.orders),progress);
console.log('PASS actual save/load retains construction phase, elapsed ticks and paid package');
for(const mutate of [s=>s.floorModelVersion=2,s=>s.hall.push([]),s=>s.objects[Object.values(s.objects).find(o=>o.type==='elevator').id].servedFloors=[0,1,5],s=>s.agents.push({id:1,f:5}),s=>s.dirt[2][0]=null,s=>s.objects[Object.values(s.objects).find(o=>o.type==='shell').id].plannedMaxFloors=6]){session(full);const old=g.company,s=JSON.parse(g.saveJSON());mutate(s);assert.equal(await g.loadCode(JSON.stringify({company:1,active:0,props:[{name:'Good',s:base.s},{name:'Bad',s}]})),false);assert.equal(g.company,old);}
console.log('PASS malformed height/version/layers/floors rejected atomically across portfolio');
const u=Object.create(UI.prototype),sim=new Sim(JSON.parse(JSON.stringify(full.s)));u.g={sim};u.popupBlocks=new Set(['modal']);u.do=a=>sim.dispatch(a);u.resumePopup('modal');assert.equal(sim.s.speed,1);
console.log('PASS intentional 1x popup resume preserved');
const Renderer=await loadRenderer(),r=new Renderer({clientWidth:393,clientHeight:720},sim);r.rebuildStatic();const before=JSON.stringify(sim.s);for(let f=0;f<3;f++){r.setView(f);assert.equal(r.floorY(),f*FLOOR_H);assert.ok(r.staticG.children.filter(m=>m.userData.f!=null&&(m.userData.fl??m.userData.f)!==f&&!m.userData.shellWall&&!m.userData.roof&&!m.userData.cab).every(m=>!m.visible));}assert.equal(JSON.stringify(sim.s),before);
console.log('PASS three-floor cutaway/selected-floor plane under renderer stubs; Safari visual acceptance pending');
