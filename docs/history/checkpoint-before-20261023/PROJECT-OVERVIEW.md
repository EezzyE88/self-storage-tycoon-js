# Project overview and finish target

Reconciled October 21, 2026, America/Los_Angeles. This is an orientation for someone with no conversation history. Exact identities and evidence are in [CURRENT-STATUS.md](CURRENT-STATUS.md).

## Product and player

Self Storage Tycoon is a touch-first JavaScript/Three.js management game for iPhone Safari. Eddie is the product owner and physical-iPhone playtester. The aim is an enjoyable business to operate, not merely an extensive simulation.

The player lays out the property, restores and maintains storage, handles customers, chooses prices and staffing, interprets results and reinvests. The causal chain is layout → operations → economics → growth. The property should visibly explain those relationships.

The immediate product goal is one trustworthy and satisfying facility. Career, acquisitions and portfolio systems exist, but deeper expansion should follow a strong first-facility experience.

## Implemented experience

| Area | Existing capabilities | Remaining product question |
|---|---|---|
| Entry | Maple tutorial, Comeback Yard, scenarios, Business sandbox, Free Build | Can a newcomer reach independent operation without outside coaching? |
| Property | Four-way placement, access validation, construction, commissioning, restoration and renovation | Can players place what they intend and recognize valid access comfortably? |
| Operations | Owner capacity, staff priority/delegation, office coverage, requests, loading/carts and maintenance | Does delegation provide visible relief while important exceptions remain understandable? |
| Economics | Leasing, billing, collections, costs/payroll, credit, reserves and investment guidance | Can the player explain available cash and choose a sensible investment? |
| Progression | Rescue goals, yard opportunities, independent investment tracking, career and portfolio | Does a worthwhile next decision arrive at a satisfying pace? |
| Presentation | 3D facility, people/vehicles, status feedback, day/night/weather and audio | Are activity, access and improvements attractive and clear on a phone? |
| Persistence | Local persistence, Continue, save codes/files and archive/recovery | Do integrated device flows remain reliable through ordinary use? |

Three playable floors and up to five company properties are the documented scope. The five-floor design is a target. This list establishes implemented breadth, not blanket acceptance.

## What recent work accomplished

- Automatic Owner fallback can handle eligible unassigned simple repairs using existing daily capacity, chores policy and staff priority. It does not authorize specialist work, hiring or vendor spending.
- Investment guidance distinguishes an opportunity from affordability and evidence-supported payback.
- Yard tracking distinguishes reserved from occupied, checks connected frontage, selects the correct floor and tracks overlapping investments independently.
- Placement adds explicit four-way frontage/footprint control, including single-unit corner placement without stretching to two units.
- Phone controls and build details were repaired to preserve useful yard visibility, terms scrolling and access to Rotate/Confirm.
- Routine visit generation was reduced to a shared 10% daily probability, and authorized retention can wait for staff coverage. Long-term balance remains a separate question.
- Scoped user-reported passes exist for repairs/capacity/Pause, title navigation, corner placement, terms/access visibility and save continuation. Earlier rescue, floor-view and audio results remain preserved.

## Remaining work, in practical order

1. **Honor the visual decision.** Coastal is rejected. Keep it out of the gameplay baseline. Resolve the precise rollback target before any hosting operation; an existing separate proof does not establish that the game changed.
2. **Evaluate the existing stylized comparison if pursued.** Actual matched moving evidence and full-game checks are outstanding. Do not create another direction merely to avoid finishing the existing comparison. This is a candidate evaluation, not a requirement to adopt it.
3. **Prove ordinary ownership.** From a separate already rescued test company, understand cash, vacancies, workload, coverage and demand; make a worthwhile decision or explain why waiting is sensible; observe the result.
4. **Repair the weakest observed connection.** Prioritize player comprehension, visible work and payoff over additional systems. Do not presume a defect without current evidence.
5. **Validate sustained iPhone use and beginner experience.** Dense activity, background/foreground, long sessions, battery/heat/frame stability, fresh onboarding and natural progression remain incomplete.

The 30-game-day cap from the existing operating-playtest plan is an observation boundary, not a win condition. No worthwhile opportunity within that window is a pacing finding. Hiring or construction must remain justified choices. Preserve existing pricing and earned goals in any continuation.

## Release target

A useful first release has a clear beginning, understandable operating choices, comfortable property interaction, trustworthy finance/saves/time controls, visible customers and workers, improvements with observable benefit, sustained iPhone stability and a satisfying reason to return.

No completion percentage, launch date, broad device acceptance or commercial readiness is established. Automated test counts cannot measure enjoyment.

## Working principles

- Reverify live GitHub refs; use only this JS repository.
- Preserve accepted work and keep experiments isolated.
- Presentation reflects simulation outcomes; it must not invent success.
- Manual Pause is a player choice. Do not auto-resume after build confirmation.
- Use the existing Safari game Site intentionally; verify source and served assets before describing a new publication as ready.
- Browser emulation, DOM fixtures, actual WebGL and physical iPhone are different evidence categories.
- Preserve passed checks; do not repeat them without a changed area or unresolved integration concern.
- Documentation supports the game. Keep current entries concise and historical evidence available.

See [HANDOFF.md](HANDOFF.md) for the starting procedure and [RECOVERY-INDEX.md](RECOVERY-INDEX.md) for source versus company-save recovery.
