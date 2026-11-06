// Bounded production-RAF smoke + PR32 regressions. Disposable intercepted origins only.
// No RAF replacement, QA hold, manual frame, simulation steps, or manual Lab update calls.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), out = path.resolve(process.argv[2] || '/workspace/sst-review-fix-evidence');
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results = [];
  let activePage;
  try {
    for (const [width,height] of [[375,667],[390,844]]) {
      const context = await browser.newContext({viewport:{width,height}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
      const page = activePage = await context.newPage(), errors = [];
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', msg => {if (msg.type() === 'error' && msg.text().startsWith('loop ')) errors.push(msg.text());});
      await page.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.hostname !== 'sst-review-loop.test') return route.abort();
        const f = path.resolve(root, '.' + (u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname)));
        if (!f.startsWith(root+path.sep) || !fs.existsSync(f) || !fs.statSync(f).isFile()) return route.fulfill({status:404,body:''});
        return route.fulfill({body:fs.readFileSync(f), contentType:{'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json'}[path.extname(f)] || 'application/octet-stream'});
      });
      await page.goto('http://sst-review-loop.test/?visualLab');
      await page.waitForFunction(() => window.__game && !__game.saveStartup);
      await page.evaluate(() => {
        const g = __game; g.autoQ = false; g.rend.setQuality(0);
        const update = g.visualLab.update;
        window.__labUpdates = 0;
        // Count only updates delivered through main.tick; the original event closures are unmodified.
        g.visualLab.update = function (...args) { window.__labUpdates++; return update(...args); };
      });
      await page.locator('[data-a="new"][data-v="maple"]').tap();
      await page.waitForFunction(() => !__game.ui.title && __game.sim.s.tut.on && __labUpdates >= 2);
      const initial = await page.evaluate(() => ({t:__game.sim.s.t,speed:__game.sim.s.speed,tutorial:__game.sim.s.tut.on,updates:__labUpdates}));
      assert.equal(initial.speed,0);
      // Production tutorial methods change UI state; normal main.tick must deliver the Lab update.
      await page.evaluate(() => {__game.ui.tutMin=false;__game.ui.renderTut(true);});
      await page.waitForFunction(() => document.querySelector('#visual-lab').hidden);
      await page.screenshot({path:path.join(out,`${width}-tutorial-expanded.png`)});
      await page.evaluate(() => {__game.ui.tutMin=true;__game.ui.renderTut(true);});
      await page.waitForFunction(() => !document.querySelector('#visual-lab').hidden);
      await page.evaluate(() => __game.ui.requestSpeed(1));
      await page.waitForFunction(t => __game.sim.s.t > t, initial.t);
      await page.evaluate(() => __game.ui.requestSpeed(0));
      const paused = await page.evaluate(() => ({t:__game.sim.s.t,updates:__labUpdates}));
      await page.waitForFunction(n => __labUpdates >= n+3, paused.updates);
      assert.equal(await page.evaluate(() => __game.sim.s.t),paused.t,'manual Pause survives normal frames');
      await page.evaluate(() => __game.ui.showMenu());
      await page.waitForFunction(() => document.querySelector('#visual-lab').hidden);
      await page.evaluate(() => __game.ui.closeModal());
      await page.waitForFunction(() => !document.querySelector('#visual-lab').hidden);
      await page.evaluate(() => __game.ui.setTab('business'));
      await page.waitForFunction(() => document.querySelector('#visual-lab').hidden);
      await page.evaluate(() => __game.ui.setTab(null));
      await page.waitForFunction(() => !document.querySelector('#visual-lab').hidden);

      for (const open of [false,true]) {
        // Open state is presentation-only. Photo mode is entered via its production method.
        await page.evaluate(open => {document.querySelector('#visual-lab').open=open;__game.showcase.enterPhoto();},open);
        await page.waitForFunction(() => __game.showcase.photo && document.querySelector('#visual-lab').hidden);
        const targets = await page.evaluate(() => [...document.querySelectorAll('#photoBar input[type=range],#photoBar [data-p=snap]')].map(el => {
          const r = el.getBoundingClientRect(), x=r.left+r.width/2, y=r.top+r.height/2, hit=document.elementFromPoint(x,y);
          return {control:el.dataset.ps || el.dataset.p, visible:r.width>0&&r.height>0, reachable:hit===el||el.contains(hit)};
        }));
        assert.equal(targets.length,3);
        for (const target of targets) assert.ok(target.visible && target.reachable,JSON.stringify(target));
        const focus = page.locator('#photoBar input[data-ps="focus"]');
        const oldFocus = Number(await focus.inputValue());
        const rect = await focus.boundingBox();
        await page.touchscreen.tap(rect.x+rect.width*(oldFocus > .5 ? .2 : .8),rect.y+rect.height/2);
        await page.waitForFunction(old => {
          const value = Number(document.querySelector('[data-ps=focus]').value);
          return Math.abs(value-old) > .05 && Math.abs(__game.rend.post.focus-value) < .02;
        }, oldFocus);
        await page.screenshot({path:path.join(out,`${width}-photo-lab-${open?'expanded':'collapsed'}.png`)});
        await page.locator('#photoBar [data-p="done"]').tap();
        await page.waitForFunction(() => !__game.showcase.photo && !document.querySelector('#visual-lab').hidden);
        assert.equal(await page.locator('#visual-lab').evaluate(e=>e.open),open);
      }
      await page.evaluate(() => {document.querySelector('#visual-lab').open=true;});
      const before = await page.evaluate(() => ({t:__game.sim.s.t,speed:__game.sim.s.speed}));
      await page.locator('#visual-lab button').first().tap();
      await page.waitForFunction(() => __game.visualLab.lab.enabled && document.querySelector('#visual-lab summary').textContent.includes('Experimental'));
      assert.deepEqual(await page.evaluate(() => ({t:__game.sim.s.t,speed:__game.sim.s.speed})),before);
      await page.locator('#visual-lab button').first().press('Space');
      assert.equal(await page.evaluate(() => __game.sim.s.speed),0);
      const nativeTicks = await page.evaluate(() => ({updates:__labUpdates,tutorial:__game.sim.s.tut.on,speed:__game.sim.s.speed}));
      assert.ok(nativeTicks.updates >= 10);
      assert.equal(nativeTicks.tutorial,true);
      // Separate disclosed fixture: use production Skip Tutorial solely to unlock a build tool.
      const toolStart = await page.evaluate(() => {const g=__game;g.ui.do({type:'tutSkip'});g.ui.renderTut(true);const n=g.sim.s.orders.length;g.ui.pickTool('aisle');return {orders:n,t:g.sim.s.t};});
      await page.waitForFunction(() => __game.ui.tool === 'aisle' && document.querySelector('#visual-lab').hidden);
      await page.evaluate(() => __game.ui.pickTool(null));
      await page.waitForFunction(() => !document.querySelector('#visual-lab').hidden);
      assert.deepEqual(await page.evaluate(() => ({orders:__game.sim.s.orders.length,t:__game.sim.s.t})),toolStart,'tool selection places nothing and keeps time paused');
      assert.equal(await page.evaluate(() => __game.sim.s.speed),0);
      const offerResults = [];
      for (const open of [false,true]) for (const action of ['dismiss','start']) for (const priorSpeed of [0,1]) {
        await page.evaluate(async ({open,priorSpeed,action}) => {
          window.__offerCase={open,priorSpeed,action};
          const {makeMaple} = await import('/js/maple.js');
          const {lessonAllowed,lessonById} = await import('/js/tutorial.js');
          const g=__game, sm=makeMaple(4401);
          // Disclosed disposable post-tutorial offer fixture, not natural progression.
          sm.s.mode='tutorial';sm.s.tut={on:false,done:true,beat:99,flags:{},gradDay:1};
          if (!lessonAllowed(sm,lessonById('interior'))) throw Error('Invalid offer fixture: lesson must be allowed');
          sm.s.t=3*1440+421; // Avoid the hourly auto-offer poll during fixture attachment.
          g.company={props:[{name:'Maple offer touch fixture',sim:sm}],active:0,feed:[]};
          g.attach(sm,'offer-touch-fixture');g.ui.closeModal();g.ui.tutMin=true;g.ui.toasts=[];
          g.ui.requestSpeed(priorSpeed);
          if (sm.s.speed!==priorSpeed || g.ui.popupBlocks.size) throw Error('Invalid offer fixture: establish prior speed before offer');
          g.visualLab.lab.setEnabled(true);document.querySelector('#visual-lab').open=open;
          sm.s.lessonOffer='interior';g.ui.offerSeen='interior';g.ui.offerT=performance.now()-13000;
          g.ui.renderTut(true);
          if (g.ui.popupResume!==priorSpeed) throw Error('Invalid offer fixture: wrong remembered speed');
        },{open,priorSpeed,action});
        await page.waitForFunction(() => __game.ui.popupBlocks.has('lessonOffer') && document.querySelector('#visual-lab').hidden && !!document.querySelector('[data-a=lessonLater]'));
        const targets = await page.evaluate(() => [...document.querySelectorAll('#tut [data-a=lessonStart],#tut [data-a=lessonLater]')].map(el => {
          const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);
          return {action:el.dataset.a,x,y,reachable:hit===el||el.contains(hit)};
        }));
        assert.equal(targets.length,2);
        for (const target of targets) assert.ok(target.reachable,JSON.stringify(target));
        const before=await page.evaluate(() => ({t:__game.sim.s.t,speed:__game.sim.s.speed}));
        assert.equal(before.speed,0,'displayed offer temporarily pauses');
        if (!open && action==='dismiss' && priorSpeed===0) await page.screenshot({path:path.join(out,`${width}-offer-visible-lab-hidden.png`)});
        const target=targets.find(t=>t.action===(action==='start'?'lessonStart':'lessonLater'));
        await page.touchscreen.tap(target.x,target.y);
        await page.waitForFunction(action => !__game.sim.s.lessonOffer && (action==='start'?__game.sim.s.lesson?.id==='interior':!!__game.sim.s.lessonsSeen?.interior),action);
        await page.waitForFunction(action => document.querySelector('#visual-lab').hidden === (action==='start'),action);
        const after=await page.evaluate(() => ({t:__game.sim.s.t,speed:__game.sim.s.speed,offer:__game.sim.s.lessonOffer??null,lesson:__game.sim.s.lesson?.id??null,seen:__game.sim.s.lessonsSeen?.interior??null,offerPause:__game.ui.popupBlocks.has('lessonOffer'),labOpen:document.querySelector('#visual-lab').open,labHidden:document.querySelector('#visual-lab').hidden,palette:__game.visualLab.lab.enabled}));
        assert.equal(after.speed,priorSpeed,'offer action restores prior speed, including manual Pause');
        assert.equal(after.offerPause,false);
        assert.equal(after.labOpen,open);
        assert.equal(after.palette,true);
        if (priorSpeed===0) {
          const n=await page.evaluate(()=>__labUpdates);
          await page.waitForFunction(n=>__labUpdates>=n+2,n);
          assert.equal(await page.evaluate(()=>__game.sim.s.t),before.t,'manual Pause remains across normal frames');
        }
        if (!open && priorSpeed===0) await page.screenshot({path:path.join(out,`${width}-offer-${action}-delivered.png`)});
        let lessonNavigation = null;
        if (action==='start') {
          // An explicit manual Pause makes lesson navigation independent of later automatic offers.
          const navigationFrame=await page.evaluate(()=>{__game.ui.requestSpeed(0);return __labUpdates;});
          await page.waitForFunction(n=>__labUpdates>=n+2,navigationFrame);
          const touchControl = async action => {
            const el=page.locator(`#tut [data-a="${action}"]`);
            const target=await el.evaluate(el=>{el.scrollIntoView({block:'nearest'});const r=el.getBoundingClientRect(),x=r.left+r.width/2,y=r.top+r.height/2,hit=document.elementFromPoint(x,y);return {x,y,reachable:r.width>0&&r.height>0&&(hit===el||el.contains(hit))};});
            assert.ok(target.reachable,`${action} remains touch-accessible`);
            await page.touchscreen.tap(target.x,target.y);
            return target;
          };
          const details=await touchControl('tutMin');
          await page.waitForFunction(()=>!__game.ui.tutMin);
          assert.equal(await page.evaluate(()=>document.querySelector('#visual-lab').hidden),true);
          const end=await touchControl('lessonEnd');
          await page.waitForFunction(()=>!__game.sim.s.lesson&&!document.querySelector('#visual-lab').hidden);
          lessonNavigation=await page.evaluate(()=>({speed:__game.sim.s.speed,labOpen:document.querySelector('#visual-lab').open,palette:__game.visualLab.lab.enabled}));
          assert.deepEqual(lessonNavigation,{speed:0,labOpen:open,palette:true});
          lessonNavigation={...lessonNavigation,details,end};
        }
        offerResults.push({open,action,priorSpeed,before,after,targets,lessonNavigation});
        await page.evaluate(()=>__game.ui.requestSpeed(0));
      }
      assert.deepEqual(errors,[]);
      results.push({width,height,initial,paused,final:nativeTicks,pageErrors:errors,photoTargets:'all slider/shutter centers reachable; focus value changed after touch',offerResults});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'normal-raf.json'),JSON.stringify({environment:'Chromium software WebGL; normal production RAF; no physical Safari/performance claim',results},null,2));
    console.log('PASS normal production RAF: active tutorial, run/Pause, modal/tab/tool, keyboard, collapsed/expanded Photo mode accessible lens/shutter targets, changed focus values, and real-touch optional-lesson Start/Dismiss at both phone sizes');
  } catch(error) {
    if (activePage && !activePage.isClosed()) {
      fs.writeFileSync(path.join(out,'failure-state.json'),JSON.stringify(await activePage.evaluate(()=>({offerCase:window.__offerCase,offer:__game.sim.s.lessonOffer,lesson:__game.sim.s.lesson,seen:__game.sim.s.lessonsSeen,speed:__game.sim.s.speed,t:__game.sim.s.t,popupBlocks:[...__game.ui.popupBlocks],labHidden:document.querySelector('#visual-lab')?.hidden})),null,2));
      await activePage.screenshot({path:path.join(out,'failure.png')});
    }
    throw error;
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
