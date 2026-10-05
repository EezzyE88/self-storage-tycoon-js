import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {loadRenderer} from '../performance/renderer-fixture.mjs';
import {makeMaple} from '../../js/maple.js';
const main=readFileSync('js/main.js','utf8');
const code=main.slice(main.indexOf('const ptrs ='),main.indexOf("canvas.addEventListener('contextmenu'"));
let checks=0;const test=(n,f)=>{f();console.log('PASS '+n);checks++};
function fixture(){let now=0,id=0;const timers=new Map(), events={},docs={},calls={tap:0,zoom:0,pan:0,pinch:0,place:0,cancel:0};const canvas={addEventListener:(n,f)=>events[n]=f,setPointerCapture:()=>{}};const game={audio:{unlock(){}},ui:{tool:null,title:false,modalOpen:()=>false,safeRect:()=>undefined,tapMap:()=>calls.tap++,placeStart:()=>calls.place++,placeMove(){},finishPlacement(){},cancelPlacement:()=>calls.cancel++},rend:{cellAt:()=>({x:2,y:2}),doubleTapZoom:()=>calls.zoom++,zoomBy:()=>calls.pinch++,pan:()=>calls.pan++}};
vm.runInNewContext(code,{canvas,game,document:{addEventListener:(n,f)=>docs[n]=f},performance:{now:()=>now},setTimeout:(f,d)=>{timers.set(++id,{f,t:now+d});return id},clearTimeout:i=>timers.delete(i)});
const advance=n=>{now+=n;for(const [i,x]of [...timers])if(x.t<=now){timers.delete(i);x.f()}};
const fire=(type,x=100,y=100,pointerId=1,extra={})=>events[type]({type,clientX:x,clientY:y,pointerId,button:0,pointerType:'touch',target:canvas,...extra});const tap=(x=100,y=100)=>{fire('pointerdown',x,y);fire('pointerup',x,y)};return{game,calls,fire,tap,advance,docs};}
test('single tap selects once after double-tap interval',()=>{const f=fixture();f.tap();assert.equal(f.calls.tap,0);f.advance(321);assert.equal(f.calls.tap,1)});
test('double tap zooms once without selecting',()=>{const f=fixture();f.tap();f.fire('lostpointercapture');f.advance(100);f.tap();f.fire('lostpointercapture');f.advance(400);assert.equal(f.calls.zoom,1);assert.equal(f.calls.tap,0)});
test('pan cancels pending selection and zoom',()=>{const f=fixture();f.tap();f.fire('pointerdown');f.fire('pointermove',130);f.fire('pointerup',130);f.advance(400);assert.equal(f.calls.zoom,0);assert.equal(f.calls.tap,0);assert.ok(f.calls.pan)});
test('pinch preserves zoom and cancels double tap/selection',()=>{const f=fixture();f.tap();f.fire('pointerdown');f.fire('pointerdown',180,100,2);f.fire('pointermove',220,100,2);f.fire('pointerup',220,100,2);f.fire('pointerup');f.advance(400);assert.ok(f.calls.pinch);assert.equal(f.calls.zoom,0);assert.equal(f.calls.tap,0)});
test('cancel and lost capture never select or zoom',()=>{for(const type of ['pointercancel','lostpointercapture']){const f=fixture();f.tap();f.fire('pointerdown');f.fire(type);f.advance(400);assert.equal(f.calls.zoom,0);assert.equal(f.calls.tap,0);assert.equal(f.calls.cancel,1)}});
test('building short taps never select, zoom or place',()=>{const f=fixture();f.game.ui.tool='light';f.tap();f.advance(100);f.tap();f.advance(400);assert.equal(f.calls.zoom+f.calls.tap+f.calls.place,0)});
test('building hold previews; cancellation abandons placement',()=>{const f=fixture();f.game.ui.tool='light';f.fire('pointerdown');f.advance(241);assert.equal(f.calls.place,1);f.fire('pointercancel');assert.equal(f.calls.cancel,1);assert.equal(f.calls.zoom,0)});
test('UI interaction cancels pending map gesture',()=>{const f=fixture();f.tap();f.docs.pointerdown({target:{}});f.advance(400);assert.equal(f.calls.tap+f.calls.zoom,0)});
test('shift/right pan does not become a tap',()=>{const f=fixture();f.fire('pointerdown',100,100,1,{shiftKey:true});f.fire('pointerup');f.advance(400);assert.equal(f.calls.tap+f.calls.zoom,0)});
const Renderer=await loadRenderer();
test('actual camera zoom preserves tapped ground point at exterior and upper floor',()=>{const r=new Renderer({clientWidth:393,clientHeight:720},makeMaple());r.canvas.getBoundingClientRect=()=>({left:0,top:0,width:393,height:720});for(const view of [0,1]){r.view=view;r.zoom=1;r.updateCamera();const before=r.cellAt(220,380);r.zoomAt(220,380,1.65);const after=r.cellAt(220,380);assert.ok(Math.abs(before.fx-after.fx)<1e-6);assert.ok(Math.abs(before.fy-after.fy)<1e-6)}});

test('four double taps give three strictly closer levels then return to overview',()=>{const r=new Renderer({clientWidth:393,clientHeight:720},makeMaple());r.canvas.getBoundingClientRect=()=>({left:0,top:0,width:393,height:720});r.fitProperty();const base=r.zoom;let prev=base;for(let i=0;i<3;i++){const point=r.cellAt(220,380);r.doubleTapZoom(220,380);assert.ok(r.zoom>prev);const after=r.cellAt(220,380);assert.ok(Math.abs(point.fx-after.fx)<1e-6);prev=r.zoom;}r.doubleTapZoom(220,380);assert.ok(Math.abs(r.zoom-base)<1e-6);assert.equal(r.tapZoom.step,0);r.doubleTapZoom(220,380);assert.ok(r.zoom>base);});
test('new property resets the double-tap sequence',()=>{const r=new Renderer({clientWidth:393,clientHeight:720},makeMaple());r.canvas.getBoundingClientRect=()=>({left:0,top:0,width:393,height:720});r.fitProperty();r.doubleTapZoom(200,360);r.doubleTapZoom(200,360);r.sim=makeMaple(999);r.doubleTapZoom(200,360);assert.equal(r.tapZoom.step,1);assert.equal(r.tapZoom.sim,r.sim);});
console.log(`${checks} executed checks passed; physical Safari acceptance pending`);
