# Full-game QA candidate — 2026-10-04

JavaScript/Three.js repository only: EezzyE88/self-storage-tycoon-js.
Branch: candidate/full-game-qa-20261004.
Base: f3e57de69f1328f90462c03890fba3aaf566b616.
Implementation checkpoint: 4def6207f22daed79414d0ab02df5c5ed263e579.
Accepted master remains 2812abf8d268f9a225e5786d173f95efcbd6223d.
Build label: bplus-full-game-qa-candidate-4.

## Bugs reproduced and fixed

1. A one-cell upstairs unit row defaulted to the wrong axis and lacked hallway frontage. Blueprint now specifies the row axis; UI carries it and the selected door direction into the ordinary build review.
2. A light elsewhere inside the shell could make suggested placement skip F1 hallway lighting. The suggested floor now uses the same hallway requirement as lesson completion.
3. Drag assistance could snap a different construction tool onto current lesson coordinates. Snapping now requires the same tool.
4. In normal timed construction, loading-zone painting could finish before the underlying driveway and then be overwritten by asphalt. Overlapping ground work now follows commitment order. Cancelling unfinished paving also cancels its unfinished dependent paint, using the existing refund rules. Dependencies are derived from existing orders and tiles; no new saved fields or migration charges.

## Repeatable results

Run from repository root with Node 24:

- `node tests/run-headless.mjs`: 33/33 scripts pass after fixes. This includes assertions and exploratory probes; it is not a count of 33 individual assertions. The runner supplies fixtures to the two parameterized construction probes and detects printed FAIL markers as well as failing exits.
- `node tests/headless/tblueprint.mjs`: 20 checks pass, including the seven new checks for small-shell commissioning, hallway-light scope, different-tool drag, axis/direction preservation, normal timed build completion through save/resume, full undo and late partial refunds.
- `node tests/headless/tmenu_touch.mjs`: 7 checks pass; loan progression, compact held placement, release review, menu shortcuts and stable guidance.
- `node tests/headless/tbplus.mjs`: 21 checks pass; financial processing, settlements, migration, forecasts and reserves.
- `node tests/headless/tfuzz.mjs 365 8`: 72 runs across nine modes and eight deterministic seeds; 474,034 random actions, 74,886 accepted; no invariant failures. Each run reaches Day 366 and periodically restores a JSON save. The fuzzer now exits unsuccessfully when it finds issues.
- Complete headless suite repeated twice after placement fixes; the final repeat includes the timed-construction correction. Extended stress repeated after that correction with the same clean result.
- Vertical scenario wins Day 145; climate scenario wins Day 61 with the existing deterministic operators.
- Syntax checks and whitespace validation pass.

Existing-snapshot saves preserve cash, commitments and construction orders on load; ongoing painting resumes behind its paving prerequisite. Existing B+ finance, rent/wage/cost constants, debt/billing/collections rules and save schema are unchanged. Construction timing/refunds change only for overlapping unfinished ground orders.

## Economy evidence retained

Maple $3,750 target: eight seeded competent runs win on Days 35–46; eight less attentive runs with delayed expansion win on Days 64–69. Retain the candidate target.

Expansion comparison: infill pays back in 6.07–6.37 months; ten-unit complete packages in 11.43–11.90; twelve-unit packages in 10.97–11.20. A six-unit complete package takes 19.73 months in one seed and remains just short of repayment at the test cutoff in two others. The 12–18-month design benchmark is therefore not met uniformly. This is a balance finding, not a correctness-test PASS; no arbitrary cost inflation or numerical retuning is part of this bug-fix candidate.

## Limits and next Safari check

No complete test can prove a game has zero bugs. Local Chromium is unavailable and its downloads were invalid; the private Preview browser attempt stopped at sign-in, so actual rendered gameplay/Safari testing was not counted. Geometry, markup and simulation checks do not establish physical iPhone acceptance.

On the same private Preview, verify build label candidate-4, resume an existing save, scroll menus and close with X, advance the loan lesson, hold/release a placement, and complete the suggested two-floor building with normal construction time. Verify loading marks survive finished paving, rotate/pinch/pan and F1/F2 work, Pause freezes time/weather, blocking dialogs return to 1x, then save and resume mid-lesson.

Candidate only; no merge into accepted master. Preview publication and served-file hashes are verified separately after this commit.
