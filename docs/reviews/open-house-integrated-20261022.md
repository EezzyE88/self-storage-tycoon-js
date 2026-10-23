# Isolated Open House integration — 2026-10-22

Status: all 18 selected automated regression scripts PASS; rendered layout, WebGL pixels and physical iPhone Safari acceptance remain NOT TESTED. No deployment or merge into master.

## Exact inputs

- Starting parent: F2 successor `a8be9d03c2b6cc9322acc8f74178dd6f0f241dcf`.
- Tutorial-only change set: `1339648652cf61bfce23a96a60cbb54a7006c32a..1c4f15e3d3533254b7aa022c49af07f1c500bd3b`.
- Shared numbered baseline: `1339648652cf61bfce23a96a60cbb54a7006c32a`.
- Isolated branch: `candidate/open-house-integrated-20261022`.
- Distinct display build: `v62-open-house-integrated-20261022`.

The tutorial patch applies cleanly to the exact F2 successor. Every pre-existing file was compared with a conflict-free union of the two input commits. The only additional runtime difference is the requested `js/version.js` identifier. New integration documentation and execution logs accompany the result. The original candidates and packages remain preserved.

## Combined scope against 1339648

| Runtime file | Included change |
|---|---|
| `js/render.js` | Lower buildings remain roofed context below the inspected floor, from the F2 successor |
| `js/ui.js` | Active-floor selection/inspection and camera preservation; coach switches floor before selection; tutorial pointer-caption collision repair |
| `js/tutorial.js` | Correct control/pin wording and shared read-only unit-number text translation |
| `js/showcase.js` | Completion and next-part banner titles use the same live unit-number translation |
| `css/game.css` | Instruction wrapping and scroll access instead of line truncation |
| `js/version.js` | Distinct integration build identifier |

No other runtime file changes. Simulation, economics, numbering allocation, save schema/storage, dispatch, placement, progression, input handlers and tutorial completion predicates are byte-identical to the numbered baseline. PR #2 is excluded. F2 context intentionally uses simple roof/body representations; visual quality still requires acceptance.

## Executed validation

All scripts below exited zero in the integrated worktree. Detailed logs, machine-readable results and exact-union verification are in `docs/reviews/open-house-integrated-20261022/`.

1. `ttutorial_guidance.mjs`: six groups, including production banner path, live role numbers and 390×844/375×667 rectangle/DOM-double checks.
2. `tcoach_floor_selection.mjs`: cross-floor routes, including F1 targets, and reproduction of the old handler regression.
3. `tfloor_context.mjs`: mixed one-/two-/three-storey scene fixtures, Exterior/F1–F3, four rotations, active-floor selection and camera preservation.
4. `tblueprint.mjs`: 26 checks.
5. `topenhouse.mjs`: CPU scene structure.
6. `topenhouse_qa.mjs`: seven checks.
7. `tgestures.mjs`: 12 checks.
8. `tunitnumbering.mjs`: nine groups.
9. `tunitnumbering_vertical_legacy.mjs <unchanged 9700d9d checkout>`: all native parent expansion-phase migrations.
10. `tunitnumbering_parity.mjs <unchanged 9700d9d checkout>`: three-seed 30-day gameplay comparison and scenario/migration parity.
11. `tpause_policy.mjs`: 13 checks.
12. `tsandbox_build_pause.mjs`: placement/Confirm pause behaviour.
13. `tbuildability_save.mjs`: four-direction placement and raw/compressed save restoration.
14. `tsave_recovery.mjs`: 14 checks.
15. `tthreefloor_save.mjs`: native saves, construction checkpoints, no repeated charges and atomic rejection.
16. `tthreefloor_hardening.mjs`: 7,200 mixed elevator journeys and four 30-day simulations.
17. `tthreefloor_journeys.mjs`: four F3 customer/cart journeys, 15 reload checkpoints, four outage recoveries and 36 burst callers.
18. `tclock24.mjs`: speed timing and guidance.

JavaScript syntax and whitespace checks pass. These are headless logic, scene-graph and fixture checks, not rendered gameplay acceptance. The F2 scene regression includes synthetic shorter-shell fixtures; that evidence must not be presented as a completed UI-built mixed-height playthrough.

The earlier F2 report records two old assertion failures reproduced on unchanged 1339648 (`tthreefloor_parity.mjs`, frozen data baseline; `tcandidate22.mjs`, obsolete building-heading expectation). They were not repaired or rerun in this integration and are not counted among the passing scripts.

## Release and browser boundary

Master was observed at `f6e4c1eace1720dc703d8cd5758626b158b6aa03`. Accepted V62 is preserved. This task neither accesses normal browser saves nor publishes either preview. The previous tutorial-only Claude ZIP remains valid for its exact older scope; the replacement package identifies this integration by commit, tree and distinct build name.

Remaining checks: real rendered tutorial at both requested dimensions; price/cash/Confirm readability and full instruction scrolling; completion numbering; mixed-height Exterior/F1–F3 context and active-floor inspection; camera preservation; coach routing in both directions; disposable export/import/reload/Continue. Physical iPhone Safari remains a separate NOT TESTED requirement. Do not test the public Site as though it contains this commit.
