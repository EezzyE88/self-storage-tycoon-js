# Title-screen tap hotfix

Acceptance update, October 19 Pacific: Eddie reported the focused version 60 Safari check PASS. See [the acceptance record](title-taps-hotfix-20261019-ACCEPTANCE.md). The implementation and original verification limits below remain historical evidence; their pending wording does not reopen that accepted focused check.

Parent: a721fcefc43daae06c4086e3c60823044527173b.
Protected recovery ancestor: 2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d.

The financing presentation candidate made #modal ignore pointer events and restored them only on .modal-bg. The production title screen is a direct .title child, so every title button inherited pointer-events:none. The correction restores pointer events on that existing title child. Modal layering, empty-host pass-through, financing layout and margin rules remain unchanged. No JavaScript production source, economics, pause, save or simulation changes.

## Verification

The actual UI constructor, DOM, listeners and navigation/dialog methods were exercised through supported browser control in Chrome, in same-origin phone frames. UI imports and full CSS came from the candidate. No WebGL, real persistence or user saves were used; renderer and persistence boundary callbacks were doubles with disposable state. Tests/browser/title-taps.html and title-taps.mjs retain this fixture. Serve them under the repository root through the supported local preview path. Optional query modes: saved, mode=play, mode=credit. The before flag expects a root before.css copied from exact parent CSS for negative comparison.

- Parent title Load hit-test returned no action and computed pointer-events:none; the real click did not navigate and reached the underlying disposable map. Candidate title targets returned the correct action and pointer-events:auto.
- At 375x812: actual Scenarios, Sandbox and Load opened and closed back to the production title screen. At 320x568 the three navigation round trips passed again; the actual Load textarea accepted disposable input.
- Maple Street called the disposable newGame boundary once with maple. With a saved-entry fixture, the production replacement guard opened, Cancel returned to the title without starting a new game, and Continue called the disposable load boundary once. These are UI dispatch checks, not complete new-game/real-save integration acceptance.
- Empty modal host: actual 1x then Pause changed displayed fixture speed 1 -> 0. The production Finances modal opened and closed, speed stayed 0, time remained 420. A subsequent map click reached the underlying canvas once.
- Credit review over an armed production build: selecting Review $1,000 exposed its matching confirmation; 16px left/right margins, no horizontal overflow and modal hit-test above the build header. Back emptied the modal host; speed stayed 0 and time stayed 420. No draw or construction was confirmed.
- Existing focused scripts passed: tfinancing_layout (2 groups), tpause_policy (13), tinvestment_guidance against protected 2096ef6 (21), and treserve_wait_continuity. Syntax and diff checks passed.

The initial replacement-guard fixture lacked outgoingMeta; its observed exception was in the test boundary. The double was completed, the browser was reloaded, and guard/Cancel/Continue passed. No production JavaScript was changed to accommodate the fixture. Browser extension metadata errors are unrelated to game source.

## Limits

Physical Safari/iPhone acceptance remains pending. This is actual production UI DOM/click evidence with synthetic state, not full-game WebGL or real storage evidence. No claim of real save reload or graphics QA is made. The normal company was not accessed. The protected checkpoint and game master remain unchanged. Publication must copy exact committed runtime bytes and verify the served result.
