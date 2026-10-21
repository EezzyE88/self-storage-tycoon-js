# Control-framing follow-up — local candidate

Status: source corrections implemented and focused Node checks passed. Browser/physical Safari NOT TESTED. Not accepted or ready for publication.

Exact parent: 5fa5f5ee357176fcf68533752fc454f6e477d1cf.
Local branch: candidate/control-framing-followup-20261020.

## Corrections

1. A modal present when framing is requested, or opened before the callback executes, invalidates the handled key. Closing it lets the ordinary UI update retry the current placement. This includes a previously framed placement that is resized beneath a modal.
2. framePlacementReview reprojects after bounded zoom/pan and returns true only when all bounds fit the available rectangle with the intended margin. Camera-limit failures return false; the scheduler retains that result in transient UI state. An unsuccessful bounded attempt is not repeated every frame. Existing camera limits are unchanged; this does not promise that arbitrarily large footprints can fully fit on a short screen or add an automatic fallback UI.
3. Control measurement and ResizeObserver include the visible expanded camera menu. Changed control/card extents request a fresh framing attempt; stable extents do not. Phone feed positioning also uses the measured extent while the menu is open, overriding the older fixed 172px offset.

## Verification

- tcontrol_access.mjs: eight reported groups passed. Includes controlled 375x667/390x844 camera fitting, existing/new-modal deferral, previously consumed keys, minimum-zoom failure, no-op/clamped-pan failure, expanded-menu open/close measurement and no continuous correction after an impossible fit.
- tpause_policy.mjs: all 13 groups passed.
- tsandbox_build_pause.mjs: all 16 cases passed.
- tgestures.mjs: all 12 groups passed.
- tfinancial_trust.mjs and tmenu_touch.mjs passed.
- Syntax and diff whitespace checks passed.
- Camera tests use actual Three.js projection/camera math with renderer/canvas boundary stubs. DOM rectangles and expanded-menu dimensions are controlled test inputs. These are not browser layout, WebGL or physical-device measurements.
- No browser download/retry or browser session was attempted for this follow-up. Both requested browser viewport interaction suites and physical Safari remain NOT TESTED under the previously documented missing-Chromium blocker. The prepared browser harness has not been validated through execution.

Production changes from the parent are limited to js/ui.js and css/game.css. The simulation, renderer/camera limits, finance/economics, main input, and persistence files are byte-unchanged. Accepted 7346fb686c86801556fb918d27b62a427cd293fe, protected 2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d, the original 5fa5f5e branch, master and deployments are preserved. No push, synchronization, merge or deployment.
