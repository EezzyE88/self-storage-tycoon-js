# Candidate 25 request window correction

Eddie reported that the saved staff-handling preference repeatedly appeared during request handling and required extra window closures. His Day 63, 69, 82, and 96 screenshots showed empty paused Requests windows; the move-out screenshot also showed the preference above a real decision.

Base: `a8e10ecb35164963edc03d3d5ab3f8af255166b3` (Candidate 24).
Preserved master: `055d2a871945c565c3affbda89ecd46be7a4cfac`.
Build: `bplus-request-window-candidate-25`.
Branch: `candidate/request-window-fix-20261007`.

## Behavior

- Owner Review opens only actual owner decisions, without the saved preference controls or staff-history section.
- Answering or removing the final owner decision closes its window and releases its temporary pause. A deliberate manual Pause and any other active panel pause are preserved.
- Stale or empty Review taps do not open a window or pause time.
- Staff-only progress is passive status, with no Review prompt.
- Menu and Operate explicitly open request settings and staff history, including when the queue is empty. This deliberately opened settings window stays open until the player closes it.
- The existing saved `policies.manualRequests` field remains the authority. No save schema, simulation, economic coefficients, staff eligibility, coverage escalation, or response actions changed.

## Verification

37 focused request checks pass using the real simulation, action dispatch, UI handlers, and a DOM test double. They cover all four speeds, saved settings in both modes, mixed queues, multiple decisions, stale taps, removed requests, automatic dismissal, staff delay and history, lost coverage, manual Pause, and nested panel pauses.

The full headless run initially passed 63 of 64 scripts. The failing Candidate 22 navigation fixture stubbed the old shared request-card cache; it was updated to supply owner decision cards and verify the new decision title. Its targeted rerun passed all 28 checks. An older property UI fixture was also updated for the owner decision cache and passed all 21 checks. All 64 scripts have passing results on the final source; the full suite was not repeated after these test-only fixture corrections. Syntax checks and `git diff --check` pass.

The original Candidate 24 served UI, simulation, and boot files were checked against source-proof hashes before editing. Publication must regenerate source proof for this GitHub candidate and verify changed served files against it.

## Acceptance and remaining behavior

Test candidate only. Physical iPhone Safari acceptance remains pending. No browser visual acceptance is claimed by the headless checks.

Routine requests generated outside 8 AM to 6 PM still require owner handling under the existing Candidate 24 staff coverage rules. This correction removes repeated settings and extra empty-window closure; it does not change those simulation rules.

Physical acceptance: reload the same Safari preview and confirm Candidate 25. Leave staff mode selected, answer a real owner request, and verify that the final answer dismisses the window without showing settings or requiring another X. Repeat after deliberately selecting Pause; the clock must stay paused. Verify Menu still opens the saved setting and history, and save/reload preserves the chosen mode.
