# Self Storage Tycoon — B/F placement candidate

Implementation and focused browser handoff. **Candidate only; not owner accepted. No publication.**

- Exact tested source: **59717ddffeeaf5e68dde76dbb11cbc44d4566e1e**.
- Branch: **repair/bf-placement-20261025** (local only).
- Original parent: **62d27478e8e6fdafc8a747c290e0993872611f90**, the evidence-only successor of P02 runtime **5317162be0543c95a7154464967008890d75c9fa**.
- Prior acquisition source: **6066ff380fa842a9abde3138cea1e702c016bacc**. Default GitHub branch was reverified as master at **e30430dccb23ae0bbf89789bf17635427a70e4f4**. The newer local source was recovered from original Git objects, not recreated from a file snapshot.
- Production changes: **js/sim.js** (explicit unit-row geometry only) and **js/ui.js** (B/F placement controls/messages/search only).

## What changed

The touched corner stays on the unit's door edge. Rows grow along either drag direction and preserve their touched anchor and count through rotation. Nearby-placement assistance searches up to six cells in all four facings and retains the same unit count. It uses actual planning/frontage checks and only changes the preview until Confirm.

The label is **Nearest buildable spot**. Additional setup requirements are shown on the suggestion and remain visible in an incomplete review after moving. Extra invalid-placement reasons remain available behind an expandable +N more control. The primary verdict precedes upgrades, and the tutorial's Use suggested placement button remains accessible in both the idle and review bars. Suggestions refresh when climate/options or the active property changes.

**A/C/D/E/G are excluded.** There is no manual commissioning card, financing hint, lesson cooldown, repair-request change, panel-height change or G speed-restoration behavior. Automatic opening, all existing readiness requirements, acquisition/borrowing actions, Pause, economics, camera machinery and save implementation are preserved.

## Verification

- **96/96 current native-gate entries PASS** on exact source 59717dd. No FAIL, ERROR, BLOCKED, TIMEOUT or NOT_RUN. The 73 new B/F groups are part of that gate.
- Three additional preservation groups prove the complete simulation text unchanged outside unit footprint planning, the UI unchanged outside the enumerated B/F methods, and 47 other production files byte-identical to the parent.
- Existing automatic opening, upgrade/render/save, reserve-fast, Growth-return rotation and entrance-preview suites pass separately; retained logs identify their original run source/working candidate. The P02 compact-status suite passes five groups on the final source.
- Existing orientation fixtures were translated to the new door-edge touch anchor while retaining their old world footprints and economic/readiness assertions. The floor suite retains its complete-file guard with the exact B geometry hunk added to its explicit allowed baseline changes. No failed assertion was silently removed.
- Earlier evidence remains unchanged and attached to its original sources. Original 95/95 and acquisition-native evidence are copied under evidence/retained-P02-input-evidence/. Original browser acquisition results are referenced there; the returned P02 report/results are copied separately. No historical result is relabelled as a browser pass for this candidate.
- **Browser at 375×667 and 390×844: NOT TESTED. Physical Safari/device performance/public hosting: NOT TESTED.**

Start with **BF_BROWSER_RECHECK.md**: six affected cases at each viewport, three disposable authored .sst fixtures, results template and source-integrity verification. The fixtures use production serialization/load validation; they do not contain a normal player save.

## Recovery and native reproduction

`recovery.bundle` contains complete history for the original borrowing recovery reference and the B/F candidate. Verify with `git bundle verify`, clone it to a new folder, then checkout `repair/bf-placement-20261025`. The extra recovery reference preserves a historical object required by the floor regression guard; fetch it if your clone did not import non-head refs:

```
git fetch /absolute/path/to/recovery.bundle refs/recovery/borrowing-original-137909c:refs/recovery/borrowing-original-137909c
python3 tests/headless/run_current_regressions.py --profile current --output /absolute/path/outside-checkout/new-evidence
```

The runner requires a clean checkout and a new evidence directory. `source/` is a complete exact-tree export for browser work, not a Git checkout. SOURCE_IDENTITY.json and SHA256SUMS.json verify that export. `candidate.patch` is the reviewed diff from 62d2747; original B/F donor patches are reference material, not instructions to apply all A–G.

Initial verification evidence is preserved: the first current gate had 95 PASS and one BLOCKED because d84fb59 was absent. The original recovery bundle restored it. The floor guard then identified the intentional B hunk; after the precise baseline update, all 96 passed. A later test-only refinement checked the door-edge contract through actual frontage cells rather than repeating the planner formula; the complete gate was rerun on 59717dd and passed 96/96.

No push, merge, deployment, Site changes or normal-save access occurred. Next action: execute only BF_BROWSER_RECHECK.md at both listed viewport sizes.
