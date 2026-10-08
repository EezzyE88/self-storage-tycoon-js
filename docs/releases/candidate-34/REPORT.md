# Candidate 34 reporting periods and office guidance

Repository: EezzyE88/self-storage-tycoon-js only.
Branch: candidate/reporting-period-guidance-20261008.
Base: Candidate 33 at 3bdba09dfff381dbb8bf881632028903a4f5b43a.
Build: bplus-reporting-guidance-candidate-34, 2026-10-08.
Verified master at start: 055d2a871945c565c3affbda89ecd46be7a4cfac.
Status: tested candidate; physical-iPhone acceptance pending. No master merge.

## Changes

Monthly shopper totals and size advice now use the same inclusive completed-day range as the existing financial rows. At the Day 31 report, Days 1 through 30 are counted, including Day 1 and excluding Day 31. The actual retained financial range is recorded for partial first reports. Financial totals, grade calculations, generation timing and economic coefficients are unchanged.

New monthly reports carry an additive period object, with explicit completed dates and generation day in the UI. Current market-loss and attention views identify their rolling 30-day window, including today so far. Product grouping is disclosed: current availability diagnostics separate standard and climate requests; saved size advice combines them while listing climate losses separately.

Old saved monthly reports retain their original totals, advice and shape. Their original shopper window is labeled as legacy; unrecorded financial dates are disclosed rather than invented. Missing legacy dates are explicitly unknown. Stored history is never reconstructed from current inventory or current losses.

Office guidance now separates shoppers waiting from those already being served, and separates the current queue from recorded service losses. Historical losses alone neither diagnose a present staffing shortage nor recommend a Clerk. A current queue prompts inspection of hours, coverage and persistent waits; when everyone is already being served, guidance allows current service to finish. Staff dispatch, office service duration, work capacity and hiring costs are unchanged.

No reserve or display-rounding arithmetic was changed. The independently rounded whole-dollar discrepancy remains covered by regression tests.

## Validation

Run from a checkout containing the immutable base commit:

    python tests/headless/run_reporting34_validation.py --output docs/releases/candidate-34/test-results.json

Node v24.19.0: 29 of 29 validation processes passed. Complete commands, environments, stdout, stderr and exit statuses are in test-results.json. This comprises 20 distinct regression scripts, one extra production-autosave run with a 100 ms delay, and eight syntax checks.

The new reporting suite passed 16 checks: inclusive monthly endpoints for every recorded loss category, current/future exclusions, earliest-day size advice, partial first-report dates, independent stored and rolling counts, product labels, historical-only office losses, resolved staffing, active service versus waiting, absence of false empty-office warnings, legacy dates/history, unknown dates, unchanged cents rounding, and real SST0/SST1 save/export/sanitizer/validation/load for both new and legacy reports.

Immutable Candidate 33 equivalence: two seeds, 35 days each, 100,800 paired ticks. Full simulation events and full state were compared at daily checkpoints. Exclusions are only each monthly report's intentional period metadata, shopper counts and advice. RNG, cash, operating books, leases, staff, work, grades and financial report totals matched. These are deterministic headless comparisons, not enjoyment or physical-device acceptance.

Retained regression coverage includes Candidate 33 climate diagnostics and leasing equivalence; menu stability; layout/touch fixtures; request handling; availability and climate bubbles; audio structure; 24-second clock; multi-floor saves; save recovery including delayed production autosave; tutorial guidance; visual fixtures; feedback interactions; B+ finances; financial trust; Owner capacity; and staff-first delegation. Two old climate-report fixtures now supply real completed-day dates, and the legacy fixture explicitly omits the new optional period field. Their original behavioral assertions remain.

## Limits

Live interaction testing is unavailable in this cloud browser because it cannot create a WebGL context. DOM fixtures, source verification and headless tests do not establish physical-iPhone Safari acceptance. No claim of acceptance, master promotion or release approval is made.

New loss-window corrections apply to newly generated monthly reports. Previously saved monthly reports remain historical snapshots and retain the old boundary behavior. No old financial or economic state is rewritten.
