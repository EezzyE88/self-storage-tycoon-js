# System B+ causal candidate

Repository: `EezzyE88/self-storage-tycoon-js` only. Base: `2812abf8d268f9a225e5786d173f95efcbd6223d` (`master`). Branch: `candidate/system-bplus-causal-20261003`. Build label: `bplus-causal-candidate-1`. Candidate evidence, not acceptance, release, deployment or physical iPhone verification. The branch tip identifies the exact candidate commit; its parent must equal the base above.

## Final rules and bounded corrections

- Separate daily operating performance, actual cash movement and unpaid accrued commitments. Existing collected-rent operating history is preserved; it is labeled as collected rather than guaranteed earned rent.
- One persisted, idempotent 7:00 AM financial batch handles monthly tenant bills, the existing collections ladder, daily operating/payroll/credit-interest accrual, every-seven-processed-days settlement, term debt, financial warnings and scenario checks. Settlement is cash-only and cannot book costs twice. First month is paid at signing; next bill remains 30 days later.
- Wage accrual uses employment at 7:00 AM. Hiring later starts tomorrow; firing later leaves that day's wage owed. Existing 8-hour task/office capacity remains intact.
- Net liquid position = cash minus accrued commitments minus credit-line balance. Reserve is advisory: $500 plus the next 14 future financial days of predictable costs and term payments. Accrued commitments are excluded from reserve. Borrowing creates matching debt and does not improve net liquidity.
- Available after bills & reserve is advisory cash minus accrued bills minus reserve. Construction, vendor work and advertising remain immediate cash choices. Hiring and those spending surfaces show the four figures after the action. Added construction burden includes unit tax.
- Scheduled next 30 days uses contractual bills from tenants CURRENT at calculation, future weekly cash settlements and term payments. Non-current balances appear as at-risk receivables. No payment-probability factor or projected new tenants. Show end cash, end commitments and the effect of one average scheduled payment being missed.
- Legacy migration preserves cash, leases/billing dates, receivables, debt schedules and ledger/history; initializes zero commitments; skips the current day already processed by legacy midnight accounting. No retroactive charges. Retained-ledger gaps are labeled partial cash history. B+ midcycle saves resume identically.
- Causal rows and role-specific workload evidence integrate into existing Business, Operate, Growth and property inspectors. Offline asking-rent capacity is explicitly not guaranteed revenue; affected contracted rent is separate. Existing office-service losses now enter the recent-loss log without changing behavior.
- Growth Readiness is five visible deterministic checks: demand, stability, money after the selected build, measured work headroom, and scoped payback/layout evidence. Demand requires 14 observed days, five matching availability losses, at least 90% occupancy and no matching existing vacancies. Stability requires no failed/unreliable access/climate assets, at most two make-readies and no unassigned task older than two days. Capacity requires seven measured days and fewer than three exhausted Owner days (or explicitly budgeted staff). No score or build restriction.
- Payback preview needs 14 observed days, three comparable leases and five matching shortages. Actual comparable contract rents cap asking rents; occupancy sensitivity spans observed occupancy minus 15 percentage points to observed occupancy capped at 95%. Deduct incremental costs and budgeted staff. It labels selected construction only and warns that lease-up, repairs and missed payments extend payback. It cannot certify unselected infrastructure as a complete package.
- iPhone CSS hides expanded camera controls, plus/minus and manual fit. Existing rotation, EXT/F1/F2, gestures and internal automatic initial fit are preserved.
- Verified deadline correction: goals can win at the deadline day's 7:00 checkpoint, but cannot win the next day simply because goal evaluation preceded deadline failure. Calendar and scenario text match this rule and net liquidity.

## Numerical decisions

Rents, build prices, employee wages, task capacity and advertising mechanics remain at accepted master values. Targeted advertising remains $250, local $500, duration 30 days. No arbitrary construction-price inflation.

Career rent-roll thresholds change to $4,375 / $8,750 / $18,750 / $37,500; property requirements remain 1 / 2 / 3 / 4. Maple Turnaround changes to $3,750 for NEW candidate scenarios following the evidence below; existing saves keep their stored goals.

## Deterministic evidence

`node tests/headless/tbplus.mjs`: 21 checks pass, including timing/idempotence, weekly reconciliation, wage boundaries, reserve boundaries, credit/debt, current-only forecast, forecast-versus-settlement, lease timing, migration, retained cash totals, midcycle resume, diagnostics/checklist and HTML generation. HTML generation is not browser layout verification.

Seventeen existing relevant scripts pass with zero printed failures: `tfinancial_trust`, `tcapacity`, `tfin`, `t9`, `t9b`, `t9c`, `t9d`, `t9e`, `t9f`, `tads`, `tstaffing_compare`, `tsandbox`, `tvert`, `tclim`, `tbugs`, `tfix`, `tcalm`. The old sandbox cash reconciliation was corrected to include unpaid commitments and now fails its process on a failed assertion.

`node tests/headless/tbplus_scenarios.mjs`: fixed seeds 1, 99, 777, 2026, 4401, 9001, 98765, 424242. Authored Maple starting state remains unchanged; seeds affect subsequent RNG. Operator checks once daily at 9:00, hires a Porter, performs ordinary repairs, uses ordinary collections responses, reviews rents monthly, advertises once, and builds four 10x10 drive-up units only after observed shortages/backlog/financial checks. No added cash, forced leases, instant construction or edited conditions/reputation.

| Maple run | Outcome | Minimum net liquid position |
|---|---|---|
| $3,750, daily operator, expansion no earlier than Day 30 | 8/8 won Days 35–46 | $4,402–$5,511 |
| $3,750, skips one check-in each week, expansion delayed until Day 60 | 8/8 won Days 64–69 | $6,256–$6,996 |
| $3,000 comparison | 8/8 won Days 13–25 without expansion | $6,613–$7,000 |
| Idle, seed 4401, $3,000 | Deadline failure Day 151; roll $2,309, occupancy 65.2%, reputation 64.4% | $7,000 |

Candidate decision: retain $3,750. All declared seeds, including missed check-ins and delayed expansion, finish comfortably before Day 150. This is finite deterministic evidence, not a universal human-play guarantee. Once-daily actions are competent and coordinated; broader human play remains to be checked.

`node tests/headless/tbplus_payback.mjs`: three fixed seeds (2026, 4401, 424242), four actual layouts, ordinary minute-by-minute construction/customer flow/collections/competition/wear, existing Owner + Porter spare capacity. Packages built Day 31, with ordinary carts and one $250 campaign. Payback is actual added-unit collected rent minus incremental incurred OPEX and attributable vendor/clean-out costs, measured from construction commitment, including lease-up. Complete packages include shell, access paving, loading, hall, door, lights, HVAC, units, corral and carts; they reuse the first property's existing gate/office and staff. They are first-property expansions, not standalone facilities. No additional payroll requirement was invented where measured capacity did not need it.

| Package | Investment including advertising/carts | Observed payback, 30-day months |
|---|---:|---:|
| Four drive-up infill units, existing aisle | $4,170 | 6.07–6.37 months |
| Six climate units, complete new-building package | $16,046 | 19.73 months in one seed; unpaid at 20 months in two |
| Ten climate units, complete new-building package | $19,442 | 11.43–11.90 months |
| Twelve climate units, complete new-building package | $21,434 | 10.97–11.20 months |

The ten-unit package is around the lower edge of the rough 12–18-month benchmark; efficient larger packages can be faster. Six units underuse infrastructure and miss the benchmark. All layouts had zero blocked-unit samples and no exhausted Owner days. Preserve current pricing: choice of inventory and efficient infrastructure use already materially changes payback. Additional required staff, worse layout, lower occupancy or repair workload would extend it. These tests do not prove all sizes/markets/layouts are balanced.

The 90-day staff comparison confirms hiring is not guaranteed ROI: Owner only gained $5,959 cash; Owner + Porter $4,612; Owner + Tech $3,930; fully staffed lost $573. Clerk-containing staff reduced Owner office time; payroll still needs a real bottleneck to justify it.

Raw deterministic results: `docs/qa/BPLUS-CANDIDATE-RESULTS.json`. Scripts are reproducible with Node; no browser dependency.

## Remaining verification

Browser visual verification is blocked in this execution environment: no Chromium executable; installation failed at download. No browser-rendered screenshot, Safari result or physical iPhone result is claimed. Physical iPhone playtest is warranted next to assess readability, tap targets, scroll length, camera visibility/gestures, blocking popup pause/return-to-1x, and save/resume around 7:00 and settlement. Accepted rain/audio/customer animation code and time controls were not changed. No merge or deployment was performed.
