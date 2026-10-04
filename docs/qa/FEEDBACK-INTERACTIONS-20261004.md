# Feedback interaction and floor-report regression pass — 2026-10-04

Build: **bplus-feedback-interactions-candidate-12**. Isolated branch: `candidate/feedback-interactions-20261004`. Base: `1281a08f79227323a4dfc1a4ad9a9b2772137dff` (published candidate11). Live GitHub refs and the served source proof plus **27/27 runtime asset hashes** matched before edits. Accepted master remains `2812abf8d268f9a225e5786d173f95efcbd6223d`; the Site remains owner-only, with no groups or external visitors. No newer published/accepted changes needed reconciliation.

Only EezzyE88/self-storage-tycoon-js was used. Read COMPLAINT-HARDENING-20261004.md, complaint-hardening-evidence-20261004.json, COMPLAINT-GUIDANCE-20261004.md and MANAGEMENT-INTEGRATION-20261004.md. No new screenshots or physical feedback accompanied this task; findings below come from fresh executable source/simulation/UI probes.

## Reproductions and fixes

| Defect | Reproduction against candidate11 | Fix |
|---|---|---|
| Mixed-surface multitouch activated bubble help | Start on bubble, touch map with another finger, release map then bubble, deliver click; also tested reverse touch order | One UI-wide passive capture observer tracks pointers across surfaces. Multiple touches invalidate the bubble's gesture version even if the second finger releases first |
| Unexpected capture loss still allowed help | Pointer down, lost capture before release, pointer up and delivered click opened feedback | Early capture loss cancels local gesture eligibility. Normal implicit capture release after valid pointer-up preserves the legitimate click |
| Focused repeat count was stale | Focus the emitted thought event, group another identical complaint in simulation; feedback showed the old event copy | Focus ordering uses the current retained report where identity/time match; an aged-out report still uses its historical snapshot |
| New guidance inherited old panel scroll | Scroll feedback to500px, open a request's Cause & remedy; report moved first but body remained scrolled500px | Explicit feedback/bubble/request opens invalidate the sheet scroll cache so the newly requested guidance begins at the top. Ordinary periodic refresh retains reading position |
| Upper-floor elevator report pointed downstairs | Execute updateElevator on a failed lift with a customer waiting onF2; location metadata saidF1 because shaft object's base isF1 | Elevator thoughts record the waiting passenger's floor while keeping elevator identity and coordinates. New snapshots retain that floor through JSON save/resume |

All **six initial failing expectations** (including both mixed-touch orders) now pass. Follow-up scrutiny added zero-detail delayed clicks, background/blur interruption, post-release interruption, normal capture release, fresh gesture recovery, standalone assistive click/explicit keyboard activation, bounded global pointer bookkeeping, repeat counts after save/resume, elevator snapshots after the customer disappears, and actual UI constructor capture/lifecycle wiring, and all36 three-touch press/release order combinations with fresh-tap recovery.

## Resulting controls

Document capture observes pointer-down/up/cancel without preventing default or stopping propagation. It does not change canvas pan, pinch, anchored double-tap, construction or selection handlers. Blur, hidden document and property changes reset feedback-only gesture state; a fresh solo gesture recovers stale local bookkeeping. Delayed clicks after cancellation do not bypass the guard merely by having detail0. Explicit keyboard activation remains available, as does a standalone assistive click. Native Safari and screen-reader event synthesis still require physical acceptance.

The tapped report stays first and uses its latest grouped count. New help starts at the panel top; subsequent refreshes retain scroll. Elevator thought reports point to the floor where the customer waited. For upper-floor thoughts, reported-location navigation shows that floor; elevator equipment requests still identify the shared shaft's base object. A historical report remains an observation at report time rather than a live alarm.

## Verification and preservation

New focused script: **16 checks**. Retained complaint checks: **38**; retained hardening checks: **33**. Full suite: **42 scripts**; first implementation round passed42/42. The final source round and immutable-candidate full run must pass before publication; exact results are supplied at delivery. Whitespace and syntax checks pass. Evidence and fresh run summaries are committed in feedback-interactions-evidence-20261004.json.

Three independent deterministic runs against candidate11 used seeds1/982/20261004, hired a Porter/Tech/Clerk and stepped4320 minutes per seed. Authoritative gameplay state matched exactly after excluding presentation-only thought histories. Full regressions retain staff roles, firing, shifts, queues/handoffs, exhausted capacity, routes, reservations/refunds, save/resume, gestures/cancellation, financial timing, tutorial placement, scene allocation and diagnostic-window checks.

Runtime diff is restricted to ui.js, complaint-context floor metadata in complaints.js and the unique build in version.js. sim.js, main.js, render.js, data.js, finance.js, economics.js, tutorial.js, blueprint.js, localsave.js, scenarios.js and performance.js are byte-identical to candidate11. No coefficients, task scheduling, simulation timing, routes, RNG calls, customers, offscreen-property operation, purchases, staffing or response consequences changed. No required save fields were introduced. Old thought snapshots remain historical and readable; their floor cannot be reconstructed retroactively from absent customer records.

No performance optimization is claimed. Rendering, diagnostics and authoritative simulation code are unchanged; this pass verifies interaction state rather than collecting GPU, heap-byte, Safari FPS, thermal or battery measurements. The earlier performance evidence remains historical evidence.

## Release and limits

Owner-private isolated beta, unmerged. Publish only exact immutable candidate runtime files to the SAME Site, verify source proof and all27 hashes, and confirm owner-only access. Master remains unchanged. The Site packaging commit is separate from the GitHub runtime candidate.

Safari Preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

The prescribed browser CLI remains unavailable; tests use executed Node UI callbacks, constructor wiring, mocked DOM and real simulation/Three.js fixtures. They do not establish physical Safari acceptance. Native touch/click synthesis, screen-reader behavior, layout, background/resume and GPU/thermal/Low Power acceptance remain pending. Historical user acceptance of hired help and double-tap is preserved without being relabeled as acceptance of candidate12. This pass resolves the reproduced defects; it does not claim the whole game is bug-free.
