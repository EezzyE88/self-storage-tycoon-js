// Actual production review handlers and transaction engine; no rendered-device claim.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {UI} from '../../js/ui.js';
import {Sim,fmtTime} from '../../js/sim.js';
import {makeMaple} from '../../js/maple.js';
import {makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName} from '../../js/scenarios.js';
import {MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS} from '../../js/data.js';
import {FINANCIAL_MINUTE} from '../../js/finance.js';
import {portfolioCareer} from '../../js/career.js';
import {installTutorial} from '../../js/tutorial.js';
import {localsave} from '../../js/localsave.js';
import {savearchive} from '../../js/savearchive.js';
const main=readFileSync('js/main.js','utf8');
function fixture(speed=0) {
 const ctx=vm.createContext({Sim,fmtTime,makeMaple,makeSandbox,makeScenario,SCENARIOS,modeLabel,sandboxName,MARKETS,ROLES,MIN_PER_DAY,FLOOR_H,TIERS,FINANCIAL_MINUTE,portfolioCareer,installTutorial,localsave,savearchive,cloud:{ok:false},Audio:class{},performance,console,BUILD:{name:'financial-context'},CompressionStream,DecompressionStream,Response,Blob,btoa,atob,escape,unescape,encodeURIComponent,decodeURIComponent});
 vm.runInContext(main.slice(main.indexOf('const game = {'),main.indexOf('// initial world'))+main.slice(main.indexOf('const WORKING_FLOAT'),main.indexOf('// Save codes'))+main.slice(main.indexOf('function validState('),main.indexOf('function makeMapleSeedPrice'))+main.match(/function makeMapleSeedPrice\(day\) \{[^\n]+/)[0]+'\nglobalThis.game=game;',ctx);
 const g=ctx.game,A=makeSandbox({start:'starter',cash:75000}),B=makeSandbox({cash:5000});A.s.speed=speed;A.s.coTier=3;A.s.tut={on:false,done:true};A.s.convos=[];
 g.sim=A;g.company={props:[{name:'Maple & Main',sim:A},{name:'Lot <Two>',sim:B}],active:0,feed:[]};
 const nodes={},el=()=>({innerHTML:'',textContent:'',attrs:{},classList:{add(){},remove(){},toggle(){}},querySelector(){return null;},querySelectorAll(){return[];},setAttribute(k,v){this.attrs[k]=v;},closest(){return null;}});
 const ui=Object.create(UI.prototype);ui.g=g;ui.title=false;ui.$=id=>nodes[id]||=el();g.ui=ui;g.audio={unlock(){},play(){}};
 g.rend={view:'ext',rot:2,zoom:1.2,target:{x:7,y:9}};
 ui.sfx=()=>{};ui.toast=(...args)=>{ui.lastToast=args[0];};ui.renderTut=()=>{};ui.renderSheet=()=>{};ui.renderActionBar=()=>{};
 let saves=0,saved;g.autosavePaused=()=>{if(g.sim.s.speed===0){saves++;saved=JSON.parse(g.saveJSON());}};
 return {g,ui,A,B,nodes,get saves(){return saves;},get saved(){return saved;}};
}
const snapshot=f=>f.g.saveJSON();
function click(f,a,v,extra={}){f.ui.onClick({target:{closest:()=>({dataset:{a,v,...extra},closest:()=>null})}});}
const review=f=>click(f,'transfer','10000',{from:'0',to:'1'});
const confirm=f=>click(f,'transferConfirm',f.ui.transferReview?.token);

export {fixture,snapshot,click,review,confirm};
