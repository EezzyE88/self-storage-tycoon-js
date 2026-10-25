// Unit attachments: shared plan/preview/coverage rules. No state mutation here.
import { TOOLS } from './data.js';
export const LIGHTING = ['none', 'interior', 'outside', 'both'];
export const UPGRADE = {
  unitLight: { build: 75, retrofit: 100, daily: 0.03, kw: 0.02, minutes: 30 },
  light: { build: 100, retrofit: 150, daily: 0.35, kw: 0.2, minutes: 60 },
  camera: { build: 500, retrofit: 500, daily: 0.35, kw: 0.05, minutes: 120 },
};
export function upgradesEnabled(sim) {
  return sim.s.mode === 'sandbox' && !sim.s.scenario && !sim.s.lesson && !sim.s.tut?.on;
}
export function retrofitEligible(sim, u) {
  return upgradesEnabled(sim) && u?.type === 'unit' && u.cstate === 'operating' && !u.lease && u.commercial !== 'reserved' && !u.retrofitOrder && !sim.s.agents.some(a => a.unit === u.id);
}
export function mountedOn(sim, id) { return Object.values(sim.s.objects).filter(o => o.mount?.host === id); }
export function mountFor(sim, u, host, type) {
  const front = sim.unitFront(u).find(c => sim.inb(c.x,c.y) && (u.access === 'drive' ? !sim.D.shellAt[sim.idx(c.x,c.y)] : sim.s.hall[u.f||0]?.[sim.idx(c.x,c.y)] === 1));
  if (!front || !sim.inParcel(front.x,front.y)) return null;
  const dir = [...u.dir], x = u.x + u.w/2 + dir[0]*u.w/2, y = u.y + u.h/2 + dir[1]*u.h/2;
  return { type, x: front.x, y: front.y, f: u.f||0, cond: 1,
    mount: { host, dir, x, y, frontage: {...front}, indoor: u.access === 'interior' } };
}
// Supercover segment: checking both sides of corner crossings prevents corner leaks.
export function attachmentCoverage(sim, fixture, proposed = []) {
  if (!fixture.mount || fixture.type === 'unitLight') return [];
  const { D, s }=sim, f=fixture.f||0, {x:sx,y:sy}=fixture.mount.frontage, dir=fixture.mount.dir;
  const shell=D.shellAt[sim.idx(sx,sy)], r=TOOLS[fixture.type].radius;
  const clear=(x,y)=> {
    if(!sim.inb(x,y))return false;
    const i=sim.idx(x,y);
    if(D.shellAt[i]!==shell || D.unitAt[f][i] || D.roomAt[f][i])return false;
    if(proposed.some(u=>(u.f||0)===f&&x>=u.x&&x<u.x+u.w&&y>=u.y&&y<u.y+u.h))return false;
    return shell ? s.hall[f][i]===1 : !D.solid[i];
  };
  const visible=(tx,ty)=> {
    let x=sx,y=sy, ix=0,iy=0;const dx=tx-sx,dy=ty-sy,nx=Math.abs(dx),ny=Math.abs(dy),xx=Math.sign(dx),yy=Math.sign(dy);
    if(!clear(x,y))return false;
    while(ix<nx||iy<ny){const a=(1+2*ix)*ny,b=(1+2*iy)*nx;
      if(a===b){if(!clear(x+xx,y)||!clear(x,y+yy))return false;x+=xx;y+=yy;ix++;iy++;}
      else if(a<b){x+=xx;ix++;}else{y+=yy;iy++;}
      if(!clear(x,y))return false;
    }return true;
  };
  const cells=[];
  for(let y=Math.ceil(sy-r);y<=sy+r;y++)for(let x=Math.ceil(sx-r);x<=sx+r;x++){
    const d=Math.hypot(x-sx,y-sy);if(d>r||(x-sx)*dir[0]+(y-sy)*dir[1]<0||!visible(x,y))continue;
    const strength=fixture.type==='camera'?1:(d<r*.7?1:1-(d-r*.7)/(r*.3)*.5)*(fixture.cond<.45?.75:1);
    cells.push({x,y,f,i:sim.idx(x,y),v:strength});
  }return cells;
}
export function upgradeStamp(R) {
  return JSON.stringify([R.cost,R.dur,R.opex,R.creates.map(o=>[o.type,o.x,o.y,o.f,o.mount?.host,o.mount?.dir]),R.upgrades?.options.map(o=>[o.key,o.selected,o.cells.map(c=>[c.x,c.y,c.v])]),R.warn||[]]);
}
export function addUpgrades(sim, a, R, units, retrofit=false) {
  units=units.map((u,k)=>({...R.creates.filter(o=>o.type==='unit')[k],...u}));
  const mode=LIGHTING.includes(a.lighting)?a.lighting:'none';
  if(!upgradesEnabled(sim)) {
    if(mode!=='none'||a.outsideCameras){R.status='invalid';R.reasons.push('Unit upgrades are available in Sandbox outside lessons and scenarios');}
    return R;
  }
  const excluded=new Set(a.excludedFixtures||[]), creates=[], options=[], pending=[], notices=[];
  const targets=units.flatMap(u=>sim.unitFront(u).filter(c=>sim.inb(c.x,c.y)).map(c=>({...c,f:u.f||0})));
  const proposed=retrofit?[]:units;
  units.forEach((u,k)=>{
    const host=retrofit?u.id:k, existing=retrofit?mountedOn(sim,u.id):[];
    if(['interior','both'].includes(mode)&&!existing.some(o=>o.type==='unitLight'))creates.push({type:'unitLight',x:u.x,y:u.y,f:u.f||0,cond:1,mount:{host,private:true,x:u.x+u.w/2,y:u.y+u.h/2}});
  });
  for(const type of ['light','camera']){
    if(type==='light'?!['outside','both'].includes(mode):!a.outsideCameras)continue;
    const map=type==='light'?sim.D.lit:sim.D.cam, threshold=type==='light'?.5:1;
    const covered=new Set(targets.filter(c=>map[c.f][sim.idx(c.x,c.y)]>=threshold).map(c=>`${c.f}:${c.x}:${c.y}`));
    // Pending mounts are disclosed, never considered working or charged twice.
    const pendingCells=new Set();
    for(const o of sim.objs(type).filter(o=>o.cstate==='construction')){
      const cells=o.mount?attachmentCoverage(sim,o,proposed):targets.filter(c=>c.f===(o.f||0)&&sim.D.shellAt[sim.idx(c.x,c.y)]===sim.D.shellAt[sim.idx(o.x,o.y)]&&Math.hypot(c.x-o.x,c.y-o.y)<=TOOLS[type].radius);
      for(const c of cells)pendingCells.add(`${c.f||0}:${c.x}:${c.y}`);
    }
    const candidates=units.map((u,k)=>{
      if(retrofit&&mountedOn(sim,u.id).some(o=>o.type===type))return null;
      const fixture=mountFor(sim,u,retrofit?u.id:k,type);if(!fixture)return null;
      return {key:`${type}:${retrofit?u.id:k}`,fixture,cells:attachmentCoverage(sim,fixture,proposed)};
    }).filter(Boolean).sort((a,b)=>a.fixture.f-b.fixture.f||a.fixture.y-b.fixture.y||a.fixture.x-b.fixture.x);
    const planned=new Set(covered);
    while(candidates.length){
      const score=o=>o.cells.filter(c=>c.v>=threshold&&!planned.has(`${c.f}:${c.x}:${c.y}`)&&!pendingCells.has(`${c.f}:${c.x}:${c.y}`)&&targets.some(t=>t.f===c.f&&t.x===c.x&&t.y===c.y)).length;
      candidates.sort((a,b)=>score(b)-score(a));const o=candidates.shift();if(!score(o))break;
      o.selected=!excluded.has(o.key);options.push(o);
      // Suggestion set stays stable when a suggested fixture is deselected.
      for(const c of o.cells)if(c.v>=threshold)planned.add(`${c.f}:${c.x}:${c.y}`);
      if(o.selected)creates.push(o.fixture);
    }
    const actual=new Set(covered);
    for(const o of options.filter(o=>o.fixture.type===type&&o.selected))for(const c of o.cells)if(c.v>=threshold)actual.add(`${c.f}:${c.x}:${c.y}`);
    const dark=targets.filter(c=>!actual.has(`${c.f}:${c.x}:${c.y}`));
    if(!dark.length)notices.push(`${type==='light'?'Lighting':'Camera'} frontage coverage sufficient`);
    else {notices.push(`${dark.length} frontage cells without ${type==='light'?'lighting':'camera coverage'}`);if(type==='light'&&units.some(u=>u.access==='interior')&&!R.missing.includes('Hallway is dark - add a light'))R.missing.push('Hallway is dark - add a light');}
    if(dark.some(c=>pendingCells.has(`${c.f}:${c.x}:${c.y}`)))pending.push(`${type}: coverage awaiting existing installation`);
  }
  const cost=creates.reduce((n,o)=>n+UPGRADE[o.type][retrofit?'retrofit':'build'],0), daily=creates.reduce((n,o)=>n+UPGRADE[o.type].daily,0), minutes=creates.reduce((n,o)=>n+UPGRADE[o.type].minutes,0);
  R.creates.push(...creates);R.cost+=cost;R.opex+=daily;R.dur+=minutes;
  R.upgrades={mode,options,pending,notices,cost,daily,minutes,counts:Object.fromEntries(['unitLight','light','camera'].map(t=>[t,creates.filter(o=>o.type===t).length]))};
  // Planned powered fixtures may resolve the dark warning, but never other prerequisites.
  if(['outside','both'].includes(mode)&&!notices.some(n=>/without lighting/.test(n)))R.missing=R.missing.filter(m=>m!=='Hallway is dark - add a light');
  if(R.status!=='invalid')R.status=R.missing.length?'incomplete':'valid';
  return R;
}
export function retrofitPlan(sim,a) {
  sim.ensure();const u=sim.s.objects[a.unit];
  const R={tool:'unitRetrofit',status:'valid',reasons:[],missing:[],warn:[],cost:0,dur:0,count:1,opex:0,items:[],creates:[],tiles:[],label:'Unit lighting/security retrofit',units:[]};
  if(!retrofitEligible(sim,u)){R.status='invalid';R.reasons.push('Select a vacant, unreserved operating unit with no active retrofit or customer');return R;}
  R.units=[u];addUpgrades(sim,a,R,[u],true);
  if(!R.creates.length){R.status='invalid';R.reasons.push('No additional fixtures selected');}
  return R;
}
export function upgradePower(R) { return (R.creates||[]).filter(o=>o.mount).reduce((n,o)=>n+UPGRADE[o.type].kw,0); }
