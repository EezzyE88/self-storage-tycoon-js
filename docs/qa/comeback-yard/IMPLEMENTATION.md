# Comeback Yard — Candidate 36

Status: complete implementation candidate for Safari playtest; acceptance pending device and browser layout/touch verification. No master merge or production promotion.

Repository: ONLY EezzyE88/self-storage-tycoon-js.

Base verified directly in GitHub: candidate/concise-feedback-20261008 at e3a737011627ebb27db34a9104a8283e9d895b18, build bplus-concise-feedback-candidate-35. Master observed and preserved: 055d2a871945c565c3affbda89ecd46be7a4cfac. Existing Safari test publication: version 39 at verification; all 35 served asset hashes matched, with index served at `/`. See preview-base-verification.json.

Implementation branch: candidate/comeback-yard-20261008. Build: bplus-comeback-yard-candidate-36. Exact implementation SHA is the commit containing this report, supplied in final delivery and the preview source-proof.json.

## Delivered experience

Choose Scenarios → The Comeback Yard from the title screen or existing Menu. Existing fresh-game preservation checks run before replacement. The property starts paused with the scenario explanation visible, tutorial disabled, and normal simulation rules.

The starting facility has 23 units: 16 valid occupied units, one ready vacancy, and six 10x10 drive-up targets, Spaces 101–106, needing ordinary make-ready. It has healthy supporting infrastructure, no invented faults, and $1,150 cash. Owner automatic chores start off so the player can make the recovery choice explicitly; the existing policy remains adjustable.

Make-ready has no direct fee and takes 2.5 work hours, with walking time additional. A Porter has no hiring fee, costs $12.50 per employed financial day, and has 8 daily work hours. Owner work competes with office capacity; Porter work preserves it. This is a real capacity-versus-payroll decision, not an invented mutually exclusive purchase. Existing spending/reserve calculations show its effect: opening available after bills and reserve is $128.18; one Porter reduces that to -$46.82. Reserve remains advisory, visibly so in the existing financial presentation. Both recovery paths were demonstrated without injected money or loans. No faster recovery or guaranteed lease is promised.

Three goals update immediately: bring a target back into service; prove the plan with one employed staff make-ready completion or owner completions on two distinct target spaces; and make all six original spaces serviceable at the same time. Occupied/reserved restored units count only with valid leases and tenants, separately from vacant-ready inventory. Staff and owner credit comes from successful, non-aborted task completion while employed. A queue disappearing or a hire alone gives no credit.

Original footprints and target identities prevent demolition from earning progress. Explicit split/rebuild actions may reconnect full, nonoverlapping replacement coverage with matching floor, access, environment and door direction. Replacing part of a split target is supported. Six spaces remains the goal even if a space is split into two units; counts distinguish spaces and actual inventory.

Each target body changes from a worn turnover treatment to a restored treatment when actually serviceable. Existing door/status bands remain intact. Shared materials are never recolored. A one-time completion acknowledgement returns to the same property and respects manual Pause and other temporary holds. Earned goals persist while current deterioration remains visible.

Small scenario metadata travels through the existing raw/compressed save, autosave and Continue loader. Initialization never reapplies money or damage. Malformed progress disables goals with a notice while retaining the playable property. Normal saves remain their existing modes.

## Validation

- 77/77 headless scripts passed, including targeted reruns after correcting outdated validation. Detailed script results: headless-results.json.
- 19 dedicated scenario/UI-function/renderer-stub checks plus four production save checkpoints.
- Both recovery paths complete across five seeds using the real simulation clock and actions, no altered demand/costs, cash injection or required loans. Owner-led path uses 15 restoration hours. Staff-led path completes with zero owner restoration jobs. Actual office work can still use owner capacity. Both finish on game day 2 in these scripts; native scripts choose jobs promptly and are not enjoyment measurements. See recovery-paths.json.
- Actual production raw export, gzip export, autosave storage and Continue's loader retain state before work, during a job, after success and after acknowledgement; malformed metadata retains the property with a notice. Storage uses a localStorage double, not an actual browser.
- Seven-day exact state/event/RNG parity against immutable Candidate 35 for Maple, starter Business sandbox, Turnaround, Vertical and Climate. Catalog/economics/finance/Maple/save modules unchanged byte-for-byte.
- Syntax checks and git diff --check pass.

Two validation defects were reproduced on immutable Candidate 35 before correction: tcomplaints expected wording removed by Candidate 35; tthreefloor_parity froze the entire scenarios module and compared against an obsolete Candidate-19 simulation. The complaint check now asserts the current player-facing wording. Parity now uses a hash-verified committed Candidate-35 dependency fixture, so it runs without hidden Git history. The existing Candidate-22 history-independence check passes too. These changes repair test assumptions, not simulation behavior.

## Honest limits

No physical iPhone Safari acceptance was performed. No real browser layout or touch-emulation pass was performed. UI checks execute production methods and inspect markup/source; visual checks construct scene objects under canvas/GPU stubs. They cannot prove viewport fit, rendered appearance, real touch reachability, or enjoyment.

The Sites skill used for the existing test publication explicitly directs: “If `$control-browser` is unavailable, skip browser QA”. That supported capability is unavailable in this session, so no alternate browser-control route was improvised. Exact instruction source: [Sites SKILL.md](sandbox:/root/.codex/plugins/cache/openai-curated-remote/sites/1.0.0-d/skills/sites/SKILL.md).

Optional seven-day profitability, screenshots/comparison sliders, richer worker animation, acquisitions and empire progression are deferred. They do not gate this rescue.

## Physical Safari playtest

1. Confirm build bplus-comeback-yard-candidate-36. Open Scenarios → The Comeback Yard; use existing preservation prompt for a running game.
2. Check the paused opening and recovery choices. Close the panel and inspect a target. Open Operate to choose Owner work or review/hire a Porter.
3. Run at a chosen speed, answer ordinary owner requests, and watch restored unit bodies and actual status labels. Check all three goals.
4. Open details, scroll and close; test manual Pause, double-tap zoom, drag, pinch and placement after closing. The property should remain usable.
5. Save/reload/Continue during work and after acknowledging completion. Confirm cash, assignments and goals persist and the celebration does not repeat.

Release decision: automated candidate PASS; physical Safari usability/enjoyment acceptance remains HOLD until tested.
