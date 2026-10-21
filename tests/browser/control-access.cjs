// Isolated real-page interaction checks. Uses local bytes via request routing; no server/deployment.
// Requires Playwright and an installed Chromium (optional SST_CHROMIUM executable path).
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SST_CHROMIUM?{executablePath:process.env.SST_CHROMIUM}:{}),args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 try { for(const [width,height] of [[375,667],[390,844]]) {
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,deviceScaleFactor:2});
  await context.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!=='http://sst-review.test')return route.abort();
   const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
   if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
   const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
   await route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://sst-review.test/');await page.waitForFunction(()=>window.__game?.ui);
  // Actual title navigation, text input and dialog return.
  await page.locator('[data-a="loadOpen"]').tap();await page.locator('#loadTa').fill('DISPOSABLE_INVALID_CODE');
  assert.equal(await page.locator('#loadTa').inputValue(),'DISPOSABLE_INVALID_CODE');
  await page.locator('[data-a="modalClose"]').tap();
  await page.locator('[data-a="scenarios"]').tap();await page.locator('[data-a="new"][data-v="sc:comeback"]').tap();
  await page.locator('#tabs [data-v="build"]').tap();
  await page.waitForTimeout(350);
  const geometry=await page.evaluate(()=>{
   const rect=s=>{const r=document.querySelector(s).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height}};
   return {speed:rect('#speed'),floors:rect('#floors'),views:rect('.viewctl'),card:rect('#tut .tut'),buttons:[...document.querySelectorAll('#speed button,#floors button')].map(b=>{const r=b.getBoundingClientRect();return {width:r.width,height:r.height}})};
  });
  assert.ok(geometry.speed.right+4<=geometry.floors.left);
  assert.ok(geometry.card.top>=Math.max(geometry.speed.bottom,geometry.views.bottom)+4);
  assert.ok(geometry.buttons.every(r=>r.width>=44&&r.height>=44));
  await page.locator('#speed [data-v="0"]').tap();
  await page.locator('[data-a="comebackClose"]').tap();await page.locator('.sheet [data-a="close"]').tap();
  await page.locator('#floors [data-v="0"]').tap();await page.locator('#floors [data-v="ext"]').tap();
  await page.locator('[data-a="floorChoose"]').tap();await page.locator('[data-a="modalClose"]').tap();
  // Empty modal host must pass a real map tap to the canvas.
  await page.evaluate(()=>{window.qaMapTaps=0;document.querySelector('#view').addEventListener('pointerdown',()=>window.qaMapTaps++)});
  await page.touchscreen.tap(width/2,height/2);assert.ok(await page.evaluate(()=>window.qaMapTaps>0));
  // Fresh disposable Maple. Tutorial completion is fixture setup, not a playthrough claim.
  await page.reload();await page.waitForFunction(()=>window.__game?.ui);
  await page.locator('[data-a="new"][data-v="maple"]').tap();
  await page.evaluate(()=>{const g=window.__game;g.sim.s.tut={on:false,done:true};g.sim.s.speed=0;g.ui.renderTut(true)});
  await page.locator('#tabs [data-v="build"]').tap();await page.locator('.cats [data-v="units"]').tap();
  await page.locator('[data-a="tool"][data-v="du5x10"]').tap();
  const placement=await page.evaluate(()=>{
   const g=window.__game;
   for(let x=2;x<g.sim.s.W-2;x++)for(let y=2;y<g.sim.s.H-14;y++){
    const args={tool:'du5x10',a:{x,y},b:{x,y:y+11},axis:'y',f:0},p=g.sim.plan(args);
    if(p.status==='valid'&&p.count===12){g.rend.lookAt(x+.5,y+6);g.rend.zoom=.6;g.rend.updateCamera();return args;}
   }
   throw Error('No valid 12-unit fixture placement');
  });
  const cdp=await context.newCDPSession(page);
  const point=async c=>page.evaluate(c=>window.__game.rend.project(c.x+.5,c.y+.5,0),c);
  const a=await point(placement.a),b=await point(placement.b);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:a.x,y:a.y}]});await page.waitForTimeout(350);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:b.x,y:b.y}]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
  assert.equal(await page.evaluate(()=>window.__game.ui.plan?.status),'valid');
  const checkFit=()=>page.evaluate(()=>{const u=window.__game.ui,g=u.rend,rect=u.safeRect(),a=u.plan.args;
   const points=[a.a.x,a.b.x+1].flatMap(x=>[a.a.y,a.b.y+1].flatMap(y=>[0,1.9].map(z=>g.project(x,y,z))));
   return points.every(p=>p.x>=rect.left&&p.x<=rect.right&&p.y>=rect.top&&p.y<=rect.bottom);});
  assert.ok(await checkFit(),'placement visible above measured review');
  await page.locator('.build-details summary').tap();await page.waitForTimeout(200);assert.ok(await checkFit());
  await page.locator('#speed [data-v="0"]').tap();
  const t=await page.evaluate(()=>window.__game.sim.s.t);
  await page.locator('[data-a="confirm"]').tap();await page.waitForTimeout(150);
  assert.deepEqual(await page.evaluate(()=>[window.__game.sim.s.speed,window.__game.sim.s.t]),[0,t]);
  assert.deepEqual(errors,[]);console.log(`PASS real Chromium interactions ${width}x${height}`);
  await context.close();
 }} finally {await browser.close()}
})().catch(e=>{console.error(e.stack);process.exitCode=1});
