# Full current gate — October 25, 2026

Assessed source: e8e29e711d6ff676149f89cd19d8a0f22d459bea. Tree: 0079f9773311e1d3d9909cf5b7d29bb6e1699bfb.
Command: python3 tests/headless/run_current_regressions.py --profile current --ref e8e29e711d6ff676149f89cd19d8a0f22d459bea --output /workspace/scratch/40d3cb6a92ec/full-gate-e8e29e7-20261025

## Actual release status: HOLD / native gate NOT PASS

95 selected and attempted; 94 PASS, 1 FAIL, 0 ERROR, 0 BLOCKED, 0 TIMEOUT, 0 NOT_RUN. Complete run; exit 1. Production export unchanged. All prior evidence hashes and every assessed stdout/stderr capture verified. The complete report, original summary and all per-entry logs are retained without alteration.

Sole failure: tbplus_payback, final assertion at line 70: six-unit package must take more than 18 months (or not pay back). Seed 4401 pays back at Day 566 / 17.83 months; seeds 2026 and 424242 remain 18.47 / 19.23 months. The failing seed matches prior retained integration and exact 6e278d6 diagnosis. The earlier paired diagnostic established the intentional lighting feature boundary moved this case from 19.33 to 17.83 months. The absolute benchmark remains unchanged and failing. No expectation waiver or replacement design requirement is implied.

Newly exposed failures: none. All previously repaired renderer, performance-fixture, floor-context, borrowing lesson, floor-price/cancellation, B6, yard and historical/current migration entries PASS together in this exact consolidated run. The other original passing entries remain passing. This validates the consolidated native checks; it does not establish browser/Safari playability or resolve the public-host access blocker.

No repairs, production changes, payback changes, push, merge or deployment. This evidence-only branch starts at the assessed exact source; its later documentation commit is not a new assessed runtime. Master, previews and normal saves untouched. Next decision: resolve whether the absolute six-unit >18-month requirement remains intended after the lighting changes. Preserve the failed evidence; do not tune economics or weaken assertions merely to obtain a pass.
