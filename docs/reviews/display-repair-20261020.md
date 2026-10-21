# Display repair — browser recheck required

Parent: 7262d4307a5d6da411020d78f635bde9c40ffed9.
Branch: candidate/display-repair-20261020.
Status: local source successor, unpublished, unmerged, unaccepted. Visual correction is NOT YET browser-verified.

## Scope

Only production css/game.css, js/ui.js and js/version.js change. Opening build details resets their inner scroll and brings the details into the review-body scroller after native toggle/layout. The operation never calls window/page scrolling, time controls or simulation dispatch. A queued reveal ignores a closed or replaced details element. Existing placement framing on toggle stays in place. The financial panel keeps its 120px cap, placement-view budget and 44px controls. Its sticky summary now has an explicit stacking order above the scrolling text; the refund note uses text color rather than group opacity.

The request feed's cache includes whether the office is open. Both staff-waiting messages use that same boolean. This refreshes waiting copy at opening/closing without a forced feed render, new conversation, policy mutation or owner interruption. Request scheduling and discount logic are unchanged.

No changes to simulation, economy, data, renderer, gestures, saves or Pause behavior. Frozen traffic candidate 7262d43 and separate graphics candidate d644d18 remain unchanged. No remote/hosting operation is part of this work.

## Validation

Ten scripts passed with process exit code 0: tdisplay_repair (6 new behavior groups); tbuildability; tbuildability_save; tcontrol_access; tpause_policy; ttraffic_delegation; ttraffic_delegation_save; tfinancial_trust; tgestures; tui38. The last requires SST_FIXTURE_06=tests/fixtures/candidate40/06-investment.sst; its initial run without that variable stopped for missing test setup, then passed with the tracked fixture. Syntax and diff-whitespace checks passed.

The new tests exercise the real renderFeed cache through closing, opening and next morning, unchanged-cache reuse, paused state invariance, local reveal scrolling, and closed/replaced/unrelated-element guards. Geometry in the headless reveal tests is stubbed; viewport labels do not establish browser layout PASS.

A DOM-only fixture is available at tests/browser/display-repair/index.html with both target iframe sizes. The frame exposes window.displayRepairQA.check() for visible terms pixels, sticky-heading hit testing, details height, controls and Pause after opening/scrolling. It uses a renderer stub and cannot prove gameplay placement visibility. Run full-game checks separately.

Desktop rendered gameplay in this environment: NOT TESTED; known WebGL blocker remains parked. Actual touch scrolling/stacking at 375x667 and 390x844, complete placement visibility and physical iPhone Safari: NOT TESTED pending Claude/device evidence. No performance claims. No publication or merge recommendation before browser recheck.

## Claude recheck

Verify exact successor HEAD, clean tree and served source bytes. Use isolated disposable storage and real WebGL at both viewports. Start paused, place a tight single 5x10, rotate all four directions and choose legitimate frontage. Expand terms while the summary is at the bottom of its outer scroller: some terms text must become visible immediately without another scroll gesture. Perform real touch scrolling through the terms: the heading must remain readable with no text painting over it, and both terms paragraphs must be reachable. Repeat closing/reopening after scrolling and after placement rerender. Confirm the panel cap holds, full placement/access edge stay between HUD and panel, and Rotate/Confirm remain inside the viewport with at least 44px height. Verify Pause, $620 build debit and save/reload as in the prior QA.

Repeat a temporary Clerk gap from before closing into after hours; check the chip changes from staff availability to office hours at closing without forced renderFeed, then changes back at opening if the gap persists. Verify response still happens once when staff become available, policy revocation prevents discount, owner takeover remains held and queued save continuity remains intact. Report injected setup explicitly. Keep physical Safari NOT TESTED until Eddie tests it. No game-code edits, push, sync, publication, merge or acceptance.
