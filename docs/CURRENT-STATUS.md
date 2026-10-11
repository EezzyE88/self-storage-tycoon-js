# Self Storage Tycoon current status and next gameplay milestone

Updated 2026-10-10, America/Los_Angeles. Repository: `EezzyE88/self-storage-tycoon-js` only; standalone JavaScript/Three.js.

## Accepted baseline and publication

Eddie approved and completed a fast-forward-only merge of the whole-game art and floor-view candidate into master on 2026-10-10. Accepted runtime source: `8cd99b3313afe05ec9785d07db8f7f2717cf515d`, tree `a99fbc20cf1ba7625f74d9ba763b073c2c58e287`. Former master was `f70b81a0298a438577db1ee35934655e7858353f`; the four candidate commits descend from it without divergence. Branch `candidate/whole-game-art-20261010` retains the accepted runtime source.

Safari preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

Build: `bplus-floor-view-20261010`. Hosting version 47 was published before acceptance. The preview was not republished during the merge or this documentation update. Source proof and all 62 hashed served files matched during the focused merge review; all 38 runtime hashes matched the candidate's Git bytes. The manifest's `accepted_master` field records the publication-time baseline, not current GitHub master.

This documentation-only follow-up advances master without changing runtime bytes or the preview. No new game build or Candidate number is implied. User saves were not accessed or modified.

Status: accepted development baseline with scoped physical iPhone PASS. No blanket whole-game device acceptance or commercial-release claim. This assessment supersedes historical pending/HOLD wording in earlier art and floor-view reports.

## Scope of the integrated stack

The merged stack includes staff request handling, owner decision dismissal and pause controls, retention/availability fixes, softer audio and interruption handling, presentation improvements, persistent section menus, historical climate diagnostics, aligned shopper-report periods, concise feedback, Comeback Yard, rescue-to-career integration, optional yard infill and door-side preview framing.

Global economy coefficients and save-format/storage modules are unchanged by that stack. Request timing, the authored Comeback starting situation and career eligibility are intentional behavior changes; earned existing career perks can affect operations. That earlier integrated stack is not simulation-identical to its pre-Candidate-41 baseline `055d2a871945c565c3affbda89ecd46be7a4cfac`.

The latest accepted update adds whole-game office identity, façade relief, stable product finishes, live status bands/glyphs, material contrast, localized six-unit restoration weathering, easier floor selection and floor-scoped light glows. Its production diff from former master is limited to `js/render.js`, `js/ui.js`, `js/version.js` and `css/game.css`. Simulation, global economy, save handling, authoritative layouts, scenario restrictions and the two-unit extension definitions are byte-unchanged from that former master.

Current release limits: three playable floors and five company properties. The GDD is target design, not evidence of implemented or accepted features. JavaScript is this project's simulation authority regardless of legacy C++ wording in design documents.

## Physical iPhone evidence supplied by Eddie

| Scope | Reported evidence | Acceptance boundary |
|---|---|---|
| Candidate 37 | Rescue acknowledgement, career access, expandable rescue history and Save -> reload -> Continue PASS | These tested integration/persistence behaviors only |
| Candidate 39 | Ambience-only app switching reported "No noise" | The reported audio interruption scope only |
| Candidate 40 | Eddie voluntarily and deliberately built more after previewing the row extension | A deliberate continuation/building choice; no sustained-enjoyment inference |
| Candidate 40 | Expanded-yard units and progress survived Save -> reload Safari -> Continue | Save continuity for that tested yard |
| Earlier yard screenshots | Two-unit preview at the preferred angle showing unit doors, drive aisle and extension together | Observed presentation; screenshots do not show a build identifier |
| Separate later loaded run | 25/25 leased from the 23-unit fixture | Supports added capacity becoming operational and rented; exact commissioning actions are unreported |
| Continued operation | Play reached Day 45 with repairs, cart demand and overdue rent appearing; completed rescue history remained visible | Continued operating behavior and visible completed history; not full-system enjoyment acceptance |
| Published art preview | Eddie reported “It felt great until looking at floor 2”; screenshots show a 60-unit property in day/night and different zooms | Positive reported experience up to F2; no measured FPS, dense-property acceptance or new save/reload claim |
| F2 issue | Screenshots show ground-floor objects absent and orphan nighttime glows; disposable reproduction found the same behavior on former master | Existing confusing floor filtering and a confirmed glow defect, not a new art regression |
| Published floor-view follow-up | Eddie replied “Pass” to the focused chooser clarity, F1 → F2 → F1 and nighttime-light check at 20:36 Pacific | Reported physical iPhone PASS for that scope; closes the focused F2 hold |

Treat separate loaded runs separately. Independently verified deployment identity does not retroactively identify a screenshot without a build label. Do not infer card-spacing acceptance, physical Return to placement camera preservation, exact commissioning actions or sustained enjoyment.

## Automated and source evidence

- Candidate 41's committed `docs/releases/candidate-41/headless/results.json` records 84 successful final script executions after four missing-input harness invocations were corrected. Initial failures and retry logs remain intact. `tv` and `tw` are placement diagnostic helpers; successful executions are not 84 assertion suites or physical gameplay journeys.
- During the earlier Candidate 41 merge review, all 60 served manifest files matched their hashes. All 38 runtime files also matched exact Git bytes at Candidate 41 commit `b2faa4baa8da8d470e142480ef9229485a73b46b`.
- Existing save evidence covers rescue checkpoints, raw/compressed exports, portfolio import/export and Continue. Existing career evidence covers eligibility, thresholds, excluded scenarios, tier inheritance and bookkeeping. Capital/threshold fixtures isolate transitions; they do not prove organic acquisition affordability.
- Additional merge-review check: `SST_TEST_AUTOSAVE_DELAY_MS=100 SST_TEST_PRODUCTION_AUTOSAVE=1 node tests/headless/tsave_recovery.mjs` passed 15 groups, including stale-session and pagehide sequencing. This was executed against Candidate 41 using storage doubles, not physical Safari storage. It is a review-session result; no new captured log was added to the historical Candidate 41 suite.
- Art refinement: nine focused scripts passed; the later soft-weathering change passed three affected scripts. These retained results are not a rerun of the historical 84-execution suite.
- Floor-view follow-up: empty and fitted-out F2 passed the actual chooser handler and sequential F1 → F2 → F1 → Exterior with exact state preservation. Six art-refinement groups, eleven whole-game art groups and five seven-day simulation-parity scenarios passed. Four matched actual software-WebGL pairs have identical state/camera values and no page errors; the four orphan ground-floor glows became zero on F2 while fitted-out F2 retained all 14 units. These checks are separate from physical Safari acceptance.
- Current publication/merge review: source proof, 62/62 served hashes and 38/38 runtime-to-Git hashes matched the accepted art/floor-view source.
- These are automated/source checks, not blanket physical-device acceptance. No full suite rerun is required for this documentation-only update.

## Release assessment and remaining limits

No blocking game defect was identified by the focused merge-readiness review. The user approved the exact merge after reviewing that recommendation. The old requirement for another whole fixture matrix is not a current merge blocker.

Material residual risk: physical 550-unit Safari performance remains unverified. Retained scene counts show 70,652 → 100,900 triangles (about 43% above former master), 3,613 → 3,623 meshes and 1,249 → 1,250 shadow casters. These counts are not GPU/FPS or thermal measurements. Eddie's positive experience is scoped to the observed 60-unit property. Monitor dense performance before further geometry expansion; an untested density fixture alone is not a retroactive blocker or reason to require another full session.

Minor unconfirmed presentation details: every status glyph at phone zoom and a fresh physical six-unit restoration transition, plus physical card-spacing acceptance and physical camera/zoom preservation on Return to placement. Automation covers the production return methods. Do not reopen broad acceptance solely for these details.

Full organic career pacing, acquisition affordability and extended portfolio enjoyment remain incompletely demonstrated. They are future progression questions, not retroactive failures of the accepted rescue/extension slice.

## Single next gameplay milestone

**Run the expanded yard with staff and fund its next justified improvement.** Proposed next milestone, not implemented goals or user acceptance.

The player should graduate from rescue and a leased extension into supervising a working property: suitable routine jobs are handled by employed staff; the Owner handles deliberate exceptions; payroll and bills remain visible; the business supports one player-chosen improvement justified by a real operational need or repeated demand.

Use existing mechanics first: Porter/Tech work, Clerk office coverage, Manager policies where affordable and useful, work queues, customer requests, payroll, financial outlook, Growth Readiness and ordinary construction/improvement previews. Do not require a full staff roster or promise automatic repair assignment merely because a Tech was hired. Role, route, shift, capacity, explicit delegation and policy states must be observed.

Do not add a new scenario, goal system, economy tuning or reward just to test this. Do not repeat the already reported rescue/extension acceptance. Use a disclosed reproducible test state or an organic test-only continuation, never the user's actual stored save without instructions.

### Proposed completion criteria

1. Over a 30-game-day observation window after the leased-extension stage, record staffing choices, completed suitable routine jobs, remaining/backlogged jobs, Owner work use, owner decisions and payroll. Thirty days gives a contractual billing cycle; it is not a new deadline.
2. Demonstrate at least one ordinary suitable job completed by employed staff without an Owner override. Compare representative work windows to establish whether delegation reduced Owner routine work; do not manufacture a pass by deleting jobs or disabling wear.
3. Preserve decision control: real owner exceptions remain answerable; manual Pause and Keep paused after answering behave as intended. Staff routine handling must not create unexplained permanent pauses.
4. Preserve operations and financial truth: no stuck/orphan jobs or unhandled blocked-access state; record bills, wages, cash and commitments. Compare equivalent states if staffing's financial effect is claimed. No injected cash, changed coefficients or assumed guaranteed leases.
5. Reach one player-chosen, affordable next improvement through existing previews/confirmation. Its reason must come from actual workload, current service/access conditions or matching demand evidence. A justified decision to defer spending is informative but does not alone complete the investment part of this milestone. If no opportunity occurs, report that pacing result rather than force it.
6. Save -> reload -> Continue retains the test property's staff, work, finances, improvement and completed rescue history. Automated and physical results remain separate.
7. Physical gameplay acceptance asks whether the next choice was understandable and worth pursuing, and whether delegation felt useful. This must come from the player; financial/test success cannot substitute for it.

Smallest implementation rule: first review existing evidence and run a focused continuation if needed. If an actual obstacle emerges, propose or fix only that obstacle under separate implementation authorization. Do not automatically schedule another broad regression campaign or full fixture session.

### Separate performance check

If further geometry expansion or actual lag warrants it, use one reproducible dense property at 4x in Safari and inspect running performance, pan/zoom responsiveness and sustained degradation with the existing diagnostics. Device/power mode, duration and symptoms must be recorded. Do not treat intentionally throttled paused/menu frames as running-performance failures. Do not require this check to repeat rescue, promotion or acquisition gameplay. No dense fixture is published or loaded into user storage by this documentation task.
