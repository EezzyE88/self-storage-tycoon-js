# Candidate 33: climate availability diagnostics

Repository: EezzyE88/self-storage-tycoon-js only.
Branch: candidate/climate-diagnostics-20261008.
Build: bplus-climate-diagnostics-candidate-33 (2026-10-08).
Base: validation/menu-save-harness-20261008 at 49b10cff9b5dfb0b6e1703b839c7d943c581221b.
Accepted master remains 055d2a871945c565c3affbda89ecd46be7a4cfac; no merge.

## Starting verification

Live refs matched the expected Candidate 32 commit 24b5c35502388cbb2e292139fd15fb0965499333 and validation commit above. All 32 served runtime files on the existing Safari URL matched Candidate 32 Git blobs and the published SHA-256 manifest (starting-source-proof.json). Sites owner/public publishing access was verified. Candidate 32's physical-iPhone PASS is user-reported evidence, not an independently reproduced test. Px's lost implementation and reported executions were not used as evidence.

## Correction

Monthly recommendations now describe observed climate-related availability losses and ask players to check matching-size stock and readiness before expansion. They promise no leases and do not automatically recommend HVAC. Old saved recommendations receive the same presentation correction without rewriting stored history.

Failed climate offers in the existing noClimate/noSize paths gain additive snapshots: matching-size climate counts, overlapping occupied/reserved/make-ready/access/unfinished conditions, and up to 12 relevant unit records with coordinates, floor and recorded checklist. Complete counts and omitted-record counts remain visible. Historical remedies describe the recorded conditions; current matching climate inventory and inspection buttons are separately labeled. Legacy or malformed snapshots explicitly lack recorded historical detail; current inventory never substitutes for history.

Leasing selection, standard fallback, probabilities, RNG, loss categories and economy are unchanged. Operating HVAC faults do not become a rental gate. Production save implementations, requests, pauses, audio, visuals and persistent menu code are unchanged. Approved bubble grouping retains across-size grouping for identical causes, cooldown and lifetime, while distinct recorded causes remain distinguishable. Duplicate-looking Sam reviews remain an unconfirmed separate investigation item; review generation and deduplication were not changed.

## Reproducible validation

Run: python tests/headless/run_climate33_validation.py
Captured commands, environment, complete stdout/stderr and exit statuses: test-results.json.
Node v24.19.0: 21/21 process checks succeeded (14 distinct regression scripts, one extra delayed production-autosave run and six syntax checks).
The new climate suite passed 19 checks. It covers all conditions, mixed/wrong-size stock, accepted/rejected standard fallback, legacy/malformed reports, inventory changes, bounded snapshots, grouping, UI inspection controls, old/new monthly recommendations and actual SST0/SST1 save/export/validation/load persistence.

Equivalence: 2,048 directed offers across 128 seeds preserved lease results, RNG and non-report state/events; the directed standard fallback case included 26 accepted and 102 rejected offers. Eight seeded one-day simulations (11,520 ticks) preserved economic/non-report state and non-thought events. Tests compare the verbatim Candidate 32 decideLease fixture (SHA-256 5bd8463e278b73bbf466a78b64804aa894501b032baf5685a7ebf7c831c5609e), with identical market/clamp inputs. Equality excludes intentional thought/report additions and the appended diagnostic component of agent complaint keys; it excludes no economic or RNG fields.

Validation-branch menu and async save-harness improvements are retained. Production save behavior was not changed.

## Limits and next acceptance

DOM and renderer fixtures are not Safari, GPU, audio listening or physical-iPhone verification. Candidate 33 physical-iPhone acceptance is pending. Historical snapshots attach to agent feedback reports; aggregate/offline losses retain existing accounting without new per-shopper snapshots. Unit lists are bounded to 12 records, with complete counts. Reported conditions can overlap.

Publish this exact committed runtime to the existing Safari URL only, then compare every served runtime byte with Git. No separate preview or master change is authorized. Next focused gameplay work should follow user acceptance of these diagnostics and evidence of a recurring bottleneck, rather than assuming stock expansion guarantees conversion. Sam reviews require separate identity/event investigation before any deduplication.
