# Career bar clarity candidate — 2026-10-23

Status: source checks PASS; rendered phone and physical-iPhone acceptance NOT TESTED. Not deployed or merged.

Parent: `ea65f43570d01e74de4e21fd3756705a70408aac`.
Branch: `candidate/career-bar-clarity-20261023`.
Build: `v62-career-bar-clarity-20261023`.

## Change

A separate native HUD button explains the existing career bar. It displays the next tier and all currently unmet rent-roll/property-count requirements, explicitly identifying the other requirement when met. Monetary shortfalls retain cents, so rounding cannot imply a threshold has been reached. Its accessible name includes both eligible portfolio totals and an explicit destination. A pending promotion is labeled honestly; the highest tier shows that it has been earned, with no invented next target. Career-ineligible modes and the title screen hide it.

The button opens the existing Growth → Operator career section. The existing cash chip still opens Finance. Native Enter/Space activation on the new button is isolated from global build/clock shortcuts. There is no new ladder, dialog, unlock, objective, wait mechanism or investment advice.

On phones the explanation occupies its own full-width row below time/floor controls, with a 44px minimum target and wrapping text. Existing measured HUD bounds feed advice/review positioning. Expanded camera controls temporarily hide the explanation because they use the same area; closing them restores it. This layout is proposed source behavior, not rendered evidence.

## Preservation

The existing `portfolioCareer` calculation and progress fraction are retained. `career.js`, `sim.js`, `data.js`, `finance.js`, numbering, placement, delegation, saving/loading, main-loop code and all existing test scripts are unchanged from the parent. The new presentation helper only reads the existing career result. Opening the career section uses existing panel/Pause rules. There is no simulation dispatch from the label updater.

Master, accepted V62 preview, public review Site, original candidates/packages and normal saves are outside this candidate and untouched. PR #2 remains excluded. No deployment or merge is authorized by this candidate.

## Executed checks

| Check | Result |
| --- | --- |
| `node tests/headless/tcareer_hud.mjs` | PASS: 6 groups covering actual bottlenecks, both shortfalls, cents, all tiers, pending promotion, eligibility/title visibility, read-only update, keyboard isolation and separate Finance/Career navigation. |
| `node tests/headless/tcareer37.mjs` | PASS: 18 existing career integration groups, including eligibility, progression, acquisition and raw/compressed portfolio saves. |
| `node tests/headless/tpause_policy.mjs` | PASS: 13 existing Pause-policy groups. |
| `node tests/headless/tfinancial_trust.mjs` | PASS: existing financial-trust checks. |
| JS syntax and `git diff --check` | PASS. |
| `tcareer37_economy.mjs` | NOT EXECUTED beyond prerequisite check: requires an immutable Candidate 36 export via `SST_BASELINE_36`, not supplied to this run. This is a harness prerequisite, not a demonstrated candidate defect. |
| Rendered 375×667 and 390×844 | NOT TESTED: Playwright is present, but its configured Chromium executable is absent; launch failed before any page or WebGL initialization. |
| Physical iPhone Safari, VoiceOver and full-game WebGL | NOT TESTED for this candidate. Prior iPhone acceptance does not cover it. |

No screenshots are claimed. No browser download, deployment or replacement test environment was used to conceal the unavailable rendered checks.

## Remaining focused acceptance

In an isolated browser context, verify both requested viewport sizes: no text clipping, no overlap with Finance/time/floor controls or advice; sufficient map space; correct career destination; cash still opens Finance; Pause remains selected when the career panel closes. Check property-only, rent-only and simultaneous shortfalls, highest tier, excluded modes and camera-controls open/close. Check accessible name, focus and native activation. These are future checks, not completed evidence.
