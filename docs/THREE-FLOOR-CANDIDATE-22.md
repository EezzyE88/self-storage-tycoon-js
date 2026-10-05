# Candidate 22: three-floor player-facing repair

| Item | Value |
| --- | --- |
| Branch | `candidate/three-floor-repair-20261005` |
| Base | Candidate 21 `b126ddcb8675dd71bd01ec546294175cdaa7d5b4` (tree `9de22e40b380fbf05c64cd34e4d08b22671df17a`) |
| Accepted master | `2812abf8d268f9a225e5786d173f95efcbd6223d`, unchanged |
| Build | `bplus-three-floor-candidate-22` |
| Scope | Bounded repair of the three-floor slice. F4/F5 stay unexposed; architecture still supports five floors. |

No economy, construction price, demand coefficient, wage, build duration or accepted one/two-floor behavior was changed. `js/data.js`, `finance.js`, `maple.js`, `scenarios.js`, `localsave.js` and `economics.js` are byte-identical to the base.

## Repairs

| # | Observed in Candidate 21 | Cause | Repair | Regression |
| --- | --- | --- | --- | --- |
| 1 | Every upper unit showed "Floor 2"; scene/chooser on F2 while F1 stayed highlighted | Inspector used `o.f ? 'Floor 2'`. Highlights were updated only by `ui.setView`; review/preview and the HUD changed the renderer view directly. View was not saved. | `floorName(f)` in the inspector and the compact dock (`5x10 · Floor 3`). `syncFloorUi()` derives EXT/F1/Floors highlight and label from the renderer view, runs every HUD frame. The view is saved as `uiView` beside the simulation state (not inside it) and restored through `validView()`, with fallback to EXT. The showcase `attach` wrapper dropped the restore argument; it now forwards it. | `tcandidate22` 1.x; emulation "F2/F3 floor selection" |
| 2 | `Building 12 → F3 finished - undefined/14` | Vertical completion emitted `units` but never `ready`, before the route graph was rebuilt | Completion reconciles the topology first (`markDirty` + `ensure`), then emits integer `units`/`ready` for the order and `otherReady` for the rest of the property. The toast reads "14/14 order units ready to commission", with any extra stated separately. Buttons read "Commission whole order · N units" and "Commission all ready units on property · N". | `tcandidate22` 2.x; emulation toast check |
| 3 | Unit 307 "lost customer access - Hallway has no route" during F3 completion | The service-test drain removes the elevator from navigation, so commissioned F2 units are blocked | While that shell's freight elevator is in its handover drain/test, newly blocked upper units are held (`accessHold` = order id). They are not announced and show "Temporarily closed for freight handover". Holds are cleared on the next authoritative recomputation. A unit still disconnected after handover is announced then. Ordinary outages are never held. | `tcandidate22` 3.x; `tthreefloor_journeys` handover and outage blocks |
| 4 | Tutorial text, ring and accepted action disagreed | `stepState` used "last done + 1". The CSS hid the whole card behind any panel or build bar. Speed controls were targeted while a panel held the pause. Wording was out of date. | Current step = first incomplete step. A navigation step whose tab or category is already showing counts as done. `resolveStep()` redirects to **Back to map** when time is locked, to **Close** for a modal, and to **Stop building** when a build tool is armed on a non-build step. Required cards are revealed inside their scroller. When the category is already chosen, the ring stays on the card. The instruction stays visible as a one-line strip above panels and the build bar. Ring labels skip any side that would cover the card, HUD, category row, tab bar, toasts or status text. Passive steps say "Watch here". Wording now uses "Owner Make-Ready", "section selector" and an added **Overlays** section. | `tcandidate22` 4.x; emulation tutorial scenarios |
| 5 | Cause & remedy and the security map opened under Requests | Navigation actions did not close the modal | Navigation from Requests closes the dialog first without resuming time (pending requests keep their own pause). Closing Cause & remedy returns to Requests. | `tcandidate22` 5; emulation "Requests" |
| 6 | Import replaced the game at once; the kept Maple game was silently overwritten | Kept slot was written before parsing; single slot | `prepareLoad()` parses, migrates, validates and rebuilds with no side effects. A failed import writes nothing. A valid import shows a confirmation naming the incoming property/day/cash, the running game, what becomes the previous game, and which existing previous game moves to **Older saved games** (new `js/savearchive.js`, 5 entries; any drop is disclosed in advance). New game discloses the same. Nothing loads if the safety copy fails. `localsave.js` is untouched. | `tcandidate22` 6.x; emulation "import" |
| 7 | Security overlay carried into a new Sandbox | `attach` reset tool/selection only | `ui.resetSession(view)` clears overlay, preview/review, Requests, expanded panel, pending import and open camera menu. Only the saved view carries over. | `tcandidate22` 7; emulation |
| 8 | 393×659 review covered the map; closing cleared the preview | Single modal | Grouped review: Required (freight access stated separately), Options (fit-out; optional stairs), Fit-out (identical lines grouped), Optional redundancy, evidence, totals, cash after, duration, cancellation terms. **Preview on map** hides the sheet but keeps the quote and a cyan "proposed" ghost. A compact bar reads "Proposed F2 · Building 12 · Preview only — not built, not commissioned" with Back to review / Confirm / Cancel. Checkboxes are 26px inside rows at least 48px tall; buttons are at least 44px. | `tcandidate22` 8; emulation "review" |
| 9 | Landscape 734×343 obstructed | Layout not usable at phone landscape height | **Policy B**: the manifest is `portrait`. Phone-height landscape (`orientation: landscape` and `max-height: 500px`) shows a full-screen "Rotate to portrait" prompt and holds time as a blocking popup. Returning to portrait resumes at 1x (the intentional policy). Large landscape windows are unchanged. | `tcandidate22` 9; emulation "landscape" |
| 10 | `tlayout_hierarchy` needed missing object `54d432f` | Git lookup | Committed `tests/fixtures/render-pre-layout-hierarchy.js` (`f2f31b0:js/render.js`, the renderer immediately before the framing fix). The parity test's `git show da4c72a` was replaced with committed `tests/fixtures/candidate19/*`. The compatibility assertions are unchanged. | Suite run from a depth-1 clone |
| 11 | No F3 shopper/tenant/elevator trip observed | — | New `tthreefloor_journeys.mjs` on real `Sim.step()` (below) | — |
| 12 | Copied 14 standard 5×10s against 10×20/climate demand | — | Read-only `expansionEvidence()` covers the copied mix, matching vacancies, unmet matching requests and leases (30 days), and other unmet products. Verdict is supported / partly / unsupported / not enough evidence / structure only. It explicitly makes no revenue promise. | `tcandidate22` 12 |
| 13 | $55/day vs $12.50; $13 row; repair timing; one-tap cancel | — | Sandbox shows "Owner + porter ($12.50/day)". The staff row shows exact cents. Task lines read "on-site work (walking time extra)"; vendor lines show response time and "completed on arrival". Cancelling or undoing construction always asks for a second confirmation that states the refund. | `tcandidate22` 13 |

## Test evidence

All results come from a **fresh depth-1 clone** of the final code commit. That clone has a single commit; `54d432f` and `da4c72a` do not exist in it. No build artifacts were present.

```sh
node tests/run-headless.mjs /tmp/c22                      # complete headless suite
node tests/headless/tthreefloor_journeys.mjs              # seeded F3 journeys
node tests/headless/tcandidate22.mjs                      # candidate-22 regressions
python3 -m http.server 5173 & node tests/browser-qa/c22-emulation.cjs /tmp/c22-shots
```

| Check | Result |
| --- | --- |
| Base Candidate 21 suite (full-history clone, before changes) | 51/51 |
| Final headless suite, fresh depth-1 clone | **53/53** scripts (51 existing + 2 new). [results.json](releases/candidate-22/results.json) |
| Candidate-22 regressions | 23/23 checks. [log](releases/candidate-22/candidate22-regressions.log) |
| Browser emulation (headless Chromium, 393×659 and 734×343; **not** Safari, **not** a physical iPhone) | 7/7 scenarios, 0 console errors, 0 unhandled rejections. [results + screenshots](releases/candidate-22/emulation/) |
| Stress script `tests/stress/tstress.mjs` | Completed; worst game-day 164 ms, peak save 671 KB |

### Seeded F3 journeys (`tthreefloor_journeys.mjs`, seeds 1–4)

Each seed builds F2 and then F3 through the real packages and commissions both. A keen standard 5×10 shopper is then scheduled, and the run continues with ordinary `Sim.step()`. To make the shopper's choice deterministic, vacant 5×10 units on F1/F2 are marked as awaiting make-ready, and carts stranded by earlier traffic are returned as if their "Recover cart" chores were done. Demand, prices and coefficients are untouched.

| Seed | Leased F3 unit | Lease → departure (game min) | Phases asserted in order |
| --- | --- | --- | --- |
| 1 | Unit 315 | 1,055 | queue F1 → ride → F3 walk → at unit → queue F3 → ride → F1 exterior → depart |
| 2 | Unit 321 | 1,121 | same |
| 3 | Unit 321 | 999 | same |
| 4 | Unit 321 | 1,021 | same |

Totals: 4 customer journeys, 4 cart journeys to and from F3, 4 up rides, 4 down rides, **0 failures**.

The following were checked on every tick: no duplicate agents or carts, capacity of 4, two slots per cart rider, no orphan queue entries or riders, no floor change outside the cab, and no jump above 0.6 cells per tick. At the end of each run: no stuck queue, rider or reservation; the cart is back in the corral; the unit door is closed.

**16 production SST1 save/reload checkpoints** were taken while waiting, riding, walking on F3, and returning the cart from F3. Each reload was exact, and its continuation matched the uninterrupted run in departure tick and full state. The comparison allows only for the loader's existing string sanitization.

**4 outages:** the elevator failed while the visitor waited on F1. A genuine `access_lost` warning appeared, with no handover hold. There was no travel to F3 for 240 minutes. After service was restored, all four visitors reached their F3 unit and departed.

**Burst:** 9 callers per seed (36 total; 6 with carts) gave a peak load of 4 slots. Boarding exactly followed enqueue order, and every caller was delivered to F3.

The handover block ran with seed 7. F2 units were held during the F3 service test and no `access_lost` was emitted. Completions reported (floor, units, ready, other) as (2, 14, 14, 0) and (3, 14, 14, 0).

### Economy regression

- F2 complete package $17,810 and F3 complete package $10,210 in the verified configuration. Structure-only F2 is $12,470 and F3 is $4,870. Each package is charged exactly once, and duplicate acceptance does not charge again. Cancelling within the grace period refunds the full $17,810.
- Exact seven-day state/RNG/economy parity against candidate 19 holds for Maple and Go Vertical ([log](releases/candidate-22/legacy-parity.log)).
- The 30-day playthroughs end with cash identical to Candidate 21: $975,148.25 / $975,247.00 / $974,890.50 / $974,716.50 ([log](releases/candidate-22/stress-playthrough.log)).

### Saves and migration

- Production SST0/SST1 export and import pass at every construction stage, at completion, and for malformed and atomic portfolio cases ([log](releases/candidate-22/save-checkpoints.log)).
- Candidate-21 saves load unchanged; they carry no `uiView` and open at EXT.
- Malformed imports change no slot and leave the running game in place. Valid imports confirm first, keep the outgoing game, and archive the displaced previous game.
- Loads start paused. Closing the paused popup still resumes at 1x.

## Remaining limitations

- **No physical iPhone or Safari/WebKit was used.** Browser evidence is from headless Chromium device emulation. Touch feel, Safari rendering, background/foreground behavior and memory still need the private Safari playtest.
- Phone landscape is deliberately unsupported: a rotate prompt is shown. iPad and desktop landscape layouts were not re-certified beyond confirming the prompt does not appear at 1280×720.
- The journey suite arranges F3-only availability and recovered carts. It proves the route mechanics, not that random demand will lease F3. Without a Porter, Maple's three carts are commonly left stranded by ordinary traffic; this is existing cart-chore gameplay, but it is worth noting for playtests.
- The Candidate-21 "Watch the Owner finish" versus "Tap Unit 107" mismatch was not reproduced exactly. It is addressed structurally: the card, ring and accepted action are now derived from one resolved step.
- Older saved games are capped at 5 per browser. Dropping the oldest is always disclosed first. Only the active property's view is saved; switching property opens at EXT.
- Under `sanitizeSave`, the loader strips quote characters from saved strings (existing behavior; it affects a feedback dedupe key, not gameplay).
- The full core tutorial was walked headlessly (`twalk`). Only the repaired transitions were driven in the browser.

## Verdict

- **Automated gate:** PASS.
- **Release verdict:** **HOLD**, pending a physical iPhone Safari playtest of the private preview. Nothing found in this repair blocks source review or private publication.

Recommended Safari checks:
- F2/F3 labels and highlights
- the Preview on map round trip
- import confirmation
- the rotate prompt
- the tutorial strip above panels
- Cause & remedy navigation
- a full F2 → F3 build with save and reload during the service test

Accepted master is unchanged.
