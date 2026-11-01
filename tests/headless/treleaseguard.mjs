// Controlled CPU fixture for the hold-release click guard. Not rendered browser or physical Safari evidence.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {createReleaseGuard, RELEASE_GUARD_MS, RELEASE_GUARD_PX} from '../../js/releaseguard.js';
let checks=0;const test=(n,f)=>{f();console.log('PASS '+n);checks++};
const inReview={closest:s=>s==='#abar .unit-review'?{}:null}, outside={closest:()=>null};
const click=(x=100,y=100,extra={})=>({isTrusted:true,detail:1,clientX:x,clientY:y,target:inReview,...extra});
const guard=(open=true)=>{const c={t:0,open};const g=createReleaseGuard({now:()=>c.t,isReviewTarget:t=>!!(t&&t.closest&&t.closest('#abar .unit-review')),isReviewOpen:()=>c.open});return{g,c}};

// ---- pure guard rules
test('unarmed guard never swallows',()=>{const {g}=guard();assert.equal(g.click(click()),false)});
test('release click inside review at release point is swallowed exactly once',()=>{const {g}=guard();g.arm(100,100);assert.equal(g.click(click()),true);assert.equal(g.isArmed(),false);assert.equal(g.click(click()),false)});
test('keyboard/programmatic/assistive click (detail 0) is never swallowed and spends the guard',()=>{const {g}=guard();g.arm(100,100);assert.equal(g.click(click(100,100,{detail:0})),false);assert.equal(g.click(click()),false)});
test('untrusted script click is never swallowed',()=>{const {g}=guard();g.arm(100,100);assert.equal(g.click(click(100,100,{isTrusted:false})),false)});
test(`click farther than ${RELEASE_GUARD_PX}px is not swallowed; boundary is inclusive`,()=>{let {g}=guard();g.arm(100,100);assert.equal(g.click(click(100+RELEASE_GUARD_PX+0.5,100)),false);({g}=guard());g.arm(100,100);assert.equal(g.click(click(100+RELEASE_GUARD_PX,100)),true)});
test(`expiry after ${RELEASE_GUARD_MS}ms; boundary is inclusive`,()=>{let {g,c}=guard();g.arm(100,100);c.t=RELEASE_GUARD_MS+1;assert.equal(g.click(click()),false);({g,c}=guard());g.arm(100,100);c.t=RELEASE_GUARD_MS;assert.equal(g.click(click()),true)});
test('click outside the review sheet is not swallowed',()=>{const {g}=guard();g.arm(100,100);assert.equal(g.click(click(100,100,{target:outside})),false);const h=guard().g;h.arm(100,100);assert.equal(h.click(click(100,100,{target:null})),false)});
test('arming is refused unless the rendered review sheet exists',()=>{const {g}=guard(false);assert.equal(g.arm(100,100,7,'touch'),false);assert.equal(g.isArmed(),false);assert.equal(g.click(click()),false)});
test('arming keeps the originating pointer identity and release point',()=>{const {g}=guard();assert.equal(g.arm(100,120,7,'pen'),true);assert.deepEqual(g.armedFrom(),{pointerId:7,pointerType:'pen',x:100,y:120});g.clear();assert.equal(g.armedFrom(),null)});
test('clear() (pointerdown/keydown/cancel/blur/hidden) disarms without swallowing',()=>{const {g}=guard();g.arm(100,100);g.clear();assert.equal(g.click(click()),false)});

// ---- arming inside the real up() handler (same main.js slice as tgestures.mjs)
const main=readFileSync('js/main.js','utf8');
const code=main.slice(main.indexOf('const ptrs ='),main.indexOf("canvas.addEventListener('contextmenu'"));
function fixture({plan=true}={}){let now=0,id=0;const timers=new Map(),events={},armed=[];const canvas={addEventListener:(n,f)=>events[n]=f,setPointerCapture:()=>{}};
 const ui={tool:'du5x5',title:false,plan:null,buildPlacing:false,modalOpen:()=>false,safeRect:()=>undefined,tapMap(){},placeStart(){ui.buildPlacing=true;ui.plan=plan?{}:null},placeMove(){},finishPlacement(){ui.buildPlacing=false},cancelPlacement(){ui.buildPlacing=false;ui.plan=null}};
 const game={audio:{unlock(){}},ui,rend:{cellAt:()=>({x:2,y:2}),doubleTapZoom(){},zoomBy(){},pan(){}},releaseGuard:{arm:(x,y,id,type)=>armed.push([x,y,id,type])}};
 vm.runInNewContext(code,{canvas,game,document:{addEventListener(){}},performance:{now:()=>now},setTimeout:(f,d)=>{timers.set(++id,{f,t:now+d});return id},clearTimeout:i=>timers.delete(i)});
 const advance=n=>{now+=n;for(const [i,x] of [...timers])if(x.t<=now){timers.delete(i);x.f()}};
 const fire=(type,x=100,y=100,extra={})=>events[type]({type,clientX:x,clientY:y,pointerId:1,button:0,pointerType:'touch',target:canvas,timeStamp:now,...extra});
 return{ui,armed,fire,advance};}
test('completed touch hold that opens a review arms at the release point',()=>{const f=fixture();f.fire('pointerdown');f.advance(300);f.fire('pointerup',100,100);assert.deepEqual(f.armed,[[100,100,1,'touch']])});
test('pen hold arms; mouse placement never arms',()=>{let f=fixture();f.fire('pointerdown',100,100,{pointerType:'pen'});f.advance(300);f.fire('pointerup',100,100,{pointerType:'pen'});assert.equal(f.armed.length,1);f=fixture();f.fire('pointerdown',100,100,{pointerType:'mouse'});f.fire('pointerup',100,100,{pointerType:'mouse'});assert.equal(f.armed.length,0)});
test('cancelled or lost-capture hold never arms',()=>{for(const t of ['pointercancel','lostpointercapture']){const f=fixture();f.fire('pointerdown');f.advance(300);f.fire(t);assert.equal(f.armed.length,0)}});
test('short tap whose hold timer fired late is reverted and never arms',()=>{const f=fixture();f.fire('pointerdown',100,100,{timeStamp:0});f.advance(241);f.fire('pointerup',100,100,{timeStamp:40});assert.equal(f.armed.length,0)});
test('quick tap and quick drag (pan) never arm',()=>{let f=fixture();f.fire('pointerdown');f.fire('pointerup');f.advance(400);assert.equal(f.armed.length,0);f=fixture();f.fire('pointerdown');f.fire('pointermove',140,100);f.fire('pointerup',140,100);assert.equal(f.armed.length,0)});
test('hold that leaves no review (no plan) never arms',()=>{const f=fixture({plan:false});f.fire('pointerdown');f.advance(300);f.fire('pointerup');assert.equal(f.armed.length,0)});

// ---- real listener wiring (window/document capture listeners in main.js)
const wire=main.slice(main.indexOf('// Swallow only the browser'),main.indexOf('// iPhone Safari ignores'));
function wired(){const win={},doc={};const c={t:0,open:true};const game={};const winObj={addEventListener:(n,f,o)=>(win[n]??=[]).push({f,o})};const obs=[];
 const abar={querySelector:s=>s==='.unit-review'&&c.open?{}:null};
 class MutationObserver{constructor(cb){this.cb=cb;obs.push(this)}observe(t,o){this.target=t;this.opts=o}}
 vm.runInNewContext(wire,{game,createReleaseGuard,MutationObserver,performance:{now:()=>c.t},window:winObj,document:{addEventListener:(n,f)=>(doc[n]??=[]).push(f),getElementById:id=>id==='abar'?abar:null,querySelector:s=>s==='#abar .unit-review'&&c.open?{}:null}});
 const ev=(o)=>{const e={isTrusted:true,detail:1,clientX:100,clientY:100,target:inReview,prevented:false,stopped:false,preventDefault(){this.prevented=true},stopPropagation(){this.stopped=true},...o};return e};
 return{game,win,doc,c,ev,winObj,obs,clickE:o=>{const e=ev(o);win.click[0].f(e);return e}};}
test('click listener is window capture, non-passive; clear listeners are capture',()=>{const w=wired();assert.equal(w.win.click[0].o.capture,true);assert.equal(w.win.click[0].o.passive,false);for(const n of ['pointerdown','keydown','pointercancel','blur'])assert.equal(w.win[n][0].o.capture,true);assert.equal(w.doc.visibilitychange.length,1)});
test('wired: armed release click is prevented and stopped once; next click untouched',()=>{const w=wired();w.game.releaseGuard.arm(100,100);let e=w.clickE();assert.ok(e.prevented&&e.stopped);e=w.clickE();assert.ok(!e.prevented&&!e.stopped)});
test('wired: deliberate tap (pointerdown first) is never swallowed',()=>{const w=wired();w.game.releaseGuard.arm(100,100);w.win.pointerdown[0].f({});const e=w.clickE();assert.ok(!e.prevented&&!e.stopped)});
test('wired: keyboard activation (keydown then detail-0 click) is never swallowed',()=>{const w=wired();w.game.releaseGuard.arm(100,100);w.win.keydown[0].f({});let e=w.clickE({detail:0});assert.ok(!e.prevented);const v=wired();v.game.releaseGuard.arm(100,100);e=v.clickE({detail:0,clientX:0,clientY:0});assert.ok(!e.prevented)});
test('wired: window blur and page hide disarm; element blur does not',()=>{let w=wired();w.game.releaseGuard.arm(100,100);w.win.blur[0].f({target:{}});assert.equal(w.game.releaseGuard.isArmed(),true);w.win.blur[0].f({target:w.winObj});assert.equal(w.game.releaseGuard.isArmed(),false);w=wired();w.game.releaseGuard.arm(100,100);w.doc.visibilitychange[0]();assert.equal(w.game.releaseGuard.isArmed(),false)});
test('wired: closing the review disarms explicitly; a requote that keeps the sheet does not',()=>{const w=wired();assert.equal(w.obs.length,1);assert.deepEqual({...w.obs[0].opts},{childList:true,subtree:true});w.game.releaseGuard.arm(100,100,1,'touch');w.obs[0].cb([]);assert.equal(w.game.releaseGuard.isArmed(),true);w.c.open=false;w.obs[0].cb([]);assert.equal(w.game.releaseGuard.isArmed(),false);assert.equal(w.game.releaseGuard.arm(100,100,1,'touch'),false)});
test('wired: pointercancel and expiry disarm',()=>{let w=wired();w.game.releaseGuard.arm(100,100);w.win.pointercancel[0].f({});assert.ok(!w.clickE().prevented);w=wired();w.game.releaseGuard.arm(100,100);w.c.t=RELEASE_GUARD_MS+50;assert.ok(!w.clickE().prevented)});
console.log(`${checks} release-guard checks passed (controlled CPU fixture; rendered and physical Safari evidence separate)`);
