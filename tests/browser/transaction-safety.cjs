// Local-only production-renderer touch test. Synthetic companies in fresh browser contexts;
// no natural progression or physical-device claim. Runs both candidate and immutable d03 control.
const {chromium}=require(process.env.PLAYWRIGHT_CORE||'playwright-core');
const http=require('http'),fs=require('fs'),path=require('path'),assert=require('assert/strict');
const candidate=process.cwd(),control=process.argv[3],output=process.argv[4];
const server=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');const isControl=u.pathname.startsWith('/control/');
 const root=isControl?control:candidate;const rel=decodeURIComponent(u.pathname.replace(/^\/(control|candidate)\//,''));
 const file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,b)=>{if(err){res.writeHead(404).end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.css')?'text/css':file.endsWith('.html')?'text/html':'application/octet-stream');res.end(b);});
});
(async()=>{
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const browser=await chromium.launch({executablePath:process.argv[2],args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
 const results=[];
 try{for(const variant of ['control','candidate'])for(const size of [{width:375,height:667},{width:390,height:844}]){
  const ctx=await browser.newContext({viewport:size,isMobile:true,hasTouch:true,deviceScaleFactor:1});
  const page=await ctx.newPage();page.setDefaultTimeout(20000);const errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(`http://127.0.0.1:${port}/${variant}/`);await page.waitForFunction(()=>window.__game?.ui&&!__game.saveStartup);
  const cdp=await ctx.newCDPSession(page);
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  async function settle(){await page.waitForFunction(()=>!__game.ui.borrowSettle||performance.now()>__game.ui.borrowSettle.until);await sleep(100);}
  async function tap(selector){const el=page.locator(selector).first();await el.scrollIntoViewIfNeeded();const b=await el.boundingBox();assert.ok(b&&b.width&&b.height,selector);await page.touchscreen.tap(b.x+b.width/2,b.y+b.height/2);}
  async function burst(selector){const b=await page.locator(selector).boundingBox();assert.ok(b,selector);const x=b.x+b.width/2,y=b.y+b.height/2;await page.evaluate(()=>{window.testPresses=[];if(!window.testPressLogger){window.testPressLogger=true;window.addEventListener('pointerdown',e=>testPresses.push(e.timeStamp),true);}});
   for(let i=0;i<3;i++){if(i)await sleep(150);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y,id:1}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}await sleep(700);
  }
  for(const kind of ['credit','term','bank','acquisition','transfer']){
   await page.evaluate(kind=>{const g=__game;g.newGame('maple');g.ui.title=false;const s=g.sim.s;s.tut={on:false,done:true};s.convos=[];s.cash=250000;s.speed=0;s.coTier=3;
    g.ui.closeModal();g.ui.renderTut(true);g.ui.renderFeed(true);
    if(kind==='acquisition'||kind==='transfer'){g.acquire('parcel','blank');g.ui.setTab('growth',true);g.ui.jumpSection('Acquisitions');}
    else if(kind==='bank'){g.ui.setTab(null);s.loan.warnT=-1e9;s.cash=-100;g.sim.cashCheck(0);g.ui.renderFeed(true);}
    else {g.ui.setTab('business',true);g.ui.jumpSection('Financing');}
   },kind);await sleep(800);await settle();
   if(kind==='bank'){await tap('#feed [data-a=requests]');await tap('#modal [data-a=convo]');}
   else await tap(kind==='acquisition'?'[data-a=acquire][data-v=parcel][data-m=blank]':kind==='transfer'?'[data-a=transfer]':kind==='term'?'[data-a=termLoanReview][data-v="10000"]':'[data-a=creditReview][data-v="1000"]');
   const selector=kind==='acquisition'?'[data-a=acquisitionConfirm]':kind==='transfer'?'[data-a=transferConfirm]':kind==='term'?'[data-a=termLoanConfirm]':'[data-a=creditConfirm]';
   await page.locator(selector).waitFor({state:'visible'});await settle();
   const state=()=>page.evaluate(()=>({cash:__game.sim.s.cash,credit:__game.sim.s.loan.bal,loans:__game.sim.s.debt.length,props:__game.company.props.length,transfers:__game.sim.s.ledger.filter(e=>e.note.startsWith('Transfer to')).length,modal:document.querySelector('#modal h2')?.textContent||null,speed:__game.sim.s.speed,zoom:__game.rend.zoom}));
   const before=await state();await burst(selector);const after=await state();const presses=await page.evaluate(()=>testPresses);
   const count=kind==='acquisition'?after.props-before.props:kind==='transfer'?after.transfers-before.transfers:kind==='term'?after.loans-before.loans:(after.credit-before.credit)/1000;
   results.push({variant,viewport:size,kind,before,after,transaction_count:count,press_timestamps:presses,scope:'synthetic setup, real production renderer and CDP touch; no physical-device claim'});
   if(variant==='candidate'){assert.equal(count,1,kind+' posts once');assert.equal(after.speed,0,'manual Pause');}
  }
  assert.deepEqual(errors,[],'no page exceptions');await ctx.close();
 }
 }finally{await browser.close();server.close();fs.writeFileSync(output,JSON.stringify(results,null,2)+'\n');}
 console.log(JSON.stringify({completed:true,rows:results.length,results:results.map(r=>({variant:r.variant,viewport:r.viewport,kind:r.kind,count:r.transaction_count}))}));
})().catch(e=>{server.close();console.error(e);process.exitCode=1;});
