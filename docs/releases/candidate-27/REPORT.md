# Candidate 27: request outcomes and availability

Test candidate only; physical-iPhone acceptance pending.

Base: Candidate 26 b5b07c7941ccfdd3990842ec0ccfc3b820cdccb1.
Verified live source-proof before editing: bplus-request-pause-candidate-26; served UI hash 2946044ece8433439cae2d502b4034b876056ea74ccda94fe216dc254bb4b842 matches GitHub and hosting checkout. Live master is 055d2a871945c565c3affbda89ecd46be7a4cfac and is preserved.

## Reproduced

An old tenant with retainTried=true still received the discount button. Clicking it returned “Already made them an offer” and consumed the request. Midnight routine move-out instructions had no handler even with an employed Manager. Identical availability bubbles used requested-size-specific keys and could stack.

## Changes

- Disable obsolete retention actions and explain that the offer was already sent. Invalid indices and obsolete clicks cannot consume a pending request. Existing action indices stay compatible with saved requests.
- Keep the existing 10% discount, acceptance probability and one-attempt limit. A declined staff offer is a completed response, with explicit move-out instructions, rather than a staff failure that escalates an unusable offer to the owner.
- Newly generated routine instructions outside office hours can wait for an employed Clerk/Manager's next office shift. No response executes overnight. Missing staff, manual review, critical decisions, explicit owner intervention and active coverage-loss escalation retain owner handling. This is limited to routine move-out instructions; price decisions without an available policy answer still wait for the owner.
- Availability text distinguishes full/reserved property, vacant unready stock, blocked access, unopened units and size-specific shortages. Historical cause is saved alongside the original product request and existing lost-demand counters. Identical visual notices collapse across requested sizes; detailed history retains distinct product/location keys.
- Existing automatic decision dismissal and pause controls are retained.

## Validation

17/17 related regression scripts pass, including requests, availability, complaint guidance, touch event arbitration, pause policy, calm mode, 24-second clock, staffing, delegation, management, B+ economy, finance, financial trust, save recovery and crash repairs. Final request suite: 53 checks. Availability suite: 8 checks. Following the last two small changes, affected request/availability/complaint suites were rerun successfully.

Checks include resume at 0x/1x/2x/4x, manual and in-window Pause, multiple/mixed pending requests, stale double taps, invalid indices, attempted-offer save/reload, overnight deferred request save/reload, declined staff offer, missing staff and coverage loss. No economy coefficients, finance modules, save schema, CSS, or time-control code were edited.

## Limits

DOM fixtures test handlers and rendered button markup, not physical touch reachability or Safari layout. No supported managed browser-control skill is available in this runtime, so browser QA was skipped according to Sites instructions. User screenshots show Candidate 26's pause control; they are not Candidate 27 acceptance evidence. Physical iPhone playtest remains required. A Clerk must actually reach the office during office hours; missing active coverage still escalates.
