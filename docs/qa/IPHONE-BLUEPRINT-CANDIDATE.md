# iPhone blueprint candidate — review status

Repository: EezzyE88/self-storage-tycoon-js only.
Branch: candidate/iphone-blueprint-20261004.
Immediate base: 276b524c1312f79995594d6afe5c4dade3e2001c.
B+ base: fa0615659077931c8a02dd6f3792b39f9bffb2ff.
Accepted master remains 2812abf8d268f9a225e5786d173f95efcbd6223d.

## Changes

- Vertical lesson derives suggested geometry from the actual lesson-created two-floor shell. Fixed coordinates no longer govern later steps. Recovery uses existing object/order IDs; no new save fields.
- Visible footprint and access outline, dimensions, entrance/loading/elevator labels, current Start/End markers. Camera projection follows rotation. Suggested placement prepares a single ordinary build review; Confirm is still required for spending.
- Nearby manual rectangle endpoints snap to the suggestion. Placement elsewhere remains allowed.
- Hallways, lights, elevator adjacency, upstairs units and graduation are scoped to this building. Ready/commissioned checks use normal simulation access diagnostics, including elevator power/condition.
- Recheck reports real unit diagnostics or the next missing piece. Show me where centers the current piece. No automatic demolition or all-at-once build purchase.
- Tutorial shows the current step with expandable instructions and primary actions outside scrolling details. Build idle strip and held placement remain compact; financial review appears after release. Confirm/Flip and Close stay outside the review scroller.
- Clipped, covered or disabled DOM targets receive no false Tap here cue. Map cues/bubbles hide under panels; bubbles clamp horizontally. Celebrations wait behind active lessons, requests and build/menu interactions.
- B+ financial processing, economy constants, save serialization, Pause/weather behavior, pinch/pan, rotation, floor controls and automatic initial camera fit are unchanged.

## Reproducible checks

Run with Node 24 from repository root:

- `node tests/headless/tblueprint.mjs`: 13 PASS. Working default blueprint; three offset shells (28,4 / 30,5 / 29,7); mirrored plot; save/resume; wrong-building/floor and historical milestone rejection; no-spend review; snap bounds; broken elevator access; fixed-action markup; four rotated projections; clipped/covered/disabled target rejection.
- `node tests/headless/tmenu_touch.mjs`: 7 PASS.
- `node tests/headless/tbplus.mjs`: 21 PASS.
- Broader scripts: tfinancial_trust, tcapacity, tfin, t9, t9b, t9c, t9d, t9e, t9f, tads, tstaffing_compare, tsandbox, tvert, tclim, tbugs, tfix, tcalm: all 17 exit 0. Vertical scenario wins Day 145; climate scenario wins Day 61. These existing scenario operators are regression evidence, not claims of beginner playability.
- Syntax and `git diff --check`: PASS.

Browser rendering remains unverified: local Chromium is absent and its download returned an invalid/truncated archive. Headless geometry and markup checks are not Safari rendering or physical iPhone tests.

## Next physical Safari check

1. Resume an existing save; verify cash, bills, leases and next billing dates.
2. Open Finance and Calendar; scroll to the bottom and close using the visible X.
3. Start the two-floor lesson. See the full footprint, then prepare suggested placement. Verify no money moves before Confirm.
4. Place the shell slightly differently; verify hall, entrance, loading and elevator markers follow it. Rotate and switch F1/F2.
5. Hold/drag: only compact cost/status appears. Release: spending review and reachable Confirm/Flip.
6. Finish the upstairs route and commission units. Recheck any deliberately missing connection. Save and resume mid-lesson.
7. Verify graduation button stays visible; requests, lessons and celebrations do not stack over each other. Pause freezes game/weather; closing blocking dialogs returns to 1x.

Candidate only. No accepted-master merge; physical iPhone acceptance pending.
