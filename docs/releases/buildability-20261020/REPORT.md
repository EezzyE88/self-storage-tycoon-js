# Buildability successor — implemented; publication HOLD

Parent: `cae42b33809261ae7ab3e681b8a6a19da32bc62a` (tree `445acfb3192b8129add845d251702874c3d7812b`). Isolated branch `candidate/buildability-20261020`.

## Change

- Clockwise placement rotation in the bottom dock before placement and during review, separate from camera rotation. Unit and office controls identify the cardinal access side. Repeated taps cover North/East/South/West.
- Explicit unit rotation holds the footprint at its minimum x/y corner, independent of frontage guessing. A single held unit can change axes without dragging to two units. Row quantity, cost and construction time remain unchanged. Rotation is a preview operation, not a purchase.
- Rectangular painted areas, shells, canopy and hallways swap the selected dimensions in place. Office supports both footprint axes and all four explicit door sides. Square nondirectional one-cell assets need no alternate footprint. The gate retains its legitimate street-front restriction.
- Yellow access edges now include interior units and offices. Review camera calculations reserve unit frontage cells and office access cells as well as structure height.
- Phone review dock capped at 42dvh, further constrained by measured top controls/scenario card; expanded financial terms capped at 120px and scroll internally. Rotate and Confirm stay outside the scrolling body.
- Existing collision, parcel and access validators remain authoritative. Unconnected drive units remain incomplete; interior units still require hallway frontage. No automatic aisle creation or restriction bypass.
- Default automatic orientation remains until the player chooses explicit rotation. Selecting a different tool resets the orientation. No global economy coefficients, time controls, saved-state schema, storage modules or historical release files changed.

## Executed evidence

All 11 focused scripts exited 0; logs adjacent:

`tbuildability`, `tbuildability_save`, `tgestures`, `tpause_policy`, `tsandbox_build_pause`, `tfinancial_trust`, `tcontrol_access`, `tsave_recovery`, `tworking_yard_save`, `tthreefloor_save`, `tmenu_touch`.

Buildability: 41 groups covering all drive-unit sizes in all orientations at all four parcel corners, off-parcel rejection, interior hallway requirements, every unit product's four-rotation count/cost/state invariance, all rectangular drag tools, office orientation/build/save, collision rejection with no spending. Production raw and compressed save preparation/load also preserved all four unit orientations, rotated office geometry, pending construction, cash, time and Pause through repeated loads.

Existing tests cover gestures, manual/temporary Pause including real build Confirm, financial trust, local-save recovery, repeated raw/compressed loads and upper-floor persistence. Camera checks use real camera math with boundary doubles; they are not rendered yard evidence.

## Browser evidence and limits

Supported cloud Chrome at local preview: actual game startup stops at **Graphics could not start — WebGL could not initialize** before `__game` exists. This is an environment graphics failure, not a diagnosed game regression. No attempt to download another browser or alter graphics restrictions.

A separate, clearly labelled DOM fixture uses production UI, CSS and simulation with a renderer stub. At actual 375x667 and 390x844 iframe viewport sizes, actual clicks changed unit frontage from North to East while retaining 12 units, $7,440 quote, $100,000 cash, time 420 and speed 0. Expanded terms measure 120px at both widths. Dock heights: 280.125px and 354.46875px. Rotate and Confirm measure 44px tall, remain within each viewport. Example positions: 375 Rotate y503, Confirm y551; 390 Rotate y680, Confirm y728. System fonts; desktop pointer; no physical touch or Safari claim.

Harness corrections: the first DOM fixture omitted audio.unlock; the click failed in the stub before the UI handler. Corrected only the fixture, then repeated successfully. Initial rectangle text was sampled during entry animation; subsequent direct measurements after animation confirm x8 and full-width dock. These were harness/sampling failures, not game defects. Terms are inside a scrolling review body; outer rectangles extending below that body are clipped and scrollable, not proof that content overlays the yard.

**NOT TESTED:** rendered single-unit/row/office/rectangle preview, actual yellow-edge visibility, complete placement visibility with collapsed/expanded terms at both target sizes, canvas touch gestures in Chromium, renderer integration and physical iPhone Safari. DOM fixture success does not close these checks.

## Release decision

HOLD publication: do not call this a fully passing gameplay candidate. Existing Safari version 60 is unchanged. No new served-byte verification is claimed. GitHub master remains `e04a808dd1cac558b9e97e8cd5f021f874ac7cfe`; original V60 `7346fb686c86801556fb918d27b62a427cd293fe` and protected checkpoint `2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d` retained. No push, synchronization, merge or deployment performed. User saves never accessed.

## Remaining execution

Run the real game with supported WebGL at 375x667 and 390x844. Exercise the actual rotation button before/after a single-unit hold in all four directions, a narrow corner with valid frontage, a multi-unit row, office and rectangular areas. Expand terms and verify the full footprint plus access side above the dock; inspect large placement fit honestly without lowering existing zoom limits. Verify Pause through rotation, pan, release, cancel and Confirm; verify quote and unit count stable. Publish the exact passing candidate to the existing Safari preview only after these checks pass, preserving historical version 60 and other checkpoints. Compare served runtime hashes to that exact candidate. Do not merge.

Then one physical iPhone acceptance: in a separate disposable copy, stay paused; hold one 5x10 in a tight valid corner, tap Rotate through four sides, choose valid aisle frontage, expand terms, verify the entire preview and access edge remain visible, Confirm, Save/reload/Continue, confirm direction and Pause retained. This check has NOT been issued as a live-build request because this successor is not published.
