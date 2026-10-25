# Floor-price expectation repair — October 25, 2026

Branch: repair/floor-price-expectations-20261025. Parent 4d0f7c0a272f246f9b7253b86d67cff1f0522443. Assessed repair: a49985d (full identity/tree in results.json).

## Scope and independent values

Only price-dependent numeric/string expectations changed in tc23_crash_repairs, tcancellation, tcandidate22, tthreefloor_journeys and treview_repairs, plus tcancellation’s exact manifest completion pattern. No production changes; no assertions removed, normalized or replaced by actual production results.

The existing authored floor copies one light, no camera. The intentional light price reduction from $350 to $200 lowers complete F2/F3 packages by $150: $17,660 / $10,060. The retained reinforcement remains $396, giving a second F2 quote of $17,264. At 100 minutes into the unchanged $2,574 / 1,986-minute structure stage, consumed work is $129.607250755287. Independently calculated unbuilt work is $17,134.392749244715; its 60% rounded refund is $10,281, penalty $6,853.39, total non-refundable $7,379. The cancellation sequence’s net spend is $24,643.

Expected capex sequence remains explicit: -17660, +17660, -17660, +10281, -17264. Structure-only F2 $12,470, structure-only F3 $4,870, retained reinforcement $396, consumed-work text $129.61, grace period and refund percentages unchanged. Existing stage-derived refund arithmetic remains, alongside fixed independent refund values in the other suites and the exact terminal manifest expectation.

## Focused execution

Exactly five manifest entries selected and attempted once against a clean committed export, using existing gate export/run_entry/assess/verify_capture functions, original timeouts, fixtures and completion/minimum PASS requirements (except the authorized exact cancellation amount update).

- tc23_crash_repairs: PASS
- tcancellation: PASS
- tcandidate22: PASS
- tthreefloor_journeys: PASS
- treview_repairs: PASS

No newly exposed failures. Full stdout/stderr, hashes, commands and source inventory retained in results.json and logs. Every capture matched its retained log bytes. All exported files remained unchanged. Prior original 95-entry evidence and all isolated repair attempts were hash-verified unchanged; prior hashes retained.

Charge, duplicate-charge refusal, full/partial refund, retained reinforcement, stage reconciliation, exact ledger entries, zero-cash informational rows and production save/reload assertions all remain present and passed within these selected suites. No other entries were selected or independently rerun. The complete 95-entry gate has not been rerun or declared green. Native/disposable simulation/UI evidence only; no browser or physical Safari acceptance.

No push, merge or deployment. Master, existing previews and saves untouched.
