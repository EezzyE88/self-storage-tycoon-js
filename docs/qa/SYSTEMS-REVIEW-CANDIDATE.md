# Gameplay and systems review — 2026-10-04

Repository: EezzyE88/self-storage-tycoon-js (JavaScript/Three.js only).
Candidate branch: candidate/systems-review-20261004.
Parent: 248e7c3f1f5798fd9335b2bdee496d60384223b7, retaining earlier B+ menu and placement fixes.
B+ ancestor: fa0615659077931c8a02dd6f3792b39f9bffb2ff.
Accepted master: 2812abf8d268f9a225e5786d173f95efcbd6223d; no merge or master update.
Build: bplus-systems-review-candidate-6.

## Outcome

Confirmed persistence, portfolio, tutorial, customer-cart and renderer ownership defects were fixed. Construction dependency work is cached between structural mutations. Existing economics and save encodings remain intact. This is a tested candidate, not a claim of zero bugs or completed physical iPhone acceptance.

## Findings and implementation

| Priority | Trigger and previous behavior | Result |
|---|---|---|
| High | Switch properties while gzip autosave is awaiting compression: old state receives the newly selected property's metadata. | JSON and metadata are captured together before yielding; kept-save metadata uses the same rule. |
| High | Start a replacement game while an earlier autosave is compressing: it can overwrite the current slot. | Company identity and a save sequence reject superseded writes; a replacement remains eligible for the next autosave. |
| High | Leave while normal autosave is compressing: the saving guard suppresses the leave save, and asynchronous compression may freeze before storage. | Leaving writes compatible SST0 to local storage synchronously, superseding pending compression. Normal saves retain SST1 gzip. A best-effort cloud request is not counted as confirmed persistence. |
| High | Import a company with negative/noninteger/out-of-range active property: company assignment occurs before attaching an undefined property. | Validate active index, names, feed shape and supplied two-floor arrays before committing the portfolio. Rejecting malformed imports preserves the live company. |
| Medium | Send negative, zero, nonfinite or nonnumeric portfolio transfer amounts. | Reject before any cash or ledger mutation; successful transfer still conserves company cash. |
| Medium | Autosave when browser storage is full; corrupt main envelope exists alongside a valid backup. | Menu explicitly says the latest save failed and recommends exporting. A malformed main envelope no longer replaces the good backup. The existing quota retry policy is retained. |
| Medium | Build an upstairs shell/hall/entrance before its connected aisle. Later completed steps previously hid the missing aisle; the guide used only loading cells once a door existed. | Upstairs lesson selects the first missing structural requirement. Access geometry follows the actual entrance and finds connected paving; existing reachable or pending paving is retained. Other tutorials keep their existing progression rules. |
| Medium | A cart-return corral disappears, or a corral trip reports a blocked path. | Return releases the cart into a stranded, staff-recoverable state; blocked outbound/return trips continue toward the unit or departure rather than retaining the failed state. |
| Medium | Remove a rendered customer using a cached skin material. The shared-resource set held the skin array instead of its materials. | Flatten material arrays when registering shared ownership; per-instance resources are still disposed. |
| Performance | Every active construction order repeatedly scans ground orders and allocates overlapping-cell sets each simulated minute. | Cache predecessor results by structV. Build, cancellation, completion and load invalidate/recreate derived data. Original order-array precedence is preserved, including unsorted imported arrays. No new saved fields. |
| Low | Attach another property/session with an old partial fixed-step accumulator. | Reset the accumulator so the new session starts with its own frame budget. |

## Review coverage

| Area | Review and verification |
|---|---|
| Construction and readiness | Real planner validation, shell dependencies, overlapping paving/paint, cancellations/refunds, utility/access readiness, upstairs commissioning; blueprint and randomized-action tests. |
| Customer lifecycle | Gate and office queues, vehicle routing, cart acquisition/return, unit trips, restroom trips, departure, elevators and stairs; focused recovery tests plus long simulation runs. |
| Staff and operations | Work capacity/reservation/refund, path failure, owner chores, automatic task selection, vendors, manager actions and cart recovery; staffing/capacity/regression scripts. |
| Money and portfolio | 7:00 financial batch, weekly commitments, reserves, actual cash versus accruals, loans, current leases, collections ladder, acquisition clocks and transfers; existing B+ checks plus new transfer/session tests. |
| Progression | Maple tutorial, optional lessons, structural completion, scenarios and operator career; existing scenario operators and new out-of-order build regression. |
| Persistence | Raw JSON, SST0, SST1, actual game-factory states, company imports, local backup/kept slots, delayed and leave saves; actual main.js methods executed with mocked browser/storage boundaries. |
| Presentation | Canvas pointer capture/hold/pinch/pan, menu scrolling, preview/review boundaries, renderer disposal, transient effects, showcase banners, optional postprocessing and audio scheduling; source review and focused headless checks. |

Tests do not execute WebGL, physical touch, Safari's page lifecycle or the host ChatGPT shell. The renderer ownership test executes the actual disposal methods with resource doubles; it does not measure GPU memory. Cloud source verification is separate from browser gameplay. The static Safari Preview uses local browser saves; the optional local save server is not enabled there.

## Reproducible test evidence

Run from repository root with Node 24:

- `node tests/run-headless.mjs /tmp/sst-systems-final-suite`: 34/34 scripts pass on the final source. Includes assertion suites and exploratory probes, not merely 34 individual assertions.
- `node tests/headless/tsystems.mjs`: 16 focused regression checks pass. Covers raw/gzip saves from Maple, sandbox and every scenario; malformed company imports; portfolio active index; switch/replacement/hide races; failed persistence; transfers; shared GPU resources; dependency equivalence/invalidation/restore; door-first upstairs recovery; storage error/backup handling; customer carts.
- `node tests/headless/tblueprint.mjs`: 26 placement/recovery checks pass, including offset/mirrored/small shells, normal construction and save/resume.
- `node tests/headless/tmenu_touch.mjs`: 7 menu/touch checks pass.
- `node tests/headless/tbplus.mjs`: 21 finance/economy checks pass, including midcycle restore and identical future settlement.
- `node tests/stress/tstress.mjs A 1`: dense lot of 550 units (525 operating initially), triple demand, 10 staff; one simulated year and repeated restore probes completed. Peak 71 agents, peak save 613 KB. Worst simulated game-day processing 80 ms on this Node machine; late-run save JSON serialization 3.5 ms and Sim restore 4.0 ms. These are CPU timings, not iPhone FPS.
- `node tests/headless/tfuzz.mjs 365 8`: 72 runs across nine modes/eight seeds reached Day 366, with 474,034 random actions (74,886 accepted) and no invariant issues. Periodic JSON restores were exercised. Full summary is in systems-review-evidence.json.
- Syntax checks and `git diff --check` pass.

Optimization evidence: 30,000 predecessor queries took about 1.0 ms cached versus 25.1 ms using the original calculation in the focused run; concurrent suite timing varies. This is an isolated microbenchmark, not whole-game speedup. The cache is compared with the original scan across cancellation/completion-like mutations and save restore, and both calculations produce deep-equal complete simulation state after seven days of overlapping real construction.

## B+ balance assessment

Cost/rent/wage constants, finance module, market/scenario factories, billing/debt/collections rules, refund formulas and save schema were not retuned. The two cart recovery fixes can change downstream customer outcomes when the defective paths are encountered; retaining a bug's exact RNG history is not a compatibility objective.

The final live expansion comparison again shows that the 12–18-month target is not universal: infill 6.07–6.37 months; complete ten-unit packages 11.97–12.93; twelve-unit packages 10.53–11.07. A six-unit complete package pays back at 19.47 months in one seed and remains short of repayment at the cutoff in two others. The comparison script passes its correctness checks; that does not mean every balance benchmark passes. This finding remains advisory under the preserve-B+ requirement.

Scenario operators completed vertical on Day 145, climate on Day 57 and turnaround on Day 109. These demonstrate known seeded strategies, not all possible player layouts.

## Release and next acceptance check

Publish only this isolated candidate to the same owner-private Preview:
https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

The packaging source-proof.json must identify this candidate's immutable commit and hash every runtime asset. After publication, fetch and verify those served hashes using authorized access; report deployment outcome separately. Accepted master remains unchanged.

In physical Safari: verify candidate-6 label; resume an existing save; build the two-floor lesson out of order and use the highlighted repair; test menus, X, map pan/pinch/rotation/F1/F2; switch properties during save; background immediately, reopen and verify current cash; export a save file; remove a corral during a customer return and observe recovery. Native ChatGPT's surrounding pull-down gesture remains host-owned; deliver this direct Safari link.

Recommended next iteration: physical Safari acceptance and measured GPU/frame profiling on a dense property, then a separate balance decision for small complete expansion packages. Further performance work should follow that profile rather than changing economy or introducing a renderer rewrite speculatively.
