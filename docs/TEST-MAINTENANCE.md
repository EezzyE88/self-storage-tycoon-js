# Current native regression contract

Current candidate parent: `38c4db35d1214644a0b1f5eb7ade3868c2df9e67` (Sandbox fast reserve). Accepted master remains `ee39e0986718ce33fb84018a2c108249f793e3f8`. No lighting integration, deployment or merge is implied by this gate.

Run from a clean, committed checkout:

```bash
python3 tests/headless/run_current_regressions.py --profile current --output /tmp/sst-current-qa
```

Use a new empty output directory. Python 3.11+, Node with production Web Streams, and the exact existing Git fixtures are required. The runner exports committed source, captures separate stdout/stderr and declared completion markers, rejects incomplete output, and checks production export preservation. It neither opens browser/company storage nor fetches, installs or deploys anything.

The manifest now registers **95 required entries**, including the runner-contract test, doorway jamb geometry, original fast-wait and Sandbox lifecycle tests. Counts are script entries, not unique features; imports can execute other suites. Eleven historical comparisons with missing or undeclared original input/pairing remain registered separately as BLOCKED, not PASS. Legacy ad-hoc probes are not silently presented as current regression evidence. `tests/run-headless.mjs` remains the unchanged discovery runner and is not the reliable release command.

The prior 13-file test-maintenance scope is reused from exact `0526ab8c1e256e851f22bb59ca626f74b65338fd`. Its original text and assertions remain retrievable at that commit. Updates preserve meaningful checks: two actual opposite doorway-jamb positions; current Open House restoration materials; actual chooser object IDs versus display numbering; valid upper-floor fixture numbering; deliberate off-floor refusal; actual guide blocking/scrolling behavior; existing-vacancy investment controls; deterministic climate conversion, rental eligibility and real raw/compressed saves. Economic coefficients are not changed to satisfy a stochastic deadline.

Floor-context tests retain mixed heights, four camera orientations, Exterior/F1–F3 context, active-floor selection, camera preservation, repeated-rebuild stability and exact complete simulation state. `sim.js`, `unitnumbering.js`, `vertical.js` and `openhouse.js` remain byte-identical to their original `1339648` baseline. The valid entire `main.js` identity assertion now points to exact `3c92a5e`, which intentionally introduced fast-reserve clock dispatch; the file is not ignored or normalized. `tfloor_view` is unchanged. Existing Pause, source-preservation and save assertions remain required.

The current manifest preserves all exact prerequisite declarations. Numbering comparison exports `9700d9d4475555e1a4907d1702cb8d81d31ded55`; floor context reads `1339648652cf61bfce23a96a60cbb54a7006c32a` and `3c92a5eb6a8d906264e9019e26fa24a100bffb31`; coach/review-space checks retain their original immutable objects. Missing prerequisites are BLOCKED and never substituted with a current company.

Other profiles:

```bash
python3 tests/headless/run_current_regressions.py --profile stress --output /tmp/sst-stress
python3 tests/headless/run_current_regressions.py --profile observations --output /tmp/sst-observations
python3 tests/headless/run_current_regressions.py --profile historical --output /tmp/sst-historical
```

The stress profile runs 30 seeded mode runs of 120 game days each. Observations reproduce the original 20-day climate-conversion operator and record whether its historical deadline happened; OBSERVATION is never a regression PASS. The historical profile deliberately reports missing/undeclared original inputs as BLOCKED, with exit 2. The runner retains assessed stdout/stderr inside its report with byte counts and SHA256, alongside separate logs; a retained-log mismatch is ERROR. Its fourteen contract tests include truncation detection and exact capture identity, as well as false passes, missing completion, failures printed despite exit 0, exceptions, timeout, missing fixtures and status aggregation.

Native/CPU scene and controlled DOM results do not establish rendered WebGL, physical Safari, touch ergonomics, VoiceOver, enjoyment or device performance. No unchanged WebGL-disabled browser attempt is repeated.
