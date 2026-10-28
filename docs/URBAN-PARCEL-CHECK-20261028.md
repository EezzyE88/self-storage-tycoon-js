# Tier-3 urban-parcel acquisition check — development 47797b5

October 28, 2026. Documentation-only record. No game code, test, price or economics change. No merge, deployment, normal-save access, spending or acceptance change. Owner acceptance remains pending and release HOLD is unchanged.

## Source identity

- Repository/branch: EezzyE88/self-storage-tycoon-js, development.
- Tested commit: **47797b53536c1aee86288fe6d7b7415ee6e82b49** (parent 7c3af81d1267bd06a499d56f1c10a0a9f84c473a, tree 9bf0f20716fd5cfd270b7f8eae68181d40d4b58b). Refreshed from GitHub before and after the run; master observed unchanged at d03bbcdb7245f379512b0c13041b004742133d83.
- Runtime files were served unchanged from the checkout.

## Method

- Scratch probe `urban-parcel-probe.cjs`, a copy of `tests/browser/transaction-safety.cjs` with the same local server, Chromium + SwiftShader, `isMobile`/`hasTouch` contexts and CDP touch input. The probe was not added to the repository.
- Synthetic setup in fresh disposable browser contexts: Maple Street, tutorial marked done (existing tutorial flags preserved), company tier 3, manual Pause (speed 0).
- Configurations: 375x667 and 390x844, each with (a) **Inter**: Fontshare unreachable in the sandbox, so the system fallback rendered, and (b) **offline intended fonts**: official Satoshi 500/700/900 and General Sans 500/600 WOFF2 served by the handoff font kit's `font-replay.cjs` response replay.

## Results (all four configurations)

| Case | Result |
|---|---|
| Urban parcel offered at tier 3, price $75,000 (unchanged) | PASS |
| Unaffordable ($40,000 cash): row shows "Need $35,000.00 more at this property." | PASS |
| Unaffordable: Review disabled; tapping it opens nothing and changes no state | PASS |
| Unaffordable row: name, description, shortfall, View Financing and Review inside the viewport, no overlap, no clipped text, buttons 44 px tall | PASS |
| View Financing opens Business > Financing with heading on screen; cash, properties, loans and credit unchanged; manual Pause kept | PASS |
| Affordable ($200,000): no shortfall or View Financing; Review enabled; row fits | PASS |
| Review shows Dense urban infill, $75,000 total, $5,000 opening cash, $125,000 remaining; manual Pause kept | PASS |
| Confirm and Back inside the viewport, no overlap or clipping; Confirm not over the offer Review button | PASS |
| Three delivered Confirm touches bought exactly one property: cash −$75,000 once, new property $5,000, manual Pause kept | PASS |
| No page exceptions (final run) | PASS |

25 assertions per configuration, 100/100 true. Raw bounds, state snapshots and rendered-font output are in the evidence `results.json`.

## Confirm burst timing — first attempt UNVERIFIED (retained; superseded by the DPR 1 rerun below)

The probe scheduled three touches 150 ms apart and asserted that three `pointerdown` events arrived. It did **not** check their spacing. Delivered gaps, from the recorded `pointerdown` timestamps:

| Configuration | Delivered gaps |
|---|---|
| Inter, 375x667 | 242 ms / 1,766 ms |
| Inter, 390x844 | 578 ms / 1,133 ms |
| Offline fonts, 375x667 | 988 ms / 1,478 ms |
| Offline fonts, 390x844 | 216 ms / 1,298 ms |

The new 150 ms urban Confirm burst is therefore **UNVERIFIED**. The exactly-once purchase result holds for these delivered spacings only. The cause of the wider gaps is not established. This is not evidence of a game defect. The earlier acquisition/transfer burst passes recorded in the October 28 handoff (blank parcel, two runs at both sizes) are separate evidence and remain as recorded; this check neither reruns nor replaces them.

## Confirm burst timing — DPR 1 rerun PASS

Rerun on development **3d285d3bfe0f0a82e7a16f222961b1556767963c** (runtime identical to 47797b5) after review of the first attempt. Only the scratch probe changed (`urban-burst-probe.cjs`). No game or tracked-test change.

Criteria were written to `CRITERIA.md` at 2026-10-28T14:24:12Z, before any run:

- Target: three touches on the urban Confirm button, 150 ms apart.
- Measure: gaps between consecutive window capture-phase `pointerdown` `event.timeStamp` values (delivered input).
- Tolerance: each gap 150 ± 50 ms (100–200 ms), exactly 3 pointerdowns.
- Gate: three validation bursts on the non-transacting review title (Inter, 375x667). All 6 gaps in tolerance and no state change, or BLOCKED and stop.
- Then one attempt per configuration, no retries. Timing is checked first; a purchase counts only if timing passes.

Declared probe changes: deviceScaleFactor 1, matching `tests/browser/transaction-safety.cjs` (the first attempt used 2); all three touches scheduled from one start time instead of after each previous send completed. That device scale factor 2 caused the first attempt's wide gaps is an **inference**; it was not isolated.

Validation gate: PASS. Gaps 152 / 147, 150 / 149.8, 150.1 / 149.8 ms; game state unchanged.

| Configuration | Delivered gaps | Timing | Purchase | Row |
|---|---|---|---|---|
| Inter, 375x667 | 155.8 / 141.4 ms | PASS | +1 property, cash −$75,000 once, new property $5,000, manual Pause kept | PASS |
| Inter, 390x844 | 151.0 / 151.6 ms | PASS | same | PASS |
| Offline fonts, 375x667 | 150.9 / 149.7 ms | PASS | same | PASS |
| Offline fonts, 390x844 | 147.4 / 152.2 ms | PASS | same | PASS |

No page exceptions. Offline runs loaded Satoshi 500/700/900 and General Sans 500 via the handoff font kit replay. This closes the 150 ms urban Confirm burst gap under emulated touch only; the limits below still apply.

## Fonts

- Inter runs: CDP `CSS.getPlatformFontsForNode` reported Inter Bold for the shortfall amount, View Financing, Review and offer name.
- Offline runs: Satoshi 500/700/900 and General Sans 500 loaded, and every probed node rendered with a custom (downloaded) font, not Inter. The official files carry `false` in their internal name fields, so identifying the face as **Satoshi** rather than General Sans is an **inference** from stack order. This is offline response replay, not proof that Fontshare loads over the network.

## Setup failure retained

The first run raised `Cannot set properties of undefined (setting 'businessOpened')` on View Financing. Cause: the probe replaced the tutorial state without its `flags` object, which real games keep. Only the probe setup was corrected, and its output was retained separately. No game change was made.

## Observation, not changed

The shortfall shows cents ("$35,000.00") while the Review button does not ("$75,000"). This is existing presentation and was left as is.

## Remaining limits

Emulated touch in headless Chromium, not physical iPhone Safari. Synthetic tier-3 setup, not natural progression. Not run: a General Sans-only scenario, cash exactly equal to price, real Fontshare network delivery. Native 104/104 was not rerun because no game code changed. The only storage written was each disposable test context's own autosave on a 127.0.0.1 origin; normal saves were not accessed.

## Evidence

`urban-parcel-check-47797b5.zip`, 10,185,332 bytes, SHA-256 `d73459698f69bede6554653ac67e6449c68d80236995dcf52c0ea762e8c5226f`. It contains the probe script, final `results.json`, 20 screenshots (5 per configuration), the first-run setup-failure output and a README. It was delivered to Eddie as a session attachment and is not committed to this repository. Its README still describes the first attempt's taps as "150 ms apart"; this note is the corrected record.

DPR 1 burst rerun: `urban-burst-timing-3d285d3.zip`, 514,576 bytes, SHA-256 `fedc3e8b52d93d59d27a0cc388a8d06bf3dc426afaf67483fefded627e6b3192`. It contains `CRITERIA.md`, the probe, validation and burst `results.json` files with raw pointerdown timestamps and send offsets, and 5 screenshots. It was delivered as a session attachment and is not committed to this repository.
