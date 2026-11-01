// Historical-only guard preserved verbatim from tfloor_context.mjs (removed from the current gate 2026-11-01).
// It rebuilds the expected simulation source from commit d84fb59171152e670a5d3d2940830310fd7cc1d9, which is not
// present in the repository or any fetched branch, so the current gate always reported it BLOCKED. Registered in the
// historical profile; it can run again only if that exact object is restored (no substitute).
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {stage0Baseline} from './stage0_baseline.mjs';
import {atHistoricalChainHead} from './source_reader.mjs';
atHistoricalChainHead(()=>{
let expectedSim=execFileSync('git',['show','d84fb59171152e670a5d3d2940830310fd7cc1d9:js/sim.js'],{encoding:'utf8'});
const intentional=(from,to)=>{assert.ok(expectedSim.includes(from),'declared sim.js baseline hunk exists');expectedSim=expectedSim.replace(from,to);};
intentional("  autoOpenEnabled() {\n    const s=this.s;\n    return s.mode==='sandbox'&&!s.scenario&&!s.lesson&&!s.tut?.on&&!this.unlimited();\n  }","  autoOpenEnabled() {\n    return true;\n  }");
intentional("    if (!this.objs('unit').some((u) => u.cstate === 'operating')) out.push('No commissioned rent-ready units');","    if (!this.objs('unit').some((u) => u.cstate === 'operating')) out.push('No operating rent-ready units');");
intentional("    // 1. commission rent-ready units\n    if (s.open && this.objs('unit').some((u) => u.cstate === 'ready')) { const r = this.act_commission({ all: true }); if (r.ok) this.mgr('Opened rent-ready units for rental'); }\n    // 2. escalate stalled repairs to vendors","    // 1. escalate stalled repairs to vendors. Finished eligible units open automatically for every player.");
// B/F intentionally changes only explicit-rotation footprint anchors in the simulation.
// Keep the complete-file comparison: any other simulation drift still fails.
intentional(`      const dir = [[0,-1],[1,0],[0,1],[-1,0]][turn];
      const x = Math.min(a.a.x,a.b.x), y = Math.min(a.a.y,a.b.y);
      units = Array.from({length:n}, (_,k) => ({x:x+(axisX?k*sz.w:0), y:y+(axisX?0:k*sz.w),
        w:axisX?sz.w:sz.d, h:axisX?sz.d:sz.w, dir:[...dir], f}));`,
`      // The touched cell sits on the door edge; the row grows from it in the drag direction.
      const dir = [[0,-1],[1,0],[0,1],[-1,0]][turn];
      units = Array.from({length:n}, (_,k) => {
        const along = (axisX ? a.a.x : a.a.y) + (step > 0 ? k * sz.w : -(k + 1) * sz.w + 1);
        const perp = (axisX ? a.a.y : a.a.x) - ((axisX ? dir[1] : dir[0]) > 0 ? sz.d - 1 : 0);
        return axisX ? {x:along, y:perp, w:sz.w, h:sz.d, dir:[...dir], f} : {x:perp, y:along, w:sz.d, h:sz.w, dir:[...dir], f};
      });`);
assert.equal(stage0Baseline('js/sim.js'),expectedSim);
});
console.log('PASS historical d84fb59 simulation reconstruction');
