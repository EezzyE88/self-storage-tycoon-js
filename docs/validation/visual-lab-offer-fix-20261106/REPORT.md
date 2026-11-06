# Optional-lesson obstruction fix — local successor, November 6, 2026

The reviewed optional-lesson offer obstruction is fixed locally, including the related active-lesson Details obstruction observed during screenshot verification. No push, PR update, merge, deployment, spending or acceptance change was performed.

Parent: exact reviewed commit `7f5f349c4f5ac9f9d9bf0041beffaa83de12f28c`, tree `b751f48caccb9e05b47ecf5b1c8cb1dff9a3a868`. Separate branch/worktree: `visual-lab-offer-fix`, `/workspace/sst-lab-offer-fix`. Original `06504fd1d00327f6b7e9572dd6646e770e4b539e` and parent checkouts/evidence remain intact. Final successor commit/tree and verified bundle are recorded in `/workspace/SST_VISUAL_LAB_OFFER_FIX_RECOVERY.md` to avoid a self-referential commit identity.

## Production change

Only `js/visual-lab.js` changes. The Lab yields to optional teaching UI when the existing UI pause controller has the `lessonOffer` blocker, or when an optional lesson is active. The controller already decides when an offer is actually displayed; merely pending offers held behind another UI are not new blockers. Palette selection and collapsed/expanded state remain unchanged while the Lab is hidden, and return after dismissal or lesson end.

This also prevents the Lab from covering the active lesson's Details control after Start. That overlap was visible in the first offer-only pass and was resolved before final qualification. Existing Photo-mode hiding, read-only phase labels, visible-visitor priority and exact material restoration remain in place.

Simulation, economy, tutorial, save, audio/FX, renderer, main loop and CSS files are byte-identical to the exact parent. No new persistence, state schema, simulator action, timer or global listener was introduced. The fix reads UI/simulation state only to control the Lab's own visibility.

## Targeted tests

`tests/headless/tvisual_lab_review.mjs` now contains five groups, adding displayed/held-offer and active-lesson visibility with unchanged complete state/palette and retained expansion state. The runner manifest requires five PASS markers and the updated exact completion line. The new offer regression fails against the unchanged parent as expected (`parent-regression.txt`), after the parent's earlier four groups pass.

The browser test remains on the normal production RAF loop. It never manually advances simulation, calls renderer frames or invokes the Lab update. Actual touchscreen input is sent at verified hit-test coordinates, followed by production state-change assertions.

Fresh final browser coverage at **375×667 and 390×844**, DPR2/touch emulation:

- **16 offer cases:** 2 viewports × collapsed/expanded Lab × Start/Dismiss × prior Pause/1x. Both controls' centers are hit-tested; the chosen control receives a touchscreen tap. Dismiss clears the offer and records the normal seen marker; Start clears the offer and starts the actual interior lesson. Both restore the exact prior speed, including manual Pause. Palette and Lab expansion state survive.
- **8 started-lesson paths:** after verifying the Start result, the test explicitly chooses manual Pause for navigation, touches Details, then touches End Lesson. The Lab stays hidden during collapsed/expanded teaching, and returns with the same palette/expansion after End. Manual Pause is preserved.
- Existing active-tutorial, run/Pause, modal/tab/tool, Photo mode, keyboard and normal-loop checks still pass. Both lens-slider/shutter centers are accessible in Photo mode. The lens test now requires a value change from the pre-touch value before matching the production lens value; an undelivered touch cannot satisfy that assertion by leaving both values unchanged.

The offer setup is explicitly synthetic: a disposable completed Maple tutorial on day 4 with a pending interior lesson. It uses tutorial mode (required by production `lessonAllowed`), validates eligibility, establishes and checks the prior speed before presenting the offer, and checks the remembered resume speed. Setup uses 7:01 AM to avoid the hourly auto-offer poll during attachment, and ages only UI notification-delay bookkeeping to render the offer immediately. Production Start/End behavior, including lesson-enter scheduling, is exercised normally. This does not establish natural tutorial progression, physical touch behavior or a real company save session.

Raw results: `normal-raf.json` records every offer case, target coordinates, delivered state and lesson navigation; `browser.txt` records final success. Twelve final PNGs show expanded tutorial, Photo controls, unblocked offer, delivered Dismiss and started lesson at both sizes. Screenshots were visually inspected. No page or caught game-loop errors occurred.

## Focused verification

PASS — eight focused native test files, zero failures (`native.txt`):

```sh
node --test tests/headless/tvisual_lab.mjs tests/headless/tvisual_lab_integration.mjs tests/headless/tvisual_lab_review.mjs tests/headless/tpause_policy.mjs tests/headless/tpaused_autosave.mjs tests/headless/tworking_yard_save.mjs tests/headless/tstartup_graphics.mjs tests/headless/topenhouse.mjs
node tests/browser-qa/visual-lab-review.cjs /workspace/sst-offer-fix-evidence
```

Native coverage retains 2,000-minute state/event parity, shared-material restoration/rebuild, Pause policy, paused autosave and repeated raw/compressed save round trips. PASS — all three Lab native registrations through the existing runner assessment; the changed five-group registration was reassessed on final native source (`runner-results.json`). PASS — `git diff --check`, protected-source equality, preserved-archive hashes and independent recovery checks recorded in the companion note.

Remaining failures in executed final successor checks: **none**. Expected parent failure is a red-before-green proof, not a successor failure. Full release gate, physical iPhone/Safari, real-device GPU/FPS/thermal qualification, audio listening qualification and novice/player acceptance remain not run. Browser testing uses Chromium software WebGL, low graphics quality to bound rendering, fallback fonts and disposable intercepted origins. It does not alter acceptance or qualify a release.

## Retained setup/driver failures

Initial timeouts were traced to an invalid sandbox-mode fixture: non-generic interior lessons require completed Maple tutorial mode. A subsequent resume-speed assertion exposed an automatic offer created during fixture attachment on an hourly boundary, before the requested prior speed was established. Eligibility, pre-offer speed and remembered-speed guards were added, and the fixture moved off the hourly boundary. No production lesson/clock behavior or expected result was changed. Diagnostic logs/states/screenshots are retained under `invalid-fixture*`, `premature-offer-fixture*` and `browser-*.txt`.

The first offer-only pass correctly delivered Start/Dismiss, but its screenshot exposed the active lesson Details collision. The production fix and tests were extended to cover that teaching state. A later Details test encountered a detached DOM element during an ordinary tutorial repaint; the driver now waits for normal frames after choosing Pause and measures the current control synchronously before actual touch. Delivery/state assertions remain mandatory. The corresponding failure is retained in `browser-dom-repaint.txt` and `dom-repaint-state.json`.

The interrupted tool call made no source correction or test launch; continuation inspected the retained state, applied the pending correction and resumed. No unchanged successful suite was restarted merely because the user resumed the task.

## Preservation and next action

Existing candidate checkouts, reports, review reproductions, fresh focused evidence and recovery bundles remain unchanged. New scripts and essential logs/screenshots/manifests are committed with this successor; earlier trial artifacts also remain separately under `/workspace/sst-offer-fix-evidence`. Original runtime/history/fixtures are recoverable through the new complete-history bundle and its ancestors.

Recommended next action: review this exact local successor, then separately authorize any push/PR update. The known obstruction is resolved for the executed cases. This recommendation grants no push, merge, deployment or acceptance authority; draft PR #32 was not updated by this work.
