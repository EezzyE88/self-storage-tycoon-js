# Self Storage Tycoon: QA and Bug Report

Build tested: `/home/user/workspace/sst/` (the same build as the delivered zip)
Methods:
- Full read of `sim.js` and review of the UI, renderer and tutorial code.
- Headless Node simulation tests: determinism, soaks up to 365 days, edge-case scripts, stress layouts.
- Playwright browser tests: Chromium with SwiftShader WebGL at 1280×800 and 390×844, plus an iPhone 13 profile.
- A check against the GDD v1.1.

Severity scale:
- **Critical**: breaks a core loop or crashes.
- **Major**: wrong behavior that players will hit and that hurts the game.
- **Minor**: an edge case, polish issue or API-only problem.

---

## Summary

| Severity | Count | Headline |
|---|---|---|
| Critical | 2 | Hired staff stop working after their first task. Crash when the Owner is given a task before an office exists. |
| Major | 7 | Orphaned construction, stuck Owner tasks, units that stay "operating" when they're unreachable, gate/cleanliness death spiral, no insolvency handling, GPU memory leaks, cart starvation |
| Minor | 14 | Placement bounds, demolish priority, API validation, unit numbering, UX gaps |
| Passed | 20+ | Determinism, save/load, invariants, tutorial completion, performance, mobile layout |

Bottom line:
- The simulation core is stable. No invariant violations over 365 days, no NaNs, deterministic, and save/load round-trips exactly.
- The **staffing loop is broken**, though. Together with fast gate wear, no automatic Owner work and cart starvation, any property left alone for a few weeks collapses. That is the biggest threat to the GDD's promise that "scale changes the player's job" (delegation).

---

## Critical

### C1: Staff get stuck in a home/idle loop after their first task
- **Where:** `sim.js` `updateStaff`, `case 'office': case 'idle'` (line 1530) and `case 'home'` (line 1557).
- **Repro:**
  1. Maple, skip the tutorial, hire a Porter.
  2. Let 3 or more make-ready or clean tasks pile up and run 5 days.
  3. The Porter sits around (12.0, 15.5), switching between `home` and `idle`. Tasks stay unassigned.
- **Root cause:**
  - In `home`, when `s.t % 5 === 0` and a matching unassigned task exists, the agent is set to `idle`.
  - On the next tick `idle` only calls `pickTask` when `s.t % 5 === 0`, which is now false. So it re-paths to the office and goes back to `home`.
  - This repeats forever, and each re-path throws away its progress.
- **Evidence:**
  - `t_porter`: stuck from day 4.
  - 365-day staffed soak: occupancy fell from 22/23 to 4/23 and cash went to −$17,234 from payroll with no work done.
  - Interior stress test (48 units, Porter + Tech): after 60 days the Porter was `idle` with 11 unassigned tasks, cleanliness was 0, and 5 of 6 carts were stranded.
- **Why the tutorial hides it:** the "Hire help" beat only needs one delegated task, and the first task works.
- **Fix:** call `pickTask` straight from `home` when a match exists, or remove the `% 5` gate in `idle` for agents that just came from `home`.

### C2: `act_ownerTask` throws when the Owner has no agent
- **Where:** `sim.js:724–729`.
- **Repro:** Empty Lot with the office not built yet → a task appears (e.g. a gate fault) → Inspector "Owner: service now", or a gate conversation choice.
- **Result:** `TypeError: Cannot read properties of undefined (reading 'task')`, and the action fails.
- **Fix:** guard with `if (!ag) return { ok:false, msg:'Owner has no office yet' }` and hide the button.

---

## Major

### M1: Cancelling a shell order orphans dependent hall and unit orders
- **Where:** `act_cancelOrder` (643) and the `waitShell` check in `step` (773).
- **Repro:**
  1. Creative Empty Lot: place a 1-floor shell, then halls and interior units inside it, all as orders.
  2. Cancel the shell order.
- **Result:** the dependent orders keep running because `s.objects[ord.waitShell]` is now undefined, so the condition is false. Halls and units get built on open ground with no building (seen: units=4, hallCells=7, shells=0).
- **Fix:** when an order is cancelled, cascade-cancel (and refund) every order whose `waitShell` points to it, or re-validate them.

### M2: Unreachable Owner-assigned tasks stay stuck forever
- **Where:** `startTask` (around 1512) keeps `t.assigned = owner` even when the route fails. `act_ownerTask` ignores the return value and still says "Owner is on the way".
- **Result:**
  - The task is stuck as assigned.
  - The UI hides the Owner and Vendor buttons for assigned tasks.
  - Porters skip it.
  - The only way out is demolishing the object.
- **Fix:** on a failed route, clear `assigned` and return `{ok:false, msg:'No walkable route'}`. Offer a "Reassign" button for assigned tasks.

### M3: Operating units never lose operating status when their access breaks
- **Where:** `computeUnitReqs` (245) only re-checks built/ready units. `decideLease` (903) has no reachability check.
- **Repro:** Maple → demolish the only interior building door (or pave a walkway over an aisle in front of drive-ups).
- **Result:**
  - Units stay `operating` and keep leasing.
  - Tenants can't reach them: 40 "can't reach" thoughts in 5 days.
  - Prospects still sign for unreachable units.
- **Fix:**
  - Re-check operating units too.
  - Add an `access_blocked` flag that shows on the lot, blocks new leases and raises tenant complaints.
  - Warn in the demolish preview when a route will be cut (the GDD section 11 says the player must see demolition consequences before confirming).

### M4: A property left alone collapses; wear and cleanliness are too harsh
- **Evidence (idle Maple, tutorial off):**
  - Gate keypad starts at 0.82. It becomes degraded on day 8 and fails on day 15.
  - It gets about 12.6 uses a day × 0.0035 wear per use, which is about 0.044/day.
  - Two days after the gate fails, Access experience drops to 0.19. Each customer loses about 35 minutes buzzing the office.
  - Cleanliness reaches 0 by around day 30.
  - All carts end up stranded within days (no automatic recovery without a Porter, and the Porter is broken, see C1).
  - `pickTask` skips the Owner, so make-readies are never done automatically.
  - Occupancy goes from 23 to 3 in a year.
- **Why it conflicts with the GDD:**
  - The GDD (§31–32, gdd.txt around 2310–2345) wants equipment that warns and degrades before severe failure, and "no maintenance chore simulator".
  - Right now the gate lasts about 15 minutes of real time at 1x.
- **Suggested tuning:**
  - Cut gate wear per use to about 0.0008.
  - Let the Owner pick low-priority tasks while idle in office hours (maybe with a policy toggle).
  - Let customers return carts to the nearest corral part of the time.
  - Slow dirt build-up by about 3x.

### M5: No financial warning or insolvency path
- Cash goes negative with no warning. Hiring, building and vendor calls are all allowed at any balance (seen: −$17k).
- The GDD §39 (gdd.txt around 2678–2686) asks for a clear financial warning and recoverable distress (e.g. a credit line, forced cuts, or a lender scenario).
- **Fix:**
  - Warn at 14 days of runway and show a toast when cash goes negative.
  - Block capex while negative.
  - Add an emergency loan or a "distress" state with clear recovery steps.

### M6: GPU memory leaks in the renderer (measured through `renderer.info.memory.geometries`)
- **Light and camera placement preview** (`render.js:717`): every preview update creates a new `RingGeometry` and never disposes it. 100 light previews added about 100 geometries (8 → 109). Dragging a light around the map leaks one GPU buffer per pointer move.
- **Scaffolds during construction** (`render.js:316`, and edges at 408): `rebuildStatic` makes a new `EdgesGeometry` per scaffold. `clearStatic` (295) only removes meshes and never calls `dispose()`. 15 rebuilds with one 6-unit order added 60 geometries (113 → 173).
- **Per-visitor materials:** each vehicle and person gets new `MeshStandardMaterial`s (512, 515, 533–534) that aren't disposed when removed. There's no GPU buffer leak because the geometries are shared, but objects pile up for GC.
- **Impact:** long sessions with lots of building slowly use up GPU memory, which matters most on mobile.
- **Fix:**
  - Cache the ring geometry per radius and the scaffold edges geometry (they are unit boxes, so one shared instance is enough).
  - In `clearStatic` and `syncPool`, traverse and dispose non-shared geometries and materials.

### M7: Cart starvation and "bays full" spam under load
- In the interior stress test (5× demand, 6 carts, 1 loading zone), over 60 days:
  - 293 "No carts at Corral" thoughts.
  - 679 "Loading bays are full" thoughts.
  - Cleanliness at 0.
- Carts are only returned by Porters, so C1 makes this much worse.
- The "bays full" thought also fires while the customer successfully parks elsewhere, which spams the thought feed.
- **Fix:**
  - Customers return carts some of the time.
  - Only emit the thought when no fallback is found.
  - Rate-limit thoughts per type.

---

## Minor

| # | Issue | Where | Fix |
|---|---|---|---|
| m1 | Lights and cameras can be placed outside the parcel (street, corner (0,0)) | `sim.js:462` plan light/camera, no `inParcel` | Add a parcel check |
| m2 | A roof light or camera on an occupied drive-up can't be demolished; the demolish pick chooses the unit first and refuses | demolish pick (around 498) | Prefer small attached objects when picking for demolish |
| m3 | `setRent` with NaN stores NaN (`clamp` passes NaN through); API only | `sim.js:710` | `Number.isFinite` guard |
| m4 | Booking a vendor twice charges twice; a vendor can be booked while staff are already working the task | `act_callVendor` (736) | Reject if already booked or assigned |
| m5 | `buyCarts` with negative `n` refunds cash (API only) | `sim.js:744` | Clamp `n ≥ 1` |
| m6 | Unit numbers collide past 99 per class (drive-up 101+ runs into interior 201+) | unit numbering | Use a per-class prefix (A-101, B-201) or 4 digits |
| m7 | `unitFront(u)[0]` can be undefined for edge units, which would throw in `endLease` dirt (`sim.js:896`) | 896 | Guard with `?.` |
| m8 | Time keeps running while the Menu and Save/Load modals are open (only the title screen pauses) | main loop | Pause while a modal is open, or add an option for it |
| m9 | Locked tool cards say "Tutorial ch. N" using the step index, not the chapter name; picking a locked tool via the API shows a faded toast under the top bar on mobile | ui.js tool cards | Show the chapter title |
| m10 | The office door side is fixed at placement; if it faces grass the player has to pave that exact cell, and the only feedback is a hint | office placement | Pick the door side automatically toward the nearest pavement, or allow rotation |
| m11 | The cancel refund rule is only shown in the inspector after commit; GDD §11 54.2 says the preview must state it before confirming | action bar | Add "Cancel refund 60% of unbuilt" to the preview |
| m12 | Staff work 24 hours (Porters clean at 3 AM); GDD §29 60.3 describes day shifts | staff update | Add a simple day/evening shift |
| m13 | No rent changes for existing tenants; changing asking rent only affects new leases (GDD §34 allows existing-customer rent increases) | pricing | Future feature |
| m14 | A few customers stay in `leave` for more than 10 game hours under heavy load (2 cases in 60 days) | vehicle departure queue | Check the exit queue ordering |

---

## Passed

**Simulation** (headless, `/tmp/qa/*.mjs`)
- Same seed gives the same state over 20 days.
- Save at day 10 and at an odd minute on day 3, then load and continue: identical to an uninterrupted run.
- 365-day idle and staffed soaks: no invariant violations (leases↔units, queues, elevator riders, cart ownership, vehicles, NaNs).
- No customer lives more than 1 day; the agent count stays bounded.
- The scripted tutorial reaches graduation. Empty Lot builds, opens and leases.
- Firing staff mid-task cleans up assignments.
- Two-floor interior building (48 units, 24 upstairs): all units operating, 1,576 elevator trips, average wait 13 minutes, occupancy 47/48, no deadlock.
- Performance:
  - 365 days take 1.6 s idle and 6.4 s staffed.
  - On a 148-unit creative lot with 62 agents, a step averages 0.02 ms (worst 8.6 ms). That's about 1.9 ms of simulation per real second at 4x.
  - `rebuild()` takes 0.62 ms.

**Browser**
- Screen→cell picking is exact at all 4 rotations.
- Every build category and every tool opens its action bar.
- Real mouse drags for gate, aisle, office and a 6× drive-up batch validate and commit with the right toasts.
- The inspector shows construction progress and the cancel refund.
- Growth lists the blockers to opening. Commission → Open works.
- Hire and fire for all roles, all overlays and policy toggles work.
- Rent stepper works.
- Keyboard: Space pauses and resumes; 1/2/3 set speed.
- Save code → load round trip is identical.
- A garbage code shows the "could not be read" toast.
- F2 is disabled without a second floor.
- Mobile 390×844: no controls off-screen on any tab. Build, Business, tutorial card and Menu screenshots render cleanly.
- No page errors or console errors during any browser run.

**Not covered**
- Real-GPU frame rate: SwiftShader renders at about 0.25–4 fps, so FPS numbers aren't meaningful.
- Audio output.
- Touch pinch and rotate gestures (only simulated through the API).
- Loading from a file.

---

## GDD compliance notes (main gaps)
- **§2.12 and §28–29 (delegation):** effectively broken by C1.
- **§31 (warn before failure):** degraded → failed takes about 7 days for the gate, but the starting condition and wear rate make it feel like a chore (M4).
- **§39 (recoverable failure):** no distress or insolvency system (M5).
- **§11 (edit/cancel/demolish):** no consequence preview for demolition that cuts routes (M3). Refund rate is not shown before commit (m11).
- **§29 (shifts), §34 (rent changes for existing tenants), §37 (financing):** not implemented.

## Suggested fix order
1. C1
2. C2
3. M3
4. M1
5. M2
6. M4 tuning
7. M6 disposal
8. M5
9. M7
10. Minor items

---

## Fix log (commit 7af2a1a)

| ID | Status | What changed | Verified by |
|---|---|---|---|
| C1 | Fixed | `home` now calls `pickTask` directly, so the home↔idle loop is gone. Staff also work a 7:00–20:00 day shift (GDD §29). | `t_porter`: the Porter completes make-ready, cart and clean tasks and returns to the office. 365-day staffed soak: 23/23 occupied, 0 tasks left open. |
| C2 | Fixed | `act_ownerTask` checks that the Owner has an agent and returns a clear message instead of crashing | `t_edges` E1 |
| M1 | Fixed | Cancelling a shell cascades to its dependent orders and refunds them. `step` also cancels any order whose shell no longer exists. | E2: shells=0, units=0, halls=0 afterward |
| M2 | Fixed | `startTask` always clears the assignment when the route fails. `act_ownerTask` reports "no walkable route" and blocks tasks already booked with a vendor. | E3: task stays unassigned and can be retried |
| M3 | Fixed | Operating units get a `blocked` flag when access or frontage breaks. They show a "Customers can't reach this unit" inspector card and a lot badge, and fire an `access_lost` toast. Leasing skips them. Walkway, loading and parking previews, and demolish previews, show "N open units will lose access" before you confirm. | 30-day run: 0 leases on blocked units. Demolish-door preview warns about 14 units and leaves the state untouched. |
| M4 | Fixed (tuned) | Gate wear per use cut from 0.0035 to 0.0012. Foot-traffic dirt about halved, loading apron dirt halved. New "Owner handles chores" policy (on by default after the tutorial): when the office is quiet in office hours, the Owner does make-readies, cleaning, cart runs and simple repairs. | Idle Maple, 365 days: 23/23 occupied every checkpoint, cleanliness 0.67–0.83, carts all in corrals, cash $26k → $49k |
| M5 | Fixed | Daily cash check: "about N days of costs left" warning, and a negative-cash warning that repeats at most every 3 days. A bank conversation offers a credit line (limit is the larger of $8k or 4× rent roll, about 1.2%/month). The Business tab has a Credit line card with Borrow/Repay. Hiring needs a week of wages in cash. | Tested headless and in the browser |
| M6 | Fixed | Renderer has `disposeTree`/`clearGroup`: static scene, preview and removed pool meshes free their own geometries and materials (shared ones stay cached). Scaffold and edge lines use one shared `EdgesGeometry`. Light/camera rings are cached per radius. | 100 light previews: 8 → 9 geometries (before: 109). Build + 15 rebuilds: 11 (before: 173). |
| M7 | Fixed | Customers who carry goods back to their vehicle push the cart to a nearby corral 70% of the time. Identical thoughts are grouped within 20 game minutes. | Interior stress, 60 days: carts all in corrals, cleanliness 0 → 0.84, "no carts" 293 → 91, "bays full" 679 → 473 |
| m1 | Fixed | Lights and cameras must be inside the parcel | E5 |
| m2 | Fixed | Demolish picks light/camera/sign first, then corral/HVAC, doors, and units last | E4 |
| m3 | Fixed | `setRent` rejects values that aren't finite numbers | E6 |
| m4 | Fixed | A vendor can't be booked twice, and booking one releases any staff or queue holding the task | E7 |
| m5 | Fixed | `buyCarts` clamps n to between 1 and 50 | E14 |
| m6 | Fixed | New units are numbered in blocks of 99 per class (101–199, then 1101–1199…), so classes never collide. Existing save numbers are unchanged. | 360 drive-ups, all unique, none in the 2xx/3xx ranges |
| m7 | Fixed | Guards for edge-facing units in `endLease` dirt and `computeUnitReqs` | — |
| m8 | Fixed | The game loop pauses while any modal (menu, save, load) is open | Browser: 0 minutes pass with the menu open, 28 minutes after closing |
| m9 | Fixed | Locked tools show "Unlocks: <chapter name>" | — |
| m10 | Fixed | An operating office whose door has no customer route moves its entrance to a reachable side (skipped during previews) | — |
| m11 | Fixed | Build previews state the refund rule before you confirm | Browser action bar |
| m12 | Fixed | Staff day shift (see C1) | — |
| m13 | Implemented (round 2) | Existing-tenant rent reviews added (see round 2 below) | — |
| m14 | Not a bug | Customers in `leave` for more than 10 hours were long multi-trip move-ins. The invariant "no customer alive more than 1 day" still holds. | — |

**Regression tests after fixes**
- Determinism and save/load continuation: identical.
- Full scripted tutorial reaches graduation.
- Empty Lot leasing works.
- Idle and staffed 365-day soaks: 0 invariant violations.
- Browser run: 0 console or page errors.

**Balance note:** Porter + Tech ($140/day) cost more than Maple's rent roll (about $83/day), so a staffed Maple slowly loses money. That's intended: delegation should pay off at larger scale.


---

## Round 2: newly implemented GDD systems

These systems from the GDD were missing or stubbed in round 1. All are now playable.

| GDD section | System | What's in the game |
|---|---|---|
| §22 Utilities | Electrical capacity | Each property has an electrical service capacity (Maple 40 kW, suburban 30, urban 36, rural 26). Loads: HVAC 12 kW, elevator 10, office 2, gate 1, auto door 0.8, restroom 0.4, light 0.2, fountain 0.2, keypad 0.15, camera 0.05. When demand exceeds capacity, lowest-priority loads shut off in this order: amenities, then HVAC, then elevators. Essentials stay on. Unpowered equipment behaves like failed equipment. The **Electrical Service Upgrade** (+40 kW, $6,500) fixes it. |
| §22 Utilities | Power feedback | Build previews warn above 85% of capacity and when a build would go over. There's a "Power shut off" toast, a red No-power card in the inspector, a Power overlay, and a Utilities readout in Business. |
| §21 Vertical | Stairwell | A 1-cell stairwell ($2,800) in 2-floor buildings. Only people without carts can use it. Upper units still need a working elevator to rent, so a broken or unpowered elevator blocks them. During an outage, people waiting for the elevator without a cart switch to the stairs. Cart holders leave the cart and hand-carry their things up the stairs, which costs convenience. |
| §22/§24 | Water service, restroom, fountain | **Water Service** hookup beside a building. **Restroom** off a hallway gets dirty with use; porters or the Owner clean it. **Water Fountain** on a hallway wears and needs repair. Both require water and power. |
| §24/§36 | Comfort experience | A new "Comfort" dimension is scored on interior visits. Long visits without a restroom, or with a dirty one, score low; a fountain adds a small bonus. Comfort feeds reputation at weight 0.4. |
| §34 | Existing-tenant rent reviews | In Business, raise rents +5% or +10% per product for tenants with at least 6 months of tenure who pay below asking. Raises are capped at asking rent. Satisfaction drops, and move-out hazard is 1.5x for 60 days. |
| §46.3 | Manager ($120/day) | Opens rent-ready units. Calls vendors for complex repairs that sit too long (after 90 min with no Tech on staff; otherwise after 6 h) and for urgent repairs after 4 h. Restocks empty corrals. Adjusts asking rents monthly per product: +3% above 92% occupancy, −3% below 75%. Keeps $2,500 in reserve. Decisions appear in a Manager log in the Operate tab. |
| §44 | Scenarios | **Maple Turnaround** (10 vacancies, broken lights and gate, dirty lot, $7k cash). Goal: 95% occupancy, 80% reputation and a $3,000/mo rent roll by day 150. **Go Vertical** (small urban parcel, $140k). Goal: 40 upper-floor units leased, elevator wait under 10 min and a positive 30-day operating contribution by day 300. **Climate Boom** (65% of shoppers want climate control). Goal: 24 climate units leased and 90% climate experience by day 240. Each scenario shows its goals and fail condition (net cash below a floor for 14 to 21 days) from minute one. A live goal card replaces the tutorial card. |
| §45 | Custom sandbox | Choose the market (suburban, urban infill, rural highway), starting capital ($30k to $250k), demand (low, normal, high) and equipment wear (off, gentle, normal, harsh). |
| §46 | Multi-property company | The Growth tab has Portfolio, Company attention and Acquisitions sections. You can buy empty parcels in three markets or an operating 23-unit facility, and switch between properties. Each property keeps its own books; send cash between them in $10k steps. All properties run on one clock, and faults, cash warnings and power problems at other properties post to the company feed. Save codes include the whole portfolio. Acquisitions unlock after the tutorial. |
| §63.5 | Pre-build consequences | The action bar shows cash before and after the build, how many days of costs that covers, and the power after the build. |

**New tests**
- `t_new`: in a 48-unit two-floor building with an elevator, stairs, restroom, fountain and water, the site fills to 48/48. Over 20 days there were 62 stair climbs and 163 restroom uses, and porters clean the restroom. Adding two HVAC plants over capacity shuts one off; the upgrade restores it. An elevator outage blocks all 24 upper units ("Elevator is out of service") while people keep using the stairs. The Manager bought a cart, called the elevator vendor and raised rents. The rent review applied once, then correctly refused. 0 invariant violations.
- `t_scen`: all three scenarios start cleanly. An idle Turnaround does **not** win: it reaches 100% occupancy but only 80% reputation and a $2,645 roll, so the player has to act.
- `t_vert`: a scripted Go Vertical build with 38 upper units reaches 38/40 at 100% occupancy, with elevator wait at 9.7 min. Winning takes another expansion. Without a Tech, the elevator decays and upper occupancy falls, which is the intended lesson.
- Regression: determinism and save/load identical; tutorial graduation OK; 365-day idle Maple soak with 0 violations and full occupancy.
- Browser (desktop 1280 and mobile 375): scenario picker, goal card, custom sandbox, acquiring a property, cash transfer, switching properties, saving and loading a 2-property company, the power-shed toast and inspector card, and the Power overlay. 0 console or page errors.

**Known limits:** Restroom trips aren't animated; use is simulated as part of the visit. The acquired facility is a Maple-layout variant. The portfolio is capped at 5 properties.

---

## Round 3: Browser QA pass

Method: headless Chromium (SwiftShader WebGL) at 1280×800 and 375×667 (touch, DPR 2). Covered:
- DOM scans for `undefined`/`NaN`/`[object`/`Infinity` text and for viewport overflow or clipping.
- Every build category and every tool's action-bar preview.
- All 15 object inspectors, every tab, overlay and floor view.
- All three scenarios: tour, run, forced end card, and save/reload.
- Company flow: buy an urban parcel, an operating facility and a rural parcel; switch properties while tracking GPU memory; background simulation; cash transfer.
- Save/load: company save/load, garbage save codes, keyboard shortcuts.
- Real mouse-drag construction and a real touch tap.
- UI actions: rent review and Manager hire/fire.

### Findings

| # | Severity | Issue | Status |
|---|---|---|---|
| R3-1 | Major | The renderer built the ground, upper-floor, overlay and outer planes and the scenery only once, sized to the first map (44×34). Go Vertical and any other 36×28 property drew a second, offset street and a mis-scaled ground texture. | Fixed: `Renderer.resizeWorld()` runs on every `setSim` and rebuilds canvases, textures, plane geometry and scenery when W/H change. Go Vertical verified visually. |
| R3-2 | Minor | Pooled vehicle, person and cart meshes were removed but not disposed when switching property (small GPU leak). | Fixed (`disposeTree`). Switching memory stays flat at 15 geometries / 49 textures. |
| R3-3 | Major (UX) | After Customer Amenities was added, the Build category chips overflowed on desktop, pushing Edit/Demolish off-screen. The selected chip could also be scrolled out of view. | Fixed: chips wrap on screens wider than 700px. On mobile the active chip scrolls into view (verified). |
| R3-4 | Major (mobile) | The top HUD overflowed at 375px once cash reached six figures, clipping the Menu button (right edge 380px of 375px). | Fixed: tighter mobile chip padding and speed-control gaps. Menu now ends at 367px with $300,000 cash. |
| R3-5 | Minor | Scenario goals were hidden whenever any sheet was open, on desktop as well as mobile. | Fixed: the rule now applies only at 700px and below. |
| R3-6 | Minor | The scenario card re-rendered with its fade-in animation every time a goal value changed, so it flickered and could be caught at opacity 0. | Fixed: re-renders of the same scenario state skip the entry animation. |
| R3-7 | Major (balance) | Acquired properties started at $0 and daily opex drove them negative at once (−$144 on day 1), triggering cash warnings in the background. | Fixed: each acquisition price now includes $5,000 of opening working cash for the new property. The UI note is updated. |
| R3-8 | Minor | The header property count (e.g. "(1/4)") did not update after an acquisition until you switched property. | Fixed: the header refreshes immediately (verified "Suburban Lot (1/2)"). |
| R3-9 | Minor | A bad save code only raised a toast behind the Load modal. | Fixed: the modal shows an inline error in the text field. |

### Passed checks (no action needed)

- No `undefined`/`NaN`/`[object`/`Infinity` text on any screen.
- No page errors. The only console warning comes from the deliberate garbage-code load test.
- All tool previews return a coherent valid, incomplete or invalid status with a reason, cost and time.
- Real mouse-drag aisle placement: 10 cells, $450, confirmed into construction.
- Company save/load restored all 4 properties and the active index. The garbage code was rejected.
- Background properties kept simulating: Oak Ridge kept 22 leases with activity in its feed.
- Rent review UI raised the rent roll ($2,481 to $2,488) with a notice. Manager hire through the UI worked.
- Regression suite re-run: determinism, edges (0 invariant violations), fixes, interior, porter, rent review, scenarios, vertical (300 days), soak, tutorial graduation and tenant feed. Results match Round 2.

---

## Round 4: iPhone optimization

Tested with Playwright iPhone device profiles (SE 320×568, 15 Pro 393×852, 15 Pro Max 430×932, 15 Pro landscape). Notch and home-indicator safe areas were simulated. Chromium stands in for Safari because WebKit cannot run in this sandbox, so a final check on a real iPhone is still recommended.

| # | Area | Problem | Change |
|---|---|---|---|
| i1 | Landscape | The title screen overflowed off the top and could not be reached. The Build sheet shrank to about 190px, and its wrapped category chips left no room for tools. | Landscape phones now use a left tab rail, and sheets and the action bar dock on the right at full height. The tutorial and scenario card sit in between and turn compact while a sheet is open. The title screen uses a two-column menu. |
| i2 | Short screens | Category chips were squashed vertically, with labels cut off. | The sheet header and chips no longer shrink. |
| i3 | 320px iPhones | The Menu button spilled off-screen. | A compact HUD below 360px wide. Speed buttons are wider on 385px+ phones. |
| i4 | iOS zoom | Safari ignores `user-scalable=no`, so a pinch or double-tap zoomed the whole page. | Blocks the gesture events, adds `touch-action: manipulation` to controls, and disables the long-press callout. |
| i5 | iOS text fields | The 11px save-code field made Safari zoom in on focus. | Text fields are 16px on touch devices. |
| i6 | iOS audio | WebAudio unlocked only on pointerdown, and stayed "interrupted" after switching apps. | Unlocks on touchend, click and key, and resumes whenever it isn't running. Uses `navigator.audioSession = 'playback'` where supported. |
| i7 | Backgrounding | The game kept its speed state and its audio context running while hidden. | Pauses the simulation and suspends audio while hidden, and restores the previous speed on return. |
| i8 | Saves | The download link is unreliable on iPhone, and `accept=".sst"` greyed out save files in the iOS picker. | On touch devices, Save uses the share sheet ("Save to Files"), with the download as a fallback. The file picker no longer filters by extension. |
| i9 | Viewport | `vh` sizing counted the hidden Safari toolbar. | `dvh` sizing for sheets and modals, with `vh` fallbacks. |
| i10 | GPU | 4×MSAA plus a 2048 shadow map at DPR 2 is heavy on phones. | Touch devices skip MSAA (DPR 2 already smooths edges) and use a 1024 shadow map. DPR stays capped at 2. |
| i11 | Stability | iOS can drop the WebGL context under memory pressure. | Context loss is handled; on restore, the static scene and textures are rebuilt. |
| i12 | Home screen | Adding it to the home screen had no icon, and the status bar looked wrong. | Adds 180/512px icons, a web manifest (fullscreen) and a black-translucent status bar that respects the notch. |
| i13 | Tap targets | Tutorial Hide/Skip buttons were 18px tall. | At least 34px tall on touch devices. |

Verified:
- Desktop layout unchanged, with 0 errors.
- Real tap-to-select works: unit panels opened from a touch tap and from a mouse click.
- Real touch-drag and mouse-drag previews work.
- Determinism and save/load continuity tests pass.
- No console errors on any iPhone profile.

---

## Round 5: Pre-publish hardening

Source: the security review before publishing found no BLOCK findings and one WARN (crafted saves could inject HTML). Earlier rounds also left some recommendations open.

| # | Item | Change | Verification |
|---|---|---|---|
| s1 | Stored XSS through crafted saves (WARN) | Every imported string is cleaned: markup characters are removed, apostrophes become typographic, and length is capped. Prototype keys (`__proto__`, `constructor`) are dropped and non-finite numbers are zeroed. | A crafted save with `<img onerror>` in staff, object and property names and in a conversation's severity loads, but the script never runs and no image element is created. |
| s2 | No schema validation on load | `validState()` rejects saves with the wrong map size (12 to 96), mismatched ground/hall/dirt arrays, malformed objects or coordinates, non-array collections, unknown staff roles, unknown markets, or a missing time or cash value. Company saves are capped at 12 properties and every property is validated. | Maple, sandbox, creative, all 3 scenarios and a 5-property company all round-trip. Five malformed variants are rejected. |
| s3 | Unescaped HTML output points | Sheet titles and staff names are now escaped (defense in depth; toasts, portfolio and header were already escaped). | Browser test with the crafted save. |
| s4 | Third-party script supply chain | three.js r170 is bundled locally (`vendor/three.module.min.js`) instead of loaded from jsDelivr. The game no longer needs a CDN to run; only the web fonts are external, with system-font fallback. | Loads and renders locally and on the hosted preview. |
| s5 | No Content-Security-Policy | A meta CSP limits scripts to the site itself. It also blocks plugins, `<base>` tags and form posts, and allows only Fontshare for fonts and styles. Sets `no-referrer`. Inline scripts stay allowed because the hosting platform injects its own preview script. A hash-only policy blocked it, so that tightening is not possible here. | 0 CSP violations on the hosted preview. |
| s6 | Developer notes shipped | `progress.md` is left out of the build. | Build contents: css, js, vendor, icons, manifest, index.html. |
| r1 | Toggle tap targets 28px tall | An invisible hit area makes them 44px tall without changing their look. | Visual unchanged. |
| r2 | Menu button 7px into the margin at 320px | A tighter clock chip. The speed buttons stay 24px wide. | Menu button ends at 312px of 320px. |

Regression: determinism and save/load continuity tests pass, the desktop UI pass has 0 errors, and the hosted preview loads, plays, saves and reloads.

Remaining recommendation: a real-device check on an iPhone in Safari. That covers the share-sheet save, audio after backgrounding, and landscape use with the Safari toolbar showing.

## Round 6: iPhone UX improvements (from comparison)

All seven improvements from the side-by-side comparison are in. They were tested in Chromium using iPhone SE, iPhone 15 Pro (portrait and landscape) and 1280px desktop profiles. There were no console errors, and the determinism, save-validation and XSS regressions all pass.

| # | Improvement | Result |
|---|---|---|
| 1 | Peek-height sheets | On phone portrait, sheets open at about 46% of screen height and are only as tall as their content. A grab handle expands them to full height; you can tap it or swipe. Swiping up expands, swiping down shrinks, and swiping down from peek height closes. After a selection, the map pans so the selected object stays visible above the sheet. Landscape side sheets now fit their content instead of always running full height. |
| 2 | Map pins | Pins mark repair or PM, make-ready, restroom cleaning, hallway or loading cleaning, late payment, blocked or unpowered units, ready-to-commission units and stranded carts. A worker badge appears once someone is assigned; verified: a make-ready pin showed the badge, and a gate repair pin gained it after "Send Owner". Tapping a pin selects its object. |
| 3 | Unit numbers | Unit numbers appear at door level once you zoom in far enough (24px or more per cell) and are hidden when they would collide. Colours show occupied, vacant and in-progress units. They hide while a build tool is active. |
| 4 | Coach bar | After the tutorial, a one-line next step appears with the owner's status ("You: free · 13h left", "working", "off until 7 AM"). Tapping it opens the relevant object or tab. It sits under the HUD on phones, bottom-centre on desktop and beside the rail in landscape. It hides whenever a sheet or modal is open. |
| 5 | Primary action | Each inspector now starts with its single most useful action as a full-width button ("Owner: return it", "Send Owner", "Commission unit", and so on). |
| 6 | HUD cash chip | The cash chip adds an occupancy and daily net line: "22/23 · +$54/d" on phones and "/day" on desktop. It is 77px wide at 320px and does not wrap. |
| 7 | Fit on open | Phones open framed to the built facility plus a margin; an empty lot frames the whole parcel. A Fit button in the zoom controls does the same. The minimum zoom for fitting was lowered to 0.25 so large lots fit. |

Fixes made during QA:
- Pins and labels drew over the view controls, so they now render beneath the HUD.
- The cash sub-line wrapped at 393px and was overlapped by the coach, so it now stays on one line.
- Fitting stopped at zoom 0.55 before the lot fit, so the minimum is lower and fitting targets the built area.
- Selecting a cart did not pan it clear of the sheet; it now does.
- Phones show at most 2 feed toasts at a time.

## Round 7: Release-readiness improvements

| Area | Change | Verified |
|---|---|---|
| Autosave | A small save server (`server/save_server.py`, stdlib + SQLite) holds one slot per browser, keyed by the host's visitor id. The game autosaves every in-game day, at least once a minute of play, and when the page is hidden or closed. The title screen shows **Continue** with the property, day, cash and save age. The menu shows autosave status or an offline warning. Save codes and files remain as backups. | Played to day 5 → reload → Continue restored day 5 and cash exactly. The server rejects malformed codes and strips markup from metadata. No console errors. |
| Adaptive graphics | If active play stays under about 36 fps for 3 s, quality drops one step. Medium lowers resolution to 1.5× and shadows to 512. Low uses 1× resolution with no shadows. Quality never steps back up mid-session. The menu adds Quality (Auto / High / Medium / Low). | Menu cycling works. |
| Battery | When paused, on the title screen or in a dialog, with no input for 1.5 s and the camera still, the game redraws about 4 times a second. The Battery saver toggle caps drawing at about 30 fps. The simulation clock is unaffected. | 8 draws in 2 s while idle. Pins track correctly after camera moves. |
| Restroom trips | Visitors to interior units who use the restroom now walk to it, go inside for 4–8 minutes, then leave. The restroom's status light pulses while it is in use. Wear and satisfaction use the actual trip. | 6-day run: 10 trips, 10 uses, no stuck agents, comfort 0.94, deterministic across runs. |
| Acquired facilities | Each acquired facility gets its own name (Oak Ridge, Cedar Point, Willow Creek, Pine Hollow). Layouts alternate mirrored and original, and gate condition varies. | Mirrored layout: 10-day run with 0 access failures and every unit reachable. Renders correctly. |
| Balance check | Idle 60-day runs. Maple slowly gains money (about $50/day) at full occupancy. Turnaround refills units passively but fails its rent-roll goal unless the player acts (raises rents or adds units), which is intended. Go Vertical and Climate Boom burn slowly while idle. | No runaway or collapse without player action. |

Regressions pass: determinism, save/load continuation, save validation, XSS, and the iPhone UX script.

Still needs people or hardware I can't provide:
- A real iPhone Safari check.
- Human playtests for pacing and clarity.
- On-device battery and thermal measurement.

Autosave in the preview depends on the save server running in this workspace. A published build would run its own copy. SQLite persistence there is fine for a small audience, but it isn't production-grade.

---

## Round 8: Showcase

Goal: move the game from "well built" to "wow" without touching the simulation authority. Every addition is presentation-only; the C++-derived sim, saves and `render_game_to_text` are unchanged.

### What was added

| Feature | What it does |
|---|---|
| Living title screen | The title card sits over a live, simulated Maple Street (separate sandbox sim, never your save). The camera drifts through orbiting shots while the day runs from golden hour through dusk into night. |
| Miniature lens | Post-processing pass: tilt-shift focus band, soft bloom that only switches on after dusk (street lamps, headlights), filmic tone map, vignette, fine grain. Menu toggle; auto-off on low quality. |
| Photo mode | Camera button or `P`. Light presets (Morning, Noon, Golden, Dusk, Night), looks (Natural, Warm film, Blue hour, Vivid, Mono), rain/clear, freeze time, auto-rotate, miniature and focus sliders, tap to focus. Shutter saves a captioned JPEG with share/save. |
| Follow cam | Tap any customer or staff member: the camera tracks them and a card shows name, role, current activity, their storage story, mood, rent and tenure, with "Open unit". |
| Cinematic tour | Menu > Showcase. Hands-off camera tour of the property; any drag or pinch hands control back. |
| Celebrations | Banner, sparkle burst and musical flourish for milestones, grand openings, scenario wins, tutorial complete and 100% leased. Floating money pops for leases, rent and repairs. |
| Night and rain | Headlight pools on the ground at night, wet darker asphalt and rain ripples in storms. |
| Adaptive score | Gentle 84 BPM score whose layers follow the moment: title, building, quiet night, photo mode, milestone lift. |

### Bugs found and fixed during this round

1. Audio parameter automation re-issued every frame (gain ramps piled up on the audio timeline). Now only updated when the target changes, with cancel-and-hold.
2. Bloom produced spiky, dotted halos around lamps. Rewritten to sample the render target's mip chain: smooth halos and cheaper blur.
3. Bloom was active in daylight. Now night-only.
4. Tilt-shift on portrait phones blurred too much of the property. Sharp band widened 35% on tall screens.
5. Tour stopped itself when the renderer re-framed the property (internal pan). Internal pans are now exempt.
6. "Fully leased" celebration read the wrong occupancy field. Fixed.
7. Autosave server was missing from the previous bundle. Restored (`server/save_server.py`) with the proxy placeholder.

### Verified

- Title attract mode runs, stops on New game, camera settles to the standard view.
- Follow cam card renders for a tapped customer (e.g. "Nate Nguyen, Quick visit, Unit 202, Walking to Unit 202").
- Photo mode: presets, looks, rain, shutter (1280x800 JPEG, ~165 KB), Done clears all overrides.
- Tour starts, and a drag cancels it.
- No console errors; GPU memory stable across tour, photo mode and 8,000 sim ticks (geometries 11 to 13).
- Mobile 390x844: no horizontal overflow; photo bar fits with scrolling chip rows.

### Caveat

Testing used software rendering, so frame rate could not be measured meaningfully. Adaptive quality still drops the lens automatically on slow devices. Please check on an iPhone that it feels smooth.

---

## Round 9: GDD systems (collections, financing, conversations)

A gap review against the Master GDD v1.1 found three systems that were thin or missing: §36 Delinquency, Liens and Auctions (a lease jumped straight from "late" to an instant lien sale), §37 Capital and Financing (a credit line only), and §26 Customer Conversations (4 of the 7 listed conversation types, with no staff automation and no expiry). All three are now built into the simulation. Every choice changes real game state.

### §36 Collections ladder

| Stage | When | What happens |
|---|---|---|
| Past due | Missed bill | Late fee (policy: none, $20 or $40) added at 5 days. About 20%/day chance the tenant pays. |
| Delinquent | 15 days | The unit is overlocked (optional policy): the tenant can't make access visits. Red lock pin on the map. |
| Lien eligible | 30 days | Critical "Collections" conversation: send lien notice, offer a payment plan, or waive fees and wait 14 days. A Manager, or the "Automatic lien notices" policy, handles this for you. |
| Payment plan | On offer | 72% accept: half the balance now, fees waived, overlock removed, the rest due in 14 days. A broken plan returns the account to Delinquent. |
| Lien notice | 14 days | The tenant can still pay (about 3.5%/day). |
| Auction scheduled | After notice | The next Saturday at 10 AM. Can be pulled from auction for 14 days. |
| Auction day | Sat 10 AM | Set piece: a crowd of bidders gathers at each unit's door, with an "Auction day" banner. About 80 minutes later each lot sells (12% chance of a bidding war), with sparkle, money pop and a closing banner. The unit then needs a double-length clean-out. The alternative "Clean-out and donate" policy costs $120 and has no sale. |

The Business tab has a Collections card: a six-stage ladder with counts, account rows with actions, and the policies above. Unit inspectors show the stage, amount owed and days late, with the same actions. **Maple Turnaround** now starts with three accounts behind (8, 18 and 27 days), so the system appears in the first minutes of that scenario.

### §37 Financing and the operating statement

- **Operating statement (30 days):** collected rent + ancillary (late fees, auctions) − operating costs − payroll − vendor service = **operating contribution**. Construction (capital), debt service and loan proceeds are shown separately, then net cash change (GDD §63.1–63.2). Vendor calls, interest and principal now have their own ledger categories.
- **Expansion (term) loans:** 7.5%, 60 months, amortized monthly payment. Approval is capped so all loan payments stay at or below 45% of the monthly rent roll (up to $250k). Loans unlock after the tutorial (§63.3: early growth is cash-funded). The loan buttons show the monthly payment and resulting cash before you commit. Each loan can be paid off early. The credit line remains for short cash gaps.

### §26 Conversations

New types: **prospect sizing** ("I'm storing a two-bedroom apartment. Is a 10x10 enough?", where recommending a 10x20 changes the lease, and advising badly leaves a cramped, less satisfied tenant), **maintenance complaint** (a failed light near the tenant's unit: send the Owner, call an electrician or log it), **pricing question** after a rent review (explain, hold the old rate for 6 months, or ignore it at a satisfaction cost), **move-out** (a retention offer of 10% off, whose success depends on the tenant's satisfaction; the tenant stays and the move-out is cancelled) and **collections**. Existing gate, cart, elevator and bank conversations are unchanged.

- **Automation at scale (§16.3):** during office hours, a Clerk at the counter or a Manager answers routine conversations after 15 minutes using your policies (for example, retention offers on or off). Each answer is logged in the Manager log.
- **Expiry:** every conversation shows a countdown ("41h to answer") and falls back to a stated default when it runs out.

### §42 Mastery milestones

Added: "Kept a tenant from leaving", "First lien auction" and "Financed growth", each with a celebration banner.

### Fixes in this round

- Money pops floated above open sheets and dialogs. They now sit under the HUD and sheets.
- Celebration banners covered the conversation card on portrait phones. Moved to the middle of the screen.
- Collections conversations stayed open after the account moved on (paid, noticed or auctioned). They're now removed.

### Verified

- **Headless:** determinism identical across runs; save → load → continue identical over 20 days; old saves without the new fields load with defaults.
- **Ladder:** six forced accounts showed the full progression (lien → notice → Saturday auction with 2 lots sold for $520 → clean-out tasks). Payment-plan and notice paths also verified.
- **Soaks:** Maple 365 days ($26k → $45.6k, 23/23 occupied), Turnaround 150 days, Go Vertical and Climate Boom 60 days each. No crashes.
- **Clerk automation:** a Clerk answered move-out conversations and the answers appeared in the log.
- **Browser (1280 desktop, 390 phone):** Collections, Financing and statement render with no undefined/NaN text or horizontal overflow. Auction crowd spawns (6 bidders) and is cleaned up. No console errors.

---

## Round 10: Step-by-step tutorial

The tutorial is now a guided checklist. Each of the 12 parts is broken into concrete steps (74 in total), each saying exactly which button to tap and where it is.

### What changed

- **Step checklist on the tutorial card:** a progress bar ("Step 3 of 7"), the current step highlighted with a detailed "how" line (for example, "Tap the Drive-Up 10x10 card. The action bar opens at the bottom with the price"), and the next two steps listed. Finished steps are ticked, and earlier steps collapse into "N steps done".
- **Coach ring:** a pulsing yellow ring and label ("Tap here", "Drag here", "Open Build", "Tap Utilities", "Speed up", "Got it") sits on the exact control the current step needs. It covers bottom-bar tabs, build categories, tool cards, Confirm, Climate on/off, speed buttons, floor buttons (F1/F2), overlays, Hire Porter, Send Owner, Start Owner Make-Ready and Commission.
  - **Menu path:** if the needed control isn't on screen yet, the ring points at the control that leads to it. For example, it points at Build first, then the category, then the tool card.
  - **Map targets:** Unit 107, the corral, the broken light and build spots get a ring on the map.
  - **Auto-pan:** if a map target is hidden under the tutorial card, a panel or the screen edge, the camera pans it into the clear area once per step.
- **Exact placement guidance:** every build step names the spot in plain terms, backed by coordinates that were verified to build (for example, "press on the grass touching the east edge of the main aisle, just below the cross aisle, and drag straight down about 8 cells"). Multi-part builds are separate steps: HVAC, then Light, then Climate units; and for the two-floor building, aisle, shell, F1 hallway, wide door, loading zone, F2 hallway, elevator, lights on both floors, F2 units, then commission.
- **"Why this matters":** a toggle on each part explains the underlying system (billing timing, cart flow, coverage and reputation, what climate units need, elevator capacity).
- **Money part:** it now waits for "Got it", so the explanation of the Business tab stays on screen after the tab opens.
- **Part banners:** each finished part shows "Part N of 12 complete · Next: …".

### Bugs fixed

- The "Graduated · Maple Street is yours" banner fired after every tutorial part. It now fires only at the true graduation.
- The Make-Ready instructions called the button yellow. They now describe it as the big button at the top of the panel.
- The layout for the two-floor building is now one that validates: the shell's south wall touches the aisle, and the loading zone sits on the aisle below the door. The earlier layout left F2 units with "no route to a building entrance".

### Verified

- **Headless walkthrough:** the full tutorial played through every step in order, using the exact placements the instructions describe. All 12 parts completed on day 5, and the new F2 units reached Ready and were commissioned.
- **Determinism:** step guidance only reads game state. The only simulation change is a build log written during player build actions. Determinism and save continuation remain true.
- **Browser (1280 desktop, 390 phone):** the ring lands on the right control at each step checked (welcome, Unit 107, Make-Ready button, 1x, Business, Got it, Build, category, tool card, drag spot, Confirm, 4x, HVAC path). No undefined text, no horizontal overflow, no console errors.

## Round 11: Director recommendations

### What changed
1. **Market pressure** (off during the tutorial, in creative mode and in authored scenarios)
   - Seasonality: shopper traffic swings ±20% over the year (peak in early summer).
   - Competitors: the first is announced around Day 45–75 and opens 30 days later, priced 6–12% under market. Up to 3 per property. They take a share of shoppers (a strong reputation limits this) and raise move-out risk for tenants paying well above their price.
   - Tenant reviews: stars come from real satisfaction, and the text names the weakest experience dimension. The average rating moves shopper traffic by about −22% to +8%.
   - Costs rise 4% a year, plus a new daily "tax & insurance" line. Market rents drift up 3% a year, so static asking rents fall behind.
   - Maple's pent-up post-tutorial demand settles to 40% (the tutorial backlog is gone).
2. **Legibility**
   - Monthly report card every 30 days: a grade from A to F (occupancy, margin, reputation, reviews, pricing vs. market, growth), the change since last month, and the top 3 ranked suggestions.
   - Business has new sections: Your market (season, competitors, cost and rent drift), "Why shoppers didn't sign" (with a fix for each reason) and Reviews. New lost-shopper reasons: "competitor" and "reputation".
3. **Tutorial cut to 8 core parts / 25 steps**: welcome, make-ready, lease, money, expand, repair, hire, graduate.
   - Interior carts, security coverage, climate and building up became optional lessons. Two new lessons cover collections and financing.
   - Lessons are offered when the situation comes up (for example, after 2 or more climate shoppers are lost in 14 days) or anytime from Growth → Lessons. They have their own progress card with "End lesson".
4. **Operator career**: 5 levels based on portfolio rent roll and property count, with a progress bar in Growth.
   - Level 2: rush contractors (+25% cost, 2× speed toggle in the build bar) and priority vendors (~5h instead of ~10h).
   - Level 3: urban and rural parcels, and a 6.5% loan rate.
   - Level 4: −8% operating costs and +10% shopper traffic.
   - Renovations on vacant units: convert an interior unit to climate (checks HVAC headroom), or split a drive-up 10x10 into two 5x10s.
5. **Phone declutter**: overlapping map pins fold into one pin with a count badge. Only the most urgent request card shows, with "+N more". Identical nearby pops merge ("Rent-ready ×2") and are capped on phones.

### Balance soak (headless, Maple after graduation, 365 days)
| Play style | Cash | Occupancy | Rent roll | Grades by month |
|---|---|---|---|---|
| Idle (Owner auto-chores on) | $44.1k | 22/23, swings 83–100% | $2,585 | mostly B, one C |
| Absent owner (chores off) | $22.6k | 3/23 | $276 | F from month 4 |
| Strategic (expand + climate + reprice) | $37.0k after ~$12k invested | 34/34 | $3,617 (+40%) | C early, then B/A |

Honest read: idle play no longer pins at 100%, and neglect now collapses. But the Owner's automatic chores still make "idle" fairly safe on a 23-unit site. The real gap between play styles shows up in rent roll and growth, not in year-one cash. Scenarios are unchanged (pressure is off there), so Turnaround still fills easily.

### Verification
- Determinism and continuation: true. Tutorial walkthrough: 8 core parts, then all 4 Maple lessons complete. Scenario soaks are unchanged.
- Browser QA on desktop and mobile (s_r11.js): report card, market, reviews, career, lessons, the lesson card, the renovate button and the rush toggle all render. No page errors, no undefined/NaN, no horizontal overflow.
- Not done (needs people or hardware): a real iPhone Safari test and human playtests.


## Round 12: idle play, grades, scenario pressure, phone declutter (2026-10-01)

**Requested by the user:** "Implement recommendations", following the automated playtest that found idle play winning.

### Changes
1. **Idle play declines.**
   - The Owner now auto-does only **3 routine chores a day** (make-ready, cleaning, carts). **Repairs are never automatic.**
   - A broken gate (low access) and dark lots (low security) raise move-out risk, and shoppers who see a broken gate are less likely to sign.
   - Reputation has a stronger effect on shopper traffic and on the rent shoppers accept.
2. **Grades reward running and growing the property.**
   - Occupancy weight drops from 30 to 20 points.
   - New **Upkeep** score (out of 10): share of equipment in working order, minus jobs waiting 2+ days.
   - New **Growth** score (out of 15): rent roll vs. 3 months ago.
   - Scaled to 100. The report card shows both new rows, and a new top suggestion names broken equipment and the gate.
3. **Scenario pressure.** Scenarios now have seasons, reviews, rising costs and **one rival competitor**, which opens around day 80–110. Maple's "settled demand" ×0.4 is not applied in scenarios.
4. **Phone declutter.**
   - One notification visible at a time; duplicate notifications refresh instead of stacking.
   - Identical customer complaints merge into one tag with a count (×N), and at most 2 tags show at once.
   - The optional-lesson card waits until milestone banners and notifications have cleared.

### Verified (headless and emulation only)
- Determinism and continuation (`t9c`): true. Tutorial walkthrough (`twalk`): done, day 5.
- **Maple year 1** (`tbal`):

| Bot | Cash | Units rented | Rent roll | Grades |
|---|---|---|---|---|
| Idle | $33,130 | 5/23 | $585 | BCDFFFDFFFDF |
| Absent | $19,270 | 0/23 | — | — |
| Good | $42,714 | 22/23 | — | B's |
| Strategic | $37,780 | 34/34 | $3,673 | — |
| Pro | $34,682 | 33/34 | — | — |

  - Before this round, idle ended year 1 at $44,122 with 22/23 rented.
  - The pro bot reached an A in a growth month.
- **Maple year 2** (cash): idle **$29,518 (falling)**; absent $4,848; good $58,105; strategic $62,100; pro $53,849.
- **Turnaround** (`tsc`):
  - Idle: lost, 15/23 rented.
  - Fixer and manager: lost on the $3,000 rent-roll goal.
  - Builder (adds 8 drive-up units): **won on day 68**.
- **Browser QA** (Playwright, desktop and 390×844 emulation): no page errors, no undefined/NaN, no horizontal overflow.
  - `s_r12.js` confirmed a duplicate notification refreshes instead of stacking, three identical complaints merge into one tag "×3", and a day-95 idle report card grades D with Upkeep 0/10 and the repair suggestion first.

### Not verified
- Real iPhone, human players.
- Winnability of Go Vertical and Climate Boom with the rival (no building bot for them).
- Whether the lesson-offer hold ever starves the card during very busy play.

### Known issue seen in QA
- A milestone banner can sit over the top of an open Business sheet on phones (existing behavior).


## Round 13: fixes and open items from Round 12 (2026-10-01)

**Requested by the user:** "Implement recommendations and fixes".

### Changes
1. **Idle-play penalty softened.**
   - Broken-gate move-out effect 1.8 → 1.5, dark-lot effect 1.0 → 0.9.
   - Signing chance with a broken gate now has a floor of 42% (was 35%).
2. **Milestone banner on phones:** with a sheet open, the banner moves just under the HUD in a compact form instead of covering the sheet header.
3. **Lesson offer:** still waits for banners and notifications, but never longer than 12 seconds.
4. **HUD subtitle:** Maple shows "Career" instead of "Tutorial" after graduating or skipping the tutorial. The save metadata uses the same label.
5. **Old-save migration:** mid-tutorial saves from before Round 11 (detected by missing market state) map the old 12-part index to the matching part of the 8-part tutorial, and restart that part.

### Verified (headless and emulation only)
- Determinism and continuation: true. Tutorial walkthrough: done, day 5.
- **Maple year 1** (`tbal`):

| Bot | Cash | Units rented | Occupancy by month |
|---|---|---|---|
| Idle | $33,402 | 10/23 | about 43–48% from month 4 |
| Good | $40,430 | 22/23 | — |
| Strategic | $37,486 | 31/34 | — |

- **Maple year 2** (cash): idle **$33,120 (flat to slightly down)**; good $54,643; strategic $60,333.
- **Scenarios, rival on:**
  - Turnaround: idle loses, builder wins on day 68.
  - Climate Boom (`tclim`): won on day 48 with 24 climate units leased.
  - Go Vertical (`tvert`, upper floor only): won on day 212 of 300. Without market pressure it's won on day 142.
  - A Go Vertical build that also fills the ground floor reached only 20 upper units: shoppers take ground-floor units first.
- **`tfix`, all pass:**
  - Old save at part 9 maps to part 8 (Graduation); a Round 11+ save is left untouched.
  - Climate conversion: offered with HVAC, charges $600, queues a make-ready, and the unit re-leases within 20 days.
- **Browser** (Playwright, desktop and 390×844 emulation):
  - No page errors, no undefined/NaN, no overflow.
  - `s_r13.js`: subtitle changes from Tutorial to Career on skip; the banner sits under the HUD, above the open Business sheet.

### Not verified
- Real iPhone, human players.
- A real pre-Round-11 save file: only a synthetic one was tested.

### Notes
- Climate Boom may be easy: the bot won before the rival opened.
