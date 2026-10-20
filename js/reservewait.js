// Session-only clock controller. Quotes, simulation, spending and saves retain their ordinary owners.
import { yardQuote } from './yardloop.js';
import { unitInService } from './comeback.js';

export class ReserveWait {
  constructor(onStop = () => {}) { this.onStop = onStop; this.active = null; this.pending = null; }
  matches(args) {
    const a=(this.active||this.pending)?.args;
    const key=p=>JSON.stringify([p.tool,p.a.x,p.a.y,p.b.x,p.b.y,p.axis,p.f||0,!!p.flip,!!p.climate,!!p.rush]);
    return !!a&&!!args?.a&&!!args?.b&&key(a)===key(args);
  }
  start(sim, offer) {
    if(this.active)return {ok:false,msg:'Stop the current wait first.'};
    if(this.pending){
      if(this.matches(offer.args))return this.resume(sim);
      return {ok:false,msg:'Resume or end the selected investment wait before choosing another.'};
    }
    const args=structuredClone(offer.args), q=yardQuote(sim,args);
    if(!q||q.plan.cost!==offer.plan.cost||q.daily!==offer.daily)return {ok:false,msg:'This proposal changed. Review it again.'};
    if(q.position.available>=0)return {ok:false,ready:true,msg:'Reserve is already covered. Preview the investment.'};
    this.active={sim,args,cost:q.plan.cost,daily:q.daily,size:q.size,started:sim.s.t,quote:q};
    const reason=this.problem(sim,[]);
    if(reason){this.interrupt(reason);return {ok:false,msg:reason};}
    sim.dispatch({type:'speed',v:4});
    return {ok:true};
  }
  stop(reason) {
    const a=this.active||this.pending;if(!a)return false;
    this.active=null;this.pending=null;a.sim.dispatch({type:'speed',v:0});this.onStop(reason,a);return true;
  }
  interrupt(reason) {
    const a=this.active;if(!a)return false;
    this.active=null;this.pending=a;a.reason=reason;
    a.sim.dispatch({type:'speed',v:0});this.onStop(reason,a);return true;
  }
  existingVacancy(sim,a) {
    return sim.objs('unit').some(u=>u.size===a.size&&u.env==='std'&&unitInService(sim.s,u)&&u.commercial==='ready');
  }
  proposalReason(sim,a) {
    return this.existingVacancy(sim,a)?`Lease the existing ${a.size} space first.`:'Placement or supporting demand changed. Review this investment.';
  }
  review(sim) {
    const a=this.pending;if(!a)return null;
    if(a.sim!==sim)return {a,blocked:true,kind:'property',reason:'Property changed.'};
    if(sim.s.t-a.started>=7*1440)return {a,blocked:true,kind:'expired',reason:'Original seven-day wait ended. Review the investment again.'};
    const quote=yardQuote(sim,a.args);
    if(!quote)return {a,blocked:true,kind:this.existingVacancy(sim,a)?'vacancy':'proposal',reason:this.proposalReason(sim,a)};
    if(quote.plan.cost!==a.cost||quote.daily!==a.daily)return {a,quote,blocked:true,kind:'proposal',reason:'The investment quote changed. Review its costs.'};
    const reason=this.problem(sim,[]);
    if(reason)return {a,quote,blocked:true,kind:sim.s.convos.some(c=>!c.staffHandling)?'decision':sim.financialPosition().netLiquid<0?'financial':'work',reason};
    return {a,quote,blocked:false,ready:quote.position.available>=0,reason:a.reason};
  }
  resume(sim) {
    if(this.active)return {ok:false,msg:'Waiting is already running.'};
    const r=this.review(sim);if(!r)return {ok:false,msg:'No interrupted investment wait.'};
    r.a.sim.dispatch({type:'speed',v:0});
    if(r.kind==='property'){this.stop(r.reason);return {ok:false,msg:r.reason};}
    if(r.blocked)return {ok:false,msg:r.reason};
    r.a.quote=r.quote;
    if(r.ready){r.a.ready=true;this.stop('Reserve covered. Preview the investment when ready.');return {ok:false,ready:true,args:structuredClone(r.a.args)};}
    this.active=r.a;this.pending=null;sim.dispatch({type:'speed',v:4});return {ok:true};
  }
  problem(sim, events) {
    if(sim.s.convos.some(c=>!c.staffHandling))return 'An owner decision needs attention.';
    if(events.some(e=>['access_lost','power_shed','moveout','scenario_end'].includes(e.type)))return 'An operating change needs review.';
    if(events.some(e=>e.type==='fault'&&e.sev==='critical'))return 'Critical equipment needs attention.';
    if(sim.objs('unit').some(u=>u.cstate==='operating'&&u.blocked))return 'Unit access needs attention.';
    if(Object.values(sim.s.objects).some(o=>o.unpowered||['elevator','hvac'].includes(o.type)&&o.cond<0.2))return 'Equipment service needs attention.';
    if(sim.financialPosition().netLiquid<0)return 'Cash no longer covers committed obligations.';
    for(const t of sim.s.tasks){
      if(t.unreachable)return 'Work access needs attention.';
      if(t.assigned||t.queued||t.vendor)continue;
      if(sim.ownerAutoRepairCovered(t))continue;
      const d=sim.taskDelegation(t);
      // Offshift/capacity describe a delay, not proof that staff can eventually take this job.
      // Check permanent prerequisites separately without changing ordinary task assignment.
      const coverage=d?.role&&sim.s.staff.some(st=>st.role===d.role&&sim.s.agents.some(a=>a.kind==='staff'&&a.sid===st.id));
      if((t.need==='carts'&&!sim.s.policies.porterCarts)||!coverage||!sim.objs('office').some(o=>o.cstate==='operating'))return 'Uncovered work needs your decision.';
      if(!d||['missing','route','policy','office'].includes(d.status))return 'Uncovered work needs your decision.';
    }
    return null;
  }
  check(sim, events=[]) {
    const a=this.active;if(!a)return;
    if(a.sim!==sim)return this.stop('Property changed.');
    const q=yardQuote(sim,a.args);
    if(q)a.quote=q;
    const reason=this.problem(sim,events);if(reason)return this.interrupt(reason);
    if(!q)return this.interrupt(this.proposalReason(sim,a));
    if(q.plan.cost!==a.cost||q.daily!==a.daily)return this.interrupt('The investment quote changed. Review its costs.');
    a.quote=q;
    if(q.position.available>=0){a.ready=true;return this.stop('Reserve covered. Preview the investment when ready.');}
    if(sim.s.t-a.started>=7*1440)return this.stop('Seven-day wait ended. Reserve is still short.');
    if(sim.s.speed!==4)return this.stop('Waiting stopped.');
  }
}
