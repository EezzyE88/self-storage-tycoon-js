# B+ iPhone performance and UI candidate 7

Date: 2026-10-04. Repository: **EezzyE88/self-storage-tycoon-js only**.
Branch: `candidate/iphone-performance-20261004`. Candidate identity is the commit containing this report.
Parent: `43b9eed594b40b2d52f52ddfd858917716812037` (tested systems candidate 6).
Accepted master, verified live before work: `2812abf8d268f9a225e5786d173f95efcbd6223d`.
Build: `bplus-iphone-performance-candidate-7`. No merge or master change is authorized or performed.

## Result and scope

Optional bounded presentation diagnostics, mobile small-prop shadow reduction, reusable customer presentation meshes, accurate near-full guidance, and more readable phone menus/reports are implemented. These changes continue the committed systems and placement handoffs; they do not replace their recovery fixes.

Simulation/economy/finance data, tutorial progression, blueprint placement, authored layouts and scenarios are byte-for-byte unchanged from candidate 6. The fixed simulation accumulator, tick limits, active/offscreen company operation, financial schedule and save schema are unchanged. Main-loop changes instrument presentation and clean presentation resources when switching properties. Foreground resume resets diagnostics/draw timestamps so background suspension is not counted as a frame stall; simulation resume behavior is preserved.

## Diagnostics

Menu → **Performance stats on** (or existing F shortcut). Default off, no save-field changes, pointer-transparent three-line overlay above phone navigation. Toggle off/on to start a fresh comparison. `window.__game.performanceSnapshot()` returns the current metrics for development capture.

- Rolling **300 drawn-frame** window, p50/p95/p99 redraw interval in milliseconds, refreshed once per second. This is display cadence, not a claim that every RAF callback renders.
- Mean CPU time spent in simulation/poll/drain/autosave dispatch on sampled callbacks, scene render submission, and UI update. Simulation CPU excludes earlier callbacks that intentionally skipped drawing; these are sampled CPU costs, not whole-second CPU utilization.
- Three.js renderer-info draw calls, triangles, geometry/texture counts, quality and actual pixel ratio. Counters are explicitly reset once before the frame and auto-reset is temporarily disabled to cover all render submissions; original reset policy is restored even if rendering throws.
- Idle/battery redraw throttling is labeled. CPU render duration is **not GPU duration**, resource counts are **not byte memory**, and diagnostics add small sampling/sorting overhead while enabled.

## Profile first: findings and decisions

| Area | Finding / decision |
|---|---|
| Small shadows | Tiny shared-box props previously cast on mobile. Box props whose largest dimension is ≤0.85 game units now omit mobile shadows. Larger structures/poles retain shadows. Appearance, geometry, selection tags and floor tags remain intact; desktop policy unchanged. |
| Drawing resolution | Existing touch/DPR-3 path disables MSAA and caps DPR at 2; medium/low already lower pixel ratio and shadow map resolution. Kept existing defaults and adaptive threshold: physical evidence is needed before trading phone sharpness or changing fallback behavior. |
| Distant/hidden details | Renderer already applies floor/shell visibility and Three.js culling. No new distance hiding was added: a reliable GPU bottleneck has not been established, and markers/placement guides must remain trustworthy. |
| Repeated geometry | Both tested static scenes already use two unique geometry objects despite 257/3,039 mesh objects. Geometry reuse is present; draw-call instancing/material-atlas work remains a possible next investigation, requiring real renderer counts and careful selection/marker handling. |
| Customer churn | Customer departure previously disposed each group and private materials. A maximum of 24 detached reusable customer groups is retained; active customers are **uncapped**. Reuse recolors shirt/skin, clears carry state, resets pose and uses the normal fresh-position snap. Staff do not enter this cache. Overflow is disposed. Switching properties drains active meshes and the cache, preserving shared materials. |
| Simulation | No customer population cap, time retuning, offscreen-business pause, or Roblox API/limit was introduced. |

## Measured comparison

Evidence: [iphone-performance-evidence.json](iphone-performance-evidence.json).
Reproducer, run from repository root:

```sh
node tests/performance/render-workload.mjs 43b9eed594b40b2d52f52ddfd858917716812037
node tests/performance/render-workload.mjs
```

Actual vendored Three.js builds the actual renderer scenes and customer meshes under Node, with **stubbed WebGL and canvas drawing**. Same fixtures and coarse-pointer/DPR-3 settings; Maple has 23 units and dense free-build has 550. Counts below are scene-owned static meshes/triangles and shadow eligibility, not frustum-visible GPU work. Seven alternating fresh processes per source were run after the full suite; all raw measurements are committed. These numbers do not prove Safari FPS, thermals, GPU savings or device memory savings.

| Metric | Candidate 6 baseline | Candidate 7 | Interpretation |
|---|---:|---:|---|
| Maple static shadow casters | 167 | 155 | 12 fewer (7.2%) |
| Dense static shadow casters | 1,325 | 1,233 | 92 fewer (6.9%) |
| Maple / dense static mesh count | 257 / 3,039 | 257 / 3,039 | Geometry and presentation retained |
| Maple / dense static triangles | 2,234 / 19,378 | 2,234 / 19,378 | No geometry reduction claim |
| Groups created for 4,000 customers, peak concurrency 20 | 4,000 | 20 | 99.5% fewer group creations |
| Groups disposed during that churn | 4,000 | 0 | Candidate retains 20 for reuse; switch cleanup tested |
| Median churn CPU | 77.51 ms | 6.08 ms | 92.2% lower in this synthetic CPU workload |
| Median Maple rebuild CPU | 8.58 ms | 8.50 ms | Essentially unchanged/no meaningful speed claim |
| Median dense rebuild CPU | 24.89 ms | 25.64 ms | Approximately 3% higher; small noisy difference, no rebuild optimization claim |

The cache retains up to 24 customer groups and their private materials in exchange for fewer allocations. It does not bound live customer count. No universal iPhone memory ceiling or triangle budget is asserted.

## Screenshot-confirmed UI fixes

- At 95–99% operating-unit occupancy, coach text says **Nearly full**, shows the leased fraction and identifies actual rent-ready vacancies; it opens asking rents. If remaining units cannot rent yet, it says turnover/commissioning/access is needed and opens Jobs. Only 100% operating-unit occupancy says all operating units are leased. Existing urgent repair/make-ready guidance keeps priority.
- Key/value rows reserve 40% for values with shrinkable label/value columns. Financial statement amounts stay on one line while labels wrap inside their own space.
- Phone monthly reports put the grade above the full-width rows. Growth trend and old-job prose move below the numeric table; the shoppers label is shorter. No report values/calculations removed or changed.
- At widths ≤600px, section shortcuts form a visible three-column grid, retaining ≥44px button height and phone-readable text. All destinations are visible without discovering hidden horizontal tabs. Existing sheet body scrolling and fixed headers/confirmation controls remain.

## Validation

- **35/35 headless scripts passed** using `node tests/run-headless.mjs /tmp/sst-iphone-performance-suite`. This includes diagnostic/pooling/UI tests plus original economy/payback, save, construction, scenarios, fuzz and systems checks; some scripts are probes, not assertion collections.
- **11 new performance/UI regressions**: disabled/bounded diagnostics, percentile math/latest counters, throttle labeling, appearance/pose/carry reset, 71 active customers versus 24 retained cache, resource cleanup, shared-skin safety, staff exclusion, tiny-shadow selection tags and three occupancy cases.
- Final focused checks after report-layout/resume refinements: 11 new, 7 menu/touch, 16 systems and 26 blueprint/recovery checks passed; JS syntax and whitespace checks passed.
- Existing candidate-6 evidence remains historical: 72 year-long runs were not repeated or relabeled as newly run. This turn's complete default headless suite passed.
- Render workload fails on scene-build warnings. Resource tests run actual vendored Three.js objects, not browser/GPU rendering.

## Release and remaining limits

Publish this exact committed candidate to the **same owner-private Preview**, preserving access:
https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

The deployment gate requires a pushed immutable candidate, packaged runtime files from that commit, and `source-proof.json` listing candidate/tree/build and SHA-256 hashes. After publication every served runtime file plus the proof must match the packaged hashes. Delivery records the deployment result and served verification; this committed report describes the tested source and publication gate rather than inventing a future deployment outcome.

**Physical iPhone Safari gameplay/performance acceptance is still unverified.** No automated browser visual check, physical memory/thermal test, locked-60fps result, Low Power Mode result or launch-readiness claim is made. Remaining optimization candidates are actual on-device draw-call bottlenecks, material batching and resolution tuning after measuring quality tradeoffs.

## Short physical-iPhone acceptance check

Open the direct link in Safari and confirm build `bplus-iphone-performance-candidate-7`. Record model, iOS version, viewport/orientation and power mode; protect/export the existing save first.

1. Dense property at **4x**: play normally for two minutes, turn diagnostics on and capture its p50/p95/p99, CPU timings, draw calls/triangles/resources. Repeat same camera/property at the same quality. Look for stalls, missed inputs or missing customers/markers. Diagnostics affect costs slightly; also assess play with them off.
2. Pan down/up, pinch and rotate all four directions at exterior/F1/F2. The map should move without Safari pulling the page; selection and status markers should work. Rotate the device and retest.
3. Open Build/Operate/Business/Growth; every shortcut is discoverable, expenses keep labels away from dollars, monthly report remains readable, sheets scroll and close, buttons stay tappable.
4. Run two-floor tutorial from a fresh slot and an offset-building saved slot. Each step must show the exact current footprint/start/end/floor; inspect suggested review before spending; confirm hallway/access/upper units align. No incorrect building or historic progress may graduate the step.
5. Save, background Safari, resume, reload and switch properties repeatedly. Cash, timing, customer/cart state and tutorial progress should persist; previously active/offscreen properties must continue operating as designed. Check for resource growth after repeated customer turnover/property switches.
6. Sustain **15–20 minutes** of dense-property 4x play in normal mode, then repeat comparable play in **Low Power Mode**. Record beginning/end diagnostics, heat, battery behavior, degradation, lost context or reloads. Smooth 60fps is the target where supported, not an established acceptance result; Low Power Mode may change achievable cadence.

Report observed issues with build, save, property/camera, exact action and diagnostic screenshot. Keep this branch unmerged until gameplay acceptance is explicit.
