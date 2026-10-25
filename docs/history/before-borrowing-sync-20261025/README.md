# Self Storage Tycoon

An iPhone Safari game about operating and growing a self-storage business. Build a useful property, understand its costs and customers, delegate routine work and invest for visible payoff.

## Start here

- [Current status](docs/CURRENT-STATUS.md): source identities, deployment records, evidence and unfinished work.
- [Handoff](docs/HANDOFF.md): continuation instructions and scope.
- [Recovery index](docs/RECOVERY-INDEX.md): exact original commits, packages and checksums.
- [Project overview](docs/PROJECT-OVERVIEW.md): product direction and finish target.
- [Synchronization checkpoint](docs/checkpoints/20261024-sync/CHECKPOINT.md): October 24 reconciliation and source-preservation details.

## Current source

The latest implemented Office source is original commit `17f49f9d677931460e39ac18aff0db356ae49e45`, on parent `d6abaa382c5f495203e6efab6eaacf416e84c301`. GitHub snapshot `b7092e08d89fcd882c5d2d82db6ac1eb7631af42` has the exact same complete file tree. It is a separately identified snapshot, not the original Git commit. The exact original is retained in the recovery bundle.

This documentation branch is `maintenance/project-sync-20261024`. Master was freshly observed at `ee39e0986718ce33fb84018a2c108249f793e3f8`; this cleanup does not merge it or declare new owner acceptance. Office is not deployed. Its browser layout and physical Safari remain NOT TESTED; previous five focused scripts passed.

## Playable deployments

| Role | Latest recorded version | Link |
| --- | --- | --- |
| Owner-private review of d6abaa3 | V4 | [Fast-reserve review](https://sst-fast-reserve-3c92a5e-review.rainy-ash-3714.chatgpt.site) |
| Public Open House review | V6 | [Open House](https://sst-v62-open-house-23a68ba-review.rainy-ash-3714.chatgpt.site) |
| Protected original preview | V62 | [Original preview](https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site) |

Deployment success and access metadata were checked October 24. Source mappings and their verification limits are in Current status. Historical URL slugs and Site descriptions do not identify current game source.

## Development and preservation

Static browser ES modules with vendored Three.js; serve over HTTP. Relevant checks live under `tests/headless/` and browser evidence under `docs/qa/` and `docs/releases/`. No compilation step is required.

Use isolated branches and verify live refs before further work. Preserve manual Pause, camera position, simulation, economics, accepted checkpoints and normal saves. Backups contain source, not Eddie's latest playable company. Office brainstorming and the [one-page design brief](docs/design/office/Office-Design-Brief-20261024.md) remain proposals; synchronization does not authorize implementation. Coastal remains rejected; PR #2 remains excluded.

Earlier orientation documents are retained verbatim under `docs/history/`.
