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

All results come from a **fresh depth-1 clone** of the final code-and-test commit, `c0bbe68895403e48682a88e90a0734d2df88bd27`, which includes the addendum fixes, the pause policy and the review repairs. Its runtime code is identical to `b7edc7a`. That clone has a single commit; `54d432f` and `da4c72a` do not exist in it. No build artifacts were present.

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
| Final headless suite, fresh depth-1 clone | **56/56** scripts (51 existing + 5 new). [results.json](releases/candidate-22/results.json) |
| Candidate-22 regressions | 28/28 checks (23 original + 5 for the addendum). [log](releases/candidate-22/candidate22-regressions.log); cancellation: [log](releases/candidate-22/cancellation.log); pause policy: [log](releases/candidate-22/pause-policy.log); review repairs: [log](releases/candidate-22/review-repairs.log) |
| Browser emulation (headless Chromium: 393×659 and 734×343 with touch, 1280×720 with a mouse; **not** Safari, **not** a physical iPhone) | 16/16 scenarios (7 original + 7 addendum + 1 pause policy + 1 review-repair keyboard/Freeze/affordability), 0 console errors, 0 unhandled rejections. [results + screenshots](releases/candidate-22/emulation/) |
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
| 5 | The tutorial treated an ordered hallway as built | **States:** the hallway beside the shaft is missing, ordered or built; only built satisfies the elevator step.<br>**Ordered:** the step becomes "F1 hallway ordered: let construction finish" and targets the time controls. If those are blocked it points first to Back to map, Close, Stop building or Requests; otherwise it shows no ring.<br>**Missing:** "Build the F2 hallway first" takes priority over waiting.<br>**Time:** the tutorial never resumes time itself. | Real construction ticks: the simulation reports "No hallway beside the shaft" while the hallway is only ordered, every redirect is covered, and the original step returns once built. A missing case is included. <br>**Correction (follow-up F2):** the claim "only built satisfies the elevator step" was not true at `3fbea35`: committing the elevator while both hallways were only ordered completed the step. Fixed in the follow-up below. |
| 6 | Confirm enabled when cash < cost | Confirm is disabled below the hard cash requirement, with "Not enough cash: needs $X more ($Y available, $Z required)". Reserve guidance stays advisory and Free Build stays unlimited. | $6,527 vs $9,500 gives the reviewer's $2,973 shortfall. Exactly $9,500 and an under-reserve balance stay enabled. Browser check of the real action bar. |
| 7 | Restore paths not transactional | **Restore previous game:** validates, stores the outgoing game first, and only then loads.<br>**Archive restore and keep-current:** run in one all-or-nothing transaction over the kept and archive slots, restored byte-for-byte on any failed write.<br>**Rollback:** never trims, so no archived game can be dropped.<br>**Messages:** "preserved" is claimed only when it is true. | Real `localsave.js` and `savearchive.js` over a localStorage that throws on chosen writes. Kept-slot failure: nothing loads and the slots are byte-identical. Full archive with kept or archive write failure: all 5 archived games are kept. Keep-current failure: no duplicate. Success paths are verified as well. <br>**Correction (follow-up F1):** the all-or-nothing, byte-for-byte claim held only while rollback writes succeeded. With storage failing persistently, a restore at `3fbea35` could lose an archived game and still say "Nothing was changed". Replaced by preservation-first recovery below. |
| 8 | Handover holds shown as generic "blocked" | A new "Handover test" status is used in status bands, the compact dock and the coach line ("Freight handover test: N upper units are briefly closed…"). Held units get no fault pin and no warning badge. Genuine disconnections still show the "blocked" status, a fault pin, the "can't be reached" coach line and an access warning. | A real F3 service test (14 held F2 units), then a real post-handover disconnection. |
| 9 | "Commission ready units" scope unclear | The building inspector offers "Commission F2 order · 14 units" first. The property-wide action reads "Commission all N ready units on property", with a scope note, and appears only when it adds something. | One unrelated ready unit stays uncommissioned by the order action. |
| 10 | Ledger lacked penalty and retained facts | Cancellation adds information-only ledger rows: penalty $6,913.39, work in progress not refunded $129.61, reinforcement $396 retained (next quote omits it), or a full-undo note.<br>**Accounting:** each row has `amt: 0` and `info: true` and is written straight to the ledger, never through cash accounting. The legacy migration skips them; finance views show "— info / Information only · no cash moved". No rows are written in Free Build. | The refund alone moves cash ($10,371), there is no `info` cash category, the legacy migration skips the rows, and the Finances view labels them. The capex sequence in `tcancellation.mjs` is unchanged. <br>**Correction (follow-up F3):** the legacy migration skipped these rows for cash, but still counted them toward its 250-row truncation threshold and first-row lookup. Fixed below. |

**Scope:**
- **Unchanged:** package prices, B+ coefficients, refund arithmetic, save format, staff-first behaviour and the three-floor limit. `data.js`, `finance.js`, `maple.js`, `scenarios.js`, `localsave.js` and `economics.js` remain byte-identical to the base. `sim.js` changes only to skip information rows in the legacy migration (and, in the follow-up, to exclude them from its completeness boundary).
- **Regression proof:** all 14 checks in `tests/headless/treview_repairs.mjs` fail when run against `5fbcbfa`, so each reproduces its failure path.

## Independent follow-up repairs (F1–F3)

An independent review of `3fbea35` found three remaining gaps. They were confirmed by read-only reproduction, then repaired at the owner's authorization in code commit `b4ebcb95ac2838299215d0f545a34903a268085a` (tree `24a706ef92c706c0fce0f56d653ebcb7cc9b8030`). The six protected modules, including `localsave.js`, are still byte-identical.

| # | Gap at `3fbea35` | Repair | Regression |
| --- | --- | --- | --- |
| F1 | **Storage failure defeated rollback.** With 5 archived games, restoring Archive 3 while the third and later writes failed left the archive as Previous, 5, 4, 2, 1. Archive 3 was lost, yet the message said "Nothing was changed". The same transaction behind import and New game could drop Archive 1 and store Previous twice. | **Ordering.** Writes are now ordered so that no game loses its last stored copy before its replacement is stored:<br>1. The displaced previous game is added to the archive, untrimmed.<br>2. The kept slot is overwritten.<br>3. A restored game keeps its stored copy until its autosave is confirmed in browser storage (`persistLoaded`). Only then is that copy removed (`settle`).<br>**After a failure:** at most an extra copy remains, never a missing game. One attempt is made to put the archive bytes back, but only while the kept slot is unchanged, which makes the added entry a pure duplicate. That attempt is not relied on: storage is re-read, and the message states the result. "Nothing was changed" appears only when the bytes are identical. Otherwise it reads "No saved game was lost. Older saved games now also holds an extra copy of …". If storage cannot be re-read, the message says it could not be checked.<br>**Read failures:** the operation aborts with no writes ("could not be read … Nothing was written"). An unparseable slot is copied to `<key>.unreadable` before anything overwrites it.<br>**Trimming:** extra entries survive reloads and later operations. Only a step whose drop was disclosed beforehand trims, and the confirmation now names every entry that would go. Extra copies are labelled in Older saved games. | `tsave_recovery.mjs` (13 checks): real `localsave`/`savearchive`/`main.js`/`ui.js` over storage that fails the Nth write once or from the Nth write on.<br>**Cases:** import/keep-current, Restore previous game and archive restore, each with an empty, partial and full archive. Every write position plus one is failed, then the run is reloaded and retried.<br>**Assertions:** every original game stays stored or running; each "Nothing was changed" is byte-checked; every reported extra copy exists.<br>**Also covered:** the reviewer's exact sequence, read failures, unverifiable reads and unreadable slots.<br>**Browser:** Chromium scenario G uses real `Storage` failures, a page reload and a retry. |
| F2 | **Early elevator commitment bypassed hallway completion.** With both shaft hallways only ordered, the elevator could be committed ($9,500, quote "incomplete"), `verticalDone('elevator')` returned true and the lesson jumped to "Light both hallways". | **Completion:** the elevator step completes only when a committed shaft has finished hallways (`hall === 1`) beside it on both floors.<br>**Unchanged:** early commitment and the construction rules.<br>**Position checked:** once an elevator exists, its own position is checked rather than the planned one.<br>**Guidance after commitment:** "Elevator committed: let the F1 hallway finish", using the existing route to the time controls (Back to map, Close, Stop building or Requests first when blocked), or "Build the F2 hallway beside the elevator" when one is missing.<br>**Time:** the tutorial never resumes time. | `tfollowup_repairs.mjs` (5 elevator checks) on real construction ticks:<br>- commit while ordered: the step holds, and $9,500 is charged once<br>- wait wording and redirects, with Pause preserved through panel closure<br>- one hallway finished and the other ordered<br>- committed elevator with a missing hallway<br>- the normal order is unchanged<br>Chromium scenario H runs the build-up lesson on the real page. |
| F3 | **Info rows moved legacy completeness.** 249 cash rows plus one `info` row reported `cashCompleteFrom` 2 or 4 instead of 1. Cash was unaffected. | The legacy migration filters information rows out of the 250-row threshold and the first-cash-row lookup, as well as out of the cash rebuild. Ledgers without information rows (every genuine legacy save) migrate exactly as before. | `tfollowup_repairs.mjs` (3 checks):<br>- 249 rows with leading, trailing and both info rows<br>- 250 rows (boundary stays day 4) with info rows before and after<br>- the pre-repair formula reproduced for 0–400-row ledgers without info rows |

**Regression proof:** run against the unmodified `3fbea35` tree, every defect check above fails. The parity checks pass there, confirming unchanged legacy behaviour: genuine legacy migration, and the normal hallway-then-elevator order.

**Changed files:** `js/savearchive.js`, `js/main.js`, `js/ui.js`, `js/blueprint.js`, `js/tutorial.js`, `js/sim.js`; tests `tests/headless/tsave_recovery.mjs` (new), `tests/headless/tfollowup_repairs.mjs` (new), `tests/browser-qa/c22-emulation.cjs` (scenarios G, H). Two existing tests were updated:
- `treview_repairs.mjs` now uses an autosave double that writes browser storage, because a restore removes its archive copy only after a real save. Its keep-current assertions read the new report object and are stricter: a failure must be verified as no change.
- `tcandidate22.mjs` gives its spy double the new `keep()` entry point and keeps the archive-then-keep order assertion.

**Follow-up evidence** came from a fresh depth-1 clone of `b4ebcb9`, containing one commit. Logs are in [releases/candidate-22/followup](releases/candidate-22/followup/).

| Check | Result |
| --- | --- |
| Complete headless suite | **58/58** scripts (56 + 2 new) |
| Save recovery / follow-up repairs | 13/13 and 8/8 checks |
| Review repairs / pause policy / Candidate-22 regressions | 14/14, 13/13, 28/28 |
| Chromium emulation (headless; **not** Safari, **not** a physical iPhone) | **18/18** scenarios (16 existing + G, H), 0 console errors, 0 unhandled rejections |
| Economy | **Prices:** F2 complete $17,810, structure-only $12,470. F3 complete $10,210, structure-only $4,870.<br>**Cancellation:** full undo $17,810; partial refund $10,371; reinforcement $396 retained; re-quote $17,414; no duplicate charge after reload.<br>**30-day cash:** $975,148.25 / $975,247.00 / $974,890.50 / $974,716.50.<br>**Other:** seven-day legacy parity; F3 journeys with 16 reloads, 4 outage recoveries, 36 burst callers and 0 failures; 7,200 elevator journeys. All unchanged. |

**Follow-up limitations:**
- **Archive size:** after a persistent failure, Older saved games can hold more than 5 entries, extra copies included, until a later step discloses and performs a trim. This is deliberate: no undisclosed trim.
- **Restored entry after a failed save:** if the restored game's autosave fails, its archive entry stays listed. It is not removed automatically later, and the archive has no delete control. It is harmless, but visible.
- **Save confirmation:** "saved" is judged by `localsave.lastAt` changing after the autosave call. A save that reaches only the save server is treated as not saved, which is the safe direction.
- **Unreadable slots:** `<key>.unreadable` copies are kept but not shown in the interface.
- **Drop disclosure:** the prediction assumes the outgoing game is not already archived. If it is, fewer games are dropped than disclosed, never more.
- **Simulated failures only:** storage failures were simulated in Node and in Chromium. No real Safari quota or private-mode behaviour was observed.
- **Overlapping captions (resolved by final repair V1–V3):** in the scenario H screenshot ([followup-elevator-wait.png](releases/candidate-22/followup/emulation/followup-elevator-wait.png), 393×659), the blueprint captions near the shaft ("Place here", "Entrance", "Loading", "Drive aisle", "Elevator") overlap one another. Review repair #3 separated the ring label from captions and removed duplicate captions. It did not separate distinct captions from each other, so this remains a label-placement issue for the Safari pass.

## Final bounded repair (V1–V4)

Authorized after independent verification of `4690b64`. Code commit `30d8652fc7a9201ec0679211f4c8f479931973e7` (tree `2e31db782ac2c6ab51c644640e9696478f9a154d`), base `4690b64`. Presentation and validation only. Prices, construction rules, saves, pause behaviour and the six protected modules are unchanged.

| # | Reproduced at `4690b64` | Cause | Repair |
| --- | --- | --- | --- |
| V1 | Elevator step, 393×659: **10** overlapping caption pairs. "Place here", "Entrance", "Loading", "Drive aisle", "Elevator" and the building size were stacked under the ring. 430×932: 9; 1280×720: 5. | Each caption was drawn at its own map point. Only exact duplicate names were suppressed. | **Shared layout.** `js/captions.js` lays every caption out in one pass, in priority order: target, then unfinished prerequisite, then building context, then secondary route context.<br>**Placement.** A caption takes the nearest clear spot that avoids other captions and the interface: HUD, instruction strip, panels, bottom navigation, toasts and the coach ring. Nearby secondary captions are grouped ("Entrance · Loading"). A caption moved off its spot keeps a leader line to it.<br>**Never dropped:** target and prerequisite captions. When space runs out, only context and secondary captions are left out.<br>**Every frame:** the layout is recomputed, so it holds through pan and zoom. The previous placement is preferred, so captions do not flicker. |
| V2 | After early elevator commitment, "Place here" and the yellow elevator outline were still drawn. Captions for finished work (aisle, entrance, loading) stayed. | `currentBlueprintPlan()` read the raw lesson step, not the resolved one. | **Resolved step.** The blueprint follows the resolved step. A step waiting on, or missing, a hallway asks for no placement.<br>**Waiting view:** the building outline plus each unfinished hallway ("F1 hallway · under construction" / "F2 hallway needed").<br>**Completed work** and the existing building are no longer captioned.<br>**Unchanged:** early commitment and the completed-hallway predicate. |
| V3 | While waiting, the 9×9 building ran off the right edge (393×659: x to 439; 430×932: x to 481). Desktop usable area measured 456–592 px of 720. | **Waiting:** the ring points at the 4x button, so no map pan ever ran.<br>**Placement:** `panClear()` centred one anchor cell and assumed a 64 px top bar; the real one ends at 107 px.<br>**Desktop:** `safeRect()` treated the right-hand view-control column as top furniture. | **`frameStep()`:** once per step, waiting states included, it pans the step's whole outline into the measured usable area. The outline is the building plus the target or the unfinished hallways. It zooms out only if the outline cannot fit, and never zooms in.<br>**Gestures:** never during a drag or pinch. A step change mid-gesture is skipped, not deferred. The player's later camera movement is never undone.<br>**"Show me where"** frames the same outline.<br>**`panClear()`** uses the measured HUD.<br>**`safeRect()`:** a tall side column narrows the width. At 1280×720 the usable top is now 66, not 456. Desktop Fit and keep-selection-visible were rechecked. |
| V4 | F3 complaint → Cause & remedy showed "reported location unavailable" (Unit 315, F3); F1/F2 worked. | `reportedTarget()` accepted floors `[0,1]` only. | **Validation:** floors are checked against `floorCount()` and `RELEASE_FLOORS` (3).<br>**F3** reports open F3 at the reported unit and select it.<br>**Still rejected:** F4/F5 (even with five floor layers allocated), non-integer, negative or out-of-property floors, and bad coordinates.<br>**Kept:** a removed unit keeps its spot without selecting anything. A floor no building reaches any more opens from F1. |

**Measurements (headless Chromium, `4690b64` → `30d8652`)**

Each cell reads overlapping caption pairs / captions under the interface / "Place here" shown / outline inside the usable area. Pan and zoom columns use the renderer's own `pan()` and `zoomAt()`, the functions the drag and pinch handlers call.

| Viewport, state | Initial | After pan | After 1.5× zoom |
| --- | --- | --- | --- |
| 393×659 placement | 10/6/yes/yes → **0/0/yes/yes** | 10/0 → **0/0** | 7/0 → **0/0** |
| 393×659 waiting | 10/0/**yes**/**no** → **0/0/no/yes** | 10/0 → **0/0** | 7/0 → **0/0** |
| 430×932 placement | 9/6/yes/yes → **0/0/yes/yes** | 9/0 → **0/0** | 6/0 → **0/0** |
| 430×932 waiting | 9/0/**yes**/**no** → **0/0/no/yes** | 9/0 → **0/0** | 6/0 → **0/0** |
| 1280×720 placement | 5/4/yes/no → **0/0/yes/yes** | 5/0 → **0/0** | 1/2 → **0/0** |
| 1280×720 waiting | 5/0/**yes**/no → **0/0/no/yes** | 5/0 → **0/0** | 1/0 → **0/0** |

After the player's own zoom, the outline can extend past the edges. That is intended: framing never overrides the player.

Before and after screenshots and the raw measurement JSON are in [releases/candidate-22/final](releases/candidate-22/final/). The probe script is `visual-probe.cjs`. Screenshots were re-encoded as JPEG (quality 85, same pixel size) to keep the repository small. The JSON files hold the measurements.

All evidence comes from a fresh depth-1 clone of `30d8652` containing one commit. **59/59** headless scripts; **23/23** Chromium emulation scenarios (18 existing + I×2, J, K, L) with 0 console errors and 0 unhandled rejections; the 734×343 rotate-to-portrait scenario still passes. Economics are unchanged:
- F2 complete $17,810, structure-only $12,470; F3 complete $10,210, structure-only $4,870
- full undo $17,810, partial refund $10,371, $396 retained, re-quote $17,414
- 30-day cash $975,148.25 / $975,247.00 / $974,890.50 / $974,716.50
- F3 journeys: 16 reloads, 4 outage recoveries, 36 burst callers, 0 failures; 7,200 elevator journeys

The six protected modules and `savearchive.js` are byte-identical to `4690b64`.

**Cost:** `updateBlueprint()` takes 0.71 ms before and 0.65 ms after, per frame while panning, in headless Chromium on a desktop CPU. iPhone timing was not measured.

**Regression tests**
- `tests/headless/tfinal_repairs.mjs` (14 checks):
  - layout: crowding, obstacles, essential captions never dropped, stability through pan and zoom
  - resolved-step preview on real construction ticks: waiting, the normal order, a missing hallway
  - framing: whole outline, once per step, no snap-back, skipped mid-gesture, zoom out only; desktop and phone `safeRect`
  - F1/F2/F3 navigation through the production feedback sheet and click handler; unsupported floors; stale targets
- `tblueprint.mjs`: the four-rotation caption test still requires Entrance when the map is on screen. In the squeezed view it now also requires no overlaps and that only lower-priority captions are dropped.
- Chromium scenarios:
  - **I** (393×659 and 430×932): placement and waiting, after pan and after zoom
  - **J** (1280×720): a real mouse drag in progress when the step changes, then no snap-back and no undoing of a later pan; desktop `safeRect`; Fit (every building inside the usable area); keep-selection-visible
  - **K:** Operate → Feedback → the F3 report → View reported location opens F3, selects the unit and keeps Pause
  - **L:** walkthrough below
- **Run against `4690b64`, with the new test file and the new `captions.js` copied in:**
  - **Fail on real behaviour:** the resolved-step preview checks (3), the desktop `safeRect` check, and all three F3 complaint checks.
  - **Fail because the code is absent:** the framing checks (`frameStep`/`stepOutline` do not exist there). The base framing defect is shown by the measurements above.
  - **Pass:** the four caption-layout checks unit-test the new module, so they pass. The base collision defect is shown by the measurement table (10/9/5 overlapping pairs).

**Walkthrough (scenario L, 393×659)**
- **Setup, scripted and disclosed:** Maple, tutorial off, $1M, build-up lesson state set directly, earlier construction fast-forwarded.
- **Ordinary controls from there:**
  1. Instruction "Elevator", with the ring "Tap here" on the target.
  2. **Show me where** frames the building and target, with no caption collisions.
  3. **Use suggested placement** opens the build bar with Elevator at $9,500.
  4. **Confirm** charges $9,500 once and keeps the manual Pause.
- **Visible result:** a confirmation toast, and the lesson card moves to "Light both hallways" with its own uncluttered target.

Scenarios H and I cover early commitment → waiting (no placement cue, Pause kept, ring on 4x) → construction fast-forwarded → "Light both hallways".

**Set up, not played:** lesson state, fast-forwarded construction, cleared generated requests, and the injected F3 complaint (`sim.thought()` from a visitor at an F3 unit). These are test setup, not unaided play.

**Remaining defects and limitations (final repair)**
- **Found, not fixed (pre-existing, outside this scope):**
  - **What happens:** after Confirm the placed tool stays armed. When the next step targets a different tool, for example Light after Elevator, the ring reads "Tap here" on the new target while the build bar still shows the Elevator tool. A tap there would try to place another elevator, not a light. **Use suggested placement** switches the tool correctly.
  - **Cause:** `resolveStep()` redirects to **Stop building** only on non-build steps.
- **Framing scope:** the new framing applies to the build-up lesson. Other placement lessons and the core tutorial keep their single-point ring pan, which now uses the measured HUD top.
- **Caption widths** are measured with the browser's own font metrics. Safari metrics were not observed.
- **Gestures:** pan and zoom checks used the renderer's camera functions, plus a real mouse drag at 1280×720. No real touch pinch or double-tap was driven in emulation. The existing `tgestures`/`tmenu_touch` checks pass.
- **Desktop side columns** are detected by shape (taller than 1.5× their width, entirely on one side).
- **Milestone banner (pre-existing):** in the scenario K screenshot, the temporary "Grand opening · 14 new units open" banner covers the floor selector while it shows. The selected unit's sheet still reads "Floor 3".
- **Safari:** none of this was observed in Safari/WebKit or on a physical iPhone.

## Remaining limitations

- **Optional-lesson offers:** an offer chip holds time like other temporary pauses. Until it is started or dismissed, run-speed taps are inert, as designed. Browser scenario P dismisses offers so it measures only the paths it is testing.
- **Hallway sequencing:** verified headlessly with real construction ticks. Browser scenario H drives the build-up lesson's elevator step on the real page (fast-forwarding construction and clearing generated requests). The full lesson was not played through by hand.
- **Label placement:** collision avoidance is checked headlessly against blueprint captions. Final visual spacing on Safari is unverified.

- **No physical iPhone or Safari/WebKit was used.** Browser evidence is from headless Chromium device emulation. Touch feel, Safari rendering, background/foreground behavior and memory still need the private Safari playtest.
- Phone landscape is deliberately unsupported: a rotate prompt is shown. iPad and desktop landscape layouts were not re-certified beyond confirming the prompt does not appear at 1280×720.
- The journey suite arranges F3-only availability and recovered carts. It proves the route mechanics, not that random demand will lease F3. Without a Porter, Maple's three carts are commonly left stranded by ordinary traffic; this is existing cart-chore gameplay, but it is worth noting for playtests.
- The Candidate-21 "Watch the Owner finish" versus "Tap Unit 107" mismatch was not reproduced exactly. It is addressed structurally: the card, ring and accepted action are now derived from one resolved step.
- Older saved games normally hold 5 per browser; a persistent storage failure can temporarily leave more (see follow-up limitations). Any drop is disclosed first, naming each game. Only the active property's view is saved; switching property opens at EXT.
- Under `sanitizeSave`, the loader strips quote characters from saved strings (existing behavior; it affects a feedback dedupe key, not gameplay).
- The full core tutorial was walked headlessly (`twalk`). Only the repaired transitions were driven in the browser.

## Verdict

- **Automated gate:** PASS (follow-up `b4ebcb9`: 58/58 headless, 18/18 Chromium emulation; final repair `30d8652`: 59/59 headless, 23/23 Chromium emulation).
- **Release verdict:** **HOLD**, pending a physical iPhone Safari playtest of the private preview. Nothing found in this repair blocks source review or private publication.

Recommended Safari checks:
- F2/F3 labels and highlights
- the Preview on map round trip
- import confirmation
- the rotate prompt
- the tutorial strip above panels
- Cause & remedy navigation
- a full F2 → F3 build with save and reload during the service test
- Older saved games restore and import with a nearly full browser storage (Safari quota), checking the messages
- the build-up lesson's elevator step when the elevator is committed before the hallways finish

Accepted master is unchanged.
