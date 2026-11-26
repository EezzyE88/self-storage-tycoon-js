// Generates tests/fixtures/sl1/abaf108_equiv.json.gz from an abaf108 source tree (the SL-1 parent):
//   node tests/fixtures/sl1/gen_abaf108_equiv.mjs <abaf108 checkout>
// For each fixture: the saved state, its routing-graph digests and a 30-day daily state trace.
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { execSync } from 'node:child_process';
import { graphDigests, trace, fixtures } from './equiv_lib.mjs';

const dir = resolve(process.argv[2] || '.');
const head = execSync('git rev-parse HEAD', { cwd: dir }).toString().trim();
const mod = (f) => import(pathToFileURL(join(dir, 'js', f)).href);
const { makeSandbox, makeScenario } = await mod('scenarios.js'), { Sim } = await mod('sim.js'), { publicDrive } = await mod('mapleaccess.js');
const out = { source: head, days: 30, fixtures: {} };
for (const [id, make] of Object.entries(fixtures({ makeSandbox, makeScenario }))) {
  const save = JSON.stringify(make().s);
  const a = new Sim(JSON.parse(save)); a.ensure();
  const graphs = graphDigests(a, publicDrive);
  const b = new Sim(JSON.parse(save)); b.ensure();
  out.fixtures[id] = { save, graphs, trace: trace(b, out.days) };
  console.log(id, Object.keys(graphs).length, 'graphs');
}
writeFileSync(new URL('./abaf108_equiv.json.gz', import.meta.url), gzipSync(JSON.stringify(out), { level: 9 }));
console.log('source', head);
