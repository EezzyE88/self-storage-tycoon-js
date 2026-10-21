# Recovery and retained-artifact index

Updated October 19, 2026, America/Los_Angeles. Repository: EezzyE88/self-storage-tycoon-js only.

## Restore targets

| Priority and purpose | Exact game commit | Hosting record | Use |
|---|---|---|---|
| Protected solid build | 2096ef6bcae9ddf4d2dc5b71c40e2beb5e21429d | Version 57; hosting 9f8dacf633d665681ed715d8a27eb546dd8eb9e5 | Immutable original recovery baseline; retain separately |
| Current accepted preview | 7346fb686c86801556fb918d27b62a427cd293fe | Version 60; hosting 71601f7ce298e019342798c738d9662aebfca898 | Current working continuation; includes financing repair and title-tap hotfix |
| Guidance intermediate | 21e980e880439a883e0814b90cd8850bb76b6a42 | Version 58; hosting 2f1c246321373e205db140e529d873cbd7d63096 | Historical comparison, not preferred restore |
| Financing intermediate | a721fcefc43daae06c4086e3c60823044527173b | Version 59; hosting b6dbedbde90187d773dacd5c1c1941687278c9c7 | Contains known title-tap regression; do not restore as working release |

GitHub master remains e04a808dd1cac558b9e97e8cd5f021f874ac7cfe. It is older than the intended preview stack and is not a substitute for either checkpoint. No master merge or game-repository push is implied by this index.

## Durable packages

| Filename | Role |
|---|---|
| SST_JS_Solid_Build_Checkpoint_2096ef6_20261019.zip | Original immutable protected checkpoint: complete history, exact source and version 57 publication archive |
| SST_JS_Accepted_V60_Checkpoint_7346fb6_20261019.zip | New self-contained current checkpoint: complete history preserving the exact accepted commit, clean source with updated records, version 60 publication archive, verification and checksums |
| SST_Investment_Guidance_Repair_Spec_2096ef6.md | Implemented repair contract; not a current source snapshot |
| SST_Investment_Guidance_Candidate_21e980e_20261019.zip | Guidance diff, evidence and incremental history |
| SST_Financing_Presentation_Candidate_a721fce_20261020.zip | Historical financing candidate; known startup regression corrected in version 60 |
| SST_Title_Tap_Hotfix_7346fb6_20261020.zip | Hotfix diff, focused validation and incremental history |

Legacy filenames ending 20261020 use the UTC creation date; the development/acceptance session occurred October 19 Pacific. Preserve filenames and original files rather than renaming evidence or overwriting the protected checkpoint. No old package, branch, report or screenshot is deleted by this cleanup.

## Safe recovery

Verify package checksums and the complete source-history.bundle. Recover into a new empty directory; never overwrite master or an existing worktree. The bundle contains exact accepted 7346fb6 and protected 2096ef6 as well as the documentation-maintenance child. The package's CHECKPOINT.md records its exact maintenance SHA and clone instructions.

For an exact version 60 build, check out 7346fb686c86801556fb918d27b62a427cd293fe. For current documentation with identical runtime bytes, use maintenance/status-cleanup-20261019. Keep both identities explicit. Incremental candidate bundles require their stated parent objects; the self-contained checkpoint removes that dependency for recovery.

Restoration and publication are separate actions. Before any later deployment, verify current live identity and stop if newer intended work would be displaced. Publish through the supported existing Sites project and verify served bytes; Sites hosting commits do not replace game-source identities.

These packages contain source, tests, records and static hosting output. They contain no exported copy of Eddie's playable company. Do not claim source recovery restores browser storage or a normal save.
