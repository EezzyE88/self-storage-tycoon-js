# F2 building-context repair — isolated candidate, 2026-10-22

## Source and boundaries

Parent: exact numbering candidate `1339648652cf61bfce23a96a60cbb54a7006c32a`.
Branch: `candidate/f2-building-context-20261022`.

Live refs reverified before implementation:

| Ref | Commit |
| --- | --- |
| master | f6e4c1eace1720dc703d8cd5758626b158b6aa03 |
| candidate/floor-unit-numbering-20261022 | 1339648652cf61bfce23a96a60cbb54a7006c32a |
| candidate/v62-open-house-20261022 | 9700d9d4475555e1a4907d1702cb8d81d31ded55 |
| snapshot/display-repair-b2c55a6-20261020 | 0385af259c35058da69ed7d6cbb29e2ab7619abb |

The live branch inventory contained no newer Open House successor beyond the numbering candidate. This repair branches directly from that numbered source. Nothing is merged or deployed. Accepted Site remains version 62, updated 2026-10-21T06:33:54.527842Z. The owner-private review Site remains version 3, updated 2026-10-22T17:46:21.083562Z, and does **not** contain this repair. Normal saves were not opened or written.

## Confirmed cause and resulting behavior

The renderer hides floor-zero room batches and meshes when an upper floor is selected. For drive-up buildings and the office this removes the whole visible building, leaving pavement. This is the reported defect, not intended floor behavior. The UI also fell back to selecting a shell on an upper floor that the shell did not have, and retained inspection of a previously selected unit on another floor.

`js/render.js` adds roofed context at each lower building's actual footprint and physical height. Completed standalone units and offices receive exterior massing when their floor is below the active floor. A shell receives exterior massing only when its highest completed floor is below the active floor. These are simple roof-and-body context representations, not detailed reproductions of each facade. They do not expose tenant contents or unit labels. Context meshes use instanced batches by building type and highest floor, without extra shadows or pick targets. Rebuilds clear and regenerate the context group.

Buildings that contain the selected floor retain the existing floor interiors and cutaways. Exterior and F1 retain the numbering parent's geometry and visibility; the extra context group is hidden there. Original lower-shell walls are hidden when their replacement massing is visible, avoiding coincident surfaces. No ground texture, overlay, traffic or cutaway animation code changes.

`js/ui.js` allows inspection and selection only for the active floor. Served elevator/stair landings remain inspectable. Switching floors clears stale cross-floor selection; direct selections and stale inspectors are guarded too. The fallback shell pick requires that shell to have the selected floor. The floor chooser explains visible context and no longer recentres the camera on the chosen building. Manual centre, zoom and rotation stay in place. Explicit focus/zoom/rotate controls retain their existing behavior.

Only these two runtime files change. Simulation, money/economics, internal IDs and relationships, floor-number assignments, tutorials/scenarios, pending construction orders, save schema, storage keys, export/import and Continue code remain byte-identical to the numbering parent. There is no save migration in this repair.

## Executed validation

Run from repository root with Node 24.19.0. Renderer tests construct real Three.js scene graphs with Canvas/GPU stubs: they establish geometry/visibility and UI behavior, **not** WebGL pixel correctness, frame rate or physical iPhone acceptance.

| Suite | Result |
| --- | --- |
| `tfloor_context.mjs` (new) | PASS |
| `topenhouse.mjs` | PASS |
| `topenhouse_qa.mjs` | PASS, 7 checks |
| `tthreefloor_save.mjs` | PASS, including production compressed reload at all five expansion stages |
| `tthreefloor_hardening.mjs` | PASS, 7,200 mixed journeys and four 30-day full simulation runs |
| `tthreefloor_journeys.mjs` | PASS, four customer/cart F3 journeys, 15 reload checkpoints, four outage recoveries, 36 burst callers |
| `tunitnumbering.mjs` | PASS, nine groups |
| `tunitnumbering_parity.mjs <unchanged-9700d9d-checkout>` | PASS, 30-day parity for three seeds and scenario start/migration parity |
| `tunitnumbering_vertical_legacy.mjs <unchanged-9700d9d-checkout>` | PASS, all five native parent construction phases |
| `tgestures.mjs` | PASS, 12 checks |
| `tpause_policy.mjs` | PASS, 13 checks |
| `tclock24.mjs` | PASS |
| `tsave_recovery.mjs` | PASS, 14 checks |
| `tthreefloor_parity.mjs` | Pre-existing failure, reproduced on unchanged 1339648: frozen Candidate 35 `data.js` differs from current source |
| `tcandidate22.mjs` | Pre-existing failure, reproduced on unchanged 1339648: expects `Building 12 · 1 completed floor`, current UI uses display building name and separate count |

The two numbering comparison scripts require the old parent path; initial argument-free attempts were corrected and rerun successfully. The two older failed suites were not modified or claimed to pass.

The new regression uses native completed three-floor gameplay state, standalone drive-ups/office, and synthetic one-/two-storey shells on free cells. Across Exterior/F1/F2/F3 and four camera orientations it verifies:

- Every shorter building remains represented, at its real height, only when below the active floor.
- Active floor interiors alone remain visible; inactive shell walls do not duplicate massing.
- Active units and served freight landings remain selectable; lower context and stale inspection are blocked.
- Direct floor switching and the real floor-chooser click preserve manual camera centre, zoom, azimuth and projection.
- Exterior/F1 retained scene geometry and visibility match the exact numbering parent.
- Repeated static rebuilds do not accumulate context. The mixed fixture uses at most ten instanced context meshes, independent of the number of units.
- Complete simulation/save-owned state remains byte-identical after scene building and view changes.
- Numbering, simulation, save and expansion source files remain byte-identical to 1339648.

Syntax checks and `git diff --check` pass. Runtime diff allowlist is exactly `js/render.js` and `js/ui.js`.

## Pending device acceptance

No iPhone instructions should imply this candidate is deployed. After a separately authorized exact-source preview exists, use only disposable native JS saves. Compare Exterior → F1 → F2 → F3 with one-, two- and three-storey buildings; verify lower buildings remain visible but cannot open cards, the active floor still can, manual framing remains unchanged, and returning to Exterior restores roofs. Check all four rotations, a selected unit while switching floors, normal explicit focus controls and export → reload → Continue. Physical Safari visibility, visual quality of the simplified context, occlusion and performance remain unverified.

Overlay coverage, vehicle overlap, general camera reframing and other visual polish remain separate work.
