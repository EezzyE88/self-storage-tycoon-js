import assert from 'node:assert/strict';
import { companyGoals, companyGoalLevelOffer, toggleCompanyGoalPin, claimCompanyGoal } from '../../js/companygoals.js';
import { makePublicMaple } from '../../js/maple.js';
import { Sim } from '../../js/sim.js';
import { graduate } from './gradrun.mjs';

const fixture = () => {
  const sim = makePublicMaple();
  return {sim, company:{props:[{name:'Maple',sim}],active:0}};
};
const row = (company,id) => companyGoals(company).rows.find(r => r.id === id);
const report = name => console.log('PASS ' + name);

{
  const {sim, company} = fixture();
  assert.equal(companyGoals(company),null);
  sim.s.tut.done = true;
  assert.deepEqual(companyGoals(company).pins.map(r => r.id),['leased-150','small-start:0','profit:0']);
  assert.equal(toggleCompanyGoalPin(company,'cash'),false);
  assert.ok(toggleCompanyGoalPin(company,'profit:0'));
  assert.ok(toggleCompanyGoalPin(company,'cash'));
  assert.equal(sim.s.speed,0);
  report('graduation eligibility and three-pin limit');
}
{
  const {sim, company} = fixture();
  sim.s.tut.done = true;
  assert.equal(row(company,'built-150').current,0);
  for(let i=0;i<750;i++) {
    const id = sim.id();
    const lease = 'fixture-' + id;
    sim.s.objects[id] = {id,type:'unit',x:0,y:0,w:1,h:1,size:'5x5',cstate:'operating',companyBuilt:true,lease};
    sim.s.leases[lease] = {unit:id};
    sim.D.byType.unit.push(sim.s.objects[id]);
  }
  for(const kind of ['built','leased']) for(const target of [150,200,300,500,750]) assert.ok(row(company,kind+'-'+target).earned);
  assert.ok(claimCompanyGoal(company,'built-150','construction'));
  assert.ok(claimCompanyGoal(company,'leased-150','marketing'));
  assert.equal(claimCompanyGoal(company,'leased-150','service'),false);
  for (const u of sim.objs('unit')) delete sim.s.leases[u.lease];
  assert.equal(row(company,'leased-750').current,0);
  assert.ok(row(company,'leased-750').earned);
  const restored = structuredClone(sim.s);
  const replacement = {...company,props:[{name:'Maple',sim:new Sim({...restored,objects:makePublicMaple().s.objects})}]};
  assert.equal(claimCompanyGoal(replacement,'leased-150','marketing'),false);
  assert.equal(replacement.props[0].sim.s.companyGoalCredits.marketing,500);
  report('all ladder rungs, live lease drops and one-time rewards survive serialization');
}
{
  const {sim, company} = fixture();
  sim.s.tut.done = true;
  sim.s.tut.done = false;
  await graduate(sim);
  for (const u of sim.objs('unit').filter(u => u.size==='5x5').slice(0,6)) {
    const id='fixture-'+u.id;
    u.lease=id;
    sim.s.leases[id]={unit:u.id};
  }
  assert.equal(row(company,'small-start:0').current>=6,true);
  assert.ok(claimCompanyGoal(company,'small-start:0','marketing'));
  const openingCash=sim.s.cash;
  assert.ok(sim.dispatch({type:'ad',kind:'size',target:'5x5'}).ok);
  assert.equal(sim.s.cash,openingCash);
  assert.equal(sim.s.today.marketing,250);
  assert.equal(sim.s.ledger.at(-1).cat,'goal_reward');
  sim.s.days=[sim.s.today];
  const creditedResult=sim.opResult(1).amt;
  sim.s.today.other-=250;
  assert.equal(sim.opResult(1).amt,creditedResult);
  assert.equal(sim.s.companyGoalCredits.marketing,0);
  assert.equal(claimCompanyGoal(company,'small-start:0','marketing'),false);
  report('marketing reward books commercial cost and leaves operating profit unchanged');
}
{
  const {sim, company} = fixture();
  sim.s.tut.done = true;
  assert.equal(companyGoalLevelOffer(company),null);
  sim.s.coTier=3;
  assert.equal(companyGoalLevelOffer(company).market,'partner');
  sim.s.companyGoalPartner=true;
  assert.equal(companyGoalLevelOffer(company),null);
  report('regional opportunity is locked before its level and retires after purchase');
}
console.log('4 company goal groups passed');
