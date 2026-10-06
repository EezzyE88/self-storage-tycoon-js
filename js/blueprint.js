// Presentation-only vertical lesson geometry. Recovered from existing order IDs on every load.
import { G } from './data.js';
const rect = (x,y,w,h) => ({a:{x,y},b:{x:x+w-1,y:y+h-1}});
const inside = (sh,o) => o.x>=sh.x && o.y>=sh.y && o.x<sh.x+sh.w && o.y<sh.y+sh.h;
export function lessonShell(sim) {
  const mark=sim.s.lesson?.id==='up' ? sim.s.lesson.idMark : Infinity;
  return sim.objs('shell').filter(o=>o.id>=mark && o.floors===2).sort((a,b)=>a.id-b.id)[0] || null;
}
const cache=new WeakMap();
export function verticalLayout(sim) {
  const key=[sim.s.structV,sim.s.lesson?.id,sim.s.lesson?.idMark].join(':');
  const old=cache.get(sim); if(old?.key===key) return old.value;
  const value=deriveLayout(sim); cache.set(sim,{key,value}); return value;
}
function deriveLayout(sim) {
  sim.ensure(); let sh=lessonShell(sim), proposed=!sh;
  if (!sh) {
    // Prefer the authored empty plot; deterministic search handles occupied or mirrored plots.
    const candidates=[];
    for(let y=sim.s.parcel.y0;y<=sim.s.parcel.y1-11;y++) for(let x=sim.s.parcel.x0;x<=sim.s.parcel.x1-8;x++) candidates.push({x,y,w:9,h:9});
    const px=sim.s.mirror ? sim.s.W-38 : 29;
    candidates.sort((a,b)=>Math.abs(a.x-px)+Math.abs(a.y-6)-Math.abs(b.x-px)-Math.abs(b.y-6)||a.y-b.y||a.x-b.x);
    sh=candidates.find(o=>sim.plan({tool:'shell2',...rect(o.x,o.y,o.w,o.h),f:0}).status!=='invalid' && access(sim,o)) || null;
    if(!sh) return null;
  }
  const entry=sim.objs('door').filter(o=>inside(sh,o)).sort((a,b)=>a.id-b.id)[0];
  const ac=access(sim,sh,entry);
  if(!ac) return {sh,proposed,blocked:'No clear access route beside this building. Add a connected aisle, then recheck.'};
  const d=ac.dir, t={x:d[1],y:-d[0]}, door=ac.door;
  // Follow an existing full hallway to its entrance where possible, rather than impose a new origin.
  const depth=d[1] ? sh.h : sh.w;
  const point=(u,v)=>({x:door.x+t.x*u-d[0]*v,y:door.y+t.y*u-d[1]*v});
  const unitSide=inside(sh,point(-1,1)) ? -1 : 1;
  const h0=point(0,depth-2), e=point(-unitSide,1), light=point(0,Math.floor(depth/2)), u0=point(unitSide,Math.min(2,depth-2)), u1=point(unitSide,depth-2);
  const outer={x:door.x+d[0],y:door.y+d[1]};
  const loading=d[1] ? rect(outer.x-1,outer.y,3,1) : rect(outer.x,outer.y-1,1,3);
  const hall={a:h0,b:door};
  const plans={aisle:{tool:'aisle',...(ac.road||loading),f:0},shell2:{tool:'shell2',...rect(sh.x,sh.y,sh.w,sh.h),f:0},hall:{tool:'hall',...hall,f:0},doorWide:{tool:'doorWide',a:door,b:door,f:0,dir:d},loading:{tool:'loading',...loading,f:0},hall2:{tool:'hall',...hall,f:1},elevator:{tool:'elevator',a:e,b:e,f:0},light:{tool:'light',a:light,b:light,f:0},light2:{tool:'light',a:light,b:light,f:1},units:{tool:'iu5x5',a:u0,b:u1,f:1,axis:d[1]?'y':'x',flip:false}};
  // Use actual planned frontage, choosing the flip that faces this hallway.
  const up=sim.plan(plans.units); const want={x:-unitSide*t.x,y:-unitSide*t.y};
  if(up.units?.[0]?.dir && (up.units[0].dir[0]!==want.x||up.units[0].dir[1]!==want.y)) plans.units.flip=true;
  return {sh,proposed,plans,door,outer,point};
}
function access(sim,sh,entry=null) {
  const cx=sh.x+Math.floor(sh.w/2),cy=sh.y+Math.floor(sh.h/2);
  const edges=entry ? [{door:{x:entry.x,y:entry.y},dir:entry.dir}] : [{door:{x:cx,y:sh.y+sh.h-1},dir:[0,1]},{door:{x:cx,y:sh.y},dir:[0,-1]},{door:{x:sh.x+sh.w-1,y:cy},dir:[1,0]},{door:{x:sh.x,y:cy},dir:[-1,0]}];
  let best=null;
  for(const a of edges) {
    const out={x:a.door.x+a.dir[0],y:a.door.y+a.dir[1]};
    const pending = entry && sim.s.orders.find(o=>o.st==='construction' && o.tool==='aisle' && o.cells.some(c=>c.x===out.x && c.y===out.y));
    if (pending) return {...a,road:null};
    if (entry && sim.D.vehReach[sim.idx(out.x,out.y)]) return {...a,road:null};
    for(let y=sim.s.parcel.y0;y<=sim.s.parcel.y1;y++) for(let x=sim.s.parcel.x0;x<=sim.s.parcel.x1;x++) {
      const i=sim.idx(x,y); if(!sim.D.vehReach[i]) continue;
      // A continuous paved rectangle; validate every cell against real structures.
      if((a.dir[1] && (y-out.y)*a.dir[1]<0) || (a.dir[0] && (x-out.x)*a.dir[0]<0)) continue;
      const road={a:{x:Math.min(x,out.x-(a.dir[1]?1:0),out.x+2*a.dir[0]),y:Math.min(y,out.y-(a.dir[0]?1:0),out.y+2*a.dir[1])},b:{x:Math.max(x,out.x+(a.dir[1]?1:0),out.x+2*a.dir[0]),y:Math.max(y,out.y+(a.dir[0]?1:0),out.y+2*a.dir[1])}};
      const p=sim.plan({tool:'aisle',...road,f:0});
      const dist=Math.abs(x-out.x)+Math.abs(y-out.y);
      if((p.status!=='invalid'||p.reasons.every(r=>r==='Nothing to change here')) && (!best||dist<best.dist)) best={...a,road,dist};
    }
  }
  return best;
}
// Hallway beside the shaft, per floor: 'built' (hall===1), 'ordered' (queued or under construction, hall===2)
// or 'missing'. The elevator needs built hallways on both floors; ordered ones only need construction time.
// Once an elevator is committed in this building (it may be placed before its hallways finish), its own position is
// checked; before that, the planned shaft position.
const NEXT=[[1,0],[-1,0],[0,1],[0,-1]];
const hallsBuilt=(sim,c)=>[0,1].every(f=>NEXT.some(([dx,dy])=>sim.inb(c.x+dx,c.y+dy)&&sim.s.hall[f]?.[sim.idx(c.x+dx,c.y+dy)]===1));
const shaftAt=(sim,l)=>sim.objs('elevator').filter(o=>inside(l.sh,o));
export function shaftHallState(sim) {
  const l=verticalLayout(sim); if(!l||l.blocked||l.proposed||!l.plans?.elevator) return null;
  const els=shaftAt(sim,l), c=els.find(o=>hallsBuilt(sim,o))||els[0]||l.plans.elevator.a;
  return [0,1].map(f=>{const v=[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dy])=>sim.inb(c.x+dx,c.y+dy)?sim.s.hall[f]?.[sim.idx(c.x+dx,c.y+dy)]:0);return v.includes(1)?'built':v.some(x=>x)?'ordered':'missing';});
}
export function verticalDone(sim,key) {
  const l=verticalLayout(sim); if(!l||l.blocked) return false; const {sh,plans}=l;
  if(key==='shell2') return !l.proposed;
  if(key==='aisle') { const p=plans.loading; return [p.a,p.b].some(c=>sim.D.vehReach[sim.idx(c.x,c.y)]); }
  if(l.proposed) return false;
  const objs=(type,f)=>sim.objs(type).filter(o=>inside(sh,o)&&(f==null||(o.f||0)===f));
  if(key==='hall'||key==='hall2') { const p=plans[key],f=p.f; const lo=Math.min(p.a.x,p.b.x),hi=Math.max(p.a.x,p.b.x),ly=Math.min(p.a.y,p.b.y),hy=Math.max(p.a.y,p.b.y); for(let y=ly;y<=hy;y++)for(let x=lo;x<=hi;x++)if(!sim.s.hall[f][sim.idx(x,y)])return false; return true; }
  if(key==='loading') { const p=plans.loading; for(let y=p.a.y;y<=p.b.y;y++)for(let x=p.a.x;x<=p.b.x;x++)if(sim.groundAt(sim.idx(x,y))!==G.LOADING && !sim.s.orders.some(o=>o.st==='construction'&&o.tool==='loading'&&o.cells.some(c=>c.x===x&&c.y===y)))return false; return true; }
  if(key==='doorWide') return objs('door',0).some(o=>o.kind==='wide'&&sim.s.hall[0][sim.idx(o.x,o.y)]);
  // Complete only when a committed shaft has FINISHED hallways beside it on both floors; an ordered hallway (2) is not one.
  if(key==='elevator') return objs('elevator').some(o=>hallsBuilt(sim,o));
  if(key==='lights') return [0,1].every(f=>objs('light',f).some(o=>sim.s.hall[f][sim.idx(o.x,o.y)]));
  if(key==='units') return objs('unit',1).length>0;
  if(key==='finished') return objs('unit',1).some(o=>['ready','operating'].includes(o.cstate));
  if(key==='commissioned') return objs('unit',1).some(o=>o.cstate==='operating' && !(o.missing||[]).length);
  return false;
}
export function verticalCheck(sim) {
  const l=verticalLayout(sim); if(!l) return 'No clear suggested footprint remains. Choose open land with access.';
  if(l.blocked) return l.blocked;
  const units=sim.objs('unit').filter(o=>!l.proposed&&inside(l.sh,o)&&(o.f||0)===1);
  const missing=[...new Set(units.flatMap(o=>o.missing||[]))];
  if(missing.length) return missing.join('; ');
  const labels={aisle:'Connected drive aisle',shell2:'Two-floor shell',hall:'F1 hallway to entrance',doorWide:'Wide entrance',loading:'Loading zone',hall2:'F2 hallway',elevator:'Elevator beside both halls',lights:'Hallway lights on both floors',units:'F2 units',finished:'Construction and operational access',commissioned:'Commission upstairs units'};
  const next=Object.keys(labels).find(k=>!verticalDone(sim,k));
  return next ? 'Next: '+labels[next]+'. Use the highlighted placement; Confirm spends cash.' : 'Customer access is ready: gate → loading → entrance → elevator → upstairs unit.';
}

// Other authored build lessons share the same review-only placement assistance.
// Prefer the taught location; relocate an obstructed row only along nearby valid frontage.
const authoredCache=new WeakMap();
export function authoredPlacement(sim, step) {
  const old=authoredCache.get(sim);
  if(old?.version===sim.s.structV && old.step===step) return old.value;
  const value=deriveAuthoredPlacement(sim,step);
  authoredCache.set(sim,{version:sim.s.structV,step,value});
  return value;
}
function deriveAuthoredPlacement(sim, step) {
  const a=step?.placement; if(!a) return null;
  const candidate={...a,a:{...a.a},b:{...a.b}};
  if(sim.plan(candidate).status!=='invalid') return candidate;
  if(!a.axis) return null;
  const offsets=[];
  for(let dy=-8;dy<=8;dy++) for(let dx=-8;dx<=8;dx++) offsets.push({dx,dy});
  offsets.sort((a,b)=>Math.abs(a.dx)+Math.abs(a.dy)-Math.abs(b.dx)-Math.abs(b.dy)||a.dy-b.dy||a.dx-b.dx);
  const axis=a.axis, length=Math.abs(a.b[axis]-a.a[axis])+1, stride=a.tool==='du10x10'?2:1, direction=Math.sign(a.b[axis]-a.a[axis])||1;
  for(let len=length;len>=stride;len-=stride) for(const {dx,dy} of offsets) {
    const p={...a,a:{x:a.a.x+dx,y:a.a.y+dy},b:{x:a.b.x+dx,y:a.b.y+dy}};
    p.b[axis]=p.a[axis]+direction*(len-1);
    if(sim.plan(p).status==='valid') return p;
  }
  return null;
}
