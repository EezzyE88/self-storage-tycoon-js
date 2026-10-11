# Candidate 41 current acceptance assessment

Updated 2026-10-10, America/Los_Angeles. This assessment supersedes the pre-review HOLD in the historical implementation report below; captured test results and original observations are unchanged.

## Approved development baseline

The focused review recommended merge-ready for development master, with no blocking defect identified. The user explicitly approved and completed a fast-forward-only merge from `055d2a871945c565c3affbda89ecd46be7a4cfac` to `b2faa4baa8da8d470e142480ef9229485a73b46b`; all 19 reviewed commits were preserved. This documentation-only update does not create a new runtime or republish the preview.

## Updated physical evidence

- Candidate 37: rescue acknowledgement, career access, expandable rescue history and Save -> reload -> Continue PASS.
- Candidate 39: Ambience-only app switching reported "No noise".
- Candidate 40: Eddie voluntarily and deliberately built more; expanded-yard units and progress survived Save -> reload Safari -> Continue.
- Latest screenshots show the two-unit preview at the preferred door-and-aisle angle. They have no build identifier; observed presentation and independently verified deployment identity remain separate.
- A separate later loaded run reaches 25/25 leased from the 23-unit fixture, supporting added capacity becoming operational and rented. Exact commissioning actions are unreported.
- Continued operation reached Day 45 with repairs, cart demand and overdue rent appearing; rescue history remained completed and visible.

Do not conflate loaded runs or infer sustained enjoyment, exact commissioning actions, card-spacing acceptance or physical Return to placement camera preservation. The former statement that leasing was wholly unobserved is superseded within the later run's scope.

## Validation and release limits

Recorded validation remains 84/84 successful final script executions after four corrected missing-input invocations; two are placement diagnostic helpers. Initial failure and retry logs remain intact. The merge review independently verified 60/60 served hashes and 38/38 runtime files against exact Git source. It also executed the production-autosave recovery harness with 100 ms compression delay: 15 groups passed, including stale-session and pagehide sequencing. This additional review result is not a physical Safari test or a newly captured historical suite log.

Current decision: **accepted development master after explicit user approval**, not unconditional whole-game physical acceptance or commercial-release readiness. Dense-property Safari performance and organic extended company pacing remain material uncertainties. Physical card spacing and Return to placement preservation remain minor unconfirmed details. No full fixture replay is required without a specific demonstrated risk.

Full current state and the single proposed next gameplay milestone are recorded in [CURRENT-STATUS.md](../../CURRENT-STATUS.md). Preview and user saves are unchanged.

## Historical implementation report at publication

The report below records Candidate 41 before the later evidence, focused review and merge approval. Its original master/HOLD/publication instructions are historical and superseded by the current assessment above.

# Candidate 41 — readable choices and door-side extension view

Base: Candidate 40 25b7cfbb496c3799e3bbcf77b52a7b901de4c02d.
Accepted master: 055d2a871945c565c3affbda89ecd46be7a4cfac; unchanged.

## Changes

Choice-card small text is displayed on separate lines with spacing. A new extension preview uses the east/south camera quadrant (45 degrees), exposing the original east-facing doors and the extension south-facing doors together. Orientation is settled before measuring placement bounds, avoiding a frame computed at the previous angle. Existing frameOutline keeps the footprint in the usable map region without forcing zoom in. Rotation and zoom controls remain unchanged. Growth Readiness Return to placement preserves the player's manually selected angle and zoom. No camera orientation is continuously enforced. Other construction tools are unaffected.

Only runtime CSS, renderer presentation, the UI preview call and build label changed. No economy, simulation, audio, scenario, rescue-history or save-schema changes. No save/storage operations are performed by deployment.

## Physical evidence supplied by Eddie

Candidate 40: title, fixture load, choices and valid free preview observed. Eddie explicitly wanted to continue building and deliberately built more. He prefers the door-and-aisle view. Expanded-yard units and progress survived Save → reload Safari → Continue (user: “Survived”). This is positive immediate motivation and a save-continuity PASS for that tested yard. Commissioning, leasing and sustained enjoyment are not inferred. Candidate 37 PASS remains limited to rescue acknowledgement, career access, expandable history and save/reload/Continue. Candidate 39 “No noise” remains limited to the tested Ambience app-switch scope.

## Validation and release decision

See headless/results.json for full suite results and captured logs. 84/84 script executions completed successfully after correcting four harness invocations: the required immutable Candidate 36 baseline for tcareer37_economy (70,491 paired ticks), fixture 06 for tui38, and placement JSON arguments for the tv/tw diagnostic helpers. Initial failures and retry evidence are retained; tv/tw are diagnostics, not assertion suites. New focused checks execute the production camera methods without WebGL, and exercise real UI preview/Return to placement with the production fixture. Browser rendering and physical Candidate 41 visual acceptance are pending; no browser-control skill is available in this environment.

Master recommendation: HOLD for an unconditional whole-stack acceptance. Candidate 41 visual retest is pending. Candidate 40 commissioning/leasing are not physically accepted, and the earlier full promotion/acquisition/active-scenario fixture matrix has not been accepted on physical Safari. Existing automation and limited positive device evidence support a focused merge review after the visual retest, not a claim that every accumulated feature is accepted. Do not merge in this task.
