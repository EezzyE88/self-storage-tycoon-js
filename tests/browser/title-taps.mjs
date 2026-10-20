// Real UI constructor, DOM, delegation and dialogs. Renderer/persistence boundaries are doubles.
// No storage imports, game loop or user saves. All state is disposable and in memory.
import {UI} from '../../js/ui.js';
import {makeMaple} from '../../js/maple.js';
const params=new URLSearchParams(location.search);
if(params.has('before'))document.querySelector('#game-css').href='../../before.css';
const sim=makeMaple(3);sim.s.speed=0;sim.s.tut={on:false,done:true};
const calls={newGame:[],loads:0,map:0};let playing=false;
const game={sim,BUILD:{name:'isolated UI click fixture'},
 audio:{unlock(){},play(){}},
 rend:{view:'ext',setPreview(){},setSelection(){},setView(v){this.view=v},lookAt(){},faceYardExtension(){}},
 localsave:{ok:true,getKept:()=>null},savearchive:{list:()=>[],wouldDrop:()=>null},
 playing:()=>playing,saveMeta:()=>({name:'Disposable company',day:1}),outgoingMeta:()=>null,
 newGame(kind){calls.newGame.push(kind);playing=true;publish();},
 loadCode:async()=>{calls.loads++;playing=true;publish();return true;}
};
const ui=new UI(game);game.ui=ui;
ui.renderTut=()=>{};ui.toast=()=>{};ui.frameOutline=()=>false;
const publish=()=>{document.querySelector('#qa-status').textContent=JSON.stringify({speed:sim.s.speed,time:sim.s.t,...calls});};
// Publish after production handlers without replacing or invoking their click methods.
document.addEventListener('click',()=>queueMicrotask(publish));
document.querySelector('#view').addEventListener('click',()=>{calls.map++;publish();});
if(params.has('saved')){ui.contSave={code:'DISPOSABLE_CALLBACK_ONLY',at:Date.now()/1000,meta:{name:'Disposable company',day:1,cash:sim.s.cash}};ui.showTitle();}
if(params.get('mode')==='play'){ui.closeModal();playing=true;}
if(params.get('mode')==='credit'){
 ui.closeModal();playing=true;ui.tool='du5x10';ui.planArgs={a:{x:13,y:21},b:{x:13,y:21},axis:'y'};
 ui.replan();ui.fundingContext={sim,args:structuredClone(ui.plan.args)};ui.showCreditReview(500);
}
publish();
