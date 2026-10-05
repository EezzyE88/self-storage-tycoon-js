# Customer complaint capacity audit — 2026-10-05

Build: **bplus-complaint-capacity-candidate-14**. Branch: `candidate/complaint-audit-20261005`. Base: existing published candidate13 `ad57e1300856b01264d8bc0596038ad6e75f5468`. Only EezzyE88/self-storage-tycoon-js was used. Master was verified live at `2812abf8d268f9a225e5786d173f95efcbd6223d` (2026-10-03T13:58:01-07:00); open PR search returned none. Existing candidates10–13 already implement location guidance, robust feedback gestures and status displays; this candidate retains them rather than rebuilding or removing completed work.

## Confirmed defect and correction

`chooseDest` reported Loading bays are full before returning reachable marked parking or asphalt overflow. A prior automated test incorrectly required this complaint even when overflow succeeded. The corrected trigger runs only after both overflow alternatives fail. Destination selection, the +10 walking penalty for overflow, and the existing occupied-loading fallback are unchanged. The complaint means a temporary shortage of free reachable spaces, not proof of a disconnected route or an instruction to immediately expand. No complaint occurs merely because marked loading bays are occupied.

Equivalent bad reports from the same customer and target/product are emitted once per visit; repeated checks do not inflate occurrence counts. Separate visitors still count repeated shortages. Distinct locations or causes remain reportable. Per-visitor presentation keys are bounded to32 and survive JSON resume. Existing grouped history is limited to40 reports. Old overflow-positive reports explicitly explain that overflow was available; older reports without overflow metadata do not invent it.

## Audit coverage

| Source path | Cause class and player remedy |
|---|---|
| Interior loading destination | True free-space shortage only after reachable alternatives fail. Wait for turnover; consider connected local bays only for repeated pressure. |
| Keypad queue | Temporary congestion. Allow service; inspect persistent gate/power faults. |
| Keypad failure / unanswered buzz | Access failure versus office staffing gap. Repair/restore power; review office hours and available Clerk/Owner coverage. |
| Missing vehicle destination / pedestrian unit or office route | Access failure. Connect the relevant driveway, entrance, hall and upper-floor access. Hiring or disconnected extra bays do not repair routes. |
| Empty cart corral / cart request | Local stock/distribution. Current counts distinguish claimable, in-use, stranded and worn/damaged carts. Check recovery policy, jobs, Porter shift/routes/work-hours; wait for busy carts or recover existing stock before buying. Counts are current, not invented historical observations. |
| Cart route fallback to stairs | Access/freight failure. Review destination building's elevator power/condition and repair queue. Stairs cannot carry carts. |
| Dark hall / light request | Coverage, power or maintenance. Inspect the reported floor/unit and light repair jobs. |
| Dirty restroom / absent working restroom | Cleaning versus amenity availability. Inspect the exact restroom, power/water/construction and local cleaning-job staffing blocker. Dirty hall/loading advice points to Cleanliness map jobs, Porter shifts/routes/capacity. More amenities do not clean existing ones. |
| Elevator power/fault/boarding delay | Access failure versus temporary congestion. Restore power or repair first; consider connected capacity only for repeated waits on a working lift. |
| noSize/noClimate/noReady | Product availability. Requested-size inventory distinguishes occupied/reserved, unfinished, unready, blocked and accessible ready stock. Review commissioning/make-ready/access/HVAC before expansion. |
| Price/convenience/competitor/reputation/shopping | Market outcomes. Compare rent/quality, recurring local service bottlenecks and market demand. Normal comparison shopping needs no immediate fix; price cuts cost income and do not guarantee conversion. |
| Break-in/security notice | Security risk. Review reported location's lighting/camera/power coverage; preserve existing response costs and consequences. No prevention guarantee. |
| Rent objection / move-out / sizing request | Retention/product choices. Existing hold/discount/sizing choices and income/quality consequences remain unchanged. Normal move-out requires turnover, not invented maintenance. |
| Negative reviews | Property-wide satisfaction/service measures, not exact-location reports. All six generated negative dimensions now have remedies. UI identifies aggregation and directs exact-location investigation to Customer feedback. |
| Coach, lost-demand summary and normal positive/neutral feedback | Coach uses existing aggregate diagnostics and operational pins. Lost-demand copy no longer asserts no units exist or automatically recommends construction. Positive/neutral comments remain outside fault guidance. |

All24 negative thought families, nine customer/security request families, all six negative review dimensions and the lost-demand/coach presentation paths were inspected. Loan/collections/competitor-watch are financial/management notices, retaining their existing controls. Detailed original family mapping remains in COMPLAINT-GUIDANCE-20261004.md; input/location hardening remains in the subsequent committed reports.

## Preservation and verification

Runtime delta from candidate13: sim.js complaint trigger/presentation suppression, complaints.js read-only explanations, ui.js market/review copy, version.js. data.js, economics.js, finance.js, staffing rules, task work lengths, dirt accumulation/cleaning rates, cart costs/wear/recovery, RNG and customer routing are preserved. This change diagnoses cart starvation and cleanliness load; it does not retune or claim to eliminate those capacity pressures.

Focused suite:11 new capacity checks,38 complaint checks,33 hardening checks, plus retained feedback/touch and status checks. Marked and asphalt overflow, actual shortage, per-visitor spam, different customers, different targets/causes, JSON resume, current local cart stock/policy, read-only cleaning advice and all negative review dimensions are covered. The original bay-full test was corrected to assert silent successful overflow. An initial fixture failure assumed Maple had a restroom; the test now supplies an explicit restroom fixture. Final full-suite results are stored in complaint-capacity-results-20261005.json.

Three deterministic comparisons with candidate13 (seeds1,982,20261004;4320 minute steps each) passed exact authoritative state equality after removing only thought histories and new per-customer presentation keys. This supports unchanged economy/gameplay, not a whole-game bug-free claim. No browser executable or agent-browser CLI is installed here; automated Node/DOM tests are not physical Safari acceptance.

## Release and Safari acceptance

Isolated owner-private beta, unmerged. Package exact immutable GitHub runtime with source-proof.json identifying this candidate and hashes for all runtime assets. Keep the same owner-only Preview audience. Master must remain unchanged. Physical Safari acceptance is **HOLD/pending**: confirm displayed build/source proof; use a test save to fill marked bays while overflow remains, then exhaust alternatives; check that only true shortages report; inspect exact location and cart/cleaning guidance; test complaint taps, save/reload/continue and normal background/resume. Do not infer phone FPS, enjoyment or acceptance from these automated checks.
