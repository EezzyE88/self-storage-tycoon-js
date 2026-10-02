// Build the densest drive-up layout that validates on the empty lot (shared by stress tests).
export function buildMaxLot(sim, { aisleW = 2, size = 'du5x5' } = {}) {
  const s = sim.s, P = s.parcel; const B = (tool, a, b, x = {}) => sim.dispatch({ type: 'build', tool, a, b: b || a, f: 0, ...x });
  const res = { ok: 0, fail: {} }; const t = (r) => { if (r.ok) res.ok++; else res.fail[r.msg] = (res.fail[r.msg] || 0) + 1; };
  const yTop = P.y0 + 1, yBot = P.y1 - 2; // keep a cross aisle along the front
  t(B('aisle', { x: P.x0 + 1, y: P.y1 - 1 }, { x: P.x1 - 1, y: P.y1 - 1 })); t(B('aisle', { x: P.x0 + 1, y: P.y1 }, { x: P.x1 - 1, y: P.y1 }));
  const gx = Math.floor((P.x0 + P.x1) / 2); t(B('gate', { x: gx, y: P.y1 }));
  const period = aisleW + 2;
  for (let x = P.x0 + 1; x + period - 1 <= P.x1 - 4; x += period) t(B('aisle', { x, y: yTop }, { x: x + aisleW - 1, y: yBot })); // all aisles first, so doors can face either side
  for (let x = P.x0 + 1; x + period - 1 <= P.x1 - 4; x += period) {
    t(B(size, { x: x + aisleW, y: yTop }, { x: x + aisleW, y: yBot }));
    if (x + aisleW + 1 <= P.x1 - 4) t(B(size, { x: x + aisleW + 1, y: yTop }, { x: x + aisleW + 1, y: yBot }));
  }
  t(B('office', { x: P.x1 - 2, y: P.y1 - 4 })); // may fail if taken
  for (let x = P.x0 + 1; x <= P.x1 - 1; x += 4) for (let y = yTop; y <= yBot; y += 5) { t(B('light', { x, y })); }
  for (let x = P.x0 + 1; x <= P.x1 - 1; x += 8) for (let y = yTop; y <= yBot; y += 8) { t(B('camera', { x, y })); }
  return res;
}
