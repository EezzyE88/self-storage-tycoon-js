# Floor-view follow-up — isolated, not published

Base art candidate: 294834dbc9ba88314315d24b4a290517bfbf40f0. Accepted master remains f70b81a0298a438577db1ee35934655e7858353f. Existing Safari preview remains the published weathering candidate.

Large floor buttons, current selection, per-building unit counts, empty-floor explanation and separated expansion controls simplify navigation. Ground-floor light glows now hide with their fixtures on upper-floor views. No floor-filter semantics, simulation, economy, saved data or capacity changes.

Validation: tfloor_view.mjs passes empty and fitted-out upper-floor cases using the actual chooser action handler and sequential F1 → F2 → F1 → Exterior; units and lights return and exact simulation state is preserved. Six tart_refinement groups, eleven twhole_game_art groups, five seven-day tthreefloor_parity scenarios, syntax and whitespace checks pass.

Four actual matched software-WebGL pairs against accepted master have equal state hashes and camera values, with no page errors. Empty F2 has zero units, fitted-out F2 shows all fourteen upper units. Master has four orphan ground-floor glows on both upper-floor fixtures; candidate has zero. Phone viewport 390×844 DPR2. Lighting is overridden to night; HUD fixture time is independent. Sequential navigation is covered by the focused test, rather than inferred from separate screenshots.

Physical iPhone acceptance of this follow-up remains pending. Eddie reported the prior art preview felt great until F2; the F2 screenshots show the confusing empty floor and orphan glows, without build identity. No claim of physical FPS or dense-property acceptance.
