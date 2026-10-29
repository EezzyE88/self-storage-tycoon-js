// Render-only Stage 1 handoff in isolated browser contexts. Synthetic test companies only.
// No physical-iPhone, deployment, or acceptance claim.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'../..'),out=path.resolve(process.argv[2]||'/tmp/sst-placeables-stage1-browser');
fs.mkdirSync(out,{recursive:true});

(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.SST_CHROMIUM?{executablePath:process.env.SST_CHROMIUM}:{}),args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const results=[];
 try {
  for(const spec of [{width:375,height:667,kind:'unit'},{width:390,height:844,kind:'gate'}]){
   const context=await browser.newContext({viewport:{width:spec.width,height:spec.height},isMobile:true,hasTouch:true,deviceScaleFactor:1});
   await context.route('**/*',async route=>{
    const u=new URL(route.request().url());
    if(u.origin!=='http://sst-stage1.test')return route.abort();
    const file=path.resolve(root,'.'+decodeURIComponent(u.pathname==='/'?'/index.html':u.pathname));
    if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return route.fulfill({status:404,body:''});
    const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png'};
    await route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'});
   });
   const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
   await page.goto('http://sst-stage1.test/');await page.waitForFunction(()=>window.__game?.ui&&!window.__game.saveStartup);
   const before=await page.evaluate(kind=>{
    const g=window.__game;g.newGame('maple');g.ui.title=false;g.sim.s.tut={on:false,done:true};g.sim.s.convos=[];g.sim.s.speed=0;g.ui.closeModal();g.ui.renderTut(true);
    const target=kind==='gate'?g.sim.objs('gate')[0]:g.sim.objs('unit').find(u=>!u.lease&&u.commercial!=='reserved'&&!g.sim.s.agents.some(a=>a.unit===u.id));
    if(!target)throw Error('representative target unavailable');
    const a={tool:'demolish',a:{x:target.x,y:target.y},b:{x:target.x,y:target.y},f:target.f||0,targetId:target.id};
    const plan=g.sim.plan(a);a.quoteStamp=plan.operation?.stamp;plan.args=a;
    g.ui.tool='demolish';g.ui.planArgs={a:{...a.a},b:{...a.b}};g.ui.plan=plan;g.ui.renderActionBar();
    return {state:JSON.stringify(g.sim.s),rng:g.sim.s.rngS,id:target.id,type:target.type,status:plan.status,cost:plan.cost,classification:plan.operation?.classification};
   },spec.kind);
   await page.locator('.operation-review').waitFor({state:'visible'});
   const text=await page.locator('#abar').innerText();
   assert.match(text,new RegExp(`Selected exact asset:\\s+${before.type} #${before.id}`));
   assert.match(text,/Removal quote:/);assert.match(text,/cash after/);
   if(spec.kind==='gate'){assert.equal(before.status,'invalid');assert.equal(before.classification,'blocked');assert.match(text,/alternate-route support/);assert.ok(await page.locator('[data-a="confirm"]').isDisabled());}
   else {assert.equal(before.status,'valid');assert.ok(!(await page.locator('[data-a="confirm"]').isDisabled()));assert.match(text,/vacant unit/);}
   const geometry=await page.evaluate(()=>{const r=document.querySelector('.actionbar').getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth};});
   assert.ok(geometry.left>=0&&geometry.right<=spec.width+1&&geometry.scrollWidth<=geometry.clientWidth,'review stays in phone viewport');
   const shot=`stage1-${spec.kind}-${spec.width}x${spec.height}.png`;await page.screenshot({path:path.join(out,shot),fullPage:true});
   await page.locator('button[data-a="cancelTool"]',{hasText:'Cancel review'}).tap();
   const after=await page.evaluate(()=>({state:JSON.stringify(window.__game.sim.s),rng:window.__game.sim.s.rngS,review:!!document.querySelector('.operation-review')}));
   assert.equal(after.state,before.state);assert.equal(after.rng,before.rng);assert.equal(after.review,false);
   assert.deepEqual(errors,[]);
   results.push({viewport:`${spec.width}x${spec.height}`,target:`${before.type} #${before.id}`,status:before.status,classification:before.classification,cost:before.cost,cancel_preserved_state_and_rng:true,screenshot:shot,console_errors:errors});
   await context.close();
  }
 } finally {await browser.close();}
 fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({status:'PASS',scope:'local isolated Chromium rendering; no physical-iPhone or deployment claim',results},null,2)+'\n');
 console.log(`PASS Stage 1 rendered handoff at 375x667 and 390x844`);
})().catch(e=>{console.error(e.stack);process.exitCode=1});
