// Open House visual adaptation for V62. Scene objects only; no simulation writes,
// commands, RNG, input listeners, storage or wall-clock-driven game events.
import * as THREE from 'three';
import { FLOOR_H } from './data.js';

export const OPEN_HOUSE_SOURCE = Object.freeze({
  baseline: '0385af259c35058da69ed7d6cbb29e2ab7619abb',
  reference: 'EezzyE88/self-storage-tycoon@26e8d4db0a0ad979950bd74804efb4655aacd1ff',
});

// Cream walls, orange doors, teal trim and open-topped miniature rooms are
// adapted from Open House. All dimensions and entrances come from V62 objects.
export class OpenHousePresentation {
  constructor(renderer) {
    this.r = renderer;
    this.batches = new Map();
    this.matrix = new THREE.Matrix4(); this.q = new THREE.Quaternion();
    this.pos = new THREE.Vector3(); this.scale = new THREE.Vector3();
    this.rooms = new Map();
    for (const o of Object.values(renderer.sim.s.objects)) {
      if (o.cstate === 'construction') continue;
      if (o.type === 'unit') this.unit(o);
      if (o.type === 'office') this.office(o);
    }
    for (const b of this.batches.values()) {
      b.mesh = new THREE.InstancedMesh(renderer.geo.box, renderer.mat[b.kind], b.parts.length);
      b.mesh.frustumCulled = false;
      // Batched walls cast shadows; small contents skip a second shadow draw.
      b.mesh.castShadow = b.kind === 'ohWall'; b.mesh.receiveShadow = true;
      renderer.add(b.mesh, b.f, { decoration: 'openHouse', kind: b.kind });
    }
    this.update();
  }
  part(o, kind, x, y, z, w, h, d, extra = {}) {
    this.rooms.set(o.id, o);
    const f = o.f || 0, key = f + ':' + kind;
    if (!this.batches.has(key)) this.batches.set(key, { f, kind, parts: [] });
    this.batches.get(key).parts.push({ o, x, y, z, w, h, d, ...extra });
  }
  room(o, H, material) {
    const cx = o.x + o.w / 2, cz = o.y + o.h / 2, t = .075;
    this.part(o, 'ohFloor', cx, .055, cz, o.w - .06, .09, o.h - .06);
    const dir = o.type === 'office' ? o.door.dir : o.dir;
    // Front is a genuine opening. Two side piers and the existing animated
    // curtain retain V62's access direction; no solid box sits behind the door.
    for (const [nx,nz] of [[0,-1],[0,1],[-1,0],[1,0]]) {
      if (nx === dir[0] && nz === dir[1]) continue;
      const x = cx + nx * (o.w / 2 - t / 2), z = cz + nz * (o.h / 2 - t / 2);
      const w = nx ? t : o.w - .06, d = nz ? t : o.h - .06;
      this.part(o, 'ohWall', x, H / 2, z, w, H, d, { nx, nz, wall: true, material });
      this.part(o, 'ohTrim', x, H + .025, z, w + .025, .05, d + .025, { nx, nz, cap: true, H });
    }
  }
  unit(o) {
    const H = o.access === 'drive' ? 1.25 : 1.05;
    this.room(o, H, 'unit');
    const cx=o.x+o.w/2, cz=o.y+o.h/2, side=[-o.dir[1],o.dir[0]];
    // Contents are representative decoration for an existing lease, never an
    // inventory claim or a new simulation state. Keep them inside the footprint.
    const w=Math.min(.55,o.w*.28), d=Math.min(.5,o.h*.28);
    this.part(o,'ohCrate',cx+side[0]*o.w*.15,.28,cz+side[1]*o.h*.15,w,.36,d,{leased:true});
    this.part(o,'ohTape',cx+side[0]*o.w*.15,.465,cz+side[1]*o.h*.15,w*.16,.018,d,{leased:true});
    this.part(o,'ohCrate',cx-o.dir[0]*o.w*.18,.21,cz-o.dir[1]*o.h*.18,w*.75,.22,d*.8,{leased:true});
    const sofaWidth=Math.min(.85,(o.dir[0]?o.h:o.w)*.52);
    this.part(o,'ohSofa',cx-side[0]*o.w*.15,.225,cz-side[1]*o.h*.15,o.dir[0]?.32:sofaWidth,.25,o.dir[0]?sofaWidth:.32,{leased:true});
    // One toolbox inside a unit with an existing make-ready/repair job.
    this.part(o,'ohTool',cx+o.dir[0]*o.w*.22,.19,cz+o.dir[1]*o.h*.22,.24,.18,.18,{work:true});
  }
  office(o) {
    this.room(o, 1.7, 'office');
    // Leasing, service and moving-supply fit-out. Decoration only: it sells
    // nothing, holds no stock and changes no route, cost, queue or save.
    // Door-relative frame: u = depth inward from the door wall, v = lateral.
    const cx=o.x+o.w/2,cz=o.y+o.h/2,f=o.door.dir,sd=[-f[1],f[0]];
    const D=f[0]?o.w:o.h,L=f[0]?o.h:o.w,hl=L/2,i=.1;
    const box=(kind,u0,u1,v0,v1,y0,h)=>{
      const u=(u0+u1)/2,v=(v0+v1)/2,du=u1-u0,dv=v1-v0;
      this.part(o,kind,cx+f[0]*(D/2-u)+sd[0]*v,y0+h/2,cz+f[1]*(D/2-u)+sd[1]*v,
        Math.abs(f[0])*du+Math.abs(sd[0])*dv,h,Math.abs(f[1])*du+Math.abs(sd[1])*dv);
    };
    const vd=(o.door.x+.5-cx)*sd[0]+(o.door.y+.5-cz)*sd[1],da=vd-.5,db=vd+.5;
    const ws=hl-db>=da+hl?1:-1,shop=-ws,other=ws>0?da+hl:hl-db;
    const lat=(side,a,b)=>side>0?[hl-b,hl-a]:[-hl+a,-hl+b]; // a..b measured in from that side wall
    const B=.1; // floor slab top
    const cf=D-1.5,cb=D-1.05; // counter front/back depth
    // Back of house along the rear wall: stock rack, staff desk, key cabinet.
    box('stair',D-i-.05,D-i,...lat(shop,i,1.2),B,1.3);
    for(const y of [B+.03,B+.48,B+.93]){box('darkMetal',D-.5,D-i-.05,...lat(shop,i,1.2),y-.03,.03);box('ohCrate',D-.46,D-.2,...lat(shop,.18,1.12),y,.32);}
    box('ohCounter',D-.62,D-.18,...[-.55,.55].map(x=>x+(-shop)*.15),B,.42);
    box('ohScreen',D-.4,D-.33,...[-.2,.2].map(x=>x+(-shop)*.15),B+.42,.22);
    box('ohCounter',D-.48,D-i,...lat(ws,i,.8),B,1.0);
    // Service and checkout counter facing the door, with a staff gate at the shop end.
    const [c0,c1]=lat(shop,1,L-.12);
    box('ohCounter',cf,cb,c0,c1,B,.62); box('officeTrim',cf-.03,cb+.03,c0-.03,c1+.03,B+.62,.06);
    const sv=Math.min(c1-.35,Math.max(c0+.35,vd));
    box('ohScreen',cf+.15,cf+.22,sv-.2,sv+.2,B+.68,.24);
    box('ohTape',cf-.05,cf,...lat(ws,.25,.6),B+.25,.3); // lock peg bar on the customer face
    // Supply wall: rack with three shelves of cartons on the shop-side wall.
    const s0=1.05,s1=cf-.15;
    if(s1-s0>=.5){
      box('stair',s0,s1,...lat(shop,i,i+.05),B,1.35);
      const n=Math.max(1,Math.floor((s1-s0)/.45));
      for(const [k,y] of [B+.03,B+.48,B+.93].entries()){
        box('darkMetal',s0,s1,...lat(shop,i+.05,.52),y-.03,.03);
        for(let j=0;j<n;j++){const a=s0+.04+j*(s1-s0)/n,b=a+(s1-s0)/n-.08;box((j+k)%2?'ohTape':'ohCrate',a,b,...lat(shop,.17,.5),y,.32);}
      }
    }
    // Pack-and-protect endcap on the opposite wall, behind the waiting bench.
    const e0=1.75,e1=cf-.15;
    if(e1-e0>=.5){box('stair',e0,e1,...lat(ws,i,.5),B,.5);for(let j=0;j<2;j++){const a=e0+.05+j*(e1-e0)/2;box('ohCrate',a,a+(e1-e0)/2-.1,...lat(ws,.15,.45),B+.5,.24);}}
    // Waiting: two-seat bench against the side wall, with a leaflet stand.
    box('ohSofa',.2,1.6,...lat(ws,i,.42),B,.25); box('ohSofa',.2,1.6,...lat(ws,i,.2),B+.25,.3);
    box('ohTape',1.1,1.3,...lat(ws,.55,.72),B,.45);
    // Window carton pyramid in the front corner, clear of the door landing.
    const pv=other>=.9?lat(-ws,i,.85):[ws>0?db+.1:da-.85,ws>0?db+.85:da-.1];
    const pc=(pv[0]+pv[1])/2;
    for(const [k,r,y,h] of [[0,.37,B,.32],[1,.27,B+.32,.26],[2,.16,B+.58,.22]])
      box(k===2?'ohTape':'ohCrate',.475-r,.475+r,pc-r,pc+r,y,h);
  }
  update() {
    const r=this.r, dx=r.camera.position.x-r.center.x, dz=r.camera.position.z-r.center.z;
    const len=Math.hypot(dx,dz)||1, nx=dx/len,nz=dz/len;
    // Geometry depends on four facing decisions, not rounded camera angles.
    // This detects exact threshold crossings and avoids buffer uploads while
    // rotating within the same cutaway region.
    const cuts = new Set();
    for(const [x,z] of [[0,-1],[0,1],[-1,0],[1,0]])if(x*nx+z*nz>.1)cuts.add(x+':'+z);
    const work = new Set();
    for(const task of r.sim.s.tasks)if(['makeready','repair'].includes(task.type))work.add(task.obj);
    const targets = new Map();
    if(r.sim.s.scenario?.id==='comeback')for(const target of r.sim.s.scenario.targets||[])for(const id of target.ids||[])targets.set(id,target);
    const states = new Map();
    let key=[...cuts].join(',');
    for(const o of this.rooms.values()) {
      const target=targets.get(o.id);
      const mat=o.type==='office'?r.mat.office:target?r.comebackFinish(o,target):(o.num%2?r.mat.unitWall:r.mat.unitWall2);
      const state={leased:!!o.lease,working:work.has(o.id),color:mat.color};
      states.set(o.id,state);
      // Derive the finish from V62's authoritative eligibility, including
      // access, missing services and malformed/replaced target mappings.
      key+='|'+o.id+':'+Number(state.leased)+':'+Number(state.working)+':'+mat.color.getHexString();
    }
    if(key===this.key)return; this.key=key;
    for(const b of this.batches.values()) {
      for(let i=0;i<b.parts.length;i++) {
        const p=b.parts[i],o=p.o;
        let h=p.h,y=p.y,visible=true;
        if(p.wall||p.cap) {
          // Facing walls become a low sill as the existing camera rotates.
          // The far walls stay up, giving each unit depth in every orientation.
          const cut=cuts.has(p.nx+':'+p.nz);
          const wallH=cut?.16:(p.cap?p.H:p.h);
          if(p.wall){h=wallH;y=h/2;} else y=wallH+.025;
        }
        if(p.leased)visible=states.get(o.id).leased;
        if(p.work)visible=states.get(o.id).working;
        this.pos.set(p.x,y+b.f*FLOOR_H,p.z);
        this.scale.set(visible?p.w:0,visible?h:0,visible?p.d:0);
        this.matrix.compose(this.pos,this.q,this.scale);b.mesh.setMatrixAt(i,this.matrix);
        if(p.wall)b.mesh.setColorAt(i,states.get(o.id).color);
      }
      b.mesh.instanceMatrix.needsUpdate=true;
      if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;
    }
  }
}
