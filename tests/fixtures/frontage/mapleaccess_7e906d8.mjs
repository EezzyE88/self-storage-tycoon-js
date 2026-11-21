// Frozen reference copy of js/mapleaccess.js at master 7e906d8 (test oracle only; never imported by the game).
// Coordinates in Maple's simulation grid, y increasing toward the street.
import { G, PED_GROUND, VEH_GROUND } from '../../../js/data.js';

export const MAPLE_PUBLIC = 'maple-public-office-v1';
export const publicDrive = 'public-office-drive';
export const recessed = (s, g) => s.layout === MAPLE_PUBLIC && g?.mapleCompound === true;
export const pocket = (x,y) => x >= 4 && x < 18 && y >= 20 && y < 30;
const lanes = (x,y) => x >= 18 && x < 24 && y >= 18 && y < 30;
const approach = (x,y) => lanes(x,y) && y >= 24;
const publicThroat = x => x >= 12 && x < 16;
export const publicBay = (x,y) => x >= 10 && x < 16 && y >= 21 && y < 25 ? Math.floor((x-10)/2) : -1;
export function staffLanding(office, target) {
  if (target && pocket(Math.floor(target.x), Math.floor(target.y))) return office?.door;
  return office?.staffDoor || office?.door;
}

// Staff may walk the frontage in either direction. Fence runs match the rendered
// pocket. The last column of the recessed opening is the staff gate crossing.
export function pedestrianEdge(x,y,nx,ny,staffGate = null) {
  if (staffGate !== null) {
    const right = Math.max(x,nx), front = Math.max(y,ny);
    if (y === ny) {
      if (right === 4 && y >= 20 && y < 30) return false;
      if (right === 18 && y >= 20 && y < 24) return false;
      if (right === 24 && y >= 24 && y < 30) return false;
    } else {
      if (front === 30) return x >= 4 && x < 24;
      if (front === 20 && x >= 4 && x < 18) return false;
      if (front === 24 && x >= 18 && x < 24) return staffGate && x === 23;
    }
    return true;
  }
  if (pocket(x,y) !== pocket(nx,ny)) {
    return Math.max(y,ny) === 30 && Math.min(y,ny) === 29 && pocket(x,29) && pocket(nx,29);
  }
  if (y >= 30 || ny >= 30) return y === 30 && ny === 30;
  return !lanes(x,y) && !lanes(nx,ny);
}

export function vehicleEdge(sim,x,y,nx,ny,id) {
  const s = sim.s;
  if (y >= 30 && ny >= 30) return true;
  if (id === publicDrive) {
    if (Math.max(y,ny) === 30) return publicThroat(x) && x === nx;
    if (!pocket(x,y) || !pocket(nx,ny)) return false;
    const a=publicBay(x,y), b=publicBay(nx,ny);
    return a<0 || b<0 || a===b;
  }
  if (pocket(x,y) || pocket(nx,ny)) return false;
  const ids = id == null ? sim.routeGateIds() : [id];
  if (Math.max(y,ny) === 30) {
    return ids.some(k => {
      const g = s.objects[k];
      if (recessed(s,g)) return ny < y ? x >= 21 && x < 24 : x >= 18 && x < 21;
      return g?.y === 29 && Math.abs(nx-g.x)<=1 && !approach(nx,29);
    });
  }
  if (approach(x,y) !== approach(nx,ny)) {
    return x===nx && Math.min(y,ny)===23 && ids.some(k=>recessed(s,s.objects[k])) &&
      (ny < y ? x >= 21 && x < 24 : x >= 18 && x < 21);
  }
  if (lanes(x,y) && lanes(nx,ny)) {
    if ((x<21)!==(nx<21)) return false;
    if (y!==ny) return x<21 ? ny>y : ny<y;
  }
  if (lanes(x,y)!==lanes(nx,ny)) return ny===17 || y===17;
  return true;
}

function flood(sim, starts, valid, edge) {
  const seen = new Set(), queue=[];
  for (const i of starts) if(valid(i) && !seen.has(i)) { seen.add(i); queue.push(i); }
  for(let k=0;k<queue.length;k++){
    const i=queue[k], x=i%sim.s.W, y=Math.floor(i/sim.s.W);
    for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){
      if(!sim.inb(nx,ny) || !edge(x,y,nx,ny)) continue;
      const j=sim.idx(nx,ny);
      if(!seen.has(j) && valid(j)){seen.add(j);queue.push(j);}
    }
  }
  return seen;
}

// Read-only projection. Pending losses count now; unfinished alternative pavement
// cannot justify blocking a route which is still needed during construction.
export function accessState(sim, plan, pending=true) {
  const s=sim.s, office=sim.objs('office')[0];
  if(!office?.staffDoor) return {};
  const ground=new Map(), solid=new Set();
  for(const t of plan?.tiles || []) if(t.k==='ground') ground.set(t.i,t.v);
  for(const o of plan?.creates || []) {
    if(!['office','shell','unit','hvac','power','water'].includes(o.type) || (o.type==='unit' && o.access!=='drive')) continue;
    for(let y=o.y;y<o.y+o.h;y++) for(let x=o.x;x<o.x+o.w;x++) solid.add(sim.idx(x,y));
  }
  const pass=(i,types)=> !sim.D.solid[i] && !solid.has(i) && types.has(ground.get(i) ?? s.ground[i]) &&
    (!pending || !sim.D.pendingGround.has(i) || types.has(sim.D.pendingGround.get(i)));
  const walk=i=>pass(i,PED_GROUND), drive=i=>pass(i,VEH_GROUND);
  const door=sim.idx(office.door.x,office.door.y), rear=sim.idx(office.staffDoor.x,office.staffDoor.y);
  const fromDoor=flood(sim,[door],walk,(x,y,nx,ny)=>pocket(nx,ny) && pocket(x,y));
  const entrance=[], sidewalk=[];
  for(let x=4;x<18;x++){
    sidewalk.push(sim.idx(x,29));
    if(publicThroat(x) && drive(sim.idx(x,30))) entrance.push(sim.idx(x,29));
  }
  const cars=flood(sim,entrance,drive,(x,y,nx,ny)=>pocket(nx,ny) && vehicleEdge(sim,x,y,nx,ny,publicDrive));
  const bays=[];
  for(const i of cars) if(fromDoor.has(i) && publicBay(i%s.W,Math.floor(i/s.W))>=0 &&
    (ground.get(i)??s.ground[i])===G.PARKING && (!pending || (sim.D.pendingGround.get(i)??G.PARKING)===G.PARKING)) bays.push(i);
  bays.sort((a,b)=>Math.floor(a/s.W)-Math.floor(b/s.W) || a%s.W-b%s.W);
  const staff=flood(sim,[rear],walk,(x,y,nx,ny)=>ny<30 && !pocket(nx,ny) && pedestrianEdge(x,y,nx,ny));
  const assigned = new Set();
  for (const a of s.agents) if(a.publicVisit) {
    const car=sim.vehAt(a.veh);
    if(!car) continue;
    const carCell=sim.idx(Math.floor(car.x),Math.floor(car.y));
    if((car.dest==null || bays.includes(car.dest)) && (!pocket(Math.floor(car.x),Math.floor(car.y)) || cars.has(carCell)) &&
        (a.hidden || fromDoor.has(sim.idx(Math.floor(a.x),Math.floor(a.y))))) assigned.add(a.id);
  }
  // The rear yard connection above is independently required even when a worker
  // can reach the public frontage through the office or the gate.
  const walkableForStaff = i => walk(i) || sim.D.staffPassage?.has(i) && sim.D.solid[i] && !solid.has(i);
  const fieldWorkers = s.agents.filter(a => a.kind === 'staff' && !a.hidden && a.f === 0);
  const workerReach = fieldWorkers.length && flood(sim,[rear],walkableForStaff,(x,y,nx,ny)=>{
    const i=sim.idx(x,y), j=sim.idx(nx,ny);
    if (sim.D.staffPassage?.get(i)?.includes(j)) return true;
    return walk(i) && walk(j) && pedestrianEdge(x,y,nx,ny,!!sim.D.staffGate);
  });
  const workers=new Set();
  for (const a of fieldWorkers) {
    const i=sim.idx(Math.floor(a.x),Math.floor(a.y));
    if(!sim.D.shellAt[i] && workerReach.has(i)) workers.add(a.id);
  }
  // A changed route can arrive at another working yard entrance.
  const yardDoors = sim.objs('door').filter(o=>o.cstate==='operating');
  const yardReachable = yardDoors.length
    ? yardDoors.some(o=>staff.has(sim.idx(o.x+o.dir[0],o.y+o.dir[1])))
    : [...staff].some(i=>Math.floor(i/s.W)<18);
  return {assigned,workers,pedestrian:sidewalk.some(i=>fromDoor.has(i)),parking:bays.length>0,staff:yardReachable,bays};
}
export function lostMapleAccess(before,after) {
  if(before.pedestrian && !after.pedestrian) return 'Keep a public walkway to the office entrance.';
  if(before.parking && !after.parking) return 'Keep a driveable public parking bay with a walking route to the office.';
  if(before.staff && !after.staff) return 'Keep a secured staff route from the rear office door into the yard.';
  if(before.assigned && [...before.assigned].some(id=>!after.assigned?.has(id))) return 'Keep the parking and return route for the current office visitor.';
  if(before.workers && [...before.workers].some(id=>!after.workers?.has(id))) return 'Keep a secured return route for the worker in the yard.';
  return null;
}
