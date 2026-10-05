# Candidate 17 — visible actions and cycling zoom

Base: cf6e6195da66ddbbe7a18137e7fbb0632529fe78. Master stays at 2812abf8d268f9a225e5786d173f95efcbd6223d.

The supplied Safari screenshots are a failed usability finding: compact tutorial cards hid Got it; compact unit inspectors hid commissioning; expanded inspectors filled the screen with empty space; expanded tutorial instructions prevented the requested 1x action.

Changes:
- Double tap has three strictly closer camera levels, then returns to a newly fitted property overview on the fourth. Tap anchoring, delayed single selection, drag, pinch and build cancellation remain intact. New properties reset the sequence.
- Completion and work assignment actions are outside collapsed inspector information, including individual/order/all commissioning, make-ready, cleaning, delegation and vendor booking. Existing costs, disabled state and commands are retained.
- Compact tutorial completion actions remain visible. A clock action can collapse tutorial/scenario instructions; it cannot bypass requests, modals, construction review or management details.
- Expanded inspectors size to their content. Smaller build cards and top controls reduce obstruction. Framing measures visible controls and fixes the landscape right-side-dock calculation.
- Intentional safe 1x resumption after events/popups remains in effect.

Validation: all 45 headless scripts passed. After final UI adjustments, focused UI, feedback and gesture tests passed again (21 UI checks, 12 gesture checks). Gameplay/economy source is unchanged from candidate 16. These are executed headless tests, not browser or physical Safari visual acceptance.

Safari next test: four double taps; compact Got it; commissioning individual and whole order; make-ready; close short details; build menu in portrait/landscape; request popup at 4x followed by safe 1x. Visual acceptance remains HOLD until the player confirms the revised menus are usable.
