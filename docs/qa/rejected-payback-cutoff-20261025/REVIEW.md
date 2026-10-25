# Rejected payback cutoff removal — October 25, 2026

Branch: repair/rejected-payback-cutoff-20261025. Parent 4e4afde08906a0aea74c919a8c052a96fb88b11c. Assessed repair: 0d5dd499ffa6edd720d6e8d7cc4ee5460ee1395c.

Eddie explicitly rejected the requirement that six-unit expansion payback exceed 18 months and authorized removing only that assertion. Exactly one line removed from tests/headless/tbplus_payback.mjs. No replacement threshold, accounting formula, operator, layout check, financial-finiteness check, infill bound or ten-unit bound changed. All 12 original simulation cases still execute. Production economics and source unchanged. Original failing evidence preserved.

## Execution in requested order

1. Focused original payback entry against clean committed 0d5dd49 export: PASS, exit 0. All twelve observed result objects exactly match the prior e8e29e7 failed-gate observations. Therefore the pass reflects only removal of the explicitly rejected requirement, not changed simulation outcomes.
2. Full 95-entry current gate against the same exact 0d5dd499ffa6edd720d6e8d7cc4ee5460ee1395c: 95 PASS, 0 FAIL, 0 ERROR, 0 BLOCKED, 0 TIMEOUT, 0 NOT_RUN; exit 0. All 95 attempted, complete report, production export unchanged.

Focused execution reused the unchanged gate export/run_entry/assess/verify_capture functions and manifest entry. Full run used the unchanged official current-gate runner with --profile current and exact --ref. Node versions, source trees/inventories, commands, completion markers and stdout/stderr retained. Every retained log matches captured bytes and SHA256. Prior docs/qa evidence was hash-verified unchanged after both runs. validation-runner.py retains exact external orchestration; environment paths and output paths require adjustment for reuse.

Native release gate: PASS. This does not establish user acceptance or overall public-playtest readiness: browser/Safari acceptance and external public-host access remain outstanding and were not retried. No new gameplay defects observed in the gate. No push, merge or deployment. Master, previews and saves untouched. This documentation checkpoint records the assessed source; its later evidence commit is not a new assessed game change.
