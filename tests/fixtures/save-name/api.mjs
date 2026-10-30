// Execute production save/session methods; renderer attachment is explicitly stubbed by callers.
import {Sim,fmtTime} from '../../../js/sim.js';
import {makeMaple,makeEmptyLot} from '../../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,TIERS} from '../../../js/data.js';
import {FINANCIAL_MINUTE} from '../../../js/finance.js';
import {portfolioCareer} from '../../../js/career.js';
import {localsave} from '../../../js/localsave.js';
import {savearchive} from '../../../js/savearchive.js';
const Audio=class{},BUILD={name:'disposable-name-check'},cloud={ok:false,beacon(){},put:async()=>false};
export function saveAPI(main){
 return eval('(()=>{'+main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+
 main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+
 main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+
 main.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+';return game;})()');
}
export {makeMaple,makeSandbox,Sim,localsave};
