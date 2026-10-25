# CPU renderer import repair — October 25, 2026

Branch: `repair/cpu-renderer-import-20261025`.
Parent local integration: `a731139` (same tree as remote integration `c2296834fa05dfb0e3097a78b638eb42c875e9d2`; distinct commit identities).
Assessed repair: `98e8a576ebc236b1079e97abb9a2dea594304d4d`.

## Change

One line in tests/performance/renderer-fixture.mjs resolves ./unitupgrades.js to its native file URL before importing the renderer through a data URL. The actual production module and its dependencies execute normally. No production code, assertions, manifest, GPU stubs or economic expectations changed.

## Focused results

Only the 18 ERROR entries from the prior retained 95-entry run were selected, using the committed current-regressions.json entries and the existing runner's export, run_entry, assess and verify_capture functions. All 18 were attempted against a clean committed export. Result: **16 PASS / 1 FAIL / 1 ERROR**. No remaining unitupgrades.js resolution errors. The other 77 entries were not rerun; the complete gate is not newly green.

Two newly exposed failures were preserved, not repaired:

- tfloor_context: FAIL at line 90, whole-file js/sim.js identity comparison with historical 1339648. The current source intentionally includes later upgrades and other changes. This is a stale source-preservation assertion, not evidence of a rendered floor defect. Assertions reached before it did not fail; no full suite PASS is claimed. Later assertions were not reached.
- tperformance: ERROR at UI.coachHint because its synthetic simulation lacks autoOpenEnabled(). The real Sim defines this method; the fixture at tests/headless/tperformance.mjs line 18 does not. This is a newly exposed fixture compatibility problem. Eight preceding checks passed; occupancy-hint checks did not complete. It is not a measured performance failure.

## Evidence and preservation

Attempt1 retains all child logs and its wrapper failure. The wrapper's post-run check mistakenly required generated documentation to remain unchanged, then aborted before serializing results. Attempt2 changed only the external reporting wrapper to record all changed paths and separately verify production files, matching the existing runner boundary. No game or test changes occurred between attempts. Both attempts produced the same child statuses.

Attempt2/results.json retains stdout/stderr, SHA256 values, declared completion requirements, exact exported source inventory and historical exports. All captured logs match assessed bytes. The sole changed exported file was docs/qa/comeback-yard/recovery-paths.json, generated inside the disposable export. Production export unchanged: true. Original 95-entry evidence unchanged: true (full file hashes retained). Existing worktrees, previews and saves were not used or changed. No push, merge or deployment.

The focused-runner.py file preserves the actual external wrapper; its paths identify this environment and its output directory must be changed to a new empty directory for reuse. This is focused native/CPU evidence only; no browser, WebGL or physical Safari acceptance.
