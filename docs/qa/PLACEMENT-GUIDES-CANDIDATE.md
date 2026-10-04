# Placement guides candidate — 2026-10-04

Isolated branch: candidate/tutorial-placement-20261004. Parent f0068df3f7a08efb2e5d51e5148fd04c4ce560e8; B+ ancestor fa0615659077931c8a02dd6f3792b39f9bffb2ff. Accepted master remains 2812abf8d268f9a225e5786d173f95efcbd6223d.

Reviewed all 20 supplied screenshots IMG_3158, 3160–3166, 3168–3179. IMG_3158/3161 show only a single drag marker; IMG_3162 shows a two-unit preview without a complete tutorial row outline. IMG_3168 shows the surrounding ChatGPT Preview pulled down. User accepted direct Safari handoffs for that host gesture.

Changes: all authored tutorial construction groups now provide exact review-only placement targets, full planned footprints, row subdivisions, door-facing marks, Start/End labels, and suggested placement controls. Climate row starts at valid corridor row 5 and ends at row 11. Obstructed rows search nearby valid frontage and shorten only when the full row cannot fit. Guides remain visible during placement. Upstairs markers use the renderer's FLOOR_H (1.9), correcting a stale height of 3. Two-floor guidance continues to follow the actual shell. No automatic spending; Confirm still authorizes construction.

Validation: 33/33 headless scripts passed after fixing the occupied-row fallback; 26 blueprint/recovery checks and 7 menu/touch checks passed again after the final guide presentation/cache changes. Syntax and diff whitespace checks passed. Simulation, finances, tuning, local saves and schema unchanged from parent. Earlier failed test run exposed missing shortened-row fallback; fixed and retested.

Release state: candidate, unmerged. No new browser or physical-iPhone gameplay test. Headless checks do not establish physical touch usability. Same owner-private Preview; source fidelity verified separately after deployment. Direct Safari link required for handoff.
