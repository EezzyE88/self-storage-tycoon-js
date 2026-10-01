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
