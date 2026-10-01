# Self Storage Tycoon — First-Facility Design, v0.2

**Status:** Implemented design revision, not executable software. All figures and probabilities below are illustrative prototype tuning, not industry benchmarks or validated balance. This document replaces the first-facility and tutorial sections of the broader v0.1 GDD wherever they conflict. Later portfolio concepts remain optional future scope.

## 1. What this revision changes

The first session teaches four essentials: restore capacity, recognize a demand mismatch, build accessible capacity, and interpret the first statement. Pricing is available as a choice during leasing but not a required separate lesson. Gate congestion is a *post-tutorial* independent challenge. The property remains in the player's save throughout.

The prototype should test a risky hypothesis: a player can choose among plausible investments, predict a result, see it in the property and books, and want to make another decision. Accurate bookkeeping alone does not satisfy this test.

**First-session promise:** You turned a scruffy but viable storage property into a better business. You did not complete eight unrelated chores.

**Scope boundary:** One parcel, one entrance, drive-up units only, two unit sizes, one repairable door, one simple route constraint, two customer segments, one starter month, one monthly close. No staff roster, debt, collections dispute, climate control, second parcel, or simulated individual driving physics. Add them only after the loop passes human tests.

## 2. First property and starting state

**Working title:** Sunset Storage. Small roadside parcel with a front office and gate, a main drive aisle, an existing row of small units, a partial row of medium units, a damaged medium door, and two places where the player could expand. The road-facing space is easier to reach but uses premium frontage; the rear space costs less land opportunity but has worse access during busy periods. The design should make both physically distinct in the isometric view.

**Prototype time convention:** One game day is one simulation step; a month is 30 game days. Repairs and construction finish at the start of a day before leasing for that day. Daily rent is one-thirtieth of monthly posted rent for the purposes of this prototype's month-close accounting. All initial leases are month-to-month, with no prorating on an existing tenant's starting balance; the model bills earned rent for each day occupied. The first tutorial month starts on day 1. These are game conventions, not claims about real-world leases.

### Illustrative seed state

| Item | Initial state |
|---|---:|
| Cash | 12,000 game dollars |
| Small units | 8 rentable, 6 occupied |
| Medium units | 5 total: 3 occupied, 1 vacant and rentable, 1 vacant but offline due to a damaged door |
| Monthly posted small rent | 90 game dollars |
| Monthly posted medium rent | 150 game dollars |
| Monthly routine operating cost | 500 game dollars |
| Door repair | 180 game dollars; one game day |
| Front expansion | 3 medium units; 4,800 game dollars; three game days |
| Rear expansion | 4 medium units; 5,000 game dollars; three game days; minor access penalty to the rear route at busy times |
| Suggested reserve | 3,000 game dollars, advisory only |

The high construction cost relative to one month's rent is intentional: the first month's cash cannot by itself validate payback. The game must not present a quick guaranteed return. Players should see rent potential, observed missed inquiries, cash reserve after purchase, and a qualitative access warning, not a precise ROI promise.

The repair and building projects use the same authoritative rules as later play. The initial state is hand-authored to teach, while prospect decisions after the first opening are simulated. A guaranteed *demonstration inquiry* may show unmet medium demand before the player acts; it does not guarantee a lease afterward.

### Demand parameters for first simulation pass

Use a deterministic seeded daily draw with baseline inquiry expectations averaging 0.35 small and 0.45 medium prospects per day before marketing; actual daily counts vary. Approximately half of medium prospects prefer convenient loading; the others prioritize price. Do not hardcode conversion into a fixed percentage: eligible prospects compare offered unit rent, access and condition against a clear outside-option threshold. Set initial rent near the middle of the plausible range so players can test a modest increase or decrease. During balancing, validate that leaving the property alone produces some leases and move-outs without instantly filling every unit.

Treat all these parameters as **first-pass test fixtures**. Before wider production, run multiple seeded months and playtests to tune inquiry volume, tenant stay length, costs, and access effects together.

## 3. Essential tutorial flow

**Time target:** 12–20 minutes for a new player to reach the first monthly statement with time acceleration and contextual guidance; do not force waiting. This is a usability hypothesis, not a guarantee. A player who pauses to experiment can take longer.

| Beat | World cue and prompt | Player freedom | Completion proof |
|---|---|---|---|
| 1. Restore | Damaged medium door visible; unit tagged “Offline—door” | Inspect door, compare repair to deferring; repair is the recommended action | Door returns to service; vacant medium inventory increases; cash decreases by 180 |
| 2. Diagnose | First medium inquiry cannot find a suitable vacant unit only if current supply is actually unavailable; otherwise show a prospect inquiry log from recent days | Open “Missed inquiries”; inspect medium supply, conversion and causes | Player opens the size-specific demand detail and selects a build option or deliberately defers |
| 3. Build | Place a preview of front or rear row; show access impact and cash left | Choose either viable location; moving or canceling preview is free | Row completes, correct unit inventory added, route remains valid |
| 4. Verify | At a day or month close, arrivals and vacancies have changed | Price may be adjusted; player can fast-forward and inspect outcomes | Player opens first statement and identifies cash change, collected rent and capital spending |

**Important correction:** With one initially rentable medium vacancy, a medium inquiry should not be scripted as “no medium space” unless that vacancy is already occupied or the customer's needs make it unsuitable. The tutorial can instead open with a *historical* unmet inquiry, a new prospect who needs two medium spaces, or a customer who rejects the one poorly located vacancy on access grounds. This revision chooses **historical recent inquiries** as the opening diagnostic, avoiding a false simulation claim. Their records predate day 1 and are plainly marked as recent history.

Guidance does not trap the player. A choice to defer building can still move to a statement, showing the opportunity cost; tutorial completion requires using the placement tool successfully at least once, but the player can do so later. If no simulated prospect signs within the first month, show the observed inquiry and rejection reasons and progress; never silently rig a tenant to satisfy a checkbox. Optional help remains after graduation.

## 4. Decisions rather than instructions

| Situation | Response A | Response B | Evidence the player sees |
|---|---|---|---|
| Damaged medium unit | Repair for 180: fast extra capacity, modest cash use | Defer: preserve cash but continue losing availability | Door condition, vacant inventory, repair timing, cash after action |
| Medium demand appears strong | Front row: 3 units, easier access, slightly less capacity | Rear row: 4 units, more capacity but busy-time access penalty | Past inquiries, layout preview, projected accessible unit count and cash reserve |
| New medium vacancies appear | Keep suggested 150 rate: balanced trial | Lower to 135 or raise to 165: trade conversion against revenue per lease | Recent conversion and observed price-sensitive rejections; no guaranteed forecast |
| First statement surprises the player | Inspect rent reconciliation and vacancy history | Inspect project and operating spending | Source-linked event entries and definitions of each line |

A good early decision offers at least two understandable options. The door repair may be intentionally straightforward as a first lesson; front versus rear placement is the first genuine strategic choice. The rear access penalty must be measurable under common seed scenarios without making the rear choice a trap. If one location dominates across many seeds, rebalance capacity, land value, or accessibility before adding more assets.

### Presentation of forecasts

The build preview shows **known** values (cost, number of units, route validity, current cash after commitment) separately from **estimated** values (likely inquiry fit, access delay in busy periods, projected rent range). Projected rent assumes units are leased at posted rates and is labeled “full occupancy potential,” never “monthly profit.” The dashboard uses one short causal sentence by default with a “Details” expansion for deeper records.

## 5. Complete worked month

This is a controlled *illustrative playthrough*, not a promise that the stochastic model always produces these counts. It doubles as a ledger acceptance fixture.

**Chosen path:** On day 1 the player orders the 180 door repair. On day 2 it reopens. The player commits the front 3-medium-unit row for 4,800 on day 3; it opens on day 6. The player keeps the posted medium rate at 150. Two medium tenants sign on day 7 and day 16, remaining through day 30. No existing tenant moves out; no small tenants move in. Nine initial tenants remain the full month. No concessions, missed payments or other revenue occur. For this fixture, the two new tenants begin accruing rent on their move-in days, inclusive.

- Initial 6 occupied small units earn 6 × 90 = 540 this month.
- Initial 3 occupied medium units earn 3 × 150 = 450 this month.
- New medium tenant from day 7 through 30 occupies 24 days and earns 150 × 24/30 = 120.
- New medium tenant from day 16 through 30 occupies 15 days and earns 150 × 15/30 = 75.
- Rent earned and fully collected: 1,185.
- Routine operating expense: 500.
- Door repair paid: 180, classified as maintenance operating expense in this simple fixture.
- Front row paid: 4,800, classified as capital spending, not operating expense.
- Operating cash flow: 1,185 − 500 − 180 = 505.
- Ending cash: 12,000 + 1,185 − 500 − 180 − 4,800 = 7,505.
- End-of-month unit occupancy: 11 occupied / 16 rentable units = 68.75%. The offline unit was restored; the building added three units. Occupancy can fall as capacity rises even while rent increases.

The statement shows **rent collected 1,185; operating expenses 680; operating cash flow 505; capital spending 4,800; net cash change −4,295; closing cash 7,505**. “Earned rent” and “collected rent” match only because this fixture has no late payments. The front-row project is neither disguised as an operating loss nor ignored because it is capital spending.

**Alternative path:** If the player repairs but defers the new row and the two new tenants therefore cannot sign, with all other fixture assumptions equal: rent collected is 990; operating expenses are 680; operating cash flow is 310; capital spending is 0; closing cash is 12,310. The builder has more capacity and an added 195 in first-month rent but less cash; this is the tradeoff, not a “bad choice” verdict. The counterfactual tenant demand is held constant purely for the fixture. Live play will vary by seed and alternatives.

**Interpretation prompt:** “You collected more rent but ended with less cash because you invested 4,800 in a row that has not yet had time to pay for itself. What would you watch next month?” Acceptable interpretations include inquiries, lease-up, access issues and cash reserve.

## 6. Simulation rules for the first playable

Authoritative state includes parcel, units, condition, active tenants, price policy, projects, cash ledger, prior prospect history, game day, RNG state and event log. Commands validate placement and funds before changing state. Renderer and traffic animation cannot create tenants or edit cash.

At the beginning of each day: finish scheduled projects and repair work, recompute accessible rentable inventory, then process prospects. Resolve existing tenant move-outs before new prospects only if the design chooses same-day turnover; this prototype instead processes move-outs after new prospect matching, so newly vacated units cannot fill until the following day. Post occupancy rent earned for that day, determine payments when due, post daily operating expense allocation, apply wear and report. Month close occurs after day 30 postings. A failure discovered after leasing can put units offline for the following day's matching; any immediate closure needs its own clearly labeled event and lease treatment.

**Prospect evaluation:** First filter by unit size, available status and reachability. Score remaining choices for price, loading convenience and condition plus bounded seeded noise. If no suitable choice clears the outside-option threshold, record a primary rejection reason. If no available matching unit exists, record “No suitable vacancy”; if units exist but access or price loses, report that reason. A vacancy and an unmet inquiry are therefore compatible without contradiction.

**Move-outs:** Start with a simple bounded daily chance that depends on segment and satisfaction; no scripted move-outs in the worked fixture. Seed streams for inquiries, tenant departures and asset wear are separate. A price change affects new offers immediately at the next daily matching step but existing tenant payments only under a disclosed renewal rule; first prototype freezes existing lease rent for its current term.

**Daily rent and ledger:** Earned rent is posted per occupied day using that lease's monthly rent divided by 30. Cash collection is separately posted according to a clear payment schedule. For the first fixture all earned rent is collected by month end, but the engine must support uncollected receivables later. Routine monthly cost of 500 is allocated across 30 days for reporting; use fixed-point integer cents or a deterministic remainder allocation so the sum is exactly 500, not 499.99 or 500.01.

**Access model:** Each unit frontage connects to a drive-lane graph from the gate. Route validity is binary; a congestion factor adds a small, visible access penalty during busy windows to affected rear units. The front-versus-rear choice is not allowed to make units inaccessible. A representative arrival animation reflects actual resolved inquiries but does not determine acceptance.

**Invariants:** No rent earned for an unoccupied unit; no prospect leases an inaccessible unit; project cost debited once; cash reconciles after every day and month; occupied units count matches tenant records; seeded replay reproduces the same leases, cash and event causes; month-close occupancy uses stated end-of-period denominator.

## 7. Post-tutorial first independent challenge

After the player reads the first statement, an ordinary busy period makes the gate queue conspicuous. The player sees average delay, affected units, and three options: improve gate throughput at a cash cost, alter entrance layout at a larger construction cost, or defer while retaining cash. A small problem is safe to ignore briefly; its measurable effects accumulate gradually. This tests whether the player transfers the learned observe–diagnose–decide–verify pattern without a scripted prompt. Do not trigger it while the tutorial is still teaching construction.

Gate capacity and traffic tuning must allow the tutorial's front versus rear decision to matter without turning either placement into a foregone conclusion. Test both routes across multiple seeds and demand intensities.

## 8. UI content contract

**Default property HUD:** Cash, current day, unit occupancy, one most important facility alert, speed controls. Deep metrics live behind a tap/click. The isometric view shows a damaged door, occupied/vacant unit status when inspected, a visible active project, and representative arrivals.

**Build preview:** “Front row: +3 medium units; 4,800 cash; 3 days; route valid; good loading access; cash after commitment 7,020 if the 180 repair was already paid.” For rear row, show +4 units and busy-time delay warning. Cash after commitment always derives from current state, not these example figures.

**Demand detail:** Show the timeframe and observed counts. Example: “Past 14 days: 6 medium inquiries, 2 leases, 3 had no acceptable unit, 1 declined on price/access.” The categories must reconcile. If prospect histories are hand-authored tutorial context, mark them “before you took over.”

**Monthly statement:** Display operating cash flow and cash change on separate lines. A simple tap on construction opens the ledger event and the physical project; a tap on missed inquiries highlights mismatched inventory. One sentence of interpretation appears above expandable detailed figures, not several mandatory tutorial paragraphs.

## 9. Prototype and playtest gates

### Prototype order

1. Build a headless, seeded first-month simulator and verify the worked ledger fixture.
2. Create the parcel with two distinct expansion sites and clickable access visualization.
3. Connect placement and repair commands to the same simulator.
4. Add prospect animation and concise causal reports only after state changes are trustworthy.
5. Add the four-beat tutorial and test beginner comprehension.
6. Add the independent gate challenge if the first loop is enjoyable.

### Automated acceptance

- Door repair restores exactly one offline medium unit on scheduled completion and charges 180 exactly once.
- Either row can be built without invalidating existing access; an intentionally blocked test placement is rejected with a reason.
- Front-row project changes capacity only on completion and debits 4,800 exactly once.
- The worked month closes at rent collected 1,185, operating cash flow 505, capital spending 4,800, cash 7,505 and end occupancy 11/16.
- The alternative fixture closes at rent collected 990, operating cash flow 310 and cash 12,310.
- Save/load mid-project and mid-month reproduces the same final state under the same command stream and seed.
- A prospect that rejects a vacant unit for price or access is never logged as “no vacancy.”

### Human test gates

Recruit beginners unfamiliar with the game's rules and observe, without coaching, whether they can: identify the damaged unit; explain why a past inquiry was missed; place a valid row and articulate one front/rear tradeoff; predict a plausible effect of a price change; distinguish operating result from cash after construction; and suggest a response to the gate problem. Record time spent waiting, number of meaningful decisions, misread forecast claims, and whether players voluntarily choose another improvement. Do not claim the tutorial works merely because it can be completed.

### Stop conditions and design responses

- If front and rear expansion feel interchangeable, strengthen the access/land tradeoff before adding another building type.
- If daily progression feels passive, compress uneventful days and foreground real decisions; do not add arbitrary microtasks.
- If explanations feel dense, reduce default UI to one cause and one next action while retaining deeper evidence.
- If new players routinely end the first month confused by cash, rebuild the statement around one worked transaction rather than adding more finance metrics.
- If players never want to keep improving the property after the first statement, revisit the physical fantasy and decision quality before building the portfolio layer.

## 10. Open design decisions

- Primary platform and control priorities remain to be chosen after placement tests on intended devices.
- Art style and production pipeline should follow the readability prototype; visual theme must not conceal important unit state.
- Monetization is intentionally unspecified. It must not undermine the no-forced-waiting, fair-decision core.
- Whether the full game supports off-screen progress remains optional; if adopted, it uses identical authoritative day steps with a clear cap and return report.
- Actual tuned rent, demand, construction cost and project duration depend on seeded simulations and player evidence, not on the illustrative fixture.

**Release criterion for this slice:** A beginner can make a construction decision with a reason, watch the property and customers react, verify the outcome in a reconciled statement, and choose another improvement without a tutorial telling them what to do.