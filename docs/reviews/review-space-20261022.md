# Review wording and short-screen financial space

Isolated successor of exact `58d11b1e3498165865553805282c91bcbd6bde51`, branch `candidate/review-space-20261022`. No deployment or merge.

## Confirmed problems and bounded repair

Claude's returned HTML report and screenshots establish the remaining invalid-placement hint saying "Try Flip doors" next to a Rotate button, and a very shallow financial-review scroll area at 375×667. The returned ZIP has screenshots but no raw action/state or served-hash logs; its broader restoration and camera counts remain reported findings.

Runtime changes are exactly:

- `js/ui.js`: one literal substitution, "Try Flip doors" → "Try Rotate". No changed handler, predicate, command, financial value or control.
- `css/game.css`: one appended rule for portrait screens 521–740px tall and at most 700px wide. Only full placement reviews change; idle/dragging strips are excluded. The review cap becomes the smaller of 56dvh and measured available height with a 64px yard gap. Previously the short layout reserved 150px for the yard and capped the review at 42dvh. The header and footer remain fixed outside the existing scrolling body.

At the reported 375×667 example with review-top 255px, the formula increases the cap from 198px to 284px (86px). With a 34px safe bottom it increases from 164px to 250px. These are arithmetic checks of the actual stylesheet rule, not measured browser layout or proof of a final scroll-body height. At 390×844 the new rule does not match; the prior cap stays in effect.

All other tracked runtime files are byte-identical to the exact parent, including `js/showcase.js`, `js/version.js`, renderer, simulation, economics, placement/input, numbering, progression and storage/save code. The build name intentionally remains `v62-open-house-integrated-20261022`; identify the successor by exact commit/hash, not the title alone. No normal save was opened.

## Corrected acceptance criterion

See `docs/qa/REVIEW-SPACE-ACCEPTANCE-20261022.md` for the authoritative focused follow-up checklist. It replaces the earlier requirement to photograph an on-screen Part 2 banner during the active tutorial with two separate checks:

- T2-N: actual unit/card/generated completion text use the correct current unit number.
- T2-V: celebrations remain suppressed during the active tutorial under the existing policy.

The suppression already exists in 1339648 and is not an integration regression. Number translation can pass independently of on-screen banner visibility. Changing the checklist does not prove rendered acceptance. Original packages, source reports and Claude returns remain preserved as historical records.

## Executed verification

All eleven selected scripts exited zero. Logs and machine-readable results are in `docs/reviews/review-space-20261022/`:

- `treview_space.mjs`: four groups exercise production invalid/valid review HTML, disabled invalid Confirm, real financial terms and footer placement, paused company isolation, actual stylesheet budget at both requested dimensions and unchanged banner source.
- `ttutorial_guidance.mjs`: six groups including banner number translation and pointer geometry at both sizes.
- `tblueprint.mjs`: 26 checks.
- `tpause_policy.mjs`: 13 checks.
- `tbuildability.mjs`: 41 groups.
- `tbuildability_save.mjs`: raw/compressed save and rotated construction restoration.
- `tsave_recovery.mjs`: 14 checks.
- `tgestures.mjs`: 12 checks.
- `tcontrol_access.mjs`: existing control-access regressions.
- `tfloor_context.mjs`: mixed-height scene graph, active-floor selection and camera preservation.
- `tcoach_floor_selection.mjs`: cross-floor coach selection and parent-regression reproduction.

The new test initially expected DOM action `rotate`; production uses `rotateBuild`. The assertion was corrected; no game action changed to satisfy it. Syntax and whitespace checks pass. Diff verification confirms the complete UI difference is the single requested literal substitution and the only other runtime change is the appended CSS rule.

## Honest acceptance status

Automated source/HTML/geometry checks: PASS at their stated scope. Actual rendered layout at 375×667 and 390×844: NOT TESTED for this successor. Physical Safari, real browser chrome/safe areas, touch scrolling and loaded-font behaviour: NOT TESTED. The earlier browser-policy rejection remains in effect; no alternate browser path was used to bypass it. Claude's earlier rendered evidence covers 58d11b1, not this successor.

HOLD for final visual acceptance until the focused checklist is executed in a supported browser and on physical Safari as applicable. No simulation stress rerun was necessary for this two-file presentation repair; the earlier integration stress results remain attached to their original exact commit, not relabelled as this successor's execution.

Master, accepted V62, original candidate heads, original packages and deployments are preserved. No PR #2 changes are included. No deployment or merge is performed.
