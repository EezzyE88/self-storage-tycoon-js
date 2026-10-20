// Comeback's next operating choice. Quotes and outcomes use ordinary simulation rules.
import { authoredYard } from './propertyprojects.js';
import { unitInService } from './comeback.js';
import { G, VEH_GROUND } from './data.js';
import { rollingShopperPeriod } from './reporting.js';

const signature = u => [u.id,u.x,u.y,u.w,u.h,u.f || 0,u.size,u.env].join(':');
const same = (s,t) => s.objects[t.id]?.type === 'unit' && signature(s.objects[t.id]) === t.signature;
const hasLease = (s,u) => u.lease && s.leases[u.lease]?.unit===u.id && !!s.tenants[s.leases[u.lease].tenant];
const groupsOf = r => r.groups ?? [{label:'Tracked spaces',started:r.started,ids:r.targets.map(t=>t.id),completed:r.completed}];
export function normalizeYardLoop(s) {
  const r=s.yardLoop; if(r==null)return;
  if(s.scenario?.id!=='comeback'||s.scenario.status!=='won'||!s.scenario.acknowledged){delete s.yardLoop;return;}
  const int=n=>Number.isInteger(n)&&n>=0;
  if(!r||r.v!==1||!int(r.started)||r.started>s.t||!Array.isArray(r.targets)||!r.targets.length||r.targets.length>4096||
    !r.targets.every(t=>t&&int(t.id)&&typeof t.signature==='string'&&t.signature.length<160)||new Set(r.targets.map(t=>t.id)).size!==r.targets.length||
    !Array.isArray(r.leases)||r.leases.length>r.targets.length||!r.leases.every(l=>l&&r.targets.some(t=>t.id===l.unit)&&int(l.t)&&l.t>=r.started&&l.t<=s.t&&Number.isFinite(l.rent)&&l.rent>=0)||new Set(r.leases.map(l=>l.unit)).size!==r.leases.length||
    r.completed!=null&&(!int(r.completed)||r.completed<r.started||r.completed>s.t)) {delete s.yardLoop;return;}
  const groups=groupsOf(r);
  if(!Array.isArray(groups)||!groups.length||groups.length>4096||!groups.every(g=>g&&typeof g.label==='string'&&g.label.length<=200&&int(g.started)&&g.started>=r.started&&g.started<=s.t&&Array.isArray(g.ids)&&g.ids.length&&g.ids.every(id=>r.targets.some(t=>t.id===id))&&(g.completed==null||int(g.completed)&&g.completed>=g.started&&g.completed<=s.t))){delete s.yardLoop;return;}
  const ids=groups.flatMap(g=>g.ids);
  if(ids.length!==r.targets.length||new Set(ids).size!==ids.length||r.leases.some(l=>l.t<groups.find(g=>g.ids.includes(l.unit)).started)){delete s.yardLoop;return;}
  s.yardLoop={v:1,started:r.started,targets:r.targets.map(t=>({id:t.id,signature:t.signature})),leases:r.leases.map(l=>({unit:l.unit,t:l.t,rent:l.rent})),completed:r.completed??null,
    groups:groups.map(g=>({label:g.label,started:g.started,ids:[...g.ids],completed:g.completed??null}))};
}
export function yardFocus(sim,ids,{append=false,label='Ready spaces'}={}) {
  if(!authoredYard(sim)||!Array.isArray(ids)||!ids.length||ids.length>4096||new Set(ids).size!==ids.length)return {ok:false,msg:'Review the current vacancies again.'};
  const units=ids.map(id=>sim.s.objects[id]);
  if(!units.every(u=>u?.type==='unit'&&!u.lease&&['ready','none'].includes(u.commercial)))return {ok:false,msg:'These spaces have changed. Review leasing again.'};
  const prior=yardProgress(sim);
  const active=prior?.groups.some(g=>!g.changed&&g.completed==null);
  if(active&&!append)return {ok:false,msg:'Your current spaces are still being tracked.'};
  const group={label,started:sim.s.t,ids:[...ids],completed:null};
  if(append&&prior&&sim.s.yardLoop.completed==null){
    const r=sim.s.yardLoop;
    if(ids.some(id=>r.targets.some(t=>t.id===id)))return {ok:false,msg:'These spaces are already tracked.'};
    r.groups=groupsOf(r);r.groups.push(group);r.targets.push(...units.map(u=>({id:u.id,signature:signature(u)})));r.completed=null;
  }else sim.s.yardLoop={v:1,started:sim.s.t,targets:units.map(u=>({id:u.id,signature:signature(u)})),leases:[],completed:null,groups:[group]};
  return {ok:true,msg:'Watching these spaces. Asking rents unchanged.'};
}
export function yardLease(sim,u,L) {
  const r=sim.s.yardLoop,t=r?.targets.find(t=>t.id===u.id);
  if(!t||!same(sim.s,t)||r.leases.some(l=>l.unit===u.id))return;
  r.leases.push({unit:u.id,t:sim.s.t,rent:L.rent});
}
export function yardProgress(sim) {
  const r=sim.s.yardLoop;if(!r)return null;
  const units=r.targets.filter(t=>same(sim.s,t)).map(t=>sim.s.objects[t.id]);
  return {total:r.targets.length,units,changed:units.length!==r.targets.length,
    signed:r.leases.length,rent:r.leases.reduce((n,l)=>n+l.rent,0),
    activeRent:units.filter(u=>hasLease(sim.s,u)).reduce((n,u)=>n+(sim.s.leases[u.lease]?.rent||0),0),
    reserved:units.filter(u=>hasLease(sim.s,u)&&u.commercial==='reserved').length,
    occupied:units.filter(u=>hasLease(sim.s,u)&&u.commercial==='occupied').length,
    ready:units.filter(u=>unitInService(sim.s,u)&&u.commercial==='ready').length,
    building:units.filter(u=>u.cstate==='construction').length,
    commissioning:units.filter(u=>u.cstate==='ready').length,completed:r.completed,
    groups:groupsOf(r).map(g=>{
      const us=units.filter(u=>g.ids.includes(u.id));
      return {...g,total:g.ids.length,changed:us.length!==g.ids.length,
        signed:r.leases.filter(l=>g.ids.includes(l.unit)).length,
        occupied:us.filter(u=>hasLease(sim.s,u)&&u.commercial==='occupied').length,
        reserved:us.filter(u=>hasLease(sim.s,u)&&u.commercial==='reserved').length,
        ready:us.filter(u=>unitInService(sim.s,u)&&u.commercial==='ready').length,
        serviceable:us.length===g.ids.length&&us.every(u=>unitInService(sim.s,u)),
        rent:us.filter(u=>hasLease(sim.s,u)).reduce((n,u)=>n+sim.s.leases[u.lease].rent,0)};
    })};
}
export function updateYardLoop(sim) {
  const r=sim.s.yardLoop,p=yardProgress(sim);
  if(!r)return;
  r.groups=groupsOf(r);
  for(let i=0;i<p.groups.length;i++){const g=p.groups[i];if(g.completed==null&&!g.changed&&g.serviceable&&g.signed===g.total&&g.occupied===g.total){
    r.groups[i].completed=sim.s.t;sim.emit('yard_filled',{label:g.label,count:g.total,rent:g.rent,unit:g.ids[0]});
  }}
  if(r.completed==null&&r.groups.every(g=>g.completed!=null))r.completed=sim.s.t;
}
export function yardInventory(sim) {
  const units=sim.objs('unit').filter(u=>u.cstate==='operating');
  return {total:units.length,occupied:units.filter(u=>hasLease(sim.s,u)&&u.commercial==='occupied').length,
    reserved:units.filter(u=>hasLease(sim.s,u)&&u.commercial==='reserved').length};
}
const connected = (sim,p) => p.creates.every(u=>sim.unitFront(u).some(c=>{
  const i=sim.idx(c.x,c.y);return sim.D.vehReach[i]&&VEH_GROUND.has(sim.groundAt(i));
}));
// Cache geometry only. Money, demand and placement validity are requoted each time.
function frontage(sim) {
  const s=sim.s,key=s.structV;
  if(sim._yardFrontage?.key===key)return sim._yardFrontage.args;
  const args=[];
  for(const [size,tool] of [['5x5','du5x5'],['5x10','du5x10'],['10x10','du10x10']]){
    let found=null;
    outer:for(let y=s.parcel.y0;y<=s.parcel.y1;y++)for(let x=s.parcel.x0;x<=s.parcel.x1;x++){
      const i=sim.idx(x,y);if(!sim.cellFree(i)||![G.GRASS,G.CONCRETE].includes(sim.groundAt(i)))continue;
      if(![[0,-1],[0,1],[-1,0],[1,0]].some(([dx,dy])=>sim.inb(x+dx,y+dy)&&VEH_GROUND.has(sim.groundAt(sim.idx(x+dx,y+dy)))))continue;
      for(const axis of ['x','y']){const a={tool,a:{x,y},b:{x,y},axis,f:0};const p=sim.plan(a);
        if(p.status==='valid'&&!p.warn?.length&&!p.missing?.length&&p.creates.length===1&&connected(sim,p)){found={size,args:a};break outer;}}
    }
    if(found)args.push(found);
  }
  sim._yardFrontage={key,args};return args;
}
// Requote a specific ordinary frontage specification, independently of recommendation ranking.
export function yardQuote(sim, args) {
  if(!authoredYard(sim))return null;
  const size={du5x5:'5x5',du5x10:'5x10',du10x10:'10x10'}[args?.tool];
  if(!size||args.f!==0||!['x','y'].includes(args.axis)||!args.a||!args.b||args.a.x!==args.b.x||args.a.y!==args.b.y||args.flip||args.climate||args.rush)return null;
  sim.ensure();const s=sim.s,period=rollingShopperPeriod(sim.day);
  const vacancies=sim.objs('unit').filter(u=>u.size===size&&u.env==='std'&&unitInService(s,u)&&u.commercial==='ready').length;
  const losses=s.mkt.lostLog.filter(l=>l.d>=period.start&&l.d<=period.end&&l.sz===size&&!l.climate&&['noSize','noReady'].includes(l.r)).length;
  if(vacancies||losses<2)return null;
  const plan=sim.plan(args);
  if(plan.status!=='valid'||plan.warn?.length||plan.missing?.length||plan.creates.length!==1||!connected(sim,plan))return null;
  const daily=sim.planDailyCost(plan),position=sim.financialPosition({spend:plan.cost,extraDaily:daily});
  return {size,args,plan,losses,period,daily,position,ask:s.market.ask[`${size}|std`]};
}
export function yardChoices(sim) {
  if(!authoredYard(sim))return [];
  sim.ensure();return frontage(sim).map(({args})=>yardQuote(sim,args)).filter(Boolean)
    .sort((a,b)=>b.losses-a.losses||a.plan.cost-b.plan.cost).slice(0,2);
}
