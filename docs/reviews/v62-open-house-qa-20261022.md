# Open House on V62 — bug, stress and playtest report

Date: October 22, 2026. Original published candidate: `23a68ba0057c38de6deae48727da0b23406f7eca`. Review project: `appgprj_6ada185948a88191a1444dfd2158a84a`.

**Result: six confirmed Open House presentation defects fixed; final scoped automated checks PASS. Overall visual/device acceptance remains HOLD.** A rendered browser playtest and physical iPhone test were not completed. This report does not substitute simulation runs for those results.

## Scope and source protection

The work stays in `EezzyE88/self-storage-tycoon-js` on `candidate/v62-open-house-20261022`, using V62's JavaScript/Three.js foundation. Original candidate `23a68ba` is retained in history. Runtime changes in this repair are limited to `js/openhouse.js`, `js/render.js` and `js/version.js`. No simulation, economics, progression, input, UI/CSS, placement rules, audio, storage or save-format code changes were made. The renderer's only additional geometry change lowers the decorative unit foundation; it does not change authoritative footprints or access cells.

Master remains outside this work. The accepted V62 Site is not a deployment target. Tests use generated/disposable states and do not open normal saves or browser storage. The separate owner-private review Site is the only hosting target. Its current served source is identified by `/source-proof.json`; publication details are reported with the deployment handoff.

## Six confirmed defects and repairs

| ID | Defect reproduced before repair | Cause and repair | Verification |
|---|---|---|---|
| OH-QA-01 | A restored Comeback unit retained the restored wall finish after access was lost or a service became missing. | The visual key watched commercial/lease values but omitted other eligibility inputs. Derive each room's finish from V62's current authoritative `comebackFinish` result and include the resulting color in the key. | Both access-loss and missing-service tests fail before and pass after. Existing restoration tests also verify occupied/reserved states, later turnover and malformed target mappings. |
| OH-QA-02 | A wall could remain full height after the camera crossed the cutaway threshold. | Rounded camera components could give the same cache key on opposite sides of the threshold. Cache the exact four facing decisions instead. | Positions immediately below/above the 0.1 facing threshold now change wall height correctly. |
| OH-QA-03 | Each unchanged frame scanned the task array separately for each unit. | Per-part cache construction repeatedly called `tasks.some`. Scan tasks once into a set and inspect each room once. | The original Maple fixture made 2,760 full-array scans in 120 unchanged frames. The repaired dense test makes zero per-room full-array scans across 5,000 frames. A single linear task iteration still occurs each update. |
| OH-QA-04 | Small camera changes within an unchanged cutaway region uploaded content instance matrices again. | Angle-based invalidation rebuilt unchanged geometry. Use the facing mask and actual room appearance/occupancy/work values. | Instance buffer versions remain unchanged in the small-rotation regression and across 5,000 steady updates. |
| OH-QA-05 | The inherited foundation slab geometrically covered the new unit floor. | Foundation top was 0.15; floor top was 0.10. Lower the decorative foundation top to 0.08. | Geometric height/clearance assertion now passes. Actual pixels remain unverified. |
| OH-QA-06 | Cartons, sofas, toolboxes and the office counter extended below their room floor. | New prop bases were below the 0.10 floor surface. Raise contents to the floor and keep the screen/tape aligned with the supporting furniture. | Every tested floor-resting prop now has its base at or above the floor surface. |

No critical crash was reproduced in the Open House module. That is a bounded test finding, not a claim that the game is crash-free.

## Repeated bug-test passes

1. **Round 1:** five targeted assertions failed on the original candidate: two stale-finish cases and three cache/update cases. All five passed after the cache repair. Exact before/after logs: `round1-before.log`, `round1-after.log`.
2. **Round 2:** prior checks remained passing; two new geometry checks failed for the covered floor and sunken props. All seven passed after geometry repair. Logs: `round2-before.log`, `round2-after.log`.
3. **Round 3:** reran the final applicable regression suite and semantic art checks. All 33 final scoped scripts passed. No additional Open House runtime defect was reproduced. Logs and exact arguments: `final-regression-results.json` and `*-final.log`.

Two historical rendering tests assumed one animated solid body per restored unit. Open House deliberately replaces that body with instanced hollow walls. Their test adapter now reads actual per-instance colors, retaining the semantic assertions rather than requiring the obsolete mesh organization. No production behavior was added to satisfy the tests.

## Final passing suite

The final 33 scripts are:

- `tbugs`
- `tbuildability`
- `tbuildability_save`
- `tcontrol_access`
- `tdisplay_repair`
- `tfinancial_trust`
- `tgestures`
- `tmenu_touch`
- `tpause_policy`
- `tsave_recovery`
- `tthreefloor`
- `tthreefloor_hardening`
- `tthreefloor_save`
- `tsandbox`
- `tsandbox_build_pause`
- `tinvestment_guidance`
- `ttraffic_delegation`
- `ttraffic_delegation_save`
- `tcomeback36_save`
- `trescue_operation_save`
- `tworking_yard_save`
- `tyard_loop_repairs`
- `tstartup_graphics`
- `topenhouse_qa`
- `topenhouse`
- `twhole_game_art`
- `tcomeback36`
- `tfuzz` — 30 days per mode, one deterministic seed
- `towner_auto_repairs`
- `treserve_wait`
- `treserve_wait_continuity`
- `tproperty_projects_save`
- `tthreefloor_journeys`

This covers construction orientation and save retention, Pause restoration, gestures, menus, financial calculations, sandbox behavior, staged upper-floor construction and compressed saves, investment guidance, retention policy/after-hours handling, rescue and working-yard saves, startup fallback, state/status cues, restoration, property switches and renderer state isolation. It does not establish physical touch behavior or full-game rendered integration.

## Stress results

`tests/stress/topenhouse_stress.mjs` passed:

- **550-unit dense scene:** 25 rebuilds with stable counts: 3,063 scene nodes, 1,232 material references, four geometry references and 10,489 instances in the measured static scene. No accumulated node/material counts or nonfinite instance matrices were observed. The original nine Open House batches emitted disposal events on replacement.
- **5,000 steady presentation updates:** zero instance-buffer reuploads and zero per-room `tasks.some` scans. Complete simulation state remained unchanged.
- **Three paired 30-day runs**, seeds 4401, 5150 and 9101: one simulation received hourly presentation updates and the other did not. All daily states remained exactly equal. That is 2,160 presentation samples and 18 paired state reload comparisons across 90 game days.
- Final paired cash values were $28,439.75, $28,702.75 and $28,428.75 respectively. These are fixture observations, not balance or profitability recommendations.

Scene counts and CPU timings are not GPU draw-call, FPS, memory, thermal or iPhone performance measurements. The captured `stress.log` records the machine-dependent timings; no mobile performance acceptance is inferred.

## Randomized actions

The bounded fuzz run completed **30 days in each of ten modes**, one seed per mode: Maple tutorial/career, Comeback, Turnaround, Vertical, Climate, empty/starter Business, Free Build and challenging urban Business. It issued **5,244 actions**, accepted 1,296, and reported **NO ISSUES** under its checked invariants. These include finite cash/ledger values, condition ranges, valid unit/lease references, valid construction references, finite agent coordinates and exactly one Owner. Invalid/garbage commands were included.

The initial default 120-day/three-seed fuzz invocation was stopped by the runner's 100-second limit and is **incomplete**. It was replaced by the explicitly bounded completed run, not counted as a completed default run.

## Test setup failures found and corrected

The expanded first sweep attempted 38 script names. Five assertions failed on the candidate and on the exact V62 renderer/gameplay source. Diagnostics established three test-setup causes; these were corrected without production rule changes:

| Affected test | Confirmed cause | Test-only correction and final result |
|---|---|---|
| `towner_auto_repairs`, `treserve_wait`, `treserve_wait_continuity` | Their recovered fixture still contained an owner-held request: “I'm done with Unit 109. What do I need to do?” Reserve waiting correctly returned `An owner decision needs attention.` | Added opt-in fixture settling through ordinary default request actions. Only tests needing a quiet investment checkpoint opt in; requests are not deleted and the production blocker remains. All three pass. |
| `tproperty_projects_save` | Covered loading cost $1,680 but the fixture had $1,561. The production build correctly refused it. | Give this serialization-only fixture explicit $100,000 starting cash. Affordability rules are unchanged. Save checkpoints now pass through both projects. |
| `tthreefloor_journeys` | Seed 3 legitimately left its cart upstairs, so a mandatory returning-cart checkpoint could never occur. A diagnostic recorded the completed customer route and `cart_left` event. | Require either a real return-with-cart checkpoint or a complete journey plus explicit upstairs cart-left event and a stranded/damaged cart represented on its real floor. This preserves the intended alternative instead of forcing every customer to return a cart. All four seeded journeys pass. |

The final upper-floor journey run reports **four full customer/cart journeys, 15 production save/reload checkpoints, four outage recoveries, 36 burst callers and zero failures**. One legitimate cart-left branch was explicitly verified. These are deterministic simulation journeys, not browser playthroughs.

Exact initial candidate failures, matching V62 failures, diagnostic observations and final results remain in the release evidence directory. Initial failed runs were not erased.

Five historical comparison scripts remain outside the executable final set because their specific historical prerequisites are absent: `tthreefloor_parity` requires its Candidate 35 fixture, while `trescue_operation`, `tproperty_projects`, `tworking_yard` and `tyard_loop` require pre-feature baseline directories/environment variables. They are **not counted as passing**. Supplying current V62 as those pre-feature snapshots would invalidate their intended checks. Their current save/behavior counterparts and the new paired V62 presentation tests are included in the final scoped suite.

## Browser and playtest limits

The managed preview supervisor started the isolated local Site successfully. The cloud browser then rejected access by browser security policy: it could not acquire authority to observe page content. No alternate browser, raw protocol, installation or policy workaround was used.

Accordingly:

| Area | Status |
|---|---|
| Source/syntax and final scoped automated regressions | PASS |
| CPU geometry, lifecycle and dense scene stress | PASS |
| Paired simulation/state-save stress | PASS |
| Randomized bounded simulation actions | PASS within stated scope |
| Rendered full-game WebGL startup and interaction | NOT TESTED |
| Actual rendered day/night/access readability | NOT TESTED |
| FPS/GPU/thermal behavior | NOT TESTED |
| Human playtest, physical iPhone Safari and subjective acceptance | NOT TESTED |
| Overall visual/release acceptance | HOLD |

The simulation runs are executable game-state tests; they are not represented as a human playtest. No screenshots or moving clips were produced.

## Reproduce and next acceptance

From repository root with Node supporting ESM:

```sh
node --experimental-default-type=module tests/headless/topenhouse_qa.mjs
node --experimental-default-type=module tests/headless/twhole_game_art.mjs
node --experimental-default-type=module tests/headless/tcomeback36.mjs
node --experimental-default-type=module tests/stress/topenhouse_stress.mjs
node --experimental-default-type=module tests/headless/tfuzz.mjs 30 1
```

The smallest remaining acceptance is a disposable physical-Safari pass of the repaired review Site: startup/Continue; exterior and upper-floor appearance; camera rotation; a leased, empty and make-ready unit; a build/rotate/cancel check while paused; day/night access readability; and a short ordinary operate/invest loop. Capture actual observations and decide whether the appearance is worth retaining. The supported browser route would need to become available for independent rendered automation. No master merge is recommended from CPU evidence alone.
