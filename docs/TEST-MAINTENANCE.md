# Current native regression contract

Reconciled October 23, 2026 (America/Los_Angeles).

Test-only successor based on integration `70a4e318f78f2a528a9241186341209ff7eeb3bf`.
Accepted master remains `ee39e0986718ce33fb84018a2c108249f793e3f8`. Integration is a published, unmerged candidate, not an accepted game baseline.
Reuse the 13-file maintenance scope from `0526ab8c1e256e851f22bb59ca626f74b65338fd`, whose immutable base is `734bc879ed6b92222989e2dc479f8fb507655135`.
All production blobs/modes match exact integration 70a4e31; no game rules or rendering implementation changes are included. Runner results identify the actual committed successor SHA/tree; these origin identities are not a claim that the original integration contained this runner.

## Run from a clean, committed checkout

```bash
python3 tests/headless/run_current_regressions.py --profile current --output /tmp/sst-current-qa
```

Use a new empty output directory. Python 3.11+ (tar data filter), Node with the existing production Web Streams APIs and Git are required. The runner exports exact committed source into temporary storage; it never opens normal browser/company storage. Original worktrees remain untouched. It passes no inherited reproduction, tuning or credential settings. It does not fetch objects, install browsers, start servers or deploy. The only permitted writes from legacy tests are inside the disposable export; production changes there also fail preservation.

The explicit manifest is `tests/headless/current-regressions.json`: 93 game-script entries and one runner-contract entry (94 required entries). Historical scripts are registered separately, not marked PASS or silently lost. Counts are entry scripts, not unique features; some import other suites. Two optional historical checks inside passing scripts are disclosed as scope notes, not claimed as executed. Existing terminal output and minimum check-marker counts are declared rather than adding boilerplate to all 84 passing scripts. The initial gate caught two incomplete completion contracts inherited from earlier audit logs: the actual soft-audio terminal declares 33 checks, and Owner repair has a second final coverage marker. Both contracts now follow their unchanged source; the old logs are retained rather than rewritten.

Every entry captures stdout/stderr separately, source SHA/tree, fixture hashes, declared command/settings, status, exit, duration, completion evidence and scope notes. The source export includes per-file hashes. Exit 0 requires every required entry to pass; exit 1 means FAIL/TIMEOUT; exit 2 means ERROR/BLOCKED/incomplete evidence without a higher-priority failure. A successful process exit alone is not a pass. Printed failure lines, absent completion, reduced check counts and undeclared skips are nonpassing. No required xfail/skip flag exists.

## Prerequisites

- Current floor-context preservation reads `1339648652cf61bfce23a96a60cbb54a7006c32a` from Git.
- Coach reproduction reads `4f2929ab85c3ae01f379e9115e19dae2831911ee`.
- Review-space preservation reads `58d11b1e3498165865553805282c91bcbd6bde51`.
- Numbering parity/legacy construction requires `9700d9d4475555e1a4907d1702cb8d81d31ded55`; the runner exports its unchanged `js/` tree, records identity/hashes and supplies the existing parent argument.
- Existing committed fixtures retain their built-in provenance checks. Missing objects/fixtures are BLOCKED, not regenerated from current source.
- Eleven historical/private-input entries remain BLOCKED in the historical profile until their exact original candidate pairing, invocation and inputs are registered. Some parent objects may exist; that alone is not a valid current parity contract. The manifest records the unresolved input for each entry.

## Assertion mapping and preservation

The seven original maintenance edits remain retrievable verbatim at immutable base `734bc879ed6b92222989e2dc479f8fb507655135`; their maintained versions remain at 0526ab8. The two floor tests before this reconciliation remain verbatim at 70a4e31. Original reports and fixture files are unchanged.

| Test | Maintenance | Retained behavior |
| --- | --- | --- |
| tart_refinement | Two doorway jamb locations instead of obsolete three-pier count; legacy rescueRoof animation checks become Open House room-finish checks | Real instance geometry/floor/shadow checks; six targets restore individually; unrelated rooms and complete simulation state unchanged; access failure does not invent grime |
| tcandidate22 | Displayed Building 1 is separate from internal object ID 12; updated chooser markup | Before structure exists F2 is not offered; after structure is raised it is labeled in-progress, never counted complete; live chooser, cancellation arithmetic, accessibility and Pause remain checked |
| tclimate33 | Moving the fixture upstairs also allocates a valid number using existing production conventions | Actual complaint/save snapshots, diagnostics purity and invalid-number rejection in the independent numbering suites |
| tproperty_ui | Explicit F1 renderer view; new deliberate off-floor refusal | Commission/clean controls, compact/details behavior, original actions and Pause |
| treview_repairs | Production updateGuide exercised with selector-aware rectangles instead of selector spelling; full instruction scrolling replaces obsolete line-clamp expectation | Actionbar/blueprint blocking, target visibility, untruncated instruction access, all later repair cases retained |
| tyard40 | Counts, product/rent detail and actual watch/pricing exits replace old wording | No unsupported expansion with existing ready stock, read-only company state, retained geometry/build/save protections |
| tfix | Deterministic conversion/readiness/save gate, failing exit status; leasing observation split | Exact cost, actual make-ready completion, legitimate rental eligibility, IDs/numbering, asking rent, cash/time/RNG/Pause across real raw/compressed load |
| tfloor_context | Exclude only legacy outdoor ground glow planes from the historical parent comparison; explicitly verify replacement count and absence of duplicate planes | All remaining scene transforms/visibility, mixed heights, active-floor selection, camera preservation, rebuild/state checks and all five valid source-identity assertions remain |
| tfloor_view | Use the normal renderer frame; test outdoor illumination through the light map instead of assuming every lamp has a sprite | Empty/fitted F2, real floor chooser, unit counts, map suppression upstairs/restoration downstairs, visible upper-floor indoor lamp, upstairs sprite hiding and exact state preservation remain |

Run all cases after an early failure. The art suite captures each case and exits nonzero if any fail. Its original 0526ab8 run exposed coincident jambs; that historical FAIL remains valid evidence. Master ee39e09 subsequently repaired the jambs and integration 70a4e31 retains that repair. The standalone `tdoorway_jambs` and `tlamp_lightmap` regressions are now required entries, with their existing production/state checks and terminal completion markers retained. No historical result is relabeled as a successor result.

## Runner failure detection

```bash
PYTHONDONTWRITEBYTECODE=1 python3 tests/headless/tcurrent_runner.py
```

Twelve real child-process/aggregate checks cover legitimate pass, exit-0 plus FAIL/SOME FAILED/issues, missing completion, nonzero/exception, timeout, missing fixture/export, unanchored text, observation schema and aggregate precedence. This test changes no game state. It is included in the current manifest.

## Historical leasing observation

```bash
python3 tests/headless/run_current_regressions.py --profile observations --output /tmp/sst-lease-observation
```

The setup and operator are factored directly from original tfix: original seed 20260929, original HVAC conversion, every 30 minutes requesting Owner work for unassigned jobs, 20 game days. No forced customer/lease or changed pricing/demand/RNG. The output records first readiness, first lease and lease state at window end. `historical_expectation=FAIL` stays visible when the original deadline is unmet; `cause_resolved=false`. This is OBSERVATION, never PASS/FIXED or a required deadline. Exceptions, invalid conversions or corrupted state still fail execution. It cannot satisfy a required current entry. The original mixed script's FAIL is not blanket-ignored.

## Separate stress and historical profiles

```bash
python3 tests/headless/run_current_regressions.py --profile stress --output /tmp/sst-stress
python3 tests/headless/run_current_regressions.py --profile historical --output /tmp/sst-historical
```

Stress invokes unchanged `tfuzz.mjs 120 3` with a 300-second limit and requires terminal NO ISSUES. Historical intentionally reports the eleven unregistered comparisons BLOCKED, with exit 2. Neither run changes current status or the original evidence. Do not replace missing private fixture 06 with a normal company.

Native/stubbed results are not rendered-browser, physical Safari, VoiceOver, balance, enjoyment or frame-rate acceptance. Earlier scoped user/Claude results retain their dates and limits. The original floor-context geometry FAIL and floor-view null-glow exception on unmodified 70a4e31 remain historical failure evidence; only this successor reconciles their test assumptions. Rendered QA for integration remains blocked by the known environment limitation and is not replaced by this gate. PR #2 remains excluded. No deployment or merge is authorized by this document.

## Successor runner reconciliation

The first complete successor current-profile run reported 93 PASS and one ERROR, exit 2. The unchanged topenhouse script passed its assertions and exited 0, but the old manifest terminal expected 267 meshes. Exact integrated scene output is 264 meshes because three outdoor ground glow planes were replaced by the light map. The terminal contract now requires that exact integrated output; units (23), batches (9), instances (436), casters (111), both PASS markers and all underlying script assertions remain required. No output wildcard or ignored failure is introduced. The initial report/logs remain separate evidence, never overwritten.

Focused floor-view setup also initially failed because the pre-map Canvas stub lacked createImageData, then because a retained animation reference became stale after the normal first-frame rebuild. The test now supplies only missing CPU browser APIs and queries the current animation list after each frame. Those failed focused attempts remain retained; no production defect is claimed from them.
