# Integration summary — October 30, 2026

## Completed integration

The earlier master promotion to 4ed4a282fa9debe591fa823010be8511a6bcd816 remains part of retained history. Subsequent authorized integration advanced master and development through d155a92590a938005b00c16ec52d92b812205736 to exact runtime checkpoint **1765465b6b4ec7fafbf636919da19b1ae1f944cd**, tree **74129ffa4906aad471da9398901cdaee1c1c2be0**, sole parent **d155a92590a938005b00c16ec52d92b812205736**. Immediately before this documentation-only reconciliation, both remote master and development were verified at 1765465. No deployment, spending or acceptance change accompanied those integrations.

d155a925 fixes single-property custom-name persistence by using the existing company save envelope whenever a company has at least one property. Older saves remain loadable; multi-property serialization is unchanged; names already absent from old bare saves cannot be reconstructed. 1765465 adds the bounded hold-to-build/double-tap repair: Build-armed short taps can participate in double-tap zoom without selecting or placing, the touch/pen hold threshold remains 240 ms, and movement over 7 px before the hold converts to pan. The player-facing guidance now matches that behavior.

## Original-to-preserved identities

| Work | Original local | Equivalent GitHub |
| --- | --- | --- |
| Growth | 22c4873 | 0dd93cb |
| Opening notification | 5c4e303 | f5c88fa |
| Milestone copy | 2c6980f | fff6294 |
| Gate removal | 7bc8ab2 | 284d45a |
| Records reconciliation | 6eeb44a | e81b66e |
| Records wording | dc9ded6 | 10238f0 |
| Normalization repair | 81418a0 | 92b5d93 |
| Showcase normalization | 0b9ae39 | 3f417d7 |
| Native qualification contracts | a530cd3 | 4ed4a28 |
| Single-property name persistence | — | d155a925 |
| Hold-build/double-tap repair | — | 1765465 |

Exact historical trees and corresponding parent chains remain retained. Original objects and evidence remain in complete recovery archives; see [index](RECOVERY-INDEX.md).

## Verification and qualification

The registered CURRENT native gate ran once on original a530cd3fc6e28692e21a29d8b5991270eae8601f, exact tree 13f6810cf91e392457ff63b036ee51d89ba856a6: **114/114 PASS**, zero failures/errors/blocked/timeouts/not-run. GitHub equivalent 4ed4a282fa9debe591fa823010be8511a6bcd816 has the identical tree and sole parent 3f417d717de2b6056048acc90aea52875bf167db. That result is retained as exact-tree parent qualification and is not relabeled as a run on d155a925 or 1765465.

d155a925 records **80 focused native groups PASS**: name 8, paused autosave 14, durable checkpoint 17, production-autosave recovery 15, transaction safety 8, financial context 14 and preservation chain 4. Its own record explicitly says no full registered gate was rerun and the 114/114 evidence remains parent-only.

1765465 records **13/13 focused gesture checks PASS**. Bounded rendered touch at **375×667** and **390×844**, DPR 2, confirmed: double-tap zooms while Build is armed without creating a plan/order, quick drag pans without creating a plan/order, and hold produces the placement plan with Confirm. Cash stayed $60,000. Earlier contacts lasting 340 ms and 508 ms correctly crossed the 240 ms hold threshold; a second tap handled 694 ms after the first correctly stayed outside the 320 ms double-tap window and did not place.

The earlier run on 81418a0 remains **108 PASS / 4 FAIL / 1 ERROR / 1 BLOCKED**, with subsequent focused passes recorded separately. Original older 67/10/18, 94/1 and 95/95 checkpoints remain historical. No failure was waived or silently relabeled.

These results are not broad physical-Safari, intended-font, VoiceOver, enjoyment, force-kill or broad device-performance certification. The new phone-size evidence is bounded rendered touch, not a physical-iPhone claim. Independent full served-asset comparison and signed-out access remain unverified. Unfamiliar-player comprehension/enjoyment and broader beta/release acceptance remain incomplete and unchanged.

## Deployment and remaining work

[Existing temporary Stage 4A playtest](https://sst-stage4a-47473de-playtest.rainy-ash-3714.chatgpt.site) remains at the last retained deployment: version 4, game source 284d45a9e80db30b5db69d2694c2dbb7c7ec8284, hosting commit 01d661960583aabbab0800945008fbb6e0dfdbf1. No deployment followed d155a925 or 1765465. The Site therefore does not contain the current integrated runtime.

Project appgprj_6ae44d18da6881918e415a2d6cfdbf18; saved version appgprj_6ae44d18da6881918e415a2d6cfdbf18~appgver_6932b776b7088191a1ee116f9e4b4962; deployment appgdep_6ae4972625e48191b87d349d9a545fb7. Stored archive sha256:eff694f1bf9b42ce0b3237c2fdaa5b4eefa1f95df8d58454e400ddd301e58a6d. Prior versions retained, URL/origin/public audience unchanged. No new Site query or gameplay run was performed for this records reconciliation. Normal saves were not accessed.

| Finding | Current boundary |
| --- | --- |
| Single-property custom header name lost after Continue | **FIXED in d155a925 and integrated through 1765465.** Older saves remain loadable; names already absent from old bare saves cannot be reconstructed. |
| Build-armed double-tap previously failed to zoom | **FIXED in 1765465 and integrated.** 13/13 focused gesture checks PASS plus bounded 375×667 / 390×844 rendered touch PASS. |
| Stale v62-career-camera-clearance-20261023 build label | Confirmed hardcoded label, not exact commit proof. Unrepaired; packaging/source identity design remains separate. |
| Earlier unexplained $100 difference | PARKED by Eddie, cause unconfirmed. Investigate only if it recurs or Eddie requests. Gate-removal fee is unrelated. |

Runtime integration through 1765465 is complete, not broad release acceptance. Historical borrowing/payback decisions, prior failures and original qualification evidence remain intact. See the [previous summary](history/before-master-promotion-records-20261030/docs/INTEGRATION-SUMMARY.md) for earlier integration history.
