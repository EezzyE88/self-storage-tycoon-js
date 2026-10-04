// Read-only presentation of authoritative unit and vehicle state.
import { G } from './data.js';
export function unitStatus(u) {
  if (u.cstate === 'construction') return 'construction';
  if (u.blocked) return 'blocked';
  if (u.cstate !== 'operating') return 'commission';
  return ({ready:'available',occupied:'occupied',reserved:'reserved',unready:'turnover'})[u.commercial] || 'commission';
}
export const UNIT_STATUS = {
  available: {label:'Available',mark:'+',color:'#3b916e'},
  occupied: {label:'Occupied',mark:'●',color:'#536777'},
  reserved: {label:'Reserved',mark:'H',color:'#81669e'},
  turnover: {label:'Turnover',mark:'◇',color:'#ba8b37'},
  blocked: {label:'Blocked',mark:'×',color:'#b45448'},
  commission: {label:'Commission',mark:'?',color:'#477a99'},
  construction: {label:'Building',mark:'/',color:'#9b917b'},
};
export function loadingStatus(sim) {
  // chooseDest reserves v.dest before arrival, so a travelling vehicle owns its bay.
  const taken = new Set(sim.s.vehicles.filter(v=>v.dest != null).map(v=>v.dest));
  const result=[];
  for(let i=0;i<sim.s.ground.length;i++) if(sim.s.ground[i]===G.LOADING) {
    result.push({i,x:i%sim.s.W,y:Math.floor(i/sim.s.W),state:!sim.D.vehReach[i] || !sim.D.walk[0][i] ? 'inaccessible' : taken.has(i) ? 'occupied' : 'free'});
  }
  return result;
}
