# Reserve-wait prototype — local candidate

Base: `354ee287337f7579c933f854eae261028a95c9dc`.
Branch: `candidate/reserve-wait-prototype-20261019`.

The rescued Comeback Yard's existing frontage investment cards offer “Wait until reserve is covered” when the live post-investment buffer is negative. This is opt-in ordinary 4× play, capped at seven simulated days. It follows one exact build specification on one simulation instance, independently of recommendation ordering. The live quote uses `sim.plan`, `sim.planDailyCost` and `sim.financialPosition({spend, extraDaily})`, shared with the ordinary proposal cards. No forecast or alternative affordability calculation is introduced.

Each simulated minute is checked within the production batch loop. Covering the reserve stops time and offers a preview of the original footprint. Ordinary placement review and explicit Confirm remain required; waiting spends nothing and changes no rents, hiring, policies or goals. An already-funded offer opens preview without starting the clock.

Owner requests, uncovered work, unreachable work, critical equipment faults, service/access loss, move-outs, financial insolvency, changed placement/quote/supporting demand, and the seven-day limit stop waiting paused. Expected below-reserve warnings and automatically covered staff work, including ordinary shift/capacity waiting, do not interrupt. Critical access/power/equipment events at another company property also stop waiting.

Explicit Pause, Stop, speed selection, inspection, UI navigation, blocking popups, orientation holds, backgrounding, focus loss, pagehide, property changes and session attachment cancel waiting. Explicit run-speed choices retain their ordinary behavior; automatic cancellation stays paused. Popup dismissal and foregrounding cannot resurrect the cancelled 4× wait. Residual frame accumulator time is cleared. Wait state, status and completion-preview specification are session-only; no save fields or schema changes.

## Validation

- `node tests/headless/treserve_wait.mjs`: production 240-minute batch stops at the exact funded minute; whole-state parity against ordinary play; stable specification despite recommendation reordering; quote/demand/placement invalidation; actionable events and work; seven-day boundary; real staff request classification/coverage escalation; explicit speeds and Space; nested popup pauses; production visibility, blur, pagehide and property-switch handlers; UI arming, blockers, stale/already-funded offers and original-footprint completion preview.
- Natural paired wait: 4,980 minutes of full-state parity, ending paused for uncovered work with $1,219 cash. This run uses normal simulation receipts and events, with fixture starting cash. The exact funded-minute regression separately uses an explicit test receipt, identically applied to both simulations.
- Existing pause policy: 13 checks; Sandbox placement/Confirm: 16 paths; request handling: 53 checks; review repairs: 14 checks. All passed.
- Existing occupancy/proposal checks, four prior defect regressions, layout hierarchy and production raw/compressed project save retention all passed. The proposal markup check now includes the additional explanatory line only for negative-buffer cards.
- Actual uploaded Day 15 save comparison, `SST_YARD_BASE=/workspace/scratch/d41199dd50ec/sst-comparison-base node tests/headless/tyard_loop.mjs /workspace/scratch/d41199dd50ec/upload/storage-day15.sst`: exact 30-day baseline state parity; Day 45 cash $2,886.20, all 26 units occupied, three tracked contracts totaling $356.25/month. Separate ordinary reinvestment path still builds a $620 5×10 on Day 37 and finishes with $2,501.19 and $118.75/month tracked rent. No normal save was loaded into a browser or written.

## Limits and retained scope

Headless tests establish behavior and state parity, not real-device acceptance or mobile performance. The new control/status still needs an isolated iPhone check before publication. Existing celebration timing remains pending natural iPhone play. This feature reduces clock monitoring; it does not shorten economic payback or skip simulation. Routine actionable interruptions can still require decisions before seven days. Traffic volume, graphics and animation are unchanged.

No push, deployment, merge, preview update or master modification was performed.
