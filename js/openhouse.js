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
    this.color = new THREE.Color();
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
    this.part(o,'ohCrate',cx+side[0]*o.w*.15,.24,cz+side[1]*o.h*.15,w,.36,d,{leased:true});
    this.part(o,'ohTape',cx+side[0]*o.w*.15,.425,cz+side[1]*o.h*.15,w*.16,.018,d,{leased:true});
    this.part(o,'ohCrate',cx-o.dir[0]*o.w*.18,.17,cz-o.dir[1]*o.h*.18,w*.75,.22,d*.8,{leased:true});
    const sofaWidth=Math.min(.85,(o.dir[0]?o.h:o.w)*.52);
    this.part(o,'ohSofa',cx-side[0]*o.w*.15,.19,cz-side[1]*o.h*.15,o.dir[0]?.32:sofaWidth,.25,o.dir[0]?sofaWidth:.32,{leased:true});
    // One toolbox inside a unit with an existing make-ready/repair job.
    this.part(o,'ohTool',cx+o.dir[0]*o.w*.22,.15,cz+o.dir[1]*o.h*.22,.24,.18,.18,{work:true});
  }
  office(o) {
    this.room(o, 1.7, 'office');
    const cx=o.x+o.w/2,cz=o.y+o.h/2,d=o.door.dir;
    this.part(o,'ohCounter',cx,.38,cz,d[0]?.3:Math.min(1.2,o.w*.6),.7,d[0]?Math.min(1.2,o.h*.6):.3);
    this.part(o,'ohScreen',cx,.85,cz,d[0]?.08:.32,.25,d[0]?.32:.08);
    this.part(o,'ohSofa',cx-d[0]*.5,.22,cz-d[1]*.5,.32,.35,.32);
  }
  update() {
    const r=this.r, dx=r.camera.position.x-r.center.x, dz=r.camera.position.z-r.center.z;
    const len=Math.hypot(dx,dz)||1, nx=dx/len,nz=dz/len;
    let key=nx.toFixed(3)+':'+nz.toFixed(3);
    for(const b of this.batches.values())for(const p of b.parts) {
      if(p.wall||p.leased||p.work)key+='|'+p.o.id+':'+p.o.commercial+':'+(p.o.lease||0)+':'+(p.work?this.working(p.o):'');
    }
    if(key===this.key)return; this.key=key;
    for(const b of this.batches.values()) {
      for(let i=0;i<b.parts.length;i++) {
        const p=b.parts[i],o=p.o;
        let h=p.h,y=p.y,visible=true;
        if(p.wall||p.cap) {
          // Facing walls become a low sill as the existing camera rotates.
          // The far walls stay up, giving each unit depth in every orientation.
          const cut=p.nx*nx+p.nz*nz>.1;
          const wallH=cut?.16:(p.cap?p.H:p.h);
          if(p.wall){h=wallH;y=h/2;} else y=wallH+.025;
        }
        if(p.leased)visible=!!o.lease;
        if(p.work)visible=this.working(o);
        this.pos.set(p.x,y+b.f*FLOOR_H,p.z);
        this.scale.set(visible?p.w:0,visible?h:0,visible?p.d:0);
        this.matrix.compose(this.pos,this.q,this.scale);b.mesh.setMatrixAt(i,this.matrix);
        if(p.wall) {
          const target=r.sim.s.scenario?.targets?.find(t=>t.ids?.includes(o.id));
          const mat=p.material==='office'?r.mat.office:target?r.comebackFinish(o,target):(o.num%2?r.mat.unitWall:r.mat.unitWall2);
          b.mesh.setColorAt(i,mat.color);
        }
      }
      b.mesh.instanceMatrix.needsUpdate=true;
      if(b.mesh.instanceColor)b.mesh.instanceColor.needsUpdate=true;
    }
  }
  working(o) {
    return this.r.sim.s.tasks.some(t=>t.obj===o.id && ['makeready','repair'].includes(t.type));
  }
}
