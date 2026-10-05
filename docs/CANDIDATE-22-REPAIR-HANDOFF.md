# Candidate 22 bounded three-floor repair — source handoff

Date: October 5, 2026. Decision: **HOLD**. Automated engine/source assertions pass. Rendered mobile verification is blocked; physical-iPhone Safari acceptance has not occurred. This is an isolated source candidate, not a promoted release.

## Authority

- Repository: `EezzyE88/self-storage-tycoon-js` only.
- Branch: `candidate/three-floor-repair-20261005`.
- Exact parent/base: `b126ddcb8675dd71bd01ec546294175cdaa7d5b4`.
- Accepted master: `2812abf8d268f9a225e5786d173f95efcbd6223d`, reverified and untouched.
- Build: `bplus-three-floor-candidate-22`, October 5, 2026.
- Tested source snapshot tree: `b1435629baf31850d87b084dcf02f443da13e847`. This includes the final runtime and tests; subsequent additions are this report and evidence only. Final immutable commit/tree are supplied with delivery because a report cannot contain its own Git hash.
- Both existing Sites and their access settings were untouched. No Candidate 22 package was published.

## Repairs and evidence boundaries

| Area | Source repair | Evidence |
|---|---|---|
| Floor identity | Unit labels derive from `f`; stair labels derive from served floors; direct and chooser highlights synchronize with the rendered view. New sessions safely fall back to Exterior. | F1/F2/F3 inspector assertions; existing scene-layer checks. Interactive highlighting remains mobile-review work. |
| Completion | Ready count is computed after authoritative reconciliation, scoped to the completed order; property-wide count is separate. | Defined 14/14 completion, broader ready count and scoped zero-charge commissioning assertions. |
| Handover | Service-test route-loss suppression applies only to affected operating interior units and that temporary missing-route reason. Working-freight, floor and unit routes reconcile before the completion event. | F2 operating units are present during F3 handover. No false access event; deliberate commissioned F3 disconnection emits a real incident. |
| Tutorial | Collapsed/expanded guidance uses one current step. Blocked speed guidance leads to Back to map. Already-selected categories get no redundant ring. Required build and hire cards are revealed. Optional lessons resume at first unmet step. | Source and prior headless tutorial regressions; complete visible touch walkthrough remains unverified. |
| Tutorial map targets | Explicit Inspect target buttons bypass overlapping vehicles. Rings use visible DOM targets; commissioning disarms build placement. Bubble labels are suppressed to avoid covering controls. | Source inspection; real hit-testing/placement on iPhone remains unverified. |
| Unit Details | Task actions remain outside collapsible details. Assigned/responding/progress status remains on the action rail. Staff-first and explicit Owner commands retained. | Unit 107 compact, Details and assigned-state markup assertions; staff-first suite. |
| Requests | Feedback and overlay navigation dismiss Requests without resuming time mid-transition. | Source inspection; rendered Back/Close flow remains unverified. |
| Optional stairs | Missing stairwell disables/reverts the invalid option while keeping the valid freight quote and Confirm. | UI prototype quote assertions and engine refusal of an invalid stairs request. |
| Floor chooser | Reads current order progress and phase; separates completed floors from structural floors under construction. | Live order markup and completed-floor count assertion throughout unfinished F3 stages. |
| Import safety | Parse/migrate/validate first, then review incoming/current/previous metadata. Persist outgoing, archived previous and incoming saves before activation; refuse insufficient storage. Earlier games remain accessible from Menu. | Real SST0/SST1 parser, non-mutation, quota rollback, persisted incoming reload and immutable Candidate 21 fixture migration. Actual file-picker and touch confirmation remain unverified. |
| New-session UI | Clear overlay, modal, target, build configuration and selected floor state. Existing showcase attach stops following; photo mode now exits. | Source inspection and retained session tests. Full rendered cross-game check remains unverified. |
| Map preview | Preview on map keeps the configured quote and ghost floor; compact Review/Confirm/Cancel-preview controls remain available. | Source/quote assertions. Actual 393×659 map visibility and gesture usability remain unverified. |
| Cancellation | Commands open a deliberate confirmation, separate from Close/Back; details disclose charge, completed work, refundable work, penalty, retained prerequisites, refund and resulting cash. Ledger records commitment/refund/penalty/retention/recommitment. | Full undo and partial reinforcement cancellation, exact cash/re-quote and ledger assertions. |
| Landscape | Supported mobile play is explicitly portrait. Manifest is portrait; short landscape shows a rotate notice and pauses the clock. Returning leaves it paused. | Source policy. Actual 734×343 layout/rotation remains unverified. |
| Demand | Quote lists copied mix, matching ready vacancies, recorded matching lost shoppers and capacity-related losses; distinguishes insufficient/supportive/unsupported evidence and offers structure only. No revenue promise. | Quote markup, unchanged demand/economy sources. The figures are lost-demand records, not total shopper demand. |
| Copy/selectors | Porter summary and Sandbox copy show $12.50/day; task copy separates hands-on time from additional response/travel. Review, preview, package/import/cancellation actions have stable labels/data selectors. | Source inspection and existing financial/UI tests; accessibility traversal remains unverified. |
| Test portability | Committed pre-change renderer, legacy simulation/hash fixtures and Candidate 21 save replace history dependencies. | Entire suite passes with no `.git` directory or hidden objects. Fixture provenance is in `tests/fixtures/README.md`. |

## Verification

Node 24.19.0. Complete pre-change baseline: **50/51 scripts passed**, with only `tlayout_hierarchy` failing on unavailable `54d432f`. Git fetch and GitHub API both failed to find that object. Candidate 19 parity passed with full history.

Final history-free snapshot: **52/52 scripts passed**, zero script failures. All runtime JavaScript passed `node --check`; staged diff passed `git diff --check`.

Reproduce from a fresh shallow clone:

```bash
git clone --depth 1 --branch candidate/three-floor-repair-20261005 https://github.com/EezzyE88/self-storage-tycoon-js.git
cd self-storage-tycoon-js
node tests/run-headless.mjs /tmp/candidate22-results
```

Targeted commands:

```bash
node tests/headless/tcandidate22.mjs
node tests/headless/tthreefloor.mjs
node tests/headless/tthreefloor_save.mjs
node tests/headless/tthreefloor_parity.mjs
node tests/headless/tthreefloor_hardening.mjs
node tests/headless/tlayout_hierarchy.mjs
```

The >5% tighter-framing assertion is preserved against the available actual parent renderer, `f2f31b05519f831e5f13783de7fabe83afc4a4cf`. It is not claimed to be byte-identical to missing `54d432f`. Seven-day legacy state/RNG/economy parity remains exact. Save-source equality was intentionally replaced by functional save compatibility/safety checks because save UX is repaired.

## Deterministic ordinary F3 journeys

These are engine simulations from the existing commissioned-F3 test fixture, with $1,000,000 opening cash, ordinary generated shoppers, unchanged demand coefficients and explicit RNG seeds. The fixture's F2 copy remains uncommissioned; these runs prove the F3 journey, not representative career pacing. No shopper, chosen lease or route is injected in these four runs. A separate controlled-customer fixture tests physical cart return to its corral.

| Seed | Simulation minutes | Additional drain minutes | F3 leases | Correct-building entries | Waiters | Riders | F3 unit visits / returns | Cart-bearing F3 visits / returns | Failed assertions |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 43200 | 0 | 5 | 44 | 44 | 44 | 42 / 42 | 4 / 4 | 0 |
| 2 | 43200 | 129 | 7 | 76 | 76 | 76 | 75 / 75 | 6 / 6 | 0 |
| 3 | 43200 | 206 | 3 | 36 | 36 | 35 | 35 / 35 | 14 / 14 | 0 |
| 4 | 43200 | 0 | 5 | 58 | 57 | 57 | 57 / 57 | 4 / 4 | 0 |

Totals: **20 F3 leases, 209 unit visits and returns, 28 cart-bearing visits and returns**. All observed unit visitors return within the bounded additional day; maximum required drain was 206 minutes. Twelve real SST1 save/load snapshots cover waiting, riding and F3 travelling across the four seeds; each compares another 120 engine steps with the original replay.

Existing controlled fixtures additionally cover outbound/return freight paths, physical cart corral return, four person-slots, two slots per cart, deterministic overflow queues, outage/resumption, queue/rider identity and reservation cleanup. Dispatcher stress: seeds 1–24 on three, four and five architectural floors, 100 mixed passengers per burst, **7,200 journeys**, 156,712 aggregate ticks, maximum wait 2,813 ticks, zero failed assertions, 15,000-tick bound per burst. Wear is disabled only in dispatcher-isolation stress. F4/F5 remain unavailable to players. An aged caller boards within 20 ticks during 500 continuing arrivals.

Four separate 30-day full expansion engine runs (seeds 1–4) complete/commission F3 and observe upper-floor customers. These do not constitute device performance or enjoyment evidence.

## Economy regressions

| Verified configuration | Required | Observed | Result |
|---|---:|---:|---|
| F2 copied package | $17,810 | $17,810 | PASS |
| F3 copied package | $10,210 | $10,210 | PASS |
| F2 structure only | $12,470 | $12,470 | PASS |
| F3 structure only | $4,870 | $4,870 | PASS |
| Completion charge | $0 | $0 | PASS |
| Commissioning charge | $0 | $0 | PASS |
| Grace undo | Full charge refunded | Full charge refunded | PASS |
| Partial cancellation after reinforcement | 60% of unbuilt work, rounded by existing rule | Exact refund/cash equation | PASS |
| Re-quote after retained reinforcement | Original quote minus $396 | $9,814 for tested F3 copied configuration | PASS |
| Reload charge | No duplicate charge | No duplicate charge | PASS |

Data/finance/property-factory hashes are unchanged. No B+ coefficient, staffing capacity, daily Owner capacity, time-control or five-floor gameplay change is made. Zero-amount construction ledger facts disclose penalties/retention without charging them again.

## Saves and migration

- Candidate 21 F3 fixture is generated from the exact immutable base in an untouched detached checkout, then committed. Loading preserves exact cash, objects and orders.
- Actual SST0/SST1 exports and loads preserve F2/F3 objects/layers; loads stay paused.
- Construction phase, elapsed work and paid package survive reload; existing construction-stage checks pass.
- Invalid imports leave the active company and all save slots unchanged.
- Valid review is non-mutating. Activation retains outgoing and earlier games and persists the incoming main slot before switching.
- Simulated storage quota failure rolls back slot writes; import is refused. Import requires usable browser storage to guarantee recovery.
- Continue/Restore Previous remain existing mechanisms. Browser file-picker, complete title-screen flow and post-import browser reload require rendered review; engine/local-storage assertions are not a substitute.

## Remaining limitations and next handoff

**HOLD** until the visible interface and physical iPhone have been checked. There is no installed browser executable here. The attempted Chromium download repeatedly returned a truncated/non-ZIP payload; installation failed. Consequently, no 393×659 or 734×343 rendered screenshots, complete touch tutorial, browser console/unhandled-rejection check, or physical Safari session is claimed. Renderer tests use stubs; their results are not GPU/performance evidence.

1. Independently review the immutable Candidate 22 source/diff and fixture provenance. Use the final commit, not a moving branch name.
2. Run the fresh-clone suite and a real browser at 393×659. Complete Maple tutorial; exercise Details, every guided card, Requests navigation, quote→map preview→review→confirm, cancellation, new game, Continue, Restore Previous, code/file imports and reload.
3. Check portrait rotation treatment at approximately 734×343. Verify rotation keeps time paused and portrait controls recover. Capture console errors and unhandled rejections.
4. Fix any rendered/interactive defect on this isolated branch and rerun affected checks plus final complete suite. Do not promote master.
5. After source and browser review pass, publish a NEW isolated Candidate 22 Site/package with immutable commit/tree, build and runtime hashes in source-proof.json. Preserve both current Sites and access policies. Verify served assets byte-for-byte.
6. Give Eddie its Safari URL for controlled physical-iPhone acceptance of F2/F3 construction, commissioning, customer/cart/elevator travel, saving and import. Record PASS/HOLD separately from automated evidence.

No economy/pacing redesign, accepted-master merge, existing Site update or physical acceptance was performed.

## Complete changed-file list

The final list against the exact base is below; evidence/report files are included.

- `css/game.css`
- `docs/CANDIDATE-22-REPAIR-HANDOFF.md`
- `docs/qa/candidate22-evidence.json`
- `docs/qa/candidate22-tcandidate22.mjs.log`
- `docs/qa/candidate22-tthreefloor.mjs.log`
- `docs/qa/candidate22-tthreefloor_hardening.mjs.log`
- `docs/qa/candidate22-tthreefloor_parity.mjs.log`
- `docs/qa/candidate22-tthreefloor_save.mjs.log`
- `index.html`
- `js/localsave.js`
- `js/main.js`
- `js/showcase.js`
- `js/sim.js`
- `js/tutorial.js`
- `js/ui.js`
- `js/version.js`
- `js/vertical.js`
- `manifest.webmanifest`
- `tests/fixtures/README.md`
- `tests/fixtures/candidate19-economy-hashes.json`
- `tests/fixtures/candidate19-sim.js`
- `tests/fixtures/candidate21-three-floor-save.json`
- `tests/fixtures/legacy-layout-render.js`
- `tests/headless/tcandidate22.mjs`
- `tests/headless/tlayout_hierarchy.mjs`
- `tests/headless/tthreefloor_hardening.mjs`
- `tests/headless/tthreefloor_parity.mjs`
- `tests/performance/renderer-fixture.mjs`
