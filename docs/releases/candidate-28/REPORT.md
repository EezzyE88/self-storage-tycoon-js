# Candidate 28 — softer procedural sound

Base: Candidate 27 799d87d3a605b704f2946f884d1d449734dff0d5, independently verified in GitHub and the published source-proof before editing. The user reports the request flow is working correctly on iPhone. This does not authorize a master merge.

Direction: restrained, rounded, warm management-game feedback. Distinct cues remain for success, refusal, owner attention and faults.

## Changes

- Replace square-wave refusal/keypad/fault/shutter effects and sawtooth gate tones with sine tones. Lower high-pitched reward effects into a more restrained register.
- Round tone/noise attacks and reach exact silence before source stop. Clean up ended oscillators, sources, gain nodes and filters.
- Remove high-frequency rattles and squeaks from doors/carts; use soft, broad filtered mechanical textures. Soften the rain, HVAC hum and music percussion/harmonics.
- Add a master low-pass and gentle dynamics compression. Reduce default effect/ambience levels; preserve all four existing sliders and Music on/off.
- Route reverb returns through the Effects/Music buses so wet sound respects their volume controls. Glide slider changes to avoid abrupt level jumps.
- Rate-limit every effect in real time, including cross-event limits for property activity and success notifications at 4x. Routine sounds cannot suppress owner attention alerts.
- Skip missed musical scheduling after prolonged mute rather than stacking overdue notes on re-enable.

## Validation and limits

33 WebAudio graph/scheduling checks pass, covering every effect, envelopes, filters, wet routing, muting, cooldowns, burst handling, source cleanup, context unlock/resume, hidden document, music modes/rain and long-mute recovery. The existing 53 request/pause checks and 24-second clock checks pass. JavaScript syntax and whitespace checks pass.

These are deterministic WebAudio API fixtures, not rendered audio or physical-device listening. Ear comfort, iPhone Safari output/mute behaviour and actual performance require physical listening. No claim of audible acceptance is made. No browser QA was performed: the supported managed control-browser skill is unavailable.

Only audio.js, version.js, the new audio test and release evidence differ from the gameplay baseline. Economy, simulation, saves, UI and request logic remain byte-identical.

Listening next: refresh Safari at a comfortable volume, try menu taps, placement, successful rental, refusal and owner alerts, then listen through normal activity at 4x. Try Effects=0, Music off and Master=0. Report any remaining sharp cue by its trigger; headphones can be checked separately if normally used.
