# Traffic and retention delegation successor

Implemented candidate, not published, merged or accepted. Parent: `a63d1f5942382619da89b1a4aa76e6e1be818ace`. Isolated branch: `candidate/traffic-delegation-20261020`.

## Changes

- One shared `ROUTINE_VISIT_CHANCE = 0.10` controls the daily routine tenant scheduler and newly generated Maple opening-day visits. Existing eligibility, access hours and 15% large-access share remain unchanged. Existing saves' queued visits are retained, so reduced traffic phases in rather than cancelling scheduled customers.
- Policy-authorized price-retention offers remain assigned to employed Clerks/Managers after hours and through temporary Clerk availability gaps. Waiting staff do not execute an offer until actual coverage is available; the existing Manager availability rules remain unchanged.
- Old coverage-only handoffs recover for still-authorized retention when staff are employed. Manual request mode, deliberate owner takeover, critical severity and failed responses remain owner-held. Having no employed handler still requires the owner. Unrelated requests retain their prior escalation behavior.
- Current retention policy and offer eligibility are rechecked during request synchronization immediately before automatic execution. If retention is switched off or the offer is no longer eligible, the existing move-out instructions become the automatic response. Those instructions can wait through an existing coverage gap without giving a discount.
- Routine staff outcomes stay in the existing activity log. Daytime waiting copy distinguishes staff availability from office opening hours. No new controls, saved-state schema, concession values, prices, wages or financial coefficients.
- The existing one-offer guard, acceptance probability, 10% rounded rent reduction, move-out cancellation on successful retention and declined-offer result are unchanged. Explicit manual actions remain deliberate owner decisions rather than automatic policy actions.

## Executed checks

Thirteen focused scripts passed; logs in `logs/`:

`ttraffic_30day`, `ttraffic_delegation`, `ttraffic_delegation_save`, `tc24_requests`, `tfinancial_trust`, `tpause_policy`, `tsandbox_build_pause`, `tgestures`, `tbuildability`, `tbuildability_save`, `tsave_recovery`, `tworking_yard_save`, `tthreefloor_save`.

- 20 new delegation groups exercise Clerk and Manager after-hours queues at speed 0/1/2/4; manual Pause; actual UI request classification and production tick driver; next shift; temporary Clerk gap and return; closing; persisted legacy coverage; manual/owner/failed/critical/no-staff exceptions; policy revocation during daytime, after hours and a Clerk gap; and one completed declined offer with no duplicate discount.
- 53 existing request/window groups pass, including unrelated sticky handoffs, real staff hiring/firing, ordinary delayed responses, explicit owner review and existing routine move-out behavior.
- Production raw and compressed save preparation/load preserve policy, queued retention, cash, time and manual Pause through repeated loads. Staffed execution is separately invoked in the fixture to verify one response; this is not a claim that paused gameplay advances.
- Buildability remains covered by 41 groups and raw/compressed rotation-save checks. Existing gesture, pause, build-confirm, financial trust, local-save recovery and three-floor save checks pass.
- Exact parent bytes retained for CSS, renderer, main/input loop, economics, finance, local saves, archive, blueprints and property projects. Every pre-existing export from data.js compares equal to the parent; the sole new tuning export is the 0.10 routine visit probability.

## Paired 30-day observations

Each side ran 43,200 explicit simulation minutes, with 22 starting tenants and no player interventions. Owner dialogs did not stop this audit clock. These are unattended headless comparisons, not integrated UI or physical Safari playthroughs. Three deterministic seed pairs:

| Seed | Parent routine visits scheduled | Successor scheduled | Reduction | Parent/successor routine arrivals |
|---|---:|---:|---:|---:|
| 4242 | 379 | 68 | 82.1% | 371 / 66 |
| 5150 | 356 | 61 | 82.9% | 351 / 64 |
| 9101 | 391 | 58 | 85.2% | 387 / 59 |

Successor generates 1.93–2.27 routine visits per day, versus 11.87–13.03. Arrivals include seeded opening-day visits and exclude visits still pending at the end. Opening-day routine counts fall from 5/7/8 to 2/4/2. Peak simultaneous routine customers falls from 12/10/11 to 5/5/5.

Indirect effects are material: cart-use minutes fall from 12,093/9,701/11,528 to 2,563/1,630/1,887. Negative thought events fall from 21/18/14 to 18/14/8. Final cleanliness rises in these samples. General request-event counts are 2/2/1 versus 2/3/2, so this is not evidence that every kind of request becomes less frequent.

Shopper, move-in/out, lease decision, lease end, financial batch and retention-outcome methods compare identical to the parent. Their realized counts and financial outcomes need not match: fewer routine visits consume a different RNG sequence and change real service pressure and tenant experience. End tenants are 23/20/23 versus 23/23/23. Cash differences are $0.00, -$0.25 and +$118.75. Do not claim profit parity, guaranteed better retention or calibrated long-term balance from three runs.

## Boundaries and next gate

No publication, hosting-source synchronization, GitHub push or merge performed. Preview remains version 61 at the Buildability candidate. Live GitHub master was verified at `e04a808dd1cac558b9e97e8cd5f021f874ac7cfe`. Historical version 60, accepted V60 source `7346fb686c86801556fb918d27b62a427cd293fe` and protected checkpoint `2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d` are preserved. Normal company storage was never accessed.

Desktop rendered gameplay remains NOT TESTED, with the known WebGL blocker parked. Physical iPhone Safari is NOT TESTED for this successor. No new browser attempt or device acceptance is claimed. A future explicitly authorized Safari test publication should retain the exact candidate and verify served runtime bytes, then assess calmer traffic and a policy-approved retention event without owner interruption in a disposable copy. Existing staff shortages and true exceptions must still remain visible to the owner.
