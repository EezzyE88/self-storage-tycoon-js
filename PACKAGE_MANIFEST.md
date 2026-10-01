# Package manifest

This file records how this GitHub-ready package was assembled and how it differs from the original.

- **Prepared:** 2026-09-30, about 7:00 PM PDT.
- **Original compared against:** `Self-Storage-Tycoon-Full-Source.zip` (Perplexity asset `2a9d4373-f052-42aa-848d-3ec1999c1f69`), the full-source zip delivered just before this package. Its top folder is `Self-Storage-Tycoon/`.
- **Also checked against:** the working repository it came from (`/home/user/workspace/sst` in the Perplexity sandbox). Its working tree was clean at `a823f49`.

## 1. Game code and assets: unchanged
- **All 21 tracked game files are byte-identical** to commit `a823f49` and to the original zip. `git diff a823f49 HEAD` touches only the packaging files listed in section 2.
- **Gameplay, behavior and assets:** not modified.
- **Git history is preserved.** All objects and refs were copied as-is: 6 commits on `master`, plus the unreferenced stash commit `e352a90` ("WIP on master: 5550d8f baseline").
- **Packaging commit:** one commit was added on top. It adds only documentation and tests.
- **Remotes:** none are configured, and no remote repository was created.
- **`.git/index`:** it differs from the original zip only in its cached file timestamps (stat data), not in its content.

| Tracked file | Bytes | SHA-256 (first 16 hex) |
|---|---|---|
| `.gitignore` | 14 | `4660dbaf15f8f0f1` |
| `css/game.css` | 47667 | `f50296befae6ed8b` |
| `icon-180.png` | 1083 | `1dcb24ded34fae13` |
| `icon-512.png` | 3645 | `352f59f1fbf73f64` |
| `index.html` | 13822 | `99d9968048687541` |
| `js/audio.js` | 13264 | `d74dc3ff966b027e` |
| `js/cloud.js` | 2147 | `88f3821efb49084a` |
| `js/data.js` | 10104 | `4dfba5c9b2e4b229` |
| `js/fx.js` | 6726 | `5fc2f184b9137262` |
| `js/main.js` | 26033 | `5bffc78601191f6b` |
| `js/maple.js` | 6112 | `2d1593e8512d5a46` |
| `js/post.js` | 6068 | `4930e21fd5afc935` |
| `js/render.js` | 66021 | `78a780a41d07b996` |
| `js/scenarios.js` | 6790 | `7b559f3d1f327425` |
| `js/showcase.js` | 35602 | `ed4de762f79e5df2` |
| `js/sim.js` | 162742 | `7ceaedfe205ee94a` |
| `js/tutorial.js` | 31353 | `9d204567760a5b4b` |
| `js/ui.js` | 122770 | `7850114475848c3c` |
| `manifest.webmanifest` | 362 | `4849cb05e6839c71` |
| `server/save_server.py` | 2183 | `89123c59ac1a170f` |
| `vendor/three.module.min.js` | 691648 | `08fd7545d13d2c7f` |

## 2. Changes compared with the original zip

### Added
| File | Source |
|---|---|
| `PACKAGE_MANIFEST.md` | New (this file) |
| `docs/design/SST_Master_GDD_v1_1_Art_Audio_Complete.pdf` (3,404,385 bytes, SHA-256 starts `5155d0016f8e611d`) | The user's uploaded GDD. It's identical to the copy attached in the earlier session. |
| `docs/design/early-drafts/self_storage_tycoon_gdd.md`, `self_storage_tycoon_first_facility_gdd_v02.md`, `self_storage_tycoon_gdd_v03.md` | AI-written design drafts from session 699e08ce (2026-09-27). **Superseded** by the Master GDD. In v02 the tutorial was cut to 4 beats; the user rejected that, and v03 restored an 8-stage tutorial. |
| `docs/qa/history/QA-Report-through-Round7-session-0800785e.md` | Older QA report copy, Rounds 1–7, from session 0800785e. Kept for history; the current report already contains these rounds. |

### Changed
| File | Change |
|---|---|
| `README.md` | Replaced. Adds exact run instructions, dependencies, save-server setup, known limitations, and testing status (emulation vs. device). It also **corrects the original README**: that README said local autosave is offline and told you to edit `RAW`; in fact `js/cloud.js` already falls back to `http://localhost:8000`. |
| `docs/HANDOFF.md` (was `docs/SST-Handoff-for-ChatGPT.md`) | Renamed. A dated **errata block** was added at the top. The body is unchanged. |

### Moved or renamed (content unchanged unless noted)
| Original path | New path | Note |
|---|---|---|
| `docs/Self-Storage-Tycoon-QA-Report.md` | `docs/qa/QA-REPORT.md` | Byte-identical |
| `dev/tests/browser-qa/*` (21 files) | `tests/browser-qa/*` | Byte-identical |
| `dev/tests/headless/*.mjs` (13 files) | `tests/headless/*.mjs` | **Import paths only:** `'../../../js/'` became `'../../js/'` to match the new depth. No other edits. |

### Omitted (not in this package)
| Item | Reason |
|---|---|
| `server/saves/` contents (one local test save file) | Save data is excluded; the folder is git-ignored and the server recreates it |
| User-uploaded comparison screenshots `IMG_2933/2934/2938/2941/2942/2947.jpeg` | They show **other builds**, not this project (possibly related to the user's separate project). Left out to keep this JavaScript project separate. One also shows part of a deployment hostname. Available separately in the Perplexity thread. |
| The 2D HTML prototype `Maple-Street-Storage-Tycoon.html` | Superseded; the user said "Disregard prior to GDD" |
| `sst-dist/` (deploy bundle), `Self-Storage-Tycoon.zip` (Round 11 game-only zip), the Full-Source zip itself | Duplicates of these same files |
| QA screenshots (`/tmp/shots/*.png`) | Temporary sandbox output |
| Perplexity session transcripts, memory and skill files | Platform data, not project source |

## 3. Exclusions and secrets check
- **Credentials:** none found. I scanned all files (except the vendored three.js) and the full git history for API keys, tokens, passwords, private keys and common key prefixes. Nothing matched, so nothing had to be removed.
- **Personal save data:** excluded (see above).
- **Temporary files:** excluded. No `__pycache__`, `.DS_Store` or `*.tmp` files are present.
- **Identity details that remain** (not secrets):
  - The placeholder git author `agent <a@b.c>` on the existing commits.
  - In `docs/HANDOFF.md`, the Vercel account handle that the deploy attempt reported.
  - In `index.html`, a list of allowed Perplexity host origins for the preview iframe bridge.

## 4. Source version evidence
- **Version:** HEAD of game history is `a823f496c12bb503b53ba26c913b9dd34b93fcd6`, committed 2026-10-01 01:37:22 UTC. This is the build behind the latest Perplexity preview deploy; the live preview wasn't re-checked during packaging.
- **Earlier history:** `5550d8f` "baseline" is the Round 7 zip imported at the start of the current workspace.
  - Rounds 1–7 have **no** git history here.
  - Commit `7af2a1a`, named in the QA report, is **not** in this repository.

## 5. Verification done while packaging
- **Headless tests, run from this package's `tests/headless`:**
  - `t9c.mjs`: deterministic true, continuation true.
  - `twalk.mjs`: done true, day 5.
  - `t9f`, `tp`, `tp2`, `tr`, `t9`, `t9b`, `t9d`, `t9e`, `dbg` all exited 0.
  - `tv`/`tw` need a JSON argument and exit 1 without one.
- **Git:** `git fsck` passed; the only note was the dangling stash commit.
- **Browser QA:** not re-run during packaging. The game code is identical to the code last tested in Round 11.
- **Real device:** **no real-device testing has ever been done.**

## 6. Missing materials
- **Rounds 1–7:** their git history (from an earlier workspace) is unavailable.
- **The live preview** (https://www.perplexity.ai/computer/a/self-storage-tycoon-Y4XvxXMKQCijEnYwjb1qTg): private to the user's Perplexity account. Its autosave depends on a save server running in the Perplexity sandbox.
- **`sst-bug-report.md`:** an earlier report name mentioned in older messages. Not available; its content appears to be carried in the QA report.
- **Results from real iPhones and human playtests:** none exist.
- **The user's C++ project:** intentionally not included, referenced or merged.
- **Licensing:** no license file was chosen for this project. three.js keeps its own MIT license header in `vendor/three.module.min.js`. The user should choose a license before publishing the repository.
