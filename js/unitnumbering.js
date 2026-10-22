// Property-local display numbers. Object IDs remain the simulation identity.
export const NUMBERING_VERSION = 1;
const units = s => Object.values(s.objects || {}).filter(o => o.type === 'unit');
const floor = o => o.f ?? 0;
export const floorStart = f => {
  if (!Number.isInteger(f) || f < 0 || f > 4) throw Error('Invalid unit floor');
  return (f + 1) * 1000 + 1;
};
export const freshNumbering = () => ({ version: NUMBERING_VERSION, next: [1001,2001,3001,4001,5001], legacy: [] });
const inRange = (n,f) => Number.isInteger(n) && n >= floorStart(f) && n <= floorStart(f) + 998;
export function numberCapacity(s, creates) {
  const needed = [0,0,0,0,0];
  for (const o of creates) if (o.type === 'unit') { floorStart(floor(o)); needed[floor(o)]++; }
  for (let f=0;f<5;f++) if (s.unitNumbering.next[f] + needed[f] > floorStart(f) + 999)
    return { ok:false, msg:`Floor ${f+1} has no remaining unit numbers (maximum ${floorStart(f)+998}).` };
  return { ok:true };
}
export function allocateNumber(s,f) {
  floorStart(f);
  const n=s.unitNumbering.next[f];
  if (!inRange(n,f)) throw Error(`Floor ${f+1} unit numbers exhausted`);
  s.unitNumbering.next[f]++;
  return n;
}
export function reserveNumbers(s,creates) {
  const check=numberCapacity(s,creates); if(!check.ok) throw Error(check.msg);
  for(const o of creates) if(o.type==='unit') o.unitNumber=allocateNumber(s,floor(o));
}
export function nameUnit(s,o,reserved) {
  o.num=reserved ?? allocateNumber(s,floor(o));
  if(!inRange(o.num,floor(o))) throw Error('Unit number does not match its floor');
  o.name='Unit '+o.num; delete o.unitNumber;
}
export function tutorialUnit(sim,role) { return sim.s.objects[sim.s.unitRoles?.[role]]; }
export function currentUnitLabel(s,id,fallback='Unit') {
  const o=s.objects[id];return o?.type==='unit' ? `Unit ${o.num}` : fallback;
}
export function validateNumbering(s) {
  const N=s.unitNumbering;
  if(!N || N.version!==NUMBERING_VERSION || !Array.isArray(N.next) || N.next.length!==5 || !Array.isArray(N.legacy)) throw Error('Unsupported unit numbering');
  const seen=new Set();
  for(const o of units(s)) {
    if(!inRange(o.num,floor(o)) || seen.has(o.num)) throw Error('Duplicate or wrong-floor unit number');
    seen.add(o.num);
  }
  for(const ord of s.orders||[]) if(ord.vertical) {
    const own=new Set((ord.vertical.ids||[]).map(id=>s.objects[id]).filter(o=>o?.type==='unit').map(o=>o.num));
    const reserved=new Set();
    for(const o of ord.vertical.creates||[]) if(o.type==='unit') {
      if(o.unitNumber==null){if(ord.st==='construction'&&ord.vertical.phase<3)throw Error('Missing reserved unit number');continue;}
      if(!inRange(o.unitNumber,floor(o))) throw Error('Invalid reserved unit number');
      if(reserved.has(o.unitNumber))throw Error('Duplicate reserved unit number');reserved.add(o.unitNumber);
      if(own.has(o.unitNumber)) continue;
      // Finished/cancelled order records are historical; their numbers remain retired.
      if(ord.st!=='construction') continue;
      if(seen.has(o.unitNumber)) throw Error('Duplicate reserved unit number');
      seen.add(o.unitNumber);
    }
  }
  for(let f=0;f<5;f++) {
    const n=N.next[f];
    if(!Number.isInteger(n)||n<floorStart(f)||n>floorStart(f)+999||[...seen].some(x=>inRange(x,f)&&x>=n)) throw Error('Invalid unit number counter');
  }
  return true;
}
export function normalizeNumbering(s) {
  if(s.unitNumbering) { validateNumbering(s);return; }
  const list=units(s).sort((a,b)=>floor(a)-floor(b)||(Number.isFinite(a.num)?a.num:Infinity)-(Number.isFinite(b.num)?b.num:Infinity)||a.id-b.id);
  // Capture authored roles before display numbers change. IDs survive migration.
  const roles={...s.unitRoles};
  if(s.market?.id==='maple') {
    roles.mapleTurnover ??= list.find(o=>o.num===107)?.id;
    roles.mapleInteriorMoveout ??= list.find(o=>o.num===203)?.id;
  }
  // Prepare the complete migration on a temporary number map before mutating.
  const N=freshNumbering(), map=new Map();
  for(const o of list) {
    const f=floor(o);floorStart(f); const n=N.next[f]++;
    if(!inRange(n,f))throw Error(`Too many units on Floor ${f+1}`);
    map.set(o.id,n);N.legacy.push({id:o.id,old:o.num??null,num:n});
  }
  const reservations=[];
  for(const ord of s.orders||[]) if(ord.st==='construction'&&ord.vertical&&ord.vertical.phase<3)
    for(const o of ord.vertical.creates||[]) if(o.type==='unit') {
      const f=floor(o),n=N.next[f]++;if(!inRange(n,f))throw Error(`Too many units on Floor ${f+1}`);reservations.push([o,n]);
    }
  const targets=[];
  for(const t of s.scenario?.id==='comeback'?s.scenario.targets||[]:[]) {
    let n=(t.ids||[t.id]).map(id=>map.get(id)).find(n=>n!=null);
    if(n==null) {const f=t.f??0;n=N.next[f]++;if(!inRange(n,f))throw Error('Too many reserved scenario numbers');}
    targets.push([t,n]);
  }
  s.unitNumbering=N;s.unitRoles=roles;
  for(const o of list) {const old=o.num;o.num=map.get(o.id);if(!o.name||o.name===`Unit ${old}`)o.name=`Unit ${o.num}`;}
  for(const [o,n] of reservations)o.unitNumber=n;
  for(const [t,n] of targets)t.num=n;
  // Only active, ID-linked labels are refreshed. Historical financial text is untouched.
  for(const t of s.tasks||[]) if(s.objects[t.obj]?.type==='unit') {
    const old=N.legacy.find(x=>x.id===t.obj)?.old;
    if(Number.isInteger(old))t.label=t.label?.replace(new RegExp(`\\bUnit ${old}\\b`,'g'),currentUnitLabel(s,t.obj));
  }
  for(const c of s.convos||[]) if(s.objects[c.obj]?.type==='unit') {
    const old=N.legacy.find(x=>x.id===c.obj)?.old;
    if(Number.isInteger(old))c.text=c.text?.replace(new RegExp(`\\bUnit ${old}\\b`,'g'),currentUnitLabel(s,c.obj));
  }
  validateNumbering(s);
}
