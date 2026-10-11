# Self Storage Tycoon current project handoff

Updated 2026-10-10, America/Los_Angeles. Use ONLY `EezzyE88/self-storage-tycoon-js`.

## Current state takes precedence

The user approved a fast-forward-only merge of accepted game-source commit `b2faa4baa8da8d470e142480ef9229485a73b46b` into master. This documentation-only follow-up advances master without changing that runtime. Branch `candidate/yard-view-20261010` and the unchanged Safari preview retain that game source.

Preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

Build: `bplus-yard-view-candidate-41`. No republication or user-save access/modification accompanies this update. The preview manifest's old accepted-master field is historical publication provenance.

Read [CURRENT-STATUS.md](CURRENT-STATUS.md) first for the complete current acceptance assessment, evidence boundaries and next milestone. The game's accepted source supports three playable floors and a five-property portfolio. JavaScript is authoritative; do not import legacy C++ project instructions.

Physical user-reported evidence now includes Candidate 37 rescue acknowledgement/career/history/persistence PASS; Candidate 39 Ambience-only app switching with "No noise"; deliberate Candidate 40 building and extension save continuity; a preferred two-unit door-and-aisle preview; a separate later 25/25 leased run from the 23-unit fixture; and operation through Day 45 with repairs, cart demand, overdue rent and completed rescue history visible. Do not conflate separate loaded runs or infer exact commissioning actions, enjoyment, card-spacing acceptance or physical Return to placement preservation. Latest screenshots have no build identifier.

Candidate 41's broad pre-review HOLD is superseded by the focused merge-readiness assessment and the user's explicit merge approval. Automated/source success is not blanket physical acceptance. Dense Safari performance and organic long-term company progression remain open; the minor presentation details are not automatic merge blockers.

Next proposed gameplay milestone: **run the expanded yard with staff and fund its next justified improvement**, using existing mechanics first. No new implementation or economy tuning is authorized by this handoff. The targeted dense-Safari performance check is separate.

## Historical handoff retained below

The following September record is preserved for provenance. Its source refs, deployment state, prices, testing status, next steps and statements such as "single source of project state" are historical, not current instructions. Where they conflict, the current notice and CURRENT-STATUS.md take precedence. Do not resurrect an old unresolved item without checking present source/evidence.

# Self Storage Tycoon: Complete Project Handoff

> **Errata added during GitHub packaging (2026-09-30, 7:00 PM PDT).** I re-checked the source while packaging. These corrections take precedence over the text below; the rest of this handoff is unchanged.
> 1. **Local autosave address:** `js/cloud.js` falls back to `http://localhost:8000` when the `__PORT_8000__` placeholder hasn't been rewritten. The statements that local autosave is "UNKNOWN", or "offline" (the earlier Full-Source README), are wrong.
> 2. **Local autosave identity:** outside the Perplexity host, a random client id is generated on each page load unless the URL has `?cid=<name>`. A save made locally without `?cid=` therefore won't be found by Continue after a reload. This comes from reading the source; I didn't test it.
> 3. **Save storage:** the save server stores one JSON file per visitor in `server/saves/`. It doesn't use SQLite, despite what the QA report's Round 7 section says.
> 4. **Comparison screenshots (viewed during packaging):** `IMG_2933`, `IMG_2934` and `IMG_2947` show the dark build, hosted on a vercel.app address. `IMG_2938`, `IMG_2941` and `IMG_2942` show the light "Maple Street" build. All six are iPhone screenshots of the *other* builds; none show this project.
> 5. **Git details:** the branch is `master`. The repository also contains an unreferenced stash commit, `e352a90` ("WIP on master: 5550d8f baseline"). The commit author identity is a placeholder (`agent <a@b.c>`).
> 6. **External dependency:** fonts load from the Fontshare CDN; without a network connection, system fonts are used instead. three.js is bundled locally (the file contains a revision string of "170", so it's probably r170; I haven't confirmed this).


Prepared 2026-09-30, 6:39 PM PDT (2026-10-01 01:39 UTC), by the previous AI (Perplexity Computer). Use this document as the single source of project state. No new work was done while writing it.

**Evidence labels used throughout**
- **VERIFIED:** observed directly in code, test output or screenshots during the work. "VERIFIED (emulation)" means checked in desktop Chromium/Playwright with iPhone-sized viewports. It is never a real device.
- **USER-ACCEPTED:** the user explicitly asked for it or approved it.
- **CANDIDATE:** built, but not yet confirmed by the user or by real-world testing.
- **PROPOSED:** suggested only. Not built, or not approved.
- **INFERRED:** my reasoning, not directly observed.
- **UNKNOWN:** missing or impossible to determine from what's available.

---

## 1. Project goal and current objective

**Goal (USER-ACCEPTED):** build the game described by the user's design document, **"Self Storage Tycoon — Master GDD v1.1 (Art + Audio Complete)"** (file `SST_Master_GDD_v1_1_Art_Audio_Complete.pdf`).
- It is a 3D tycoon/management sim about building, running and growing self-storage facilities.
- Core loop: **LAYOUT → OPERATIONS → ECONOMICS → GROWTH**. The property itself is the game board.
- Art target: "Warm, readable, stylized 3D realism with miniature-diorama clarity."
- **Primary platform: iPhone Safari (USER-ACCEPTED).** Desktop also works.

**Current objective:** Round 11 ("Implement recommendations", carrying out the director review's top 5) is **finished and deployed as a preview (CANDIDATE)**.
- The last thing the AI did was give the user its final summary and offer next steps: keep iterating, publish, deploy via Vercel, or Share with "Allow remix".
- **The user has not responded to Round 11 yet.** This handoff is the next user request.

---

## 2. Everything completed so far (chronological)

### Session 699e08ce (2026-09-27): design only, no code
- Five team roles were discussed, then the AI drafted the GDD (`self_storage_tycoon_gdd.md`) and reviewed it honestly.
- On the user's "Implement", the AI wrote a first-facility GDD (`self_storage_tycoon_first_facility_gdd_v02.md`) that **cut the tutorial to 4 beats**.
- **The user rejected that cut: "The over packed tutorial is necessary."** The AI restored an 8-stage tutorial in `self_storage_tycoon_gdd_v03.md`.
- The user's own Master GDD v1.1 PDF later became the target specification.

### Session 0800785e (2026-09-30, 06:23–20:00 UTC)
1. **2D HTML prototype ("Maple Street Storage Tycoon").** The user pasted a prototype; the AI fixed it and published a preview at https://www.perplexity.ai/computer/a/maple-street-storage-tycoon-5BNbv.ZgTraxL9jq9kOvxw. Status: **SUPERSEDED.** The user said "Disregard prior to GDD."
2. **"Read entirely"** (the GDD): the AI listed where the 2D prototype conflicts with the GDD.
3. **"Build the game it describes"** produced the 3D JS/three.js game:
   - Tutorial, empty lot and creative mode.
   - Staged construction and commissioning.
   - Drive-up and interior units, HVAC/climate, two floors with an elevator, carts, lights, cameras, keypads.
   - Staff, tasks, prospects and leases.
4. **Bug test.** It found 2 critical, 7 major and 14 minor issues (stuck staff, an owner-task crash, and others).
5. **"Implement fixes":** every critical and major issue and 12 of 14 minor ones were fixed. This added the "Owner handles chores" policy, low-cash warnings, a credit line, and staff working a 7:00–20:00 shift.
6. **"Continue implementing"** added power capacity and load shedding, stairs, water/restroom/fountain and the comfort score, rent reviews, the Manager role ($120/day), three scenarios (Maple Turnaround, Go Vertical, Climate Boom), a custom sandbox, multiple properties (cap of 5) and a pre-build cash/power readout.
7. **Round 3 browser QA:** 9 issues found and fixed.
8. **Round 4, iPhone optimization:**
   - Landscape layout and fixes for small screens.
   - Safari behavior: page zoom blocked, audio unlock, the app pauses when hidden.
   - Saving through the share sheet, an A2HS (Add to Home Screen) icon and manifest.
   - Phones skip anti-aliasing (AA) and use a smaller shadow map; the scene recovers from WebGL context loss.
9. **"Publish ..."** The AI prepared a publish, **but the user said "Don't publish yet. Implement fixes and recommendations"** and then declined the approval request.
   - Round 5 hardening: XSS-safe save loading, save validation, three.js bundled locally, a Content Security Policy (CSP), and developer notes removed.
10. **"Compare these to yours"** (the user uploaded screenshots of two other builds). The comparison is in §9. **The user said "Build all seven iPhone improvements"**, which became Round 6.
11. **Vercel deploy attempt: FAILED.**
    - The connector is signed in as `f6z2c5hrz6-3692` but returns "No scopes available" and an empty team list. It was reconnected once with the same result.
    - The AI explained the GitHub → Vercel import path. **No GitHub repo was created.**
12. **"Preview public link"** opened a publish approval, and **the user cancelled it ("Canceled website publication.").**
13. **"Is the game ready for release?"** The AI answered: not yet, it's a beta.
14. **"Implement suggestions and improvements"** became Round 7:
    - Autosave through a small save server.
    - Adaptive graphics quality (Auto/High/Medium/Low), a battery saver, idle redraw at about 4 fps.
    - Animated restroom trips.
    - Acquired facilities with unique names and mirrored layouts.

### Current session 9012332f (2026-09-30 21:08 UTC → 2026-10-01 01:39 UTC)
15. **"...now wow me"** became Round 8, Showcase, which is presentation-only:
    - Living title screen, miniature tilt-shift lens with night bloom, photo mode, follow cam, cinematic tour.
    - Celebrations, an adaptive score, night headlight pools and rain effects.
16. **(GDD PDF attached) "Continue implementing"** became Round 9:
    - The collections ladder and auctions.
    - Term loans and the operating statement.
    - Five new conversation types, with automation by the Clerk or Manager.
    - New mastery milestones.
17. **"The tutorial should be more detailed and informative..."** became Round 10: a guided tutorial of 12 parts and 74 steps, with a coach ring, menu-path guidance, auto-pan, "Why this matters" and part banners.
18. **"You're the game director. Review and evaluate, be honest. Top 5 recommendations"** produced the review (§9).
19. **"Implement recommendations"** became Round 11 (§4 and §5). It was deployed to the same preview URL, and the zip and report were shared.

---

## 3. Decisions already made

| # | Decision | Status | Notes |
|---|---|---|---|
| D1 | Build from Master GDD v1.1; ignore everything before it (the 2D HTML prototype) | USER-ACCEPTED ("Disregard prior to GDD", "Build the game it describes") | Don't reopen. |
| D2 | iPhone Safari is the primary target | USER-ACCEPTED (iPhone optimization requests, "code the game to open in Safari") | Don't reopen. |
| D3 | **Do not publish** to a public `pplx.app` link without an explicit new request | USER-ACCEPTED (declined twice: "Don't publish yet…", "Canceled website publication.") | Keep honoring this. Preview-only updates are fine. |
| D4 | All seven iPhone improvements from the build comparison | USER-ACCEPTED ("Build all seven iPhone improvements"), built in Round 6 | Don't remove them. |
| D5 | Tutorial must be detailed: exact taps, which menu, ring on the control | USER-ACCEPTED (Round 10 request; also saved to memory) | See conflict C1. |
| D6 | An "overpacked" (comprehensive) tutorial is necessary | USER-ACCEPTED (2026-09-27: "The over packed tutorial is necessary") | **Conflicts with Round 11's tutorial cut (C1).** |
| D7 | Implement the director review's top 5 | USER-ACCEPTED ("Implement recommendations") | Done in Round 11, which included cutting the core tutorial. |
| D8 | The simulation is authoritative and deterministic. Presentation never invents outcomes. | USER-ACCEPTED (GDD rule), and VERIFIED by tests every round | Don't change. |
| D9 | No time pressure: Pause/1x/2x/4x always available | GDD rule, implemented | Don't change. |
| D10 | Saves: autosave server, plus save codes and `.sst` files as backups | USER-ACCEPTED (Round 7 request) | |
| D11 | Market pressure is off in the tutorial (until graduation), in creative mode and in authored scenarios | AI design decision in Round 11 (CANDIDATE) | So scenario balance doesn't change. Can be revisited. |
| D12 | Portfolio limited to 5 properties | AI decision (CANDIDATE) | |

---

## 4. Current implementation and design state

### Technology (VERIFIED)
- Plain ES modules with no build step. three.js is bundled at `vendor/three.module.min.js`. Served as static files.
- **The simulation is JavaScript** (`js/sim.js`).
  - The GDD's phrase "C++ gameplay authority" does **not** match reality: there is no C++ code. See conflict C2.
  - The QA report's Round 8 section says "C++-derived sim"; that wording is inaccurate.
- Deterministic RNG: mulberry32, with its state stored in the save (`s.rngS`).
- **1x speed = 24 ticks per second = one game day per real minute.** One tick is one game minute (`MIN_PER_DAY = 1440`).

### File map (repo `/home/user/workspace/sst`; line counts at commit a823f49)

| File | Lines | Role |
|---|---|---|
| `index.html` | 359 | Shell, CSP, HUD markup |
| `css/game.css` | 502 | All styles, including the Round 11 additions at the end |
| `js/data.js` | 163 | Tuning data: SIZES, MARKETS, TOOLS, ROLES, OPEX, WORK, POWER, TIERS |
| `js/sim.js` | 2353 | Authoritative simulation: state, actions (`act_*`), tick, economy, market pressure, collections, loans, conversations, tasks, agents |
| `js/tutorial.js` | 264 | BEATS (core tutorial), LESSONS (optional), stepState, unlocks, lessonTick |
| `js/ui.js` | 1150 | DOM UI: sheets (Build/Operate/Business/Growth), inspector, tutorial card, coach bar, pins, labels, feed |
| `js/main.js` | 349 | Game bootstrap, company (multiple properties), offers/acquire/transfer, stepping, tier sync, adaptive quality, autosave |
| `js/render.js` | 878 | three.js diorama renderer, camera, overlays, previews |
| `js/showcase.js` | 435 | Presentation layer: title attract, lens, photo mode, follow cam, tour, celebrations, pops |
| `js/maple.js` | 87 | Maple Street starting property (23 units) |
| `js/scenarios.js` | 117 | Three scenarios |
| `js/audio.js`, `fx.js`, `post.js`, `cloud.js` | — | Sound, effects, post-processing, autosave client (`RAW='__PORT_8000__'`) |
| `server/save_server.py` | 38 | Autosave server (stdlib + SQLite), port 8000 |
| `manifest.webmanifest`, `icon-180.png`, `icon-512.png` | — | Add to Home Screen |

---

## 5. Established features, systems, rules and behaviors (by category)

### 5A. Simulation and gameplay systems (VERIFIED in code and headless tests unless marked)
- **Construction:** drag-to-build with a live preview showing status (valid, incomplete with reasons, invalid with reasons).
  - It also shows cost, cash after the build, days of costs covered, and power.
  - Construction is staged and units must be commissioned. Undo within 30 minutes is a full refund; later cancellation refunds 60% of the unbuilt share.
- **Units:** sizes 5x5, 5x10, 10x10, 10x20, each drive-up or interior; interior units can be climate-controlled (×1.35 cost).
  - Base drive-up costs: $420, $620, $980, $1,650. Interior is ×0.55.
- **Access and logistics:** loading zones, wide/auto doors, carts and corrals (cart $180).
  - Elevators have capacity; carts can't use stairs. Unreachable units are blocked and can't lease.
- **Utilities:** HVAC capacity of 60 climate cells per plant; power capacity with load shedding; water for restrooms and fountains.
- **Staff:** Owner $0, Porter $55/day, Tech $85, Clerk $65, Manager $120. Staff work 7:00–20:00. The Owner auto-works chores when the "Owner handles chores" policy is on (the default after the tutorial).
- **Tasks:** make-ready, cleaning, carts, repairs (simple/complex), preventive maintenance; vendors can be called.
- **Customers:** prospects lease or leave for a stated reason. Visit routes are simulated, including restroom trips.
- **Collections (Round 9):**
  - Past due, then delinquent at 15 days (lockout/overlock), then lien-eligible at 30 days.
  - At that point: notice, payment plan or waive. Then a Saturday 10 AM auction, or clean-out.
  - Policies: late fee (default $20), overlock, auto-notice, resolution (auction/clean-out), retention.
- **Conversations (Round 9):** five types with real consequences, a reply deadline with a default choice, and auto-answers from a Clerk or Manager during office hours.
- **Optional lessons (Round 11):** see 5D.
- **Renovations (Round 11, CANDIDATE):** available on **vacant** units after the tutorial.
  - **Convert to climate**: interior standard units only. Cost $300 + sqft×6. Needs spare HVAC capacity.
  - **Split a drive-up 10x10 into two 5x10s**: $450. Both new units need make-ready.
  - The split path is VERIFIED in a headless test. The climate-conversion success path is **UNVERIFIED**.
- **Company (Round 2):**
  - Up to 5 properties, all on one clock, with $10k transfers between them and a company feed.
  - Acquired facilities get unique names and alternate mirrored and original layouts.
  - Each purchase includes $5,000 of working cash.
- **Operator career (Round 11, CANDIDATE):** see 5B.
- **Scenarios:** Maple Turnaround, Go Vertical, Climate Boom. Each has goals, a deadline and a fail condition.
- **Milestones:** many, including first_retention, first auction, first loan, graduated.

### 5B. Economy rules (exact numbers)
- **Maple market rents (monthly):** 5x5 $60, 5x10 $95, 10x10 $150, 10x20 $260. Climate ×1.35; upper floor ×0.92.
- **Maple demand (prospects per day by size):** 0.35 / 0.7 / 0.8 / 0.35. Climate share is 0.3.
  - Base formula: × opts.demand × (0.7 + 0.5·reputation). There's an extra ×0.75 during the tutorial.
- **Other markets** are in `data.js`: urban, rural and blank, each with its own rents and demand.
- **OPEX per day:** base $18, $0.25 per unit, plus per-asset costs (light 0.5, camera 0.35, elevator 5, HVAC plant 3 + 0.18 per climate cell, gate 1.0, and so on).
- **Billing:** every 30 days.
- **Loans (Round 9):**
  - The term loan is **7.5% over 60 months**. The bank caps payments at **45% of rent roll**. Loans unlock after the tutorial.
  - A credit line covers cash gaps.
  - Hiring needs a week of wages in cash.
- **Rent review:** +5% or +10% for eligible tenants, capped at asking rent. It costs satisfaction and raises move-outs for 60 days.
- **Market pressure (Round 11, CANDIDATE).** Active only when `pressureOn()` is true: not creative, not a scenario, not during the tutorial before graduation, and `opts.competition !== false`.
  - **Seasonality:** demand × (1 + 0.2·sin(2π(day−80)/365)). It peaks in early summer. Labels: "Peak moving season", "Busy season building", "Shoulder season", "Winter slowdown". Day 1 falls in the "Winter slowdown" band.
  - **Competitors:**
    - The first one is announced on day 45–74 and opens 30 days later. Strength 0.16–0.26; price 0.88–0.94× market; 1.2–3.5 miles away.
    - The next one is scheduled +200–319 days later, up to 3 in total.
    - Names come from: StorQuik Self Storage, Carlsbad Box & Lock, SecureSpace on 5th, Coastline Storage Co., Depot Self Storage.
    - **Shopper share taken:** sum of strength × (0.4 + 0.6·ramp over 60 days) × clamp(1.45 − reputation, 0.45, 1.1), capped at 0.5.
    - **Prospects:** if ask/market > competitor price + 0.04 (and the prospect isn't "keen"), the chance of signing is multiplied by clamp(1 − (ratio − cp)·2.2, 0.35, 1). Lost prospects are tagged 'competitor' 60% of the time in that case.
    - **Tenants:** move-out risk × (1 + 2·share) when the tenant pays more than competitor price + 0.05.
  - **Reviews:**
    - Each tenant has a 1/150 chance per day of posting a review, and a 50% chance when leaving.
    - Stars = round(1 + 4·clamp((sat − 0.35)/0.55)) ± noise, limited to 1–5. Reviews of 3 stars or fewer name the weakest experience dimension.
    - The average of the last 25 reviews (once at least 3 exist) multiplies traffic by clamp(0.7 + 0.075·rating, 0.78, 1.08).
  - **Costs:** OPEX × 1.04^(years); a new daily **tax & insurance** cost of $4 + $0.25 per operating unit.
  - **Rents:** market rent × 1.03^(years). This also affects the Manager's auto-pricing and the Business display.
  - **Settled demand:** Maple's demand after graduation is × **0.4** (`MARKETS.maple.settled`). Other markets have no settled factor.
  - **Move-out hazard:** also × (0.85 + 0.15·season).
  - **New lost-prospect reasons:** `competitor` and `reputation` (reputation < 0.68).
- **Monthly report card:** every 30 days (when day > 1 and (day−1) % 30 = 0), outside creative mode and outside the unfinished tutorial.
  - **Score:** occupancy·30 + margin (contribution/roll, capped at 0.7) scaled to 20 + reputation·20 + rating up to 10 (7 if no rating) + pricing vs. market up to 10 + growth vs. 3 reports ago up to 10.
  - **Grades:** A ≥ 88, B ≥ 76, C ≥ 64, D ≥ 52, otherwise F.
  - **Top 3 suggestions**, ranked by weight: build sizes that sell out, climate, price/competitor, staffing backlog, weak experience dimensions, reviews, legacy rents (estimated gain), collections, competitor note.
- **Operator career tiers** (`TIERS` in data.js; based on portfolio rent roll and property count; never decrease; synced once a game-hour by `main.js syncTier()`, not during the tutorial, scenarios or creative):

| Tier | Requirement | Unlocks |
|---|---|---|
| 1 Owner-operator | Start | Suburban parcels and operating facilities for sale |
| 2 Local operator | $3,500/mo rent roll | **Rush contractors** (+25% cost, half the build time; "Rush on/off" toggle in the build bar); **priority vendor** (~5h instead of ~10h) |
| 3 Regional operator | $7,000/mo and 2 properties | **Urban and rural parcels** in acquisitions; **loan rate 6.5%** |
| 4 Portfolio operator | $15,000/mo and 3 properties | **OPEX −8%**; **+10% shopper traffic** |
| 5 Storage magnate | $30,000/mo and 4 properties | Title only |

### 5C. Visual and UI improvements
- **Round 8 Showcase (presentation-only):** living title attract mode; miniature tilt-shift lens with night-only bloom, film grade, vignette and grain (menu toggle, auto-off on low quality); photo mode (P key or camera button); follow cam with a person card; cinematic tour (Menu > Showcase); celebration banners, sparkles and flourishes; floating money pops; headlight pools; wet asphalt and rain ripples; 84 BPM adaptive score.
- **Round 11 UI:**
  - **Business sheet:** a Monthly report card (grade badge, key figures with changes, numbered suggestions), Your market (season, competitors, cost and rent drift), "Why shoppers didn't sign · 30 days" (each reason has an explanation and fix), and Reviews (stars plus the last 3 reviews).
  - The Operating cost stat shows tax & insurance.
  - **Growth sheet:** an Operator career card with progress bars and perks, and a Lessons list (Start/Replay).
  - **Toasts:** competitor announced/opened, 1–2 and 5-star reviews, report card arrived, promotion, lesson complete. Showcase celebrations for promotions and lesson completion.

### 5D. Tutorial and onboarding (current state, Round 11, CANDIDATE)
- **Core tutorial = 8 parts, 25 steps:** welcome (2 steps), makeready (4), lease (2), money (2), expand (7), repair (4), hire (3), grad (1). The chapters are Take Control, Add Capacity, Keep the Property Working, Graduation.
- **The Round 10 guidance mechanics are kept:**
  - Checklist card with a progress bar; the current step plus the next two.
  - Coach ring with labels ("Tap here", "Open Build", and so on); menu-path fallback; auto-pan once.
  - "Why this matters" toggle; part banners ("Part N of 8 complete", computed from BEATS.length).
- **Tool unlocks during the tutorial:** drive aisle, drive-up units, demolish, walkway and parking at beat 4 (expand); lights at beat 5 (repair). Everything else unlocks at graduation and shows "Unlocks after the tutorial".
- **Graduation** sets `s.tut.gradDay`. Its text now mentions lessons and the monthly report card.
- **Optional LESSONS:** none of the 74 Round 10 steps were deleted; four parts were moved here. Each lesson runs one at a time with its own card, a "Lesson" header and an "End lesson" button.

| Lesson | Title | Steps | Offered when | Scope |
|---|---|---|---|---|
| interior | How interior customers move | 3 | 2 days after graduation | Maple only |
| quality | Coverage you can see | 8 | security < 0.66, or 6 days after graduation | Maple only |
| climate | Climate demand is worth serving | 18 | ≥ 2 lost to noClimate in 14 days | Maple only |
| up | Land pressure: build vertically | 19 | ≥ 8 lost to noReady + noSize in 30 days and more than 26 units | Maple only |
| collections | When rent goes unpaid | 3 | any delinquent or lien account | Generic |
| financing | Paying for growth | 3 | 12 days after graduation, or cash < $3,000 | Generic |

- "Maple only" means the original Maple Street: mode tutorial, graduated, not mirrored. Generic lessons work on any property that isn't a scenario.
- Offers show one at a time as an "Optional lesson" card with **Start lesson** and **Not now**. **Not now** is permanent (`lessonsSeen`), and the card hides while a sheet is open.
- **State:**
  - `s.lesson = {id, idMark, built[], flags{}, entered}`; `s.lessonsDone`, `s.lessonsSeen`, `s.lessonOffer`.
  - `ctx(sim)` returns the lesson context when a lesson is running, otherwise the tutorial context.
  - `act_lesson {op: start|end|dismiss}`. `act_tutFlag` writes to both contexts. `act_build` logs builds to the lesson when one is active.
  - `installTutorial(sim)` now runs for **every** property (it calls tutorialTick and lessonTick).
- **Post-tutorial coach bar (Round 6):** one-line next step plus owner status. It hides while a lesson or offer is active (Round 11).

### 5E. Mobile and iPhone usability
- **Round 4:**
  - Landscape layout with tabs in a left column and full-height panels on the right.
  - Fixes for 320px and short screens; panels use the visible viewport height.
  - Pinch, double-tap and long-press page zoom blocked; no zoom when typing into inputs.
  - Audio unlocks on the first tap and resumes when you return; the game pauses when hidden.
  - Saves go through the share sheet; A2HS icon and manifest.
  - Phones skip anti-aliasing and use smaller shadows; the scene recovers from WebGL context loss.
- **Round 5:** full-size tap areas for the switches; the menu button fits at 320px.
- **Round 6:** the seven comparison items. See §9.
- **Round 7:** adaptive quality (drops a step if under about 36 fps for 3 s; never steps back up mid-session; menu setting Auto/High/Medium/Low), battery saver (about 30 fps cap), idle redraw at about 4 fps.
- **Round 11 phone declutter (CANDIDATE):**
  - Overlapping map pins (within 28×30 px on screen) fold into the first pin with a **count badge**. Tapping opens only the first pin's object.
  - **Only the single most urgent conversation card shows** (critical first, then soonest to expire), with a "+N more requests waiting" / "Show fewer" toggle that shows up to 3.
  - Identical nearby pops merge ("Rent-ready ×2"); phones (< 700 px wide) show at most 6 pops.

### 5F. Map and world presentation
- Near-isometric 3D diorama with shadows, trees and neighboring buildings; day/night; weather; overlays (Security, Power, and others); floor views EXT/F1/F2; rotate; zoom; Fit.
- Pins (Round 6): repair or PM, make-ready, cleaning, late payment, overlock, auction, blocked, unpowered, ready-to-commission, stranded cart. A worker badge appears when someone is assigned.
- Unit numbers drawn on the map when zoomed in (24 px or more per cell); hidden if they would collide; colored occupied, vacant or in progress.
- **Competitors exist only as data, panels and toasts.** No competitor building appears on the map. The receiving AI could add one; that idea is PROPOSED here only.

### 5G. Saves
- Autosave every in-game day, at least once a minute of play, and when the page is hidden or closed. Continue button on the title screen.
- Save codes and `.sst` files work as backups. Saves cover the whole company.
- XSS-sanitized; malformed saves rejected.
- Older saves get migration defaults (`mkt`, `coTier`, policies, and so on).

---

## 6. Proposed but NOT accepted or NOT implemented
- **Publishing to `self-storage-tycoon.pplx.app`:** PROPOSED twice and **declined twice** by the user.
- **Vercel deployment:** USER-REQUESTED once ("Deploy the preview through Vercel") but **FAILED**: the connector has no scopes. The fix needs the user to change permissions in the Vercel dashboard (Settings → Integrations → Perplexity → scope access).
- **GitHub repo creation** (`self-storage-tycoon`, then import on vercel.com/new): PROPOSED only. **No repo exists.**
- **Director review items not implemented or only partly implemented (Round 11):**
  - Real iPhone testing and 3–5 human playtests: impossible for the AI to do. **Not done.**
  - "Wear that shows up in reviews if ignored": partly done. Reviews reflect satisfaction and name the weakest dimension, but no separate wear-to-review link was added.
  - "Contractors": only a rush toggle; no contractor choice or marketplace.
  - "Unlock better staff": not done (no staff tiers).
  - "Vendor/market unlocks": priority vendor and urban/rural parcels are done.
  - Reputation breakdown: **already existed** before Round 11. The review overstated this gap, and the AI admitted it.
  - Multiple properties and adaptive quality also already existed; the review overstated those too.
- **Ideas from the Sep 27 design review** (one playable month specification, two-site expansion choice, confidence bands on forecasts, playtest pass/fail criteria): only design documents. Mostly not built as specified (UNKNOWN degree).
- **Turnaround balance fix** (it still fills too easily): not done, because pressure is off in scenarios.

---

## 7. Known defects, weaknesses, open questions, technical debt
1. **CONFLICT C1, tutorial length:** see §16. This is the biggest open product question.
2. **The economy still favors idle play on Maple.** The Owner's auto-chores keep an ignored property around 90% occupancy with B grades. The difference between styles shows up in rent roll and growth, not year-one cash (see §9 soak).
3. **Staffed Maple loses money.** Porter plus Tech wages exceed the rent from a 23-unit site. This was known since Round 1 and deliberately left alone. Bots that hire staff show cash around $300 after a year.
4. **Report grades don't discriminate well.** Idle gets mostly B; the strategic player gets C early because of investment spending. The thresholds probably need tuning.
5. **Scenarios ignore market pressure**, so Turnaround fills 23/23 passively (previous review finding).
6. **No save migration for tutorials in progress (INFERRED risk).** BEATS indices changed from 12 to 8 parts.
   - Old indices: 0 welcome, 1 makeready, 2 lease, 3 money, 4 expand, 5 interior, 6 repair, 7 hire, 8 quality, 9 climate, 10 up, 11 grad.
   - New indices: 5 repair, 6 hire, 7 grad.
   - A Round 10 autosave taken mid-tutorial at beat ≥ 5 will resume at the wrong part or skip ahead. Not tested.
7. "Not now" on a lesson offer is permanent; offers never repeat. Lessons can still be started from Growth.
8. Tapping a pin cluster opens only the first object; there's no expanded list.
9. The lesson's "Got it" button shows from step 1, so a player can finish financing or collections lessons without reading them.
10. The climate-conversion renovation's success path is unverified; only the split was tested.
11. Tier sync runs only in the browser main loop (`syncTier`), not in headless tests. Tiers never go down.
12. In QA hold-mode screenshots, the HUD still showed "Day 1" when the simulation was on day 33. **UNKNOWN** whether this is a harness artifact (real-time UI throttling while stepping manually) or a real bug.
13. The header subtitle still says "Tutorial" for Maple after graduation (preexisting cosmetic issue).
14. The competitor has no visual presence on the map.
15. **Autosave depends on the save server** running in the Perplexity workspace (port 8000; `__PORT_8000__` placeholder rewritten at deploy time). If the sandbox stops, autosave shows offline. SQLite is not production-grade.
16. The **preview URL is private** to the user's Perplexity account unless shared through the Share menu.
17. **QA report inaccuracies to correct:**
    - The Round 8 text says the sim is "C++-derived". It's JS.
    - The "Fix log (commit 7af2a1a)" header refers to a git history from the previous session's workspace that **is not in the current repo**. The current repo was rebuilt from the zip as the "baseline" commit 5550d8f.
18. The 'shopping' and 'reputation' lost reasons overlap. The noReady reason dominates Maple's lost counts (noReady 392/yr idle in an early soak before demand was settled at 0.4).
19. Performance on real iPhones (fps, battery, heat) is **UNKNOWN**. All rendering tests used software rendering.

---

## 8. Current priorities and recommended next action
**Recommended next action:** ask the user to resolve **C1** (keep the 8-part core with optional lessons, or restore the full tutorial as the required path) and to react to Round 11. Then do a **real-iPhone check** of the current preview.
- These matter most because playtests and economy tuning depend on which tutorial ships and on real-device feel.
- Don't publish unless asked.

Ordered dependencies are in the NEXT 5 ACTIONS section at the end.

---

## 9. Comparisons, research findings and conclusions

### 9.1 Build comparison (2026-09-30 18:48 UTC, session 0800785e)
The user uploaded iPhone screenshots of two other builds (attachments `IMG_2933.jpeg`, `IMG_2934.jpeg`, `IMG_2938.jpeg`, `IMG_2941.jpeg`, `IMG_2942.jpeg`, `IMG_2947.jpeg` in that session; which image shows which build is UNKNOWN). The AI compared them with **its own emulated iPhone 15 Pro screenshots, not a real phone**.

| | Dark build (Vercel) | Light build ("Maple Street") | Ours (at that time) |
|---|---|---|---|
| Top bar | One row: cash, day, occupancy, time | Name, cash, leased count, daily income, "Rent in N days", energy | Cash, clock, speed, menu |
| Map | Fills the screen; building small | Whole property fits; unit numbers and labels on the map | Best-looking world, but panels covered 50–60% of it |
| Map problem indicators | Wrench pin, worker icon during repair | Status tags ("LATE"), day/night tint | Cleanup sign and unreachable badge only |
| Guidance | One line: "Unit 7 needs repair. Tap it to fix it." | "Not steady yet" card with one button | Only during the tutorial |
| Selected-object panel | Short card | One big action button plus status lines | Detailed stats, no clear main action |
| Own time | "You (Manager): Free · 5 h left today" | "Energy 5/5" | Not shown |
| Depth | Small | Medium | Much more |

Weaknesses in the other builds, which we chose not to copy:
- **Dark build:** the DIAG button overlaps the sound icon; the menu is cut off; cash shows cents and the day shows as a decimal ("288.7"); the ground is a flat sandy grid.
- **Light build:** the map gets only about 30% of the screen; labels overlap ("LATE" on "102"); negative cash shows as "-$89".

**The seven "worth borrowing" items.** All were USER-ACCEPTED ("Build all seven iPhone improvements") and **built in Round 6, VERIFIED (emulation: iPhone SE, 15 Pro portrait and landscape, 1280 desktop)**:

| # | Comparison finding | What was built (Round 6) | Later changes |
|---|---|---|---|
| 1 | **Smaller phone panels** | Peek sheets about 46% of screen height (content-sized), grab handle to expand (tap or swipe), swipe down shrinks or closes, map pans the selection above the sheet; landscape side sheets fit their content | None |
| 2 | **Map-level issue/status indicators** | Pins for repair/PM, make-ready, restroom and hall cleaning, late payment, blocked/unpowered, ready-to-commission, stranded carts; worker badge; tap selects | Round 9 added overlock and auction pins; **Round 11 added clustering with count badges** |
| 3 | **Visible unit numbers** | At door level when zoomed to 24 px or more per cell; hidden on collision; colored occupied/vacant/in progress; hidden while a build tool is active | None |
| 4 | **Post-tutorial next-step guidance** | Coach bar: one line plus owner status ("You: free · 13h left" / "working" / "off until 7 AM"); tap opens the object or tab; hidden when a sheet or modal is open | Round 11: also hidden during a lesson or lesson offer. Lessons and the monthly report card now add guidance after graduation. |
| 5 | **A primary action at the top of selected-object panels** | Full-width main button first ("Send Owner", "Owner: return it", "Commission unit", …) | Round 11 added renovate buttons lower in the unit inspector |
| 6 | **Occupancy, daily income and owner-capacity information** | Cash chip sub-line "22/23 · +$54/d" (phone) or "/day" (desktop); 77 px wide at 320 px; no wrap. Owner capacity is shown in the coach bar. | Round 11: the Business stat shows tax & insurance |
| 7 | **Opening the property zoomed to fit** | Phones open framed to the built facility plus margin (an empty lot frames the whole parcel); Fit button in the zoom controls; minimum zoom lowered to 0.25 | None |

### 9.2 Director review (2026-10-01 01:03 UTC)
- **Verdict:** strong technical vertical slice, weak game.
- **Evidence (VERIFIED in headless runs at the time):** idle Maple went from $26k to about $45.6k and filled 23/23 after 365 days; idle Turnaround filled 23/23 by day 150.
- **Top 5:**
  1. Economy pressure (competitor, seasons, wear shown in reviews, rising tax and insurance, walk-aways).
  2. Real iPhone test plus phone declutter (pin grouping, one urgent item at a time, adaptive quality).
  3. Cut the tutorial to about 6 core parts, with climate, two-floor, collections and loans as contextual optional lessons, and test with 3–5 people.
  4. Goals after graduation (company layer, staff/vendor/market unlocks, contractors, renovate/convert).
  5. Legibility (walk-away reasons, reputation breakdown, monthly report card with suggestions).
- **What to protect:** the living diorama, realistic operations (make-ready, carts, lien auctions), "never forecast revenue the game can't back up", and the deterministic simulation.

### 9.3 Round 11 balance soak (VERIFIED headless; Maple after graduation, sandbox mode, 365 days; script `/tmp/simt/tp2.mjs`)

| Play style | Cash | Occupancy | Rent roll | Grades by month |
|---|---|---|---|---|
| Idle (auto-chores on) | $44,122 | 22/23 (monthly 83–100%) | $2,585 | BBBCBABBBABB |
| Absent (auto-chores off) | $22,604 | 3/23 | $276 | BCDFFFFFFFFF |
| "Good" bot (dispatch owner/vendors, answer requests) | $40,789 | 23/23 | $2,588 | BBBBABBBBBBB |
| Strategic (day 20: 4 drive-up 10x10s, HVAC, light, 7 climate 5x5s; monthly reprice) | $36,956 | 34/34 | $3,617 (+40%) | CCBAABBBBBBB |

Before demand was settled at 0.4, idle stayed at 23/23 and $45,002 with straight A grades; that was the reason for adding the settled factor.

**Conclusion:** idle play no longer pins at 100%, and neglect collapses. But auto-chores keep idle safe; the payoff for decisions shows in rent roll and growth.

### 9.4 Other conclusions carried forward
- **Release readiness (2026-09-30 19:51):** it's a beta, not a release. Still needed: autosave (done in Round 7), a real iPhone check, real players, on-device battery and heat.
- **Safari:** the game is already built for Safari. The barrier is the private link (needs a Perplexity login, or publishing).

---

## 10. Source URLs and citations
- **Master GDD v1.1 PDF.** Uploaded attachment `SST_Master_GDD_v1_1_Art_Audio_Complete.pdf`; extracted text was at `/tmp/gdd2.txt` (4,312 lines). It establishes:
  - The target specification.
  - "Live GitHub remains the authority for what is actually implemented, tested, accepted, or released. This GDD is the target product definition."
  - Production phases A–H. Phase A: don't regress save/resume, economy truth, lease/turnover, time controls, construction/access authority, "C++ gameplay authority".
  - Its status line: "MASTER TARGET DESIGN CANDIDATE … not a claim of current implementation or acceptance."
- **Preview app (current build):** https://www.perplexity.ai/computer/a/self-storage-tycoon-Y4XvxXMKQCijEnYwjb1qTg. The live private preview, updated in place every round. Asset ID `6385efc5-730a-4028-a312-76308dbd6a4e`.
- **Superseded 2D prototype preview:** https://www.perplexity.ai/computer/a/maple-street-storage-tycoon-5BNbv.ZgTraxL9jq9kOvxw. Historical only.
- **vercel.com/new:** https://vercel.com/new. Mentioned as the manual import path; never used.
- No external web research was done for this project; all findings are internal tests and reviews.

---

## 11–12. Artifacts (exact identifiers, role, status)

| Artifact | Identifier / location | Role | Status |
|---|---|---|---|
| Source repo (local git, **not on GitHub**) | `/home/user/workspace/sst` (Perplexity sandbox) | Authoritative implementation | HEAD `a823f49` |
| Commits | `a823f49` 2026-10-01 01:37 UTC "Round 11: market pressure, report cards, core tutorial + lessons, operator career, renovations, phone declutter" | Current | CANDIDATE |
| | `6851b44` 2026-09-30 23:39 "Round 10: step-by-step guided tutorial with coach ring, menu-path guidance, auto-pan, part banners" | | |
| | `98f4c30` 22:41 "Round 9: collections ladder + auctions, term loans + operating statement, expanded conversations with clerk automation, mastery milestones" | | |
| | `100d18c` 21:53 "Restore autosave server + port placeholder" | | |
| | `ec22ac9` 21:52 "Showcase: attract mode, miniature lens, photo mode, follow cam, tour, celebrations, adaptive score, night/rain FX" | | |
| | `5550d8f` 21:09 "baseline" (Round 7 zip imported) | | |
| | `7af2a1a` (named in the QA report) | Earlier-session fix log | **Not present in this repo** |
| Branch | Default branch only (name not recorded; likely `master` or `main`) | | UNKNOWN name |
| Deploy bundle | `/home/user/workspace/sst-dist` (rsync of sst without .git, server, zips) | What gets deployed | Matches a823f49 |
| Source zip (latest) | `Self-Storage-Tycoon.zip` (345,842 bytes), asset `ecbba4cb-f7ae-4d68-a440-382f97bd7780` | Full source including server | Shared after Round 11 |
| Earlier zips | Round 8 `b8156692-1c16-4721-81c6-fcd2c4a6d0db`; Round 9 `b8fc186b-512a-4a2d-9c06-a777590bf0a8`; Round 10 `b07a44ad-0f71-401d-88fd-895cc58661ef` | History | Superseded |
| QA report (latest) | `Self-Storage-Tycoon-QA-Report.md`, asset `5903b183-7715-4c9d-bfbd-8762ea2d7a93`. Sections: Summary, Critical, Major, Minor, Passed, GDD compliance notes, Suggested fix order, Fix log, Rounds 2–11 | Running QA log | Current; see §7 item 17 for corrections |
| Earlier QA reports | R8 `72849878-d79a-454f-905c-1cc930fbd89d`; R9 `113b1a2c-f2c2-43f3-b300-19417c191104`; R10 `8dbb5cfa-66ee-49aa-831a-eda0f223b7e7` | History | Superseded |
| Older-session files | `sst-bug-report.md`, `self-storage-tycoon.zip`, `Maple-Street-Storage-Tycoon.html` (session 0800785e outputs) | History | Superseded |
| Design docs (session 699e08ce) | `self_storage_tycoon_gdd.md`, `self_storage_tycoon_first_facility_gdd_v02.md` (4-beat tutorial, **rejected**), `self_storage_tycoon_gdd_v03.md` (8-stage tutorial restored) | Early design | Superseded by Master GDD v1.1 |
| Comparison screenshots | `IMG_2933.jpeg`, `IMG_2934.jpeg`, `IMG_2938.jpeg`, `IMG_2941.jpeg`, `IMG_2942.jpeg`, `IMG_2947.jpeg` (user uploads, session 0800785e) | Other builds plus possibly our own | Input to the §9.1 comparison |
| QA harness | `/home/user/workspace/qa/run.js` (`node run.js d\|m <script>`), `lib.js`; scripts `s_r9.js`, `s_r10.js`, `s_r11.js`, `s_dbg.js` | Playwright browser QA (desktop "d", mobile "m") | Working |
| Screenshots | `/tmp/shots/*_d.png`, `*_m.png` (for example `r11_biz_m.png`, `r11_comp.png`, `r11_compd.png`) | Round 11 visual QA | Temporary sandbox files |
| Headless tests | `/tmp/simt/`: `t9c.mjs` (determinism and continuation), `t9f.mjs` (scenario soaks), `twalk.mjs` (tutorial and lessons walkthrough), `tp.mjs` / `tp2.mjs` (pressure soaks), `tr.mjs` (renovate, tier, rush), `tv.mjs` / `tw.mjs` (build plans) | Regression suite | Temporary (`/tmp`) |
| Servers | Static: `python3 -m http.server 5173` in sst. Save server: `python3 server/save_server.py` on port 8000 | Local dev and preview autosave | Running in the sandbox at handoff time |
| Vercel connector | Account `f6z2c5hrz6-3692` | Deployment | **Blocked: "No scopes available"** |
| GitHub connector | Connected | — | **No repo created** |

**How to run locally (VERIFIED approach):** unzip, run `python3 -m http.server` in the folder, and open it in a browser. Opening it via `file://` doesn't work (modules). Autosave needs `server/save_server.py`; in a plain local run, `cloud.js` uses the `__PORT_8000__` placeholder (rewritten only by Perplexity's deploy tool). Local autosave behavior without that rewrite is **UNKNOWN**.

---

## 13. Testing and verification

| Type | What was done | Not done |
|---|---|---|
| **Real device** | **None, ever.** No real iPhone, no real Safari, no fps/battery/heat measurement. | Everything on-device |
| **Human playtests** | **None.** | 3–5 cold playtests |
| **Emulation (Chromium/Playwright)** | Every round. Desktop 1280×800; phone 390×844 / 375×667; iPhone SE and 15 Pro profiles (portrait and landscape) in R4/R6. R11 `s_r11.js` (desktop and mobile): skip tutorial → 32 days → Business (report, market, reviews), Growth (career, lessons), start/end financing lesson, renovate button, rush toggle ($2,450, ~5h). No page errors, no "undefined/NaN/[object", no horizontal overflow (390 / 1280). Software rendering only. | Real touch hardware; GPU frame rate |
| **Headless sim (Node)** | R11: determinism true, continuation true (t9c); scenario soaks unchanged (Turnaround $7,000 → $15,819, 23/23); tutorial walkthrough completes 8 parts plus lessons interior, quality, climate and up (lessonsDone days 2/2/3/6, done by day 5); pressure soak table in §9.3; split renovation VERIFIED; rush cost and duration VERIFIED (order cost 2450, dur 276) | Climate-conversion success path; tier sync (browser-only); old-save tutorial migration |
| **Source inspection** | All of the Round 11 code was written and read by the AI | — |
| **Unverified claims** | "Feels smooth on iPhone"; tutorial clarity for humans; whether grades and suggestions feel useful; the Round 8 "C++-derived" wording (false) | — |

Earlier rounds' verification is summarized in the QA report (Rounds 2–10). Example: in Round 7, autosave was VERIFIED in the live preview: day 5, reload, Continue restored day 5 and cash.

---

## 14. User feedback and preferences that affect the project
- Very positive about the progress ("thoroughly impressed"; "now wow me").
- **Wants honest evaluation** ("be honest").
- **Wants a very detailed, step-by-step tutorial** that says exactly how to reach each menu and finish each task. Also saved to memory.
- **Considers a comprehensive ("over packed") tutorial necessary** (2026-09-27).
- iPhone Safari is the target.
- Doesn't want publishing yet; has declined it twice.
- Short, directive requests ("Implement fixes", "Continue implementing", "Implement recommendations"): expects the AI to carry out its own prior recommendations fully.
- User background: software builder in Carlsbad, California. Competitor names include "Carlsbad Box & Lock" as a local nod.

---

## 15. Rejected approaches and why
1. **The 2D HTML prototype as a base:** rejected ("Disregard prior to GDD"). It broke the GDD's rules: no time controls, browser-decided economy, rectangle painting, no construction states.
2. **The 4-beat tutorial cut (Sep 27):** rejected by the user ("The over packed tutorial is necessary").
3. **Publishing to pplx.app:** declined twice.
4. **The strictest CSP (no inline scripts):** rejected because it blocked the preview host's injected script; one inline allowance is kept (Round 5).
5. **Browser localStorage autosave:** not possible in the preview sandbox, so the save server was used instead (Round 7).
6. **Deploying via a password login in the cloud browser:** refused for security; the user's own browser or GitHub import is needed.
7. **Round 10 first two-floor layout:** discarded, because upper units had no route to an entrance.
8. **Round 11 balance:**
   - Making demand fall about 20× to force vacancies was rejected as breaking other modes.
   - Changing staff wages was rejected.
   - The chosen fix was settled demand × 0.4 for Maple after graduation, plus pressure.

---

## 16. Authority hierarchy and conflicts

**Authority order (when sources conflict):**
1. **The user's latest explicit instruction** in conversation. Later overrides earlier, but document the change.
2. **The code at commit `a823f49`** (`/home/user/workspace/sst`; the same code is in the zip asset `ecbba4cb-…`). This is the authority for what is *implemented*.
   - The GDD names "live GitHub", but no GitHub repo exists. **If the project is pushed to GitHub, that becomes the authority per the GDD.**
3. **Master GDD v1.1:** authority for the *target* design. Differences from the code are product gaps, not bugs in the GDD.
4. **The QA report:** a test log; can be wrong (see §7 item 17).
5. **AI summaries,** including this handoff: lowest. Check them against the code.

**Conflicts to raise, not silently resolve:**
- **C1, tutorial length.**
  - On 2026-09-27 the user said "The over packed tutorial is necessary". On 2026-09-30 the user asked for a *more* detailed tutorial (Round 10: 12 parts / 74 steps).
  - On 2026-10-01 the user said "Implement recommendations", and that list included cutting the core tutorial to about 6 parts with optional lessons. Round 11 cut it to **8 core parts / 25 steps** and moved 48 steps into optional lessons. No content was deleted, and the per-step detail is unchanged.
  - The later instruction technically authorized this, but it may conflict with the user's long-held preference. **Ask the user.** Restoring is straightforward: move the four Maple lessons back into BEATS in their original order (interior after expand; quality, climate, up after hire) and restore the UNLOCK indices.
- **C2, "C++ gameplay authority" vs. a JavaScript implementation.** The GDD (Phase A) requires C++ gameplay authority; the game's sim is JS. The QA report's "C++-derived sim" phrasing is wrong. Whether the user expects a C++ port someday is UNKNOWN.
- **C3, "live GitHub is the source of truth" vs. no repo.** Authority is currently local git plus the zip.
- **C4, Round 11 review overstatements.** The review called out a missing reputation breakdown, company layer and adaptive quality; all three already existed. This was acknowledged to the user.
- **C5, idle-play goal.** The review's goal was that "an ignored property levels off then slowly declines". In reality idle levels off around 90% occupancy and still makes money (about $18k/yr). Only the "absent owner" case declines.

---

## 17. DO NOT LOSE / DO NOT CHANGE
- **Don't publish** (pplx.app or anywhere public) without an explicit new request. Preview updates are fine.
- **Keep the simulation deterministic** (seeded RNG in state). Re-run determinism and continuation tests after any sim change.
- **Presentation must never decide outcomes.** Showcase, pops and audio only reflect sim events. No forecasts the sim can't back up.
- **No time pressure:** Pause/1x/2x/4x always available.
- **Keep all seven Round 6 iPhone improvements:** peek sheets, pins, unit numbers, coach bar, primary action first, cash chip with occupancy and daily net, fit on open.
- **Keep the tutorial's per-step detail** (exact taps, coach ring, menu path, "Why this matters"). Resolve C1 with the user before changing tutorial scope again.
- **Save compatibility:** keep the migration defaults in the `Sim` constructor; keep XSS sanitization and save validation.
- **Safari specifics:** audio unlock and resume, no page zoom, visible-viewport sizing, share-sheet saves, A2HS manifest.
- **The preview app asset ID** `6385efc5-730a-4028-a312-76308dbd6a4e`. Update it in place (`update_asset_id`); don't create a new artifact unless asked.
- **Market pressure stays off** in the tutorial (before graduation), creative mode and scenarios, unless deliberately changed and retuned.
- **Exact tuning numbers** in §5B (they're in `data.js` and `sim.js`).
- **Owner auto-chores policy** (on by default after the tutorial). It's the main reason idle play survives; change it only deliberately.

---

## NEXT 5 ACTIONS (ordered by dependency)
1. **Get the user's decision on C1 and their reaction to Round 11.** Keep the 8-part core with optional lessons, or restore the full required tutorial (or a hybrid such as required core plus "recommended next lesson" prompts).
   - Everything about onboarding, playtests and lesson tuning depends on this.
   - If they choose restore: rebuild BEATS and UNLOCK, update the `twalk.mjs` order, re-run the walkthrough and determinism tests.
2. **Fix the known low-risk defects that affect testing:**
   - Save migration for tutorials in progress (map old beat indices to new ones, or reset to the nearest part start).
   - Check the HUD "Day 1" reading outside hold mode.
   - Graduated header subtitle.
   - Test the climate-conversion renovation.
   - Correct the QA report wording (C++ and the commit 7af2a1a note).
   - Redeploy to the same asset.
3. **Real iPhone Safari test by the user** (the AI can't do this). Use a checklist:
   - Fit on open, peek sheets, pin clusters, convo "+N more".
   - Lesson card, report card readability, rush toggle.
   - fps at night with the lens, battery and heat over 20 minutes.
   - Audio after switching apps, share-sheet save, autosave Continue.
   - Needs the user to sign into Perplexity in Safari, or share the preview through the Share menu. Fix whatever they find.
4. **Economy retune pass** (after 1–3 so it matches the chosen tutorial and real feel):
   - Decide whether idle should decline (for example, reduce Owner auto-chore scope or capacity, or add wear-driven review damage).
   - Make grades discriminate.
   - Optionally enable pressure in Turnaround.
   - Re-run the soaks: idle, absent, good, strategic.
5. **3–5 human cold playtests** (organized by the user), then fix what they find.
   - Only after that: decide on publishing (user's call), and optionally create a GitHub repo, which makes "live GitHub" the authority per the GDD.
   - Vercel requires the user to grant integration scopes first.

---

## RAW MATERIAL STILL NEEDED
These can't be transferred through this text; upload or obtain them separately:
1. **The source code:** `Self-Storage-Tycoon.zip` (Round 11, asset `ecbba4cb-f7ae-4d68-a440-382f97bd7780`). Download it from the Perplexity thread and upload it to the new conversation. Without it the receiving AI has no code; the repo at `/home/user/workspace/sst` and its git history exist only in the Perplexity sandbox.
2. **Git history:** the zip excludes `.git`. Commits `5550d8f`…`a823f49` are lost unless someone exports the repo (for example, the user asks Perplexity to push it to GitHub or to produce a zip that includes `.git`).
3. **Master GDD v1.1 PDF** (`SST_Master_GDD_v1_1_Art_Audio_Complete.pdf`): must be re-uploaded. Some of its images (concept art A/B, schematics, tables drawn as images) were only partly read, as text.
4. **QA report** `Self-Storage-Tycoon-QA-Report.md` (asset `5903b183-7715-4c9d-bfbd-8762ea2d7a93`): the detailed per-round logs.
5. **Comparison screenshots** `IMG_2933/2934/2938/2941/2942/2947.jpeg` (session 0800785e). Which image shows which build isn't recorded here.
6. **Earlier design docs** (`self_storage_tycoon_gdd.md`, `_first_facility_gdd_v02.md`, `_gdd_v03.md`): only if the earlier design reasoning matters.
7. **Test scripts and screenshots:** `/home/user/workspace/qa/*` and `/tmp/simt/*.mjs` aren't in the game zip (`/tmp` is temporary). They'd need exporting to be reused.
8. **The live preview** (https://www.perplexity.ai/computer/a/self-storage-tycoon-Y4XvxXMKQCijEnYwjb1qTg): private to the user's Perplexity account. Autosave there depends on a save server in the Perplexity sandbox; ChatGPT can't open or update it.
9. **The exact wording of the user's Round 8–10 requests** beyond what's quoted here, and the full 74-step Round 10 text (it's in `js/tutorial.js` inside the zip).
10. **Vercel and GitHub account access:** ChatGPT has no connectors to the user's accounts. Any deploy needs the user's own action.
