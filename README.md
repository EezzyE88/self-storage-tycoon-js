# Self Storage Tycoon

An iPhone Safari game about operating and growing a self-storage business. Build a useful property, understand its costs and customers, delegate routine work and invest for visible payoff.

## Start here

- [Current status](docs/CURRENT-STATUS.md): source identities, deployment records, evidence and unfinished work.
- [Handoff](docs/HANDOFF.md): continuation instructions and scope.
- [Recovery index](docs/RECOVERY-INDEX.md): exact original commits, packages and checksums.
- [Project overview](docs/PROJECT-OVERVIEW.md): product direction and finish target.
- [Synchronization checkpoint](docs/checkpoints/20261024-sync/CHECKPOINT.md): October 24 reconciliation and source-preservation details.

## Current source and integration

Latest game source is exact **137909c1fe88b90d14af725854672d87c2ec2acd**, including Office counts, entrance-route disclosure and explicit borrowing review. The integration retains Office planning/docs from fef20fc with unchanged runtime. Exact original repair commits are preserved in a small incremental recovery bundle; connector synchronization has a separate Git SHA.

**Master merge is held:** the required current native gate completed with **67 PASS, 10 FAIL, 18 ERROR**. Master was freshly observed at ee39e09 and was not moved. [Integration checkpoint and failure evidence](docs/checkpoints/20261025-borrowing/CHECKPOINT.md). Eddie's update/merge/push authorization is recorded; failed checks are not silently promoted as a pass.

## Review deployment

[Separate borrowing playtest](https://sst-borrowing-137909c-playtest.rainy-ash-3714.chatgpt.site/) is recorded as V1/public, but anonymous HTTP returned 403 and external tester access remains unverified. Source/hosting provenance and the distinction from cloud-Chrome WebGL failure are in Current status. Existing Open House, private fast-reserve and protected V62 deployments were not changed by this integration.

## Development and preservation

Static browser ES modules with vendored Three.js; serve over HTTP. Relevant checks live under `tests/headless/` and browser evidence under `docs/qa/` and `docs/releases/`. No compilation step is required.

Use isolated branches and verify live refs before further work. Preserve manual Pause, camera position, simulation, economics, accepted checkpoints and normal saves. Backups contain source, not Eddie's latest playable company. Office brainstorming and the [one-page design brief](docs/design/office/Office-Design-Brief-20261024.md) remain proposals; synchronization does not authorize implementation. Coastal remains rejected; PR #2 remains excluded.

Earlier orientation documents are retained verbatim under `docs/history/`.
