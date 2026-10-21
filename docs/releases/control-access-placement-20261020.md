# Control access and ordinary placement review — local candidate

Status: IMPLEMENTED; browser interaction/layout NOT TESTED; not accepted or ready for publication.

Parent: cea7061be2d7b32863c895afc26f2bd8f4d58429, snapshot/version60-20261019.
Local branch: candidate/control-access-placement-20261020.
Accepted original game 7346fb686c86801556fb918d27b62a427cd293fe and protected recovery 2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d remain preserved. Master and deployments are unchanged. No push, synchronization, merge or deployment.

## Change

Production diff is limited to css/game.css and js/ui.js. On narrow portrait screens, keep 44px time and floor targets; put the additional camera button below the floor group. Measure the control extent for the sheet-open card/feed/coach position. Reserve map space above ordinary build review; retain all financial content in its existing scrolling body and retain its fixed header/actions. An expanded scenario card remains scrollable in a bounded area during placement review.

Frame ordinary placement bounds after opening/changing review, opening build details, resizing or completing panel entrance animation. Use existing camera pan/zoom methods, zooming out only as needed. Skip active gestures, do not run recurring camera correction for an unchanged plan, and do not change simulation or saved fields.

## Verification

Final successful Node runs, from repository root:

- node tests/headless/tcontrol_access.mjs — camera projection/fitting at controlled 375x667 and 390x844 rectangles, unchanged simulation/Pause, measured-extent variables, one-shot framing and active-pointer deferral. Rectangles are test inputs, not actual browser layout measurements.
- node tests/headless/tpause_policy.mjs — 13 groups.
- node tests/headless/tsandbox_build_pause.mjs — 16 normal/instant/business/free-build placement/Confirm cases.
- node tests/headless/tgestures.mjs — 12 gesture/camera groups.
- node tests/headless/tfinancial_trust.mjs — passed.
- node tests/headless/tmenu_touch.mjs — eight groups.
- JS syntax and git diff whitespace checks passed.
- js/sim.js, js/finance.js, js/economics.js, js/localsave.js, js/savearchive.js, js/main.js and js/render.js match the parent bytes exactly.

Invalid initial invocations are not passes: the historical financing-layout comparison was supplied an incompatible already-repaired parent; two scripts were initially invoked outside their required repository cwd; one guessed Pause script filename did not exist. Correct repository-root runs are listed above. No unrelated production change was made in response to those invocation failures.

## Browser hold

node tests/browser/control-access.cjs was attempted and failed before page startup because Playwright's Chromium executable is not installed. A preceding browser-install attempt in this session returned an invalid archive; it was not repeated during implementation.

The harness routes only local repository bytes into a fresh disposable Chromium context, with no server or deployment. External network requests are aborted (system-font fallback). It is prepared to exercise title/Load/Scenarios, Comeback-to-Build layout, actual control taps and floor dialogs, empty-overlay canvas pass-through, touch-drag placement, expanded terms and paused Confirm at both requested viewport sizes. The harness itself has syntax validation only; its selectors, fixtures and assertions have not executed and may require corrections when browser capability is available.

Actual browser rectangles, hit testing, financial-body scrolling and short-screen usability: NOT TESTED. Physical Safari: NOT TESTED. Full-game desktop WebGL QA remains parked; Node renderer fixtures are not WebGL execution. No screenshots or device acceptance are claimed.

Next gate is to run the browser harness in an environment with supported Chromium, fix any failures, inspect the resulting short-screen composition and verify no new page errors. Do not publish based on Node checks alone.
