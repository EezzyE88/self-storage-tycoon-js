# Self Storage Tycoon — start here

A touch-first 3D game about operating and growing a self-storage business on iPhone Safari. The property is the game board: **layout → operations → economics → growth**.

**Project state, October 23, 2026 (America/Los_Angeles):** playable development game with scoped physical-iPhone acceptance. The next goal is a dependable, understandable and rewarding first-facility experience. Commercial release readiness is not established.

## New to the project?

1. Read [Project overview](docs/PROJECT-OVERVIEW.md) for the product, implemented systems, remaining work and finish criteria.
2. Read [Current status](docs/CURRENT-STATUS.md) for exact source, hosting, acceptance and candidate identities.
3. Use [Handoff](docs/HANDOFF.md) to begin work without rediscovering the project.
4. Use [Recovery index](docs/RECOVERY-INDEX.md) only when restoring source or locating retained checkpoints.

Use only **EezzyE88/self-storage-tycoon-js**, the standalone JavaScript/Three.js game. Keep the C++/WASM and Grok projects separate.

## Current source and previews

| Role | Identity / meaning |
| --- | --- |
| Master observed when this correction was prepared | `5298f6edcd4ae3329de61007ac382c527d62d4cc`; adopted documentation checkpoint |
| Accepted game source | `7d9bce5dfe431974112391a8e7fe39c2e0552744`; unchanged runtime beneath the documentation checkpoint |
| Complete accepted game-source tree | `31b81acc56a7239ebd866f6a6b14b5369d6277f3`; a later documentation commit has a different complete tree |
| Earlier protected V62 snapshot | `0385af259c35058da69ed7d6cbb29e2ab7619abb`, representing original tested `b2c55a6ee9033e5b52dbb253fe61689ba5f71f11` |
| Earlier solid-build recovery | `2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d`; historical checkpoint |

The authorized fast-forward from accepted game source 7d9bce5 to documentation checkpoint 5298f6e is complete. It changed documentation only and did not deploy anything. Re-read the live master ref before work: later documentation successors do not imply a new accepted game build. This file records verified events and identities, not the future merge state of any correction branch.

| Preview | Link | Recorded source and purpose |
| --- | --- | --- |
| Accepted Open House game / public review | [Open House, version 5](https://sst-v62-open-house-23a68ba-review.rainy-ash-3714.chatgpt.site) | Accepted game source 7d9bce5; scoped iPhone PASS |
| Protected original V62 preview | [Original V62, version 62](https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site) | Earlier pre-Open-House game; preserved separately |

Both are public development previews. Their historical URL slugs do not identify current source. Prior Open House publication verification matched all 47 runtime files; this is retained evidence. Later audit HTTP requests returned 403 from that environment, so no renewed served-file PASS is claimed. Site metadata/provenance remained unchanged; a blocked audit request does not establish a broken player URL.

## What exists

Maple tutorial, Comeback Yard recovery, scenarios, Business sandbox and Free Build; placement/rotation, construction, commissioning and access; drive-up/interior/climate storage; carts, loading, halls, stairs and elevators; Owner capacity and staff delegation; leasing, operating finance, investment guidance and reserve waiting; career and portfolio systems; local saves, Continue and save export/recovery.

Supported scope is three playable floors and up to five company properties. A five-floor specification is a target, not implemented-scope evidence. Pause, 1x, 2x and 4x remain player-controlled; a 1x day is 24 real seconds. Build confirmations preserve an existing manual Pause.

## Latest decisions and limits

- Preserve the accepted gameplay baseline and protected checkpoints.
- Coastal proof `3391b7a3add74fe0f070c15eaee7dab2851ab69d` was **rejected by Eddie** with a request to return to the pre-Coastal version. It is separate from the game; its Site still exists. No completed rollback is verified.
- Stylized slice `20db0f474f02dbd9891b27bcdef5eaa8fe858fa4` is an unaccepted comparison candidate. Its handoff reports automated passes but zero actual moving captures; physical iPhone remains NOT TESTED.
- The ordinary ownership playtest is completed: Eddie likes building/expanding and the visible payoff, while prolonged waiting drags. Do not require a repeat merely because documentation changed. Preserve justified choices; do not force spending or retune economics to manufacture progress.
- Open House and the career interface are accepted within their recorded scope. PR #2 remains excluded; milestone-wait is parked; test maintenance and the paused lamp-glow prototype are separate future tasks.
- Broad iPhone performance, beginner comprehension, long-term career/portfolio pacing and whole-game acceptance remain incomplete. Older focused passes retain their scope.

## Source and development

Static browser ES modules; vendored Three.js is in `vendor/`. Serve over HTTP using the supported environment workflow; do not open `index.html` via file://. Managed Sites work uses its supported preview/publication path. There is no game compilation step. External fonts have system fallbacks.

| Files | Responsibility |
|---|---|
| js/sim.js, js/data.js | Simulation and centralized tuning |
| js/main.js, js/ui.js | Lifecycle, input and interface |
| js/render.js, js/audio.js | Presentation |
| js/finance.js, js/economics.js | Finance and investment guidance |
| js/comeback.js, js/career.js, js/yardloop.js, js/yardinfill.js | Recovery and progression |
| js/reservewait.js | Opt-in waiting and interruption safeguards |
| js/localsave.js, js/savearchive.js | Persistence and recovery |
| tests/headless/, tests/browser/, tests/browser-qa/ | Focused and browser checks; inspect each invocation contract |
| docs/releases/, docs/validation/, docs/qa/ | Dated evidence; not automatically current instructions |

Use isolated branches for new work. Reverify live refs first. No silent master merge, deployment, economics change or normal-save access. Source checkpoints do not contain Eddie's playable company.

Historical packaging and handoff records are preserved and explicitly marked. Current status reconciles their obsolete claims; do not treat historical “no GitHub,” “no physical testing,” or “version 60 current” wording as present state.
