# Soft-edged weathering correction

Branch: `candidate/whole-game-art-20261010`. Parent/before baseline: `bf7704b485f07f34d4c0f3c7b4c9952c63894275`. Build: `bplus-whole-game-art-weathering-20261010`. Unmerged and unpublished.

## Change

Replace the twelve hard rectangular grime stamps in the shared 128×128 worn-roof texture with seven soft radial runoff streaks aligned to the panel ribs and a gradual eave stain. Preserve the warm worn material, clean/restored finish, exact six-target readiness logic, architecture, status bands and symbols. Gradients are generated once with the existing shared material; no extra geometry, textures, shadow casters or per-frame work is added. The surface treatment remains a visual restoration cue, not a new roof repair task or damage mechanic.

Production changes are only the `weatheredRoof` texture-generation block in `js/render.js` and the build identity in `js/version.js`. All other production files, including economy, simulation, layout, placement, scenario restrictions and save handling, are unchanged from the parent.

## Focused validation

Three affected scripts passed: `tart_refinement` (six groups), `twhole_game_art` (11 groups), and `tcomeback36` (recovery regressions). Exact logs and exit statuses accompany this report. These retain individual six-unit restoration, access-loss/malformed-mapping safety, architecture/status-band behavior, rebuild reuse, and save/step/economy/RNG parity. Syntax and whitespace checks passed. The nine-script suite and dense workload benchmark were not unnecessarily rerun for this texture-only change; the prior dense-property performance risk remains unresolved.

Two matched actual production-game pairs cover unready and restored Comeback. Baseline is an immutable archive of the exact parent. Both pairs preserve identical serialized simulation-state hashes and camera values; no page errors occurred. Four original PNG hashes, runtime source hashes and capture metadata are retained. Capture uses the existing harness with `SST_ART_SCENES=comeback-unready,comeback-restored` and `SST_ART_BASE_SHA=bf7704b485f07f34d4c0f3c7b4c9952c63894275`.

These are controlled Chromium SwiftShader WebGL captures at 390×844 touch viewport and DPR 2, using the existing phone property-fit view and disposable local origins. Restored state uses disclosed direct completion of existing tasks, not elapsed player-work evidence. Noon lighting is overridden while the HUD retains fixture time. No user save or live preview session was used. Before/after pairs compare the same state; worn/restored are separate fixture states. This is not physical iPhone acceptance or FPS evidence.

## Assessment

The specific rectangular-weathering art defect is corrected; soft staining preserves visible worn/restored contrast. Ready for visual review and, if separately authorized, a controlled iPhone preview check. Final physical-device visual/performance acceptance remains pending. The previous 40.5% dense-fixture triangle increase and overview cue-readability limits are not resolved or reclassified by this correction.

## Protected state

Accepted master remains `f70b81a0298a438577db1ee35934655e7858353f`. The Safari preview remains https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site with independently verified publication `b2faa4baa8da8d470e142480ef9229485a73b46b`, build `bplus-yard-view-candidate-41`. No merge, publication, economy change or user save access/write.
