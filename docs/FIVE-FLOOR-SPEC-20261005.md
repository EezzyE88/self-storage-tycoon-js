# Five-floor buildings — working implementation specification

Status: specification only; not implemented, approved, balanced, or Safari accepted.
Date: 2026-10-05. Project: ONLY `EezzyE88/self-storage-tycoon-js` (JavaScript/Three.js).
Source baseline: candidate 19 `da4c72a339345fa89a5375014daa2ae17158ef28`, tree `f54dee9255b31011e74f0ea1d54bfb318a92531a`.
Accepted master verified unchanged: `2812abf8d268f9a225e5786d173f95efcbd6223d`.
No runtime edits, preview publication, economy tuning, or master promotion are authorized by this specification task.

## 1. Recommendation and boundaries

Support a maximum of five total floors, F1–F5, excluding Exterior. Start by making the existing Floor 2 path understandable, then generalize floor storage, routing and rendering, then expose F3–F5 and staged construction. Vertical growth must follow layout → operations → economics → growth: added space earns nothing until accessible, fitted out and commissioned.

Preserve the existing shell1/shell2 tools and their defaults. Add a configurable building planner rather than three additional permanent tool cards. New plans specify initial floors (1–5) and maximum planned height (initial floors–5). The planner explains that reserving future floors reserves layout/shaft space; it does not create free rentable space or make a real structural-engineering claim.

Legacy shells keep their existing height and a default planned maximum equal to that height. They do not silently gain expansion rights. First release supports staged expansion in newly planned expandable shells. Retrofitting an old shell requires a separately costed design and is deferred; the UI must say this plainly and offer a new expandable building instead. This preserves existing facility behavior while delivering staged growth without inventing unpriced structural work.

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

Shell fields: existing `floors` = completed structural floors; new `plannedMaxFloors` = reserved maximum; `verticalPlan` = reserved shaft/stair cells and optional hallway template; `extensions` = order references. Existing `f` convention remains unchanged. New state carries `floorModelVersion: 1`; absence identifies legacy state. Construction previews remain transient and never become saved operating geometry.

Stages: planned → confirmed/paid → structural construction → structural completion → interior fit-out → access/utility checks → explicit commissioning → rentable. A floor is structurally selectable after completion, even if empty. A pending floor is separately labelled “F3 · building”; it can be inspected/planned but cannot accept visitors, produce rent, or contribute to operational occupancy.

`addFloor(shellId)` adds exactly one floor, using the same footprint and the next contiguous index, only below plannedMaxFloors and the five-floor limit. One structural extension per shell at a time. Revalidate shell version, footprint, shaft reservations, funds and order status at confirmation; refuse stale plans without spending. A second confirmation cannot create another order or charge again.

Existing lower-floor leases, units, hallways, rent and equipment remain operating. Structural work is not an automatic full-building closure. If a shaft extension requires downtime, preview the affected floors/service and schedule that work separately; do not pretend that elevator cab replacement is risk-free. No demolition/rebuild shortcut that deletes tenants or resets IDs.

Do not change `shell.floors` until structural completion. Cancellation before/after work must use established refund rules on the new order, never refund fitted-out occupied floors. Cancel dependencies safely; release only unused reservations; retain all pre-existing objects. Templates create a preview, not automatic duplicates of rented units, carts, amenities or equipment.

## 4. Clearer Floor 2 and iPhone flow

Always show a compact control labelled “Exterior” or “F1” with an accessible “Choose building and floor” name. Tap opens a sheet: building name, completed floors, pending floors, capacity limit and “Plan another floor” where eligible. Existing floor choices remain available without opening a full management screen. Do not pack EXT + five equal buttons across the HUD.

With no upper floor, show “No second floor yet. Build a two-floor shell or plan an expandable building.” Offer Build → Buildings. Keep F2 as an explanatory disabled row rather than making it disappear without explanation. Selecting a building shows only its floors; property-wide selection can offer a level present anywhere and visibly identify buildings without that level.

Build/inspect/report actions switch to the exact building and floor. Show “Building 12 · F3” above the build palette and on previews. Building and floor identity persist through detail panels, rotation, zoom and background/resume; changing properties resets/clamps presentation state to a valid destination. Floor switching is presentation-only: no time advance, spending, assignment, or forced 1x change. Popup blockers retain the established resume policy.

F2 getting-started sequence: select two-floor shell → show F2 interior → connect halls to the reserved landing → ensure working elevator and ground entrance/loading route → add required lighting/utilities → fit units → finish construction → commission. Present unmet prerequisites at the selected floor with location buttons. Keep the accepted two-floor tutorial's geometry and completion criteria; add explanations around it rather than changing its targets.

Cutaway: selected floor fully visible; floors above hidden; lower floors subdued, with no actionable badges or pick targets through the active floor. Picking plane = selected index × FLOOR_H; overlays/preview/people/carts use the same index. Exterior shows complete building mass; interior objects remain hidden appropriately. Camera fit includes full completed building height and reserved pending construction visualization. Cache/reuse selected-floor textures instead of eagerly creating five property-size canvases on every repaint.

## 5. Elevator routing, capacity and recovery

Each shaft belongs to one shell and lists completed `servedFloors`; reserved future landings are not service. A landing becomes connected only after shaft extension, adjacent operating hall and a complete path to that floor's units. Validate the shaft column against units, rooms and reserved corridors on every affected floor; name the exact blocking floor/cell. Two neighboring buildings must never share a shaft accidentally.

Preserve cap=4, person=1 slot, cart user=2 slots, three-tick door dwell and ten ticks per floor travelled for existing two-floor service. Preserve seven ticks per adjacent stair transition; F1→F5 stairs requires four transitions. Stairs connect adjacent completed landings, carry people only, and never satisfy freight access for upper-floor rental eligibility.

For buildings with 3–5 completed floors, queue entries include agent ID, destination and original enqueue tick; rider records retain slot count. Use a deterministic directional sweep: drop off at intermediate destinations, board riders travelling in the current direction within capacity, then reverse when that direction has no remaining demand. At an empty idle car, serve the oldest outstanding call, ties by floor then agent ID. A call waiting 40 ticks becomes the next empty-car priority; this is a dispatch priority, not a promise that travel/queued load finishes within 40 ticks. Preserve original enqueue time through replans. No upper-floor starvation under a finite request set; no instant teleport between floors.

Keep the legacy two-floor dispatch path unchanged until parity tests prove a generalized equivalent. Avoid changing RNG consumption through route scoring. Multi-elevator choice is deterministic: working shaft with reachable source/destination landings; estimate walking + current travel/queued work; ties by shaft ID. Do not count a broken first-listed elevator as the building's only service. Existing single-elevator results must match the baseline.

On failure: retain existing riders and their destinations in the stopped cab, matching the current failure branch; do not teleport them out or erase them. Restored service continues their trip. Expose the stopped cab and repair route so the player can recover service; a repair/vendor completion must work even with riders aboard. Remove duplicate/stale queue entries and reroute waiting people through connected stairs or another working shaft and cart users through another freight route. If no freight path remains, block affected new upper-floor rentals and show the original repair/vendor/Owner/staff actions. Existing leases are retained. No silent charge, autonomous purchase, or invented free elevator.

Inspector: served floors, condition/power, current floor/direction, occupied slots, waiting people/carts and observed wait. Complaints identify building, floor and shaft, distinguish overload from outage/missing landing, and offer repair, connect landing or add capacity as appropriate. Additional elevators increase throughput and redundancy; no mandatory second elevator solely because height is five.

Navigation node encoding remains f×W×H+i. Increase traversal bounds to the actual graph size (up to 5×96×96 nodes), replacing the fixed 20,000 BFS cutoff where needed. Graph membership must reject unbuilt/pending levels. Staff work, carts, amenities and customer return trips use the same graph and floor identity.

## 6. Economics and authoritative previews

Locked existing values: shell1 32/cell, shell2 58/cell; initial shell duration 600 + area×14×floors; elevator 9,500 and 2,160 construction ticks; stairs 2,800 and 720 ticks; hallway 12/cell; elevator capacity/timing, power load and recurring cost unchanged. Preserve the existing 0.93 upper-floor convenience multiplier for F2, rent tables and 7:00 AM financial batch. No floor-specific rent premium or additional upper-floor penalty in the initial experiment.

For a first isolated F3–F5 balancing candidate, propose shell total 32 + 26×(floors−1) per footprint cell: F3=84, F4=110, F5=136. The 26 derives from existing F2−F1 prices; it is a provisional extension assumption, not an accepted economy value or real construction estimate. A staged structural floor costs 26×footprint area; proposed duration area×14 plus a 600-tick setup per separate stage. Staged work therefore takes longer than a single initial order. A planning reservation creates no rental value and charges no construction until confirmed.

Shaft extension costs/durations need explicit new data entries before implementation release; do not infer that an existing 9,500 elevator serves extra floors at zero cost. Calibrate them using complete expansion packages and current B+ sensitivity/payback rules; keep separate from cab purchase/OPEX. Unpriced shaft work must prevent a confirmable financial quote, not display $0 or silently reuse a legacy quote. These new coefficients are the outstanding balancing decision, not permission to tune legacy coefficients.

Preview breakdown: structural floor; shaft/stair extensions and planned downtime; halls/units/lighting; required power/water/climate additions; existing service headroom; optional added staff/carts/elevators; cash now; committed bills; unchanged reserve; cash after confirmed spend; selected-only versus complete-package payback. New construction and optional fit-out must not be counted twice. Do not multiply shell costs by floors twice. Pending/empty area has no guaranteed rent; lost shoppers are evidence, not pre-sold leases.

Allow separately paid shell construction before fit-out, consistent with current game behavior. The shell preview must say “Structure only; not ready to rent.” Commissioning is refused until operational prerequisites pass. Preserve all visible task buttons and original cost/consequence labels.

## 7. Save compatibility and safety

Keep SST0/SST1 envelopes and main/backup/kept slot policies; do not overwrite the preserved previous game during migration. Migration is explicit, deterministic, idempotent and performed on a detached validated copy before replacing a live game. Portfolio import is all-or-nothing: any invalid property leaves the entire current company untouched.

Legacy: missing floorModelVersion + two valid hall/dirt layers migrates to version 1; preserve layers 0/1 byte-for-byte and every unit/lease/order/task ID, RNG state, clock, money, finance processing marker, staff capacity and elevator position/riders/queues. Set plannedMaxFloors to existing shell.floors, servedFloors to valid existing levels, and add only neutral metadata. Never recreate elevator state with an Object.assign that clears riders on load.

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

## 10. Implementation order and release authority

1. Isolated UI/text candidate: F2 explanation and conditional Growth advice, no economy changes.
2. Internal floor-model/save migration candidate: generic layers, validation and legacy parity; keep F3–F5 tools unexposed.
3. Generic routing/elevator/render candidate: deterministic five-floor fixtures, no public feature claim.
4. Five-floor planner/staged construction: resolve new shaft coefficients, package previews, tutorial guidance and performance gate.
5. Publish an isolated owner-private Safari candidate only when requested; obtain physical evidence. Never merge/promote master without explicit authorization.

Specification QC: source anchors checked against candidate 19; baseline refs verified; document-only branch; numerical proposal distinguished from locked values; unknown shaft pricing identified explicitly. No new runtime tests were executed for this document-only change. Candidate 19's prior 47/47 results are inherited evidence, not tests of five-floor support.
