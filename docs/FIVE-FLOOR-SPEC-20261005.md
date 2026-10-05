# Five-floor buildings — hardened working specification v2

Revision: one bounded hardening pass over specification commit `04995497b8e2c74d44de96c8b0d565fa8dd2bc58`.
Status: specification only; not implemented, approved, balanced, or Safari accepted.
Date: 2026-10-05. Project: ONLY `EezzyE88/self-storage-tycoon-js` (JavaScript/Three.js).
Source baseline: candidate 19 `da4c72a339345fa89a5375014daa2ae17158ef28`, tree `f54dee9255b31011e74f0ea1d54bfb318a92531a`.
Accepted master verified unchanged: `2812abf8d268f9a225e5786d173f95efcbd6223d`.
No runtime edits, preview publication, economy tuning, or master promotion are authorized by this specification task.

## 1. Recommendation and boundaries

Support a maximum of five total floors, F1–F5, excluding Exterior. Start by making the existing Floor 2 path understandable, then generalize floor storage, routing and rendering, then expose F3–F5 and staged construction. Vertical growth must follow layout → operations → economics → growth: added space earns nothing until accessible, fitted out and commissioned.

Preserve the existing shell1/shell2 tools and their defaults. Add a configurable building planner rather than three additional permanent tool cards. New plans specify initial floors (1–5) and maximum planned height (initial floors–5). The planner explains that reserving future floors reserves layout/shaft space; it does not create free rentable space or make a real structural-engineering claim.

Existing interior shells are eligible for a priced vertical upgrade; drive-up unit rows, offices and canopies are not. Eligibility is deterministic: a completed shell, height below the release limit, no live structural extension, and a shaft/stair-column plan that does not remove occupied units or necessary lower-floor routes. Occupancy alone does not disqualify a shell. If no non-destructive column fits, refuse the upgrade and identify the blockers; relocating occupied units is outside this slice. Broken equipment does not prevent planning, but the preview names restoration needed before commissioning.

Existing shells migrate with capacity equal to their present completed height; migration never grants free expansion rights. The player can purchase reinforcement/reserved height and add one contiguous floor in a combined reviewed package. New shells use the same paid reservation rule. The first playable release supports F1–F3, including upgrading an existing one- or two-floor shell; storage, routing, rendering and validation support five internally. F4/F5 are unexposed until the three-floor slice passes physical testing.

No changes to market rent, demand, staffing capacity, financial processing, existing loan terms, existing 1–2-floor penalties, save selection, or intentional 1x popup resume. A five-floor building is a game abstraction, not a representation of regulatory compliance.

## 2. Source evidence and required changes

All links below point to the immutable candidate baseline, not a moving branch.

| Source | Observed behavior | Required extension |
|---|---|---|
| [js/data.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/data.js), TOOLS | shell1: 32/cell; shell2: 58/cell; elevator 9,500; stairs 2,800 | Preserve legacy tools; add configurable planned height and separate extension quotes |
| [js/sim.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/sim.js), initial state/rebuild | hall/dirt and unitAt/walk/lit/cam/roomAt contain two layers | Shared bounded floor count; consistent state and derived layers |
| js/sim.js, pedNbr/build elevator/build stairs | Connections, placement checks and landing lists iterate two floors | Building-specific served floors and landing readiness |
| js/sim.js, moveAgent/joinElevator/updateElevator | Two queues, four capacity slots; person 1 slot/cart user 2; 3-tick doors; movement 0.1 floor/tick; stairs 7 ticks | Preserve two-floor timing; extend queue state and routing without instant floor jumps |
| js/sim.js, elevatorFactor | Uses first elevator found in building | Multi-elevator assessment must reflect working reachable service, with legacy single-elevator parity |
| [js/render.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/render.js), floorY/applyView/floorVisible/drawGround | Dedicated F2 plate; floor picking and visibility contain F2 special cases | Selected-floor picking and generic cutaway/texture management |
| [js/ui.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/ui.js), floorseg/renderHUD | EXT/F1/F2; F2 disabled without a multi-floor shell and hidden by phone CSS | Explain absent F2; compact floor/building chooser; route reports to exact floor |
| [js/main.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/main.js), validState/loadCode | Layer arrays must have length 2; SST0 plain and SST1 gzip envelopes; portfolio imports validate before attachment | Versioned migration, bounded validation and atomic portfolio load |
| [js/blueprint.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/blueprint.js) | Tutorial identifies a two-floor shell and fixed F2 sequence | Keep existing deterministic tutorial; generic planner uses separate guidance |
| [js/economics.js](https://github.com/EezzyE88/self-storage-tycoon-js/blob/da4c72a339345fa89a5375014daa2ae17158ef28/js/economics.js), growthReadiness | Proven-demand detail always says to rent/turn over stock, even at zero vacancies | Conditional explanation; no threshold changes |

Further audit during implementation must include status, complaints, showcase camera, power/HVAC, amenities, staff routes, cancellations and portfolio switching; replacing only visible floor labels is insufficient.

## 3. Floor model and construction lifecycle

One shared `MAX_BUILDING_FLOORS = 5`; zero-based internal floors 0–4; user labels F1–F5. Derived floor count is at least 2 for legacy parity and equals the highest committed/pending required floor plus one, bounded by 5. Allocate hall/dirt and corresponding derived grids consistently; extend lazily before creating an upper-floor preview/order. Do not derive layers only from occupied units: an empty shell still has floors.

Shell fields: existing `floors` = completed structural floors; new `plannedMaxFloors` = paid and completed structural capacity; `verticalPlan` = reserved shaft/stair cells and optional hallway template; `extensions` = order references. Existing `f` convention remains unchanged. New state carries `floorModelVersion: 1`; absence identifies legacy state. Construction previews remain transient and never become saved operating geometry.

Stages: planned → confirmed/paid → structural construction → structural completion → interior fit-out → access/utility checks → explicit commissioning → rentable. A floor is structurally selectable after completion, even if empty. A pending floor is separately labelled “F3 · building”; it can be inspected/planned but cannot accept visitors, produce rent, or contribute to operational occupancy.

`addFloor(shellId)` adds exactly one floor, using the same footprint and the next contiguous index, only below paid completed plannedMaxFloors and the release height limit (3 initially; architectural maximum 5). A combined reinforcement+floor order waits for reinforcement completion before structural work starts. One structural extension per shell at a time. Revalidate shell version, footprint, shaft reservations, funds and order status at confirmation; refuse stale plans without spending. A second confirmation cannot create another order or charge again.

Existing lower-floor leases, units, hallways, rent and equipment remain operating. Structural work is not an automatic full-building closure. If a shaft extension requires downtime, preview the affected floors/service and schedule that work separately; do not pretend that elevator cab replacement is risk-free. No demolition/rebuild shortcut that deletes tenants or resets IDs.

Do not change `shell.floors` until structural completion. Cancellation before/after work must use established refund rules on the new order, never refund fitted-out occupied floors. Cancel dependencies safely; release only unused reservations; retain all pre-existing objects. Templates create a preview, not automatic duplicates of rented units, carts, amenities or equipment.

## 4. Clearer Floor 2 and iPhone flow

Always show a compact control labelled “Exterior” or “F1” with an accessible “Choose building and floor” name. Tap opens a sheet: building name, completed floors, pending floors, capacity limit and “Plan another floor” where eligible. Existing floor choices remain available without opening a full management screen. Do not pack EXT + five equal buttons across the HUD.

With no upper floor, show “No second floor yet. Upgrade this interior building or build a two-floor shell.” Offer “Plan F2 upgrade” for an eligible selected shell and Build → Buildings otherwise; give the exact refusal reason when an upgrade cannot fit. Keep F2 as an explanatory disabled row rather than making it disappear without explanation. Selecting a building shows only its floors; property-wide selection can offer a level present anywhere and visibly identify buildings without that level.

Build/inspect/report actions switch to the exact building and floor. Show “Building 12 · F3” above the build palette and on previews. Building and floor identity persist through detail panels, rotation, zoom and background/resume; changing properties resets/clamps presentation state to a valid destination. Floor switching is presentation-only: no time advance, spending, assignment, or forced 1x change. Popup blockers retain the established resume policy.

F2 getting-started sequence: select two-floor shell → show F2 interior → connect halls to the reserved landing → ensure working elevator and ground entrance/loading route → add required lighting/utilities → fit units → finish construction → commission. Present unmet prerequisites at the selected floor with location buttons. Keep the accepted two-floor tutorial's geometry and completion criteria; add explanations around it rather than changing its targets.

Cutaway: selected floor fully visible; floors above hidden; lower floors subdued, with no actionable badges or pick targets through the active floor. Picking plane = selected index × FLOOR_H; overlays/preview/people/carts use the same index. Exterior shows complete building mass; interior objects remain hidden appropriately. Camera fit includes full completed building height and reserved pending construction visualization. Cache/reuse selected-floor textures instead of eagerly creating five property-size canvases on every repaint.

## 5. Elevator routing, capacity and recovery

Each shaft belongs to one shell and lists completed `servedFloors`; reserved future landings are not service. A landing becomes connected only after shaft extension, adjacent operating hall and a complete path to that floor's units. Validate the shaft column against units, rooms and reserved corridors on every affected floor; name the exact blocking floor/cell. Two neighboring buildings must never share a shaft accidentally.

Preserve cap=4, person=1 slot, cart user=2 slots, three-tick door dwell and ten ticks per floor travelled for existing two-floor service. Preserve seven ticks per adjacent stair transition; F1→F5 stairs requires four transitions. Stairs connect adjacent completed landings, carry people only, and never satisfy freight access for upper-floor rental eligibility.

For buildings with 3–5 completed floors, persist `dispatchMode="sweep-v1"`, direction, target, door timer, locked priority call and queue entries `{agentId, from, dest, enqueuedAt}`. Legacy one/two-floor service retains its existing dispatcher, RNG consumption and timing; crossing to three floors promotes that shaft to sweep-v1 only at a floor stop with doors closed, preserving riders, position and targets. It never swaps algorithms mid-flight.

Sweep-v1 tick order: (1) discard invalid/cancelled references, (2) handle failure, (3) decrement an active door timer and return, (4) arrive/drop off at the stop, (5) board eligible callers, (6) select the next stop, (7) move at most 0.1 floor. Stops are completed reachable landings only. One boarding/drop-off batch sets exactly three door ticks; new arrivals during dwell wait for a subsequent batch rather than restarting the timer indefinitely. Reaching a destination discharges riders once before boarding. No instant floor jumps.

| Edge case | Deterministic rule and executable expectation |
|---|---|
| Idle/empty at caller's floor | Choose oldest call globally by enqueue tick, then source floor, then agent ID. At that source adopt its destination direction; board same-direction calls in that order. |
| Mixed directions at F2 | An upward car boards F2→F3; F2→F1 stays queued. Reverse after no remaining upward rider/call. Do not let an opposite-direction call block eligible same-direction entries. |
| Full car | Drop off where required; skip pickup-only stops until capacity is freed. Never exceed four slots. |
| Two free slots, oldest caller needs two | Board that cart user first; younger one-slot callers do not jump it. |
| One free slot, oldest caller needs two | Leave the cart user queued and reserve this queue position: do not fill the last slot with younger callers at that landing. Existing riders finish; the cart user boards when enough slots return. No artificial idle dwell while full. |
| Idle car beyond a caller | Travel empty to the chosen source, then set its passenger direction, avoiding opposite-direction boarding on the way. |
| Intermediate destination | F1→F3 rider with F2 drop-off: stop at F2, unload, board eligible upward calls, then continue to F3. |
| Starvation/continuous arrivals | Once a call reaches 40 ticks, lock the oldest aged call as next priority. Finish onboard riders, take no further unrelated pickups, then travel empty to the locked source and board that call first. New arrivals cannot replace it. If cancelled/unreachable, clear and recompute. Finite active riders and reachable service guarantee eventual pickup, not a fixed wait ceiling. |
| Multiple shafts | Consider only working shafts with source/destination freight paths. Score = walking path length + 10×abs(cab position−source) + 3×ceil(waiting slot sum/4) + 10×sum(abs(destination−source)) over current riders. This is a deterministic routing score, not a displayed ETA. Tie by shaft ID. Assign once; reconsider only on route/service failure or 120 ticks without boarding. Retain enqueue time. |
| Duplicate join/cancel | A passenger appears in at most one shaft queue or rider list. Joining twice is a no-op. Cancel removes every reference; never resets a surviving rider's trip. |
| Service disappears | Invalidate blocked calls, keep onboard passengers in the stopped cab, show recovery action; never send the car to an unfinished landing. |
| Reload/background | Direction, target, door timer, priority call, position, riders and original waits persist; first resumed tick follows the saved dispatcher state. |

For new upper floors, elevator convenience assessment uses reachable working service rather than the first-listed broken shaft. Existing F1/F2 leasing coefficients and legacy multi-elevator assessment remain unchanged until separately authorized; correcting new service must not silently tune their conversion outcomes. There is no additional convenience penalty per added floor in this slice.

On failure: retain existing riders and their destinations in the stopped cab, matching the current failure branch; do not teleport them out or erase them. Restored service continues their trip. Expose the stopped cab and repair route so the player can recover service; a repair/vendor completion must work even with riders aboard. Remove duplicate/stale queue entries and reroute waiting people through connected stairs or another working shaft and cart users through another freight route. If no freight path remains, block affected new upper-floor rentals and show the original repair/vendor/Owner/staff actions. Existing leases are retained. No silent charge, autonomous purchase, or invented free elevator.

Inspector: served floors, condition/power, current floor/direction, occupied slots, waiting people/carts and observed wait. Complaints identify building, floor and shaft, distinguish overload from outage/missing landing, and offer repair, connect landing or add capacity as appropriate. Additional elevators increase throughput and redundancy; no mandatory second elevator solely because height is five.

Navigation node encoding remains f×W×H+i. Increase traversal bounds to the actual graph size (up to 5×96×96 nodes), replacing the fixed 20,000 BFS cutoff where needed. Graph membership must reject unbuilt/pending levels. Staff work, carts, amenities and customer return trips use the same graph and floor identity.

## 6. Economics and authoritative previews

Locked existing values: shell1 32/cell, shell2 58/cell; initial shell duration 600 + area×14×floors; elevator 9,500 and 2,160 construction ticks; stairs 2,800 and 720 ticks; hallway 12/cell; elevator capacity/timing, power load and recurring cost unchanged. Preserve the existing 0.93 upper-floor convenience multiplier for F2, rent tables and 7:00 AM financial batch. No floor-specific rent premium or additional upper-floor penalty in the initial experiment.

### Candidate coefficients: complete, explicit, not yet economically accepted

The following are fixed inputs for the proposed isolated experiment, not verified balance or real construction estimates. Only the 26/cell structural increment is derived directly from existing shell2−shell1. Reinforcement and landing extensions are design proposals. No remaining shaft price is left undefined.

Let A=footprint area, B=completed height, M=paid capacity, T=desired paid capacity, N=initial built height. Standalone legacy shell1/shell2 with no future reservation retain exactly their existing quotes. New shell structure is A×[32+26×(N−1)]; for N>2 add reinforcement 4×A×(N−2). Thus initial completed shells with no future reservation cost 32/58/88/118/148 per cell for F1–F5. F3–F5 values include the new reinforcement component; they supersede v1's 84/110/136 structure-only figures.

| New component | Exact candidate price | Construction duration in simulation ticks |
|---|---:|---:|
| Reinforce an existing shell / purchase extra future height | 4×A×(T−M), T>M | 600+4×A×(T−M) |
| Add one structural floor | 26×A | 600+14×A |
| Extend an existing elevator one contiguous landing | 1,900 per shaft per added floor | 720 per landing |
| Extend an existing stairwell one adjacent flight/landing | 560 per stairwell per added floor | 240 per flight |
| New elevator serving N floors, N≥2 | 9,500+1,900×max(0,N−2) | 2,160+720×max(0,N−2) |
| New stairs serving N floors, N≥2 | 2,800+560×max(0,N−2) | 720+240×max(0,N−2) |

New-shell initial structural duration remains 600+14×A×N. Let R=max(0,N−2)+(T−N): add a single separately itemized reinforcement order of duration 600+4×A×R when R>0; when R=0 there is no reinforcement order/setup charge. Buying unused future capacity costs 4×A×(T−N) additionally for a new shell. No second charge when subsequently adding a floor below completed paid capacity. Default T=N; no free five-floor checkbox. Paid capacity does not create floors, landings, service, rent or usable hallways. Mark reserved shaft/corridor geometry without blocking current operating routes; prevent new fit-out from occupying an accepted reserved shaft column. Upfront reinforcement/reservation is an explicit capex order, completed rights are non-refundable; cancelled unfinished work follows current order refund rules. Do not grant completed rights on payment alone.

Existing 9,500 elevator includes its original F1/F2 landings: no extension charge for making those existing landings accessible. First elevator in a one-floor shell upgraded to F2 costs 9,500, not 9,500+1,900. Replacing a cab on an existing extended shaft does not rebill completed landings; show cab cost and existing landing credit. OPEX remains 5 per operating elevator, power 10 per elevator; extensions alone add neither a second cab nor another base elevator charge. More units/lighting/HVAC/staff use current load and cost rules.

Complete package = reinforcement not already purchased + new structural area + each shaft/flight extension not already completed + new halls/units/lights + necessary service upgrades + optional explicitly selected capacity/amenities/staff. All fit-out uses current TOOLS prices, product attributes and existing build planner validation. Power/water/HVAC requirements use actual spare capacity/building service, not an automatic per-floor surcharge. Scope every quote component by object/order ID to deduplicate paid, pending and selected work. A paid pending dependency is listed as already committed, never treated as free completed capacity or paid again.

Example calculation fixture (not a suitable live floor plan): an eligible existing two-floor shell of A=100, capacity M=2, upgraded to F3 with one existing elevator and stairs; 20 new hall cells and four new lights. Reinforcement 400 + floor 2,600 + elevator extension 1,900 + stair extension 560 + halls 240 + lights 1,400 = **7,100 structure/access/lighting subtotal**. The complete rentable-floor quote must then add validated unit fit-out and any actual power/HVAC/water additions; never label 7,100 the full investment. With ten standard (non-climate) Interior 10x10 units at the current 539 each, verified route geometry, an existing reachable restroom where required and spare power for the four lights, the complete fixture is 7,100+5,390=12,490. If those assumptions fail, quote the actual extra assets or refuse the layout; do not keep 12,490 as a universal package price. Extra paid height to T=5 adds 800 to this fixture without creating F4/F5. Existing building purchase costs are sunk and excluded from incremental payback.

No mandatory elevator downtime: construct shaft extension beside isolated unfinished landings while existing served floors remain available. After extension work, a 30-tick commissioning/service test suspends that shaft, waits for cab/riders to clear first, and is itemized as downtime. If riders cannot clear because of a fault, restore service first; do not start forced evacuation. Alternate shafts/stairs remain available. Legacy trips otherwise keep their original timing; this deliberate extension outage is confined to the new upgrade action. The service-test cost is included in the quoted landing extension, not a hidden extra fee.

Package previews show upfront and already-paid amounts; planned costs versus confirmed spend; remaining funds after bills and existing reserve; whole-package commissioned OPEX/wages; incremental rentable capacity; product-specific demand; conservative payback range and dependencies. The current investment() accepts a plan with units: adapt it to a composite plan that includes all package costs and unit creates. Do not calculate only unit fit-out ROI while ignoring reinforcement/shafts. For a structure-only order show payback “Unavailable—fit-out not selected,” not zero or infinity. New floor space produces no guaranteed leases. Keep the 12–18-month complete-package benchmark and faster infill treatment unchanged; report failures honestly rather than tuning old coefficients to force a pass.

The structural quote may be confirmed alone, consistent with existing behavior, but says “Structure only; not ready to rent.” All components and dependency timing must be known. Commissioning remains refused until access, lighting and utilities pass. Preserve visible task buttons and their original costs/consequences. New coefficients can change only through an explicit new-feature balancing revision, with before/after evidence; legacy rates remain frozen.

## 7. Save compatibility and safety

Keep SST0/SST1 envelopes and main/backup/kept slot policies; do not overwrite the preserved previous game during migration. Migration is explicit, deterministic, idempotent and performed on a detached validated copy before replacing a live game. Portfolio import is all-or-nothing: any invalid property leaves the entire current company untouched.

Legacy: missing floorModelVersion + two valid hall/dirt layers migrates to version 1; preserve layers 0/1 byte-for-byte and every unit/lease/order/task ID, RNG state, clock, money, finance processing marker, staff capacity and elevator position/riders/queues. Set plannedMaxFloors to existing shell.floors, structuralRightsPaid to zero (legacy built height only), servedFloors to valid existing levels, and add only neutral metadata. Never recreate elevator state with an Object.assign that clears riders on load.

Persist completed reinforcement rights, pending reinforcement/landing orders and commissioning-test progress so reload cannot duplicate payment, grant unfinished height or restart an outage. Validate paid-capacity provenance through completed order metadata for new fields; legacy built floors need no fabricated ledger receipts. Save dispatcher mode and its priority state, migrate legacy queue IDs only when explicitly promoting service, and reject references outside served completed floors.

New saves: bounded 2–5 equal-length hall/dirt layers; finite valid cell values; integer object/task/agent floor indices; shell completed height 1–5; plannedMaxFloors between completed height and 5; unique valid served floors within completed structure; finite bounded elevator position/target; coherent agent/queue/rider references and slot totals. Validate order destinations and pending floors without treating them as completed. Reject unsupported future floor-model versions with an understandable message; do not clamp malformed F6 or negative indices to another floor.

New saves are forward-loadable by the new build; five-floor saves are NOT promised to load into old two-floor builds. Warn before exporting a save that uses the extension. Preserve old two-floor imports and keep a backup before first migration. Loading remains paused; returning through normal popup closure deliberately resumes at 1x. Camera/selector state is presentation metadata and must not change economy or valid import outcomes.

## 8. Growth Readiness correction

Retain the existing proven-demand predicate: observation≥14, matching availability losses≥5, matching occupancy≥90%, no matching vacancies. Keep the overall financial/investment gates; fully leased does not automatically mean expansion is affordable or justified.

Replace unconditional final advice with a state-specific sentence:
- Matching vacancies >0: “Rent suitable vacant units first.” If those units need work, name turnover/access/commissioning work using the current diagnostics.
- No matching vacancies, demand passes: “Existing suitable stock is full. Assess a scoped expansion.”
- No matching vacancies, evidence insufficient: “No suitable vacancies. Gather more matching demand evidence before expanding.”
- No operating matching stock: “No operating units match this plan. Review product-specific demand and construction prerequisites.”

Display counts as matching/product-scoped when a plan is selected; global occupancy alone must not conceal a wrong-size/climate shortage. Test the supplied screenshot state: 27/27 occupied, zero vacancies, 15 losses/25 days → proven demand passes and never instructs turnover/renting absent stock. Financial readiness may still show “Select a build to assess affordability.” This correction changes explanatory text only.

## 9. Regression and acceptance gates

| Area | Required executable checks |
|---|---|
| Legacy parity | Fixed seeds and commands across one/two-floor fixtures: cash/ledger, rent, costs, orders, queues, paths, staffing, RNG and 7AM processing identical after normalization of neutral metadata |
| Layer bounds | Empty/single/two/five-floor estates; last cell F5; 96×96; F6/negative/NaN refusal; graph >20,000 nodes remains reachable |
| F2 clarity | No upper floor explanatory row; pending versus completed F2; shell2 tutorial unchanged; report action selects exact floor |
| Construction | Each stage; concurrent/stale/double-confirm refusal; blocked shaft on F4; cancel before/after progress; no occupied lower-floor deletion; no rent from pending levels |
| Freight | F1↔F5 and F2↔F4 with carts; staircase exclusion; two buildings/shafts; missing landing; dead-end hallway; upper unit commissioning refused appropriately |
| Elevator service | Slot limits; intermediate stops; FIFO/tie determinism; finite-load starvation recovery; outage mid-trip; no duplicate passengers; alternative shaft; reload mid-queue/trip |
| Utilities/staff | F5 lighting/security; power shedding; building HVAC capacity; same-building amenities; dirty F5 hallway/restroom; staff shift/capacity and Owner override unchanged |
| Rendering/touch | Selected-floor pick/overlay alignment, five-storey exterior, roof cutaway, pins, follow targets, quarter-turn camera fit, four-tap cycle, drag/pinch/hold and all popup blockers |
| Saves | Legacy SST0/SST1; new single/portfolio states; kept/backup protection; invalid fifth-floor member atomic rejection; idempotent migration; no duplicate finance batch |
| Economics | Exact shell1/shell2 quote parity; staged quote components; missing coefficient refusal; reserve and complete-package sensitivity; no speculative floor rent booked |
| Readiness | Full/partly vacant/no matching stock/insufficient observation; selected product mismatch; unchanged pass/fail predicates |

Run the existing 47-script headless baseline plus new focused tests, then render/performance fixtures for 1/2/5 floors and single/multiple properties. Measure queue and path growth, frame samples, scene resource counts and save size; do not call stubbed rendering tests GPU/Safari evidence. Cache derived routes by structural/service version; rebuild on completion/failure/service restoration, not every simulation tick.

Physical iPhone Safari gate: verify build; no F2 mystery; readable complete chooser; F5 construction/picking; real customer/cart journeys; visible task remedies; queue/outage/recovery; background/resume; save→reload→continue mid-construction and mid-elevator trip; portrait/landscape camera; intentional 1x return. Record screenshots and observed outcomes. Automated PASS is not visual acceptance; retain HOLD until this evidence exists.

## 10. Consolidated playable delivery and release authority

One complete three-floor candidate, not five user-facing partial releases. Internal milestones are development gates within the same isolated branch:

1. Clarity + migration: F2 upgrade entry, conditional Growth guidance, generic bounded layers, atomic saves and legacy parity.
2. Complete upgrade loop: select an existing interior shell → choose F3 → quote reinforcement/shaft/stair/fit-out/utility package → confirm stages → commission → accept tenants → observe real elevator/cart/staff journeys → repair an outage → save/reload mid-work and mid-trip. New three-floor shells are also supported; default one/two-floor tools remain unchanged.
3. Integrated verification: execute the documented elevator cases, complete-package arithmetic, baseline economics, cancellation, malformed saves, rendering/touch and performance. Internal five-floor fixtures exercise storage/routing/rendering, while F4/F5 and paid capacity above three remain disabled in the first playable UI (arithmetic tests may exercise capacity five).
4. Publish that complete slice only on explicit request. Physical Safari acceptance must include occupied existing-building expansion, complete quote versus actual charges, reasonable elevator waits under finite normal loads, reversible planning, readable F3 selection, visible remedies and intentional 1x return. No merge/promote/master changes without explicit authorization.

After accepted three-floor evidence, expose F4/F5 in a single later height-expansion candidate using the same machinery and new height-specific performance/operations tests. Do not reimplement another floor system.

### Added hardening acceptance fixtures

- Existing occupied one-floor shell: price F2 reinforcement and new elevator correctly; add F3 later without losing leases/IDs; no automatic eviction.
- Existing two-floor shell: exact 7,100 subtotal fixture above; completed paid capacity prevents repeat charges; a legacy shell without the new action remains state/economy equivalent.
- Full shaft footprint: blocked occupied room on F1 refuses with exact location before any spending; an eligible alternate free column succeeds in preview.
- Capacity rights: T=M no charge/no-op; reinforcement payment before completion does not unlock a floor; reserve beyond release ceiling refused; cancel/refund never grants free completed rights.
- Composite ROI: same units with additional mandatory shaft spend produces higher cost/payback, not the old fit-out-only result; unsupported layout returns no range.
- Each sweep-v1 table row is a deterministic scripted test with explicit expected queue/rider/target states; preserve waits across failure and load; capacity never exceeds four.
- Commissioning outage: riders finish before 30-tick service test, one outage per completed extension, no rerun after reload, alternate working shaft remains usable.

Specification QC: source anchors checked against candidate 19; baseline refs verified; document-only revision; new numerical coefficients labelled provisional and separated from locked legacy values. Shaft costs, rights rules, eligibility and dispatcher edge cases are now specified. These decisions are implementation-ready definitions, not claims of successful implementation or economic balance. No new runtime tests were executed for this document-only change. Candidate 19's 47/47 results remain inherited baseline evidence only.
