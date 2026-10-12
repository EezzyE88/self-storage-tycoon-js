# Working yard reporting candidate — 2026-10-11

Repository: EezzyE88/self-storage-tycoon-js only.
Base: e04a808dd1cac558b9e97e8cd5f021f874ac7cfe, reverified live before changes.
Branch: candidate/working-yard-20261011. Build: bplus-working-yard-20261011.
Status: implemented locally, automated validation passed; full game phone render and physical acceptance pending. Not pushed, published or merged.

## Behavior

Operate begins with Your working yard: completed property jobs and nominal completed task-hours by role; vendor jobs without employee hours; actual payroll accrual over the same rolling 30-calendar-day reporting window; current cash, committed bills, recommended reserve and available funds; one action from existing diagnostics or Growth Readiness. Summary links do not dispatch purchases or hire staff. They open the relevant expanded section using the existing panel pause/resume behavior; manual Pause remains governed by the accepted controls. Role totals survive employee dismissal. Hours exclude office service and travel and are not a counterfactual claim of Owner time saved.

Only successful completion of a currently pending task records work. Aborted tasks, missing target effects and repeated finish calls do not add counts. Daily financial batching records payroll accrual once; weekly settlement remains unchanged. Reporting is one additive workReport field with version, measurement start and at most 30 daily aggregates. Legacy saves begin measuring on load; earlier payroll and completions are not reconstructed. Existing save schema/storage modules are unchanged.

## Validation

- tworking_yard.mjs: 13 groups covering legacy history, Owner/Porter/Tech attribution, duplicate completion, abort/missing target, vendors, dismissal, exact-once payroll, bounded retention, markup and actual next-action handler.
- Three paired 30-day runs (Maple, Comeback, Vertical): 129,600 paired minute ticks. Every event compared each tick; full gameplay state including cash and RNG compared hourly and at the end, excluding only workReport. Exact parity against the immutable accepted checkout.
- tworking_yard_save.mjs: production raw/compressed save-code prepare/load, three loads each; report and cash unchanged; same financial batch cannot accrue twice.
- tstafffirst.mjs: all retained staff-first checks pass.
- Syntax and git diff whitespace checks pass.

A first payroll assertion wrongly assumed no cash change during normal rent billing; corrected to compare repeated batches. A read-only summary check initially omitted the existing lazy staff-work normalization performed by diagnostics; its fixture now initializes that existing state before checking. Neither required gameplay changes.

## Visual evidence and limits

summary.html contains actual production summary HTML/CSS and measured test data; it is a static snapshot, not a full game screenshot or interactive game. render-fixture.json is a disposable organically advanced local state, never a user save. It starts from the committed Candidate40 investment fixture, builds/commissions/leases the two-unit extension through supported commands, then runs a disclosed operator policy for 30 days. No coefficients or cash were injected.

The retained offline production capture harness is tests/browser-qa/working-yard.cjs. Requested 390x844 actual game renders could not be obtained: the older headless executable crashed; full Chromium failed at launch because socket() was denied (Operation not permitted). No mockup is substituted. Browser save-code/geometry/navigation assertions in that harness have NOT run; production save-code and handler checks instead passed headlessly. Actual phone layout, overflow, tap reach and full scene visibility remain unverified.

Reproduce when browser execution is available:

    SST_ART_BROWSER=/path/to/chrome node tests/browser-qa/working-yard.cjs /path/to/accepted-master docs/releases/working-yard-20261011/render-fixture.json docs/releases/working-yard-20261011/renders

## Preview and preservation

Existing Safari URL: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site
Release-review recheck: hosting records still identify public version47 at the same URL. All 34 checked HTML/JS/CSS runtime files matched accepted master byte-for-byte. This does not recheck vendor/media files or reproduce the historical 62/62 archive check. No republish, deployment, storage access or save import occurred.

Master, global economy coefficients, authoritative layouts, two-unit extension, scenario restrictions, request/pause behavior and existing user saves remain unchanged. Candidate completion reporting is separate from Eddie's accepted rescue/extension/floor-view evidence. This candidate has no physical iPhone PASS.

## Focused release review

Two confirmed navigation defects corrected locally: the attributed Work queue heading bypassed existing section recognition (removing the Jobs entry), and the new action opened a compact panel that hid detailed guidance. Restored the normal heading and routed next actions to an expanded Work queue or Growth Readiness section through existing navigation. Clarified that task-hours are standard requirements credited to the completing role, not measured time saved.

No accounting/economy changes were necessary. Actual source figures from the retained disposable Day49 fixture: Owner6 jobs/7h; Porter7 jobs/4.5h; payroll accrued $375 over Days20–49; cash $3,206.19; committed bills $0; recommended reserve $1,213.69; available $1,992.50. Its next guidance comes from 15 observed 10x10 availability losses; this does not promise leases.

Recommend publication to the existing Safari preview for focused iPhone acceptance, after Eddie approves. It is ready for that bounded test, not merge-ready or physically accepted. No blocked screenshot attempts repeated in this release review.

The remaining iPhone check is summary readability/scrolling, Jobs-menu preservation, opening the suggested section and returning to the map without unintended time resumption. Check one completed routine job and Save → reload → Continue persistence; do not repeat rescue/extension fixtures. Legacy saves should initially show no recorded work/payroll and the reporting start time. No full scenario session or economy retune is required.

Master and Maple restoration candidate `ba5212707cab61acceb3ff1acbf4550be7502bb6` remained unchanged during the release review. Exact publication SHA is the resulting local follow-up commit; no push, publish or merge was performed.
