# Self Storage Tycoon — Game Design Document

**Version:** 0.1 design baseline  
**Status:** Proposed design; values and targets are hypotheses for prototyping, not validated balance  
**Genre:** Facility-building and business-management simulation  
**Primary experience:** Turn a modest self-storage facility into a thriving property, then expand into a portfolio by making legible construction, leasing, maintenance, and investment decisions.  
**Platform stance:** Responsive interface for mouse and touch; platform, engine, business model, and production budget remain undecided.

## 1. Executive vision

The player buys or inherits a small, functioning but underperforming storage facility. They repair neglected assets, build new storage, choose a unit mix, set rents, manage operations, and use the results to fund larger opportunities. The site is a physical place: vehicles arrive, customers use units, contractors work, and improvements visibly transform the property. The design is not an idle clicker, a spreadsheet-only real-estate game, or a punitive crisis simulator.

**Design promise:** Every material business decision has a visible and measurable consequence. A player should be able to explain why an outcome happened, and what they can try next.

**Player verbs:** Inspect, plan, place, renovate, price, staff, maintain, market, finance, compare, acquire, and review.

**Target player feeling:** “I spotted the bottleneck, changed this property, and made it work better.”

### Design pillars

1. **A living property:** The facility is the main character. Physical changes and customer activity make the business tangible.
2. **Diagnosable systems:** Missed demand, access delays, condition, collections, and cash are traceable to causes.
3. **Meaningful tradeoffs:** Land, capital, time, convenience, risk, and unit mix compete; no single expansion is always best.
4. **Approachable depth:** Simple first decisions reveal increasingly sophisticated systems; paperwork is automated.
5. **Respectful pacing:** Pause and speed controls; no waiting-for-the-sake-of-waiting, spam repairs, or forced timers.

### Design constraints

- Simulate decisions and consequences, not every real-world operational detail.
- Expose uncertainty as a range, never as a guaranteed profit forecast.
- Avoid opaque randomness, unavoidable spirals, and beginner traps with no recovery.
- Tutorial results arise from the same rules as the rest of the game; it can stage opportunities, not secretly rig every outcome.
- No real-world rent, cost, occupancy, or financing figures are asserted by the illustrative values in this document.

## 2. Audience, session, and progression

**Audience hypothesis:** Players who enjoy builders, approachable tycoon games, and layout optimization, including newcomers to self-storage. The theme must be explained through observable situations, not prior industry knowledge.

**Session model:** A short visit covers review, diagnosis, one project, and the first results; a longer visit covers redesign or an acquisition. There is no energy system. The player can pause, use normal or accelerated simulation speed, and step to the next day or statement. Pausing never prevents planning.

**Game structure:** One continuous company, starting with a persistent tutorial property. Optional scenarios can later offer fixed starting conditions. Facility progress is not reset after the tutorial.

**Progression arc:**

| Phase | Player capability | New decision |
|---|---|---|
| First property | Repair, build basic drive-up storage, set rents, read reports | Which constraint should be solved first? |
| Established site | Add service, security, climate, vehicle space, targeted marketing | Which segment should this facility serve? |
| First acquisition | Compare imperfect properties and financing | Is the purchase price justified by an improvement plan? |
| Portfolio | Set site strategies, delegate routine work, allocate capital | Where does the next dollar have the most value? |
| Mature company | Reposition, renovate, develop, refinance or sell | How much concentration and debt risk is acceptable? |

Progress is earned through capability, cash, reputation and access to more demanding properties—not arbitrary research timers. Unlocks teach genuinely different choices.

## 3. Core gameplay loop

**Observe → diagnose → decide → act → simulate → verify → reinvest.**

1. **Observe:** Site movement and a compact dashboard reveal vacancies, missed prospects, queues, asset condition, and cash.
2. **Diagnose:** Select a metric or object to see principal causes and their evidence; each diagnostic links to affected tiles, units, tenants, or decisions.
3. **Decide:** Compare competing interventions with costs, time, projected benefits, downsides, and uncertainty.
4. **Act:** Commit a building placement, repair, rent policy, service policy, or investment.
5. **Simulate:** Discrete game days resolve customers, leasing, collections, wear, staffing, and expenses. Animation illustrates authoritative results.
6. **Verify:** Daily events and monthly statements explain whether the change worked and why.
7. **Reinvest:** Spend, hold cash, reprice, or pivot. The next constraint emerges from the evolving site.

### Nested rhythms

- **Immediate:** Inspect an object, drag a footprint, view access warnings, commit an action, see construction or a repair begin.
- **Daily:** New prospects, move-ins and move-outs, payments due, work completion, asset wear, and notable events.
- **Monthly:** Billed versus collected revenue, operating results, occupancy, cash, and strategic planning.
- **Long-term:** Neighborhood shifts, building aging, competitor context, financing, acquisitions, and company identity.

Time speed affects presentation and the rate at which game days pass, never the outcome for the same commands, starting state, and random seed. Fast-forward pauses automatically for decisions with potentially major consequences only when configured by the player.

## 4. The first facility as tutorial

**Working name:** Sunset Storage. The name is provisional. The property begins with active tenants, a small office, a gated entrance, drive-up units of two sizes, vacant buildable land, and enough cash for one substantive early project plus a safety reserve. It is not an empty plot.

**Teaching setup:** One damaged vacant unit is offline; reports show repeated unmet demand for a medium size; a predictable busy period reveals entrance congestion. These three issues respectively teach maintenance, construction and demand, then operations. The player may investigate in any order once the relevant tools are introduced.

**Tutorial length target:** Approximately 20–30 minutes in an initial usability test, with no hard timer. The duration is a design target, not an obligation for players.

| Chapter | Trigger and world signal | Action taught | Feedback and completion |
|---|---|---|---|
| 1. Take ownership | Existing tenant arrives, facility overview visible | Pan/zoom, select unit, inspect occupancy | Player locates a real occupied unit and its lease status |
| 2. Restore capacity | Vacant unit visibly marked out of service | Compare repair choice, commit work | Door repaired; unit returns to eligible inventory; cash and condition update |
| 3. Read unmet demand | Prospect departs; notification cites unavailable medium unit | Open missed-demand report and filter unit mix | Player sees size-specific inquiries, not a generic “build more” objective |
| 4. Add a row | Two valid footprints and one invalid access-blocking footprint | Rotate/place row, inspect preview, confirm cost | Construction completes; units become reachable and available |
| 5. Lease and price | First suitable prospect seeks the new size | Set or retain a suggested rent; see leasing decision | Prospect leases or declines under normal rules; explanation shown either way |
| 6. Solve access | Busy arrivals visibly queue at entrance | Open access overlay; compare gate service and layout options | Queue metric and visual behavior improve after a sensible intervention |
| 7. Read statement | First month closes | Compare billed rent, collections, expenses, capital spend, cash | Player can identify whether the property actually improved |
| 8. Set direction | Two viable next opportunities surface | Choose a project, reserve cash, or defer | Guidance becomes optional; property remains in current state |

### Tutorial teaching contract

- Use **show → brief explanation → player action → observable consequence**. One principal mechanic per chapter.
- Contextual prompts point to the relevant world object and control; no repeated full-screen interruptions.
- The first repair is inexpensive and impossible to misplace. Later decisions allow meaningful choice.
- Construction includes at least two valid, strategically distinct locations; invalid placements explain why.
- Pricing offers a suggested range, not a mandated answer. If a prospect declines, report the cause and leave time to respond.
- The chapter advances on demonstrated understanding, not on clicking a prescribed button. Alternative sensible actions count.
- Avoid failure lock: allow undo before project completion, refundable cancellation under transparent rules, an affordable baseline repair, and a modest operating buffer.
- A help overlay and glossary remain available after prompts disappear.
- Graduation requires reopening capacity, creating and leasing new capacity, making a pricing decision, improving a visible operational problem, and reading a statement; if a probabilistic lease has not occurred, use a non-rigged alternate proof of understanding and do not strand progress.

### First-session success hypotheses

These are suggested playtest gates to validate, not established performance: most first-time players should independently identify the blocked unit, understand one construction warning before confirming, connect a missed inquiry to unit mix, and correctly say whether the first month generated operating cash. Test comprehension verbally and through observed behavior, not tutorial-click completion alone.

## 5. Property and construction systems

### Spatial model

A facility consists of a parcel boundary, buildable grid, terrain restrictions, entrances, driveable network, pedestrian access where applicable, structures, utility/service nodes, and leasable units. The visible isometric scene is a projection of this logical model. Rotations and frontage matter; decorative alignment does not affect economics unless explicitly labeled.

**Accessibility invariant:** No unit can be marketed as rentable unless a route from an active entrance to its required access point exists. A unit can remain physically present but temporarily unavailable because of construction, damage, blocked access, or missing service.

**Placement preview:** Shows footprint, frontage direction, route connectivity, collision, units added/removed, access deltas, project time, upfront cost, recurring expense, and source of the demand estimate. Distinguish hard errors from soft warnings. A congested but passable layout may be legal; an unreachable row is not.

### Construction catalog

| Category | Typical choices | Main tradeoff |
|---|---|---|
| Drive-up storage | Small/medium/large rows | Affordable capacity versus land and circulation |
| Interior storage | Enclosed units and corridors | Denser capacity versus loading convenience and upkeep |
| Climate-controlled storage | Specialized interior building | Premium demand versus utilities and equipment risk |
| Vehicle storage | Outdoor bays or covered spaces | Specialized demand versus land and vehicle clearance |
| Circulation | Drive lanes, turnarounds, loading areas, entrance lanes | Access versus rentable footprint |
| Service | Office, kiosk, carts, staffing support | Service quality versus overhead |
| Security | Gate, fence, cameras, lighting | Customer confidence versus capital and maintenance |
| Site works | Paving, drainage, landscaping, signage | Reliability and appeal versus non-rentable spending |

Only a subset enters the first playable build: basic drive-up rows, lanes, gate, office, light/site repair and one access upgrade. Interior and climate assets belong later unless they are needed as a distant aspirational preview.

### Construction projects

A committed project reserves budget and land, passes placement validation, advances by game days, and finishes into available inventory only after access and service checks pass. Players can pause projects; canceling after work starts returns only unspent portions, shown before cancellation. Phased construction can restrict access to existing units; previews include that temporary disruption.

### Site quality

Use specific factors—arrival convenience, access time, condition, security and service—rather than one opaque “facility quality” score. The UI may show a composite for quick orientation but must reveal contributors and affected customer segments. Landscaping and cosmetic items can improve appearance within a capped contribution; they never substitute for appropriate unit supply and access.

## 6. Market, customers, and leasing

### Local market

Each district has a stable demand profile by unit size and segment, a price reference, growth trend, seasonal pattern, and competition pressure. The forecast describes expected inquiry *ranges* based on observed history; it does not expose the exact future random sequence. Properties can specialize because different districts reward different mixes.

**Core customer segments:** Movers needing short-term flexible storage; households needing economical long-term space; contractors who value frequent drive-up visits; customers storing sensitive goods who value climate/security; vehicle owners who need large-space access. These are design archetypes, not demographic stereotypes. First playable build uses three segments only.

### Prospect funnel

For each simulated day:

1. Generate a bounded number of inquiries by district, season, marketing and seeded variance.
2. Assign required size range, duration tendency, access need, price tolerance, and preferences.
3. Filter units by availability, compatibility, reachability, and required service.
4. Score eligible units on rent, access, condition, security and segment preferences.
5. Compare best offer against the prospect’s threshold and competing outside option.
6. Lease one unit or record a primary missed-demand reason and contributing factors.

The initial version can aggregate inquiries rather than animate each one. Some prospects are selected for visible arrival and departure animations, while the report represents all prospects. Never imply that every decorative vehicle corresponds to a financially simulated renter.

**Illustrative scoring model:** `appeal = fit + access + condition + security + convenience − price_penalty + bounded_noise`; score terms are normalized and capped; eligibility is decided before scoring. Tune thresholds from playtests, not from a desire to force a predetermined tutorial outcome. The outside option prevents every prospect from renting the first vaguely suitable unit.

### Tenants

A signed lease creates an identifiable tenant record with unit, rent terms, move-in date, expected stay distribution, satisfaction factors, payment state, and departure cause. Tenants can renew, move out, or be displaced only under clearly explained policies. Satisfaction modifies move-out risk gradually; it does not instantaneously delete a lease.

### Pricing and promotions

The player sets advertised rents per unit class, with optional limited-duration promotions. Existing-tenant rent adjustments, where included, use separately disclosed timing and caps to avoid surprise changes. Price effects should be noticeable over a reasonable observation window but not so immediate that repeated daily repricing is optimal. Suggested price ranges indicate demand strength and uncertainty; no one-click universal optimum.

**Demand diagnostic:** Report inquiries by segment and size, conversions, lost prospects by principal reason, average offered rent, vacancies, and recent changes. A facility with vacant units and lost inquiries for another size is not “low demand”; the UI must make the mismatch clear.

### Occupancy metrics

- **Unit occupancy** = occupied rentable units / all rentable units.
- **Area occupancy** = occupied rentable area / all rentable area.
- **Economic occupancy** = rent actually collected in a month / potential posted rent for units that were rentable during that month, using a clearly disclosed denominator and period convention.

Different denominators answer different questions. The ledger separately displays discounts, uncollected rent, and periods out of service so players can reconcile economic occupancy. Zero-denominator cases show “N/A,” not a misleading zero or division error.

## 7. Access, operations, and maintenance

### Access and congestion

Use a route graph derived from placed lanes, gates, building frontage and vehicle restrictions. Capacity per segment is abstracted; predicted arrivals contribute to utilization. A unit’s access quality combines reachability, travel friction and expected queue. A route may be technically passable but unattractive at high traffic.

At daily resolution, estimate queue and delay from traffic demand versus gate and lane service capacity. Vehicles animate representative trips; the authoritative queue calculation does not depend on animation frame rate. The access overlay highlights bottlenecks, affected units, and a before/after estimate for a proposed change. Early game keeps this model deliberately simple: one entrance, one gate, one obvious congestion mechanism.

### Condition

Buildings and critical assets store condition, wear rate, maintenance state, failure risk, and operational effects. Wear accrues gradually with use; inspections or visual cues warn before typical failures. At most one main condition problem should dominate the tutorial at once. A broken gate slows access, a door takes units offline, and climate equipment impairs relevant units; effects are local where possible.

**Maintenance decisions:** Patch cheaply with shorter expected reliability; perform a standard repair; replace/upgrade for a more durable asset. Routine upkeep can be funded automatically by policy. Player prompts are reserved for meaningful repairs, budget exceptions or prioritization conflicts, not every minor defect.

### Staff and policies

Later facilities can assign staffing levels or service policies for check-in, repairs, security monitoring, and cleaning. Model service capacity and cost before individual worker pathfinding. Delegation automates routine choices within a budget and alerts the player when exceptions exceed that policy. The player remains responsible for strategy, not shift-by-shift labor administration.

### Events and risk

Weather, move-in surges, local competition and equipment faults should test the facility’s design and preparations, not randomly overturn it. An event has a warning where plausible, limited scope, logged cause, countermeasure and recovery path. Tutorial events are staged in timing only; outcomes still use normal systems. Late-game risk can deepen with insurance and resilience upgrades, but avoid disaster spam.

## 8. Economy and finance

### Financial model

Separate **operations** from **investment**. The monthly statement shows gross potential rent, billed rent, discounts, billed-but-uncollected rent, rent collected, other operating income, operating expenses, operating cash flow, debt service, capital spending and ending cash. Present these in an internally consistent ledger with drill-down to unit classes and events.

**Core accounting identities:**

`closing_cash = opening_cash + cash_collected + financing_inflows + sale_proceeds − operating_cash_expenses − debt_service − capital_spending − acquisition_outlays`

`rent_collected = billed_rent − discounts_applied − unpaid_rent + collections_of_prior_receivables` when the ledger’s billing and collection periods are aligned; explicitly track receivables across months to prevent double counting. Profit, cash flow and occupancy are separate numbers.

Operating expenses include baseline site expenses, utilities, staffing/service policy, marketing, insurance/taxes if included, and maintenance. Capital projects consume cash as scheduled, not as a hidden operating cost. Financing and acquisition costs appear only when those systems unlock.

### Illustrative economic tuning framework

Do not lock absolute rent or construction prices before simulation tests. Start with normalized targets: the starter site should cover routine operating expenses at its initial occupancy, one sensible repair should yield a recognizable benefit, and a construction project should require considering the cash reserve. At least two first-expansion options should be viable under different assumptions. Tune arrival volume, stay length, conversion and move-outs together until occupancy stabilizes without player intervention, then introduce actions and verify they move outcomes by interpretable amounts.

**Anti-exploit rules:** No instant endless build/refund arbitrage; marketing has saturation and cost; price changes have observation delay and tenant constraints; financing cannot cover losses forever; an inaccessible unit cannot generate legitimate rent.

### Acquisitions and debt

Later, listings show condition, layout, tenancy, asking price, debt options, cash needed, and estimate ranges. Underwriting presents base/upside/downside scenarios and a clear distinction between seller claims and verified data. Loans have explicit principal, rate, payment timing, fees, balance, and default/restructuring rules; never display interest that the simulation does not charge. The company can refinance, sell, renovate, or hold property, but expansion is never mandatory at a fixed time.

### Failure and recovery

A player with low cash can cut discretionary spending, reprice, pause construction, defer expansion, sell an asset, or pursue transparent restructuring. A prolonged insolvency may end a scenario or trigger a turnaround challenge depending on mode. First-facility tutorial cannot silently enter an unwinnable state; recovery options and their costs are always visible.

## 9. Feedback, interface, and accessibility

### Primary surfaces

1. **Facility view:** The readable isometric property, selected-object context, build previews, representative customer activity.
2. **Status rail:** Cash, occupancy, available units, condition alerts and time control. Avoid crowding the scene.
3. **Build catalog:** Category, footprint, cost, upkeep, unlock, and before/after effects.
4. **Demand desk:** Inquiries, conversion, reasons for losses, segment needs and forecast ranges.
5. **Operations desk:** Queue map, asset condition, work orders, service policies.
6. **Monthly statement:** Billed versus collected rent, spending, capital and cash; links to source events.
7. **Portfolio desk:** Unlocked later; facilities, company cash/debt and capital allocation.

**Diagnostic rule:** Any alarming top-level metric opens a causal view with a recent trend, primary drivers, affected objects, and feasible responses. An explanation should distinguish observed facts from forecasts. Example: “Four medium-size inquiries lacked a matching unit” is observed; “A new row may attract 2–4 leases next month” is a forecast with uncertainty.

### Visual direction

A modern, warm, readable isometric diorama with clean materials, expressive but restrained animation, and day/evening lighting. A coastal-suburban setting gives the starter lot identity; visuals need not claim geographic realism. Buildings visually age and recover. Overlays use patterns, labels and icons alongside color. Vehicle and customer animation corroborates actual events; it is never the only evidence of a mechanic.

### Accessibility and controls

Touch and mouse inputs share the same decisions. Large targets, optional drag alternatives, adjustable text size, non-color-only status indicators, reduced motion, subtitles for audio cues, pause during tutorial prompts, remappable shortcuts where applicable, and an uncluttered high-contrast overlay mode. Never require fast reaction or precision placement under time pressure.

### Audio

Ambient traffic, rolling doors, keypad chirps and maintenance activity add place identity. Sound communicates actionable state but every cue has a visual equivalent. Repetition controls and independent volume settings prevent a busy property from becoming noisy.

## 10. Progression and long-term variety

**Property identity:** A site’s layout, tenant mix, upkeep, district and investment history make it distinct. Expansion unlocks different strategic positions rather than merely larger versions of the same starter lot.

**District examples:** A residential commuter district rewards flexible household sizes; a trade corridor rewards convenient contractor access; a dense urban district emphasizes efficient interior storage and loading; a recreation corridor supports vehicle storage. These are fictional gameplay profiles, not promises about any real market.

**Portfolio tensions:** One high-performing site may carry the company, but a concentrated portfolio is vulnerable to local change. Players can diversify by district, specialize operationally, acquire troubled sites to turn around, or sell mature assets to finance growth. Company-level policies automate routine site work without erasing local personality.

**Optional objectives:** Scenario challenges such as “restore a neglected gate and reach stable collections,” “repurpose a poorly laid-out parcel,” or “grow without taking on debt” can create replayability without imposing a single campaign strategy. Scoring values cash health, tenant experience, capital efficiency and resilience; pure unit count alone is not a win condition.

## 11. Simulation architecture and data contract

This section defines game-system requirements, not an engine choice.

### Authoritative state

`WorldState` contains game date, seed/RNG state, districts, player company, facilities, projects, tenants, receivables, loans, event log and versioned tuning data references. Each facility contains parcel/grid, access graph, buildings, units, assets, pricing policies, staff/service policies, demand history and ledger accounts. Object IDs are stable across saves and events.

**Commands** such as `PlaceBuilding`, `StartRepair`, `SetAdvertisedRent`, `SetServicePolicy`, `AdvanceDay`, and `PurchaseFacility` validate preconditions, reserve or spend resources, and emit typed events. A single business authority applies commands. The UI and animation layer never directly alter money, occupancy or condition.

### Daily resolution order

1. Apply player commands queued before the day boundary.
2. Advance work orders and complete construction/repairs.
3. Recompute unit availability, access graph and operational service levels.
4. Determine market inquiries and match prospects to valid units.
5. Resolve tenant departures and renewals according to explicit order and contract terms; any unit vacated today becomes eligible at the next declared leasing step, not ambiguously mid-step.
6. Post bills and collect payments due today; carry receivables forward.
7. Post daily operating expenses and interest obligations when due.
8. Apply wear, check asset faults and queue resulting restrictions for the next availability recomputation, except immediate safety closures which are labeled explicitly.
9. Emit daily events, projections and report snapshots; at month-end close the statement after all daily postings.

The precise placement of departures versus matching must be fixed before implementation; the proposed order intentionally prevents same-day turnover from unpredictably creating vacancy. Tests enforce that rule.

### Determinism, saves, and offline advancement

With identical starting state, commands, tuning version and seed, the simulation must produce identical authoritative state and event sequence. Use independent or keyed random streams for market demand, tenant behavior and failures so adding decorative animation cannot change economic outcomes. Save version, seed state, pending work, finance ledger, and last resolved day. On load, migrate old versions or reject with a recovery option—never silently fabricate cash or tenants.

If offline progression is included, simulate bounded daily steps under the same rules, show a return summary, and allow the player to configure a cap or pause. Do not sell faster simulation as a monetized shortcut. An event log and replayable command trail support debugging and causal reports.

### Invariants and automated checks

- No occupied unit is simultaneously vacant, out of service and collecting valid rent without an explicit exception.
- Every rentable unit has valid access and required services.
- Capacity by size equals the count of active, leasable units in that class.
- A tenant has at most one active lease unless a multi-unit lease is explicitly modeled.
- Cash and receivable ledgers reconcile across daily and monthly boundaries.
- No negative construction balance is created without authorized financing.
- Save/load and time-speed changes do not alter authoritative outcomes.
- Prospect rejection reasons are compatible with the eligibility and choice result.
- Canceling, demolishing and repairing a structure updates access and unit availability atomically.

### Debugging and telemetry

Record `prospect_created`, `prospect_rejected`, `lease_signed`, `tenant_moved_out`, `rent_billed`, `payment_collected`, `asset_failed`, `work_completed`, `placement_rejected`, `queue_threshold_crossed`, `monthly_closed`, and tutorial-understanding events. Each has facility ID, day, causal references and tuning version. Analytics should avoid treating animation counts as actual tenants.

## 12. Balance, validation, and scope

### Balance questions

1. Does the starter facility produce understandable tradeoffs without requiring encyclopedic reading?
2. Can a player recover from a bad price or placement before the game becomes unrewarding?
3. Do all unit categories have situational value, including access improvements that create no direct capacity?
4. Can the player distinguish healthy occupancy from healthy collections and cash?
5. Does the game remain interesting after the first site, or is portfolio play just repetitive optimization?

### Playtest plan

**First-session tests:** Observe unprompted interpretation of the site, placement-preview comprehension, repair motivation, pricing expectations, understanding of gate congestion and ability to read the monthly statement. Ask players to predict the result before advancing time, then compare prediction to observed outcome. Do not equate completion with understanding.

**Simulation tests:** Run seeded batches across high/low demand, price extremes, low cash, blocked routes, aggressive building, neglected maintenance and near-full occupancy. Check that each strategy has consequences and no single tactic dominates across districts. Inspect causes of misses and finance reconciliation.

**Portfolio tests:** Compare acquisition strategies under varied financing and district risk. Confirm that renovation, conservative ownership and targeted expansion can each succeed in appropriate scenarios.

### First playable scope

**Include:** One persistent tutorial property; working isometric build/inspection view; selection and build preview; basic unit types; gate/access graph; three prospect archetypes; vacancy, prices, leases and moves; one maintenance chain; daily simulation; monthly statement; save/load; diagnostic report; contextual tutorial; pause/speed controls.

**Defer:** Multistory storage, detailed staff schedules, auctions, complex insurance, deep weather, multiple simultaneous districts, portfolio loans, sophisticated tenant AI, elaborate traffic physics and decorative systems with no gameplay effect. These can be added only after the first facility is demonstrably satisfying.

**Vertical-slice acceptance:** A first-time player can repair the damaged unit, identify a size mismatch, place a reachable row, choose a price, observe a new lease or a clearly explained rejection, reduce a visible access issue, and explain the first month’s cash result. Saves reproduce the property and books. Test runs with the same state, actions and seed match exactly. Player-visible explanations correspond to logged simulation causes.

### Major risks and mitigations

| Risk | Design mitigation | Evidence required |
|---|---|---|
| Storage theme feels passive | Visible movement, site transformation, access dilemmas | Players voluntarily inspect and improve the lot |
| Layout is tedious on touch | Chunk-based row placement, clear rotate/undo and preview | New players place valid rows without coaching |
| Economy feels opaque | Causal diagnostic links and reconciled statement | Players correctly explain a change in cash |
| Pricing has an obvious exploit | Delayed demand response and separate tenant terms | No dominant repricing loop across seeded scenarios |
| Maintenance becomes chores | Automatic routine upkeep, exceptional decisions only | Players describe meaningful prioritization, not busywork |
| Tutorial feels scripted | Valid alternatives, normal simulation rules, optional guidance | Players make distinct choices and see coherent outcomes |
| Scope expands too soon | One-site playable gate before portfolio work | First-site loop tests well before new districts are built |

## 13. Decisions to validate next

1. Confirm the intended primary platform and session length with prototypes, not assumptions.
2. Prototype the isometric site and placement preview with one access bottleneck.
3. Build a headless daily simulation and run seeded economic scenarios before art-heavy expansion.
4. Playtest the tutorial with beginners; revise teaching order based on observed confusion.
5. Decide which economic abstractions players understand and care about before adding financing and acquisitions.

**North-star acceptance:** The player can look at a struggling facility, name its constraint, make a deliberate change, watch customers and the property respond, and verify the outcome in both the world and the financial report.