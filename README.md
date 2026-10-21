# Self Storage Tycoon — start here

A touch-first 3D game about operating and growing a self-storage business on iPhone Safari. The property is the game board: **layout → operations → economics → growth**.

**Project state, October 21, 2026 (America/Los_Angeles):** playable development game with scoped physical-iPhone acceptance. The next goal is a dependable, understandable and rewarding first-facility experience. Commercial release readiness is not established.

## New to the project?

1. Read [Project overview](docs/PROJECT-OVERVIEW.md) for the product, implemented systems, remaining work and finish criteria.
2. Read [Current status](docs/CURRENT-STATUS.md) for exact source, hosting, acceptance and candidate identities.
3. Use [Handoff](docs/HANDOFF.md) to begin work without rediscovering the project.
4. Use [Recovery index](docs/RECOVERY-INDEX.md) only when restoring source or locating retained checkpoints.

Use only **EezzyE88/self-storage-tycoon-js**, the standalone JavaScript/Three.js game. Keep the C++/WASM and Grok projects separate.

## Current baseline

| Item | Identity / meaning |
|---|---|
| Accepted gameplay source snapshot | `0385af259c35058da69ed7d6cbb29e2ab7619abb` |
| Original tested source represented by snapshot | `b2c55a6ee9033e5b52dbb253fe61689ba5f71f11` |
| Gameplay baseline tree | `b309d23cca38b17fe02e8f79c654f2d9622b6b66` |
| Existing Safari game Site | Version 62; current Site metadata checked October 21 |
| Protected earlier recovery | `2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d`; retained version 57 |
| This update | Documentation only on `maintenance/project-status-20261021`; no merge or deployment |

[Open the existing Safari game](https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site). It is a public development preview. Its old slug and Site description do not identify its current game source. Publication records associate version 62 with original tested source b2c55a6. This reconciliation checked Site metadata, not fresh served-file hashes or gameplay.

## What exists

Maple tutorial, Comeback Yard recovery, scenarios, Business sandbox and Free Build; placement/rotation, construction, commissioning and access; drive-up/interior/climate storage; carts, loading, halls, stairs and elevators; Owner capacity and staff delegation; leasing, operating finance, investment guidance and reserve waiting; career and portfolio systems; local saves, Continue and save export/recovery.

Supported scope is three playable floors and up to five company properties. A five-floor specification is a target, not implemented-scope evidence. Pause, 1x, 2x and 4x remain player-controlled; a 1x day is 24 real seconds. Build confirmations preserve an existing manual Pause.

## Latest decisions and limits

- Preserve the accepted gameplay baseline and protected checkpoints.
- Coastal proof `3391b7a3add74fe0f070c15eaee7dab2851ab69d` was **rejected by Eddie** with a request to return to the pre-Coastal version. It is separate from the game; its Site still exists. No completed rollback is verified.
- Stylized slice `20db0f474f02dbd9891b27bcdef5eaa8fe858fa4` is an unaccepted comparison candidate. Its handoff reports automated passes but zero actual moving captures; physical iPhone remains NOT TESTED.
- Complete the ordinary ownership loop: operate → understand → invest or defer → see payoff. Do not force hiring/building or tune economics merely to manufacture a successful playthrough.
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
