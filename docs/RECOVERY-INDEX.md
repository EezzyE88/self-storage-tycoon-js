# Recovery and evidence index

October 24, 2026, America/Los_Angeles. Recovery records do not authorize rollback, deployment or company-save replacement. Current authority and release status: [CURRENT-STATUS.md](CURRENT-STATUS.md).

## Exact source recovery

| Role | Identity and recovery location |
| --- | --- |
| Observed master | `ee39e0986718ce33fb84018a2c108249f793e3f8`; reverify live before actions |
| Intended upstream | `d6abaa382c5f495203e6efab6eaacf416e84c301`; existing GitHub candidate |
| Original Office | `17f49f9d677931460e39ac18aff0db356ae49e45`; [incremental bundle](checkpoints/20261024-sync/SST_Office_17f49f9.bundle) |
| Original Office parent | `d6abaa382c5f495203e6efab6eaacf416e84c301`; required prerequisite for incremental bundle |
| Office full tree | `e01001568901f3554163e5d5919ff9a678a629d2` |
| Source-identical GitHub snapshot | `b7092e08d89fcd882c5d2d82db6ac1eb7631af42` on `snapshot/compact-office-panel-17f49f9-20261024` |
| Documentation successor | `maintenance/project-sync-20261024`; no new runtime changes |
| Protected V62 | Snapshot `0385af259c35058da69ed7d6cbb29e2ab7619abb`, historical original `b2c55a6ee9033e5b52dbb253fe61689ba5f71f11` |
| Protected solid build | Original `2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d`; original checkpoint retained in full handoff |
| Historical accepted V60 | Original `7346fb686c86801556fb918d27b62a427cd293fe`; current preserved snapshot `cea7061be2d7b32863c895afc26f2bd8f4d58429` |

The snapshot commit is not the original 17f49f9 object. To recover the original, clone/fetch the upstream repository into a separate directory so d6abaa3 exists, run `git bundle verify` on the incremental bundle, then fetch its advertised `HEAD` into a new local recovery branch. For example: `git fetch /absolute/path/SST_Office_17f49f9.bundle HEAD:refs/heads/recovered-office-original`. Verify HEAD, parent and tree against the table before use. Do not force an existing branch or replace normal saves.

The original 7346 Git object was absent from the current clone during full-handoff creation; do not claim it is included merely because its snapshot is present. Original 2096 was independently recovered from its preserved checkpoint package. Source history cannot reconstruct Eddie's latest private company.

## Persistent package and runtime

- [Original complete project handoff](https://chatgpt.com/library?file_id=libfile_812d5ddabf948191b219d443b3a7fb25&account_id=personal — 93,939,499 bytes; SHA-256 `bd71b80721bf4f3a785e071355a4524d72b49818a093af7c6a6995ae2c1ffbda`. Unchanged; current housekeeping is a supplement, not a rebuilt package.
- The full handoff contains the original adopted runtime DOCX unchanged, its complete 118-paragraph transcription, full reachable history, 977 source files, verifier and retained external evidence. Original runtime DOCX SHA-256 `c0641276c847bec7a4b366edb33ce81cc416433d2064fc2e66b30736048b219f`.
- The historical runtime text and package statuses describe their capture date. Current synchronization does not rewrite that historical evidence.
- [Office brainstorming](https://chatgpt.com/library?file_id=libfile_137d78520468819192696f115462db63&account_id=personal) and [one-page Office design brief](https://chatgpt.com/library?file_id=libfile_b4f37c0965948191ad737d0139b9aab2&account_id=personal) remain proposals. Exact DOCX bytes and readable Markdown are also retained under `design/office/`.
- [Independent recovered-state report](https://chatgpt.com/library?file_id=libfile_f971a82f2e488191a18732a540e800bb&account_id=personal) and [recovery status](https://chatgpt.com/library?file_id=libfile_74896a59e3088191a7424fec2849e317&account_id=personal) are historical recovery evidence. Their local-only/no-push wording describes those tasks, not the later authorized snapshot synchronization.

## Collaborator evidence

[d6abaa3 Claude and Grok playtest package](https://chatgpt.com/library?file_id=libfile_fdc87bc65eb08191b5247d0323cf9a2d&account_id=personal) retains previous reports and current assignments. The package source and older annual results must not be conflated. The [Director evidence package](https://chatgpt.com/library?file_id=libfile_eeaf9a36ae5c8191b9bc5de572b61ed1&account_id=personal) and [separate PDF](https://chatgpt.com/library?file_id=libfile_abd1452238308191bf910ba085697803&account_id=personal) concern older 6d7b51e. Recovery reports record CRC checks, PDF byte equality and year-three evidence; those tasks did not establish Office browser acceptance. No new annual or upgrade simulation was run in this cleanup.

## Checkpoint verification

[INVENTORY.json](checkpoints/20261024-sync/INVENTORY.json) records observed source refs, deployment identities/access and artifact hashes. The original Office bundle is 14,250 bytes with SHA-256 `b476d493d65d28c765982e3f0661ed62c487ebad6092ab2577d18cca9c626b49`. [The patch](checkpoints/20261024-sync/SST_Office_17f49f9.patch) is a secondary human-readable backup; applying it would create a different commit identity.

Five Office script logs and parent-preservation hashes stay under `qa/compact-office-20261024/`. These are retained results, not new execution. The complete source-tree equality validates the snapshot transfer; it does not establish browser behavior or acceptance.

Previous orientation documents are preserved verbatim under `history/before-project-sync-20261024/`. Older checkpoints remain evidence with dated scope. No historical source object, deployment or company save was replaced.
