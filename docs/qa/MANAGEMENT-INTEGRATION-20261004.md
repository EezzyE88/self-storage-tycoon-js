# Management integration candidate 9 — 2026-10-04

Scope: EezzyE88/self-storage-tycoon-js, JavaScript/Three.js only. Branch `candidate/management-integration-20261004`. The candidate identity is the immutable commit containing this report. Build `bplus-management-integration-candidate-9`.

## Verified base and integration checkpoint

GitHub master remained `2812abf8d268f9a225e5786d173f95efcbd6223d`. Live candidate branch remained `69932d0dba33a0cf5913d02a191f2efc3799e3aa`; staff-first remained `af86244d4fd93d017456e7085b16ef7c9fa92dc5`; gesture remained `44df37b84f95db33b52971e912a22ef31cc3d4fc`; technical review remained `7de5cbf6d017df0c1ce1243c614783e72537cd7d`. No newer remote fixes needed reconciliation.

Opened the existing owner-private Site, inspected its source proof, and independently matched the live proof plus **26/26 served runtime assets** to candidate 8 before implementation. Owner was the sole allowed viewer, with no groups or external visitors. The restored Site source commit was `efa55bef3454038b19ced539dd96297d279daa9b`; this packaging commit is distinct from the GitHub runtime candidate.

Started the isolated candidate from published runtime 69932d0. Integrated staff-first commits 5b51324 through af86244 and gesture commits eb937fb through 44df37b selectively, retaining candidate 8's overlapping delegation/UI fixes. Reconciled explicit Owner choice and the older busy-worker test expectation. Initial combined run was 36/37: the old test expected automatic Owner takeover while staff were busy. After reconciliation, **37/37 integration scripts passed before the next behavior checkpoint**. Intermediate local checkpoint commit: 6146be7.

Read all six requested committed reports/evidence files. The original director review/evidence are carried into this candidate as historical evidence, not relabeled as fresh acceptance.

## Resulting gameplay

- Suitable hired workers receive first refusal for routine work. Busy suitable staff can reserve queued work; an automatic Owner chore waits when hired capacity can cover it. No staff are auto-hired. Wages, role permissions, shifts, eight-hour work budgets and vendor costs remain consequential.
- Untouched queued Owner work can transfer to suitable staff. Active/travelling work stays assigned. Owner refund and staff reservation occur once; unsuccessful route handoffs restore the original queue and booking. Missing, partial-progress, stale-assignee and explicitly overridden entries are not migrated.
- Explicit **Send Owner / Owner quick fix / Owner Make-Ready** controls bypass staff-first dispatch. An optional `ownerOverride` task boolean preserves that choice for queued work through JSON save/resume; no schema increment or encoding change. Historical tasks lacking this flag remain readable and eligible for the new handoff behavior.
- Route preflight prevents a busy worker from reserving an unreachable job. Failed dispatch explains blocked access without silently sending the Owner. Route changes before a queued job starts refund its booking. A queue that cannot reserve capacity after the daily reset retains its assignee/queue instead of becoming an orphan.
- Jobs and equipment inspectors identify the assignee and distinguish travelling, active, queued, next shift, exhausted capacity, blocked route and vendor wait. Staff rows retain remaining capacity and queue counts. Office status identifies current servers and waiting shoppers; Clerk coverage hours and hiring cost remain explicit. Existing delegation-now, hiring review and temporary-repair guidance remain.
- Unit make-ready inspectors expose staff delegation/queueing even when the Owner's own hours are exhausted. Owner-labelled actions remain actual Owner choices. Customer repair prompts say **Assign repair** because their generic request gives staff first refusal.

## Map gestures

Normal map double-tap zooms 1.65× toward the tapped ground/floor location, respecting existing zoom and property bounds. A single tap waits up to **320 ms** to distinguish it from a double-tap; this is a deliberate selection-latency tradeoff, not simulation timing. Double-tap does not open an inspector.

Drag, pinch, non-primary/shift pan, UI interactions, pointer cancellation, lost capture and backgrounding break pending taps. Implicit lost capture after a completed pointer-up does not cancel a valid tap. Construction quick taps never zoom/select; hold-and-drag still previews and Confirm remains required to spend. Pointer cancellation abandons the pending construction preview. Pinch behavior and exact tutorial placement guides are retained.

## Diagnostics

Removed the fixed overlay. Menu → Performance stats on → collapsible **Performance samples** holds the readout in ordinary scrolling content; it cannot cover inspector controls or map navigation. Closing the Menu keeps optional sampling enabled. Reopening it presents captured active-play samples separately from the Menu's idle samples.

Separate bounded windows (300 callbacks per mode) for **active**, **battery**, and intentional **idle** show RAF sample count, actual draw count, skipped draws and observed window duration. Draw and RAF p50/p95/p99 are distinct. Draw intervals crossing mode boundaries are omitted. Simulation CPU is recorded on every sampled callback, including skipped draws; render/UI CPU is averaged per draw, with total simulation CPU per window shown. Foreground resume resets samples. Disabled diagnostics do not collect samples.

These are CPU submission timings, not GPU timings. Resource counts are not memory bytes. No locked 60fps, thermal, battery-life or physical-memory claim is made.

## Performance comparison

Initial scene baseline was captured from candidate 8 before runtime edits. The repeated comparison uses seven alternating fresh Node processes per source, actual vendored Three.js with mocked GPU/canvas. Fixtures: seed 20261004, 23-unit Maple and 550-unit dense lot; viewport 393×720, coarse pointer/DPR3 environment, quality 2, exterior view, rotation 0/azimuth π/4, zoom 1/default centered camera. These scene timings exclude actual drawing.

Portfolio CPU fixture: same dense seed plus two Maple properties (20261005/20261006), triple demand, two Porters/two Techs/Clerk per property, 14 days, every property stepped each simulated minute. No rendered/offscreen property is paused or population capped. `portfolioP95DayMs` is the median across runs of each run's 14-day p95 (effectively its maximum), not a browser frame percentile.

| CPU metric | Published candidate 8 | Integrated candidate 9 |
|---|---:|---:|
| Maple rebuild median | 9.05 ms | 8.71 ms |
| Dense rebuild median | 27.24 ms | 25.58 ms |
| 4,000-customer churn median | 6.76 ms | 6.58 ms |
| Three-property game-day processing median | 18.93 ms | 18.61 ms |
| Median run p95 game-day processing | 63.54 ms | 61.92 ms |

No material CPU regression was observed in this fixture; small differences are not claimed as an optimization speedup. Renderer/pooling algorithms were retained. Static meshes remain 257/3,039, shadows 155/1,233, triangles 2,234/19,378. Churn still creates only 20 groups for 4,000 sequential customers at peak concurrency 20; retained group count is 20. Those allocation counts are not byte-memory measurements or a limit on simulated customers.

Reproducers: `node tests/performance/render-workload.mjs`; `node tests/performance/portfolio-workload.mjs [checkout]`. Raw timings, counts and the pre-edit baseline are committed in `management-performance-evidence-20261004.json`.

## Verification and preservation

Focused tests: 13 delegation regressions; 32 staff-first checks; 10 executed gesture/camera checks; 10 management/diagnostic checks; 11 performance/UI checks; 8 menu/touch checks; 16 systems checks; 26 blueprint/recovery checks. Includes Porter/Tech/Clerk/Manager permissions, active/queued handoffs, firing, shifts, exhausted capacity, blocked routes, reservation/refund, daily rollover, vendor takeover, existing-format save/resume, map single/double-tap, pan, pinch, building and cancellation.

The full final-source suite contains **39 scripts**, including exploratory probes as well as assertion suites. Final immutable candidate must pass the complete suite again before publication; exact commit/run result is supplied at delivery. Syntax and whitespace checks pass.

Economy data, economics/finance modules, scenarios, local save implementation, blueprint and tutorial modules are byte-for-byte unchanged from candidate 8. Simulation accumulator, tick limits, financial processing schedule, task durations, customer simulation and offscreen company stepping are preserved. Different staff assignment can change downstream business outcomes through actual staffing choices; no economy retuning or broad refactor occurred.

Browser visual verification was unavailable: the prescribed agent-browser CLI is absent and this static project has no compatible supervised cloud preview flow. No substitute browser visual result is claimed. VM-executed input handlers and actual Three.js camera tests are automated evidence only. **Physical Safari gameplay/lifecycle/GPU/thermal/Low Power acceptance remains unverified.** Historical phone feedback is not relabeled as acceptance of this build.

## Release gate and limits

Owner-private beta candidate, unmerged. Accepted master must remain unchanged. Publish the exact committed candidate to the same Site, package only immutable runtime files, identify candidate/tree/build in `source-proof.json`, and independently verify every served asset plus proof before reporting publication success. Site packaging has its own source commit; report it separately.

Safari: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

Staff are not omnipresent: hiring the wrong role, exhausted capacity, off-shift hours, missing access and payroll strain still matter. Diagnostics now trade an always-visible overlay for Menu-based review. This pass does not implement speculative material batching, quality retuning, economy rebalance, import hardening or architectural extraction. Those remain separately scoped follow-up work after representative phone acceptance.
