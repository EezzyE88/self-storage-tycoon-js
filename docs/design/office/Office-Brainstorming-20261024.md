# Self Storage Tycoon Office Brainstorming

Design record and proposals for further use

October 24 2026  |  Separate companion to the project handoff

Use the Office to understand who is covering customers, where Owner capacity goes, which decisions need attention and what staff are doing. The strongest direction is a small operating hub connected to the property and existing controls. Its value should come from better decisions and useful delegation.

## Recommended priorities

The priorities below are recommendations in this document. They are proposals for review, not additional owner approvals or a reconstruction of an earlier ranking.

## 1 Prove the compact Office panel is useful

Review the existing candidate before adding another Office feature. Counter coverage, capacity, decisions and delegated work should lead to the correct existing action in one tap. The property and time controls need to remain comfortable on a phone. A panel that is hard to read or navigate would weaken every later idea.

## 2 Make the benefit of delegation understandable

Explain which work hired staff took over, which jobs remain blocked and why the Owner left the counter. Use actual work, capacity and service records. A Clerk should become an understandable choice when counter demand competes with property work; hiring should follow evidence rather than a compulsory tutorial purchase.

## 3 Make financial authority explicit

The current Manager can change asking rents, book vendors and buy carts without a separate approval. Keep that disclosure prominent. Any future spending limits or pricing permissions need their own design decision and implementation scope; the compact panel does not create them.

## What is already decided

Eddie authorized only the compact panel using existing state, controls and simulation rules. The boundaries include manual Pause, camera position, saves, no new authority system, and no publication or merge. Approval to implement that panel does not approve every future idea in this document. [1]

## The existing Office foundation

The initial panel design gives the Office four jobs. These are implemented in local candidate 17f49f9; implementation and owner gameplay acceptance remain separate. [2]

| Area | Information and existing action |
| --- | --- |
| Counter | Show who can serve now, office hours, customers waiting and customers being served. Open the existing coverage and Clerk hire review. |
| Owner capacity | Separate office capacity charged, property capacity charged or reserved, hours remaining, queued work and recorded completed property jobs. Open Work queue or toggle the existing Owner chores policy. |
| Your decisions | Show requests actually waiting for the player, with the reason and a direct route to the existing decision window. |
| Delegated work | Separate staff-handled requests from property jobs. Show handling, waiting, queued, vendor and blocked states; open existing request settings and Work queue. |

## The meaningful operating tradeoff

The Owner has 8 daily capacity hours. Each in-person customer served by the Owner charges 0.5h. Property work also uses capacity, and the Owner leaves the desk while doing it. A Clerk covers 8 AM to 6 PM and takes counter customers first. A Porter or Tech relieves matching property work. A Manager does not serve walk-in customers. [3]

| Role | Game wage per day | Existing responsibility |
| --- | --- | --- |
| Owner | $0 | Counter and supported property work; 8 capacity hours. |
| Clerk | $15 | Counter coverage and eligible customer requests. |
| Porter | $12.50 | Make-ready, cleaning and permitted cart recovery; 8 capacity hours. |
| Tech | $20 | Repairs and enabled preventive maintenance; 8 capacity hours. |
| Manager | $25 | Eligible requests and existing management automation; no counter service. |

Capacity booked for a queued job is not a completed job or elapsed labor. Completed-job reporting excludes office service and travel. Current waiting customers and historical service losses are different measures; a short queue alone does not prove a staffing shortage. [2][3]

## Ideas for further Office use

The ideas on this page are additional design proposals. They have not been implemented or approved by this document. Each should earn its place by helping a player understand or act on a real operating condition.

## A short operating brief

Show the most useful current situation and its action, such as an uncovered counter while the Owner is on a repair, a request awaiting a decision, or delegated work blocked by access. Prefer one clear issue over a wall of alerts. Use existing information and avoid presenting historical losses as customers waiting now.

## A visible record of delegated work

Bring a recent staff action or completion closer to the four rows: who handled it, what happened and any direct financial effect that is actually recorded. Existing logs and work reporting provide a starting point. The current Manager log is bounded to 20 entries, so it should not be presented as a permanent financial audit trail. [3]

## Evidence before hiring

Help the player compare persistent counter demand, Owner office capacity use, matching property-work backlog and the daily payroll commitment. Link to the existing hire review and financial position. Do not promise profit, recovered lost customers or a precise number of hours saved merely because a staff member was hired.

## Financial actions in context

Keep asking rents, collections, bills and reserve close enough to reach from the Office, while preserving their existing controls. Before proposing a price or staffing change, explain the evidence and the likely commitment. Repeated competitor losses may justify a pricing review; one refusal does not establish that rents should fall.

## Physical activity that matches the simulation

A later visual pass could make counter service, the Owner leaving for property work and staff returning more apparent on the property. Use actual agent and task states. Any animation should explain what the business is doing, with manageable visual noise and no implied work that never happened.

## Office upgrades only when a real need exists

A larger Office or extra service capacity could be explored later if a demonstrated bottleneck makes the choice worthwhile. First determine what current staffing and process controls already solve. No Office upgrade system or arbitrary rent, demand or reputation bonus is proposed for the current compact-panel implementation.

## Possible later authority controls

If Eddie wants finer delegation, separately consider which prices a Manager may change, when a vendor can be booked and what spending limit should apply. Resolve the player choice before implementing permissions. A daily budget, per-action approval switch and automatic-pricing switch do not currently exist. [3]

## Financial authority and next decisions

These are existing game behaviors at the pinned source. Displaying them in the Office does not grant new authority. [3]

| Automation | Existing financial effect |
| --- | --- |
| Manager asking rents | Every 30 game days, eligible product groups can rise at 92% or higher occupancy or fall below 75% occupancy. Adjustments are about 3%, with rounding and market bounds. This does not automatically raise existing lease rents. |
| Staff retention | When policy and request handling permit it, staff can offer 10% off to a tenant leaving over price. Acceptance changes that tenant's lease rent. |
| Manager vendors and carts | Qualifying delayed or urgent repairs can book a $250 simple or $650 complex vendor. Qualifying empty corrals can receive a $180 cart, at most one per corral per game day. In ordinary Business play, these purchases check cash after bills and the recommended reserve. |
| Collections | A Manager sends eligible lien notices even when Automatic lien notices is off. Scheduled resolution can charge $120 for clean-out/donation, or $80 haul-away for a junk auction lot. Policy-driven late fees also apply without a new approval each time. |
| Existing commitments | Payroll accrues at 7 AM. Routine bills settle weekly; scheduled loan payments debit automatically. Hiring commits the business to ongoing wages. |

Manual request review controls customer requests. It does not disable the Manager's separate asking-rent, vendor, cart or lien-notice automation. This distinction should stay visible as the Office develops.

## Decisions that remain open

After reviewing the compact panel, choose which single gap matters most: clearer operating guidance, a better account of delegated outcomes, more visible Office activity, or separately scoped authority controls. Decide whether each can use existing data, what the player would do differently, and how its benefit would be observed. Avoid adding paperwork or repeated confirmations without a useful choice.

## Source and implementation record

[1] Visible project conversation: the compact Office design brief and Eddie's subsequent bounded implementation instruction. These establish scope, not approval of the later proposals above.

[2] Office candidate record: docs/candidates/compact-office-panel-20261024.md. The implementation session records five passing focused scripts. Browser layout and physical Safari were NOT TESTED in that record; this brainstorming document performs no new game verification.

[3] Exact source snapshot: js/officepanel.js; js/ui.js, officePanelHtml; js/data.js, ROLES; js/sim.js, managerTick, requestHandler and consumeOfficeWork. Financial and staffing statements are tied to this snapshot, not to an assumed future build.

Office candidate: 17f49f9d677931460e39ac18aff0db356ae49e45

Parent candidate: d6abaa382c5f495203e6efab6eaacf416e84c301

This standalone document leaves the project handoff, game source, runtime, GitHub, deployments and saves unchanged.
