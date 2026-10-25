# Optional unit lighting and shared security

Isolated successor of exact `b89d711c9a89ce49229fae5888c1d94b7b1666d4`.
Branch: `candidate/unit-lighting-security-20261024`. No deployment or merge.

## Player behavior

Ordinary Sandbox construction review offers None (default), Interior, Outside wall and Both, plus an independent outside-camera option. Suggested wall lights/cameras share frontage coverage and count existing working coverage. Pending installations are disclosed and not duplicated. Individual suggestions can be deselected without replacement suggestions being silently added. Fixtures and their coverage are previewed before Confirm.

Interior light: $75 construction/$100 retrofit, $0.03/day base expense, 0.02 kW, 30 game minutes. Private illumination appears when inspecting the unit/fixture or when a customer accesses the unit. No rent, demand, shared-security or hallway-readiness bonus; routine upkeep is included with no separate bulb task.

Wall light: $100 construction/$150 retrofit, $0.35/day base expense, existing 0.2 kW load, 60 installation minutes. Standalone lights now cost $200, also $0.35/day, and both wear at half the prior base rate (0.003 instead of 0.006 per game day before existing random/difficulty factors).

Mounted and standalone cameras cost $500. Mounted retrofit also $500; existing $0.35/day base upkeep, 0.05 kW, wear, repair work and outcomes remain. Mounted installation adds 120 minutes. No separate camera-pricing discount.

Outside fixtures face the unit's hallway or drive aisle. They use the existing 3.2-cell light and 5.5-cell camera radii. Mounted coverage is restricted to the mounting side, same floor/building region and unobstructed shared space. Walls, tenant interiors and blocked diagonal corners stop coverage. Standalone coverage stays unchanged. Shared preview masks and simulation use the same function.

Outside light/camera maps feed existing security scoring without stacked camera bonuses or changed crime formulas. Hallway-facing lights satisfy the existing lighting threshold; private lights/cameras do not replace hallway lights. Drive-up readiness gains no lighting prerequisite. Power allocation, priorities and over-capacity warnings retain existing behavior; attachments have separate power status from the host unit.

Construction uses one order/charge, existing rush and refund rules, and includes installation time. Confirmation rejects stale changed fixture packages and requests renewed review. Reserve waiting identifies the exact lighting/camera/deselection choice and quotes its complete burden.

Vacant, unreserved operating units can review retrofits through their inspector. Confirmation creates an installation order and a rental hold without resetting make-ready status. Completion/cancellation clears the hold and rechecks existing access rules. Installed fixtures are omitted from repeat purchases. Active customers, current retrofits, occupied/reserved units and teaching/scenario modes are excluded. Tutorial and lesson flows remain unchanged.

Outside fixtures use normal repair jobs, Owner/Tech/vendor choices and capacity. Mounted cameras extend the candidate's reachable light-service-point method. Demolition warns about attached fixture/neighbor coverage loss and cleans up jobs. Existing split renovation reassigns attachments to replacement units to avoid orphaned equipment.

Manual Pause is authoritative. Review/load/poll never advances installation, purchases or commissions. Existing popup speed restoration remains. Property opening is always explicit. Save fields are additive attachment/retrofit records; no old-save fixture purchase, refund or automatic repair is applied. Existing saved condition is preserved; lower light wear applies prospectively. Normal expense differences are intentional, not exact economy parity.

## Validation and limits

17 focused native scripts PASS, including two new scripts for combinations, shared/deselected/pending coverage, stale quotes, construction, refund rules, real hallway readiness, private-light exclusion, retrofit lifecycle, normal repairs, power shedding, demolition, reserve selection identity, UI review/Pause, Three.js CPU meshes and production save validation. Existing affected readiness, Pause, buildability/save, reserve, staff/capacity, request and maintenance scripts also pass. Output, hashes and retained failure evidence are in `docs/qa/unit-upgrades-20261024/evidence.json`.

The existing passing assertions were not weakened. Thirteen inherited scratch test copies had a single extra terminal newline; canonical parent bytes were restored without assertion changes.

This is native simulation/UI-method and CPU geometry evidence only. No browser, WebGL, touch layout, actual lighting appearance, performance or physical-iPhone/Safari acceptance is claimed. No browser retry, deployment, merge or full 95-test gate was performed. The published review Site remains b89d711.

No outlets, tenant-demand feature, rent premium, camera feed, general lighting rewrite or unrelated economy changes.
