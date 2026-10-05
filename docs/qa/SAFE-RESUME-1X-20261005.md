# Intentional safe1x resume — candidate16

Base: published candidate15,592906023bfd18662930fb0561b3ef63e9f20cad. Isolated branch:candidate/safe-resume-1x-20261005. Build:bplus-property-first-safe-resume-candidate-16. Only EezzyE88/self-storage-tycoon-js. Master remains2812abf8d268f9a225e5786d173f95efcbd6223d.

The owner clarified that returning to1x after popups/events is intentional: a player who had selected4x needs time to rectify the situation without pressure. Candidate15 incorrectly replaced this safeguard with restoration of the previous speed. This candidate restores the existing1x policy for popup/event/lesson dismissal and uses the same rule for new expanded UI panels, tutorial/scenario details and construction review.

Blocking overlays still pause. Nested blockers still keep the game paused until the last blocker closes. Run-speed commands cannot override an active blocker. Closing the last blocker resumes1x, even if the pre-popup speed was0,2 or4; this matches the prior policy. A later explicit Pause in the unobstructed game remains available. Property-switch cleanup still avoids applying stale blockers to another simulation. Compact docks do not create blockers or force a speed change merely by opening.

The compact UI, paused large workspaces, inbox, complaint fixes, economy, staffing, saves, gestures and accepted master are otherwise unchanged. Runtime changes from candidate15 are restricted to ui.js pause policy and version.js. CSS is byte-identical.

Focused UI checks now explicitly require1x after all four starting speeds, final nested-blocker dismissal, a Pause tap during a blocking popup, duplicate blocker, construction-review completion and panel collapse. Nested modal/panel removal must remain0 until the last blocker closes. Other retained UI/input tests remain. Full regression results are committed in safe-resume-1x-results-20261005.json. Physical Safari acceptance remains pending; source/headless evidence is not relabeled as iPhone acceptance.

This report supersedes candidate15's previous-speed-resume design and test interpretation. Release is private, isolated and unmerged on the same Safari Preview.
