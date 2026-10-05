# Property-first UI overhaul — isolated candidate15

Branch: candidate/property-first-ui-20261005. Build: bplus-property-first-ui-candidate-15. Base: verified published candidate14 a5141eac1fb9537a91d92e9aa797ff79a724e893. Accepted master remains2812abf8d268f9a225e5786d173f95efcbd6223d. Only EezzyE88/self-storage-tycoon-js is used.

## User requirement

The property must be visible more than covered while the clock runs. The old interface stacks scrolling management panels, tutorial cards, tall floor controls, coach banners and request cards over the map. This candidate changes navigation structure and visibility, not just colors.

## Interaction changes

- Build opens a compact horizontal category/tool shelf. Tool choice closes the shelf and leaves a small placement strip. Costs, locks, descriptions in Details, precise suggested placement, hold-to-place, confirm, cancel, and all existing build actions remain. Large construction review pauses immediately after release; confirming or cancelling restores prior speed.
- Operate, Business, Growth and map selections open compact contextual docks. They show live factual metrics: jobs/staff/office queue, actual cash and occupied/ready inventory, reputation/properties, or the selected unit's authoritative status. They do not dispatch purchases or assignments.
- Section chips open the relevant detailed controls. Details expands a deliberate paused workspace; Back to map collapses to the live summary; X closes it. Headers and closing controls stay outside body scrolling. Operate includes a direct Feedback chip.
- Existing detailed inspectors, staffing controls, finance books, policies, collections, company transfers and acquisitions remain in the expanded workspace. There is no new automatic hire, build, assignment or financial decision.
- Requests occupy one compact paused inbox button. Review opens the existing messages with all original response choices, costs and consequences. Existing automatic request pause/deadline protection is retained. Responding refreshes the inbox; no requests closes it. The inbox pause survives closing its detail modal until all requests are resolved, as before.
- Complaint bubbles and explicit feedback taps open paused detailed guidance directly. Location review returns to the property. All candidate14 false-positive/spam/cause/remedy fixes are retained.
- Tutorial is one current-step line with Details; expanded instructions pause. Starting a build tool collapses instructions and releases their pause. Optional offers are a compact lesson button plus dismiss X, preserving the existing no-rush pause. Scenario guidance starts collapsed and pauses when expanded.
- Phone top controls split into small cash/day/time controls and direct speed/floor buttons. Rotation is a small horizontal pair. Navigation is a slim four-section rail. Coach text is one line and hides alongside open panels; tutorials/coach do not stack behind detailed panels. Short landscape uses a side dock; desktop uses a400px dock.

## Clock control

Blocking detail workspaces retain the exact speed selected before the first blocker: Pause,1x,2x or4x. Nested modal/panel/tutorial/review blockers do not overwrite it. Closing one blocker cannot resume behind another. Explicit Pause while an overlay is open stays paused after it closes. Run-speed buttons cannot defeat a blocker. Stale popup state from another property cannot impose the old property's speed on a new simulation. This corrects the prior forced1x resume behavior.

## Verification and limitations

15 focused executable UI checks cover all four prior speeds, nested blockers, explicit Pause, blocked run commands, duplicate pause, property identity, factual/read-only compact summaries, inspector status, section navigation, construction hold/release/cancel and retained inbox choices. Retained feedback/gesture/save/staffing/economy/status regression scripts are run as a full suite; results are committed separately.

Runtime changes are confined to ui.js, game.css and version.js. sim.js, data.js, economics.js, finance.js, renderer, tutorial rules, construction plans, save format and gestures remain byte-identical to candidate14. UI pause policy is intentionally changed; economy coefficients and task scheduling are not.

CSS bounds compact phone sheets to29dvh, leaves the main property above them, uses single-line guidance, and hides competing tutorial/coach cards with panels. Expanded panels and build review are paused. These are implemented layout constraints, not measured physical-iPhone coverage percentages. Actual Safari viewport/safe-area/layout, scroll reachability, native touch and perceived usability require acceptance. No browser executable or compatible static managed preview is available here, so no screenshot/browser-layout PASS is claimed. The old Chromium status-hierarchy layout script describes candidate13's simultaneous tutorial/menu layout and must not be treated as candidate15 acceptance.

Release: owner-private isolated candidate on the same Safari Preview. No merge or promotion; master stays unchanged. Physical Safari status is HOLD/pending. Play normally: map view, four docks, section/Details/collapse/X, requests, tutorial/lesson, build selection/hold/review/confirm/cancel, portrait/landscape, map pan/pinch/double-tap, save/reload and background/resume. Report any hidden controls, clipped values or obstruction. Automated checks do not establish enjoyment or a whole-game bug-free result.
