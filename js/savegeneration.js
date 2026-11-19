// FS-01 private candidate. Save generation, not a Project Runtime revision.
// Fixed before adapter initialization; no URL can opt into legacy slots.
export const SAVE_GENERATION = 'sst-fresh-1';
export const SAVE_KEYS = Object.freeze({
  main: 'sst.fresh1.autosave.main', backup: 'sst.fresh1.autosave.backup',
  kept: 'sst.fresh1.kept.previous', archive: 'sst.fresh1.kept.archive',
  probe: 'sst.fresh1.probe', archiveProbe: 'sst.fresh1.probe.archive',
  durable: 'sst.fresh1.autosave.durable',
});
export const LEGACY_BUILD_URL = 'https://rawcdn.githack.com/EezzyE88/self-storage-tycoon-js/5ce4cfa76d3e1386ab4e3a9746b84bfe6c1313f3/index.html';
