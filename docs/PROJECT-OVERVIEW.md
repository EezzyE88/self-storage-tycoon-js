# Project overview — current direction (November 9, 2026)

**End goal:** an understandable, satisfying iPhone-first self-storage tycoon game where layout, leasing, operations, finances and multi-property growth form a coherent loop. Preserve player-controlled time, save integrity and established behavior.

**Newest source:** master `2f8b377e4a81361b7652f90a2b1373514a3f2ff6`, tree `57fdb0172cabdbfa65a7bb7719d089a377b9fd2f`.
- [Pages #28](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42656665611) ran **139/139** on that SHA and deployed.
- The live build stamp matched it on November 9.
- This is technical qualification, **not** player acceptance.
- Since November 5 the game gained:
  - camera restore after save and reload, plus label fixes (PR #33)
  - checkpointed chapter pauses (PR #34)
  - paired Pause cues and lesson-tool handoffs (PR #35)
  - IFM-01A elevator access feedback (PR #37)
  - an authorized advertising rebalance (PR #38, the only economy change)
  - investment-guidance explanations (PR #39, presentation only)
  - AG-01 Rev 1 operating-facility acquisition guidance (PR #40, presentation only)

**Immediate priority:** physical iPhone qualification of the six never-device-tested cases listed in [Current Status](CURRENT-STATUS.md). Owner-reported iPhone passes for AG-01 Rev 1, IFM-01A and the chapter-pause checkpoint are retained but not independently verified. After that comes bounded player feedback on financial clarity, enjoyment and stopping points.

**Planned next content:** Unit 7 Rev 1 (Act IV "Grow") is planning only. The decisions are D3 Option 2 (Beat 15 anchored to a real quote; financing availability is not the same as worthwhile), P1 inspection-only (no loan Confirm, no debt) and Beat 14 S2 returned-payment design direction. It is not implemented in master and not accepted.

**Deferred/protected:**
- Master Blueprint Option B and AM-01 Draft 0.2 remain accepted. OT-01 is a planning HOLD. AG-01 D1 is unresolved.
- HUD cash-today clarity remains a separate possible unit. The $100 observation stays PARKED.
- The Version 1.0 roadmap is unchanged. The governing runtime is SST Project Runtime v3 revision 6 (adopted by Eddie November 14, 2026; supersedes revision 5, which is retained as historical evidence; the runtime text is kept in the project files governance/ folder, not in this repository).
- Preserve the accepted construction, the economy outside the authorized PR #38 change, Pause, save compatibility, user-controlled timing and the $0 budget.
- No beta/release acceptance is inferred.

**Historical boundary:** the November 5 and October 30 overviews remain below unchanged. Their dates, baselines and priorities are not the current baseline.

---

## Preserved November 5 orientation record (historical; verbatim)

# Project overview — current direction (November 5, 2026)

**End goal:** an understandable, satisfying iPhone-first self-storage tycoon game where layout, leasing, operations, finances and multi-property growth form a coherent loop. Players should be able to explain why units are vacant, why cash changes, and whether investments are beginning to work. Preserve player-controlled time, save integrity and established behavior.

**Newest source:** verified master `d7f49903076fd6bb3a70189b7e6efb9a7c0d9db9`; tree `04a0d67232b375a699c905e20186f4cc5d9a284e`. The [PR #30](https://github.com/EezzyE88/self-storage-tycoon-js/pull/30) Investment Progress explanation merged into master. [Pages #20](https://github.com/EezzyE88/self-storage-tycoon-js/actions/runs/42127848496) ran 132/132 PASS on that merge SHA and deployed. This is technical qualification, **not** player acceptance. Live stamp, physical iPhone and first-time-player comprehension remain open.

**Immediate priority:** verify the live build identity and financial explanations in the four intended screens; get bounded player feedback on financial clarity, enjoyment and stopping points. Triage actual defects rather than reopening simulation balance without evidence.

**Deferred/protected:** HUD cash-today clarity is a separate possible unit. Longer-term optional Advanced Financial Insights and the unapproved 20-page economy/progression proposal do not replace the accepted Maple Street five-act tutorial or authorize new financial systems. Preserve the accepted construction, economy, Pause, save compatibility, user-controlled timing and $0 budget. No beta/release acceptance is inferred.

**Historical boundary:** original October 30 overview remains below unchanged for historical source/evidence context. Dates and statuses in that section are not the current baseline.

---

## Preserved October 30 orientation record (historical; verbatim)

# Project overview and finish target

Reconciled October 30, 2026, America/Los_Angeles. [Current status](CURRENT-STATUS.md) supplies exact evidence and limits.

## Goal

A satisfying iPhone Safari self-storage ownership game: build useful capacity, understand costs/customers, delegate routine work and invest for visible payoff. Preserve manual Pause/1x/2x/4x, trustworthy finance and saves. Automatic unit readiness/opening remains separate from the player's decision to open a property.

## Current checkpoint

Exact integrated runtime checkpoint: **1765465b6b4ec7fafbf636919da19b1ae1f944cd**, tree **74129ffa4906aad471da9398901cdaee1c1c2be0**, sole parent **d155a92590a938005b00c16ec52d92b812205736**. Immediately before this documentation-only reconciliation, master and development were verified together at that source.

Qualification is intentionally proportional and source-specific. The older complete registered native gate passed **114/114** on tree **13f6810cf91e392457ff63b036ee51d89ba856a6** and remains historical parent qualification, not a run on the current runtime. d155a925 has **80 focused native groups PASS** for the single-property custom-name save repair and preserved save/transaction behavior. 1765465 has **13/13 focused gesture checks PASS** plus bounded rendered touch PASS at **375×667** and **390×844** for hold-to-place, double-tap zoom without placement and quick-drag pan. Integration is complete; broader beta/release acceptance remains HOLD.

The foundation includes scenarios/Sandbox, construction/four-way placement, multi-floor facilities, leasing/billing, finance/reserves/investment guidance, staff/Owner work, restoration, career/portfolio and local save/Continue/recovery. Newer integrated work includes reviewed finance, representative placeable safety, bounded gate migration/routing/failure handling, two front gates and removal-only management, Growth direct details, truthful readiness notifications, single-property custom-name persistence, and the corrected Build-armed hold/double-tap/pan interaction model. This is not blanket certification of every subsystem.

## Remaining roadmap and decision

| Area | Remaining scope |
| --- | --- |
| Gate lifecycle | Movement, upgrades and administrative closure remain separate |
| Broader placeables | Attachments, surfaces, services and office/building packages require bounded inventories/design decisions |
| Phone usability | The hold-to-build/double-tap conflict is fixed; other older camera, guidance, overlay and request findings retain their own source-specific status |
| Product qualification | Integrated device/accessibility, novice comprehension/enjoyment, sustained performance and long-term balance remain |

The single-property custom-name loss is no longer an open defect; it is fixed in d155a925 and integrated through 1765465, with the limitation that names already absent from old bare saves cannot be reconstructed. The stale build-label finding remains open. The $100 observation stays parked. Next work should be one bounded task selected from the retained roadmap or still-open findings, not another rerun of settled gesture/save checks. No next feature or deployment is authorized by this record.

Current evidence is not broad physical-Safari, intended-font, VoiceOver, enjoyment, force-kill or broad device-performance certification. The new 375×667 / 390×844 evidence is bounded rendered touch, not a physical-iPhone claim. Independent full served-asset comparison and signed-out access remain unverified. Unfamiliar-player comprehension/enjoyment and broader beta/release acceptance remain incomplete and unchanged.

## Finish target and exclusions

Clear beginning, understandable operating choices, comfortable placement/navigation, trustworthy finance/Pause/saves, visible investment benefit and satisfying sustained iPhone play. No launch date, completion percentage or general-release certification is established. Eddie enjoys building/expanding and visible payoff; extended waiting drags. Preserve that feedback without inventing an economy requirement. Coastal remains rejected, draft PR #2 excluded; deferred flood/rival/insurance/auction/expansion goals are neither resumed nor erased.

See [handoff](HANDOFF.md), [integration summary](INTEGRATION-SUMMARY.md), [recovery](RECOVERY-INDEX.md), and unchanged [implementation brief](https://chatgpt.com/library?file_id=libfile_36f7082525f081919c3b405983b9841a&account_id=personal) / [repair plan](https://chatgpt.com/library?file_id=libfile_8f3017534d988191bc85d7cf19afa89a&account_id=personal). Plans are not blanket authorization. Prior overview is [archived verbatim](history/before-master-promotion-records-20261030/docs/PROJECT-OVERVIEW.md).
