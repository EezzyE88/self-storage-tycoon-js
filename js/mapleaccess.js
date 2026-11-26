// Shared public-office access rules. Geometry comes from the property's frontage
// descriptor (js/frontage.js); the Maple-bound helpers below keep their old names.
import { G, PED_GROUND, VEH_GROUND } from './data.js';
import { MAPLE_PUBLIC, MAPLE_FRONTAGE, publicDrive, frontageOf } from './frontage.js';

export { MAPLE_PUBLIC, publicDrive };
export const recessed = (s, g) => g?.mapleCompound === true && !!frontageOf(s.layout)?.recessed(g);
export const pocket = (x,y) => MAPLE_FRONTAGE.pocket(x,y);
export const publicBay = (x,y) => MAPLE_FRONTAGE.bay(x,y);
export function staffLanding(office, target, K = null) {
  if (K && target && K.pocket(Math.floor(target.x), Math.floor(target.y))) return office?.door;
  return office?.staffDoor || office?.door;
}
export const pedestrianEdge = (x,y,nx,ny,staffGate = null) => MAPLE_FRONTAGE.pedestrianEdge(x,y,nx,ny,staffGate);
export const vehicleEdge = (sim,x,y,nx,ny,id) => MAPLE_FRONTAGE.vehicleEdge(sim,x,y,nx,ny,id);

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
  const s=sim.s, office=plan?.creates?.find(o=>o.type==='office') || sim.objs('office')[0], K=sim.frontage() || MAPLE_FRONTAGE, P=K.desc.pocket;
  const pocket=K.pocket, publicBay=K.bay, pedestrianEdge=K.pedestrianEdge, vehicleEdge=K.vehicleEdge;
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
  for(let x=P.x0;x<=P.x1;x++){
    sidewalk.push(sim.idx(x,P.y1));
    if(K.throat(x) && drive(sim.idx(x,K.streetY))) entrance.push(sim.idx(x,P.y1));
  }
  const cars=flood(sim,entrance,drive,(x,y,nx,ny)=>pocket(nx,ny) && vehicleEdge(sim,x,y,nx,ny,publicDrive));
  // Generalized offices require a return trip as well as entry. Walk the
  // directed driving graph backwards from the street exits.
  const exits = office.generalPlacement
    ? flood(sim,entrance,drive,(x,y,nx,ny)=>pocket(nx,ny) && vehicleEdge(sim,nx,ny,x,y,publicDrive))
    : cars;
  const bays=[];
  for(const i of cars) if(exits.has(i) && fromDoor.has(i) && publicBay(i%s.W,Math.floor(i/s.W))>=0 &&
    (ground.get(i)??s.ground[i])===G.PARKING && (!pending || (sim.D.pendingGround.get(i)??G.PARKING)===G.PARKING)) bays.push(i);
  bays.sort((a,b)=>Math.floor(a/s.W)-Math.floor(b/s.W) || a%s.W-b%s.W);
  const staff=flood(sim,office.generalPlacement && pocket(office.staffDoor.x,office.staffDoor.y) ? [] : [rear],walk,(x,y,nx,ny)=>ny<K.streetY && !pocket(nx,ny) && pedestrianEdge(x,y,nx,ny,office.generalPlacement ? false : null));
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
    : [...staff].some(i=>Math.floor(i/s.W)<K.desc.yardEdgeY);
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

// Match the same outdoor pedestrian route for quotes, gate selection, and
// parking. Occupancy is a destination constraint, separate from reachability.
export function classicOfficeWalkingField(sim, office, usable = () => true) {
  const { s, D } = sim;
  const door = sim.idx(office.door.x, office.door.y);
  if (!D.walk[0][door] || D.shellAt[door] || !usable(door, PED_GROUND)) return null;
  return sim.distField([door], i => sim.pedNbr(i).filter(j => j < s.W * s.H && !D.shellAt[j] && usable(j, PED_GROUND)));
}

export function classicOfficeParking(sim, reach, walks) {
  const bays = [];
  for (let i = 0; i < sim.s.ground.length; i++) {
    if (reach[i] && sim.s.ground[i] === G.PARKING && walks?.has(i)) bays.push(i);
  }
  return bays;
}

// Classic parcels share one secured customer/staff entrance. Reuse the live
// routing graph, excluding the proposed footprint and any pending obstructions.
export function classicOfficeAccess(sim, office, solids = new Set()) {
  const { s, D } = sim;
  const usable = (i, types) => !solids.has(i) &&
    (!D.pendingGround.has(i) || types.has(D.pendingGround.get(i)));
  const walks = classicOfficeWalkingField(sim, office, usable);
  if (!walks) return 'Office entrance needs a clear outdoor pedestrian landing.';
  const gates = classicOfficeGates(sim);
  if (!gates.length) return 'Connect an operating secured gate to the street before building the office.';
  const bays = classicGateParking(sim, gates, usable);
  if (bays.some(i => walks.has(i))) return null;
  return bays.length ? 'Connect the office entrance to parking with an outdoor pedestrian route.' :
    'Provide a parking bay reachable by vehicles through the secured gate.';
}

// The operating, street-connected gates the classic office rule accepts.
export const classicOfficeGates = sim => sim.routeGateIds().filter(id => sim.works(sim.obj(id)));

// Finished parking cells that vehicles reach from the street through one of
// the given gates. Shared by office validation and the opening guide (SB-1).
export function classicGateParking(sim, gates, usable = (i, types) =>
  !sim.D.pendingGround.has(i) || types.has(sim.D.pendingGround.get(i))) {
  const { s, D } = sim, out = new Set();
  const starts = Array.from({ length: s.W }, (_, x) => sim.idx(x, s.parcel.y1 + 2));
  for (const id of gates) {
    const reach = sim.distField(starts, i => sim.vehNbr(i, id).filter(j => usable(j, VEH_GROUND)));
    for (const i of reach.keys()) {
      if (s.ground[i] === G.PARKING && (D.pendingGround.get(i) ?? G.PARKING) === G.PARKING) out.add(i);
    }
  }
  return [...out];
}

// ---- SL-1 public offices on classic lots (consolidated SL-1 spec §5, FCPR OFF-9/OFF-10).
// Public bays: finished Parking in the public lot that cars reach from the street without
// a gate (V2 + V3), with a customer walk to the door. Sorted nearest-first by that walk.
export function publicOfficeBays(sim, office, usable = (i, types) =>
  !sim.D.pendingGround.has(i) || types.has(sim.D.pendingGround.get(i))) {
  const { s, D } = sim;
  const walks = classicOfficeWalkingField(sim, office, usable);
  if (!walks) return { walks: null, bays: [] };
  const starts = Array.from({ length: s.W }, (_, x) => sim.idx(x, s.parcel.y1 + 2));
  const reach = sim.distField(starts, i => sim.vehNbr(i, publicDrive).filter(j => usable(j, VEH_GROUND)));
  const bays = [];
  for (const i of reach.keys()) {
    if (s.ground[i] === G.PARKING && (D.pendingGround.get(i) ?? G.PARKING) === G.PARKING && walks.has(i) &&
      sim.secureSide(i % s.W, Math.floor(i / s.W)) === 'public') bays.push(i);
  }
  bays.sort((a, b) => walks.get(a) - walks.get(b) || a - b);
  return { walks, bays };
}
// Staff reach the yard through a yard-side landing beside the office, or on foot to a gate crossing.
export function publicOfficeStaffRoute(sim, office, usable = () => true) {
  const { s, D } = sim;
  if (sim.yardLanding(office)) return true;
  const door = sim.idx(office.door.x, office.door.y);
  if (!D.walk[0][door]) return false;
  const staff = { kind: 'staff' }, WH = s.W * s.H;
  const field = sim.distField([door], n => sim.pedNbr(n, staff).filter(j => j < WH && !D.shellAt[j] && usable(j, PED_GROUND)));
  for (const i of field.keys()) if (sim.secureSide(i % s.W, Math.floor(i / s.W)) === 'yard') return true;
  return false;
}
export const OFFICE_PUBLIC_PARKING = 'Office needs customer Parking in the public lot, reachable from the street, with a walk to the door.';
export const OFFICE_STAFF_ROUTE = 'Office needs a staff route into the yard: back it onto the security line or connect it to the gate.';
// Opening issues for a public office (empty when it can open).
export function publicOfficeAccess(sim, office, solids = new Set()) {
  const { D } = sim;
  const usable = (i, types) => !solids.has(i) && (!D.pendingGround.has(i) || types.has(D.pendingGround.get(i)));
  const { walks, bays } = publicOfficeBays(sim, office, usable);
  if (!walks) return ['Office entrance needs a clear outdoor pedestrian landing.'];
  const out = [];
  if (!bays.length) out.push(OFFICE_PUBLIC_PARKING);
  if (!publicOfficeStaffRoute(sim, office, usable)) out.push(OFFICE_STAFF_ROUTE);
  return out;
}
