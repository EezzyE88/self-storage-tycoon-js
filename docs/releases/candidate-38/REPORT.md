# Candidate 38 — session messages, reviewed placement and background audio

Base: freshly verified Candidate 37, `162c4cf0d21a9862d3f3931a634fa0b841b263b0`, branch `candidate/comeback-career-20261009`. Accepted master remains `055d2a871945c565c3affbda89ecd46be7a4cfac`.

Initial authority check: GitHub master/candidate refs and candidate branch inventory were fetched live. The same Safari Site's source proof identified Candidate 37 and its build. Site audience was verified public; it is preserved. No new Site is created.

## Scoped physical iPhone Safari acceptance, Candidate 37

User reported PASS, supported by supplied screenshots, for completed rescue acknowledgement, career access, expandable rescue history and save → reload → Continue. Cash $1,150, Day 2 3:54 PM, occupancy 16/23 and earned rescue goals persisted. This does **not** accept promotion, acquisition, active mixed-company restrictions, investment placement, earned-tier or other untested fixtures. Third-party Chromium emulation reports are separate evidence, not physical Safari acceptance.

## Findings and changes

- **Confirmed defect:** transient toast elements survive `resetSession`, allowing an old company's promotion/event message to remain after load/switch. Reproduced against 37's production UI methods. Reset now removes all old toast DOM nodes and transient proposals, and invalidates HUD caches. Saved history remains untouched.
- **Confirmed workflow defect:** Growth captures proposal arguments but clears the live tool/preview with no way to recover it. The panel intentionally closes map placement controls. Growth now offers **Return to placement**, restoring the exact tool, anchor, footprint options and view, and recalculating against current conditions. It does not spend, build or unpause. Another property/load/tool cannot restore stale placement. Normal Confirm remains required and uses existing dispatch validation.
- **Confirmed audio lifecycle defect:** suspension preserves scheduled one-shot cues and reverb tails, while direct music/tone paths could schedule on a non-running context. Backgrounding now mutes, stops scheduled cues, resets reverb history and suspends; hidden/blurred/non-running contexts cannot schedule cues. Foreground gesture resumes with a fresh music cursor. A delayed resume racing another app switch remains muted/suspended. **The precise cause of the user's audible ping has not been reproduced on physical Safari**; the lifecycle defect is fixed, and the symptom needs targeted retest. No intentional app-switch ping or autosave sound was found.
- **Intended behavior:** loading starts paused; owner requests hold play until answered; opening review panels pauses; readiness is advisory and plan-specific; invalid placement remains invalid. Earned rescue history and its close/keep-operating action persist. No claim that every placement around Unit 101 is valid.

## Preservation and validation

Only `js/audio.js`, `js/main.js`, `js/ui.js`, `js/version.js` change at runtime. No economy coefficients, simulation dispatch, save format, migration, career eligibility, scenario logic or rescue history changed. All seven published fixture save codes remain byte-identical.

48/48 existing validation jobs passed (including paired economy, career eligibility/hourly promotion, lessons, acquisition, scenario restrictions, rescue and saves). Six focused UI regression groups passed using actual UI methods and the exact published fixture 06 save; its restored plan stays valid at $620, readiness justified, and normal Confirm debits exactly $620. New mocked WebAudio lifecycle checks cover delayed cues, mute/suspend, no background scheduling, gesture resume, ended cleanup and resume/background race. Existing 33 soft-audio checks passed. Syntax and whitespace checks passed. Complete logs are adjacent.

No physical Safari or browser rendering run was performed for 38 here. The source-derived placement diagram was rendered and inspected. The visual guide is explanatory only; it does not change game tiles or automate placement.
