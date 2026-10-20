# Comeback Yard opportunity loop candidate

Base: efb8349609daccf3ceecd0cc6a4fbdf5e6129ee3. Isolated branch: candidate/yard-opportunity-loop-20261019. Build: bplus-yard-opportunity-loop-20261019.

Status: implementation candidate, not user accepted. No deployment or master merge. Desktop gameplay QA remains NOT TESTED and parked. Physical iPhone layout, touch behavior and enjoyment remain NOT TESTED for this candidate.

## Player behavior

The rescued yard's persistent next-move control follows current inventory rather than the original six units only. The player can keep exact asking rents and observe an explicitly selected ready-vacancy cohort, inspect those units on the property, or open existing asking-rent controls. Observation never changes prices or gates normal leasing. No new discount or per-unit pricing system was introduced.

Signed leases, reservations, physical occupancy and current contracted rent are separate. Ordinary unit construction on an acknowledged rescued yard starts a new cohort when an unfinished unchanged cohort is not already active. Construction still uses normal preview, Confirm, commissioning, payment, costs, demand and access rules. One non-pausing completion event recognizes all tracked units becoming occupied; reload does not replay it. Historical signatures and current rent remain separate after a move-out.

After lease-up, up to two small rental-space proposals use actual recent matching standard-unit availability losses, no current matching ready vacancies, and a valid ordinary placement on existing vehicle frontage. Each shows a current quote, modeled daily cost, asking rent, and remaining bills/reserve buffer. These are retrospective requests, not waiting customers, guarantees or predicted leases. Keeping cash remains available; proposals do not lock ordinary building or borrow funds. Covered loading and prior authored projects remain under optional property improvements.

## Scope and persistence

Additive optional `yardLoop` observation metadata stores explicit unit signatures, start time, first observed signed leases and an acknowledged completion time. Missing legacy metadata gains no invented history. Malformed observation data is dropped without changing the property or earned rescue. Missing/replaced units are disclosed rather than silently substituted. Existing rescue-operation/project records remain intact. No global economy coefficient, request generator, simulation clock, staffing rule or normal-save storage operation changed.

## Validation

- All new runtime JavaScript syntax checks and git whitespace checks.
- `tyard_loop.mjs` with a recovered scenario and, separately, the supplied Day 15 save on disposable copies. An unchanged-action 30-day comparison against the verified base simulation has exact state parity after excluding only new observation metadata: same cash, prices, RNG, leases, staff and operations. The supplied save reaches Day 45 11 AM at $2,886.20 with 26/26 occupied and three new $118.75 leases.
- Natural follow-on investment policy within the same Day 45 cap: after the original three vacancies fill, wait for a quoted proposal above the bills/reserve buffer. One 5x10 was selected on Day 37 at $620 with $257.71 buffer, commissioned normally, and leased/occupied without demand, cash or completion injection. End cash $2,501.19 in this policy. This is one seeded outcome, not a guaranteed return or an acceptance of enjoyment.
- Real UI proposal/Confirm at Pause, 1x, 2x, 4x; manual Pause preserved. No preview spending. Natural new-build tracking.
- Production raw/compressed save paths for construction, commissioning and lease states preserve new observation metadata and avoid duplicate completion events.
- Existing project UI, 12 project behavior groups, 13 rescue-operation groups, production rescue-operation saves, 13 pause-policy checks, sandbox build-pause cases, 19 Comeback Yard checks, four production Comeback save checkpoints and startup graphics guard checks passed.
- Uploaded Day 15 input SHA256 unchanged: 5b79939aec998abc3b0250fa0acbe1900d05c33a0f181dfb71f10f268031a282. No Safari storage access.

## Limits

This provides a repeating opportunity, placement and observed-lease loop using existing mechanics. It does not establish that the game is fun, eliminate quiet periods, guarantee profitability, or simulate a customer waitlist. Placement suggestions are deliberately limited to one ground-floor standard drive-up unit on existing frontage; no paving, HVAC, floors or hidden infrastructure package is purchased for the player. Baseline comparison requires `SST_YARD_BASE` pointing to an unmodified checkout of the base SHA. The private uploaded save is not included in the repository.
