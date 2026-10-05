// Vertical prototype: isolated extension rules; legacy one/two-floor tool quotes are untouched.
import {TOOLS,SIZES,CLIMATE_COST_MULT,POWER,OPEX} from './data.js';
export const MAX_FLOORS=5, RELEASE_FLOORS=3;
export function floorCount(s){return Math.max(2,...Object.values(s.objects).filter(o=>o.type==='shell').map(o=>o.floors||1),s.hall?.length||2);}
export function ensureFloors(s,n){if(!Number.isInteger(n)||n<2||n>MAX_FLOORS)throw Error('Invalid floor count');for(const k of ['hall','dirt'])while(s[k].length<n)s[k].push(new Array(s.W*s.H).fill(0));}
export function served(sim,o){const sh=sim.s.objects[sim.D.shellAt[sim.idx(o.x,o.y)]];return o.servedFloors||Array.from({length:Math.min(2,sh?.floors||1)},(_,i)=>i);}
export function verticalPlan(sim,id,{fitout=true,stairs=false}={}){
 sim.ensure();const s=sim.s,sh=s.objects[id],bad=msg=>({ok:false,msg});
 if(!sh||sh.type!=='shell'||sh.cstate!=='operating')return bad('Select a completed interior building.');
 if(sh.floors>=RELEASE_FLOORS)return bad('Prototype maximum is three floors.');
 if(s.orders.some(o=>o.st==='construction'&&(o.vertical?.shell===id||o.objs.some(k=>{const v=s.objects[k];return v&&sim.D.shellAt[sim.idx(v.x,v.y)]===id;}))))return bad('Finish this building’s existing construction first.');
 const source=sh.floors-1,f=sh.floors,A=sh.w*sh.h,inside=o=>sim.D.shellAt[sim.idx(o.x,o.y)]===id;
 const rows=[],creates=[],tiles=[],add=(label,cost,dur)=>rows.push({label,cost,dur});
 const reserve=4*A*Math.max(0,f+1-(sh.plannedMaxFloors||sh.floors));if(reserve)add('Structural reinforcement',reserve,600+4*A);
 add(`F${f+1} structure`,26*A,600+14*A);
 let elevator=sim.objs('elevator').filter(inside).sort((a,b)=>a.id-b.id)[0],newShaft=null;
 if(!elevator){for(let y=sh.y;y<sh.y+sh.h&&!newShaft;y++)for(let x=sh.x;x<sh.x+sh.w;x++){
 const i=sim.idx(x,y);if(Array.from({length:sh.floors},(_,g)=>g).some(g=>sim.D.unitAt[g][i]||sim.D.roomAt[g][i]))continue;
 if(!Array.from({length:sh.floors},(_,g)=>g).every(g=>[[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>sim.inb(x+dx,y+dy)&&s.hall[g][sim.idx(x+dx,y+dy)]===1)))continue;
 if(sim.D.elevAt[i]||sim.D.stairAt[i])continue;newShaft={type:'elevator',x,y,f:0,cond:1};break;
 }if(!newShaft)return bad('No free shaft column beside the existing halls. Occupied units will not be removed.');
 add('Required freight elevator',9500+1900*Math.max(0,f-1),2160+720*Math.max(0,f-1));creates.push(newShaft);
 }else{if(elevator.cstate!=='operating')return bad('Finish the freight elevator first.');add('Required freight landing extension',1900,720);}
 const stair=stairs?sim.objs('stairs').filter(inside).sort((a,b)=>a.id-b.id)[0]:null;
 if(stairs&&!stair)return bad('No existing stairwell to extend. Stairs are optional; build one separately for redundancy.');
 if(stair)add('Optional stair landing extension',560,240);
 if(fitout){
 for(let y=sh.y;y<sh.y+sh.h;y++)for(let x=sh.x;x<sh.x+sh.w;x++){const i=sim.idx(x,y);if(s.hall[source][i]===1)tiles.push({k:'hall',f,i,v:1});}
 add('Copied hallways',tiles.length*TOOLS.hall.costPerCell,60+tiles.length*5);
 for(const o of Object.values(s.objects).filter(o=>inside(o)&&(o.f||0)===source&&['unit','light','camera'].includes(o.type)&&o.cstate!=='construction')){
 if(o.type==='unit'){if(o.access!=='interior')continue;const tool=Object.values(TOOLS).find(t=>t.access==='interior'&&t.size===o.size);if(!tool)return bad('Unknown unit product.');
 creates.push({type:'unit',x:o.x,y:o.y,w:o.w,h:o.h,dir:[...o.dir],f,size:o.size,access:'interior',env:o.env||'std'});
 add(`${o.size} ${o.env==='climate'?'climate':'standard'} unit`,Math.round(tool.cost*(o.env==='climate'?CLIMATE_COST_MULT:1)),240+110*Math.sqrt(SIZES[o.size].sqft/50));
 }else{creates.push({type:o.type,x:o.x,y:o.y,f,cond:1});add(`F${f+1} ${o.type}`,TOOLS[o.type].cost,120);}
 }
 if(!creates.some(o=>o.type==='unit'))return bad('This floor has no interior unit layout to copy. Choose structure only, then fit it out manually.');
 }
 const occupied=new Set(creates.filter(o=>o.f===0).map(o=>sim.idx(o.x,o.y)));
 const pad=tool=>{for(let y=s.parcel.y0;y<=s.parcel.y1;y++)for(let x=s.parcel.x0;x<=s.parcel.x1;x++){const i=sim.idx(x,y);if(occupied.has(i))continue;const R=sim.plan({tool,a:{x,y},f:0});if(R.status!=='invalid'&&R.creates[0]&&(tool!=='hvac'||R.creates[0].serves===id)){occupied.add(i);creates.push(R.creates[0]);add(`Required ${TOOLS[tool].name}`,R.cost,R.dur);return true;}}return false;};
 const climate=creates.filter(o=>o.type==='unit'&&o.env==='climate').reduce((a,o)=>a+SIZES[o.size].sqft/25,0),hv=sim.D.hvac[id];
 let extraPlants=Math.max(0,Math.ceil((climate+(hv?.load||0)-(hv?.cap||0))/TOOLS.hvac.capacity));
 while(extraPlants-->0)if(!pad('hvac'))return bad('No free HVAC pad beside this building.');
 const power=creates.reduce((a,o)=>a+(POWER.load[o.type]||0),0),P=sim.D.power;
 let extraPower=Math.max(0,Math.ceil((P.demand+power-P.cap)/TOOLS.power.kw));while(extraPower-->0)if(!pad('power'))return bad('No free Electrical Service pad.');
 const shaft=elevator||newShaft,i=sim.idx(shaft.x,shaft.y);
 if(fitout&&![[1,0],[-1,0],[0,1],[0,-1]].some(([dx,dy])=>tiles.some(t=>t.i===sim.idx(shaft.x+dx,shaft.y+dy))))return bad('Copied hallway does not reach the new freight landing.');
 const cost=rows.reduce((a,r)=>a+r.cost,0),unitCreates=creates.filter(o=>o.type==='unit');
 const opex=creates.reduce((n,o)=>n+(o.type==='hvac'?OPEX.hvacPlant:o.type==='power'?OPEX.power:OPEX[o.type]||0)+(o.type==='unit'?OPEX.perUnit+(o.env==='climate'?OPEX.hvacPerClimateCell*SIZES[o.size].sqft/25:0):0),0);
 return {ok:true,opex,shell:id,from:sh.floors,f,fitout,stairs:!!stair,elevator:elevator?.id||null,stair:stair?.id||null,newShaft,creates,tiles,rows,cost,stamp:s.structV,unitCreates,dur:rows.reduce((a,r)=>a+r.dur,0)+30,warning:!fitout?'Structure only; fit-out and commissioning are still required.': 'Copies the existing interior layout and product mix. Commission units after construction; rentals are not guaranteed.'};
}
export function beginVertical(sim,a){const R=verticalPlan(sim,a.shell,a);if(!R.ok)return R;if(a.stamp!==sim.s.structV)return{ok:false,msg:'Building changed. Review a fresh quote.'};if(!sim.unlimited()&&sim.s.cash<R.cost)return{ok:false,msg:'Not enough cash for the reviewed package.'};
 const s=sim.s;ensureFloors(s,R.f+1);s.floorModelVersion=1;
 const ord={id:sim.id(),tool:'vertical',label:`Building ${R.shell} → F${R.f+1}`,cost:R.cost,dur:R.dur,prog:0,st:'construction',objs:[],tiles:R.tiles,t0:s.t,cells:[],vertical:{...R,phase:0,elapsed:0,spent:0,ids:[],stages:[{kind:'reinforce',cost:R.rows[0]?.label==='Structural reinforcement'?R.rows[0].cost:0,dur:R.rows[0]?.label==='Structural reinforcement'?R.rows[0].dur:0},{kind:'structure',cost:26*s.objects[R.shell].w*s.objects[R.shell].h,dur:600+14*s.objects[R.shell].w*s.objects[R.shell].h},{kind:'fitout',cost:R.rows.filter(r=>!['Structural reinforcement',`F${R.f+1} structure`,'Required freight elevator','Required freight landing extension','Optional stair landing extension'].includes(r.label)).reduce((n,r)=>n+r.cost,0),dur:R.rows.filter(r=>!['Structural reinforcement',`F${R.f+1} structure`,'Required freight elevator','Required freight landing extension','Optional stair landing extension'].includes(r.label)).reduce((n,r)=>n+r.dur,0)},{kind:'shaft',cost:(R.newShaft?9500+1900*Math.max(0,R.f-1):1900)+(R.stair?560:0),dur:(R.newShaft?2160+720*Math.max(0,R.f-1):720)+(R.stair?240:0)},{kind:'test',cost:0,dur:30}]}};
 // State contains serializable plans only; passengers and existing equipment are never recreated.
 if(!s.creative)sim.money(-R.cost,'capex',(s.orders.some(o=>o.st==='cancelled'&&o.vertical?.shell===R.shell)?'Recommitment: ':'Commitment: ')+ord.label);s.orders.push(ord);s.lastCommit={order:ord.id,t:s.t};sim.markDirty();sim.emit('commit',{order:ord.id,cells:[]});return{ok:true,order:ord.id,msg:`F${R.f+1} package committed: $${R.cost.toLocaleString()}`};}
function addObjects(sim,ord){const V=ord.vertical,s=sim.s;for(const c of V.creates){if(c===V.newShaft||c.type==='elevator')continue;const o={id:sim.id(),...c,order:ord.id,cond:1,cstate:c.type==='unit'?'built':'operating'};if(o.type==='unit'){const k=s.unitNo.upper++-301;o.num=300+Math.floor(k/99)*1000+(k%99)+1;o.name='Unit '+o.num;o.commercial='none';o.lease=null;}s.objects[o.id]=o;ord.objs.push(o.id);V.ids.push(o.id);}for(const t of ord.tiles)s.hall[t.f][t.i]=1;}
export function tickVertical(sim,ord){const V=ord.vertical,s=sim.s,sh=s.objects[V.shell];if(!sh){cancelVertical(sim,ord);return;}
 const stage=V.stages[V.phase];if(!stage)return;
 const el=V.elevator?s.objects[V.elevator]:null;
 if(stage.kind==='test'){
 if(el&&!el.extensionDrain){el.extensionDrain=true;sim.markDirty();}
 if(el&&(el.riders.length||Math.abs(el.pos-Math.round(el.pos))>1e-6||el.door>0||!sim.works(el))){ord.waiting=true;return;}
 if(el&&!V.testStarted){V.testStarted=true;el.serviceTestUntil=s.t+30;sim.markDirty();}
 }
 ord.waiting=false;V.elapsed++;ord.prog=Math.min(1,(V.stages.slice(0,V.phase).reduce((n,t)=>n+t.dur,0)+V.elapsed)/ord.dur);
 if(V.elapsed<stage.dur)return;
 V.spent+=stage.cost;
 if(stage.kind==='reinforce'){sh.plannedMaxFloors=V.f+1;sh.structuralRightsPaid=(sh.structuralRightsPaid||0)+stage.cost;}
 if(stage.kind==='structure'){sh.floors=V.f+1;sh.plannedMaxFloors=Math.max(sh.plannedMaxFloors||0,sh.floors);}
 if(stage.kind==='fitout')addObjects(sim,ord);
 if(stage.kind==='shaft'&&V.newShaft){const c=V.newShaft,o={id:sim.id(),...c,cstate:'operating',order:ord.id,pos:0,tgt:null,door:0,riders:[],q:[[],[]],cap:4,trips:0,servedFloors:[0,1]};s.objects[o.id]=o;ord.objs.push(o.id);V.ids.push(o.id);V.elevator=o.id;}
 if(stage.kind==='test'){
 const e=s.objects[V.elevator];if(e){e.servedFloors=Array.from({length:sh.floors},(_,i)=>i);while(e.q.length<sh.floors)e.q.push([]);delete e.serviceTestUntil;delete e.extensionDrain;if(sh.floors>2)e.dispatchMode='sweep-v1';}
 if(V.stair&&s.objects[V.stair])s.objects[V.stair].servedFloors=Array.from({length:sh.floors},(_,i)=>i);
 ord.st='done';ord.prog=1;sim.markDirty();sim.ensure();const units=V.ids.map(id=>s.objects[id]).filter(o=>o?.type==='unit');sim.emit('complete',{order:ord.id,label:ord.label,cells:[],units:units.length,ready:units.filter(u=>u.cstate==='ready').length,totalReady:sim.objs('unit').filter(u=>u.cstate==='ready').length});
 }
 V.phase++;V.elapsed=0;sim.markDirty();}
export function verticalRefund(sim,ord){const V=ord.vertical,stage=V.stages[V.phase],undo=sim.s.t-ord.t0<=30&&V.phase===0;const remaining=V.stages.slice(V.phase+1).reduce((n,t)=>n+t.cost,0)+(stage?stage.cost*(1-V.elapsed/Math.max(1,stage.dur)):0);const refundable=undo?ord.cost:remaining,refund=undo?ord.cost:Math.round(remaining*.6);return{undo,refundable,refund,completed:undo?0:ord.cost-remaining,penalty:refundable-refund,retained:undo?0:V.spent,locked:V.phase>=2};}
export function cancelVertical(sim,ord){const detail=verticalRefund(sim,ord),{undo,refund,locked}=detail;if(locked)return{ok:false,msg:'Structure is complete; finish this committed package to preserve usable freight access.'};if(!sim.s.creative)sim.money(refund,'capex','Cancelled: '+ord.label);sim.s.ledger.push({t:sim.s.t,amt:0,cat:'construction_fact',note:`Cancellation penalty: $${detail.penalty.toFixed(2)}`,order:ord.id,penalty:detail.penalty},{t:sim.s.t,amt:0,cat:'construction_fact',note:`Retained prerequisite: $${detail.retained.toFixed(2)}`,order:ord.id,retained:detail.retained});ord.st='cancelled';ord.prog=1;sim.markDirty();return{ok:true,refund,msg:`Cancelled unfinished work; paid reinforcement retained. Refunded $${refund}.`};}
// Directional multi-floor service, leaving the legacy dispatcher intact.
export function sweepElevator(sim,el){const s=sim.s,agent=id=>s.agents.find(a=>a.id===id),floors=served(sim,el),qCalls=[];
 for(let f=0;f<el.q.length;f++){el.q[f]=[...new Set(el.q[f])].filter(id=>{const a=agent(id);return a&&a.elev===el.id&&!a.inElev&&floors.includes(f)&&floors.includes(a.elevDest);});for(const id of el.q[f]){const a=agent(id);qCalls.push({id,f,dest:a.elevDest,t:a.elevT0});}}
 qCalls.sort((a,b)=>a.t-b.t||a.f-b.f||a.id-b.id);
 for(const r of el.riders){const a=agent(r.a);if(a){a.inElev=true;a.f=Math.round(el.pos);a.x=el.x+.5;a.y=el.y+.5;if(a.cart){const c=sim.cartById(a.cart);if(c){c.f=a.f;c.x=a.x;c.y=a.y;}}}}
 if(el.door>0){el.door--;return;}
 if(el.priorityCall&&!qCalls.some(c=>c.id===el.priorityCall))el.priorityCall=null;
 if(!el.priorityCall&&qCalls.some(c=>s.t-c.t>=40))el.priorityCall=qCalls.find(c=>s.t-c.t>=40).id;
 const at=Math.abs(el.pos-Math.round(el.pos))<1e-6,fl=Math.round(el.pos);
 if(at){let changed=false;for(const r of [...el.riders])if(r.dest===fl){el.riders=el.riders.filter(x=>x!==r);const a=agent(r.a);if(a){a.inElev=false;a.elev=null;a.f=fl;a.st=a.prevSt;a.pi++;}changed=true;}
 let priority=qCalls.find(c=>c.id===el.priorityCall),targetCall=priority||qCalls[0];
 if(!el.riders.length){if(targetCall&&targetCall.f!==fl){el.tgt=targetCall.f;el.emptyPickup=targetCall.id;}else if(targetCall){el.direction=Math.sign(targetCall.dest-fl);el.emptyPickup=null;}}
 let used=el.riders.reduce((n,r)=>n+r.slots,0);
 const allow=!el.emptyPickup&&(!priority||(!el.riders.length&&priority.f===fl));
 if(allow)for(const c of qCalls.filter(c=>c.f===fl&&Math.sign(c.dest-fl)===(el.direction||Math.sign(c.dest-fl)))){const a=agent(c.id),slots=a.cart?2:1;if(priority&&!el.riders.length&&c.id!==priority.id)continue;if(used+slots>el.cap)break;el.q[fl]=el.q[fl].filter(id=>id!==c.id);el.riders.push({a:a.id,dest:c.dest,slots});used+=slots;a.inElev=true;a.elevWaited=s.t-a.elevT0;el.avgWait=(el.avgWait||0)*.85+a.elevWaited*.15;sim.wear(el,.0022);el.trips++;changed=true;if(c.id===el.priorityCall){el.priorityCall=null;priority=null;}}
 if(changed){el.door=3;return;}
 if(el.riders.length){const dir=el.direction||Math.sign(el.riders[0].dest-fl);let stops=el.riders.map(r=>r.dest).filter(f=>Math.sign(f-fl)===dir);if(!priority&&used<el.cap)stops.push(...qCalls.filter(c=>Math.sign(c.f-fl)===dir&&Math.sign(c.dest-c.f)===dir).map(c=>c.f));if(!stops.length){el.direction=-dir;stops=el.riders.map(r=>r.dest);}el.tgt=stops.sort((a,b)=>Math.abs(a-fl)-Math.abs(b-fl)||a-b)[0];}
 else if(!targetCall){el.tgt=null;el.emptyPickup=null;}
 }
 if(el.tgt!=null){const dir=Math.sign(el.tgt-el.pos);el.pos=Math.round((el.pos+dir*.1)*1e9)/1e9;if(Math.abs(el.pos-el.tgt)<1e-8){el.pos=el.tgt;el.tgt=null;el.emptyPickup=null;}}
}
// Select a working freight route using deterministic congestion evidence, only for new F3+ trips.
export function freightPath(sim,from,to){const a=sim.unnode(from),b=sim.unnode(to);if(a.f===b.f)return null;const options=[];sim.navNoVertical=true;try{for(const el of sim.objs('elevator').sort((a,b)=>a.id-b.id)){if(!sim.works(el)||el.extensionDrain||el.serviceTestUntil>sim.s.t||!served(sim,el).includes(a.f)||!served(sim,el).includes(b.f))continue;const src=sim.node(a.f,el.x,el.y),dst=sim.node(b.f,el.x,el.y);const left=sim.bfs([from],n=>n===src,n=>sim.pedNbr(n)),right=sim.bfs([dst],n=>n===to,n=>sim.pedNbr(n));if(!left||!right)continue;const slots=el.q.flat().reduce((n,id)=>n+(sim.s.agents.find(a=>a.id===id)?.cart?2:1),0),score=left.length+right.length-2+10*Math.abs(el.pos-a.f)+3*Math.ceil(slots/el.cap)+10*el.riders.reduce((n,r)=>n+Math.abs(r.dest-el.pos),0);options.push({el,score,path:[...left,...right]});}}finally{sim.navNoVertical=false;}options.sort((a,b)=>a.score-b.score||a.el.id-b.el.id);return options[0]?.path||null;}
