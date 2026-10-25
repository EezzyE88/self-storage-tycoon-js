# Office coverage count correction

Parent: `b7092e08d89fcd882c5d2d82db6ac1eb7631af42`.
Isolated local branch: `candidate/office-coverage-counts-20261024`.
Status: implemented and focused native checks passed; not published, merged or accepted.

## Change

Only `UI.officeCoverageHtml` changes in production. Count queued customers whose existing agent service timer is positive as being served; show the remainder as waiting. Both covered and uncovered messages now report these separately, matching the compact Office row. For one waiting customer and one already receiving service, the existing coverage destination now reads `1 waiting · 1 being served`, rather than `2 waiting`.

Existing server eligibility, business/tutorial visibility guards and the Clerk hire shortcut are unchanged. No new state, scheduling, financial action or authority control is introduced. All other UI methods and all 976 other existing files byte-match the parent, including simulation, economics, save modules and original Office evidence.

## Focused verification

Fresh disposable native probe: 48 combinations across empty/waiting-only/served-only/mixed queues, Owner/Clerk/uncovered coverage, and Pause/1x/2x/4x. Count labels match known fixture values and the Office row. Serialized simulation state, events and speed remain unchanged. Closed-business and unfinished-tutorial guards also pass. The ad-hoc probe remains outside repository tests; no test-suite files were changed.

Existing `toffice_panel.mjs`: 9 groups PASS. Existing `tpause_policy.mjs`: 13 checks PASS. UI syntax, diff whitespace and source-preservation checks pass. Fresh results are recorded in [evidence.json](../qa/office-coverage-counts-20261024/evidence.json); previous logs remain untouched.

## Remaining scope

Browser layout/interaction and physical iPhone Safari remain NOT TESTED. The earlier cloud-browser localhost connectivity failure and file-protocol security block were not retried or worked around. This count repair does not resolve those verification gaps or certify the entire upstream candidate chain.

No push, Site publication, deployment, merge or normal-save access occurred. Master, synchronized source/documentation branches, proposals, existing deployments and accepted checkpoints are preserved. Current project orientation remains separately recorded on `maintenance/project-sync-20261024`; this isolated successor intentionally starts at the requested Office snapshot.
