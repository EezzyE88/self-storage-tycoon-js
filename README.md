# Self Storage Tycoon

An iPhone-first JavaScript/Three.js self-storage management game. This section is the current orientation, reconciled November 9, 2026 (America/Los_Angeles) against exact master `2f8b377`. The November 5 and October 30 orientation records are retained unchanged below as history.

## Current source, testing and hosting

- **Active repository:** [EezzyE88/self-storage-tycoon-js](https://github.com/EezzyE88/self-storage-tycoon-js). **Active integration branch:** `master`, which is also the default branch.
- **Current master:** `2f8b377e4a81361b7652f90a2b1373514a3f2ff6` (`2f8b377`), tree `57fdb0172cabdbfa65a7bb7719d089a377b9fd2f`, sole parent `f1ebd1e`. This is the [PR #40](https://github.com/EezzyE88/self-storage-tycoon-js/pull/40) squash of the owner-accepted AG-01 Rev 1 candidate `7a98e3d`, which has the same tree. It was pushed November 9, 8:37 AM Pacific.
- **Regression gate:** [Pages run #28](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42656665611) ran the current native gate on the exact commit. The log reads **139 PASS**, 0 FAIL, 0 ERROR, 0 BLOCKED, 0 TIMEOUT, 0 OBSERVATION and 0 NOT_RUN. The deploy job succeeded.
- **Live deployment:** the [Pages site](https://eezzye88.github.io/self-storage-tycoon-js/) serves `js/build-stamp.js` with sha `2f8b377e4a81361b7652f90a2b1373514a3f2ff6`. That stamp was fetched directly on November 9. The AG-01 merge record also reports 56/56 served files byte-identical to a local build of `2f8b377`, and a "Build 2f8b377" title label in Chromium emulation.
- **Since the November 5 checkpoint:** seven gameplay PRs integrated: #33, #34, #35, #37, #38, #39 and #40. The only economy change is the authorized PR #38 advertising rebalance in `js/sim.js`. The PR #39 changes to `js/economics.js` are presentation only. See [Current Status](docs/CURRENT-STATUS.md) for the per-PR record.
- **Physical iPhone Safari:** owner-reported results exist for AG-01 Rev 1, IFM-01A and the chapter-pause checkpoint. Claude has not independently verified any of them. Six physical-device cases remain unrun and are listed in [Current Status](docs/CURRENT-STATUS.md). Emulation is not physical Safari evidence.
- **Governing policy:** SST Project Runtime v3 revision 6 (adopted by Eddie November 14, 2026; supersedes revision 5, which is retained as historical evidence; the runtime text is kept in the project files governance/ folder, not in this repository). Master Blueprint Option B and AM-01 Draft 0.2 remain accepted. AG-01 D1 is unresolved. OT-01 and every other HOLD are unchanged. Beta/release acceptance remains HOLD. The budget is $0.

## Current navigation

[Status](docs/CURRENT-STATUS.md) · [Handoff](docs/HANDOFF.md) · [Overview](docs/PROJECT-OVERVIEW.md) · [Integration](docs/INTEGRATION-SUMMARY.md) · [Recovery](docs/RECOVERY-INDEX.md) · [Earlier Pages evidence](docs/releases/PAGES-PR30-20261105.md).

---

## Preserved November 5 orientation record (historical; verbatim)

# Self Storage Tycoon

An iPhone-first JavaScript/Three.js self-storage management game. This section is the current orientation, verified November 5, 2026. The historical October 30 README is retained unchanged below.

## Current source, testing and hosting

- **Active repository:** [EezzyE88/self-storage-tycoon-js](https://github.com/EezzyE88/self-storage-tycoon-js).
- **Verified gameplay master:** `d7f49903076fd6bb3a70189b7e6efb9a7c0d9db9` (`d7f4990`), source tree `04a0d67232b375a699c905e20186f4cc5d9a284e`. This is the [merged PR #30](https://github.com/EezzyE88/self-storage-tycoon-js/pull/30) checkpoint, whose parents are `b483fc6` and `72a779e`.
- **Financial Comprehension:** read-only Investment Progress added to Act II, Act III, graduation and Business. It explains added units, leased/vacant count and contracted rent. It does not change the underlying economy or save model.
- **GitHub Pages:** [run #20](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42127848496), ID `42127848496`, passed its exact-commit native gate **132/132** and deployment job. [Pages URL](https://eezzye88.github.io/self-storage-tycoon-js/). Live rendered build stamp has *not* been independently verified; expected stamp is `d7f4990`.
- **Earlier candidate qualification:** reported 9/9 focused, saved-state parity and rendered Chromium checks at 390×844 and 375×667. These are not physical iPhone results.
- **Still outstanding:** physical iPhone Safari checks of the four financial explanation placements, live build stamp, novice-player comprehension and enjoyment, broader beta/release qualification.
- **Governing policy:** SST Project Runtime v3 revision 5, unchanged. Historical evidence and current saves, manual Pause, economy, and $0 budget remain protected. No acceptance decision resulted from PR #30.

## Current navigation

[Status](docs/CURRENT-STATUS.md) · [Handoff](docs/HANDOFF.md) · [Overview](docs/PROJECT-OVERVIEW.md) · [Integration](docs/INTEGRATION-SUMMARY.md) · [Recovery](docs/RECOVERY-INDEX.md) · [Pages evidence](docs/releases/PAGES-PR30-20261105.md).

---

## Preserved October 30 orientation record (historical; verbatim)

# Self Storage Tycoon

An iPhone Safari game about operating and growing a self-storage business. Build useful capacity, understand costs/customers, delegate work and invest for visible payoff.

## Start here

- [Current status](docs/CURRENT-STATUS.md): exact identities, evidence, hosting and findings.
- [Handoff](docs/HANDOFF.md): continuation instructions and boundaries.
- [Overview](docs/PROJECT-OVERVIEW.md): goal, remaining roadmap and finish target.
- [Integration summary](docs/INTEGRATION-SUMMARY.md): promotion history and original/preserved identities.
- [Recovery index](docs/RECOVERY-INDEX.md): complete recovery and historical evidence.

## Current checkpoint

On October 30, 2026, master and development were verified together at integrated runtime source **1765465b6b4ec7fafbf636919da19b1ae1f944cd**, exact tree **74129ffa4906aad471da9398901cdaee1c1c2be0**, sole parent **d155a92590a938005b00c16ec52d92b812205736**. The one-commit gesture repair changes only `js/main.js`, `js/ui.js` and `tests/headless/tgestures.mjs` relative to d155a925.

Qualification remains proportional and source-specific: the older registered CURRENT native gate is **114/114 PASS** on tree **13f6810cf91e392457ff63b036ee51d89ba856a6** and is retained as historical parent qualification, not relabeled as a run on 1765465. The d155a925 save successor has **80 focused native groups PASS**; the integrated gesture repair has **13/13 focused gesture checks PASS** plus bounded rendered touch PASS at **375×667** and **390×844** for hold-to-place, double-tap zoom without placement and quick-drag pan.

The single-property custom-name persistence defect is fixed in d155a925 using the existing company save envelope for one-property companies; older saves remain loadable and multi-property serialization is unchanged. Names already absent from old bare saves cannot be reconstructed. Broader beta/release acceptance remains HOLD. The stale build-label finding remains open and the unexplained $100 observation stays PARKED.

## Playtest and development

[Existing temporary Stage 4A playtest](https://sst-stage4a-47473de-playtest.rainy-ash-3714.chatgpt.site) remains version 4/game source 284d45a. No deployment accompanied the later save or gesture integrations, so that Site does not contain integrated runtime source 1765465.

Static ES modules with vendored Three.js; serve over HTTP, no compilation required. Checks live under tests/headless/ and retained browser evidence under docs/qa/ and docs/releases/. Use isolated successors and verify live refs before consequential actions. Preserve gameplay, economy, manual Pause, normal saves, historical evidence and governing runtime. Source bundles do not back up current company saves.

Prior README and five orientation documents are preserved verbatim under docs/history/before-master-promotion-records-20261030/ with original repository-relative paths. This reconciliation changes documentation only; deployment and acceptance remain unchanged.
