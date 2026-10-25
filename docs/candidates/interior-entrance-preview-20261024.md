# Interior entrance route in placement preview

October 24, 2026, America/Los_Angeles. Isolated local branch: `candidate/interior-entrance-preview-20261024`. The commit containing this note identifies the candidate; implementation is not owner acceptance or publication.

Exact parent: `84fe72cb645941465e369cff57715fe38b2f8294`, recovered with original Git identity from the verified Office browser QA package. Parent b7092e0 is the live synchronized Office snapshot; 84fe72c adds the newer waiting-count repair and remains local-only. Live default master was freshly verified as ee39e0986718ce33fb84018a2c108249f793e3f8. Preserve all three identities and the separate fef20fc documentation branch.

## Change

Interior-unit purchase previews now disclose the same entrance/freight route prerequisite used by finished-unit readiness. The shared read-only method uses the existing completed-hall frontage and cart-access distance field. Connected frontage stays valid; disconnected frontage shows `Hallway has no route to a building entrance` in the existing `Will build, but not earn yet` presentation. Pending frontage and broken/missing freight connections use existing readiness reasons. Darkness remains separate. A row reports each distinct prerequisite once.

Staged construction is still allowed: status becomes incomplete, not invalid, and Confirm keeps the existing quote and dispatch behavior. Pending connections do not count as operational access; the disclosure clears when actual completed connectivity passes existing rules. No new UI, permission, navigation, pricing, construction, readiness threshold or save field was introduced.

Only js/sim.js changes in production. The existing access-reason block is factored into interiorRouteIssue and shared with previewing. UI, CSS, camera, economy, finance, role data, save implementations and the repaired Office count remain exact parent bytes. Parent/candidate full simulation state and events matched across 24 controlled floor/lift/frontage fixtures for constructor readiness and each of 120 advancing minutes. That is scoped regression evidence, not whole-game equivalence certification.

## Checks

- New tentrance_preview: 11 groups PASS, including connected/disconnected/dark/pending cases, mixed rows, upper floors, read purity at Pause/1x/2x/4x, unchanged quote geometry/cost/duration/burden, existing UI copy, paused Confirm, camera method guard and ordinary state reload.
- Existing tpause_policy: 13 checks PASS.
- Existing tbuildability: 41 groups PASS.
- Existing tautomatic_opening: 9 groups PASS.
- Existing tbuildability_save: production raw/compressed save/load check PASS.
- Syntax and diff whitespace checks PASS. Original Office logs and count-repair evidence remain unchanged.

Fresh evidence and retained command outputs are in [evidence.json](../qa/interior-entrance-preview-20261024/evidence.json). A first parity-probe fixture had an invalid upstairs unit display number and failed in the parent constructor; corrected using production number allocation, then passed. No production code was changed to accommodate the fixture.

## Limits and next action

Real-browser layout/input, physical Safari and owner acceptance remain NOT TESTED. UI navigation/camera checks here use native methods with renderer/DOM doubles. No browser installation or previously blocked browser route was retried. No normal company save was used.

Next: review this exact local successor against 84fe72c, using the existing external Office browser QA handoff as retained evidence rather than restarting unrelated annual tests. Do not interpret prior Office or upstream playtests as browser acceptance of this change.

No GitHub push, publication, deployment or merge. Master, existing candidate branches, deployments, accepted checkpoints and original recovery packages are unchanged.
