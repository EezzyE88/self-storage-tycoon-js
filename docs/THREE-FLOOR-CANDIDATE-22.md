# Candidate 22: three-floor player-facing repair

| Item | Value |
| --- | --- |
| Branch | `candidate/three-floor-repair-claude-20261005` (the name `candidate/three-floor-repair-20261005` was already taken on the remote by a separate, independent attempt, `c7d9e8f`, which was left untouched) |
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
| 9 | Landscape 734×343 obstructed | Layout not usable at phone landscape height | **Policy B**: the manifest is `portrait`. Phone-height landscape (`orientation: landscape` and `max-height: 500px`) shows a full-screen "Rotate to portrait" prompt and holds time as a blocking popup. Returning to portrait restores the speed in force before rotating. Large landscape windows are unchanged. | `tcandidate22` 9; emulation "landscape" |
| 10 | `tlayout_hierarchy` needed missing object `54d432f` | Git lookup | Committed `tests/fixtures/render-pre-layout-hierarchy.js` (`f2f31b0:js/render.js`, the renderer immediately before the framing fix). The parity test's `git show da4c72a` was replaced with committed `tests/fixtures/candidate19/*`. The compatibility assertions are unchanged. | Suite run from a depth-1 clone |
| 11 | No F3 shopper/tenant/elevator trip observed | — | New `tthreefloor_journeys.mjs` on real `Sim.step()` (below) | — |
| 12 | Copied 14 standard 5×10s against 10×20/climate demand | — | Read-only `expansionEvidence()` covers the copied mix, matching vacancies, unmet matching requests and leases (30 days), and other unmet products. Verdict is supported / partly / unsupported / not enough evidence / structure only. It explicitly makes no revenue promise. | `tcandidate22` 12 |
| 13 | $55/day vs $12.50; $13 row; repair timing; one-tap cancel | — | Sandbox shows "Owner + porter ($12.50/day)". The staff row shows exact cents. Task lines read "on-site work (walking time extra)"; vendor lines show response time and "completed on arrival". Cancelling or undoing construction always asks for a second confirmation that states the refund. | `tcandidate22` 13 |

## Test evidence

All results come from a **fresh depth-1 clone** of the final code commit, `e26e3b0bd75e2804ed3cae44cf1652a806db6141`, which includes the addendum fixes and the pause policy. That clone has a single commit; `54d432f` and `da4c72a` do not exist in it. No build artifacts were present.

```sh
node tests/run-headless.mjs /tmp/c22                      # complete headless suite
node tests/headless/tthreefloor_journeys.mjs              # seeded F3 journeys
node tests/headless/tcandidate22.mjs                      # candidate-22 regressions
node tests/headless/tcancellation.mjs                     # deterministic cancellation arithmetic
python3 -m http.server 5173 & node tests/browser-qa/c22-emulation.cjs /tmp/c22-shots
```

| Check | Result |
| --- | --- |
| Base Candidate 21 suite (full-history clone, before changes) | 51/51 |
| Final headless suite, fresh depth-1 clone | **55/55** scripts (51 existing + 4 new). [results.json](releases/candidate-22/results.json) |
| Candidate-22 regressions | 28/28 checks (23 original + 5 for the addendum). [log](releases/candidate-22/candidate22-regressions.log); cancellation: [log](releases/candidate-22/cancellation.log); pause policy: [log](releases/candidate-22/pause-policy.log) |
| Browser emulation (headless Chromium: 393×659 and 734×343 with touch, 1280×720 with a mouse; **not** Safari, **not** a physical iPhone) | 15/15 scenarios (7 original + 7 addendum + 1 pause policy), 0 console errors, 0 unhandled rejections. [results + screenshots](releases/candidate-22/emulation/) |
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
- Loads start paused. (Speed after closing a temporary pause now follows the pause policy below.)

## Independent playtest addendum (A–F)

A second independent playtest of public Candidate 21 reported these issues. They are treated as confirmed or corroborated, and each is repaired in commits `00893cf` and `df1100d`.

| # | Requirement | Repair | Evidence |
| --- | --- | --- | --- |
| A | "Tap here" must sit on the visible, tappable Unit 107 | **Ring binding.** The ring now binds to the object's own pin, a real `<button data-a="pin">` that selects it, whenever that pin is visible and uncovered.<br>**Map points.** A map point is only used if a hit test lands on the map (canvas, pins or blueprint). It is rejected if any interface layer covers it or it is outside the viewport. If neither works, no label is rendered.<br>**No sliding.** The ring no longer slides across the interface between distant targets. | Emulation at 393×659 (touch) and 1280×720 (mouse): the element at the ring centre is Unit 107's own pin, the label sits above the bottom navigation, and a real tap at the ring selects Unit 107 and advances to "Tap Owner Make-Ready". Headless check: `mapPointClear` rejects covered and off-screen points. |
| B | Make-ready must stay in Details until the job is accepted | The task-action rail persists in both compact and Details views. After assignment the action is replaced by "Make-ready assigned" or a progress figure. Staff-first routing ("Queue Porter") and explicit Owner assignment are unchanged. | Emulation: the action is visible in Details; tapping it removes it and shows the assigned status. Headless check covers both views before and after acceptance, plus the Porter route. |
| C | Optional stairs must not invalidate the package | With no stairwell in the building, the option is disabled. Its note says a Stairwell must be built separately and that the package below is unaffected. A stairs request that arrives anyway is reverted, with a status note. The quote, price ($17,810) and Confirm are unchanged; stairs are never added silently. | Emulation; Candidate-21 hardening test updated to this contract (it previously asserted that the quote became invalid). |
| D | The floor chooser must show live progress | The chooser and building sheet derive completed floors from handover. An active order shows as "F2 · 28% · fit-out · under construction", never "not built yet". The chooser refreshes while open. "Plan next floor" is replaced by a disabled "after F2 handover" control, and `verticalPlan` still refuses a second order. | Emulation: still "1 completed floor" after the structure stage, and the text changes while open without a reload. Headless check covers the same. |
| E | Cancel must be separate from navigation, itemised, and cover the ledger | **Placement.** Construction cancel is no longer in the routine task-action rail. It sits in a separate red "Cancel construction" panel, and "Keep building" is the first and primary choice.<br>**Labels.** Review "Cancel" is now "Close review"; the preview's is "Discard preview".<br>**Confirmation contents.** The confirmation lists the original charge, completed (retained) work, in-progress work, unbuilt work, the 40% non-refundable share, the exact refund, total non-refundable, cash after, and how the next quote changes. | New deterministic `tcancellation.mjs` (below); emulation: "Keep building" changes nothing, and confirming produces separate −17,810 / +17,810 ledger entries. |
| F | Review must be accessible | **Labels.** The review is a `role="dialog"` with an aria-labelled title and stable "Close review" labels on both the × and the footer button. It states that the game is paused during review.<br>**Selectors.** `data-qa` hooks: `vr-close`, `vr-close-review`, `vr-opt-fitout`, `vr-opt-stairs`, `vr-preview`, `vr-confirm`, `vp-back`, `vp-confirm`, `vp-discard`, `cancel-construction`, `cc-keep`, `cc-confirm`, `floors-close`.<br>**Keyboard.** No native select is needed. Escape closes the review or discards the preview. The Space and 1/2/3 speed keys can no longer bypass a paused review, which they previously could. Closing restores the previous speed. | Emulation (keyboard); headless source and markup checks. |

The tutorial also now names the section to choose ("Choose Hire in the section selector") whenever the required control is still behind the panel's section selector. Ring labels are suppressed if they would cover status text, so the instruction itself carries this.

### Deterministic cancellation arithmetic (`tests/headless/tcancellation.mjs`)

Only construction is ticked, so no other cash movement is mixed in.

| Step | Result |
| --- | --- |
| 1. Original F2 commitment | −$17,810. The $396 reinforcement is included, and the stage costs sum exactly to the package. |
| 2. Full undo after 20 minutes, inside the 30-minute window | +$17,810; penalty $0; cash restored exactly; next quote $17,810. |
| 3. Recommit, then cancel 100 minutes into the structure stage | Unbuilt $17,284.39. Refund round(0.6 × 17,284.39) = **$10,371**. Non-refundable 40% share $6,913.39. In-progress structure consumed $129.61. Total non-refundable $7,439. |
| 4. Retained reinforcement | **$396** (`structuralRightsPaid` 396, `plannedMaxFloors` 2); no floor added. |
| 5. Second quote | **$17,414** (= 17,810 − 396), with no reinforcement line. |
| 6. No duplicated charge | The second order's reinforcement stage costs $0; −$17,414 is charged once. |
| 7. Reload | Production SST1 reload mid-build: cash unchanged and no new capex entry. Completion, handover and commissioning charge nothing. |

The capex ledger holds five separate entries: −17,810 (commit), +17,810 (undo), −17,810 (recommit), +10,371 (cancel), −17,414 (second commit). Net spent is $24,853.

This establishes the expected arithmetic under the unchanged Candidate-20/21 refund rule: full undo inside 30 minutes, otherwise 60% of unbuilt work. Grok's uncertain cancellation is therefore **not** classified as an economy defect.

### Not tested in Grok's run (and covered here)

The following were untested in Grok's run, not failed: F3 completion and commissioning, F3 customer and cart journeys, elevator travel, capacity, and save/reload during elevator travel. They are covered by `tthreefloor_journeys.mjs` above.

Still outside this environment: physical iPhone Safari, staff performance effects in play, and vendor/fault handling in play beyond the existing regression scripts.

## Pause policy (supersedes the Candidate-21 "return to 1x" rule)

As directed after review, temporary UI pauses now **restore the speed that was in force before them**, rather than defaulting to 1x. A manual Pause is preserved through actions, confirmations and panel closures.

- **How it works:** the first temporary pause records the current speed (Pause, 1x, 2x or 4x). When the last one is released, exactly that speed is restored. Temporary pauses are expanded panels, dialogs, the build placement review, the expansion review and preview, customer requests, tutorial and lesson cards, milestone banners and the rotate prompt.
- **Pause chosen while paused:** pressing Pause (button or keyboard) while a temporary pause is active becomes the speed that is restored.
- **Run-speed taps while time is locked:** tapping a run speed while time is locked still does nothing, and does not change what will be restored.
- **Actions and confirmations:** commissioning, make-ready, confirming or cancelling construction, confirming an expansion, discarding a preview, answering requests and showcase unfreeze now restore the previous speed instead of forcing 1x. Starting the guided tour no longer forces 1x.
- **Tutorial:** after Back to map the clock keeps its previous speed, and the "tap 1x" step then targets the working 1x button. The instruction wording no longer promises a 1x resume.
- **Scope:** this is UI-only state, held on the UI object and never written to the simulation or the save. Economics, prices, coefficients and the save format are unchanged. Property switches never apply another property's remembered speed, and loads still open paused.
- **Evidence:** `tests/headless/tpause_policy.mjs` (13 checks across 10 pause sources and speeds 0/1/2/4). Existing assertions that encoded the old 1x rule were updated to the new expected speeds, not removed. Browser scenario "P." exercises the policy on the real page.

## Independent review repairs (#1–#10)

Implemented at the owner's authorization on top of `5fbcbfa` in code commit `b7edc7a2450c471bc60d82b29d450a5dc1faab17`.

| # | Finding | Repair | Regression (actual failure path) |
| --- | --- | --- | --- |
| 1 | Space during a temporary pause resumed the earlier speed | During any temporary pause Space records a manual Pause and never schedules a resume. Outside a hold it toggles as before. The 1x/2x/4x buttons and number keys share one `requestSpeed` path, and run speeds stay inert during a hold. This also fixes number keys pressed while only the tutorial card is open. | The real `main.js` keydown listener, across 10 pause sources from 1x, 2x and 4x, plus the reviewer's reproduction (4x → panel → Space → close). Browser scenario R. |
| 2 | Photo Freeze ignored a later manual Pause; Space ran time while frozen | Freeze is now a temporary pause in the shared controller, and its separate stored speed is gone. Unfreeze and Done/exit release it. Switching game leaves photo mode. | Headless (real keyboard handler). Browser: Freeze → Space → the game clock does not advance → Unfreeze or Done → still paused. Without a Pause, leaving Freeze restores 4x. |
| 3 | Ring and blueprint labels crowded each other | The ring label also avoids blueprint captions, and no blueprint caption is drawn twice (e.g. "Elevator"). | Blueprint overlay at the elevator step: one caption per name. |
| 4 | Hallway/elevator instructions hidden in the strip | The docked strip shows the step's how-to line, up to three lines. | Rendered markup and CSS; the browser check confirms the line is visible with a panel open. |
| 5 | The tutorial treated an ordered hallway as built | **States:** the hallway beside the shaft is missing, ordered or built; only built satisfies the elevator step.<br>**Ordered:** the step becomes "F1 hallway ordered: let construction finish" and targets the time controls. If those are blocked it points first to Back to map, Close, Stop building or Requests; otherwise it shows no ring.<br>**Missing:** "Build the F2 hallway first" takes priority over waiting.<br>**Time:** the tutorial never resumes time itself. | Real construction ticks: the simulation reports "No hallway beside the shaft" while the hallway is only ordered, every redirect is covered, and the original step returns once built. A missing case is included. |
| 6 | Confirm enabled when cash < cost | Confirm is disabled below the hard cash requirement, with "Not enough cash: needs $X more ($Y available, $Z required)". Reserve guidance stays advisory and Free Build stays unlimited. | $6,527 vs $9,500 gives the reviewer's $2,973 shortfall. Exactly $9,500 and an under-reserve balance stay enabled. Browser check of the real action bar. |
| 7 | Restore paths not transactional | **Restore previous game:** validates, stores the outgoing game first, and only then loads.<br>**Archive restore and keep-current:** run in one all-or-nothing transaction over the kept and archive slots, restored byte-for-byte on any failed write.<br>**Rollback:** never trims, so no archived game can be dropped.<br>**Messages:** "preserved" is claimed only when it is true. | Real `localsave.js` and `savearchive.js` over a localStorage that throws on chosen writes. Kept-slot failure: nothing loads and the slots are byte-identical. Full archive with kept or archive write failure: all 5 archived games are kept. Keep-current failure: no duplicate. Success paths are verified as well. |
| 8 | Handover holds shown as generic "blocked" | A new "Handover test" status is used in status bands, the compact dock and the coach line ("Freight handover test: N upper units are briefly closed…"). Held units get no fault pin and no warning badge. Genuine disconnections still show the "blocked" status, a fault pin, the "can't be reached" coach line and an access warning. | A real F3 service test (14 held F2 units), then a real post-handover disconnection. |
| 9 | "Commission ready units" scope unclear | The building inspector offers "Commission F2 order · 14 units" first. The property-wide action reads "Commission all N ready units on property", with a scope note, and appears only when it adds something. | One unrelated ready unit stays uncommissioned by the order action. |
| 10 | Ledger lacked penalty and retained facts | Cancellation adds information-only ledger rows: penalty $6,913.39, work in progress not refunded $129.61, reinforcement $396 retained (next quote omits it), or a full-undo note.<br>**Accounting:** each row has `amt: 0` and `info: true` and is written straight to the ledger, never through cash accounting. The legacy migration skips them; finance views show "— info / Information only · no cash moved". No rows are written in Free Build. | The refund alone moves cash ($10,371), there is no `info` cash category, the legacy migration skips the rows, and the Finances view labels them. The capex sequence in `tcancellation.mjs` is unchanged. |

**Scope:**
- **Unchanged:** package prices, B+ coefficients, refund arithmetic, save format, staff-first behaviour and the three-floor limit. `data.js`, `finance.js`, `maple.js`, `scenarios.js`, `localsave.js` and `economics.js` remain byte-identical to the base. `sim.js` changes only to skip information rows in the legacy migration.
- **Regression proof:** all 14 checks in `tests/headless/treview_repairs.mjs` fail when run against `5fbcbfa`, so each reproduces its failure path.

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
