// SL-1 I6 / Q2 legacy equivalence: with the security line unset or at L = y1, every routing graph
// (vehNbr for all gates, each gate and publicDrive; pedNbr for customers and staff) and a 30-day daily
// state trace match abaf108 exactly. Expected values come from tests/fixtures/sl1/abaf108_equiv.json.gz,
// generated from the abaf108 tree by tests/fixtures/sl1/gen_abaf108_equiv.mjs (same recipes and helpers).
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { Sim } from '../../js/sim.js';
import { makeSandbox, makeScenario } from '../../js/scenarios.js';
import { publicDrive } from '../../js/mapleaccess.js';
import { graphDigests, trace, fixtures } from '../fixtures/sl1/equiv_lib.mjs';

const ref = JSON.parse(gunzipSync(readFileSync(new URL('../fixtures/sl1/abaf108_equiv.json.gz', import.meta.url))));
assert.equal(ref.source, 'abaf10888f57c8d8e0fc920240f203d959d5c93b');
const recipes = fixtures({ makeSandbox, makeScenario });
assert.deepEqual(Object.keys(recipes), Object.keys(ref.fixtures));
let n = 0;
for (const [id, want] of Object.entries(ref.fixtures)) {
  const a = new Sim(JSON.parse(want.save)); a.ensure();
  assert.ok(a.frontage() || !Number.isInteger(a.s.secLine), `${id}: legacy save has no secLine`);
  assert.deepEqual(graphDigests(a, publicDrive), want.graphs, `${id}: routing graphs differ from abaf108`);
  const b = new Sim(JSON.parse(want.save)); b.ensure();
  const got = trace(b, ref.days); const day = got.findIndex((h, k) => h !== want.trace[k]);
  assert.equal(day, -1, `${id}: state diverges from abaf108 on day ${day + 1}`);
  if (!id.includes('legacy')) assert.equal(JSON.stringify(recipes[id]().s), want.save, `${id}: the current build creates a different starting save`);
  else assert.throws(() => recipes[id](), /front row, so there is no public lot|Face the office door into the public lot/, `${id}: a NEW yard office must be refused (legacy exception not exploitable)`);
  n++; console.log(`PASS ${id}: graphs edge-for-edge and ${ref.days}-day trace identical to abaf108${id.includes('legacy') ? '; a new yard office is refused' : '; same starting save'}`);
}
console.log(`${n} legacy equivalence fixtures passed`);
