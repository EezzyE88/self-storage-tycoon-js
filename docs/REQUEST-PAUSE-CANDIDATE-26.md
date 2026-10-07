# Candidate 26 pause control inside owner decisions

Base: Candidate 25 `7a417c008fa7e30202cde7fa65763b0ae6911484`.
Branch: `candidate/request-pause-control-20261007`.
Build: `bplus-request-pause-candidate-26`.
Preserved master: `055d2a871945c565c3affbda89ecd46be7a4cfac`.

The Candidate 25 emulation report found that the decision window covered the external speed controls. Its pause logic passed via Space, but the phone could not tap Pause while answering a decision.

## Change

The owner-decision window now includes a full-width Keep paused after answering button inside its existing sticky header. It has a minimum 44-pixel height and an explicit aria-pressed state. Selecting it invokes the existing requestSpeed(0) path and redraws its label as Will stay paused after answering. Repeated taps are idempotent.

Answering the final decision still dismisses the window automatically. Without selecting Keep paused, the previous speed returns. Selecting it keeps the clock paused. A decision opened from an existing manual Pause already shows the stay-paused state. The control does not appear in the explicit settings/history window, and stale events after dismissal are ignored.

No simulation, economy, save schema, staff preference, staff eligibility, or response action changed. The pause choice is transient UI intent through the existing pause mechanism, rather than a new persistent delegation preference. The player's actual speed remains ordinary saved simulation state.

## Verification and limits

- 45 focused request checks pass, covering both resume outcomes at 1x, 2x, and 4x; existing manual Pause; multiple decisions; repeated taps; X closure; nested pauses; unchanged saved staff mode; and a subsequent decision after an explicit return to 4x.
- 28 Candidate 22 regressions, 21 property UI checks, 13 pause-policy checks, and 8 menu/touch checks pass: 115 checks across five scripts.
- UI syntax and git diff whitespace checks pass.
- Source review confirms the button is in the modal's first sticky header row, uses full-width wrapping, and has a minimum 44-pixel height. This is a structural layout check, not evidence of rendered touch reachability.
- Rendered browser QA could not run. The supported managed preview failed with `bwrap: Can't mount proc on /newroot/proc: Operation not permitted`; status confirmed the preview stopped. No alternate server or browser infrastructure was substituted.
- The complete 64-script suite was not rerun for this UI and CSS change. Candidate 25's prior full-suite results are inherited history, not claimed as a Candidate 26 run.

Test candidate only. Rendered touch reachability and physical iPhone Safari acceptance remain UNVERIFIED. Do not claim acceptance from headless action dispatch or the structural CSS check.

## Acceptance

At 1x, open an actual owner decision. Without tapping Keep paused, answer the final decision: the window must disappear and 1x return. Repeat, tap Keep paused inside the window first, then answer: the window must disappear and time remain paused. Repeat with several requests and after scrolling; the sticky control must remain visible and tappable. Save/reload must preserve staff mode. Retest at 375 by 667, 393 by 852, 430 by 932, and desktop 1280 by 720 if emulation is available; physical iPhone evidence remains separate.
