// Player-facing label fixes: the between-beat banner counts beats like the card header, and the rent-roll card
// names monthly rent from tenants who are behind (not the amount owed, which is "Owed to you").
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeMaple } from '../../js/maple.js';
import { BEATS, beatHeader, beatDoneLabel } from '../../js/tutorial.js';
import { UI } from '../../js/ui.js';

globalThis.innerWidth = 390; globalThis.innerHeight = 844;
let passed = 0;
const test = (name, fn) => { fn(); passed++; console.log('PASS', name); };

test('beat banner number matches the card header for every beat; chapter breaks name their act', () => {
  const total = BEATS.filter((b) => !b.brk).length;
  let checked = 0;
  for (let i = 1; i < BEATS.length - 1; i++) {
    const b = BEATS[i], label = beatDoneLabel(i);
    if (b.brk && b.act) { assert.equal(label, `Act ${b.act} complete`); checked++; continue; }
    const head = /Beat (\d+)$/.exec(beatHeader(i)) || /Part (\d+) of/.exec(beatHeader(i));
    assert.ok(head, beatHeader(i));
    assert.equal(label, `Beat ${head[1]} of ${total} complete`); checked++;
  }
  assert.ok(checked >= 10);
  assert.doesNotMatch(readFileSync('js/showcase.js', 'utf8'), /Part \$\{e\.beat \+ 1\} of \$\{BEATS\.length\}/, 'old count including breaks is gone');
  assert.match(readFileSync('js/showcase.js', 'utf8'), /celebrate\(beatDoneLabel\(e\.beat\)/);
});

test('rent-roll card labels tenants-behind rent as monthly, separate from the amount owed', () => {
  const sim = makeMaple(9); sim.s.tut.on = false;
  const L = Object.values(sim.s.leases).find((l) => l.status === 'current');
  assert.ok(L, 'a current lease exists');
  L.status = 'pastdue';
  const ui = Object.create(UI.prototype); ui.g = { sim, tierInfo: () => null }; ui.$ = () => ({ innerHTML: '' });
  const h = ui.businessSheet();
  const roll = sim.rentRoll(), paying = sim.rentRollPaying();
  assert.ok(roll - paying > 0, 'some rent roll is from tenants behind');
  assert.match(h, /\/mo from tenants behind/);
  assert.doesNotMatch(h, /\$[\d,]+ past due ·/);
  assert.match(h, /<small>Owed to you<\/small>/);
});

console.log(`${passed} label consistency checks passed`);
