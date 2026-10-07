# Candidate 31 — architectural shapes, vehicles, people and quieter labels

Starting GitHub branch/commit and Safari source verified as Candidate 30 `8a344eea7c799b8a6a169e54e72f21f70136e663`, build `bplus-dollhouse-visuals-candidate-30`. All 32 served hashes matched local source before editing. Master remains `055d2a871945c565c3affbda89ecd46be7a4cfac`. Supplied physical-iPhone screenshots show improvement but are not full Candidate 30 acceptance.

## Changes

Door surrounds and exposed roof-edge trim use shared box geometry, batched per floor/material (up to six architectural batches across F1–F3). Roof edges between adjoining completed drive-up units are omitted. The office entrance has a wider canopy, two slim supports and stronger roof trim. Small shrubs appear only in empty grass alongside completed offices, with no changes to simulation objects, footprints, access or landscaping costs. Pavement/grass contact is softened on the existing ground texture.

All five vehicle types have four tires/hubs; moving vehicles rotate their wheels from rendered travel, with teleport/fresh-spawn jumps excluded and manual Pause preventing added wheel rotation. Cab pillars, front bumpers and pickup/box-truck windshield faces make them more recognizable. Customers/staff have separate trousers and shoes with opposed leg strides. Existing carry/cart/work arm gestures remain; carrying at the unit adds a small handling motion only when actual `carry` state is present. Pool reuse resets strides; private shared pants materials dispose once. Instanced-mesh buffers now receive explicit disposal during scene cleanup.

Close-up healthy occupied labels use compact unit numbers. Selection retains full status and wins overlap ordering; other unit states retain full labels at close zoom, existing exception pins/badges are unchanged. Accessible label text still includes full status. Labels remain noninteractive; map gestures, selection and guides keep their original logic.

No audio, simulation, economy, leasing/request/pause logic, save format, catalog or tutorial edits. This pass is presentation only.

## Validation and measured costs

18/18 relevant regression scripts pass; 10 new checks cover batching, floors, instance disposal, all vehicle types, travel/pause wheel animation, leg/carry poses, recycling, running state/RNG parity and actual label behavior. A 300-tick real simulation with rendering matches an identical control without rendering. Existing 9 Candidate 30 presentation checks, status/hierarchy, gestures, menus, request/pause (53), softer audio (33), bubble grouping, save recovery, production compressed F3 saves and blueprint checks pass. After eliminating covered roof edges, affected rendering tests and the workload comparison were rerun. Historical Candidate 19 parity failure documented in Candidate 30 remains; it was not used as a passing gate or modified here.

Paired Node/Three.js fixtures compare Candidate 30 with final Candidate 31 across daylight, night, rain, a commissioned F3 property and a 550-unit property. Moving crowds/vehicles are scripted render inputs at speed 4, including walking, at-unit carrying and stationary staff work; this is not a customer-routing or economy workload. Nine alternating repetitions report medians. These counts include all scene meshes, even hidden ones. Mesh counts are draw-cost proxies, not actual GPU draw counts.

| Fixture | Scene meshes before→after | Triangles before→after | Shadow casters before→after | Dynamic workload ms before→after |
|---|---:|---:|---:|---:|
| Day, 20 people / 8 vehicles | 483→626 | 26,680→32,464 | 313→293 | 0.009→0.017 |
| Dense, 100 people / 24 vehicles | 4,384→4,919 | 79,588→122,420 | 1,823→1,715 | 0.036→0.060 |

Unique geometry and mapped-texture counts stay identical. Two additional material references in ordinary fixtures and three in dense fixtures use already-created shared materials. CPU-side instance attribute arrays rise by 6,016 bytes in the ordinary scene and 144,128 bytes in dense; these are not total GPU-memory figures. Dense rebuild median is 41.716→44.445 ms; ordinary daylight is 3.259→4.813 ms. This adds real geometry and crowd draws rather than promising a free visual upgrade. No new lights, shadows or textures; dense GPU/thermal performance is pending.

## Acceptance limits

Managed browser QA is unavailable because the supported control-browser skill is absent. Measurements use stubbed Canvas/WebGL with real Three.js scene construction, not raster screenshots, actual draw calls, GPU timings, physical Safari FPS or thermal/battery behavior. No new on-device visual acceptance is claimed. User screenshots are the baseline only. Safari review should check roof/door trim, office identity, label clutter and moving cars/people at normal and close zoom, day/night/rain, floor switching and save/resume. Keep master unmerged.
