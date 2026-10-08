# Candidate 32 validation follow-up — no runtime changes

Repository: EezzyE88/self-storage-tycoon-js only.
Branch: validation/menu-save-harness-20261008.
Parent: 24b5c35502388cbb2e292139fd15fb0965499333.
Candidate 32 build remains bplus-section-menu-candidate-32. This is a validation commit, not Candidate 33.
Accepted master verified as 055d2a871945c565c3affbda89ecd46be7a4cfac. No master modifications or merge.

## Live verification and hosting access

Before editing, live GitHub candidate/persistent-section-menu-20261007 and Px's candidate/climate-availability-diagnostics-20261007 both pointed to Candidate 32. The preview source-proof.json identified its commit, tree, master and build correctly. Every one of its 32 runtime files was retrieved with curl, SHA-256 checked against the served manifest, and independently compared against the exact Candidate 32 Git blobs. All matched; see served-source.json. Python urllib initially returned 403; curl successfully retrieved the actual bytes.

Sites get_site returned active, owner access, public audience, version 36 and the existing URL. A new ordinary source write credential was successfully granted (no automatic publish-on-push requested). This verifies access to the supported publishing route, not a new deployment. No hosting source push, version creation or deployment was performed.

Preview: https://sst-js-bplus-fa061565-iphone.rainy-ash-3714.chatgpt.site
Project: appgprj_6ac1995912248191b1c0a51153e182a3

## Changes

- tsection32 defaults to nine current-candidate checks without accessing Git history. SST_C31_HISTORY=1 additionally runs the exact original git-show reproduction from Candidate 31 dbc895cc2d471d3bcd13c36a624da9859e9878a1. No approximated historical code.
- tsave_recovery tracks all autosave promises, drains them explicitly before comparison, and asserts no pending autosave crosses a fixture reset. The full-storage byte assertions and original preservation invariants are retained.
- SST_TEST_AUTOSAVE_DELAY_MS injects a disclosed delay into test compression. SST_TEST_PRODUCTION_AUTOSAVE=1 exercises the actual main.js autosave method rather than the original harness double. Production mode also verifies that stale sessions write nothing and synchronous pagehide saves supersede older delayed saves.
- A new scope check demonstrates that savearchive.unchanged compares the archive and previous-game slots. An independent successful autosave can change the broader localStorage snapshot while those two slots remain byte-identical.
- The exact Candidate 32 save harness is preserved in fixtures/tsave_recovery-c32.mjs.txt, SHA-256 33fa6e7587847da0d97d9fde274f2ff786346469a36ac10d6365cc9335480751. The runner creates a disclosed derivative for the injected-delay reproduction; it never modifies production code.
- The Python standard-library runner makes a temporary source export without Git history and captures complete stdout/stderr, commands, environment, expected exit outcomes and Node version for each process. The optional history reproduction alone runs from the original checkout.

No js/, css/, vendor/, assets, save format, BUILD or production behavior changed. No climate diagnostics were implemented.

## Independent execution

Node v24.19.0. Complete results are in test-results.json. The final matrix checks 43 expected outcomes: 42 successful executions (including two syntax checks), and one deliberately induced original-harness assertion failure. This is not 43 passing regression scripts.

- Original harness: four isolated and eight concurrent natural runs passed.
- Original harness with 100 ms autosave delay: failed with `import / keep current size 3 transient @1/4: "Nothing was changed" only when byte-identical`, as expected.
- Completion-tracked harness: four isolated and eight concurrent runs passed; the same 100 ms delay passed.
- Actual production autosave method: normal and delayed runs passed, including recovery, stale-session and pagehide sequencing checks.
- Twelve regression scripts passed in the no-Git export: section32, layout hierarchy, menu touch, requests, availability, climate grouping, audio, clock, three-floor saves, guidance, visual31 and feedback interactions.
- Exact history-dependent Candidate 31 reproduction passed separately in the Git checkout.

The injected timing reproduction establishes a harness failure mechanism. It does not establish that Px's original persistent @2/4 failure on Node 20.20.1 had this exact cause. Px's lost implementation and logs were not used as validation evidence. No production save-loss defect was demonstrated; production files remain unchanged. Concurrent runs are separate processes with independent in-memory storage doubles, not multiple tabs sharing browser storage.

## Reproduce

From the project root, including a source ZIP without Git history:

    node tests/headless/tsection32.mjs
    node tests/headless/tsave_recovery.mjs
    SST_TEST_AUTOSAVE_DELAY_MS=100 SST_TEST_PRODUCTION_AUTOSAVE=1 node tests/headless/tsave_recovery.mjs
    python tests/headless/run_menu_save_validation.py --output /tmp/menu-save-results.json

For the exact historical reproduction, only in a checkout containing Candidate 31:

    SST_C31_HISTORY=1 node tests/headless/tsection32.mjs
    python tests/headless/run_menu_save_validation.py --history --output /tmp/menu-save-results.json

## Limits and next recommendation

Automated Node/VM, localStorage doubles, DOM fixtures and renderer stubs only. No browser/Safari session, physical-iPhone save stress, GPU measurement or new audio listening. Candidate 32's persistent-menu physical-iPhone PASS remains user-reported. Node 20.20.1 was not independently executed here.

“Nothing was changed” can be read more broadly than the archive operation's verified scope. This report records that wording limitation; the injected cross-fixture test failure is not evidence that production users lost data. A future wording change should remain a separate, justified runtime change.

Next focused gameplay candidate: climate availability diagnostics using unchanged leasing eligibility and outcomes, recording historical conditions separately from current matching climate inventory. Implement only after review of this durable validation commit, then commit evidence before publication. Candidate 32 stays live throughout this phase.
