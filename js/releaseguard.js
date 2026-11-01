// A touch/pen hold that opens a placement review is followed by the browser's own
// click at the release point, which would land on the newly drawn review controls.
// This guard swallows that one click only. Any later deliberate input (touch, mouse,
// keyboard, assistive activation) is never affected: anything that is not that exact
// click disarms the guard without swallowing.
export const RELEASE_GUARD_MS = 700, RELEASE_GUARD_PX = 28;

export function createReleaseGuard({ now, isReviewTarget, ms = RELEASE_GUARD_MS, px = RELEASE_GUARD_PX }) {
  let armed = null;
  return {
    arm(x, y) { armed = { x, y, at: now() }; },
    clear() { armed = null; },
    isArmed() { return !!armed; },
    // Decides the first click after arming; returns true only when it must be swallowed.
    // The guard is spent either way, so at most one click is ever considered.
    click(e) {
      const g = armed; if (!g) return false;
      armed = null;
      if (!e || e.isTrusted !== true || !(e.detail > 0)) return false; // keyboard / programmatic / assistive clicks report detail 0
      if (now() - g.at > ms) return false;
      if (Math.hypot(e.clientX - g.x, e.clientY - g.y) > px) return false;
      return !!isReviewTarget(e.target);
    },
  };
}
