# Self Storage Tycoon JavaScript

A touch-first 3D self-storage construction and management game. Design the property, operate the business and grow the company: layout → operations → economics → growth.

Use only EezzyE88/self-storage-tycoon-js. JavaScript/Three.js is this project's authority; do not combine it with the C++/WASM or Grok projects.

## Current accepted preview

Updated October 19, 2026, America/Los_Angeles.

| Item | State |
|---|---|
| Accepted game commit | 7346fb686c86801556fb918d27b62a427cd293fe |
| Safari preview | Version 60; user-reported focused physical Safari PASS |
| Protected solid-build recovery | 2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d; version 57 retained |
| Live GitHub master | e04a808dd1cac558b9e97e8cd5f021f874ac7cfe; unchanged |
| Runtime scope | Three playable floors; up to five company properties |

Preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

Version 60 restores title-screen taps and retains the financing layout and investment-guidance work. Eddie reported PASS, repeated it, then said the game is in a good state. This is scoped acceptance of the development preview, not blanket device or commercial-release acceptance.

This maintenance branch updates documentation only. Its runtime is byte-identical to accepted 7346fb6; it does not advance master or change the deployed version. The reused on-screen build label is historical; source-proof.json identifies the exact served game commit.

Start with [CURRENT-STATUS.md](docs/CURRENT-STATUS.md), [RECOVERY-INDEX.md](docs/RECOVERY-INDEX.md) and [the version 60 acceptance record](docs/releases/title-taps-hotfix-20261019-ACCEPTANCE.md). [HANDOFF.md](docs/HANDOFF.md) carries a current notice above the preserved historical material.

## Implemented game

- Maple Street tutorial, Comeback Yard recovery, other scenarios, Business sandbox and Free Build.
- Placement, preview, construction, commissioning, access checks and renovation.
- Drive-up/interior units, climate products, loading, carts, halls, stairs and elevators.
- Owner capacity, eligible automatic simple repairs, staff priority/delegation, office coverage and requests.
- Leasing, billing, collections, costs, payroll, credit, financial commitments, reserves and outlook.
- Separate investment opportunity, affordability and evidence-supported payback; role-relevant capacity advice.
- Optional reserve waiting with review/resume/stop, interruptions and no automatic purchase.
- Career tiers, acquisitions, company transfers and portfolio operation.
- Historical diagnostics, feedback, stylized 3D presentation and procedural audio.
- Save codes/files, local persistence, Continue and previous-game/archive recovery.

Pause, 1x, 2x and 4x are supported. A 1x game day is 24 real seconds. Reviews and build confirmations preserve an existing manual Pause.

## Acceptance and remaining work

Protected 2096ef6 retains the earlier scoped Owner repair/capacity/Pause acceptance. Earlier rescue/history/career/save continuity, Ambience silence and floor navigation retain their original physical acceptance. Version 60 closes the title-screen tap blocker through the reported focused Safari check.

Publication verified 44/44 runtime files against exact version 60 source. Actual browser UI clicks and focused Node checks are retained separately from physical Safari acceptance. The hotfix browser fixture uses real UI DOM/listeners with disposable state and renderer/persistence boundary doubles; it is not full-game WebGL or real-save integration testing.

Desktop full-game WebGL QA remains NOT TESTED and its blocker is parked. Dense-device performance, broad layout coverage and sustained natural career/portfolio pacing remain incomplete. Do not reopen passed rescue checks or call historical test counts a new blanket pass.

The next gameplay milestone is ordinary management of the existing rescued/expanded test company: understand cash, vacancies, workload and demand, obtain useful operational relief where appropriate, then choose a justified next improvement or defer spending. No forced hiring, construction, new mode or economy tuning is required.

## Development and source map

The game uses browser ES modules and static runtime assets; there is no game compilation step. Serve over HTTP through the environment's supported preview workflow. In managed Sites environments use the supported Sites preview path, not a separate ad hoc server. External fonts have system fallbacks; Three.js is bundled in vendor/.

Focused Node scripts are under tests/headless/. Read each script's invocation contract; some require exact parent source, fixtures or environment variables. The title interaction fixture is tests/browser/title-taps.html; its setup and limits are in the hotfix release record. Do not equate a zero exit, a DOM fixture or a viewport frame with physical device acceptance.

| Source | Purpose |
|---|---|
| js/sim.js, js/data.js | Simulation and centralized tuning |
| js/main.js, js/ui.js | Company/lifecycle handling and player interface |
| js/render.js, js/audio.js | Presentation |
| js/finance.js, js/economics.js | Finance authority and derived investment guidance |
| js/comeback.js, js/career.js, js/yardloop.js, js/yardinfill.js | Rescue, career and yard opportunities |
| js/reservewait.js | Opt-in waiting and its safeguards |
| js/localsave.js, js/savearchive.js | Local save and recovery |
| docs/CURRENT-STATUS.md | Current identities, acceptance and next milestone |
| docs/RECOVERY-INDEX.md | Protected and current recovery targets |
| docs/releases/, docs/validation/ | Dated evidence with original scope |
| docs/design/SST_Master_GDD_v1_1_Art_Audio_Complete.pdf | Target design, not proof of implementation |

Source checkpoints contain code/history, not Eddie's playable company save. A restored source package must never be assumed to restore Safari storage.
