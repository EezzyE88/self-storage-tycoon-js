# Candidate 21: bug, stress and gameplay audit

Verdict: the automated release gate passes. This is an isolated follow-up to candidate 20, not a master promotion or a physical Safari acceptance. The playable slice remains three floors; dispatcher stress exercises the architecture up to five. No economic constants, freight capacity, travel speed, repair rules, lease formulas, legacy tool prices or save envelopes were changed.

## Confirmed defects and fixes

| Finding | Trigger and impact | Correction and regression |
| --- | --- | --- |
| Proposed-floor ground crash | Review F3 on a two-floor building. `setView(2)` reads a dirt layer that does not exist until acceptance and throws. This can prevent the main expansion flow. | Rendering uses zero dirt for a proposed layer. An old-source renderer reproduction fails; the corrected selected-floor test passes without changing the save. |
| Proposed-floor overlay crash | Security, cleanliness or carts overlay reads an absent walk grid. | Clear the overlay and return while that simulation layer is absent. All five overlay modes are exercised. |
| Invalid quote has no recovery controls | Select optional stairs with no stairs, or copy an empty upper floor. The error replaces the checkboxes, preventing the player from choosing a valid package. | Keep review options separately from the valid billable quote. Options remain visible and respond to input on invalid quotes. Tests recover by unchecking stairs or choosing structure-only. Invalid quotes cannot be confirmed. |
| Abandoned preview and future floor | Changing a valid quote to an invalid one loses the quote reference used for preview cleanup. Closing can leave ghosts and a nonexistent selected floor. | Clear ghosts on every review, track the review lifecycle independently, and restore the previous view when closing a proposed floor. No grids are allocated by preview. |
| Malformed expansion saves accepted | Reordered valid stage names, mismatched stage/order totals, huge elapsed progress, construction already at phase 5, or orphan elevator passengers could enter the simulation. | Validate ordered stage identities, complete-package cost/duration consistency, bounded progress, required handover elevator, unique agent IDs and passenger references before attachment. Five malformed mutations are rejected atomically; valid checkpoints remain accepted. |

These fixes change rendering, review recovery and import validation. They do not alter the vertical package quotation or dispatcher algorithm. Existing saves produced by valid candidate-20 flows pass; hand-edited inconsistent saves are intentionally refused.

## Test evidence

Baseline: 50/50 existing headless scripts passed before fixes. Final: 51/51 scripts passed, including the new hardening script and expanded production save tests. The counts refer to script files, not individual assertions; the imported three-floor fixture repeats its 12 checks in dependent scripts and is not counted as independent coverage each time.

Reproduce from the repository root:

```sh
node tests/run-headless.mjs /tmp/candidate21-qa
node tests/headless/tthreefloor_hardening.mjs
node tests/headless/tthreefloor_save.mjs
node tests/headless/tthreefloor_parity.mjs
```

Evidence: [final script results](releases/candidate-21/results.json), [stress and ordinary simulation](releases/candidate-21/stress-playthrough.log), [production save checkpoints](releases/candidate-21/save-checkpoints.log), [legacy parity](releases/candidate-21/legacy-parity.log). Runtime and test files are committed with this report.

### Routing stress

- 72 seeded bursts: 24 seeds at each of three, four and five service floors; 100 passengers per burst, about 60% requesting carts. All 7,200 journeys drained to their requested destinations; cart floor followed its passenger.
- 156,712 dispatcher ticks checked finite bounded cab position, four-slot capacity and unique queue/rider ownership throughout. Wear was disabled only in this routing test so maintenance failure would not obscure queue behavior. This is an algorithm test, not a complete five-floor construction or performance claim.
- Continuous-arrival case adds 500 callers while an already aged F3 call waits. That passenger boards at tick 20 and reaches F1. Cancellation removes its separate test caller from all queues. This checks that new arrivals do not replace locked aged priority.
- Maximum recorded saturated-burst wait was 2,813 game minutes (about 47 hours). This deliberately unrealistic burst validates eventual service and exposes the limited throughput of one four-slot cab. It does **not** establish acceptable pacing. Capacity and economic coefficients remain unchanged. Redundancy and realistic traffic measurement should precede any balancing decision.
- Existing focused tests retain occupied legacy-cab migration, condition failure and repair recovery, queue age preservation, two-shaft rerouting, midflight reload, duplicate/stale callers, and freight eligibility independent of optional stairs.

### Automated gameplay playthroughs

Four distinct RNG seeds each ran 43,200 ordinary `Sim.step()` minutes: 30 financial days, 172,800 minutes total. Fixtures use a well-funded existing two-floor building and an open property. They include the normal finance, visitor, staff and maintenance update loops, not merely construction ticks. Each playthrough quotes and charges the F3 package, completes construction, explicitly commissions it, and observes customers on F3.

| Seed | Expansion and commissioning | F3 customer observed | Leases at end | Cash at end |
| --- | --- | --- | --- | --- |
| 1 | Completed | Yes | 26 | $975,148.25 |
| 2 | Completed | Yes | 27 | $975,247.00 |
| 3 | Completed | Yes | 26 | $974,890.50 |
| 4 | Completed | Yes | 24 | $974,716.50 |

These are well-funded recovery/continuity tests, not a profitable-career claim. Cash begins from the existing test fixture near $1 million. Customer/cart state-machine checks separately verify cart claim, outbound F3 travel, unit use, return to the ground corral, closed unit door and departure. No assertion infers a physical animation or touch result from an engine journey.

### Charges, saves and legacy behavior

- Complete-package charge equals its line-item sum, is deducted once at acceptance, and is not repeated by duplicate acceptance or reload. Stale quotes refuse. Reinforcement cancellation credit and post-structure cancellation lock remain covered.
- Actual production SST0/SST1 export and import preserve F2/F3 objects, layers, leases, cash and construction state. Compressed save/reload succeeds at reinforcement, structure, fit-out, shaft and service-test checkpoints; completion preserves the already-paid cash amount.
- Invalid portfolio imports remain atomic: a bad property does not replace a valid current company. Added corruption cases are rejected before attachment.
- Saves load paused. Closing the normal paused popup intentionally resumes at 1x. Existing visible repair, vendor, Owner/staff, cancellation, commissioning and save actions remain covered by the regression suite.
- Exact seven-day state/RNG/economy comparisons against candidate 19 pass for Maple and Go Vertical. Data, finance, scenario factory and local save-slot modules remain byte-identical to that legacy baseline.
- Existing camera/banner, menu hierarchy, compact guidance and fully leased Growth wording checks pass. Growth thresholds and economics are preserved.

## Limits and acceptance status

No real browser or physical iPhone Safari playtest was possible in this environment: browser executables are absent, and the supported managed cloud preview does not support this static project. Renderer tests use GPU/canvas stubs; UI tests call production handlers with minimal DOM surfaces. They detect the reproduced exceptions and recovery-state defects, but cannot certify appearance, touch targeting, WebGL frame rate, browser memory pressure or background tab restoration.

The automated gate is PASS. Physical Safari acceptance remains HOLD. On the private preview, check F2/F3 selection, proposed-floor preview with each overlay, recovery from both invalid-option cases, confirm/cancel/commission actions, an occupied cab during extension, exported save reload, iPhone background/foreground, and the intentional 1x return. Keep accepted master unchanged until that review is complete. No claim of exhaustive bug freedom or maximum sustainable traffic is made.
