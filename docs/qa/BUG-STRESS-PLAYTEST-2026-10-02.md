# Bug Test, Stress Test and Playtest Report

Build `sandbox-1.1`. Tested on branch `work/sandbox`, then merged to `master` as tag `playtest-1`. Date: 2026-10-02.

All testing was automated: headless simulation in Node, and Chromium with iPhone-size touch emulation (390 x 844) and desktop (1280 x 800) using software WebGL. No real iPhone and no human players were involved. Frame rates in emulation aren't meaningful, so performance numbers below are simulation CPU time only.

## Summary

| Pass | What ran | Found | Fixed |
|---|---|---|---|
| Bug test | Random-action fuzzer over 11 game modes; UI tap fuzzer on phone and desktop | 4 bugs (1 crash) | 4 |
| Stress test | 550-unit lot at triple demand for 3 years; 10-year career; 3,000 actions in one tick | 2 bugs (unbounded queue, cart pile-up) | 2 |
| Playtest | A new-player journey on the empty lot using real taps and drags, phone size | 1 bug that blocks opening; 4 friction points | 1 + 4 |
| Go Vertical | Investigated why the test bot lost | Bot strategy, not a game bug | Test bot updated |

Seven bugs and four friction points were fixed. Each bug fix has a regression check in `tests/headless/tbugs.mjs`. All the earlier tests still pass.

## 1. Bug test

### Method
- **`tests/headless/tfuzz.mjs`**: random actions across 11 game modes:
  - Maple tutorial and Maple career
  - Turnaround, Go Vertical and Climate Boom
  - Business sandbox (empty lot, starter facility, Challenging on the urban lot) and Free Build
- About 45% of the actions are build drags with random tools, rectangles and floors. The rest are every other player action, given a mix of valid ids and bad values (NaN, negative numbers, huge numbers, strings, missing ids).
- **Checks after every action and every game day:**
  - nothing throws
  - cash, the ledger and the day totals stay finite
  - every unit points to a real lease and back
  - unit states are known
  - there is exactly one owner
  - action messages contain no "undefined" or "NaN"
  - a save round trip every 30 days loads and keeps running
- **`tests/browser-qa/s_uifuzz.js`**: random taps on every visible button and on the map, plus random time skips, in 4 modes. It records page errors and any "undefined", "NaN", "[object Object]" or "Infinity" shown on screen.

### Results
| Run | Actions | Distinct issues |
|---|---|---|
| Before fixes: 40 days x 1 seed | 1,059 | 17, from 3 causes |
| After fixes: 365 days x 3 seeds (33 game-years) | 178,151 | 0 |
| UI fuzz on phone, before the clipboard fix | 648 taps | 0 page errors, 0 bad text |
| UI fuzz on phone, final code | 594 taps | 0 page errors, 0 bad text |
| UI fuzz on desktop, before the clipboard fix | 441 taps | 3 page errors, 1 cause (BUG-06) |
| UI fuzz on desktop, final code | 355 taps | 0 page errors, 0 bad text |

### Bugs found and fixed
| ID | Severity | Bug | Cause | Fix |
|---|---|---|---|---|
| BUG-01 | High (crash, and the save stays broken) | An owner cleaning job on a floor or cell that doesn't exist crashed the game. The broken job was then saved, so every later tick crashed, including after reloading. | `act_ownerClean` didn't check its input. | The input is now checked. When a save loads, any job pointing at a floor that doesn't exist is removed, which repairs already-broken saves. |
| BUG-02 | Low | "Buy carts" sent with a non-corral object id was accepted. It produced "50 carts delivered to undefined" and carts with no real corral. | Only "is it operating" was checked, not "is it a corral". | Only corrals are accepted. |
| BUG-03 | Medium (money) | The build preview promises "Undo within 30 min is a full refund". In fact only the most recent order got a full refund. Cancelling an earlier order placed seconds before refunded 60%. | Undo was tied to `lastCommit` (the most recent order only). | Any order placed within the last 30 game-minutes gets a full refund. Later cancellations are unchanged: 60% of the unbuilt share. |
| BUG-06 | Medium | Copying a save code when clipboard permission is denied (common on iOS) left an unhandled error and still said "Save code copied". | The clipboard promise was never awaited. | It falls back to the device copy command, and says "copied" only when copying worked. Otherwise it tells you to copy the selected text yourself. |

The two stress bugs (BUG-04 and BUG-05) and the playtest bug (BUG-07) are in the sections below.

Reachability: BUG-01 and BUG-02 need actions the current interface doesn't send (the UI fuzzer never triggered them). They matter for edited or imported save codes and for future interface changes. Players could hit BUG-03 and BUG-06 through normal use.

## 2. Stress test

### Method (`tests/stress/tstress.mjs`)
- **A. Densest lot:**
  - Free Build, empty lot filled with 550 drive-up units (525 can rent)
  - 3x demand, 10 staff, 3 game-years
  - logged every 90 days: CPU time per game-day, save size, save and load time, and the size of every growing list
- **B. Long career:** Maple Street for 10 game-years, with the owner taking every job and accepting the first option of every prompt.
- **C. Action burst:** 3,000 build and cancel actions in a single tick, then a check that cash still matches the ledger.

For scale: one game-day is 60 real seconds at 1x and 15 seconds at 4x.

### Bugs found and fixed
| ID | Severity | Bug | Evidence (before → after) | Fix |
|---|---|---|---|---|
| BUG-05 | High at large sizes | Above the 60-customer crowd limit, every routine visit was pushed back 30 minutes, forever. The visit queue never stopped growing. | Test A at day 1,096: queue 31,886 → 86 visits. Save 2,307 KB → 537 KB. Worst game-day 2,665 ms → 251 ms, measured on a quiet machine. | Routine visits over the crowd limit now happen off-screen and are counted in `s.offscreen`. Move-ins, move-outs and shoppers still wait their turn. |
| BUG-04 | Medium (money) | Worn-out carts returned to a corral were never repaired and could never be used. The corral looked empty, so customers kept asking for carts and players kept buying them. | 2-year Maple run: 27 of 31 carts unusable and 14 purchases ($2,520) → 0 unusable and 1 purchase. 10-year run: 133 carts → 5. | Worn carts in a corral now get a "Repair damaged cart" job, like carts left elsewhere. |

The cart change slightly shifts the 12-month balance bots:

| Bot | Cash before | Cash after |
|---|---|---|
| idle | $31,260 | $29,277 |
| good | $41,016 | $42,350 |
| strategic | $38,569 | $39,105 |

### Results after fixes
| Test | Result |
|---|---|
| A: 550 units, 3 years | Peaked at 525 leases, 71 people and 61 vehicles on screen. Save peaked at 537 KB. Saving takes 2-9 ms and loading 4-35 ms. Worst game-day was 251 ms of CPU on a quiet machine (682 ms while browser tests ran at the same time), against 15 s of real time at 4x. |
| B: 10-year career | Save stays at 89-92 KB. Carts stay at 5. All tracked lists stay flat. |
| C: 3,000 actions in one tick | 0.16-0.47 ms per action. Cash matched the ledger exactly ($248,250). Five game-days later it was still running normally. |
| Browser storage | Three copies are kept (main, backup and the previous game). At the 537 KB peak that's about 1.6 MB, under the usual 5 MB browser limit. A lot this size on Safari hasn't been tested. |

## 3. Playtest

### Method
`tests/browser-qa/s_play_sb.js`, phone size. It plays a new player's first session on a Business sandbox using real taps and drags on the map. There are no shortcuts into the game state except for reading values.

1. Title → Sandbox → Business, Standard, Empty lot → Start.
2. Draw two drive aisles, a gate, an office, 8 10x10 and 13 5x10 drive-up units, two lights and a camera.
3. Run at 4x, following the on-screen hint at each step until the facility is open.
4. Play to day 35.

### Bug found and fixed
| ID | Severity | Bug | Fix |
|---|---|---|---|
| BUG-07 | High (blocks opening) | "Commission whole order" did nothing once the order was more than 3 days old and any other order had finished. Finished orders are removed after 3 days, and the button looked up the removed record. In the playtest the player was stuck with 13 units that couldn't be commissioned and the property couldn't open. | Commissioning by order now falls back to the units that carry that order id. |

### Friction points fixed
| ID | Before | After |
|---|---|---|
| PT-01 | The hint said "Not open for business yet. See what is missing." | The hint names the first blocker, for example "Not open yet: office door has no customer route ... (+1 more). Tap for the checklist." When everything is in place it says "Ready to open". |
| PT-02 | The opening checklist was plain text, so you had to work out which tool or unit fixes each item. | Each item has a button: Place a gate, Place an office, Pave a walkway (opens the Walkway tool), Commission N ready, Build units. |
| PT-03 | On a phone the checklist sat below Operator career, off-screen. | Before opening, the checklist is the first section of Growth. |
| PT-04 | Several orders meant commissioning one order at a time. | The unit sheet has "Commission all N ready units" when other orders are also ready. |
| PT-05 | The first aisle on an empty lot warned "Not connected to an existing drive aisle", but no aisle can exist yet. | Before any gate exists it says "Not connected yet - add an Entrance Gate where this aisle meets the street." |

### Journey result after fixes
- Opened on day 4. By day 35 all 21 units were leased.
- Cash $28,606 out of the $60,000 start; about $31,400 went on construction.
- Operating result over the last 30 days: +$1,621.
- No page errors.

### Observations not changed (they need a design decision or real players)
- **Standard may be easy.** The empty-lot Business sandbox filled all 21 units in about 30 days. That's one run with one layout, so it's a question for real players, not a conclusion.
- **Office placement.** The office is centred on the tap, so its door can end up facing grass. The preview warns about this, and PT-02 now gives a fix button, but placement itself is unchanged.
- **Building tools stay selected after Confirm.** That suits drawing several rows. To pick another tool you tap X first, and a new player may not know that.
- **A grade F report before opening.** A player who hasn't opened by day 31 gets a "Month 1 report card: grade F". The run where commissioning was broken showed this. Consider skipping the grade until the property opens.

## 4. Go Vertical investigation

The scenario is winnable. The test bot's layout stopped working, not the game.

| Test-bot layout | Result |
|---|---|
| All 5x5 on both floors (the old test plan) | Lost on day 301 with 25 of 40 upper units leased |
| 5x10 ground floor, 5x5 upper floor | Won on day 169 |
| 5x10 on both floors | Lost on day 301 with 26 upper units leased |
| 5x5 ground floor, 5x10 upper floor (the new default) | Won on day 127, and again on day 110 in the final run |

- **Why the old plan lost:** in the urban market, 5x10 is the size most in demand. Most lost shoppers in the old run wanted a 5x10, 10x10 or 10x20.
- **Why it used to win:** the old plan probably won before Round 14 added rival price wars. That isn't confirmed.
- `tvert.mjs` now builds 5x10 upstairs by default. `ALL5X5=1` restores the old plan.

## 5. Regression results (final code)

| Test | Result |
|---|---|
| tbugs (new) | All 6 checks pass. Run against the old `sim.js`, B1 crashes as expected. |
| tsandbox, tfin, tfix, tcalm, tdrama | All pass |
| t9c | Deterministic, and save → load → continue matches an uninterrupted run |
| twalk | Tutorial done on day 5 |
| tbal | idle $29,277 · good $42,350 · strategic $39,105, all 12 months |
| tsc | The Turnaround builder still wins on day 40. The general-purpose bots still lose Go Vertical and Climate Boom, as before, because they don't build. |
| tclim | Won on day 68 |
| tvert | Won on day 110 |
| tfuzz, 365 days x 3 seeds | 178,151 actions, no issues |
| Browser, phone size | s_play_sb, s_sandbox, s_found, s_found2, s_hud and s_r14 run with no page errors. The phone top bar fits: the rightmost element ends at 382 px on a 390 px screen. s_found's "Failed to fetch" comes from the test's save server being off, as before. |
| Browser, desktop | s_sandbox has no errors |
| UI fuzz, final code | Phone: 594 taps, 0 page errors, 0 bad text. Desktop: 355 taps, 0 page errors (BUG-06 no longer appears), 0 bad text. |

## 6. Files changed
| File | Change |
|---|---|
| `js/sim.js` | BUG-01, 02, 03, 04, 05 and 07 fixes, save repair, and the PT-05 message |
| `js/ui.js` | BUG-06; PT-01 to PT-04; the `goTool` action |
| `js/version.js` | Build `sandbox-1.1` |
| `tests/headless/tbugs.mjs` | New regression checks |
| `tests/headless/tfuzz.mjs` | New random-action fuzzer |
| `tests/stress/tstress.mjs`, `tests/stress/maxlot.mjs` | New stress tests |
| `tests/browser-qa/s_uifuzz.js`, `tests/browser-qa/s_play_sb.js` | New browser bug hunt and playtest |
| `tests/headless/tvert.mjs` | Smarter default layout |
| `README.md` | Test table rows |

## 7. Still open
- A real iPhone check of everything above, especially: copying the save code on iOS (BUG-06), checklist buttons on a small screen, and a 500+ unit lot on a phone CPU.
- Whether Standard is too easy (needs real players).
- Office placement, keeping build tools selected, and the grade F before opening (design decisions).
- Older known issues are unchanged:
  - rivals aren't shown on the map
  - tapping a group of pins opens only the first
  - a maximum of 5 properties
  - fonts load from the Fontshare CDN
  - no license
- The tutorial-length question (C1) is unresolved.
