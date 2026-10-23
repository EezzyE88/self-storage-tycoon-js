# Current native regression contract

Test-only candidate based on master `734bc879ed6b92222989e2dc479f8fb507655135`.
Accepted game source remains `7d9bce5dfe431974112391a8e7fe39c2e0552744`; no production files change.

## Run from a clean, committed checkout

```bash
python3 tests/headless/run_current_regressions.py --profile current --output /tmp/sst-current-qa
```

Use a new empty output directory. Python 3.11+ (tar data filter), Node with the existing production Web Streams APIs and Git are required. The runner exports exact committed source into temporary storage; it never opens normal browser/company storage. Original worktrees remain untouched. It passes no inherited reproduction, tuning or credential settings. It does not fetch objects, install browsers, start servers or deploy. The only permitted writes from legacy tests are inside the disposable export; production changes there also fail preservation.

The explicit manifest is `tests/headless/current-regressions.json`: 91 game-script entries and one runner-contract entry. Historical scripts are registered separately, not marked PASS or silently lost. Counts are entry scripts, not unique features; some import other suites. Two optional historical checks inside passing scripts are disclosed as scope notes, not claimed as executed. Existing terminal output and minimum check-marker counts are declared rather than adding boilerplate to all 84 passing scripts.

Every entry captures stdout/stderr separately, source SHA/tree, fixture hashes, declared command/settings, status, exit, duration, completion evidence and scope notes. The source export includes per-file hashes. Exit 0 requires every required entry to pass; exit 1 means FAIL/TIMEOUT; exit 2 means ERROR/BLOCKED/incomplete evidence without a higher-priority failure. A successful process exit alone is not a pass. Printed failure lines, absent completion, reduced check counts and undeclared skips are nonpassing. No required xfail/skip flag exists.

## Prerequisites

- Current floor-context preservation reads `1339648652cf61bfce23a96a60cbb54a7006c32a` from Git.
- Coach reproduction reads `4f2929ab85c3ae01f379e9115e19dae2831911ee`.
- Review-space preservation reads `58d11b1e3498165865553805282c91bcbd6bde51`.
- Numbering parity/legacy construction requires `9700d9d4475555e1a4907d1702cb8d81d31ded55`; the runner exports its unchanged `js/` tree, records identity/hashes and supplies the existing parent argument.
- Existing committed fixtures retain their built-in provenance checks. Missing objects/fixtures are BLOCKED, not regenerated from current source.
- Eleven historical/private-input entries remain BLOCKED in the historical profile until their exact original candidate pairing, invocation and inputs are registered. Some parent objects may exist; that alone is not a valid current parity contract. The manifest records the unresolved input for each entry.

## Assertion mapping and preservation

All pre-edit test files remain retrievable verbatim at immutable parent `734bc879ed6b92222989e2dc479f8fb507655135`; original reports and fixture files are unchanged.

| Test | Maintenance | Retained behavior |
| --- | --- | --- |
| tart_refinement | Two doorway jamb locations instead of obsolete three-pier count; legacy rescueRoof animation checks become Open House room-finish checks | Real instance geometry/floor/shadow checks; six targets restore individually; unrelated rooms and complete simulation state unchanged; access failure does not invent grime |
| tcandidate22 | Displayed Building 1 is separate from internal object ID 12; updated chooser markup | Before structure exists F2 is not offered; after structure is raised it is labeled in-progress, never counted complete; live chooser, cancellation arithmetic, accessibility and Pause remain checked |
| tclimate33 | Moving the fixture upstairs also allocates a valid number using existing production conventions | Actual complaint/save snapshots, diagnostics purity and invalid-number rejection in the independent numbering suites |
| tproperty_ui | Explicit F1 renderer view; new deliberate off-floor refusal | Commission/clean controls, compact/details behavior, original actions and Pause |
| treview_repairs | Production updateGuide exercised with selector-aware rectangles instead of selector spelling; full instruction scrolling replaces obsolete line-clamp expectation | Actionbar/blueprint blocking, target visibility, untruncated instruction access, all later repair cases retained |
| tyard40 | Counts, product/rent detail and actual watch/pricing exits replace old wording | No unsupported expansion with existing ready stock, read-only company state, retained geometry/build/save protections |
| tfix | Deterministic conversion/readiness/save gate, failing exit status; leasing observation split | Exact cost, actual make-ready completion, legitimate rental eligibility, IDs/numbering, asking rent, cash/time/RNG/Pause across real raw/compressed load |

Run all cases after an early failure. The art suite now captures each case and exits nonzero if any fail. **The stronger two-jamb assertion currently exposes an existing production defect:** both decorative instances use the same transform. It must remain FAIL; no production repair is included. A test-maintenance candidate is not automatically a green game gate.

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

Native/stubbed results are not rendered-browser, physical Safari, VoiceOver, balance, enjoyment or frame-rate acceptance. Earlier scoped user/Claude results retain their dates and limits. Test maintenance, the newly exposed jamb defect and the paused glow prototype are separate tasks. PR #2 remains excluded. No deployment or merge is authorized by this document.
