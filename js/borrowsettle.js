// Borrowing tap settle and HUD operating cash.
//
// Kept in its own module so the fix touches ui.js with one-line hooks only and merges cleanly
// alongside other work on the UI.
//
// Tap settle: after a borrowing review opens, re-quotes or resolves, a short input shield stops
// follow-up taps, so a fast double or triple tap on Confirm cannot fall through to the Financing
// panel (a second, unreviewed draw) or to the map (double-tap zoom).
//
// HUD: the "today" figure is operating cash. Borrowing proceeds and principal repayments are
// financing, not income, so they are left out. Interest still counts.

export const BORROW_SETTLE_MS = 450, BORROW_SETTLE_EXTEND_MS = 450, BORROW_SETTLE_CAP_MS = 1500;
export const BORROW_SETTLE_EVENTS = ['pointerdown', 'mousedown', 'click'];
// The UI methods after which input settles. Wrapping them keeps ui.js free of inline calls.
export const BORROW_SETTLE_METHODS = ['showCreditReview', 'confirmCreditReview', 'showTermLoanReview', 'confirmTermLoanReview'];
// Ledger categories that are financing: 'loan' = credit draws and term-loan proceeds;
// 'debt' = term principal, credit repayment and payoff.
export const HUD_FINANCING_CATS = ['loan', 'debt'];

const now = () => performance.now();

// Operating net for a sim.cashWindow() result: the full net minus financing flows.
export function operatingNet(actual) {
  const cats = actual?.categories || {};
  return (actual?.net || 0) - HUD_FINANCING_CATS.reduce((a, c) => a + (cats[c] || 0), 0);
}

// Starts or restarts the settle window for `ui`. Re-based on the first painted frame, so taps made
// before the player could see the change never count, even when a long render delays the paint.
export function armBorrowSettle(ui, t = now()) {
  installBorrowSettleInput(ui);
  const g = ui.borrowSettle = { until: t + BORROW_SETTLE_MS, cap: t + BORROW_SETTLE_CAP_MS };
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => requestAnimationFrame(() => {
    if (ui.borrowSettle !== g) return; const p = now();
    g.until = Math.max(g.until, p + BORROW_SETTLE_MS); g.cap = Math.max(g.cap, p + BORROW_SETTLE_CAP_MS);
  }));
}

// Capture-phase guard. Returns true when the event was swallowed. A tap is judged by when it was
// made (event timeStamp), not when a busy main thread delivered it. Releases are never swallowed.
export function borrowSettleSwallow(ui, e, t = now()) {
  const g = ui.borrowSettle; if (!g) return false;
  const ts = e.timeStamp, at = ts > 0 && ts <= t + 1 ? ts : t;
  if (at >= g.until) { if (t >= g.until) ui.borrowSettle = null; return false; }
  if (e.type === 'pointerdown') g.until = Math.min(g.cap, Math.max(g.until, at + BORROW_SETTLE_EXTEND_MS));
  if (e.cancelable !== false) e.preventDefault?.();
  e.stopImmediatePropagation?.(); e.stopPropagation?.();
  return true;
}

// Window capture listeners, installed once per UI on first use. Window capture runs before the
// document, the UI root and the map canvas, so a swallowed tap reaches none of them.
export function installBorrowSettleInput(ui) {
  if (ui.borrowSettleInput || typeof window === 'undefined' || !window.addEventListener) return;
  ui.borrowSettleInput = true;
  for (const ev of BORROW_SETTLE_EVENTS) window.addEventListener(ev, (e) => borrowSettleSwallow(ui, e), { capture: true, passive: false });
}

// Applied once to the UI class: each listed method arms the settle window after it runs, and the
// instance gets armBorrowSettle()/borrowSettleSwallow() for tests and harnesses.
export function applyBorrowSettle(UIClass) {
  const p = UIClass.prototype;
  if (p.borrowSettleApplied) return; p.borrowSettleApplied = true;
  for (const name of BORROW_SETTLE_METHODS) {
    const fn = p[name];
    if (typeof fn !== 'function') throw new Error(`borrowsettle: UI.${name} not found`);
    p[name] = function (...args) { try { return fn.apply(this, args); } finally { armBorrowSettle(this); } };
  }
  p.armBorrowSettle = function (t) { armBorrowSettle(this, t); };
  p.borrowSettleSwallow = function (e, t) { return borrowSettleSwallow(this, e, t); };
}
