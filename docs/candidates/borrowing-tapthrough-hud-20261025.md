# Borrowing tap-through and HUD financing fix (candidate, unmerged)

Branch: `work/borrowing-tapthrough-hud-20261025`, based on `integration/borrowing-sync-20261025` (820edc9, runtime identical to 137909c).
Status: candidate for review. Not merged, not approved.

## Bugs addressed

1. Tap-through double draw (P1). A fast double or triple tap on "Confirm $1,000 draw" closed the review, and the next tap landed on "Review $1,000" in the Financing panel, which opened a second review that the third tap confirmed. The result was two draws. The same fall-through could reach the map after a bank-request confirm.
2. HUD "today" counted loan proceeds as income (P2). The cash sub-line used `cashWindow(1).net`, which includes credit draws and term-loan proceeds. It now excludes ledger categories `loan` (proceeds/draws) and `debt` (term principal, credit repayment, payoff). Interest, rent and bills still count.

## Change (js/ui.js only)

- Capture-phase guard on `window` for `pointerdown`, `mousedown`, `click`, installed in the UI constructor.
- `armBorrowSettle()` runs when a credit or term review opens, after a successful confirm, and on the "Bank response changed" path.
- Window: 450 ms, re-based to 450 ms after the first painted frame (double rAF). Each swallowed `pointerdown` extends it by 450 ms, capped at 1500 ms after paint.
- Taps are judged by `event.timeStamp` (when the finger touched), not delivery time, so taps queued during a long main-thread stall do not slip through.
- Release events (`pointerup`, `touchend`) are never swallowed.

## Trade-off

A deliberate tap within about 450 ms of a review appearing or closing is ignored. On a slow device, where paint is late, the window starts at paint, so the player loses at most about 0.45 s after they can see the screen, or up to 1.5 s if they keep tapping. This has not been tuned on a physical iPhone.

## Tests

- `tests/headless/tborrowing_tapthrough_hud.mjs`: 12 groups, including a no-guard control that reproduces two draws. With the guard and HUD fix disabled, 8 behavioral groups fail.
- `tests/browser/borrowing-tapthrough.cjs`: rendered Chromium (390x844, touch, CDP touch bursts at 150 ms gaps).
  - Patched build: one credit draw, one term loan, one bank draw, zoom unchanged, HUD "today +0".
  - Deployed 137909c control: two credit draws ($2,000) and HUD "today +12,000".
  - The map-zoom variant did not reproduce in this harness run on either build.
- `node tests/run-headless.mjs`: 124/139, with no new failures versus the 122/138 baseline (`tfloor_context` now passes). `tborrowing_review.mjs` needs a baseline path argument; it passes 16/16 when given a d84fb59 checkout path.

## Owner iPhone playtest (2026-10-25)

Run by the owner on a physical iPhone in Safari, against a private preview of exactly `3e9a1ca` (hosted `index.html`, `js/main.js` and `js/ui.js` hash-matched to the commit). Owner-reported result: all five checks pass.

1. Credit triple tap on Confirm: one draw, no second review.
2. Term-loan double tap on Confirm: one loan.
3. Bank-request triple tap on Confirm: one draw, no map zoom.
4. HUD "today" does not jump by the borrowed amount.
5. Settle window does not feel like ignored input.

## Not verified

- One device only; iPhone model and iOS version not recorded.
- No broader device or Android coverage.
- The map-zoom variant was never reproduced in the rendered harness, so its fix rests on owner check 3.
