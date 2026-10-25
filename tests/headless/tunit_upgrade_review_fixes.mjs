import assert from 'node:assert/strict';
import {makeSandbox} from '../../js/scenarios.js';
import {Sim,newState} from '../../js/sim.js';
import {UI} from '../../js/ui.js';
import {G} from '../../js/data.js';
import {nameUnit} from '../../js/unitnumbering.js';
import {mountFor,attachmentCoverage} from '../../js/unitupgrades.js';

const failures=[];
function test(name,fn){try{fn();console.log('PASS '+name);}catch(e){failures.push(name);console.error('FAIL '+name+'\n'+e.stack);}}
function fixture(){const sim=makeSandbox({start:'starter',cash:100000});sim.s.open=false;sim.ensure();return sim;}
function uiFor(sim){
 const boxes={},ui=Object.create(UI.prototype),cls={add(){},remove(){},toggle(){}};
 const el=()=>({innerHTML:'',firstChild:null,classList:cls,querySelector:()=>null,querySelectorAll:()=>[]});
 ui.g={sim,audio:{unlock(){}},rend:{view:'ext',setPreview(R){this.preview=R;},setSelection(){},setView(v){this.view=v;},lookAt(){}}};
 ui.root={classList:cls,querySelectorAll:()=>[]};ui.$=k=>boxes[k]||=el();ui.sfx=()=>{};ui.toast=()=>{};ui.renderSheet=()=>{};ui.renderTut=()=>{};ui.syncFloorUi=()=>{};ui.spendingHtml=()=>'';
 return ui;
}
const args={tool:'du5x10',a:{x:10,y:2},b:{x:14,y:2},f:0};
function preview(ui){ui.pickTool(args.tool);ui.buildRotation=2;ui.planArgs=structuredClone({a:args.a,b:args.b});ui.replan();ui.changeUpgrade('lighting','both');ui.changeUpgrade('outsideCameras',true);}

test('construction camera/light controls preserve independent deselections, including off/on',()=>{
 const s=fixture(),ui=uiFor(s),cash=s.s.cash;preview(ui);
 const light=ui.plan.upgrades.options.find(o=>o.fixture.type==='light').key,cam=ui.plan.upgrades.options.find(o=>o.fixture.type==='camera').key;
 ui.changeUpgrade('excludedFixtures',[light]);assert.equal(ui.plan.upgrades.counts.light,0);
 ui.changeUpgrade('outsideCameras',false);assert.ok(ui.upgradeOptions.excludedFixtures.includes(light));assert.equal(ui.plan.upgrades.counts.light,0);
 ui.changeUpgrade('outsideCameras',true);assert.equal(ui.plan.upgrades.counts.light,0);assert.equal(ui.plan.upgrades.counts.camera,1);
 ui.changeUpgrade('excludedFixtures',[light,cam]);ui.changeUpgrade('lighting','interior');assert.ok(ui.upgradeOptions.excludedFixtures.includes(cam));assert.equal(ui.plan.upgrades.counts.camera,0);
 ui.changeUpgrade('lighting','both');assert.equal(ui.plan.upgrades.counts.light,0);assert.equal(ui.plan.upgrades.counts.camera,0);assert.equal(s.s.cash,cash);assert.equal(s.s.speed,0);assert.equal(s.s.orders.length,0);
});
test('retrofit camera/light controls preserve independent deselections without purchase',()=>{
 const s=fixture(),ui=uiFor(s),u=s.objs('unit').find(u=>u.cstate==='operating'&&!u.lease);ui.beginRetrofit(u.id);ui.changeUpgrade('lighting','both');ui.changeUpgrade('outsideCameras',true);
 const cash=s.s.cash,light=ui.retrofitReview.quote.upgrades.options.find(o=>o.fixture.type==='light').key;
 ui.changeUpgrade('excludedFixtures',[light]);ui.changeUpgrade('outsideCameras',false);assert.equal(ui.retrofitReview.quote.upgrades.counts.light,0);ui.changeUpgrade('outsideCameras',true);assert.equal(ui.retrofitReview.quote.upgrades.counts.light,0);
 const camera=ui.retrofitReview.quote.upgrades.options.find(o=>o.fixture.type==='camera').key;ui.changeUpgrade('excludedFixtures',[light,camera]);ui.changeUpgrade('lighting','interior');assert.equal(ui.retrofitReview.quote.upgrades.counts.camera,0);ui.changeUpgrade('lighting','both');assert.equal(ui.retrofitReview.quote.upgrades.counts.camera,0);
 ui.endRetrofit();assert.equal(s.s.cash,cash);assert.equal(s.s.speed,0);assert.equal(s.s.open,false);assert.ok(!u.retrofitOrder);
});
test('actual Growth navigation restores lighting, cameras and exclusions before requoting',()=>{
 const s=fixture(),ui=uiFor(s);preview(ui);const light=ui.plan.upgrades.options.find(o=>o.fixture.type==='light').key;ui.changeUpgrade('excludedFixtures',[light]);
 const expected=structuredClone(ui.upgradeOptions),cash=s.s.cash;ui.setTab('growth',true);assert.ok(ui.growthProposal);const saved=ui.growthProposal;assert.equal(ui.tool,null);assert.equal(ui.upgradeOptions.lighting,'none');
 assert.equal(ui.returnGrowthProposal(),true);assert.deepEqual(ui.upgradeOptions,expected);assert.equal(ui.plan.args.lighting,expected.lighting);assert.equal(ui.plan.args.outsideCameras,true);assert.deepEqual(ui.plan.args.excludedFixtures,expected.excludedFixtures);assert.equal(s.s.cash,cash);assert.equal(s.s.orders.length,0);assert.equal(s.s.speed,0);assert.equal(s.s.open,false);
 ui.upgradeOptions.excludedFixtures.push('camera:test');assert.ok(!saved.args.excludedFixtures.includes('camera:test'),'restoration must not alias saved arrays');
});

function shadowFixture(standalone=false){
 const sim=new Sim(newState({mode:'sandbox'}));const u={id:sim.id(),type:'unit',x:4,y:8,w:1,h:1,dir:[1,0],f:0,size:'5x5',access:'drive',env:'std',cstate:'operating',commercial:'ready',cond:1};nameUnit(sim.s,u);sim.s.objects[u.id]=u;
 sim.s.ground[sim.idx(5,8)]=G.ASPHALT;sim.s.ground[sim.idx(7,8)]=G.ASPHALT;sim.ensure();
 for(const type of ['light','camera']){const o={...mountFor(sim,u,u.id,type),id:sim.id(),cstate:'operating'};if(standalone)delete o.mount;sim.s.objects[o.id]=o;}
 sim.markDirty();sim.ensure();return sim;
}
const shadowArgs={tool:'du5x5',a:{x:6,y:8},b:{x:6,y:8},rotation:1,f:0,lighting:'outside',outsideCameras:true};
test('new footprint cannot reuse mounted coverage that it will obstruct',()=>{
 const s=shadowFixture(),before=JSON.stringify(s.s);assert.ok(s.D.lit[0][s.idx(7,8)]>=.5);assert.equal(s.D.cam[0][s.idx(7,8)],1);
 const R=s.plan(shadowArgs);assert.equal(JSON.stringify(s.s),before);assert.equal(R.upgrades.counts.light,1);assert.equal(R.upgrades.counts.camera,1);
 const existing=s.objs('light')[0];assert.ok(!attachmentCoverage(s,existing,R.units).some(c=>c.x===7&&c.y===8));
 const deselected=s.plan({...shadowArgs,excludedFixtures:R.upgrades.options.map(o=>o.key)});assert.ok(deselected.upgrades.notices.some(n=>/without lighting/.test(n)));assert.ok(deselected.upgrades.notices.some(n=>/without camera/.test(n)));
 const cash=s.s.cash,r=s.dispatch({type:'build',...shadowArgs,upgradeStamp:R.upgradeStamp});assert.ok(r.ok,r.msg);assert.equal(s.s.cash,cash-R.cost);const order=s.s.orders.find(o=>o.id===r.order);s.completeOrder(order);
 assert.ok(s.D.lit[0][s.idx(7,8)]>=.5);assert.equal(s.D.cam[0][s.idx(7,8)],1);assert.equal(s.s.speed,0);assert.equal(s.s.open,false);
});
test('unobstructed mounted coverage still shares; standalone coverage keeps existing rules',()=>{
 const s=shadowFixture(),clear={...shadowArgs,a:{x:5,y:10},b:{x:5,y:10}};const r=s.plan(clear);assert.equal(r.upgrades.counts.light,0);assert.equal(r.upgrades.counts.camera,0);
 const t=shadowFixture(true),q=t.plan(shadowArgs);assert.equal(q.upgrades.counts.light,0);assert.equal(q.upgrades.counts.camera,0);
});
if(failures.length){console.error(`${failures.length} review regression groups failed`);process.exitCode=1;}else console.log('ALL PASS: three reviewed paths; native checks only');
