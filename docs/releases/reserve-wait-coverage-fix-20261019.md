# Reserve-wait coverage fix — local candidate

Parent: `8798a9bbc443ebe6047ac2ef5766fa02286adeac`.
Branch: `candidate/reserve-wait-coverage-fix-20261019`.

The wait controller now checks permanent prerequisites for unassigned work independently of the staffing helper's temporary status: cart recovery policy must permit the job, the relevant employed staff role must have a staff agent, and an operating office must exist. Offshift, daily capacity exhaustion and busy staff remain valid reasons to continue waiting when these prerequisites are satisfied. Assigned, queued and vendor work retain the existing treatment.

Only `js/reservewait.js` changes production behavior. Ordinary staffing, work assignment, pricing, finance, economy, goal and save code are unchanged. The existing minute-level checks, seven-day cap and pause/background/navigation safeguards remain in use. This does not add task-location guidance or change the wait UI.

## Verification

- Expanded `tests/headless/treserve_wait.mjs` covers disabled cart recovery, missing staff, missing staff agents and a non-operating office at 7 AM and 9 PM; a missing operating office masked by capacity exhaustion; policy/agent/office changes stopping the production 240-minute batch at the second minute; follow-up dialog closure remaining paused; and covered offshift/capacity/busy work continuing. Refusal and coverage checks preserve the complete simulation state.
- Before the fix, the expanded suite reproduced a missing-operating-office refusal failure. After the fix, the expanded suite passes, including the previously reproduced off-hours policy case.
- Existing reserve-wait parity and interruptions pass, including 4,980 minutes of natural whole-state parity, exact funded-minute stopping, seven-day cap, speed choices, nested pauses, backgrounding and property switching.
- Pause policy (13 checks), Sandbox build/Confirm (16 paths), request handling (53 checks) and production raw/compressed project save retention all pass.
- Uploaded Day 15 comparison passes exact 30-day baseline parity: Day 45 cash $2,886.20, all 26 units occupied, three tracked contracts totaling $356.25/month. The separate ordinary reinvestment path still ends with $2,501.19 and $118.75/month tracked rent.
- Uploaded save SHA-256 remains `5b79939aec998abc3b0250fa0acbe1900d05c33a0f181dfb71f10f268031a282`.

These are headless checks. Physical iPhone acceptance and continuous-wait performance remain pending. No push, deployment, merge, preview update or normal-save writes were performed.
