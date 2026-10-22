// Inspect actual per-instance tint in Open House, or a solid body in V62.
// This keeps semantic restoration tests independent of mesh batching strategy.
import {pathToFileURL} from 'node:url';
const THREE=await import(pathToFileURL(process.cwd()+'/vendor/three.module.min.js'));
export function restorationViews(r) {
  if(!r.openHouse)return r.anim.filter(a=>a.k==='comeback').map(a=>({...a,colorHex:()=>a.mesh.material.color.getHex()}));
  if(r.sim.s.scenario?.id!=='comeback')return [];
  const out=[];
  for(const target of r.sim.s.scenario.targets||[])for(const id of target.ids||[]){
    for(const b of r.openHouse.batches.values()){
      if(b.kind!=='ohWall')continue;
      const i=b.parts.findIndex(p=>p.o.id===id);if(i<0)continue;
      out.push({target,o:b.parts[i].o,colorHex:()=>new THREE.Color().fromArray(b.mesh.instanceColor.array,i*3).getHex()});break;
    }
  }
  return out;
}
