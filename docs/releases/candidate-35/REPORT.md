# Candidate 35 concise customer feedback

Repository: EezzyE88/self-storage-tycoon-js only.
Branch: candidate/concise-feedback-20261008.
Base: verified Candidate 34, b8858040bb4465362c761f4b683cc5ca3d37849d.
Build: bplus-concise-feedback-candidate-35, 2026-10-08.
Verified master at start: 055d2a871945c565c3affbda89ecd46be7a4cfac.
Status: tested candidate; physical-iPhone acceptance pending. No master merge.

## Behavior

Saved complaint cards display a short outcome, “Why then” and “Next.” Requested product, report date, location and repeat count remain visible. Original customer wording, complete diagnosis, remedies, prerequisites and qualifications remain inside closed “Report context” details. Existing navigation and property guards are retained. Bubble wording, grouping, expiry and reporting data are unchanged.

Climate inventory headings show total matching same-size climate stock and ready-to-offer units separately for each historical/current snapshot. Total includes occupied, reserved, blocked, unready and unfinished stock across the current property. Readiness follows the unchanged leasing predicates: operating, unblocked, stored commercial state ready. This is not a fresh equipment validation or lease guarantee. Condition counts may overlap. Bounded unit lists, omitted counts and current/reported unit inspection remain available.

Climate summaries distinguish missing stock, occupied/reserved stock, make-ready, access, commissioning and mixed blockers. Historical conditions never become present-day claims. Older or invalid snapshots explicitly lack recorded detail; current counts do not fill that historical gap. The eligible-only diagnostic no longer calls historical stock “currently eligible.”

Both office-service and failed-gate assistance reports describe recorded service losses. Guidance asks the player to inspect current hours, coverage, gate status and waits before staffing changes. Historical losses alone do not diagnose a present staffing shortage or automatically recommend hiring a Clerk or freeing the Owner.

Active request cards retain their original text and distinguish Owner decisions from staff handling. Short guidance leaves complete response costs and consequences in context. Existing choices, automation and request navigation are unchanged. Overflow available, unavailable and unknown stay distinct. Price and normal market outcomes do not automatically prompt construction or price cuts.

No economic coefficients, simulation methods, save schema, save sanitizer, staffing dispatch, report snapshots or stored advice were changed. All shortened text is computed for presentation.

## Validation

    python tests/headless/run_feedback35_validation.py --output docs/releases/candidate-35/test-results.json

Node v24.19.0: 36/36 processes passed (22 distinct regression scripts, one extra production-autosave run with a 100 ms delay, 13 syntax checks). Commands, environments, stdout, stderr and exit statuses are captured in test-results.json. One prior climate-bubble assertion expected the replaced “What to do” label; it now checks “Why then,” “Next” and expandable context while preserving its original economic, navigation, product and state assertions. That initial failure and the successful focused rerun are both recorded. Tests with unchanged inputs were not repeated unnecessarily.

The 16 focused feedback checks cover every registered complaint, unavailable versus absent stock, historical/current divergence, mixed blockers, overlapping counts, stored readiness semantics, legacy/malformed snapshots, standard availability reasons, overflow history, both office reports, concise closed cards, detailed context/actions, supported request families, staff handling, escaping and actual production SST0/SST1 save/export/sanitization/load of snapshot and legacy reports.

Immutable Candidate 34 comparison: two seeds, 35 days each, 100,800 paired ticks. Full simulation events match each tick. Full state matches at daily and final checkpoints after daily feedback rendering. No state exclusions: cash, RNG, leases, staffing, reports, snapshots and saved state are unchanged.

Retained regression checks cover Candidate 34 monthly periods and office diagnostics, Candidate 33 climate conditions and leasing equivalence, section navigation, layout/touch fixtures, requests, availability, climate bubbles, feedback gestures, audio, clock, multi-floor saves, recovery including delayed production autosave, tutorial guidance, visual fixtures, B+ finances, financial trust, Owner capacity and staff-first delegation.

## Limits

Headless HTML and gesture fixtures do not establish physical-iPhone Safari readability or touch acceptance. Live gameplay testing remains limited by the cloud browser's unavailable WebGL context. This candidate is not accepted master or a physical-device PASS.
