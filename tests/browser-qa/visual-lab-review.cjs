// Bounded production-RAF smoke + PR32 regressions. Disposable intercepted origins only.
// No RAF replacement, QA hold, manual frame, simulation steps, or manual Lab update calls.
const {chromium} = require('playwright');
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const root = process.cwd(), out = path.resolve(process.argv[2] || '/workspace/sst-review-fix-evidence');
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium', args:['--no-sandbox','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const results = [];
  try {
    for (const [width,height] of [[375,667],[390,844]]) {
      const context = await browser.newContext({viewport:{width,height}, deviceScaleFactor:2, isMobile:true, hasTouch:true});
      const page = await context.newPage(), errors = [];
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
        const rect = await focus.boundingBox();
        await page.touchscreen.tap(rect.x+rect.width*.7,rect.y+rect.height/2);
        await page.waitForFunction(() => Math.abs(__game.rend.post.focus-Number(document.querySelector('[data-ps=focus]').value))<.02);
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
      assert.deepEqual(errors,[]);
      results.push({width,height,initial,paused,final:nativeTicks,pageErrors:errors,photoTargets:'all slider/shutter centers reachable for collapsed and expanded Lab; real touch input delivered'});
      await context.close();
    }
    fs.writeFileSync(path.join(out,'normal-raf.json'),JSON.stringify({environment:'Chromium software WebGL; normal production RAF; no physical Safari/performance claim',results},null,2));
    console.log('PASS normal production RAF: active tutorial, run/Pause, modal/tab/tool, keyboard, collapsed/expanded Photo mode and accessible lens/shutter targets at both phone sizes');
  } finally { await browser.close(); }
})().catch(e => {console.error(e);process.exitCode=1;});
