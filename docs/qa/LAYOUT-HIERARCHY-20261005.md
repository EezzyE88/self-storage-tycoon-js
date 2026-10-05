# Candidate 19: candidate 18 review corrections

Base: candidate 18 `f2f31b05519f831e5f13783de7fabe83afc4a4cf`.
Branch: `candidate/layout-hierarchy-20261005`.
Build: `bplus-layout-hierarchy-candidate-19`.
Accepted master remains `2812abf8d268f9a225e5786d173f95efcbd6223d`.

## Changes
- Opening camera controls immediately suppresses coach advice; incoming messages move below the camera popover instead of disappearing. CSS also guards the overlap between repaint ticks.
- Overview projects actual built footprints, with a one-cell context margin and height allowance. It excludes phantom corners of the rectangular envelope around an L-shaped estate. Empty estates still frame the parcel. Four double taps still return to overview.
- Vacancy, near-full and repair advice uses concise action labels. The full advisory remains in the accessible label/title; the existing tap action opens its original destination.
- Mobile management sheets offer a complete native section chooser instead of clipped horizontal shortcuts. Inspector task actions remain outside collapsed details. Menu settings are grouped; financial assumptions fold away; report remedies precede cause/context. All original save commands remain available.

## Verification
47/47 headless scripts passed in the final full run. Results are in `layout-hierarchy-results-20261005.json`.
The new layout test was also rerun with actual camera azimuths at all four quarter-turns, confirming footprint containment and tighter Maple framing. Rendering is read-only against the saved simulation state.
Existing gesture, commission/cleaning, complaints, finances, save, scenario and nested-popup tests passed. The intentional 1x resume policy is unchanged. Simulation, finance, persistence, rules and economy source files are unchanged from candidate 18; runtime edits are restricted to CSS, rendering, UI and build identification.
No browser screenshot or physical Safari PASS is claimed by these tests.

## Safari acceptance
Verify build 19 after refresh. Open camera controls while vacancy/repair advice is showing; all camera buttons and incoming requests should remain reachable. Fit the estate in portrait and landscape, and complete four double taps. Open each mobile section chooser, including Pricing, Financing, Collections, Feedback and Growth destinations. Check commission/cleaning task buttons, save/load, and closing nested panels resumes at 1x. Visual acceptance remains HOLD pending on-device screenshots/playtest.
