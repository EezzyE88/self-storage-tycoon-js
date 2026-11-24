// Title-screen choice buttons: every description stays inside its own button and no button text
// overlaps another button, at 375x667 and 390x844, for a first visit and a returning player
// (Continue shown). Isolated real page from local bytes via request routing; no server/deployment.
// Requires Playwright and an installed Chromium (optional SST_CHROMIUM executable path).
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..');
const measure=()=>{const r=e=>e.getBoundingClientRect();
 const btns=[...document.querySelectorAll('.title .choices .btn')].map(b=>({a:b.dataset.a,b:r(b),s:b.querySelector('small')?r(b.querySelector('small')):null}));
 const bad=[];for(const x of btns){if(x.s&&(x.s.top<x.b.top-0.5||x.s.bottom>x.b.bottom+0.5))bad.push(x.a+' description outside its button');
  if(x.b.top<0||x.b.bottom>innerHeight)bad.push(x.a+' button off screen');
  for(const y of btns)if(y!==x&&x.s&&x.s.left<y.b.right&&x.s.right>y.b.left&&x.s.top<y.b.bottom&&x.s.bottom>y.b.top)bad.push(x.a+' description overlaps '+y.a);}
 return {n:btns.length,bad};};
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SST_CHROMIUM?{executablePath:process.env.SST_CHROMIUM}:{}),args:['--enable-unsafe-swiftshader','--use-angle=swiftshader']});
 let groups=0;
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
  await page.goto('http://sst-review.test/');await page.waitForFunction(()=>window.__game?.ui&&document.querySelector('.title .choices'));
  const first=await page.evaluate(measure);
  assert.ok(first.n>=4,'title choices rendered');assert.deepEqual(first.bad,[],`${width}x${height} first visit`);
  console.log(`PASS ${width}x${height} first visit: ${first.n} title choices, descriptions inside their buttons, no overlaps`);groups++;
  // returning player: Continue with a long save line (UI state only, as title-taps does; no storage writes)
  await page.evaluate(()=>{const ui=__game.ui;ui.contSave={code:'DISPOSABLE_CALLBACK_ONLY',at:Date.now()/1000,meta:{name:'The Chain Next Door',mode:'Scenario',day:1,cash:12000}};ui.showTitle();});
  const back=await page.evaluate(measure);
  assert.ok(back.n>=5,'Continue added');assert.deepEqual(back.bad,[],`${width}x${height} returning player`);
  console.log(`PASS ${width}x${height} returning player: ${back.n} title choices, descriptions inside their buttons, no overlaps`);groups++;
  assert.deepEqual(errors,[],'no page errors');await context.close();
 } } finally { await browser.close(); }
 console.log(`${groups} title choice layout groups passed`);
})().catch(e=>{console.error('FAIL',e.message);process.exit(1);});
