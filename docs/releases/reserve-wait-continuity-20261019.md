# Reserve-wait continuity — local candidate

Parent: `c43195ebed7960959420ce45f50f942f331bf3ef`.
Branch: `candidate/reserve-wait-continuity-20261019`.

## Player problem and resulting behavior

The iPhone playtest showed repeated interruptions forcing Eddie to start the waiting workflow again. The controller discarded the selected investment on reviews, navigation and backgrounding. The old shortfall also remained visible after ordinary play resumed.

Interruptions now retain one exact investment specification in session memory and stop the clock. Closing a review, answering a decision or returning to the app leaves it paused. The map offers explicit **Resume waiting** when the same placement, construction quote, demand, financial position and work coverage remain suitable. Blocked states offer **Review decision**, **Review work**, **Review cash**, **Review leasing** or **Review investment**, plus **End wait**. Supporting review navigation retains the target.

Resume uses the original start minute and seven-game-day deadline. The paused card displays that original limit. Choosing the same frontage card again resumes the same intent instead of resetting its deadline. A changed construction quote requires review; another proposal cannot silently replace the selected one.

Suitable existing vacant stock produces “Lease the existing [size] space first.” The retained card reads the live quote instead of displaying an old shortfall. After the wait ends, its remaining message is explicitly labelled **Last wait**, without a stale money figure. Pending controls can wrap and are not clipped by the earlier minimized-card height limit.

Manual Stop, End wait, Pause, Space, explicit speed choices and the decision window's Keep paused control end the retained wait. Property changes and session/load attachment clear it. Background/focus/pagehide events interrupt it without resuming on return. A new page/controller has no retained intent; no save fields are added. Confirming the selected ordinary build ends its retained wait while keeping time paused. No waiting path purchases anything.

## Verification

- `node tests/headless/treserve_wait_continuity.mjs` passes production UI navigation, inspection, click-to-resume, nested pauses, same-batch owner interruption, request resolution remaining paused, unresolved review blocking Resume, actual visibility/blur/pagehide handlers, manual cancellation including Keep paused, original-deadline expiry across repeated resumes, same-card deadline retention, quote/demand/placement/policy/staff revalidation, vacancy explanation and review routing, live-funded exact-spec preview, explicit Confirm cleanup, session/property isolation and full simulation-state parity at each interruption/resume.
- `node tests/headless/treserve_wait.mjs` passes the earlier coverage and interruption checks and 4,980 minutes of natural whole-state parity.
- Pause policy (13 checks), Sandbox build/Confirm (16 paths), request handling (53 checks), review repairs (14 checks), occupancy/proposal markup and production raw/compressed project save retention pass.
- Actual uploaded Day 15 comparison passes exact 30-day baseline parity: Day 45 cash $2,886.20, 26 units occupied, three tracked contracts totaling $356.25/month. The separate ordinary reinvestment path still ends at $2,501.19 with $118.75/month tracked rent.
- JavaScript syntax and whitespace checks pass. Production changes are limited to the wait controller, its UI/lifecycle hooks and pending-card CSS. Simulation, finance, pricing, earned-goal and save modules are unchanged.

## Release limits

These are headless checks, including production handlers with rendering stubs and a CSS layout contract. The new Resume controls and pending-card height have not been accepted on physical iPhone Safari. The next physical check can be one interruption → review/return → explicit Resume cycle, with the original limit unchanged; no long reserve-funding replay is needed to verify continuity.

No push, deployment, merge, preview update or normal-save writes were performed. The existing preview remains on the preceding `c43195e` game source.
