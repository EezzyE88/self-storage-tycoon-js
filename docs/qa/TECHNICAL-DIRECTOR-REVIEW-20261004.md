# Self Storage Tycoon — technical director review

2026-10-04 · EezzyE88/self-storage-tycoon-js · JavaScript/Three.js only

## Executive judgment

**Continue controlled beta development. The game has a credible management simulation and substantially tested systems, but the evidence does not support calling it launch-ready or locked at 60fps on iPhone.** The highest immediate risk is release divergence: the newest gesture/staff branch does not contain several fixes already running on the private Safari link. The most important gameplay improvement is making hired capacity reliably absorb routine work while the Owner makes business decisions.

The end goal is a readable, responsive miniature storage business: build a useful layout, keep it operating, understand cash commitments, delegate routine work, and expand when demand and finances justify it. More content is less valuable now than making that complete loop dependable and understandable.

This is a review and recommendation pass. It adds documentation/evidence only. No gameplay changes, deployment, accepted-master update, economy retuning or branch integration was performed.

## Scope and evidence

Primary review: the runtime actually served at the owner-private Safari link, **69932d0dba33a0cf5913d02a191f2efc3799e3aa**, build `bplus-staff-delegation-candidate-8`. Secondary comparison: newest observed double-tap branch **44df37b84f95db33b52971e912a22ef31cc3d4fc**, which includes staff-first branch **af86244d4fd93d017456e7085b16ef7c9fa92dc5**. These are separate candidates, not a combined release.

Accepted master was verified live at **2812abf8d268f9a225e5786d173f95efcbd6223d**. Live source-proof identified candidate 8; all **26/26 runtime assets** matched its served SHA-256 manifest in this pass. The proof itself was retrieved and inspected; this new check is not described as 27 independently matched files.

Reviewed simulation, finance/economics, portfolio/session/save boundaries, construction/blueprints/tutorials, customers/routing/carts, staffing/automation, renderer/resource ownership, input, UI, procedural audio, effects, hosting provenance and test coverage. Read the committed systems, placement, performance and delegation reports. Reviewed the inline screenshots already present in this conversation. Missing IMG paths were not treated as readable files or invented evidence.

Evidence types are kept distinct:

| Evidence | What it establishes | What it does not establish |
|---|---|---|
| Fresh source review and branch comparison | Implemented rules, coupling, missing cross-branch changes | That every runtime path works |
| Fresh complete headless suites | Passing scripted assertions/probes on each exact candidate | Physical touch, WebGL speed, enjoyable pacing |
| Served hashes | Runtime delivery matches candidate 8 | Gameplay or save acceptance on a phone |
| Prior user Safari screenshots | Observed layouts, Owner friction, diagnostic values | Sustained FPS, memory bytes, thermal stability |
| Node scene workload | Geometry/resource/allocation behavior without GPU | Safari rendering performance |

## 1. Release integrity: highest priority

The double-tap branch descends from systems candidate 6 rather than live candidate 8. The comparison shows it lacks `js/performance.js`, the retained customer-mesh cache, mobile tiny-prop shadow reduction, accurate near-full wording, later Business/report layouts, and parts of the explicit delegation/temporary-repair guidance. Its version label still says `bplus-systems-review-candidate-6` despite new work.

Concrete example: live candidate 8 says nearly full at 32/33 and distinguishes rent-ready vacancies. The newer branch still uses `occupancy >= .95` to say “You are full.” Its inspector also retains `Owner: service now` below 80% condition, including the temporary 72% repair case. These are confirmed source regressions relative to the live runtime, not hypothetical failures.

**Recommendation:** create one isolated integration candidate from the verified live runtime, selectively bring in staff-first queue behavior and anchored double-tap changes, resolve their overlapping simulation/UI/input edits, and rerun the union of regressions. Give it a unique build ID. Keep accepted master unchanged. Do not publish a branch solely because its timestamp is newest.

Why: users otherwise alternate between improvements and reintroduced bugs, while screenshots and test reports refer to incompatible builds. Acceptance: unique build ID, documented parents, all retained/new tests passing, explicit runtime feature checks, and served hashes for the exact integrated commit. Add CI that checks the suite and required release metadata; no `.github` workflow directory was found in the reviewed source. Absence of repository configuration does not establish the absence of external CI.

## 2. Architecture and maintainability

**Strong foundation:** `Sim` is independent of DOM/rendering/audio; seeded RNG state is saved; presentation consumes state, derived caches and events. Pure finance helpers separate projections from mutations. Structural versioning invalidates derived navigation/readiness caches. Portfolio properties continue stepping on the company clock even when not rendered. Presentation quality does not intentionally change financial timing.

**Debt:** live `sim.js` is 2,695 lines and `ui.js` 1,535, with many dense methods and HTML templates. `main.js` owns portfolio management, persistence, frame scheduling and gestures. Tutorial hooks attach behavior to simulation ticks, while showcase/render behavior uses mutable hooks and prototype integration. These are workable at current scope but increase conflict risk, as the candidate divergence demonstrates.

**Recommendation:** extract one tested boundary at a time: staff dispatch, construction, customer lifecycle, then UI panels. Keep the public commands, RNG consumption, saved fields and step order stable. Start with staff scheduling because it is actively changing and already has focused tests. Add seeded state-equivalence checks for refactors. Avoid an engine/framework rewrite now: it would spend the reliability gained from current tests without evidence that the platform is the bottleneck.

Action validation is uneven: build and financial commands have meaningful checks, while commands such as `act_speed` and generic policy assignment accept unconstrained values. Normal buttons use known values; arbitrary console commands are not a proved player-facing defect. A small command validation layer would make future UI/automation integration safer and easier to test.

## 3. Owner workload, staffing and automation

The screenshots show the player booking repeated repairs, multiple wrench pins, 1.5-hour Owner jobs, temporary 72% repairs, and shoppers finding nobody at the office. The frustration is about operating the business. It does not prove abnormal equipment wear or stale completed-job pins.

Live candidate 8 improves this: Techs automatically take repairs, suitable staff can be explicitly delegated jobs, available Porters get first refusal for automatic chores, temporary repairs stop advertising a redundant Owner service, and Clerk guidance explains desk coverage. Staff roles, shifts and eight-hour task budgets still matter. Active/queued Owner work is not transferred in this live candidate.

The secondary staff-first branch adds stronger assignment/queuing and migration of untouched Owner queue entries. Its tests cover firing, shifts, capacity and save/resume. That is useful work to integrate, with special attention to reservations, failed routes and references after firing. Do not assume its tests cover the separate live delegation buttons or UI fixes that branch lacks.

**Recommendation:** make the work board answer four questions without opening each object: who owns the job, why it waits, when capacity becomes available, and whether action is needed. Prioritize access-critical repairs and rent-ready turnover. Keep explicit Owner override, but make routine staff dispatch the normal path when the correct role has capacity. Treat active work and unstarted queued work separately; any handoff must refund/reserve hours once and survive save/resume.

Add a clear office status and a role-specific hire recommendation based on observed backlog, service losses and payroll reserve. Avoid a universal “hire everybody” solution. In this pass's 90-day scripted small-property comparison:

| Staffing mix | Payroll/day | Average measured Owner use/day | Cash change | Estimated daily net at endpoint |
|---|---:|---:|---:|---:|
| Owner only | $0 | 0.71h | +$5,959 | +$65 |
| Owner + Porter | $12.50 | 0.69h | +$4,612 | +$51 |
| Owner + Tech | $20 | 0.69h | +$3,930 | +$44 |
| Porter, Tech, Clerk, Manager | $72.50 | 0.51h | −$698 | −$6 |

These are one scripted scenario, not universal hire ROI. Staff reduce pressure but can overwhelm a small property's margin. Track manual job assignments per game-day, lost office service, backlog age and payroll coverage to evaluate the management experience. Do not judge success only by cash or occupancy.

## 4. Economy and financial trust

The financial model is a strength: monthly lease bills, daily 7:00 accruals, weekly expense settlement, separate construction/debt cash movements, reserves and receivables. Current UI explains that bills do not guarantee collections. Transfers reject invalid amounts and conserve company cash. Save/resume financial batch coverage is valuable.

Balance remains uneven. Fresh live expansion tests reproduced these outcomes:

| Tested expansion | Observed payback from commitment |
|---|---|
| Four-unit infill | 6.07–6.37 months |
| Complete six-unit package | 19.47–19.80 months in two seeds; no repayment by cutoff in one |
| Complete ten-unit package | 12.07–12.93 months |
| Complete twelve-unit package | 10.80–11.00 months |

The scripts passed calculation/invariant checks. That does not mean every package meets a 12–18-month balance target. Shared infrastructure and vendor burden make a small complete facility disproportionately expensive; inexpensive infill benefits from already-paid infrastructure.

**Recommendation:** present total incremental package cost and readiness dependencies beside unit-only quotes. Show observed demand and a range, clearly identifying existing-infrastructure assumptions, lease-up and repair allowances. Preserve B+ coefficients for integration/bug work. Any repricing or wage/wear changes should be a separate balance candidate measured across multiple markets, seeds and expansion sizes. Do not promise guaranteed payback.

## 5. Construction, readiness and tutorial placement

Construction uses planner validation, review before spending, refunds, dependency handling and commissioning. Customer readiness includes real frontage, connected aisles, entrances, hallway lighting, utilities and freight access. Vertical lesson geometry follows the actual shell/entrance rather than assuming an untouched authored location. The 26 blueprint/recovery checks and user's “placement and swipe seem okay” feedback support retaining this work.

**Recommendation:** preserve exact footprints, floor labels, frontage direction, start/end points and confirmation. Make the next missing prerequisite a persistent checklist item, with “show location” and one-line blocked reason. Teach why access matters at the moment it blocks commissioning. Test obstructed, offset, mirrored and out-of-order layouts using the integrated candidate. Avoid locking all free-building to the tutorial's preferred coordinates.

Tutorial copy still contains older control descriptions, such as two fingers to pan, while ordinary map dragging supports one-finger pan. Audit copy against actual controls, job buttons and menu destinations after integration. A source test finding a selector is weaker than a complete tutorial walkthrough.

## 6. Customers, navigation and portfolio simulation

Customers drive, queue, compare products/prices, visit units, use carts and elevators, and depart. Failures feed lost-demand and experience metrics. Correctness fixes already cover disappearing cart corrals, blocked returns, freight access and construction dependencies. BFS and derived connectivity fields are understandable and testable.

**Recommendation:** profile route requests, cache rebuilds and scheduled-visit scans under a dense multi-property workload. If costly, reuse derived route/adjacency data keyed to structural changes while preserving door/elevator failures and actual agent movement. Keep all customers simulated and all offscreen properties operating. Presentation LOD or visual reuse is appropriate; capping the simulated population or freezing distant properties changes the business rules.

Growth multiplies simulation CPU even though only one property renders. A single 550-unit visual scene does not establish five-property CPU performance. Include acquisitions, property switches and background events in the benchmark fixture.

## 7. Rendering, performance, memory and battery

Three.js is bundled; static meshes share geometry; scenery already uses instancing. Live candidate 8 retains a bounded pool of up to 24 detached customer groups, without limiting active customers. Small mobile props cast fewer shadows. There are graphics quality settings, battery drawing reduction and idle redraw throttling. These are reasonable targeted measures.

Prior committed candidate-7 comparison measured 4,000 sequential customer groups falling to 20 allocations at peak concurrency 20; synthetic churn CPU median fell from 77.51 to 6.08 ms. Static shadow casters fell 167→155 for Maple and 1,325→1,233 for a dense lot. Mesh/triangle counts were unchanged. Dense rebuild median did not improve (24.89→25.64 ms). Those are historical Node scene measurements, not on-device FPS.

Fresh live scene probe reproduced 257 meshes/155 shadow casters for Maple and 3,039 meshes/1,233 shadow casters for 550 units; churn again created only 20 groups for 4,000 customers. Single-run CPU measurements were 8.63 ms Maple rebuild, 22.47 ms dense rebuild and 6.38 ms churn. Do not compare these single runs to earlier medians as a new speedup. The dense fixture has 663 distinct material references: investigate whether repeated unit materials can be shared/batched while preserving color, selection and animation.

Prior physical screenshots show active-play drawn-frame p50 around 17 ms, p95 around 17–20 ms and p99 around 33–54 ms; roughly 629–728 draw calls, 20–22k triangles, DPR 2. They support a promising ordinary property snapshot, not locked 60fps, dense-portfolio acceptance or thermal stability. Render CPU submission around 2.4–3.2 ms is not GPU timing. Geometry/texture counts are not memory bytes.

**First fix measurement:** the overlay covers inspector details and mixes intentional 250 ms idle draws with active-play percentiles. Keep active, battery-limited and idle samples separate; report sample count/window and skipped-draw CPU work. Move diagnostics into a collapsible panel outside touch/content areas. Measure RAF cadence separately from actual presentation cadence.

**Then optimize by evidence:** compare fixed fixtures/camera/quality before and after material batching, hidden-floor detail suppression, small shadow casters and DPR. Preserve readable doors, markers and tutorial guides. Record p95/p99, long tasks, draw calls, resource stabilization and visual correctness. Current auto-quality only steps down below about 36fps, so it can leave a device between 36 and 60fps; evaluate a sustained frame-time target with hysteresis instead of claiming it maintains 60fps.

Audio correctly suspends on hide and unlocks on gestures, but muted ambience sources remain running at zero gain. Evaluate suspending unnecessary ambient work in a battery mode if profiling justifies it. Do not import Roblox APIs, triangle caps or claimed iOS memory ceilings: this is a browser/WebGL workload with its own measurements.

## 8. UI, accessibility and presentation

The diorama, visible status pins and four main management tabs establish a coherent identity. Recent live screenshots support improved Business shortcut discoverability, near-full guidance and readable monthly values. The diagnostic overlay is a confirmed content-obstruction issue. Large attention cards plus persistent rails can consume much of a phone viewport.

**Recommendation:** audit every sheet at narrow portrait and landscape sizes, long names and large amounts. Use severity/age to organize work rather than making every repair look equally urgent. Keep 44px-class touch targets and readable text; shorten labels before shrinking fonts. Give dismissible notifications a clear route back to the underlying issue.

Global page-zoom suppression protects camera gestures but is an accessibility tradeoff. Evaluate an in-game text-size setting and scope gesture prevention to the map where practical. Test keyboard focus, labeled controls, contrast and reduced motion. The 3D canvas cannot offer equivalent nonvisual management today; a structured jobs/unit list would provide a more accessible route to key decisions. This is a recommendation, not an accessibility compliance certification.

## 9. Persistence, security and delivery

Local main/backup/kept slots, SST0/SST1 support, captured metadata and superseded-save protection are good. The static Preview uses browser storage; optional cloud saves are disabled on this host. Local storage is not cross-device cloud synchronization. Export/share remains an important recovery route.

Import sanitation drops prototype keys and neutralizes strings; CSP and bundled Three.js reduce dependency exposure. Validation still focuses on outer state shape rather than every nested identifier/reference/enum. File loading reads the whole file and gzip decoding has no explicit expanded-byte quota in the reviewed path. Large or malformed user imports merit bounded decode and complete validate-before-attach behavior. Treat this as a hardening gap; no new exploit or ordinary-save data loss was demonstrated in this pass.

The HTML includes legacy embedded-host capture/edit messaging and broad HTTPS connect permission. Origin/source checks exist, and the bridge exits for a top-level page; it is not evidence of an active Safari attack. Isolate/remove unused host glue for a future standalone release and narrow CSP only after inventorying real dependencies. Fonts still depend on an external CDN with system fallback. A manifest and icons exist, but no service worker was found; do not advertise reliable offline relaunch from that alone.

Maintain save fixtures from historical builds and each candidate. Test storage quota failure, immediate background/reload, corrupted primary with backup, multi-property load and context restore in Safari. Avoid forcing a new game to validate a UI update.

## 10. Verification results and limits

Fresh commands and machine-readable evidence are in `technical-director-evidence-20261004.json`:

| Candidate | Fresh test result | Other verification |
|---|---|---|
| Live 69932d0 | **36/36 headless scripts** | 26/26 served runtime hashes; scene allocation probe |
| Secondary 44df37b | **35/35 headless scripts** | Source comparison and new staff/double-tap coverage |

The live default fuzz check covered nine modes × three seeds × 120 days, **58,413 actions, 11,917 accepted, no recorded invariant issues**. The previously committed 72 year-long runs remain historical and were not rerun or relabeled here. Tests include economy/payback, staffing, scenarios, save/session, blueprint, financial trust, customer routing and performance checks. A script count includes exploratory probes as well as assertion suites.

No new automated browser visual pass, physical iPhone session, GPU timer, actual process-memory measurement, Low Power Mode run or thermal test was performed. Existing screenshot and partial user acceptance evidence is retained. Headless success and served hashes are not physical Safari acceptance. This review does not require the player to collect another screenshot batch.

## Prioritized plan: what, why, and completion criteria

| Priority | Work | Why | Completion criterion |
|---|---|---|---|
| P0 — before next publication | Integrate verified live fixes with newer staff/gesture work; unique build/provenance | Prevent known regressions | Union of tests, runtime feature checks, exact served hashes |
| P1 — next implementation pass | Staff-first work board, safe queued handoff, office explanation | Reduce Owner chore burden while preserving payroll choices | Correct role/capacity/route/shift states; no double reservations; resume/firing tests |
| P1 | Repair diagnostic sampling and placement | Measurements currently mislead and obscure content | Idle and active separated; panel never covers controls |
| P1 — launch gate | Representative Safari lifecycle and sustained performance acceptance | Node cannot prove touch, GPU or iOS persistence | Recorded build/device/power mode with dense 4x play, gestures, menus, save/resume, switches and normal/Low Power sessions |
| P2 | Full-package cost/payback presentation and separate balance study | Small expansion economics differ materially | Seed/market comparisons and honest infrastructure assumptions |
| P2 | Measured material batching, detail visibility and adaptive quality | Reduce draw/GPU cost without altering simulation | Reproducible p95/p99 improvement and visual/selection parity |
| P2 | Bounded imports, save fixtures and CI | Prevent avoidable reliability regressions | Failures preserve live state; historical saves resume; checks run on candidate updates |
| P3 — after behavior stabilizes | Incremental module extraction, accessibility, unused-host cleanup | Lower future change risk and broaden usability | State-equivalence tests and complete management-flow review |

Do not add multiplayer, another engine, additional floor complexity or extensive new modes before this loop is stable. Do not stop wear or remove financial consequences to disguise staffing friction. Make routine work intelligible and delegable, then assess pacing with evidence.

## Release status and Safari link

**Owner-private beta, candidate 8 remains live. Accepted master unchanged.** The newer staff/gesture work is not yet part of that published runtime. This report is documentation only and deliberately does not replace the player's working release.

Open in Safari: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

The next release should be one integrated, traceable candidate with measured performance and preserved saves. Physical iPhone acceptance remains a distinct gate; no locked frame-rate or complete launch-readiness claim is made.
