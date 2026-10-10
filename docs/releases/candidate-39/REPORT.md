# Candidate 39 — ambient background/resume correction

Repository: EezzyE88/self-storage-tycoon-js only. Isolated branch: candidate/ambient-lifecycle-20261010. Base: freshly verified Candidate 38 `5e9181c2c322ae217fa574885e29829399a2c3e7`. Accepted master: `055d2a871945c565c3affbda89ecd46be7a4cfac`, unchanged. Same Safari preview, public audience preserved.

## Authority and physical evidence

Live GitHub master and Candidate 38 branch fetched; candidate branch inventory checked for a newer relevant candidate. Served source proof names Candidate 38 and the expected build. Actual served audio, main, UI and version files hash-match its proof before changes.

Physical iPhone Safari channel tests supplied by Eddie:

| Setting | Observed |
| --- | --- |
| Master off | Quiet |
| Master on, Effects/Music/Ambience off | Quiet |
| Effects only | Quiet |
| Music only | Quiet |
| Ambience only | App-switch noise returns |

This isolates the symptom to Ambience, not its exact waveform or departure/return timing. Candidate 38 audio remains HOLD. Candidate 39 physical Safari acceptance is pending; automated checks do not supersede it. Earlier Candidate 37 PASS remains scoped to rescue acknowledgement, career access, expandable rescue history and save → reload → Continue. No other fixtures are physically accepted by inference.

## Confirmed source behavior and smallest correction

Production Candidate 38 creates three continuous ambient sources: filtered noise, HVAC hum and rain. They are not in its one-shot source cleanup set and remain connected after suspension. Its background handler immediately sets master gain to zero. The reproduction test demonstrates both behaviors. MDN documents that instantaneous gain changes can cause clicks (https://developer.mozilla.org/en-US/docs/Web/API/GainNode); this supports the correction but does not prove the user's specific sound is that click.

Candidate 39 retains the one-shot cancellation and introduces an 80 ms release before final mute/suspension. It tracks, stops and disconnects the ambient graph. On resume the graph is recreated with all local gains initially zero, then existing smooth world-state ramps restore normal ambience. Context interruption/suspension events also dispose ambient loops, including Safari interruptions without a visibility event. Background/hidden contexts cannot create replacement sources. Repeated notifications do not duplicate graphs or extend the release; rapid foreground return cancels pending suspension. A resume promise that completes after another app switch stays silent/suspended. Volume preferences are unchanged; no new sound or gameplay control is added.

The 80 ms audio release does not delay the existing immediate simulation pause/autosave. Safari may suspend earlier than the release finishes; the state-change cleanup handles the interrupted graph. Exact audible behavior under physical OS interruption remains a device test, not a proven automated outcome.

## Scope and validation

Runtime changes: js/audio.js and build identity js/version.js only. Candidate 38 js/ui.js and js/main.js are byte-identical. Economy coefficients, simulation, save format, rescue history, scenario restrictions, message clearing and Return to placement are preserved. All seven published fixture save codes stay byte-identical.

Nine deterministic mocked ambient lifecycle groups pass: release scheduling/cleanup, background guards, fresh zero-gain graph, standalone interruption, rapid return, repeated notifications, volume preferences, 20 resume cycles and asynchronous resume race. The prior Candidate 38 lifecycle test now waits for the deliberate release and passes. Six Candidate 38 UI groups pass with the exact published investment fixture. Existing validation: 48/48 jobs passed, including 33 soft-audio checks, economy equivalence, career/scenario restrictions, rescue, acquisition and saves. Syntax/whitespace checks pass. Logs adjacent.

Verification limit: no physical iPhone or browser audio rendering run here. The mocked tests verify graph ownership, automation calls and lifecycle state, not recorded acoustic output. Retest required before claiming the noise fixed.
