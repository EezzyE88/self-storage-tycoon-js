# Candidate 30 — dollhouse visual pass

Base: Candidate 29 `e0137369d255640d9edde443b1a6e289bc20c8c7`. GitHub branch and all 32 served application hashes verified before editing. Master `055d2a871945c565c3affbda89ecd46be7a4cfac` remains unchanged. User's physical-iPhone acceptance of Candidate 27 requests, Candidate 28 audio and Candidate 29 visible grouping is preserved.

## Appearance and watching the property

Retains the isometric scene, map geometry, object IDs, floor visibility, selection and tutorial guides. Shared roof maps have finer seams/fasteners; wall maps add siding and trim; roll-up doors add recessed rails, latch and threshold. Softer grass/pavement/roof palette, subtle mown stripes and paved grass-edge paint make the site more deliberate. Existing tree instances have varied crowns and richer greens. Day lighting uses less directional contrast with more sky fill. Night light pools fade more gently. Bubbles have a warm paper finish and quieter shadow; grouping and interaction code is untouched.

Customers have two arms using shared cylinder geometry and their existing shirt material. Walking swings opposite arms with subtle torso/head bounce; carrying/cart handling has a forward pose; staff gestures only follow actual `work` state. The presentation phase advances in real time while speed is positive, so 4x does not turn the gesture into frantic motion. Manual pause stops the added phase. Customer recycling resets pose. Per-tree resource disposal now deduplicates private material disposal because body/arms share one material.

This is a first polish pass, not a final art-quality certification. No fabricated customers, fake completed jobs, extra route obstacles, bloom, extra lights or new textures. Existing vehicle, gate, door, cart and elevator activity remains driven by actual simulation. No sim/economy/audio/save/request/camera logic changes.

## Evidence

17/18 regression scripts pass. Nine new presentation assertions cover saved-state immutability, original status materials/picking, walking/carry/work poses, pause, recycled poses, material disposal and finite day/rain lighting. Existing performance, art, hierarchy, property, gestures, menu, banner, feedback, grouping, availability, request/pause (53), audio (33), clock, production compressed saves, save recovery and blueprint tests pass.

`tthreefloor_parity` is a pre-existing failure: the historical Candidate 19 comparison rejects later availability/history fields. The same failure was reproduced in a clean detached Candidate 29 worktree. Simulation source is byte-identical to Candidate 29. This test was not weakened or relabeled PASS.

The paired scene fixture covers day, night, rain, a commissioned F3 building and 550 drive-up units with 100 people. Nine alternating repetitions report median rebuild, ground-command and crowd-sync CPU time. Crowd syncing settles to stationary positions; it is not a moving-customer or full simulation benchmark. Across all scenes, added meshes = two per person, triangles = 80 per person, and geometry/material/mapped-texture counts and shadow-caster counts are unchanged. For 20 people: +40 meshes/+1,600 scene triangles. For 100 people: +200/+8,000. Scene update comparisons assert no mutation of saved simulation. Measurements use actual Three.js scene graphs with stubbed Canvas/WebGL; texture rasterization, draw calls, FPS, GPU memory and thermal behavior are unmeasured.

## Acceptance limits

Supported managed browser QA is unavailable because control-browser is not provided. No browser was installed or alternate browser path used. No new actual raster screenshots or physical-iPhone acceptance were generated. Supplied screenshots establish Candidate 29's appearance baseline only. Candidate 30 is published for the user's Safari visual review; automated assertions cannot prove it looks attractive, that arms are legible at phone zoom, or sustained on-device performance. Check day/night and staff/customer activity at 1x/4x, then zoom/floor/selection and save/resume without starting a new game. Keep master unmerged.
