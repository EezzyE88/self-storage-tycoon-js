# Automatic Owner simple-repair fallback

Parent: `9b566d8769304985bdb0c4b0d86b4b2bea6cb917`.
Branch: `candidate/owner-auto-repairs-20261019`.

The existing Owner chores policy now includes unassigned corrective `repair_simple` tasks. Staff retain first refusal; existing assignments and vendor bookings remain untouched. The ordinary scheduler still requires quiet-office daytime availability, a route and sufficient remaining daily work hours. Work waiting for capacity stays in the existing task list without booking future hours. Existing eight-hour capacity, office work, travel, half-hour reservations and repair quality are unchanged. In normal business play Owner repairs remain 72% quick fixes. Specialist repairs and preventive maintenance are unchanged; no hiring or vendor spending is automated.

A shared read-only eligibility check lets reserve waiting recognize valid Owner repair coverage despite temporary off-hours, office demand, busy work or exhausted capacity. Disabled Owner chores, unfinished tutorial, absent Owner agent, missing operating office, unreachable work and unsupported repair requirements do not qualify. Existing critical fault, access, power, cash and decision interruptions take precedence. No wait deadline, leasing continuation or save schema changes.

Policy wording and the no-Tech repair explanation describe automatic fallback and its limitations.

## Verification

- `towner_auto_repairs.mjs`: real scheduler assignment/completion, unchanged quick-fix quality, hours and no cash fee; available/busy/exhausted Tech priority; assigned/vendor protection; capacity reset; off-hours/office/customer/busy delays; disabled policy, tutorial, missing agent/office, blocked routes, complex/PM/oversized exclusions; repeated reservation and save/load protection; paused production batch; ordinary simulation/reserve-wait whole-state parity; coverage-loss interruption, explicit Resume and unchanged original start time; exact-minute critical interruption.
- `tstafffirst.mjs`, `tcapacity.mjs`: existing assignment, queue, migration, refund and labor-capacity checks pass.
- `treserve_wait.mjs`, `treserve_wait_continuity.mjs`, `tpause_policy.mjs`: existing coverage, continuity, original deadline, backgrounding, manual Stop/Pause and ordinary-play parity checks pass.
- `tc24_requests.mjs`: 53 request/window checks pass.
- `tproperty_projects_save.mjs`, `tworking_yard_save.mjs`: production raw/compressed save round trips and legacy compatibility pass.
- JavaScript syntax and `git diff --check` pass.

These are headless checks; physical iPhone acceptance of automatic repair behavior is pending. No deployment, push or merge was performed. The Safari preview remains on the parent candidate. No normal user save was loaded or written. Economic coefficients/prices are unchanged; automatically completing previously unattended repairs can intentionally change operating outcomes.
