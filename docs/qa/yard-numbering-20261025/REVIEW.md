# Yard and numbering test correction — October 25, 2026

Branch: repair/yard-numbering-tests-20261025. Parent c17b98482cd8f0743f91e67ed77c2a43ec6d9723. Assessed passing source 01d4549 (full SHA/tree in attempt2/results.json).

## Changes

tyard40: only the available-funds pair changed to [784.79,157.79], with the independent $8.44 upkeep/reserve explanation in a comment. Fixtures, costs and all other assertions unchanged.

Historical numbering: original tunitnumbering_parity.mjs from exact 1339648652cf61bfce23a96a60cbb54a7006c32a retained byte-for-byte under tests/fixtures/numbering-1339648. The current entry verifies those bytes against that immutable Git object, runs the unchanged script in a disposable directory against verified 1339648 JS and exact 9700d9d4475555e1a4907d1702cb8d81d31ded55 parent JS. It preserves original assertions, numbering/display-only exclusions, three seeded 30-day comparisons and four scenario starts. Neither historical source is patched or replaced with current production.

Current engine: loads each same legacy state directly and through the established 1339648 numbering migration followed by current load. It checks original legacy gameplay on initial load with only the original numbering/display exclusions, then compares entire direct/two-stage states exactly. It advances both paths plus a JSON-reloaded copy under current rules; checks complete state at each day and after daily reload; verifies input legacy state unchanged. Financial, condition and RNG values are not excluded or tolerated. Coverage: fresh and five-day-aged legacy snapshots for seeds 7/99/9711, 30 current days each; comeback/turnaround/vertical/climate legacy scenarios for three current days each. Ten current-engine cases plus seven original historical completion markers.

Reload comparisons use the complete JSON-serializable state, not the production raw/compressed save envelope. This faithfully omits undefined object properties, but retains every serialized gameplay value. This is not a new end-to-end save-format certification.

Manifest: only numbering entry changed, adding exact 1339648 export/prerequisite and the new explicit completion marker. The unchanged gate exports immutable JS for both historical sources. No production code or payback expectations changed.

## Results and retained attempts

Only tyard40 and tunitnumbering_parity were selected. Attempt1: yard PASS and original historical pairing PASS; new current reload assertion failed on absent versus undefined customer fields (climate/keen/size). Attempt2 changed only reload comparisons to compare both complete JSON representations, with no field-specific ignore list; both selected entries PASS. All 17 numbering PASS markers and 11 yard groups completed. No remaining newly exposed failure.

Both attempts ran from clean committed exports with the existing gate export/run_entry/assess/verify_capture machinery, declared fixtures/timeouts/completion rules. All assessed capture hashes match logs. Source exports unchanged. Prior original gate and isolated repair evidence were hash-verified unchanged. Both attempts and exact source inventories retained. focused-runner.py records the actual external orchestration (environment paths require adjustment for reuse; new output directory required).

No other entries selected. Full 95-entry gate not rerun or declared green. Remaining payback benchmark was not executed or changed. Native/disposable simulation and synthetic UI evidence only; browser/physical Safari not tested. No push, merge or deployment; master, existing previews and normal saves untouched.
