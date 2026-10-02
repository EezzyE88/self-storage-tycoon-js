# Self Storage Tycoon (JavaScript build)

A 3D self-storage tycoon game for **iPhone Safari** and desktop browsers. You build a storage facility, run it and grow the company. The target specification is *Self Storage Tycoon — Master GDD v1.1 (Art + Audio Complete)*, included at `docs/design/`.

> **This is a standalone JavaScript project.** It is separate from, and does not depend on, any C++ Self Storage Tycoon project. Push it to its own repository; don't merge it into a C++ repo as a subfolder or submodule. The GDD says "C++ gameplay authority", but this build's simulation is JavaScript (`js/sim.js`); see `docs/HANDOFF.md` §16, conflict C2.

## Source version (from available evidence)
| Item | Value | Evidence |
|---|---|---|
| Game source commit | Tag `playtest-1`, build `sandbox-1.1` (Round 14 + foundations + sandbox v1 + the 2026-10-02 bug/stress/playtest fixes; see `git log`). Earlier: Round 12; before that `a823f496c12bb503b53ba26c913b9dd34b93fcd6` (`a823f49`), "Round 11: market pressure, report cards, core tutorial + lessons, operator career, renovations, phone declutter", 2026-10-01 01:37:22 UTC | `git log` in this repository |
| Branch | `master` | `git branch` |
| History | 6 commits: `5550d8f` baseline → `ec22ac9` Showcase → `100d18c` autosave server restore → `98f4c30` Round 9 → `6851b44` Round 10 → `a823f49` Round 11 | `git log` |
| Packaging commit | One commit on top of `a823f49` that adds only `README.md`, `PACKAGE_MANIFEST.md`, `docs/` and `tests/`. No game files changed. | `git show --stat HEAD` |
| Same as the deployed preview? | The game files match the Round 11 deploy bundle that was built from `a823f49` | The deploy was built from that commit; the live preview itself wasn't re-checked during packaging |
| Earlier history | Rounds 1–7 happened in an earlier workspace whose git history isn't available. `5550d8f` "baseline" is the Round 7 zip, imported as-is. Commit `7af2a1a`, mentioned in the QA report, is **not** in this repository. | QA report and handoff |

## Dependencies
- **Runtime (players):** a modern browser with WebGL and ES modules (Safari on iOS, Chrome, Edge, Firefox). There's no build step and no npm packages.
  - three.js is **bundled** at `vendor/three.module.min.js` (Copyright 2010-2024 Three.js Authors; it contains a revision string of "170", probably r170).
  - Fonts (Satoshi, General Sans) load from the **Fontshare CDN** (`api.fontshare.com`, `cdn.fontshare.com`). Without a network connection, system fonts are used.
- **Local serving:** Python 3 (any recent version; packaging checks ran on 3.14.3), for `http.server` and the save server. Standard library only.
- **Tests (optional):**
  - Headless: Node.js 18+ (checks ran on v20.20.1).
  - Browser QA: Playwright for Node (checks ran on 1.63.0) plus its Chromium (`npm i playwright && npx playwright install chromium`).

## Run it
```bash
cd self-storage-tycoon-js
python3 -m http.server 5173                # static game server
# in a second terminal (optional, for autosave):
python3 server/save_server.py              # autosave server on port 8000
```
Open **http://localhost:5173/** in a browser.
- Opening `index.html` from disk (`file://`) **doesn't work**, because browsers block module scripts loaded that way.
- **To test on an iPhone over your LAN**, open `http://<your-computer-ip>:5173/` in Safari. Autosave won't work this way: the game looks for the save server at `http://localhost:8000`, which on the phone means the phone itself. Use save codes or files instead.

### Save-server setup and behavior
- `server/save_server.py` listens on `0.0.0.0:8000` and serves `GET/PUT/DELETE /api/save`, with permissive CORS. It stores one JSON file per visitor in `server/saves/` (created automatically and git-ignored). Saves are limited to 2 MB.
- **Visitor identity:**
  - The server keys saves on the `X-Visitor-Id` header (set by the Perplexity preview host), or else `X-Client-Id`.
  - Locally, `js/cloud.js` sends a **random `X-Client-Id` on each page load** unless the URL has `?cid=<name>`.
  - **To make Continue work locally, always open the same URL with a fixed id**, for example `http://localhost:5173/?cid=me`. (I worked this out from the source; it hasn't been tested locally.)
- **Server address:** `js/cloud.js` contains `RAW = '__PORT_8000__'`. The Perplexity deploy tool rewrites it to a proxy path. Unrewritten, the game falls back to `http://localhost:8000`, which the page's Content Security Policy allows (`connect-src … http://localhost:8000`).
- **Other hosts** (GitHub Pages, Vercel, Netlify): the static game works, but there's no save server, so autosave shows **offline**. **Save codes and `.sst` files** (Menu → Save/Load) work everywhere.
- **This is not a production server:** it has no authentication, writes plain files and allows any origin.

## Repository layout
| Path | Purpose |
|---|---|
| `index.html`, `css/game.css`, `manifest.webmanifest`, `icon-180.png`, `icon-512.png` | Page shell, HUD, styles, Add to Home Screen |
| `js/sim.js` | Authoritative, deterministic simulation (seeded RNG in state): actions, economy, market pressure, collections, loans, conversations, tasks, agents |
| `js/data.js` | All tuning data (markets, tools, staff roles, operating costs, career tiers) |
| `js/tutorial.js` | Core tutorial (8 parts, 25 steps) and 6 optional lessons |
| `js/ui.js` | DOM UI: sheets, inspector, coach bar, pins, unit labels, feed |
| `js/main.js` | Bootstrap, multi-property company, stepping, tier sync, adaptive quality, autosave |
| `js/render.js`, `js/showcase.js`, `js/post.js`, `js/fx.js`, `js/audio.js` | Presentation only (3D diorama, photo mode, effects, sound) |
| `js/maple.js`, `js/scenarios.js` | Maple Street starting property; three scenarios |
| `js/cloud.js`, `server/save_server.py` | Autosave client and server |
| `vendor/three.module.min.js` | Bundled three.js |
| `docs/HANDOFF.md` | Full project handoff: state, decisions, conflicts, next steps (with packaging errata at the top) |
| `docs/design/SST_Master_GDD_v1_1_Art_Audio_Complete.pdf` | The user's target GDD |
| `docs/design/early-drafts/` | Earlier AI-written design drafts (superseded) |
| `docs/qa/QA-REPORT.md` | QA and bug report, Rounds 1–11 (current) |
| `docs/qa/history/` | Older copy of the QA report, through Round 7 |
| `tests/headless/` | Node simulation tests |
| `tests/browser-qa/` | Playwright QA scripts |
| `PACKAGE_MANIFEST.md` | What was added, changed, omitted or excluded compared with the original source zip |

## Tests
### Headless simulation tests (Node)
Run from inside `tests/headless`; they import `../../js/`.

| Script | What it checks | Packaging run (2026-09-30, this package) |
|---|---|---|
| `t9c.mjs` | Determinism, and save → load → continue matching an uninterrupted run | Passed: `deterministic true`, `continuation true` |
| `twalk.mjs` | Full core tutorial plus 4 Maple lessons, with a mock UI | Passed: `done true day 5` |
| `t9f.mjs` | 365-day Maple soak plus scenario soaks | Ran, exit 0 (reports numbers; no pass/fail assertions) |
| `tp.mjs`, `tp2.mjs` | Market-pressure balance soaks (idle / absent / good / strategic) | Ran, exit 0 (reports numbers) |
| `tr.mjs` | Unit split renovation, career tier, rush build | Ran, exit 0 (split and rush behave as expected) |
| `tbal.mjs` | Round 12 balance check: idle / absent / good / strategic / pro bots. Set `DAYS=730` for two years. | Run, exit 0 (prints numbers; see QA report Round 12) |
| `tsc.mjs` | Round 12 scenario check: idle vs. fixer vs. manager vs. builder (`SC=turnaround` to limit) | Run, exit 0: idle loses Turnaround, builder wins on day 68 |
| `tclim.mjs`, `tvert.mjs` | Round 13 builder bots for Climate Boom and Go Vertical (`UPPERONLY=1` builds only upper-floor units; `NOCOMP=1` turns market pressure off) | Re-run 2026-10-02: Climate Boom won day 59. Go Vertical **lost** (deadline day 300, 25 upper units), and lost the same way on master `1d7b399`, so the earlier win no longer reproduces |
| `tfin.mjs` | Foundations: cash moves only through the ledger; billing a behind tenant raises their balance, not cash; rent roll = paying + past due; "owed to you" matches balances | All pass |
| `tcalm.mjs` | Foundations: a security notice comes 3+ days before any low-security break-in; break-ins hit dark units; story events are not critical; notices stop after two acknowledgements unless security worsens | All pass |
| `tsandbox.mjs` | Sandbox v1: Business vs Free Build, instant construction, Free Build funds and add-funds accounting, presets and cost multiplier, maintenance off, starter facility, goals, save/resume, mode labels | All pass |
| `tbugs.mjs` | Regression checks for the 2026-10-02 bug/stress/playtest pass (B1-B6: bad clean cell, carts for a non-corral, undo window, worn carts in a corral, crowd-capped visits, commissioning a pruned order) | All pass (2026-10-02) |
| `tfuzz.mjs [days] [seeds]` | Bug hunt: random valid and garbage actions in every mode with invariant checks after each (cash and ledger finite, lease/unit links, states, one owner, save round trip) | `365 3`: no issues after fixes (see `docs/qa/BUG-STRESS-PLAYTEST-2026-10-02.md`) |
| `../stress/tstress.mjs A\|B\|C [years]` | Stress: A = 550-unit lot at triple demand with 10 staff; B = 10-year Maple career; C = 3,000 build/cancel actions in one tick. Prints timing, array sizes and save size | See the 2026-10-02 report |
| `tdrama.mjs` | Round 14 story events: break-in and price-war frequency over 2 years, each choice's effect, auction contents | All pass |
| `tfix.mjs` | Round 13 fixes: pre-Round-11 tutorial save migration, climate-conversion renovation | All pass |
| `t9.mjs`, `t9b.mjs`, `t9d.mjs`, `t9e.mjs`, `dbg.mjs` | Round 9 era checks and debugging | Ran, exit 0. They're older and may print values without asserting anything. |
| `tv.mjs`, `tw.mjs` | Build-layout planners | **Need a JSON argument**. They exit 1 when run with none, so they aren't pass/fail tests. |

### Browser QA (Playwright, emulation only)
```bash
mkdir -p /tmp/shots                      # screenshots are written here (hard-coded)
python3 -m http.server 5173 &            # from the repo root (hard-coded URL in run.js)
cd tests/browser-qa && node run.js d s_r11.js   # d = 1280x800 desktop, m = 390x844 mobile touch emulation
```
- Chromium launches with SwiftShader software WebGL, so frame rates aren't meaningful.
- **Not re-run during packaging.** The last run (Round 11, `s_r11.js`, desktop and mobile) used identical game code and showed no page errors, no `undefined/NaN` text and no horizontal overflow.

## Testing status: what has and hasn't been verified
| Kind | Status |
|---|---|
| **Real iPhone / real Safari** | **Never tested.** Frame rate, battery, heat, audio after switching apps, share-sheet save and Add to Home Screen are all unverified on a device. |
| **Real players** | **No human playtests.** |
| **Browser emulation** | Many rounds of Playwright Chromium runs at desktop 1280×800 and phone viewports (390×844, 375×667; iPhone SE and iPhone 15 Pro profiles in earlier rounds). This is emulation, not a device. |
| **Headless simulation** | Determinism, continuation, the tutorial walkthrough and the soaks: see the table above. |
| **Live preview** | Autosave was confirmed working in the Perplexity preview in Round 7. The preview is private and wasn't re-checked during packaging. |

## Sandbox (v1, merged to `master` 2026-10-02, tag `playtest-1`)
- **Two kinds.**
  - Business sandbox (default): limited cash; construction costs money and takes time.
  - Free Build: unlimited funds and instant construction on by default. Every cost and rent payment is still recorded. Spending beyond cash is covered by "Free Build funds" and shown separately, never as income.
- **Property.** An empty lot (Suburban is the best tested; Urban and Rural are under Advanced) or a starter facility (the Maple Street layout: 23 units, 22 leased).
- **Difficulty presets** set four values: starting cash, demand, operating costs and wear.
  - Relaxed: $120k; demand ×1.3; costs ×0.8; wear ×0.5.
  - Standard: $60k; ×1; ×1; ×1.
  - Challenging: $35k; demand ×0.75; costs ×1.25; wear ×1.5.
- **Advanced settings:**
  - Market (empty lot only), cash, demand and operating costs.
  - Maintenance: Off means no new wear; existing damage stays repairable.
  - Starting staff: owner plus porter, starter facility only.
  - Company perks: earned or all unlocked. Building tools are never locked.
  - Instant construction.
- **Starts paused.** Speeds are Pause, 1x, 2x and 4x.
- **Optional goals**, each with a measurable definition:
  - 90% of rentable units leased, with at least 5 open.
  - A $3,000 operating result over 30 days: rent and fees minus operating costs, payroll, services and interest. Construction, loans and sandbox funds are excluded.
  - 40 units open.
  - 7 days with no repair or cleaning jobs.
  Play continues after a goal is met.
- **Business → Sandbox panel:**
  - Settings and the operating result.
  - Free Build funds used, or sandbox funds added.
  - Goal progress.
  - Controls: instant construction on or off, add $10k or $50k, switch to Free Build (one way).
  - A sandbox log, and a cash-shortage box showing what costs are driving the shortage, what still earns, and ways to recover.
- **Recorded overrides.** Added funds, instant construction and Free Build mark the save as Modified. Free Build, instant construction and added funds also show on the HUD and the Continue label.
- **Save code.** Sandbox settings live in `s.sb`. Saves without it (older Empty Lot and Creative saves) behave as before.
- **Not in v1:** starting date, starting occupancy, checkpoints, and an advanced testing panel.

## Known limitations
- **Untested on a real device**, and no human playtests (see above).
- **Tutorial scope question:** the tutorial was cut from 12 parts/74 steps to 8 parts/25 steps plus optional lessons. This may conflict with the user's earlier preference that a comprehensive tutorial is necessary. See `docs/HANDOFF.md` §16, C1.
- **Saves:**
  - Mid-tutorial saves from before Round 11 are moved to the matching part of the 8-part tutorial (tested headless with a synthetic save, not a real old save).
  - Autosave writes to browser storage (main slot plus the previous save as backup) on any normal host, including GitHub Pages. Verified in desktop Chromium on localhost; not yet on iPhone Safari.
  - The sandboxed Perplexity preview blocks browser storage, so there autosave still uses the save server. On public hosts (any hostname other than localhost) the save server is switched off entirely.
  - New game and Load never silently replace a game: New game asks first, and the replaced game is kept in a separate "previous game" slot (browser storage only) that autosave never writes. Restore it from the title screen or the menu.
  - The build name (`js/version.js`) shows on the title screen and in the menu, and is stored in save metadata.
- **Economy (Round 13):** idle play declines (Maple: about 45% occupancy by the end of year 1, cash flat to slightly falling in year 2), and grades separate play styles. The numbers come from simple bots, not people. All three scenarios were won by a building bot with the rival on. A staffed Maple loses money.
- **Unverified features:** the career-tier sync (it runs in the browser only).
- **Polish issues:** the HUD showed "Day 1" in a QA run that had stepped the simulation manually (unclear whether that's a harness artifact); competitors don't appear on the map; tapping a pin cluster opens only the first object.
- **Limits:** at most 5 properties.
- **External:** the fonts depend on the Fontshare CDN.

See `docs/HANDOFF.md` §7 for the full list.

## Publishing
Nothing has been published. Before any public release, the user wanted a real-iPhone check and playtests. Any static host works for the game itself; autosave needs the save server or a replacement.
