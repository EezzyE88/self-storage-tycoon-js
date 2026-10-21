# Professional interface candidate — October 21, 2026

Parent: `f6e4c1eace1720dc703d8cd5758626b158b6aa03`. Branch: `candidate/professional-interface-20261021`. Build: `professional-interface-20261021`.
Status: implemented candidate; interface checks passed within the scope below. Not accepted or merged. This is a UI finish pass, not a replacement 3D art direction.

## Direction and organization

One shared interface vocabulary: deep navy instruments, warm-white workspaces, brass active selection, consistent button/card treatments and system typography. Semantic warnings, negative cash and operational status retain distinct meaning. The title screen has a compact brand block, readable mode descriptions, clearer primary action and hides gameplay controls while the title owns the modal layer. It scrolls when saved-game choices require extra height. No invented financial advice or fictional success metric.

The first deliverable is interface consistency. Subsequent product work should simplify the operating information hierarchy using observed player needs, then evaluate actual property architecture/materials/activity in motion. Coastal remains rejected. Do not expand 3D scope or resurrect it from this candidate.

## Changes

- css/game.css: append an isolated, named finish layer; leave production panel geometry, safe areas, scrolling budgets, layering and hit-region rules intact. Title styling/visibility is the deliberate layout exception.
- js/ui.js: only showTitle markup/copy changes. Existing choice actions, saved-game conditions and all methods outside showTitle are unchanged.
- js/version.js: distinct review build identity.
- tests/browser/professional/: production UI and simulation in clearly labelled disposable DOM-only fixtures at 375×667 and 390×844; title/build/operate/business/growth/review views. Renderer and persistence integration are not exercised.

Simulation, economics, price/wage coefficients, renderer, input, main loop, audio and save modules are exact parent bytes. Of 44 runtime files, only the three above change. No normal save is loaded or accessed.

## Executed validation

Eight existing scripts passed with exit 0; exact outputs are retained adjacent:
tdisplay_repair, tcontrol_access, tpause_policy, tfinancial_trust, tbuildability, tbuildability_save, tmenu_touch, tgestures.

Coverage includes 41 buildability groups; raw/compressed rotation-save preservation; 13 Pause groups; real camera math with controlled geometry; financial ledger calculations; gesture/menu safeguards and build-details behavior. These are focused tests, not a full-game or device pass.

Actual Chromium DOM fixtures:
- Title inspected at both phone sizes. At 375×667, choices were inside the viewport (last button bottom 584px); the title container had clientHeight/scrollHeight 667/667 for the no-save fixture.
- Actual Scenarios and Load clicks opened their production dialogs. Close returned to the title at both tested widths through their respective tested route.
- Operate panel rendered and was visually inspected at both sizes.
- Actual rotation clicks changed North to East while retaining 12 units, $7,440 quote, cash $100,000, minute 420 and speed 0 in the existing review fixture.
- Review controls were 44px high and within the viewport. Observed 375 Rotate top 503/bottom 547, Confirm top 551/bottom 595; 390 Rotate top 680/bottom 724, Confirm top 728/bottom 772.
- Expanded build terms were capped at 120px. At 375, immediate visible terms text measured 65.78px. A full touch-scroll/heading hit-testing acceptance was not performed for this candidate.
- JavaScript syntax passed; all production UI outside showTitle compares byte-identical; double-quoted data action/value attributes compare identical.
- All 44 baseline runtime files matched GitHub before editing; 41 remain unchanged afterward.

## Harness failures and corrections

Initial test invocation used an unsupported Node flag; tests did not run. A temporary parent package.json outside the Site established module interpretation, then all eight scripts passed without changing production code. Two browser inspection calls used unsupported/ambiguous iframe access and were replaced with frame-scoped locators. Initial fixture subclass suppressed title-return rendering; the fixture now delegates back to production showTitle after construction. Early actionbar coordinates were sampled during the existing entry animation; settled geometry was read and verified. Full-page screenshot capture timed out; a viewport capture succeeded. None establishes a game defect.

## Limits and next review

Full-game WebGL, full startup/Continue integration, actual saved-company title choice variants, physical iPhone, touch scrolling, dense performance, night/access pixel readability and subjective acceptance remain NOT TESTED. The known managed WebGL blocker stays parked; no repeated renderer-recovery attempt was made.

A separate owner-private review Site is prepared through Sites. The accepted game Site must remain version 62; no master merge. Site publication provenance and game-source identity are separate. Use source-proof.json in the review artifact for its exact candidate and runtime hashes; deployment success alone is not fresh served-byte verification.

Next review: inspect this isolated interface candidate on iPhone using disposable state, assess whether the finish is worth retaining, and identify the most important information-organization issue. Keep 3D art evaluation separate and evidence-based.
