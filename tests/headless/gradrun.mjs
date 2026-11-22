// Headless tutorial completion driver: graduates Maple Street through the real 20 beats. Performs each beat's authored player action via ordinary
// dispatches (the same tutFlag/build/ownerTask/hire/verticalUpgrade actions the UI sends); no state writes except via dispatch.
const R='../..';
const { BEATS, curBeat, installTutorial } = await import(R+'/js/tutorial.js');
const { TOOLS } = await import(R+'/js/data.js');
export async function graduate(sim, log=()=>{}, pace=null){
  const s=sim.s; installTutorial(sim); s.speed=1;
  const did=new Set(); const once=(k,f)=>{if(!did.has(k)){did.add(k);const r=f();log(sim.day,k,r&&r.ok===false?('FAIL '+r.msg):'ok');return r;}};
  const d=(a)=>sim.dispatch(a); const flag=(f)=>d({type:'tutFlag',flag:f});
  const place=(b)=>{for(const st of b.steps)if(st.placement){const P=st.placement;const k=b.id+':'+P.tool+':'+P.a.x+','+P.a.y+':'+P.f;
      if(!did.has(k)){const r=d({type:'build',tool:P.tool,a:P.a,b:P.b,f:P.f||0,axis:P.axis,climate:P.climate});if(r.ok){did.add(k);log(sim.day,k,'built');}else{return false;}}}return true;};
  const answer=()=>{for(const c of [...s.convos]){const i=c.def!=null?c.def:0;if(c.actions&&c.actions[i]){const key=(c.key||'').replace(/\d+$/,'');let j=i;if(key==='cr')j=0;d({type:'convo',id:c.id,i:j});}}};
  const lightSpot=()=>{const p=s.parcel;let best=null;for(let y=p.y0;y<=p.y1;y++)for(let x=p.x0;x<=p.x1;x++){const i=sim.idx(x,y);if(sim.D.lit?.[0]?.[i]>=0.5||sim.D.cam?.[0]?.[i])continue;const pl=sim.plan({tool:'light',a:{x,y},b:{x,y},f:0});if(pl?.status==='valid'&&!pl.warn?.length){best={x,y};return best;}}return best;};
  let guard=0;
  while(!(s.tut.done) && sim.day<60 && guard++<60*24*60){
    sim.step(); sim.events.length=0; s.speed=s.speed||1;
    if(sim.mod%60===0) answer();
    const b=curBeat(sim); if(!b) continue; const id=b.id;
    switch(id){
      case 'welcome': once('welcome',()=>flag('welcome')); break;
      case 'makeready': once('makeready',()=>d({type:'ownerMakeReady',unit:s.unitRoles.mapleTurnover})); break;
      case 'money': once('money',()=>{flag('businessOpened');return flag('moneyAck');}); break;
      case 'pricing': once('pricing',()=>{flag('pricingSeen');return flag('pricingAck');}); break;
      case 'expand': if(place(b)) once('expandAck',()=>flag('buildStatusAck')); break;
      case 'repair': { flag('jobsAck'); const t=s.tasks.find(t=>t.type!=='makeready'&&!t.assigned&&s.objects[t.obj]?.type==='light'); if(t&&!did.has('repair'))once('repair',()=>d({type:'ownerTask',task:t.id})); break; }
      case 'hire': once('hire',()=>{flag('rolesAck');return d({type:'hire',role:'porter'});}); break;
      case 'interior_customer': once('corral',()=>flag('corralInspected')); break;
      case 'feedback': once('feedbackAck',()=>flag('feedbackAck')); break;
      case 'overlays': { flag('securityOverlaySeen'); const L=sim.objs('light').find(l=>l.x===20&&l.y===8); const t=L&&s.tasks.find(t=>t.obj===L.id&&t.type!=='makeready');
        if(t&&!t.assigned&&!did.has('hallfix'))once('hallfix',()=>d({type:'ownerTask',task:t.id}));
        if(!did.has('seclight')&&sim.mod%60===0){const p=lightSpot();if(p){const r=d({type:'build',tool:'light',a:p,b:p,f:0});if(r.ok){did.add('seclight');log(sim.day,'seclight '+p.x+','+p.y,'built');}}}
        break; }
      case 'climate': flag('climateDemandAck'); place(b); break;
      case 'vertical': { if(!did.has('vup')&&sim.mod%60===0){const sh=sim.objs('shell')[0];const q=sim.verticalPlan(sh.id,{fitout:false});
          if(q?.ok&&sim.financialPosition().available>=q.cost+2*TOOLS.hall.costPerCell+TOOLS.light.cost+TOOLS.iu5x10.cost){const r=d({type:'verticalUpgrade',shell:sh.id,fitout:false,stairs:false,stamp:q.stamp});if(r.ok){did.add('vup');log(sim.day,'verticalUpgrade $'+q.cost,'ok');}}}
        if(did.has('vup')&&!s.orders.some(o=>o.st==='construction'&&o.tool!=='hall'&&o.tool!=='light'&&o.tool!=='iu5x10')) place(b); break; }
      case 'collections': if(s.tut.flags.act4Account!=null){flag('act4Seen');once('collAck',()=>flag('collAck'));} break;
      case 'financing': once('fin',()=>{flag('finSeen');return flag('finAck');}); break;
      case 'grad': if(pace&&sim.day<(pace.grad||0))break; once('grad',()=>flag('grad')); break;
      default: if(b.brk){ answer(); if(!s.tut.flags[b.flag] && !(pace&&sim.day<(pace[id]||0))) { flag(b.flag); log(sim.day,id,'continue'); } }
    }
  }
  return s.tut.done;
}
