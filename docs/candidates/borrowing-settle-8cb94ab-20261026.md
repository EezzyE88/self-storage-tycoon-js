# Borrowing tap-through and HUD fix on 8cb94ab (candidate, unmerged)

Branch: `work/borrowing-settle-8cb94ab-20261026`, based on `8cb94ab131842f7107fdd2a39db26e89713d95df` (PR #5 head, paused-transaction autosave repair).
Status: candidate for review. Not merged, not approved.
Supersedes `work/borrowing-tapthrough-hud-20261025` (3e9a1ca on 820edc9) for the active build. Merge one or the other, not both: each changes `slowHud` in `ui.js`.

## Bugs addressed

1. Tap-through double draw (P1). A fast double or triple tap on "Confirm $1,000 draw" closed the review, and the next tap landed on "Review $1,000" underneath. That opened a second review, which the third tap confirmed. Reproduced on 8cb94ab: two draws ($2,000).
2. HUD "today" counted loan proceeds as income (P2). Reproduced on 8cb94ab: "today +12,000" after borrowing.

## Merge-friendly structure

- All logic is in a new file, `js/borrowsettle.js`.
- `js/ui.js` gets three one-line hooks and nothing else:
  - `import { applyBorrowSettle, operatingNet } from './borrowsettle.js';` on its own line after the `finance.js` import.
  - `Math.round(actual.net)` becomes `Math.round(operatingNet(actual))` in `slowHud()`.
  - `applyBorrowSettle(UI);` on its own line after the class.
- `applyBorrowSettle` wraps four existing methods (`showCreditReview`, `confirmCreditReview`, `showTermLoanReview`, `confirmTermLoanReview`) so the guard arms after they run. Their bodies are untouched, so others can keep editing them without conflicts.
  - If one of those methods is renamed, the game still loads: it logs a console warning, and `tborrowing_settle.mjs` fails.
- The window capture listeners are installed on first use, so the constructor is not touched.
- The tests are new files: `tests/headless/tborrowing_settle.mjs` and `tests/browser/borrowing-settle.cjs`.
- One existing test needed a one-line change. `tests/headless/tpaused_autosave.mjs` pins the SHA-256 of `ui.js` to 918d31f, and its normalization now also strips exactly the three hooks above. That pin fails on any change to `ui.js` by anyone. Maintainers may want to relax it.
- The new test is not registered in `tests/headless/current-regressions.json`. That list is unsorted, and new entries go at the end, which is where other branches add theirs. Register it when integrating if the gate should enforce it.

## Behavior (unchanged from 3e9a1ca)

- The window is 450 ms, re-based to the first painted frame, plus 450 ms for each swallowed press, capped at 1.5 s.
- Taps are judged by `event.timeStamp`. Releases are never swallowed.
- Financing categories `loan` and `debt` are left out of the HUD "today" figure. Rent, bills and interest still count.
- One difference: confirm methods now arm after every call, including failed paths, where 3e9a1ca armed only after success. This is harmless, because a failed confirm leaves the review open or re-quotes it.

## Evidence (2026-10-26)

| Check | 8cb94ab | This branch |
| --- | --- | --- |
| Native gate `run_current_regressions.py --profile current` | 97/97 PASS | 97/97 PASS |
| `tests/headless/tborrowing_settle.mjs` | n/a | 12/12 PASS |
| Same test with the method wrapping disabled | n/a | 8 behavioral groups FAIL as expected |
| `tests/headless/tpaused_autosave.mjs` | 14/14 PASS | 14/14 PASS |
| `node tests/run-headless.mjs` | 125/143 | 126/144; same failure set, plus the new test passing |
| Rendered touch test, Chromium 390x844, CDP touch bursts at 150 ms gaps | Credit triple tap: 2 draws; HUD +12,000 | 3 of 4 runs: 1 credit draw, 1 term loan, 1 bank draw, zoom unchanged, HUD +0. 1 run: harness timed out waiting for the term review to paint (software GL); no burst ran |

Trial merges (`git merge-tree`, 2026-10-26):
- Into `master` e30430d: clean.
- Into PR #5 8cb94ab: clean.
- Into PR #4 74a6322: clean.
- Into PR #2 ca37888: conflicts in `css/game.css` and `js/version.js`, files this branch does not touch. PR #2 already conflicts with `master` on its own.

## Not verified

- Physical iPhone or Safari on this build. The owner's iPhone pass was on 3e9a1ca, not on this branch.
- The acquisition review introduced in this stack has a similar layout ("Review $price" buttons under a modal). It is not guarded here, and it was not tested for tap-through.
