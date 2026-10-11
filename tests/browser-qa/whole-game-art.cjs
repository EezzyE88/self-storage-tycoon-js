// Actual production-game WebGL captures; disposable request-intercepted origins.
// Usage: SST_ART_BROWSER=/path/to/chrome-headless-shell node tests/browser-qa/whole-game-art.cjs BASE_DIR OUT_DIR
// Baseline is a git archive of f70b81a; candidate is cwd. No live preview/storage/network is used.
const {chromium}=require('playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const base=path.resolve(process.argv[2]),out=path.resolve(process.argv[3]),candidate=process.cwd();
fs.mkdirSync(out,{recursive:true});
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');
const scenes=['comeback-unready','comeback-restored','comeback-expanded','maple-office','interior-products','rain','night','mirrored'];
(async()=>{
 const result={environment:'Chromium software ANGLE/SwiftShader WebGL; 390x844 viewport, DPR2, touch emulation. Actual production index/HUD/renderer. Not physical iPhone, Safari, enjoyment or GPU-performance acceptance.',baseline:'f70b81a0298a438577db1ee35934655e7858353f',setup:'Comeback restored uses production finishTask directly as a disclosed visual fixture, not elapsed owner-work evidence. Expanded uses retained candidate40 investment fixture, production build/completeOrder/commission. Interior product states and mirror are disclosed test fixtures. No user save loaded.',scenes:{}};
 for(const which of ['before','after']){
  // Single-process software GL needs a fresh browser after context teardown.
  const browser=await chromium.launch({executablePath:process.env.SST_ART_BROWSER,args:['--single-process','--no-zygote','--in-process-gpu','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const root=which==='before'?base:candidate;
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true});
  const page=await context.newPage(),errors=[];
  // Freeze the game's RAF scheduler in this disposable capture harness only.
  // Production renderer/UI are invoked explicitly; no running-game performance claim.
  await page.addInitScript(()=>{window.requestAnimationFrame=()=>0;});
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.hostname!=='sst-art.test')return route.abort();
   const f=path.resolve(root,'.'+(u.pathname==='/'?'/index.html':decodeURIComponent(u.pathname)));
   if(!f.startsWith(root+path.sep)||!fs.existsSync(f)||!fs.statSync(f).isFile())return route.fulfill({status:404,body:''});
   const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.sst':'text/plain','.png':'image/png'}[path.extname(f)]||'application/octet-stream';
   return route.fulfill({body:fs.readFileSync(f),contentType:mime});
  });
  await page.goto('http://sst-art.test/');await page.waitForFunction(()=>window.__game);
  for(const scene of scenes){
   await page.evaluate(async scene=>{
    const {makeScenario}=await import('/js/scenarios.js'),{makeMaple}=await import('/js/maple.js'),{Sim}=await import('/js/sim.js'),{yardInfill}=await import('/js/yardinfill.js');
    const g=window.__game;g.autoQ=false;
    let sm=scene.startsWith('comeback')?makeScenario('comeback',4401):makeMaple(4401,{mirror:scene==='mirrored'});
    if(scene==='comeback-restored'){
     for(const t of [...sm.s.tasks])sm.finishTask(t,sm.s.agents.find(a=>a.role==='owner'),false);
     sm.poll();sm.dispatch({type:'comebackAck'});
    }
    if(scene==='comeback-expanded'){
     const raw=JSON.parse(await g.decodeSave(await (await fetch('/tests/fixtures/candidate40/06-investment.sst')).text()));
     sm=new Sim(raw.company?raw.props[raw.active].s:raw);
     const proposal=yardInfill(sm).choices.find(c=>c.count===2);if(!sm.dispatch({type:'build',...proposal.args}).ok)throw Error('extension build failed');
     const ord=sm.s.orders.at(-1);sm.completeOrder(ord);if(!sm.dispatch({type:'commission',order:ord.id}).ok)throw Error('extension commission failed');
    }
    sm.s.speed=0;sm.s.tut={on:false,done:true,beat:99,flags:{}};sm.s.lesson=null;
    if(scene==='interior-products'){
     const us=sm.objs('unit').filter(u=>u.access==='interior');us.forEach((u,i)=>{u.env=i%2?'climate':'std';});sm.markDirty();sm.ensure();
    }
    g.company={props:[{name:scene.startsWith('comeback')?'The Comeback Yard':'Maple Street Storage',sim:sm}],active:0,feed:[]};g.attach(sm,'art-test');g.ui.closeModal();g.ui.scMin=true;g.ui.tutMin=true;g.ui.setTab(null);g.ui.renderTut(true);g.ui.renderFeed(true);
    const r=g.rend;r.setQuality(2);r.view=scene==='interior-products'?0:'ext';r.applyView();r.todOverride=scene==='night'?23:12;r.weatherOverride=scene==='rain'?'rain':'clear';
    r.azimuth=r.targetAz=Math.PI/4;r.camElev=.72;r.center.set(scene==='interior-products'?20.5:scene==='maple-office'?8:17,0,scene==='interior-products'?9:scene==='maple-office'?23:16);
    r.zoom=scene==='interior-products'?2:scene==='maple-office'?2:1.05;r.updateCamera();
    g.ui.update(.016);r.frame(.016);window.__artScene=scene;
   },scene);
   // attach schedules the existing phone fit; let it settle, then restore identical test framing.
   await page.waitForTimeout(100);
   const metadata=await page.evaluate(({scene,camera})=>{
    const g=__game,r=g.rend;r.center.set(scene==='interior-products'?20.5:scene==='maple-office'?8:17,0,scene==='interior-products'?9:scene==='maple-office'?23:16);r.zoom=scene==='interior-products'||scene==='maple-office'?2:1.05;r.updateCamera();
    if(scene!=='interior-products'&&scene!=='maple-office')r.fitProperty(g.ui.safeRect());
    if(camera){r.center.fromArray(camera.center);r.zoom=camera.zoom;r.azimuth=r.targetAz=camera.azimuth;r.updateCamera();}
    g.ui.lastCoach=-Infinity;g.ui.lastSheet=-Infinity;g.ui.lastTutR=-Infinity;g.ui.update(.2);
    const before=JSON.stringify(g.sim.s);r.frame(.016);const after=JSON.stringify(g.sim.s);if(before!==after)throw Error('renderer wrote save state');
    const gl=r.r.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
    return {state:before,camera:{center:r.center.toArray(),zoom:r.zoom,azimuth:r.azimuth,view:r.view},units:g.sim.objs('unit').length,renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER)};
   },{scene,camera:result.scenes[scene]?.before?.camera});
   await page.waitForTimeout(600); // Let the existing HUD CSS reveal animations settle.
   await page.screenshot({path:path.join(out,scene+'-'+which+'.png')});
   result.scenes[scene]??={};result.scenes[scene][which]={...metadata,state:undefined,stateSha256:hash(metadata.state)};
  }
  assert.deepEqual(errors,[],'page errors');result[which+'PageErrors']=errors;await browser.close();
 }
 for(const [scene,pair] of Object.entries(result.scenes)){assert.equal(pair.before.stateSha256,pair.after.stateSha256,scene+' identical simulation');assert.deepEqual(pair.before.camera,pair.after.camera,scene+' identical framing');}
 fs.writeFileSync(path.join(out,'render-results.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);process.exit(1)});
