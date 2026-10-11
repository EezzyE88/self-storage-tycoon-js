# Whole-game art refinement

Isolated candidate branch: `candidate/whole-game-art-20261010`. Parent and comparison baseline: `994ba614f8e8b495f026e5405407cc04fec1cf15`. Accepted master remains `f70b81a0298a438577db1ee35934655e7858353f`. Build: `bplus-whole-game-art-refined-20261010`. Unmerged and unpublished. The earlier art report describes the preceding candidate, not this refinement.

## Delivered changes

1. **Building architecture:** shared drive-up bays gain projecting jambs, headers and plinths, giving visible depth around the existing doors. Interior products keep their tighter frames and distinct standard/climate finishes. Shells gain corner piers, a grounded base and substantial portals at existing wide entrances. Piers inherit the actual shell cutaway and selected-floor rules. Office architecture from the previous candidate is retained.
2. **Composition around existing activity:** the actual office forecourt receives warmer paving within existing concrete cells; adjacent eligible grass gets clustered shrubs and mulch, replacing evenly repeated bushes. Loading cells gain a stronger yellow edge while retaining current availability markings. Entrances and loading areas carry more visual weight. Vacant future development space, routes, bays, doorways and authoritative ground cells remain unchanged. No decorative crowd, vehicle, worker or cargo was invented.
3. **Readable restoration:** the six valid Comeback targets have stronger wall/door contrast and broad overhead surface grime before make-ready. Each target clears independently as existing readiness changes. Surface grime is a visual representation of the scenario's restoration state, not a new roof repair mechanic, damage condition, cost or task. No broken roof geometry was added. Blocked access and invalid mappings cannot create this grime. Available, leased and reserved ready units retain clean finishes. Existing state bands, symbols, HUD and notices remain.

Only `js/render.js` and `js/version.js` change production behavior, and only presentation changes. Economy, simulation, save schema, building definitions, scenario restrictions, placement, camera controls and the two-unit extension are byte-unchanged from the parent.

## Focused evidence

Nine scripts passed: `tart_refinement`, `twhole_game_art`, `tstatus_hierarchy`, `tvisual30`, `tvisual31`, `tart_design`, `tcomeback36`, `tyard40`, `tyard41`. Logs and exit statuses are retained. The six new refinement groups cover batched bay geometry, shell cutaways, status-band clearance above headers, entrance/state preservation, all six roofs restoring independently, and access-loss/malformed-target safety. Existing art tests retain state, save/step/economy/RNG parity, rebuild reuse and shared status semantics. Syntax and whitespace checks passed. The prior 84-script suite was not rerun.

Ten matched actual production-game pairs compare the prior art candidate against this refinement: drive-up frontage detail, naturally developed loading activity, unready/restored/expanded Comeback, office, interior products, rain, night and mirrored property. Every pair retains exact camera values and serialized simulation-state hashes; no page errors. The natural activity fixture runs the existing simulation until vehicles and a customer exist; it does not inject activity. Restored and expanded captures remain separate controlled fixture states, not a continuous player run. The retained investment fixture uses production build/completion/commissioning. Lighting is overridden for consistent views; HUD time remains the saved fixture time. System fonts replace blocked external fonts.

Captures use disposable intercepted origins, Chromium SwiftShader WebGL, 390×844 touch viewport and DPR 2. Overview scenes use the existing phone property-fit camera; the drive-up detail is separately labeled at zoom 1.8. These are actual renders, not concept art. They do not establish physical Safari cue recognition, enjoyment or GPU frame-rate acceptance. No user save or live preview session was used. Exact hashes and metadata accompany this report.

## Cost and release assessment

Relative to the prior art candidate, Maple adds 13 scene mesh objects and 2,076 counted triangles. The dense 550-unit fixture adds two scene mesh objects and 29,088 triangles, increasing the count from 71,812 to 100,900 (about 40.5%). Both keep shadow-caster counts unchanged. Bay geometry is instanced; added portal, base and shell relief do not cast extra shadows. These are stubbed scene counts, not draw timings or FPS. The triangle increase is a real device-performance risk even though object and shadow counts are bounded.

No confirmed defect was found in the scoped regressions. **Ready for art review; physical visual/performance acceptance remains pending.** The clearest improvements are architectural relief and restoration legibility. Composition changes are focused around entrances and operational frontage, not a complete environment overhaul. A short dense-property activity check plus normal-play-zoom status/restoration inspection on iPhone is the smallest meaningful remaining device check after separately authorized publication. Another complete fixture session is not automatically required.

Prior user-reported iPhone acceptance remains attributed to the previous accepted runtime: rescue/history/career/save integration, Ambience-only switching with no noise, deliberate expansion with saved progress, a separate 25/25 leasing run, Day 45 operation, and completed history remaining visible. Runs are not conflated, and screenshots lacking build identifiers are not deployment proof. Exact commissioning actions, enjoyment, card-spacing acceptance and Return-to-placement camera preservation are not newly inferred or accepted for this candidate.

## Protected state

Master: `f70b81a0298a438577db1ee35934655e7858353f`. Preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site. Its independently verified publication remains `b2faa4baa8da8d470e142480ef9229485a73b46b`, `bplus-yard-view-candidate-41`. No master merge, preview publication, economy change or user save access/write occurred.
