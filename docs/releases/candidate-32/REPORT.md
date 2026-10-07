# Candidate 32: persistent section chooser

Parent: Candidate 31, dbc895cc2d471d3bcd13c36a624da9859e9878a1.
Branch: candidate/persistent-section-menu-20261007.
Build: bplus-section-menu-candidate-32.
Accepted master remains 055d2a871945c565c3affbda89ecd46be7a4cfac; no merge.

## Problem and fix
The physical-iPhone report says Choose section closes when other things happen. Candidate 31 renderSheet replaces the whole panel on forced or changed-content refresh, removing the native select. The regression reproduces panel replacement using the exact Candidate 31 method; native Safari dismissal is reported physical evidence, not reproduced in a browser here.

Replace the native picker with explicit section buttons and a Close button. While open, defer same-panel refreshes, retaining the actual DOM nodes, focus/tap target and scroll. Choosing scrolls to the matching heading; Close refreshes current panel content. Choice label survives subsequent refreshes. Explicit Back to map, panel navigation, selection and property reset clear transient chooser state. Existing desktop section shortcuts remain. Tutorial targets retain data-section-picker. No unrelated request, rendering, audio, simulation, economy or save code changes.

## Validation
13 relevant headless scripts pass. Ten new checks cover the previous replacement path, 120 forced/background refreshes with prior 4x, Operate/Business/Growth choices, selection and scroll, repeated taps, explicit close, manual Pause, nested request hold, navigation/reset, Back to map and state round-trip. Production compressed save/reload, approved request/pause, audio, grouping, renderer and guidance regression scripts pass. Syntax and diff checks pass. Browser automation selector for the existing Hire tutorial updated for button choices, but that browser script was not executed.

## Limits
DOM fixtures and headless checks are automated evidence. Physical-iPhone verification of this fix remains pending. Genuine owner request modals may still cover the panel; the open chooser remains underneath and does not waive owner decisions. Panel content waits to refresh while choosing. Transient open-menu state is deliberately not saved; load starts a clean UI as before. Historical Candidate 19 simulation parity failure remains previously known and unrelated.
