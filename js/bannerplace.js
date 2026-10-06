// Where a celebration banner may sit on a portrait phone: below the measured control rows (HUD, speed and floor rows)
// and any request cards, and clear of the open panel, build bar and bottom navigation. Pure, so it is testable.
// Returns the banner's top in px, or null when there is no room (the caller defers the banner instead of covering).
export const BANNER_GAP = 8;
export function bannerTop({ controlsBottom = 0, convoBottom = 0, limit, height, H, prefer = 0.36 }) {
  const floor = Math.max(controlsBottom + BANNER_GAP, convoBottom ? convoBottom + 10 : 0);
  const room = (top) => top + height <= limit - BANNER_GAP;
  // No panel open: keep the familiar mid-upper position when it fits; otherwise as high as the controls allow.
  if (prefer != null) { const t = Math.max(floor, Math.round(H * prefer)); if (room(t)) return Math.round(t); }
  return room(floor) ? Math.round(floor) : null;
}
