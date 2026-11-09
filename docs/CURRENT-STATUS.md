# Current project status — November 9, 2026

Reconciled November 9, 2026 (America/Los_Angeles) against exact master `2f8b377`. These are dated observations; refresh remote refs before any consequential action. Evidence labels:
- **Observed:** checked directly during this reconciliation.
- **Recorded:** retained in project reports and not re-run.
- **Owner-reported:** reported by Eddie and not independently verified.

## Verified source and publication

- Active repository: [EezzyE88/self-storage-tycoon-js](https://github.com/EezzyE88/self-storage-tycoon-js). The active integration branch and default branch is `master`.
- Current master: `2f8b377e4a81361b7652f90a2b1373514a3f2ff6` (`2f8b377`), tree `57fdb0172cabdbfa65a7bb7719d089a377b9fd2f`, sole parent `f1ebd1ecc66cce301823870b94eae48ce5f5f342`. It is the [PR #40](https://github.com/EezzyE88/self-storage-tycoon-js/pull/40) squash of the owner-accepted candidate `7a98e3d1fc7cd79d6fcd491462b5b51c9645c915`, which has the same tree. Observed.
- [Pages run #28](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42656665611) (`42656665611`) ran on the exact master SHA.
  - Gate job `129296845246`: **139 PASS, 0 FAIL, 0 ERROR, 0 BLOCKED, 0 TIMEOUT, 0 OBSERVATION, 0 NOT_RUN**.
  - Deploy job `129297679262`: succeeded.
  - Observed.
- Live site: `https://eezzye88.github.io/self-storage-tycoon-js/js/build-stamp.js` serves sha `2f8b377e4a81361b7652f90a2b1373514a3f2ff6`. Observed November 9.
  - The AG-01 merge record reports 56/56 served files byte-identical to a local `build-pages-site` build of `2f8b377`, and a "Build 2f8b377" label at 390×844 in Chromium emulation. Recorded.
  - The live-stamp item from November 5 is closed for the current build.
- Pages runs #21 through #27 completed successfully. Their per-run gate counts were not re-read for this record.

## Integration and deployment workflow

1. Each unit is developed on an isolated branch and integrated through a pull request into `master` with Eddie's authorization.
   - Merge commits: PRs #31, #33, #34, #35 and #37.
   - Squash merges: PRs #38, #39 and #40.
2. **There is no pre-merge CI.** `.github/workflows/pages.yml` triggers only on `push` to `master` and on `workflow_dispatch`. Pre-merge test evidence comes from the authoring session's local runs on the exact candidate.
3. On every master push, the `gate` job checks out full history and runs `tests/headless/run_current_regressions.py --profile current` on the exact commit. The `deploy` job runs only if the gate passes.
   - Deploy builds `_site` with `tools/build-pages-site.mjs`, asserts that the stamp contains the deployed SHA and that the repository `js/build-stamp.js` is still `null`, then deploys to GitHub Pages.
   - A failed gate blocks deployment but does not undo the merge.
4. `js/version.js` trusts the deploy-time stamp only on the real Pages host. This mechanism is the standing answer to the older stale build-label finding.

## Branch status

- `master` is the active integration branch.
- `development` is at `d3c9e130e9b5dce309aec6cb4c0652de9d094610` (October 30, 9:25 PM Pacific). It is classified as a **stale historical ancestor**: an ancestor of master, 0 commits ahead and 88 behind, with no unique work.
  - Do not resume work from it. It predates the camera-save, chapter-pause, IFM-01A, advertising, investment-guidance and AG-01 integrations.
  - This record neither retires, moves, resets nor deletes it. That decision remains Eddie's.
  - The October 30 "keep master and development matched" instruction survives only in the preserved historical records below and does not describe the current workflow.

## Integrated since the November 5 checkpoint

PR #31 (`53fb2b3`) was the documentation-only November 5 reconciliation. The seven gameplay integrations after it are listed below. Older changes, including the PR #28/#29 Act III Security guidance fixes already in `d7f4990`, are not repeated here.

| PR | Master commit | Candidate | Pages | Runtime files | Change |
|---|---|---|---|---|---|
| [#33](https://github.com/EezzyE88/self-storage-tycoon-js/pull/33) | `1bd9eac` (merge) | `9e6eb63` | #22 | `main.js`, `render.js`, `showcase.js`, `tutorial.js`, `ui.js` | Five bug fixes: scenario name kept on the minimized strip; player camera restored after save, reload and Continue; beat-banner count and rent-roll "past due" labels; Go Vertical elevator goal correct after reload |
| [#34](https://github.com/EezzyE88/self-storage-tycoon-js/pull/34) | `c1d0dd1` (merge) | `6c286d5` | #23 | `main.js` | Automatic Maple Street chapter pauses are checkpointed (saved) |
| [#35](https://github.com/EezzyE88/self-storage-tycoon-js/pull/35) | `1139e87` (merge) | `4f3bd9f` | #24 | `ui.js` | Paired automatic-Pause cues; two-floor lesson tool handoffs |
| [#37](https://github.com/EezzyE88/self-storage-tycoon-js/pull/37) | `4d64b99` (merge) | `a122665` | #25 | `main.js`, `sim.js`, `ui.js` | IFM-01A: inspect the elevator from blocked units; restored-access count held until readable; truthful blocked status. The `sim.js` addition is a transient, never-saved repair watch that only emits a notification |
| [#38](https://github.com/EezzyE88/self-storage-tycoon-js/pull/38) | `645c27a` (squash) | `099aa04` | #26 | `sim.js`, `ui.js` | **Authorized advertising rebalance** (see below) |
| [#39](https://github.com/EezzyE88/self-storage-tycoon-js/pull/39) | `f1ebd1e` (squash) | `37e9a24` | #27 | `economics.js`, `ui.js` | Investment guidance, presentation only. `economics.js` names the existing evidence thresholds (values unchanged) and makes lost-shopper actions stock-aware. Payback math, prices, saves and Pause unchanged |
| [#40](https://github.com/EezzyE88/self-storage-tycoon-js/pull/40) | `2f8b377` (squash) | `7a98e3d` | #28 | `main.js`, `ui.js` | AG-01 Rev 1 operating-facility acquisition guidance, presentation only. Prices, loans, career rules, economy and saves unchanged. D1 unresolved |

### PR #38 advertising change

- **Change:** `js/sim.js` `adFactor`.
  - Targeted campaigns: shopper traffic for the chosen size goes from +50% to **+150%** (×1.5 → ×2.5).
  - Local search: from +15% to **+45%** (×1.15 → ×1.45).
  - `js/ui.js` break-even text now uses the asking rent of ready units of the targeted size, and results are labeled campaign-attributed, not total profit.
  - Prices ($250/$500), the 30-day duration, shopper qualification, attribution, lease eligibility and the save format are unchanged.
- **Authorization (recorded), November 8, Pacific:**
  - Eddie authorized the review push of `064d3ed` (1:20 PM).
  - Eddie authorized the fast-forward to `099aa04`, tree `99d99181c787eb80975653f5c1d80d4876d74340` (1:42 PM).
  - A merge-readiness review passed (1:55 PM).
  - Eddie authorized the squash merge to `645c27a` (2:20 PM).
  - The master tree equals the reviewed `099aa04` tree. Observed.
- **Evidence (recorded):**
  - Gate 137/137 and `tads` 15/15 on `099aa04`.
  - A 300-seed paired simulation from a graduated Maple Day 19 checkpoint:
    - Targeted ad leases rise from 1.26 to 3.42, and first-month rent vs cost goes from −$124 to +$92.
    - Local search still loses money.
    - Back-to-back year-long campaigns lose money in every variant.
  - Rendered cards at 375×667 and 390×844 in Chromium emulation.
  - Save compatibility was reviewed by inspection: no fields were added. No save/reload with an active campaign was executed. **Physical iPhone: not tested.**

This is the only economy change since November 5. The November 5 statement that "the economy [is] unchanged" applied to PR #30 and is superseded.

## Physical iPhone Safari evidence

None of the following was independently verified. Claude did not observe the device in any case.

| Feature | Build | Result | Limits | Relation to `2f8b377` |
|---|---|---|---|---|
| AG-01 Rev 1 | `7a98e3d` | **Owner-reported PASS** (November 9) | Career → Acquisitions navigation, Pause and cash were reported with Eddie's screenshots, which Claude has not reviewed. Purchase review, purchase and device save/reload are covered only by the overall owner report | Same tree as current master |
| IFM-01A | `a122665` | **Owner-reported PASS** (November 8, decision card) | Item detail not recorded | Earlier tree; later `ui.js` changes not device-tested |
| Chapter-pause checkpoint | `6c286d5` | **Owner-reported PASS** (November 7) | Details not given | Earlier tree |

Earlier scoped owner iPhone results (PRs #14, #19 and #20, November 1–2) are historical and source-specific.

**Remaining physical-device qualification gaps** (never run on a physical iPhone):
1. Investment Progress at its four placements (PR #30).
2. Player camera restore after save, reload and Continue (PR #33, `b8d4180`).
3. Paired automatic-Pause cues and two-floor lesson tools (PR #35).
4. One advertising purchase, including card and result wording (PR #38).
5. Investment-guidance review and attention actions (PR #39).
6. An itemized AG-01 purchase followed by device save and reload (PR #40).

Rendered Chromium emulation at 375×667 and 390×844 is recorded for these units but is not physical Safari evidence. Accessibility, sustained performance, novice comprehension/enjoyment and beta/release qualification are also outstanding.

## Current planning: Unit 7 Rev 1 (Act IV, planning only)

Unit 7 Rev 1 is a plan, not an implementation. Nothing from it is in `master`, and nothing is accepted. Decisions recorded on November 9 (Pacific):
- **D3 = Option 2** (9:37 AM): Beat 15 is anchored to the real current route quote. It shows cost, cash, reserve, demand and terms, and teaches that financing availability is not the same as a worthwhile project. The player inspects, compares and may decline without penalty. No borrowing is required, and no profitability is implied.
- **P1 = inspection-only** (10:13 AM): the tutorial loan lock and loan rules are unchanged. There is no Confirm and no debt. The loan figures are read-only calculations, and declining completes the lesson.
- **Beat 14 S2** (10:58 AM): a returned-payment authored delinquency was approved as design direction only.

Any implementation work happens separately and is not described or qualified by this record. Plan: `reports/act4_unit7_plan_2f8b377_20261109/Unit7_ActIV_ImplementationPlan_2f8b377_20261109_PLAN.md` (project files).

## Preserved decisions and authority

- Master Blueprint Option B and AM-01 Draft 0.2 (Achievements & Milestones specification) remain accepted.
- OT-01 remains a planning HOLD.
- AG-01 D1 (unopened-parcel eligibility) is unresolved.
- The $100 observation stays PARKED.
- The Version 1.0 roadmap and SST Project Runtime v3 revision 5 are unchanged.
- Saves, manual Pause, the economy outside the authorized PR #38 change, and the $0 budget are protected.
- Beta/release acceptance remains HOLD. This record changes no acceptance.

**Record boundary:** the November 5 and October 30 status records below are preserved verbatim. Their commits, gate counts, hosting and outstanding-item statements are historical, not November 9 assertions.

---

## Preserved November 5 orientation record (historical; verbatim)

# Current project status — November 5, 2026

## Verified source and publication

- Active repository: [EezzyE88/self-storage-tycoon-js](https://github.com/EezzyE88/self-storage-tycoon-js).
- Verified master: `d7f49903076fd6bb3a70189b7e6efb9a7c0d9db9` (`d7f4990`); tree `04a0d67232b375a699c905e20186f4cc5d9a284e`; parents `b483fc6607b7cbad506b6e55b037783be673c000` and `72a779ee6d6a40185dd94af12a36f79c1b56c0bf`.
- [PR #30](https://github.com/EezzyE88/self-storage-tycoon-js/pull/30) merged: five files, +213/−4. Read-only `js/investmentprogress.js` plus tutorial and Business presentation and a focused test. Simulation, financial formulas, save system and Pause were not modified by the PR.
- [Pages run #20](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42127848496) (`42127848496`) completed successfully on the exact merge SHA. Gate log: **132 PASS, 0 FAIL, 0 ERROR, 0 BLOCKED, 0 TIMEOUT, 0 NOT_RUN**. Pages build, artifact upload and deploy steps succeeded.
- [Published environment](https://eezzye88.github.io/self-storage-tycoon-js/): job-confirmed URL. The displayed public build stamp and served asset hashes were not separately fetched; expected stamp is `d7f4990`.

## Financial Comprehension status

PR #30 shows operating player-built units, leased/vacant count, contracted rent from those units and the total property rent roll at Act II, Act III, graduation and relevant post-graduation Business views. Graduation warns prospectively of normal demand and expense conditions; Business repeats the reminder for up to 30 game days or while new units are vacant. No headline claims success while zero new units are leased. Income is explicitly distinguished from collected cash and operating result, with a pointer to Statement. The existing HUD cash-today label remains a separate deferred review.

Local candidate qualification was *reported* as 9/9 focused, 132/132 native, save-state parity and Chromium renders at 390×844 and 375×667; 26/26 evidence hashes were checked across retained transfers. The *merge-commit* gate 132/132 was independently verified in GitHub Actions.

## Outstanding work and authority

Live stamp/public accessibility and physical iPhone Safari screens/scrolling at the four placements remain unverified; so do unfamiliar-player understanding, enjoyment and broader accessibility/performance. The proposed 20-page economy/development plan and Advanced Financial Insights are **not** adopted implementations. Retain the accepted Maple Street teaching direction, paused graduation, saves, economy and manual Pause. Beta/release acceptance remains unchanged, and the budget is $0.

**Record boundary:** Content below is an archived October 30 status snapshot. Its then-current commit, hosting and runtime links are historical only, not November 5 assertions.

---

## Preserved October 30 orientation record (historical; verbatim)

# Current project status

Reconciled October 30, 2026, America/Los_Angeles. Dated observations, not a promise of future branch state; refresh refs before consequential operations.

## Source and integration

| Item | Verified identity |
| --- | --- |
| Repository | EezzyE88/self-storage-tycoon-js |
| Integrated runtime checkpoint | 1765465b6b4ec7fafbf636919da19b1ae1f944cd |
| Exact runtime tree | 74129ffa4906aad471da9398901cdaee1c1c2be0 |
| Sole parent | d155a92590a938005b00c16ec52d92b812205736 |
| Gesture candidate branch | candidate/hold-build-doubletap-20261030 → 1765465b6b4ec7fafbf636919da19b1ae1f944cd |

Immediately before this documentation-only reconciliation, remote master and development were both verified at exact integrated runtime source 1765465b6b4ec7fafbf636919da19b1ae1f944cd. That source is exactly one commit ahead of d155a92590a938005b00c16ec52d92b812205736 and changes only `js/main.js`, `js/ui.js` and `tests/headless/tgestures.mjs`. This reconciliation changes orientation records only; master and development are to remain matched on the same documentation successor. No deployment, spending or acceptance change is part of this record. Broader release acceptance remains HOLD.

The integrated runtime now includes the d155a925 single-property custom-name save repair and the 1765465 hold-to-build/double-tap gesture repair. d155a925 keeps the existing company save envelope when a company has one property; older saves remain loadable, multi-property serialization is unchanged, and names already absent from old bare saves cannot be reconstructed. 1765465 keeps the 240 ms touch/pen hold threshold and >7 px movement-to-pan behavior while allowing a Build-armed short-tap sequence to double-tap zoom without selecting or placing.

## Qualification

Qualification remains source-specific and is not relabeled across runtime changes.

The registered CURRENT native gate ran once on original a530cd3fc6e28692e21a29d8b5991270eae8601f, exact tree 13f6810cf91e392457ff63b036ee51d89ba856a6: **114/114 PASS**, zero failures/errors/blocked/timeouts/not-run. GitHub equivalent 4ed4a282fa9debe591fa823010be8511a6bcd816 has that identical tree and sole parent 3f417d717de2b6056048acc90aea52875bf167db. This 114/114 result remains valid historical parent qualification; it was not rerun on d155a925 or 1765465.

d155a925 records **80 focused native groups PASS**: name 8, paused autosave 14, durable checkpoint 17, production-autosave recovery 15, transaction safety 8, financial context 14 and preservation chain 4. Its qualification explicitly states that no full registered gate was rerun and that the parent 114/114 evidence remains parent-only.

The 1765465 gesture successor records **13/13 focused gesture checks PASS**. Bounded rendered touch with Drive-Up 5×10 in disposable Free Build state, DPR 2, passed at **375×667** and **390×844**: double-tap zoomed without a plan/order, quick drag panned without a plan/order, and hold produced the placement plan with Confirm. Cash stayed $60,000. Earlier overlong contacts of 340 ms and 508 ms correctly acted as holds; a second tap handled 694 ms after the first correctly did not zoom and did not place because it was outside the 320 ms double-tap window.

The earlier run on 81418a0 remains **108 PASS / 4 FAIL / 1 ERROR / 1 BLOCKED**, with subsequent review-space and recovered floor-context focused passes recorded separately. The later 114/114 run superseded that qualification blocker for its own exact tree; it does not erase or relabel the earlier failed rows. Original older 67/10/18, 94/1 and 95/95 checkpoints remain historical.

These results are not broad rendered-browser, physical Safari, intended-font, VoiceOver, enjoyment, force-kill or broad device-performance certification. The new 375×667 / 390×844 evidence is bounded rendered touch, not a physical-iPhone claim. Retained older physical-iPhone evidence remains bounded to its recorded scenarios. Independent full served-asset comparison and signed-out access remain unverified. Unfamiliar-player comprehension/enjoyment and broader beta/release acceptance remain incomplete and unchanged.

## Hosting and saves

[Existing temporary Stage 4A playtest](https://sst-stage4a-47473de-playtest.rainy-ash-3714.chatgpt.site) remains at the last retained deployment: version 4, game source 284d45a9e80db30b5db69d2694c2dbb7c7ec8284, hosting commit 01d661960583aabbab0800945008fbb6e0dfdbf1. No deployment accompanied the later d155a925 save repair or 1765465 gesture repair. The Site therefore does **not** establish the current integrated runtime behavior.

Project appgprj_6ae44d18da6881918e415a2d6cfdbf18; saved version appgprj_6ae44d18da6881918e415a2d6cfdbf18~appgver_6932b776b7088191a1ee116f9e4b4962; deployment appgdep_6ae4972625e48191b87d349d9a545fb7. Stored archive sha256:eff694f1bf9b42ce0b3237c2fdaa5b4eefa1f95df8d58454e400ddd301e58a6d. Prior versions retained, URL/origin/public audience unchanged. No new deployment query or gameplay run was performed for this records reconciliation. Normal saves were not accessed.

## Separate findings

| Finding | Current boundary |
| --- | --- |
| Single-property custom header name lost after Continue | **FIXED in d155a925 and integrated through 1765465.** Existing company envelope now persists the name with one property. Older saves remain loadable; names already absent from old bare saves cannot be reconstructed. |
| Build-armed double-tap previously failed to zoom | **FIXED in 1765465 and integrated.** 13/13 focused gestures PASS plus bounded 375×667 / 390×844 rendered touch PASS. |
| Stale v62-career-camera-clearance-20261023 build label | Confirmed hardcoded label, not exact commit proof. Unrepaired; packaging/source identity design remains separate. |
| Earlier unexplained $100 difference | PARKED by Eddie, cause unconfirmed. Investigate only if it recurs or Eddie requests. Gate-removal fee is unrelated. |

## Roadmap

The integrated runtime includes financial review protections, representative placeable safety/shared exact-target operations, legacy gate identity, bounded routing/queues/failure rerouting, two functional player-built front gates, safe removal-only gate management, direct Growth details selection, truthful closed/open-property notifications, first-expansion rent-ready wording, single-property custom-name persistence, and the corrected hold-to-build/double-tap/quick-drag interaction model.

Movement, upgrades and administrative closure remain separate. Full lifecycle management for every placeable is incomplete. Broader attachments/surfaces/services/office/building packages, integrated device/accessibility/player validation and long-term balance remain. Side/rear public roads, arbitrary gate counts and staff commuting are not delivered. Other older camera/guidance/request findings retain their source-specific status unless separately reproduced or repaired. No economy retune or roadmap expansion is authorized here. Coastal remains rejected and draft PR #2 excluded.

## Start and recover

Read [overview](PROJECT-OVERVIEW.md), [integration summary](INTEGRATION-SUMMARY.md), [recovery index](RECOVERY-INDEX.md) and [handoff](HANDOFF.md).
The [governing runtime v3 revision 4](https://chatgpt.com/library?file_id=libfile_874372c370748191bfd3dd51d4a2d630&account_id=personal) remains unchanged.
The [October 28 implementation brief](https://chatgpt.com/library?file_id=libfile_36f7082525f081919c3b405983b9841a&account_id=personal) and [repair plan](https://chatgpt.com/library?file_id=libfile_8f3017534d988191bc85d7cf19afa89a&account_id=personal) are planning records, not current completion ledgers or blanket authorization.

Six preceding orientation files remain archived verbatim under history/before-master-promotion-records-20261030/, retaining repository-relative paths. Older history/evidence is untouched. Snapshot relative links retain their original source-file context. No collaborator activity is assumed to be running or completed without delivered evidence.
