// Campaign Unit 6: Act III "Improve" (beats 9-12), Act III break and D4 migration.
// Focus: real interior visit + complaint, feedback/satisfaction, Security overlay on->off,
// security fail-forward, climate demand/HVAC/units fail-forward, save/reload semantics,
// lesson registry, tool unlocks and migration from the pre-Act-III graduation.
import assert from 'node:assert/strict';
import { makeMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { TOOLS } from '../../js/data.js';
import { UI } from '../../js/ui.js';
import { BEATS, LESSONS, beatIndex, beatHeader, beatGroup, beatOwnsRequest, curBeat, stepState, syncTutBeat, tutorialTick, toolUnlocked } from '../../js/tutorial.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };
const clone = (x) => JSON.parse(JSON.stringify(x));
const ui = (o={}) => ({tab:null,sel:null,tool:null,plan:null,sectionChoice:null,rend:{view:'ext',overlay:null},...o});
const setBeat = (sim,id,{enter=false}={}) => { const i=beatIndex(id); sim.s.tut.beat=i; sim.s.tut.beatId=id; sim.s.tut.beatAt=i; sim.s.tut.entered=enter; sim.s.tut.enteredAt=sim.s.t; return i; };
const runUntil = (sim, fn, max=5000) => { for(let i=0;i<max&&!fn();i++){sim.step();tutorialTick(sim);} assert.ok(fn(),'expected state reached'); };
const dark = (sim) => sim.s.thoughts.some((t)=>t.kind==='bad'&&t.text==='The hallway is dark.');
const hallLight = (sim) => sim.objs('light').find((l)=>l.x===20&&l.y===8);
const failHall = (sim) => { const L=hallLight(sim); if(sim.works(L)){sim.wear(L,Math.max(0,L.cond-0.19));sim.ensureRepairTask(L);} return L; };
const ACT3=['interior_customer','feedback','overlays','climate'];

test('Act III is beats 9-12 under Improve, then a paused Act III break and graduation',()=>{
  assert.deepEqual(BEATS.map(b=>b.id),['welcome','makeready','lease','money','pricing','actI_break','expand','repair','hire','actII_break',...ACT3,'actIII_break','grad']);
  for(const id of [...ACT3,'actIII_break']){const b=BEATS[beatIndex(id)];assert.equal(b.act,'III');assert.equal(b.chapter,'Improve'); if(ACT3.includes(id)) assert.equal('focus' in b,false,`${id} must not move the camera automatically`);}
  assert.deepEqual(ACT3.map(id=>beatHeader(beatIndex(id))),[9,10,11,12].map(n=>`Act III · Improve · Beat ${n}`));
  assert.equal(beatHeader(beatIndex('actIII_break')),'Act III · Improve · Chapter break');
  assert.deepEqual([...new Set(BEATS.map(beatGroup))],['Act I · Take Over','Act II · Stabilize','Act III · Improve','Graduation']);
  const brk=BEATS[beatIndex('actIII_break')]; assert.equal(brk.pause,true); assert.equal(brk.brk,true); assert.match(brk.why,/feedback records real events/); assert.match(brk.why,/overlays turn hidden systems into visible evidence/);
});

test('D4: active pre-Act-III graduation saves resume from the Act II break; graduated saves stay graduated',()=>{
  const sim=makeMaple(11),t=sim.s.tut; t.beat=10;t.beatId='grad';t.beatAt=10;t.entered=true;syncTutBeat(t,sim.s);assert.equal(t.beatId,'actII_break');assert.equal(t.beat,beatIndex('actII_break'));assert.equal(t.entered,false);
  const legacy=makeMaple(12),lt=legacy.s.tut;delete lt.beatId;delete lt.beatAt;lt.beat=7;lt.entered=true;syncTutBeat(lt);assert.equal(lt.beatId,'actII_break');assert.equal(lt.beat,beatIndex('actII_break'));
  const done=makeMaple(13);done.s.tut={...done.s.tut,on:false,done:true,beat:10,beatId:'grad',beatAt:10};syncTutBeat(done.s.tut,done.s);assert.equal(done.s.tut.beatId,'grad');assert.equal(done.s.tut.done,true);
});

test('Beat 9 reuses the real interior route and a normal big-access visit completes the cart-trip evidence',()=>{
  const sim=makeMaple(21);setBeat(sim,'interior_customer');sim.s.speed=4;tutorialTick(sim);const b=curBeat(sim);assert.match(b.why,/vehicle → loading stall → cart/);assert.ok(sim.s.visits.some(v=>v.kind==='bigaccess'),'authored normal visit');
  sim.dispatch({type:'tutFlag',flag:'corralInspected'});runUntil(sim,()=>!!sim.s.milestones.first_cart_trip,3000);assert.equal(BEATS[beatIndex('interior_customer')].check(sim),true);
  const ff=makeMaple(22);setBeat(ff,'interior_customer',{enter:true});ff.s.tut.flags.corralInspected=true;ff.s.milestones.first_cart_trip=1;assert.equal(BEATS[beatIndex('interior_customer')].check(ff),true,'prior cart trip fail-forwards last step');
});

test('Beat 10 creates no fake complaint: the normal visitor path deterministically records the authored dark-hall condition, then feedback requires reading it',()=>{
  const sim=makeMaple(31);setBeat(sim,'feedback');sim.s.speed=4;tutorialTick(sim);assert.ok(hallLight(sim).cond<0.2,'authored light condition crosses the normal fault threshold');assert.equal(dark(sim),false,'no complaint fabricated at enter');
  runUntil(sim,()=>dark(sim),2500);assert.equal(dark(sim),true);const b=curBeat(sim);assert.equal(b.id,'feedback');assert.equal(stepState(sim,ui()).cur,1,'after complaint, navigate to Operate');assert.equal(stepState(sim,ui({tab:'feedback'})).cur,3,'real feedback sheet reaches read step');
  assert.match(b.steps[3].d,/[0-9]+%<\/b> satisfaction/,'card uses live tenant satisfaction');sim.dispatch({type:'tutFlag',flag:'feedbackAck'});assert.equal(BEATS[beatIndex('feedback')].check(sim),true);
});

test('Beat 11 requires Security overlay on, explicit acknowledgement, then off before improvement; secrisk is lesson-owned',()=>{
  const sim=makeMaple(41);failHall(sim);setBeat(sim,'overlays',{enter:true});const b=BEATS[beatIndex('overlays')];
  assert.equal(stepState(sim,ui({tab:'operate'})).cur,1);assert.equal(stepState(sim,ui({tab:'operate',rend:{view:'ext',overlay:'security'}})).cur,2);
  sim.dispatch({type:'tutFlag',flag:'securityOverlaySeen'});assert.equal(stepState(sim,ui({tab:'operate',rend:{view:'ext',overlay:'security'}})).cur,3,'must turn overlay off');assert.equal(stepState(sim,ui({tab:'operate',rend:{view:'ext',overlay:null}})).cur,4,'normal map returns before responding to the complaint');
  assert.equal(beatOwnsRequest(sim,{key:'secrisk'}),true);assert.equal(beatOwnsRequest(sim,{key:'other'}),false);
  assert.equal(toolUnlocked(sim,'camera'),true);assert.equal(toolUnlocked(sim,'hvac'),false);
});

test('Beat 11 repairs the reported hallway first; an earlier player-built light/camera avoids a duplicate coverage build but never skips overlay diagnosis',()=>{
  const sim=makeMaple(42);setBeat(sim,'overlays',{enter:true});const L=hallLight(sim);sim.wear(L,Math.max(0,L.cond-0.19));sim.ensureRepairTask(L);sim.s.tut.built=[{tool:'camera',f:0,id:999}];
  assert.equal(stepState(sim,ui({tab:'operate'})).cur,1,'prebuilt camera does not skip diagnosis');sim.s.tut.flags.securityOverlaySeen=true;assert.equal(stepState(sim,ui({tab:'operate',rend:{view:'ext',overlay:null}})).cur,4,'after overlay off, the failed hallway still has to be repaired');
  const t=sim.s.tasks.find(x=>x.obj===L.id&&x.type!=='makeready');assert.equal(sim.dispatch({type:'ownerTask',task:t.id}).ok,true);sim.s.speed=4;runUntil(sim,()=>sim.works(L),1200);
  assert.equal(curBeat(sim).id,'climate','prebuilt coverage skips a duplicate build after the real complaint is fixed');assert.equal(BEATS[beatIndex('overlays')].check(sim),true,'repaired hall plus prior completed coverage satisfies the beat');
});

test('Reload mid-overlay never leaves progress stuck: the coach asks to turn Security on again unless the inspection acknowledgement was saved',()=>{
  const sim=makeMaple(43);failHall(sim);setBeat(sim,'overlays',{enter:true});const restored=new Sim(clone(sim.s));
  assert.equal(stepState(restored,ui({tab:'operate',rend:{view:'ext',overlay:null}})).cur,1,'transient overlay is off after reload, so turn-on step returns');
  restored.s.tut.flags.securityOverlaySeen=true;assert.equal(stepState(restored,ui({tab:'operate',rend:{view:'ext',overlay:null}})).cur,4,'saved acknowledgement resumes after the required off state');
});

test('Beat 12 tells the truth about climate demand and unlocks HVAC/interior only when the climate beat begins',()=>{
  const sim=makeMaple(51);setBeat(sim,'overlays',{enter:true});assert.equal(toolUnlocked(sim,'hvac'),false);assert.equal(toolUnlocked(sim,'iu5x5'),false);
  setBeat(sim,'climate',{enter:true});assert.equal(toolUnlocked(sim,'hvac'),true);assert.equal(toolUnlocked(sim,'iu5x5'),true);const b=curBeat(sim);assert.match(b.steps[0].d,/Some shoppers specifically ask for climate control/);assert.doesNotMatch(b.steps[0].d,/shopper[s]? left/);
  sim.s.mkt.lostLog.push({d:sim.day,r:'noClimate',sz:'5x10',climate:true});const live=curBeat(sim);assert.match(live.steps[0].d,/1<\/b> shopper left in the last 14 days/);
});

test('Beat 12 real build path can add HVAC, west-corridor light and climate units, then open them automatically',()=>{
  const sim=makeMaple(52),s=sim.s;s.cash=1e6;setBeat(sim,'climate');tutorialTick(sim);sim.dispatch({type:'tutFlag',flag:'climateDemandAck'});
  for(const a of [{tool:'hvac',a:{x:14,y:8},b:{x:14,y:8},f:0},{tool:'light',a:{x:17,y:8},b:{x:17,y:8},f:0},{tool:'iu5x5',a:{x:16,y:5},b:{x:16,y:11},f:0,axis:'y',climate:true}]){const p=sim.plan(a);assert.notEqual(p.status,'invalid',`${a.tool} plan valid/incomplete`);assert.equal(sim.dispatch({type:'build',...a}).ok,true);}
  s.speed=4;runUntil(sim,()=>!!s.milestones.first_climate,4000);assert.ok(sim.objs('hvac').some(o=>o.cstate==='operating'));assert.ok(sim.objs('unit').some(u=>u.env==='climate'&&u.cstate==='operating'));assert.notEqual(curBeat(sim)?.id,'climate');
});

test('Beat 12 fail-forwards pre-existing HVAC and climate units instead of demanding duplicates',()=>{
  const sim=makeMaple(53),s=sim.s;setBeat(sim,'climate',{enter:true});
  s.objects[s.nextId]={id:s.nextId++,type:'hvac',x:14,y:8,f:0,cstate:'operating',cond:1};
  s.objects[s.nextId]={id:s.nextId++,type:'unit',access:'interior',env:'climate',size:'5x5',x:16,y:5,w:1,h:1,dir:[1,0],f:0,cstate:'operating',commercial:'ready',lease:null,cond:1};
  s.tut.flags.climateDemandAck=true;sim.markDirty();sim.rebuild();const st=stepState(sim,ui({tab:'build'}));assert.ok(st.cur>=7,'HVAC build steps skipped when present');assert.equal(BEATS[beatIndex('climate')].check(sim),true,'existing operating climate unit completes Beat 12');
});

test('Campaign completion records interior/quality/climate lessons as truly completed; legacy graduates are not rewritten',()=>{
  const mark=(id,setup)=>{const sim=makeMaple(61+beatIndex(id));setBeat(sim,id,{enter:true});setup(sim);tutorialTick(sim);return sim;};
  const a=mark('interior_customer',sim=>{sim.s.tut.flags.corralInspected=true;sim.s.milestones.first_cart_trip=1;});assert.ok(a.s.lessonsDone?.interior);
  const b=mark('overlays',sim=>{sim.s.tut.flags.securityOverlaySeen=true;sim.s.tut.built=[{tool:'camera',f:0,id:999}];});assert.ok(b.s.lessonsDone?.quality);
  const c=mark('climate',sim=>{sim.s.milestones.first_climate=1;});assert.ok(c.s.lessonsDone?.climate);
  const legacy=makeMaple(70);legacy.s.tut.on=false;legacy.s.tut.done=true;legacy.s.lessonsDone={};assert.deepEqual(legacy.s.lessonsDone,{},'graduated legacy save keeps optional lessons');
  assert.ok(LESSONS.find(l=>l.id==='interior')&&LESSONS.find(l=>l.id==='quality')&&LESSONS.find(l=>l.id==='climate'));
});

test('Reload during the climate build preserves orders and resumes the climate beat without fabricating completion',()=>{
  const sim=makeMaple(71),s=sim.s;s.cash=1e6;setBeat(sim,'climate');tutorialTick(sim);sim.dispatch({type:'tutFlag',flag:'climateDemandAck'});assert.equal(sim.dispatch({type:'build',tool:'hvac',a:{x:14,y:8},b:{x:14,y:8},f:0}).ok,true);
  const restored=new Sim(clone(s));assert.equal(curBeat(restored).id,'climate');assert.ok(restored.s.orders.some(o=>o.tool==='hvac'&&o.st==='construction'));assert.equal(BEATS[beatIndex('climate')].check(restored),false);
});

// D1-D3 tutorial repairs (2026-11-03).
const title = (sim, u) => { const st = stepState(sim, u); return st.b.steps[st.cur].t.replace(/<[^>]+>/g, ''); };
test('D1 Beat 11: an open Build panel never completes "Improve one weak spot"; the camera/light build sequence does',()=>{
  const sim=makeMaple(81),s=sim.s;s.cash=1e6;setBeat(sim,'overlays',{enter:true});s.tut.flags.securityOverlaySeen=true;s.tut.built=[];
  assert.ok(sim.works(hallLight(sim)),'hall light works in this setup');
  assert.equal(title(sim,ui()),'Improve one weak spot: open Build');
  assert.equal(title(sim,ui({tab:'build'})),'Choose Access & Security','Build open alone is navigation only');
  assert.notEqual(title(sim,ui({tab:'build'})),'Let the improvement finish');
  assert.equal(title(sim,ui({tab:'build',cat:'security'})),'Pick Camera or Light');
  assert.equal(title(sim,ui({tab:'build',cat:'security',tool:'camera'})),'Place it on a weak spot and Confirm');
  assert.equal(title(sim,ui({tab:'build',cat:'security',tool:'light'})),'Place it on a weak spot and Confirm','a Light works too');
  // The real coach (UI.resolveStep) must not tell the player to put the armed Camera/Light away during this sequence.
  const R=(tool)=>({sim,tool,tab:'build',timeLocked:()=>false,placementMismatch:UI.prototype.placementMismatch,stepPlacement:UI.prototype.stepPlacement,root:{}});
  for(const tool of ['camera','light']){const raw=BEATS[beatIndex('overlays')].steps[stepState(sim,ui({tab:'build',cat:'security',tool})).cur];const r=UI.prototype.resolveStep.call(R(tool),raw);
    assert.notEqual(r.redirect,'tool',`armed ${tool}: coach keeps the place step`);assert.equal(r.t,raw.t);}
  let a=null;for(let y=4;y<=16&&!a;y++)for(let x=16;x<=30&&!a;x++){const c={tool:'camera',a:{x,y},b:{x,y},f:0};if(sim.plan(c).status==='valid')a=c;}
  assert.ok(a,'a valid camera cell exists');assert.equal(sim.dispatch({type:'build',...a}).ok,true);
  assert.equal(title(sim,ui({tab:'build'})),'Let the improvement finish','ordered camera advances to the wait step');
  s.speed=4;runUntil(sim,()=>curBeat(sim)?.id!=='overlays',3000);assert.equal(curBeat(sim).id,'climate');
});
test('D2 every coached build category contains the tool it points at; Interior 5x5 is under Units in Act III and the climate lesson',()=>{
  let pairs=0;for(const b of [...BEATS,...LESSONS])for(let i=0;i+1<(b.steps||[]).length;i++){const c=/^\.cats \[data-v="(\w+)"\]$/.exec(b.steps[i].sel||''),t=/^\[data-a="tool"\]\[data-v="(\w+)"\]$/.exec(b.steps[i+1].sel||'');
    if(c&&t){pairs++;assert.equal(TOOLS[t[1]].cat,c[1],`${b.id}: ${t[1]} is not in category ${c[1]}`);}}
  assert.ok(pairs>=8,'category/tool pairs found');
  const sim=makeMaple(82);setBeat(sim,'climate',{enter:true});sim.s.tut.flags.climateDemandAck=true;sim.s.tut.act3Mark=sim.s.nextId;sim.s.tut.built=[{tool:'hvac',f:0,id:9001},{tool:'light',f:0,id:9002}];
  assert.equal(title(sim,ui({tab:'build',cat:'interior'})),'Choose Units');assert.equal(title(sim,ui({tab:'build',cat:'units'})),'Pick Interior 5x5');
});
test('D3 "Turn Climate on" follows the placement review (where the toggle exists) and precedes Confirm, in Act III and the climate lesson',()=>{
  for(const b of [BEATS[beatIndex('climate')],LESSONS.find(l=>l.id==='climate')]){const ts=b.steps.map(st=>st.t.replace(/<[^>]+>/g,''));const k=ts.indexOf('Turn Climate on');
    assert.ok(k>0,b.id);assert.ok(b.steps[k-1].placement&&!b.steps[k-1].sel,`${b.id}: placement step before the toggle`);assert.equal(ts[k+1],'Tap Confirm',b.id);assert.equal(b.steps[k].placement.tool,'iu5x5');}
  const sim=makeMaple(83);setBeat(sim,'climate',{enter:true});sim.s.tut.flags.climateDemandAck=true;sim.s.tut.act3Mark=sim.s.nextId;sim.s.tut.built=[{tool:'hvac',f:0,id:9001},{tool:'light',f:0,id:9002}];
  const u=(o)=>ui({tab:'build',cat:'units',tool:'iu5x5',...o});
  assert.equal(title(sim,u()),'Build climate units along the west corridor','armed with no plan: place first');
  assert.equal(title(sim,u({plan:{status:'valid'}})),'Turn Climate on','review open, climate off: toggle now');
  assert.equal(title(sim,u({plan:{status:'valid'},climate:true})),'Tap Confirm');
});

console.log(`${passed} Act III checks passed`);
