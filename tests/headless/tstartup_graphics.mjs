import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createStartupRenderer } from '../../js/startup.js';
import { makeMaple } from '../../js/maple.js';

function fixture() {
  const appended = [], handlers = {}; let focus = 0, reloads = 0;
  const section = { id: '', attributes: {}, setAttribute(k, v) { this.attributes[k] = v; }, querySelector(s) {
    return s === 'button' ? { addEventListener(k, f) { handlers[k] = f; } } : { focus() { focus++; } };
  } };
  const doc = { body: { appendChild(x) { appended.push(x); } }, createElement(tag) { assert.equal(tag, 'section'); return section; }, getElementById(id) { assert.equal(id, 'view'); return {}; } };
  return { doc, section, appended, handlers, reload: () => reloads++, get reloads() { return reloads; }, get focus() { return focus; } };
}
const originalError = console.error; const logged = []; console.error = (...args) => logged.push(args);
try {
  const success = fixture(), renderer = {};
  assert.equal(createStartupRenderer(() => renderer, success.doc, success.reload), renderer);
  assert.equal(success.appended.length, 0); assert.equal(success.focus, 0);
  console.log('PASS successful renderer returned unchanged; no fallback UI');

  const failed = fixture(), error = new Error('<img src=x onerror=bad()>');
  assert.equal(createStartupRenderer(() => { throw error; }, failed.doc, failed.reload), null);
  assert.equal(failed.appended.length, 1); assert.equal(failed.section.id, 'startup-error');
  assert.equal(failed.section.attributes.role, 'alert'); assert.equal(failed.focus, 1);
  assert.match(failed.section.innerHTML, /Graphics could not start/);
  assert.match(failed.section.innerHTML, /Keep your browser’s site data/);
  assert.ok(!failed.section.innerHTML.includes(error.message));
  assert.equal(failed.reloads, 0); failed.handlers.click(); assert.equal(failed.reloads, 1);
  assert.equal(logged[0][1], error);
  console.log('PASS accessible static error, no error HTML injection, manual reload only');

  // Execute the actual full main module body with a constructor failure. Any
  // downstream UI, autosave, input, animation or cloud setup fails this check.
  const boot = fixture(); let attempts = 0;
  class Renderer { constructor() { attempts++; throw new Error('WebGL unavailable'); } }
  const forbidden = () => { throw new Error('Downstream game setup ran after failure'); };
  const ctx = vm.createContext({ document: boot.doc, window: { addEventListener: forbidden },
    Audio: class {}, Renderer, makeMaple, console,
    createStartupRenderer: create => createStartupRenderer(create, boot.doc, boot.reload),
    UI: class { constructor() { forbidden(); } }, installShowcase: forbidden,
    modeLabel: forbidden, savearchive: {}, localsave: { get: forbidden, put: forbidden }, cloud: { get: forbidden, put: forbidden },
    requestAnimationFrame: forbidden, performance: { now: forbidden } });
  const source = readFileSync('js/main.js', 'utf8').replace(/^import .*;\n/gm, '').replace(/^export .*;\n/gm, '');
  vm.runInContext(source, ctx);
  assert.equal(attempts, 1); assert.equal(boot.appended.length, 1);
  assert.equal(ctx.window.__game, undefined); assert.equal(ctx.window.advanceTime, undefined);
  assert.equal(boot.reloads, 0);
  console.log('PASS actual main boot failure stops before game UI, clock, handlers, cloud or save setup');
} finally { console.error = originalError; }
