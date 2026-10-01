// manual frame stepping helpers for slow software-GL screenshots
module.exports.hold = (p) => p.evaluate(()=>{ window.__qaHold = true; });
module.exports.step = (p, n=30, dt=1/30, sim=true) => p.evaluate(([n,dt,sim])=>{ const g=__game; for(let i=0;i<n;i++){ if (sim && g.sim.s.speed>0) window.advanceTime(dt*1000); else { g.rend.frame(dt); g.ui.update(dt);} } }, [n,dt,sim]);
module.exports.sim = (p, ticks) => p.evaluate((n)=>{ const g=__game; for(let i=0;i<n;i++){ g.sim.step(); if (g.sim.events.length>300) g.drain(); } g.drain(); }, ticks);
