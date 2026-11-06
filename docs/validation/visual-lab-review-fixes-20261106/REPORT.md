# PR #32 review fixes — isolated successor, November 6, 2026

Both reported P2 defects are fixed locally. This is a technically verified successor for review, not an acceptance or release decision. No push, merge, deployment, spending, external message or PR change was performed.

## Source and fixes

Parent: exact reviewed candidate `06504fd1d00327f6b7e9572dd6646e770e4b539e`, tree `9c41eaee313781f79163365d2c7062c84cba278a`. Separate local branch: `visual-lab-review-fixes` in `/workspace/sst-lab-fixes`. Original checkout, branch, committed evidence, separate focused evidence, original review reproductions and original recovery bundle are preserved. The final successor commit/tree and independently verified new bundle are recorded in `/workspace/SST_VISUAL_LAB_REVIEW_FIXES_RECOVERY.md` to avoid self-referential commit identities.

Only `js/visual-lab.js` changes in production:

- Hide the control while `game.showcase.photo` is active. The palette remains selected while hidden; leaving Photo mode restores the previous collapsed/expanded control state. Existing lens/shutter controls retain their input area.
- Remove the unsupported `hidden → inside unit` text inference. Status retains the actual customer phase and Pause indicator. No artificial customer location is invented.
- Prefer a visible walking/at-unit customer over an earlier hidden arrival, then another visible visitor, then the existing fallback. This selection remains read-only.

Added `tests/headless/tvisual_lab_review.mjs` (four targeted groups), `tests/browser-qa/visual-lab-review.cjs` (normal-RAF browser smoke), and the native regression manifest entry. While validating registration, corrected the two earlier Lab completion patterns to match their actual complete terminal lines: the repository runner uses `re.fullmatch`, so the original prefix-only patterns would reject otherwise successful output. No test assertion or protected-source requirement was removed or weakened.

All other production files, including `main.js`, CSS, simulation/economy, tutorial, renderer, audio/FX and save modules, match the original reviewed candidate. Original-candidate protections are retained; no new setting, state schema, save write or simulator action is introduced by the fixes.

## Verification

PASS — eight focused native test files, zero failures (`native.txt`):

```sh
node --test tests/headless/tvisual_lab.mjs tests/headless/tvisual_lab_integration.mjs tests/headless/tvisual_lab_review.mjs tests/headless/tpause_policy.mjs tests/headless/tpaused_autosave.mjs tests/headless/tworking_yard_save.mjs tests/headless/tstartup_graphics.mjs tests/headless/topenhouse.mjs
```

Includes all seven earlier native checks, 2,000-minute state/event parity with repeated toggling, exact material restoration, save round trips, manual Pause policy and paused autosave. New cases cover an actual naturally scheduled hidden arrival, explicit hidden office/restroom/departure fixtures, multiple-customer visible-visit preference, and collapsed/expanded Photo-mode hiding with palette and complete state preserved.

Expected FAIL on the original candidate — the new status regression reproduces `Live customer 85 · arrive · inside unit · paused`; the new Photo-mode assertion observes `hidden === false`. These are retained red-before-green proofs in `baseline-native.txt` and `baseline-photo-native.txt`, not remaining successor failures. The baseline execution used temporary import-path copies of the new test outside both source checkouts. No original source was changed.

PASS — all three Lab native entries through the existing runner's actual `assess()` method, including terminal-line and minimum-check-marker requirements (`runner-results.json` and `runner-*.txt`). This was a focused registration check, not the full release gate.

PASS — bounded normal production RAF browser run at 375×667 and 390×844, DPR2/touch emulation (`normal-raf.txt`, `normal-raf.json`, six PNGs):

```sh
node tests/browser-qa/visual-lab-review.cjs /workspace/sst-review-fix-evidence
```

This harness does not override `requestAnimationFrame`, hold QA time, step simulation, call renderer frames or manually call the Lab update. It wraps only the Lab's public update reference to count deliveries from `main.tick`. The original production event closures remain unchanged. Real game startup and the actual Maple Street title button create a disposable company with tutorial enabled. The normal loop delivers over 50 Lab updates per viewport during the bounded sequence.

Verified active tutorial expanded/collapsed visibility, normal clock advancement after 1x, clock stability after manual Pause across multiple subsequent frames, modal/tab hiding and restoration, touch/keyboard switching, and Photo mode entered from both collapsed and expanded Lab states. In Photo mode the Lab is hidden and `elementFromPoint` reaches the centers of both lens sliders and the shutter. A real touch is sent to the focus slider and its displayed value is checked against the production lens value. Screenshots visually confirm that the Lab no longer covers the lens/shutter and does not cover the expanded tutorial. Leaving Photo mode restores the prior Lab expansion state.

A separate final disposable setup uses the production Skip Tutorial action solely to unlock the aisle build tool. Selecting/cancelling that tool hides/restores the Lab via normal frames, places no orders, advances no clock and preserves Pause. The active-tutorial result is recorded before this disclosed tool-unlock fixture. Production UI methods are used for controlled transitions; this is a bounded integration smoke test, not a complete player journey or physical gesture qualification. Zero page errors or caught game-loop errors were observed.

The first browser pass omitted the tool check; its successful log is retained as `normal-raf-before-tool-check.txt`. The final log includes the tool check. No failed successor browser run occurred.

PASS — protected source equality, `git diff --check`, original bundle and fresh-evidence archive checksums unchanged. Original archived A/B captures and prior independent remote clone proof remain historical evidence for the exact parent; they were not relabeled as successor captures. This successor did not alter palette/material lifecycle/geometry. Fresh successor native tests cover restoration and the normal-frame browser covers current toggling and the fixes.

## Limits and next action

Remaining failures in executed successor checks: **none**. Full release gate, physical iPhone/Safari, real-device GPU/FPS/thermal behavior, audio listening qualification and novice acceptance remain not run. New browser evidence uses Chromium software WebGL, low graphics quality to bound software rendering, fallback fonts and disposable intercepted origins. No physical Safari or performance claim is made. Economy/save/audio preservation is supported by unchanged source and relevant tests, not complete-game release qualification.

The new scripts and captured evidence are committed with the successor. The new complete-history bundle contains this successor plus the exact original candidate, earlier committed evidence, original runtime and fixtures. The original separate focused-evidence ZIP and original recovery bundle remain unchanged beside it. See the companion recovery note for hashes, recovery commands and independent empty-checkout verification.

Recommended next action: separately authorize pushing the exact successor to update the review branch/PR after reviewing these fixes. Recommendation grants no push, merge, deployment or acceptance authority; PR #32 remains at its original exact head until separately authorized.
