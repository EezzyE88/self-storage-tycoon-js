# Self Storage Tycoon — Game Design Document v0.3

**Status:** Revised design document; not executable game code.  
**Purpose:** Single authoritative design baseline for the first facility and its full tutorial arc.  
**Supersedes:** The first-facility tutorial, pacing, and scope statements in GDD v0.1 and the four-beat tutorial in v0.2. Retains the v0.2 accounting fixture and simulation rigor, corrected where necessary below.  
**Balance note:** Every game-dollar amount, probability, count, and duration here is a prototype assumption, not validated balance or an industry benchmark.

## 1. Game vision

Self Storage Tycoon is a hands-on facility-building and business-management simulation. The player takes ownership of a working but underperforming storage property, repairs it, builds useful capacity, sets prices, improves access, understands its finances, and ultimately chooses its future. The first facility is the game's complete foundational tutorial, not a disposable training level. Its buildings, leases, spending, and choices persist after graduation.

**Player promise:** Notice a constraint, understand its cause, choose an intervention, see a physical and economic consequence, then decide again.

**Design pillars:** A living property; legible cause and effect; multiple defensible solutions; approachable operational depth; time controls without forced waiting; long-term ownership rather than idle collection.

## 2. First-facility tutorial contract

The tutorial has eight chapters, not four. Every chapter teaches a different foundational skill and must offer a reason to use it. Coverage is intentional: players should leave the first facility understanding construction, customer demand, pricing, operations, and cash flow.

**Pacing is not a stopwatch.** The eight chapters can run across multiple in-game months and player sessions. Offer pause and speed controls; never require real-time waiting. Advance a chapter only after its outcome has been visible or its decision examined, not immediately after a highlighted button is pressed. Natural play between chapters is allowed; when players act ahead of the guide, recognize what they already accomplished instead of forcing repetition.

**Teaching pattern:** World signal → concise explanation → meaningful action → observable response → optional detail. A prompt can guide attention, but a strategically valid alternative counts. The system may stage when a teaching situation is revealed; it may not falsify occupancy, tenant decisions, finances, or causal explanations.

**Guidance levels:** Default contextual; optional expanded explanation; skippable repeated text for experienced players. Important tutorials can be resumed from a journal. All required information remains accessible without the guide.

### Eight-chapter spine

| Chapter | World situation | Core mechanic | Player choice | Evidence of learning |
|---|---|---|---|---|
| 1. Take ownership | An existing tenant visibly arrives | Camera, select, inspect unit and lease | Explore the scene and select a unit | Player can identify occupied versus vacant inventory and rent on an existing lease |
| 2. Restore capacity | One offline medium unit has a damaged door | Repairs, cost, work time, availability | Repair now or inspect/defer briefly | Player understands that restoring a unit changes rentable capacity and cash |
| 3. Read the market | Marked pre-takeover history shows unmet medium demand; fresh inquiries continue under normal rules | Demand by size, missed inquiries, conversion | Inspect report and decide whether demand justifies capacity | Player distinguishes a unit-mix mismatch from generic low demand |
| 4. Build deliberately | Two viable row locations differ in capacity and convenience | Placement preview, valid access, project budget | Build front or rear; either is valid | Player can state a capacity/access/cash tradeoff and sees the finished row |
| 5. Set a price | New units become available and prospects seek that size | Posted rent, lease choice, tenant terms | Keep suggested rent or test a different rate | Player predicts effect on conversion and rent per lease; then inspects an actual result |
| 6. Run the entrance | A busy period reveals a gate queue affecting service | Access overlay, throughput, operational spending | Improve gate, adjust lane/traffic flow, or defer and observe | Player understands the cause of delay and checks whether their response worked |
| 7. Read the business | Month-close statement becomes available after meaningful decisions | Billed/collected rent, operating costs, capital spend, cash | Drill into statement and property events | Player explains why rent growth and ending cash can move in opposite directions |
| 8. Choose a direction | At least two credible property improvements remain | Prioritization, risk and cash reserve | Choose a project or deliberately save for later | Player states their strategy; guidance becomes optional and the same facility remains playable |

**Chapter scheduling:** Chapters 1–3 can unfold early. Chapter 4 waits until the demand report is understood but need not force immediate construction. Chapter 5 follows the first completed new capacity or an equivalent natural pricing opportunity. Chapter 6 triggers on a busy period after pricing has been introduced and should not stack on an unresolved high-priority repair. Chapter 7 waits for a proper statement close; if a month closes earlier, the statement exists normally and the guided explanation can revisit it. Chapter 8 follows demonstrated understanding of finances. No hard first-session time limit.

**Graduation:** All eight concepts have been experienced or legitimately bypassed by earlier competent actions; the player has reviewed one statement and chosen an explicit near-term strategy. A probabilistic tenant move-in is not required to unlock progress. The tutorial journal records learned concepts, not prescribed clicks.

## 3. Starter facility and first teaching setup

**Working title:** Sunset Storage. One gated roadside parcel with a front office, a main aisle, existing small and medium drive-up rows, and land at front and rear for expansion. A selected medium unit is offline because of a damaged door. Customers already occupy other units; the site makes some rent from the outset.

The first expansion has two viable placements. A front row adds less capacity but affords better loading access. A rear row adds more capacity but increases busy-period route friction. The design must keep both choices sound under different demand and cash conditions. A blocked row is invalid and explained before purchase.

**Illustrative seed state for economy tests:** Cash 12,000 game dollars; 8 rentable small units, 6 occupied; 5 existing medium units, of which 3 are occupied, 1 vacant and rentable, and 1 vacant but offline. Posted monthly rates are 90 for small and 150 for medium. Routine monthly operating cost is 500. Repairing the door costs 180 and finishes after one game day. The front project adds 3 medium units for 4,800 over three days. The rear project adds 4 medium units for 5,000 over three days and incurs a small busy-time access penalty. These values are a reproducible test fixture, not final balance.

**Demand integrity:** Since one medium unit is already vacant and rentable, the tutorial must not describe every medium prospect as rejected for lack of medium vacancies. Chapter 3 initially uses *clearly labeled recent pre-takeover inquiry records*, including prospects who sought a different size or declined an available unit for documented access/price reasons. Fresh prospects after day 1 use the same matching system as normal play. If current demand later truly exceeds suitable inventory, the live report can show no suitable vacancy.

**Tutorial safety:** Starting cash covers repair, either first construction option and a buffer. No guarantee of immediate profit; player can defer a purchase, inspect its forecast, or take smaller corrective actions. If a chosen project leaves too little cash, warn explicitly before confirmation but do not silently block a legal choice. No hidden bailouts or fake leases.

## 4. Core loop and clock

**Observe → diagnose → choose → act → resolve → verify → invest.** The isometric view shows consequences; authoritative game-day simulation resolves them. One game day is a discrete simulation step. The illustrative fixture uses 30 days per month; daily rates are monthly lease rent divided by 30. Players can pause, speed up, or advance to the next relevant event. Time compression does not change outcomes for identical state, commands, tuning version, and RNG seed.

- **Immediate loop:** Select a unit, inspect an issue, place a row or order a repair.
- **Daily loop:** Resolve projects, inquiries, leases, payments, expenses, wear, and alerts.
- **Monthly loop:** Review occupancy, rent billed, rent collected, operating result, capital spending and cash.
- **Property loop:** Change unit mix, access and service to meet a neighborhood's needs.
- **Portfolio loop, later:** Evaluate and manage distinct sites, financing and capital allocation.

The default view presents one principal issue and a clear source-linked explanation, with detailed reports optional. The player should not need to read a finance textbook to take the next sensible action.

## 5. Property, building, and access

The facility has a logical parcel grid, entrance, drive-lane graph, unit frontage, buildings, service nodes, and route capacity. Unit inventory is not synonymous with rentable inventory. A unit can be built yet unavailable due to construction, damage, missing service, or invalid access. Only reachable and open units can be advertised and leased.

A build preview separates **certain** results—footprint, cost, number of units, route validity, cash left, build time—from **estimates**—likely customer fit, congestion and rent potential. Full-occupancy potential is not forecast profit. Hard errors prevent placement; soft warnings describe tradeoffs without forbidding a legitimate design.

**First-facility catalog:** Small and medium drive-up rows, entrance/gate improvement, a lane improvement, door repair, simple paving or signage as optional cosmetic/site projects. Avoid adding climate buildings, floor navigation and detailed vehicle physics during tutorial production. Show later building types as future possibilities only if they don't confuse current choices.

The initial access model checks route validity and calculates a coarse delay from daily vehicle arrivals and gate/aisle capacity. Decorative vehicle animation follows simulated events; it does not determine rent or prospect decisions. The gate issue in chapter 6 arises from actual busy-period traffic and a known starting constraint, not a scripted penalty that ignores facility state. If the player has already solved congestion, recognize that and demonstrate the good result instead of breaking the gate to force a lesson.

## 6. Customers, pricing, and leasing

Inquiries vary by unit size, segment and district. First facility uses a small set of legible needs: short-term moving households seeking convenience, budget-conscious longer-term households, and frequent-access small businesses. Prospect generation includes bounded seeded variance, not a guaranteed stream of ideal customers.

Prospect matching has two stages. **Eligibility:** Is a compatible unit available, reachable and in service? **Choice:** Does price, access and condition beat the prospect's outside option? Rejection logs record a principal cause compatible with the actual decision. An available unit rejected for price is not counted as “no vacancy.”

A lease stores unit, contracted rent, start date, expected stay distribution, payment status and satisfaction factors. Prospects may move in or reject offers. Existing tenant terms are preserved for the current lease term when advertised rents change. A price adjustment changes next-day offers for new prospects, not rent for current tenants without a clearly modeled renewal event.

Chapter 5 asks players to predict one consequence before advancing days: higher rent tends to improve rent per new lease but may lose price-sensitive prospects; lower rent may aid conversion but reduce revenue per lease. The lesson completes through inspection of an observed inquiry/lease and a comparison to the player's prediction. If no inquiry arrives promptly, advance to the next inquiry event or show recent observed records; do not rig acceptance.

**Report metrics:** Unit occupancy, area occupancy, and economic occupancy are separately defined. Economic occupancy requires a consistent period denominator and a transparent ledger for discounts and unpaid bills. Where no valid denominator exists, show “N/A.” The tutorial starts with occupancy, rent and cash; more complex occupancy views can be opened from the statement.

## 7. Maintenance, congestion, and operations

Assets store condition, work status, operational effect and service cost. Typical failure risk rises with wear, with warning where possible. Repairs consume explicit funds and days. Routine maintenance can later be automated by a policy; first facility requires one hands-on repair so the player learns why upkeep matters.

Congestion is introduced only after players have seen leasing and pricing. Present a busy gate queue in the world, show observed wait and affected access, then offer at least two viable actions: improve gate throughput at an upfront cost or modify circulation with a more expensive layout project. Deferring is a valid third response with a clear near-term consequence. The player can compare measured wait over similar busy periods; the report does not promise exact future wait times.

A visible bottleneck is meaningful only if its effect on prospect appeal or tenant experience is measurable. Avoid large random punishment; the issue should be recoverable and should not erase the earlier construction decision.

## 8. Financial model and worked example

Show **earned rent, billed rent, collected rent, operating expense, operating cash flow, capital spending, financing flows if any, and ending cash** separately. Do not treat a new row as an operating loss or ignore its cash cost. First tutorial has no debt. Rent is earned per occupied day; payment collection can occur separately. The worked fixture assumes all earned rent is collected by month end so the reconciliation is easy to verify.

### Illustrative controlled month

Assume initial 6 small and 3 medium tenants stay all 30 days. Repair the door on day 1 for 180; it reopens on day 2. Commit the front row on day 3 for 4,800; three new medium units open on day 6. Keep the medium price at 150. Two additional medium tenants move in on days 7 and 16 and stay to day 30; no other move-ins, departures, concessions or missed payments occur. This is a *fixed acceptance fixture*, not the prescribed outcome of every seeded playthrough. The chapter 6 gate lesson may occur during this period; the accounting fixture assumes the player **defers gate spending until after day 30** so no extra expense alters its stated totals.

- Initial small rent: 6 × 90 = 540.
- Initial medium rent: 3 × 150 = 450.
- New tenant occupying days 7–30: 150 × 24/30 = 120.
- New tenant occupying days 16–30: 150 × 15/30 = 75.
- Earned and collected rent: 1,185.
- Operating expense: 500 routine + 180 door repair = 680.
- Operating cash flow: 1,185 − 680 = 505.
- Capital spending: 4,800.
- Cash at month end: 12,000 + 1,185 − 680 − 4,800 = 7,505.
- Ending unit occupancy: 11 occupied / 16 rentable = 68.75%. Both the repaired unit and three new units are included in the denominator.

The statement explicitly shows a positive operating result of 505 and a cash decline of 4,295 after the capital investment. A builder who collects more rent can still hold less cash this month.

**Alternative controlled month:** Repair the door but defer the front-row build. Hold all other assumptions fixed; the two new tenants cannot sign. Collected rent is 990; operating costs remain 680; operating cash flow is 310; capital spending is zero; ending cash is 12,310. This fixture illustrates an opportunity-cost choice, not a verdict that immediate expansion is always optimal. In a real seeded run, altered supply can also alter conversions and events.

**Accounting convention:** Allocate the routine monthly cost over days using deterministic integer cents with remainder, then close at exactly 500. Track receivables separately when billed rent is uncollected. Avoid presenting a guessed monthly profit from a fully vacant new row as though it were realized income.

## 9. Chapter feedback and UI

**Facility HUD:** Cash, current game day, occupied versus rentable count, one priority alert, pause/speed controls. Selected-unit card explains size, lease, accessibility and condition. Build and repair controls appear contextually.

**Demand report:** Observed inquiry period, unit sizes, accepted/rejected counts and primary reasons; historical tutorial records are labeled “before takeover.” Forecasts are labeled as estimates with ranges.

**Price panel:** Current posted rate, currently leased rate where different, recent observed outcomes and a simple explanatory range. No perfect-price recommendation. Changes to advertised rent take effect for future offers only.

**Access overlay:** Gate and lanes colored and patterned by utilization, with explicit observed wait and affected units. Red/green alone never conveys the whole message.

**Monthly statement:** Collected rent, unpaid amounts if any, operating expenses, operating cash flow, capital spending, cash change and ending cash. Tap a line to inspect source transactions and site objects. Use one plain-language takeaway and optional detail; tutorial chapter 7 asks the player to interpret, not just dismiss the panel.

**Tutorial journal:** Eight chapters with current lesson, concepts learned, brief recap and a way to re-open help. Prompts do not cover the site while construction is being placed. All essential actions are available through normal UI after onboarding.

**Accessibility:** Legible labels, large touch targets, non-color-only warnings, adjustable type, reduced motion and visual equivalents for sounds. No required quick-time actions.

## 10. Simulation contract

Authoritative state contains game day, tuning version, seeded random streams, facility layout and access, asset condition, unit availability, projects, tenant leases, pricing policy, prospect history, cash/receivable ledger, events and tutorial journal. Validated commands include `Inspect`, `OrderRepair`, `PlaceRow`, `SetAdvertisedRent`, `ImproveAccess`, `AdvanceDay` and `SetPlan`. The UI never directly edits occupancy or funds.

**Daily order:** Apply validated commands; complete due repairs/projects; recompute availability/access; generate and match prospects; then resolve move-outs so vacated units can lease no sooner than the following day; accrue occupied-day rent and post due payments; post operating expense; apply wear; publish events. At day 30, close the month after all postings. Any immediate safety closure uses an explicit event and accounting treatment. This order is a specification and should be changed only with corresponding tutorial, ledger and test updates.

Use independent seeded random streams for inquiry generation, tenant behavior and asset wear. Loading a save or changing rendering speed cannot change the business outcome. Persist version, random state, pending projects, journal progress and ledger. Offline advancement, if later added, uses the same day steps with a clear cap and summary.

**Core invariants:** No lease on an unreachable/offline unit; one active tenant per unit in first-facility scope; project costs charged exactly once; occupancy equals active leases; rent accrues only for occupied days; cash reconciles with the ledger; prospect rejection reason matches actual filtering/scoring; loading and replaying the same commands reproduces identical results. Historical pre-takeover inquiries are not confused with live simulated inquiries.

## 11. Production scope and validation

### Required first-facility content

Build one isometric parcel, existing tenant activity, repairable door, demand history and live inquiries, two distinct expansion positions, row placement and access checks, price policy, gate queue and two remedies, daily stepping, monthly accounting, persistent saves, contextual eight-chapter tutorial and source-linked reports. Prototype with rough art until building, traffic and finance are understood by beginners.

### Automated acceptance

1. The offline door returns exactly one medium unit to rentable inventory and costs 180 once.
2. Both expansion positions are valid and differ meaningfully in capacity/access; blocked footprints explain failure.
3. Front-row capacity changes only when construction completes; cost of 4,800 is debited once.
4. The controlled month closes at 1,185 collected rent, 680 operating expense, 505 operating cash flow, 4,800 capital spending, 7,505 cash and 11/16 ending unit occupancy.
5. The defer-build counterfactual closes at 990 collected rent, 310 operating cash flow and 12,310 cash.
6. Chapter 3 never reports “no medium vacancy” when a suitable rentable medium unit is available.
7. Chapter 5 records a pricing decision and its actual next-inquiry outcome without guaranteeing a sale.
8. Chapter 6 uses real traffic/access state; if congestion has been preemptively resolved, tutorial recognizes it.
9. The eight-chapter journal survives save/load, handles actions taken out of order and never creates duplicate tutorial charges.
10. Month-close ledgers reconcile under construction, late payments, cancellations and reloads; deterministic replay matches state and events.

### Beginner playtest questions

Observe whether the player can: identify occupied and offline units; distinguish past inquiries from live demand; articulate why front and rear differ; predict how rent might change new-lease conversion; identify the cause of a gate queue; distinguish operating result from cash after construction; and choose a defensible next project without a tutorial arrow. Record misunderstandings, time spent waiting, ignored warnings and voluntary engagement between chapters. Do not define success by finishing all chapters alone.

**Stop and revise if:** Both expansion choices feel the same; the game asks for repeated routine repairs; a player cannot predict or explain a price result; the gate challenge overrides prior clever planning; the financial report contradicts the world; or players experience the eight chapters as mandatory button-clicking rather than ownership.

## 12. Beyond the tutorial

After graduation, Sunset Storage remains fully playable and can specialize. Future properties introduce different demand, layouts and risks. Later systems may include climate control, vehicle storage, staffing policy, acquisitions, financing and portfolio delegation, but none should invalidate the foundational observe–diagnose–decide–verify loop.

**Release gate for the first facility:** A newcomer encounters all eight foundations, makes at least one genuine spatial and one operating choice, can explain the financial consequences, and voluntarily proposes a next move for *their* persistent property.