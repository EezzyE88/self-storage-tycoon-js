// Blueprint caption layout: one pass over every caption, in priority order, so captions never overlap each other,
// the interface or the actionable target. Pure (screen geometry in, placements out) so it is testable headlessly.
//
// Priorities: 1 the current actionable target, 2 an unfinished prerequisite, 3 building context, 4 secondary
// (entrance, loading, aisle). Secondary captions whose anchors nearly coincide are grouped into one ("Entrance ·
// Loading"). A caption that cannot sit at or near its anchor is moved to a nearby clear spot with a leader line back
// to the anchor; when no clear spot exists, priority 1-2 captions are still drawn (at the least-covered spot) and
// lower-priority captions are left out.
export const CAPTION_PRIORITY = { target: 1, prerequisite: 2, context: 3, secondary: 4 };
const GROUP_PX = 34, LEADER_PX = 26;
const hit = (a, b) => a.l < b.r && b.l < a.r && a.t < b.b && b.t < a.b;
const area = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
// caps: [{t, ax, ay, prio, cls?, dy?}] (anchor in screen px; dy = preferred baseline offset from the anchor)
// opts: {width, height, obstacles: [{l,t,r,b}], measure(text, cls) -> px, prev?: Map(text -> candidate index)}
export function layoutCaptions(caps, opts) {
  const { width: W, height: H, obstacles = [], measure, prev } = opts;
  // Group nearby secondary captions; drop exact repeats of a higher-priority caption.
  const list = [];
  for (const c of [...caps].sort((a, b) => a.prio - b.prio)) {
    if (!c.t) continue;
    if (list.some((x) => x.t.toLowerCase() === c.t.toLowerCase())) continue;
    const near = c.prio >= CAPTION_PRIORITY.secondary && list.find((x) => x.prio >= CAPTION_PRIORITY.secondary && Math.hypot(x.ax - c.ax, x.ay - c.ay) < GROUP_PX);
    if (near) { near.t += ' · ' + c.t; near.ax = (near.ax + c.ax) / 2; near.ay = (near.ay + c.ay) / 2; continue; }
    list.push({ ...c });
  }
  const placed = [], dropped = [];
  for (const c of list) {
    const fs = c.cls === 'secondary' ? 10 : 12, w = measure(c.t, c.cls) + 8, h = fs + 6, dy = c.dy ?? 4;
    const box = (x, y) => ({ l: x - w / 2, r: x + w / 2, t: y - fs - 1, b: y + 5 });
    const side = w / 2 + 14;
    const cands = [[0, dy], [0, dy - 18], [0, dy + 18], [0, -30], [0, 32], [side, 4], [-side, 4], [0, -48], [0, 50], [side, -18], [-side, -18], [side, 24], [-side, 24], [0, -66], [0, 68]];
    const inView = (b) => b.l >= 2 && b.r <= W - 2 && b.t >= 2 && b.b <= H - 2;
    const blockers = [...obstacles, ...placed.map((p) => p.box)];
    const order = prev && prev.has(c.t) ? [prev.get(c.t), ...cands.keys()] : [...cands.keys()];
    let pick = -1;
    for (const i of order) { const [ox, oy] = cands[i]; const b = box(c.ax + ox, c.ay + oy); if (inView(b) && !blockers.some((o) => hit(b, o))) { pick = i; break; } }
    if (pick < 0 && c.prio <= CAPTION_PRIORITY.prerequisite) { // essential guidance is never hidden: least-covered spot in view
      let best = Infinity;
      cands.forEach(([ox, oy], i) => { const b = box(c.ax + ox, c.ay + oy); if (!inView(b)) return; const cover = blockers.reduce((s, o) => s + area(b, o), 0); if (cover < best) { best = cover; pick = i; } });
      if (pick < 0) pick = 0;
    }
    if (pick < 0) { dropped.push(c.t); continue; }
    const [ox, oy] = cands[pick], x = c.ax + ox, y = c.ay + oy, b = box(x, y);
    const leader = Math.hypot(ox, oy) > LEADER_PX || Math.abs(ox) > 0; // displaced from its own map spot: draw a leader
    placed.push({ ...c, x, y, box: b, pick, leader, h, w, covered: blockers.some((o) => hit(b, o)) });
  }
  return { placed, dropped };
}
// Point on a box edge nearest to (x, y): where a leader line from the anchor meets its caption.
export function edgePoint(b, x, y) { return { x: Math.max(b.l, Math.min(b.r, x)), y: Math.max(b.t, Math.min(b.b, y)) }; }
