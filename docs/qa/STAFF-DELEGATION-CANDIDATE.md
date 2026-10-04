# B+ staff delegation candidate 8

2026-10-04 · JavaScript/Three.js only · EezzyE88/self-storage-tycoon-js.
Branch: `candidate/staff-delegation-20261004`, parent `ffacd17db565cdaf43aee20c15b54d1dc343ce06`.
Build: `bplus-staff-delegation-candidate-8`. Accepted master verified unchanged at `2812abf8d268f9a225e5786d173f95efcbd6223d`; no merge.

## User problem and source findings

Eddie's physical Safari feedback was about the in-game Owner doing the chores, not about testing labor. Screenshots show multiple light repair jobs, Owner work bookings, a customer saying nobody is at the office, and temporary repairs ending at 72% condition.

1. The repair inspector and work queue promoted Owner actions and lacked a direct delegation action. Existing Techs already pick up unassigned repairs automatically; Porters cannot repair lights. The screenshots do not identify the entire hired roster, so they do not establish a Tech assignment failure.
2. Staff agents are processed in insertion order, typically Owner first. On shared automatic-task polling ticks, an idle Owner could take an available chore before an idle hired Porter. This was a reproducible allocation defect.
3. Existing Owner repairs in post-tutorial pressure mode restore **at least 72%**, while Tech/vendor service restores **100%**. The inspector then offered `Owner: service now` on the temporary repair, inviting another action that would not restore full condition. This is a misleading affordance, not evidence that wear accelerated.
4. An Owner out on a task cannot also serve the office. An employed Clerk covers 8 AM–6 PM. Hiring a Porter or Tech alone does not add office coverage.
5. Repair pins are generated from current tasks. The completed object's pin disappears in regression testing; remaining nearby/grouped jobs can still have pins. No stale-pin bug or abnormal light-wear rate was reproduced from these screenshots.

## Implemented behavior

- **Staff first for automatic chores:** Owner automatic task selection yields when a suitable hired, idle, on-shift Porter has enough capacity. The Porter picks up the job through the existing scheduler. The Owner can still help when staff is busy/exhausted, or when explicitly directed by the player. No active or queued job is silently taken away from someone.
- **Delegate at the job:** the inspector and work queue show `Delegate to Tech` or `Delegate to Porter` when an appropriate worker can start. Existing role permissions, shift, route and work-hour reservations apply. Owner hours and cash are not consumed by this assignment.
- **Honest blocked states:** missing staff → review the suitable hire; off shift → next-shift explanation; busy → automatic queue explanation; exhausted → tomorrow/another hire; unreachable → fix access; cart recovery disabled → policy explanation. A manager is not presented as a repair worker.
- **Review hiring, don't auto-hire:** a job's hire shortcut opens Operate/Hire capacity with the relevant role first. It shows the existing daily wage, monthly payroll effect and reserve evidence before any explicit hire. No wages are charged by following the shortcut.
- **Office coverage explanation:** repair/job views explain that a Clerk protects the desk when the Owner leaves, with a direct route to reviewing Clerk hiring.
- **Temporary repair clarity:** a repaired object explains its temporary condition, stops offering another redundant Owner service, and offers available Tech full service or the existing $250 vendor service. Tech full service can be explicitly created for an operating temporary repair; the action does not create a task if no suitable Tech can start.
- **Less misleading guidance:** repair coach says a Tech can handle repairs; the Owner-chores policy description acknowledges Tech automatic repair work. Delegation/hiring prompts remain suppressed during the unfinished core tutorial to preserve its authored teaching sequence.
- **Phone layout:** job descriptions and delegation controls appear above a wrapping action row instead of being crammed across a single horizontal item.

## Preserved rules

No wage, wear, price, financial-processing time, Owner/staff eight-hour budget, task duration, repair-condition coefficient, reserve formula, simulated customer limit, save schema, tutorial progression, or construction-placement rule was changed. The simulation clock is unchanged. Role wages remain Porter $12.50/day, Tech $20/day, Clerk $15/day; hiring is still a player's financial decision.

Staff task allocation intentionally changes to favor available hired capacity. Financial outcomes may consequently improve through more Owner office availability; this is a causal delegation fix, not economy coefficient retuning. Existing automatic staff assignment continues to work without the new buttons.

New commands use existing tasks, staff IDs, reservation and routing fields; delegated work round-trips through the existing JSON save and completes once. Unreachable starts refund reserved Tech work; already-assigned/vendor jobs are rejected. No reassignment of active or queued Owner jobs is included.

## Tests and evidence

Reproducer: `node tests/headless/tdelegation.mjs`.

**13 focused regressions pass:** Tech automatic repair with no Owner action; explicit delegation preserving desk/Owner capacity; Owner-before-Porter polling order; busy/exhausted Porter fallback; explicit Owner override; missing Tech despite hired Porter; off-shift/busy/capacity/route explanations; failed-route refund; assigned/vendor rejection; 72% temporary repair/no redundant Owner prompt/completed pin removal; full Tech restoration/no task creation without staff; Clerk desk coverage; existing-save resume/completion.

**36/36 headless scripts passed**, including existing staffing comparison, economy/payback, save/session, capacity, tutorial/blueprint, fuzz, systems and performance suites. The suite was followed by the final 13-regression run and menu/touch checks after small UI ordering/cost-text refinements. Evidence and source hashes are in `staff-delegation-evidence.json`. Syntax and whitespace checks pass.

## Release and acceptance

Publish the commit containing this report to the same owner-private Safari Preview:
https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site

Require immutable packaging from the committed runtime files and verification of every served asset against `source-proof.json`. Deployment outcome and served-file result are reported separately at delivery. Accepted master remains untouched.

Existing physical feedback supports tutorial placement/swiping and the candidate-7 Business layout. This new delegation behavior is automatically tested but **not physically accepted yet**. No additional screenshot task is required from Eddie for this coding pass. Normal play can supply future feedback.

Limits: this does not hire staff for the player, stop wear, extend shifts, or make the Owner omnipresent. Already-started/queued Owner work remains assigned. Without the correct hire, temporary Owner fixes/vendor decisions still require the player. Performance overlay overlap and mixed idle/active percentile reporting remain known separate candidate-7 diagnostics issues; they are not the cause of Owner workload and were not changed in this focused gameplay pass.
