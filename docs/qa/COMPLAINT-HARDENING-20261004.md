# Complaint guidance bug hunt and fixes — 2026-10-04

Build: **bplus-complaint-hardening-candidate-11**. Isolated branch: `candidate/complaint-hardening-20261004`. Base: verified published candidate10 `b740c2fb65e630fb3a27ba5c4146176131917a25`; its served proof and all 27 runtime hashes matched before this release. GitHub refs were checked live. Accepted master stays `2812abf8d268f9a225e5786d173f95efcbd6223d`. Only EezzyE88/self-storage-tycoon-js was inspected and changed.

## Findings and fixes

| Defect | Reproduction / consequence | Final behavior |
|---|---|---|
| Different requested products merged | Same office, same no-ready text, different sizes or climate preferences lost the later product | Grouping and phone cooldown include product, kind, target and observed overflow data |
| Negative report swallowed by neutral report | Same text/location but different kind grouped together | Kind remains part of report identity |
| Misleading inventory | 5x5 rejection displayed unrelated 10x20 ready stock, including blocked units | Size-specific counts show accessible operating rent-ready inventory and blocked stock separately; climate suitability remains explicit |
| Stale View index | A report expired/shifted after rendering; the button could select a different report | Buttons carry immutable location snapshots rather than thought-array offsets |
| Invented or malformed destination | Deleted request target defaulted to (0,0); old partial thoughts could carry undefined coordinates | Missing/invalid/out-of-bounds targets have no View control and are rejected by input handling |
| Removed identity lost | Removing unit/building changed feedback to generic Property | Removed unit/building IDs remain identified alongside saved position; camera can still visit a valid historical coordinate |
| Bubble click lacked gesture guards | Candidate10 event callback accepted a delivered click after canceled pointer sequence | Pointer movement, multiple touches, release displacement and cancellation reject activation; clean taps and keyboard activation work |
| Wrong report opened | Bubble opened the entire list without selecting its report | Tapped report is first, including if it just aged out of the 40-thought history |
| Property-switch leakage | Old property bubble callback opened help after switching properties | Bubble activation checks simulation identity; property changes clear bubbles, cooldowns and focused reports; snapshot controls carry a UI property epoch |
| Partial request crash | Move-out request lacking text called includes on undefined | Missing text remains readable without changing any response choices |
| Enlarged feed advice | Expanding detailed cause/remedy prose could overlap map controls and inspectors; replacing request cards discarded expanded details | Feed uses a compact Cause & remedy control; full prose opens its selected request first inside the existing scrolling feedback sheet |
| Growing cooldown bookkeeping | Location-specific keys could grow across a long high-traffic property session | Only routine outcomes enter cooldown storage; at most 128 keys, cleared on property changes |

View navigation clears stale selection, selects only a surviving object on that floor, uses valid coordinates and falls back to ground view when a reported upper floor has been removed. A loading report for an upstairs unit keeps the camera on its ground-floor bays instead of selection switching it upstairs. Active request cards also offer reported-location review. Existing reply buttons, costs, deadlines and defaults remain in the original feed.

## Test / fix / repeat

Initial targeted probes against candidate10 produced **11 failing expectations and one pass**, after correcting the test fixture to use UI's existing renderer getter. The failing expectations and raw summary are in the evidence JSON. They were fixed and re-executed. A separate execution of candidate10's actual bubble click callback reproduced activation after a delivered click following cancellation and after a property switch; these are callback tests, not claims about browser click synthesis.

The expanded final hardening script has **33 passing checks**, alongside all **38 original complaint checks** and the accepted gesture/delegation checks. It covers grouping, inventory, saves, stale arrays, deleted targets, malformed coordinates/JSON, wrong-property controls, floor changes, tapped-report priority, request priority, text escaping, touch movement/multi-touch/cancellation/recovery, secondary buttons, keyboard activation and bounded cooldowns. Two full regression rounds passed **41/41 scripts**. A final full suite on the immutable GitHub candidate is required before publication; its result is reported in the release delivery. No source code changes occur after that final commit unless a failure requires another candidate and another run.

Three independent deterministic comparisons against candidate10 (seeds 1, 982, 20261004), each with a Porter, Tech and Clerk hired and 4320 simulation steps, produced exact authoritative gameplay-state equality after removing presentation-only thought histories. Full regressions cover economy, financial timing, saves, staff roles/queues/firing/shifts/exhausted capacity/routes/reservations, gestures, building, exact tutorial placement, scene allocation and performance diagnostics.

## Scope and performance

Runtime changes are restricted to complaints.js, presentation metadata grouping in sim.js, ui.js and version.js. main.js, render.js, data.js, finance.js, economics.js, tutorial.js, blueprint.js, localsave.js, scenarios.js and performance.js are byte-identical to candidate10. Economy coefficients, routing choices, staffing rules, all customers/offscreen-property simulation and accepted map gestures are retained. No automatic purchase, hire, repair or rent change was added. Saves require no new fields; this candidate changes only how presentation reports are grouped and displayed.

CPU fixture: Node24.19.0, fixed seed20261004 dense550-unit property plus two Maple properties; triple demand; two Porters/two Techs/one Clerk per property; all three properties stepped each minute for14 days. Candidate10 median day CPU20.36ms/p9566.60ms; candidate11 median20.54ms/p9565.84ms in single paired runs. Both peak18 agents/property and final times20580. Timings are noisy and establish neither a speedup nor an FPS regression. No rendering code changed; no browser/GPU/heap-byte/physical-iPhone performance claim is made. Raw samples are in complaint-hardening-evidence-20261004.json.

## Release status and evidence limits

Owner-private beta, isolated and unmerged. Publish only immutable candidate files to the same Safari Preview, verify the served source proof and all27 runtime hashes, and reconfirm owner-only access. Master must remain unchanged. The Sites packaging commit is distinct from the GitHub gameplay candidate.

Safari: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

The required browser CLI is absent; browser visual QA is unavailable. Node event-callback tests and mocked DOM/Three.js tests are automated evidence. Physical Safari layout, native click synthesis, touch capture, accessibility, background/resume and GPU/thermal/Low Power acceptance remain pending. Earlier user acceptance of staff and double-tap is retained as historical evidence, not relabeled as acceptance of this build. Reports are observations at report time, not live fault alarms; only40 thoughts persist and removed targets cannot be rebuilt from an older save. This audit does not establish that the entire game is bug-free.
