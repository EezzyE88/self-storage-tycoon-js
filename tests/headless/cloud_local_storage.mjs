import assert from 'node:assert/strict';

class LocalStorageMock {
  constructor() { this.m = new Map(); }
  getItem(k) { return this.m.has(k) ? this.m.get(k) : null; }
  setItem(k, v) { this.m.set(k, String(v)); }
  removeItem(k) { this.m.delete(k); }
}

globalThis.location = new URL('https://preview.example.test/');
globalThis.localStorage = new LocalStorageMock();

const { cloud } = await import('../../js/cloud.js?test=' + Date.now());

assert.equal(await cloud.get(), null);
assert.equal(cloud.ok, true);

const meta1 = { name: 'Maple Street Storage', day: 12, cash: 54321 };
assert.equal(await cloud.put('SST1.first', meta1), true);
const one = await cloud.get();
assert.equal(one.code, 'SST1.first');
assert.deepEqual(one.meta, meta1);
assert.equal(typeof one.at, 'number');

const meta2 = { name: 'Maple Street Storage', day: 13, cash: 55000 };
cloud.beacon('SST1.second', meta2);
const two = await cloud.get();
assert.equal(two.code, 'SST1.second');
assert.deepEqual(two.meta, meta2);

await cloud.clear();
assert.equal(await cloud.get(), null);

console.log('CLOUD LOCAL AUTOSAVE: PASS');
