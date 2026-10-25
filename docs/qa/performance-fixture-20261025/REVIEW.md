# Performance fixture repair — October 25, 2026

Branch: repair/performance-fixture-autoopen-20261025.
Parent: b83ba00842f78c8087e1bb4933e1fd3a720b7af6.
Assessed source: d93b141 (full identity and tree in results.json).

Only change: add autoOpenEnabled:()=>true to the synthetic coach simulation in tests/headless/tperformance.mjs. True represents the fixture’s ordinary Sandbox context, with no scenario or teaching flow. This supplies the existing production query without disabling the automatic-opening branch. Existing empty object inventory and occupancy/operations stubs remain intact. No production code or assertions changed.

Only tperformance was executed, once, from a clean committed source export, using its unchanged manifest command/completion requirements and the existing gate’s export/run_entry/assess/verify_capture functions. Exit 0; 11 performance/UI regression checks passed. No new failure. Retained stdout/stderr match captured hashes. Every exported file remained unchanged.

All files in the prior 95-entry and both renderer-loader attempt evidence directories were verified unchanged; prior-evidence-sha256.json retains their hashes. No other tests were rerun. The broader gate remains unresolved, including tfloor_context’s previously exposed historical source-identity failure. This result is native CPU/stubbed GPU evidence, not measured browser/device performance or physical Safari acceptance.

No push, merge or deployment. Master, previews and normal saves were not touched.
