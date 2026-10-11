# Self Storage Tycoon JavaScript

A touch-first 3D self-storage construction and management game for iPhone Safari and desktop browsers. Design the property, operate the business and grow the company. The core relationship is **layout -> operations -> economics -> growth**.

This is the standalone JavaScript/Three.js project `EezzyE88/self-storage-tycoon-js`. Do not mix it with C++/WASM or other builds. The authoritative simulation is `js/sim.js`.

## Current accepted state

Updated 2026-10-10, America/Los_Angeles.

| Item | Verified state |
|---|---|
| Accepted game source | `b2faa4baa8da8d470e142480ef9229485a73b46b` |
| Acceptance | User-approved fast-forward into master, preserving 19 reviewed commits |
| Retained candidate branch | `candidate/yard-view-20261010` |
| Served build | `bplus-yard-view-candidate-41` |
| Safari preview | https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site |
| Runtime scope | Three playable floors; up to five company properties |

The current documentation commit advances master without changing game source. The runtime and preview remain at the accepted game-source commit above. No new Candidate number or publication is implied. The preview source proof retains the former accepted master as historical publication metadata.

See [current status and next milestone](docs/CURRENT-STATUS.md) for the authoritative acceptance assessment and remaining limits. [Project handoff](docs/HANDOFF.md) retains the historical development record with a current-state notice. Older release reports describe their original scope; they do not override later explicit acceptance.

## Implemented game

- Maple Street tutorial, Comeback Yard recovery, other authored scenarios, Business sandbox and Free Build.
- Placement, preview, confirmation, construction, commissioning, access validation and renovation.
- Drive-up/interior units, climate products, loading, carts, halls, stairs and elevators.
- Owner capacity, staff work/delegation, office coverage, request handling and explicit pause controls.
- Leasing, billing, collections, financial commitments/reserves/outlook and scoped Growth Readiness.
- Career tiers, acquisitions, transfers and portfolio operation.
- Historical diagnostics, feedback, property status cues, stylized 3D presentation and procedural audio.
- Save codes/files, local persistence, Continue and previous-game/archive recovery.

Pause, 1x, 2x and 4x are supported. At 1x a game day is 24 real seconds. A build confirmation must preserve an existing paused state.

## Acceptance and validation

Eddie's reported iPhone evidence covers rescue acknowledgement, career access, expandable history, tested save/reload/Continue, Ambience-only interruption silence, deliberate further building and extension persistence. A separate later run reached 25/25 leased from the 23-unit fixture and continued through Day 45 with repairs, cart demand, overdue rent and completed rescue history visible. Separate runs are not one continuous trace; screenshots without build labels do not establish deployment identity.

Candidate 41 records 84 successful final script executions after four corrected harness invocations, including two placement diagnostic helpers. The merge review independently verified 60/60 served hashes and 38/38 runtime Git matches, and reran 15 production-autosave recovery groups with delayed compression. These are automated/source checks, not blanket device acceptance.

No blocking defect was identified in the merge review. Dense Safari GPU/thermal performance, full organic company progression, physical card-spacing acceptance and physical Return to placement camera preservation remain unconfirmed. The accepted baseline is not a claim of complete commercial-release readiness.

## Next gameplay milestone

**Run the expanded yard with staff and fund its next justified improvement.** Use existing delegation, office coverage, requests, payroll, financial guidance and construction first. Establish whether routine work leaves the Owner room to manage and invest. Do not add a mode, force hiring, tune the economy or require another rescue session merely to demonstrate this. Detailed proposed success criteria and the separate dense-Safari check are in [current status](docs/CURRENT-STATUS.md).

## Local development

There is no application build step. Serve this directory over HTTP:

```sh
python3 -m http.server 5173
```

Open `http://localhost:5173/`. Opening `index.html` through `file://` is unsuitable for ES modules. Three.js is bundled in `vendor/`; external fonts have system-font fallbacks. Use production save flows and inspect the current code for optional server behavior rather than relying on older hosting notes.

Headless scripts are under `tests/headless/` and require Node. Some require fixtures, environment variables or placement JSON; inspect their invocation contracts and retained retry logs. Do not call every zero exit an assertion-suite pass. Browser emulation and stubbed rendering are separate from real Safari evidence.

## Main source and design references

| Path | Purpose |
|---|---|
| `js/sim.js`, `js/data.js` | Simulation authority and centralized tuning |
| `js/main.js`, `js/ui.js` | Company/lifecycle handling and player interface |
| `js/render.js`, `js/audio.js` | Presentation |
| `js/finance.js`, `js/economics.js` | Financial authority and derived operational/investment views |
| `js/comeback.js`, `js/career.js`, `js/yardinfill.js` | Rescue progress, career eligibility and optional infill |
| `js/localsave.js`, `js/savearchive.js` | Local save and recovery support |
| `docs/CURRENT-STATUS.md` | Current source/acceptance state and proposed next milestone |
| `docs/releases/`, `docs/validation/` | Historical reports and captured evidence |
| `docs/design/SST_Master_GDD_v1_1_Art_Audio_Complete.pdf` | Target product specification; not proof of implementation |

The GDD's legacy C++ authority language is superseded for this standalone project. Documentation, source completion, user acceptance and publication are distinct states.
