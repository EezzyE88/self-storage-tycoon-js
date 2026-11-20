import assert from 'node:assert/strict';
import { makePublicMaple } from '../../js/maple.js';
import { beatIndex, curBeat } from '../../js/tutorial.js';
import { loadRenderer } from '../performance/renderer-fixture.mjs';

const sim = makePublicMaple();
const office = sim.objs('office')[0];
const porter = {kind:'staff', role:'porter'};
const route = sim.pedPath(sim.idx(8,21), sim.idx(5,19), porter);
const lane = new Set([sim.idx(8,21), ...route]);
assert.ok(lane.has(sim.idx(5,20)));
const Renderer = await loadRenderer();
const renderer = new Renderer({clientWidth:390,clientHeight:844},sim);
renderer.rebuildStatic();
const materials = new Set();
const furniture = [];
for (const batch of renderer.openHouse.batches.values()) {
  for (const part of batch.parts) {
    if (part.o.id !== office.id) continue;
    materials.add(batch.kind);
    if (batch.kind === 'ohFloor' || part.y - part.h/2 > 1.35) continue;
    furniture.push(part);
    for (const cell of lane) {
      const x=cell%sim.s.W, y=Math.floor(cell/sim.s.W);
      // A part can touch a tile boundary without intruding into the tile.
      const overlap = part.x+part.w/2>x+1e-8 && part.x-part.w/2<x+1-1e-8 &&
        part.z+part.d/2>y+1e-8 && part.z-part.d/2<y+1-1e-8;
      assert.ok(!overlap, batch.kind+' crosses staff route at '+x+','+y);
    }
  }
}
for (const kind of ['ohCrate','ohCounter','ohScreen','ohSofa','darkMetal']) assert.ok(materials.has(kind));
assert.ok(furniture.length>25);
assert.equal(sim.s.speed,0);
console.log('PASS both door thresholds and every tile of the live staff passage clear of office walls and furnishings');

sim.s.tut.beat=beatIndex('expand');
const suggestion=curBeat(sim).steps.find(step=>step.placement).placement;
const quote=sim.plan({type:'build',...suggestion});
assert.equal(quote.status,'valid');
assert.equal(quote.cost,1960);
assert.deepEqual(quote.creates.map(u=>[u.size,u.dir]),[['10x10',[0,-1]],['10x10',[0,-1]]]);
assert.equal(sim.s.cash,26000);
console.log('PASS Act II suggested placement quotes two north-facing 10x10 units at $1,960 without spending');
