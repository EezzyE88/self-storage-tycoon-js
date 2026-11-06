# Maple Street Visual Lab — local prototype, November 6, 2026

Phase 0 and the first visual-only prototype are complete locally. No product acceptance, beta, release, publication or permission change is implied.

## Exact source

Authoritative repository: https://github.com/EezzyE88/self-storage-tycoon-js

Fetched full Git history, verified GitHub commit metadata and live cloned `origin/master`, then created isolated branch `visual-lab-phase0` in `/workspace/sst-lab` from exactly `53fb2b38c4f15fd651d3cf478a815e1408b8e4d9`, baseline tree `812ac6bd1906303b3bdf75e3229cb1b66b020ecb`. The original checkout remains at that baseline. Comparison with gameplay ancestor `d7f49903076fd6bb3a70189b7e6efb9a7c0d9db9` confirms the intervening changes are documentation only. Final local commit/tree and bundle hashes are in the companion `/workspace/SST_VISUAL_LAB_RECOVERY.md` to avoid a self-referential commit identity.

START_HERE and Runtime v3 revision 5 were read completely. The governing runtime is retained here unchanged. No push, merge, deploy, expenditure, outside message or acceptance change occurred.

## Phase 0 review and implementation

Reviewed the retained standalone adapter against exact `render.js`, `main.js`, Maple initialization, customer state machine and UI controls before integration. Shared `renderer.mat` objects are created once and retained by `rebuildStatic`, `clearStatic`, dynamic cleanup and `setSim`. The palette entries are shared materials, not disposable per-object clones. The renderer has no full renderer-replacement/disposal path in current startup. Existing context-restoration rebuilds reuse those materials. No geometry, GPU material or texture is allocated by the Lab; disposing restores original colors/roughness and clears captured references.

The original adapter's color/roughness snapshot approach fits this lifecycle. Kept its palette and read-only visitor metadata; added a URL-opted-in, session-only control, reset on game/property attachment, and close/disposal. Control handlers never dispatch simulation actions or save preferences. Keyboard Space/Enter activation is kept out of the existing game shortcuts so toggling cannot also change Pause. A new renderer would need a fresh adapter if a renderer-replacement path is added later.

Changed production files:

- `js/visual-lab.js`: retained adapter plus small comparison control and cleanup.
- `js/main.js`: import, opt-in `?visualLab` installation, attachment reset and presentation update only (four added lines).
- `css/game.css`: four scoped rules for a collapsible control above bottom navigation, with 44 CSS-pixel targets and safe-area offsets.

Changed test files: `tests/headless/tvisual_lab.mjs`, `tests/headless/tvisual_lab_integration.mjs`, `tests/browser-qa/visual-lab.cjs`, and two added entries in `tests/headless/current-regressions.json`. Supporting evidence is this directory.

The Lab defaults to Original and is absent without `?visualLab`. Its controls appear only on Maple Street, hide for title/modals/tabs/build tools/expanded teaching cards, and remain collapsible during map interaction. Close Lab restores original materials and removes listeners/DOM. Changing the attached session restores Original. Existing audio and FX remain untouched.

Byte-for-byte protected-source checks are retained in `protected-source.json`: simulation, data, finance, Maple, tutorial, audio, FX, all save modules, cloud, UI and renderer match the exact baseline. No normal saved company was loaded or modified; only disposable intercepted browser origins were used. Normal Pause autosave remains active on those disposable companies. Budget remains $0.

## Verification

PASS — seven focused Node test files, 0 failures in `native-final.txt`:

```sh
node --test tests/headless/tvisual_lab.mjs tests/headless/tvisual_lab_integration.mjs tests/headless/tpause_policy.mjs tests/headless/tpaused_autosave.mjs tests/headless/tworking_yard_save.mjs tests/headless/tstartup_graphics.mjs tests/headless/topenhouse.mjs
```

These cover adapter stubs, real Three.js shared materials with a stubbed GPU, exact rebuild/dispose restoration, read-only state at Pause/1x/2x/4x, 2,000 deterministic simulation minutes with toggling versus no adapter (complete state and event equality each minute), existing Pause policy, paused autosave, repeated raw/compressed save preparation/load with cash/report equality, graphics startup and scene construction. The two new tests were rerun after the final adapter change (`adapter-final.txt`); keyboard behavior was then verified in the final browser run. Neither CPU scene construction nor Node tests prove GPU output.

PASS — actual production UI and WebGL in Chromium at 375×667 and 390×844, DPR2 and touch emulation:

```sh
node tests/browser-qa/visual-lab.cjs /workspace/sst-evidence
```

Requires installed Playwright and `/usr/bin/chromium`; no package installation was needed. The harness intercepts a disposable origin to serve the actual checkout, blocks external requests, and holds RAF to capture identical moments. It uses `makeMaple(4401)` with a disclosed test-only operating-company fixture (tutorial disabled, property open), then lets the existing simulation run its pre-scheduled visits. It does not create, route, park or fast-forward an individual visitor.

After 943 simulation steps, at minute 1364, real customer 85 was walking inside the building at (20.5, 10.46), targeting interior unit 16. Real pickup 84 remained parked at cell 680. After another 15 normal simulation steps the same customer reached `atunit`. This is genuine simulated customer activity within an accelerated disposable setup, not novice/tutorial progression evidence or a wall-clock play session.

The A/B screenshots hold that actual visit under manual Pause for a fair same-state comparison. A renderer-only noon/clear override makes the palette legible; the HUD retains the actual 10:44 PM simulation time. Camera is fixed between A/B states. This lighting override is test-only and does not change simulation weather/time or production lighting behavior.

Browser assertions passed for original/experimental toggle, unchanged complete state/save serialization/localStorage across Lab-only switching and rebuild, exact full material restoration, active-state toggle, normal UI Pause/resume, scene rebuild, zoom, cleaning overlay, 44px touch target/viewport bounds, touch activation, keyboard Space/Enter without speed change, session attachment reset, enabled cleanup/close restoration, and Lab absence without the query parameter. Both contexts had zero page errors. Browser results are in `browser.json`; scripts throw on any failed assertion.

| Viewport | Original / experimental draw calls | Original / experimental triangles | Geometries | Textures |
| --- | --- | --- | --- | --- |
| 375×667 | 302 / 302 | 41,620 / 41,620 | 10 / 10 | 42 / 42 |
| 390×844 | 296 / 296 | 41,578 / 41,578 | 10 / 10 | 42 / 42 |

Counters include the complete frame with info auto-reset disabled and a reset before each measurement. These are graphics workload/resource snapshots, not FPS, physical GPU or thermal qualification.

Visual inspection: the same customer, pickup, boxes, unit statuses, numbering and geometry remain present. Experimental walls/boxes are slightly softer and trim is cooler/darker teal. The difference is modest by design. Labels clearly identify the selected state. The collapsed control does not cover Pause, guidance or bottom navigation; expanding it deliberately covers part of the yard and collapsing it returns the view. Screenshots `375-original.png`, `375-experimental.png`, `390-original.png`, `390-experimental.png` and both `*-controls.png` retain the actual output. A first placement overlapping guidance was corrected before final captures.

PASS — exact protected-source byte comparison and `git diff --check`.

Resolved verification/setup failures: the initial network-disabled shell could not reach its proxy; enabling sandbox network access allowed a full clone. The initial paused-autosave test hit `spawnSync git EPERM`; its rerun with subprocess access passed 14 groups, and the final combined run passed. An initial browser assertion incorrectly included normal manual-Pause autosave in a Lab-only storage invariant; corrected the test boundary to compare storage/save before invoking normal UI Pause/resume. The Lab-only invariant passes, and normal Pause still saves. Initial logs are retained; no production save behavior or assertion requirement was weakened.

NOT RUN — full native release gate, physical iPhone/Safari, real-device performance, listening/audio playback qualification, real-company save session, novice comprehension/enjoyment and beta/release acceptance. Audio/FX preservation is established by unchanged source, not a listening claim. This bounded prototype uses existing native controls with no new gesture handling; no unresolved observed iPhone-specific defect currently requires a physical-device gate for local technical completion. Device review is still useful before adopting/publishing the control.

## Review and recovery

Run locally from the recovered checkout using any static HTTP server (for example `python3 -m http.server 8000`), open `http://localhost:8000/?visualLab`, and start/continue a disposable Maple Street company. Expand Visual Lab, try the palette, restore Original, or Close Lab. Omitting the query gives the ordinary game. The Lab does not force activity or advance time: use existing player time controls. Automated evidence runs from the repository root with the commands above.

Remaining risks: visual preference is not acceptance; physical Safari/fonts/safe-area/device performance are untested. Screenshots use fallback fonts because external font requests were blocked. The existing status materials can dominate door colors, and shared material changes also affect Maple scenery using those materials. This is an intentionally small palette comparison, not a new art system. Browser results use software ANGLE/SwiftShader, deterministic capture and a synthetic company setup with natural customer activity.

Recommended next action: authorize pushing only the preserved isolated candidate branch for review. Its focused technical checks and reversibility support review, not merge/deploy or adoption. A complete Git bundle and independent empty-checkout recovery verification are preserved beside this checkout; see the companion recovery note for the exact commit/tree and checksums. No push is authorized by this recommendation.
