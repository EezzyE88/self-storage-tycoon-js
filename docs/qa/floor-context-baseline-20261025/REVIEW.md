# Floor context baseline repair — October 25, 2026

Branch: repair/floor-context-baseline-20261025.
Parent: bf0fe33866e1a1736719b9497a4a66d1080e5072.
Assessed repair: b93b935 (full identity/tree in results.json).

Only tfloor_context’s sim.js identity baseline changed: exact d84fb59171152e670a5d3d2940830310fd7cc1d9, reflecting intervening intentional maintenance, automatic opening, unit upgrades and entrance-route changes. That immutable prerequisite was added to this entry’s required_objects. unitnumbering.js, vertical.js and openhouse.js retain exact 1339648 comparisons; main.js retains exact 3c92a5e comparison. All behavioral assertions, historic renderer comparisons, production code and completion requirements remain unchanged.

Only tfloor_context was selected and executed once from a clean committed export, using the unchanged gate export/run_entry/assess/verify_capture functions and its declared manifest prerequisites. PASS, exit 0: 12 gameplay checks from the test’s existing tthreefloor import plus the floor-context suite’s completion, totaling 13 PASS markers. Mixed heights, four orientations, Exterior/F1–F3 context, active-floor selection/inspection, manual camera preservation, rebuild stability and complete-state preservation passed. No new failure. Terminal completion and minimum PASS markers met; stdout/stderr hashes verified. All exported files remained unchanged.

Prior 95-entry evidence, both renderer-loader attempts and performance-fixture evidence were hash-verified unchanged. Original hashes are retained in prior-evidence-sha256.json. No other gate entries were rerun. This is CPU/stubbed GPU evidence only; no WebGL pixels, browser or physical Safari acceptance. The full 95-entry gate has not been rerun or declared green. No push, merge or deployment; existing master, previews and saves untouched.
