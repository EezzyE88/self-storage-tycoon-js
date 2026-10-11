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
