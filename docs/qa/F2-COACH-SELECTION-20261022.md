# Cross-floor coach selection repair

Isolated successor of exact `4f2929ab85c3ae01f379e9115e19dae2831911ee` on `candidate/f2-coach-selection-20261022`. No deployment or merge.

## Confirmed regression and scope

The parent calls `select()` before switching to the coach target's floor. Its active-floor guard rejects the selection. For upper-floor targets the view then switches but no inspector opens; F1 targets also fail when viewing an upper floor because the old routing condition excludes ground-floor targets.

Only `UI.runCoach()` changes at runtime. It resolves the existing object, cart or dirt target, switches to that floor first (including F1), then selects it. A same-floor target does not cause an unnecessary switch. Existing completed-floor validation for upper targets is retained. Project and tab coach actions are unchanged. The active-floor guard, building context, cutaways, camera methods and explicit controls are unchanged. Existing selection auto-pan remains in place; this repair introduces no new camera behavior.

Renderer, simulation, economics, floor numbering, internal IDs, relationships, save/export/import/Continue and storage code are byte-identical to the parent. No normal saves are opened or written.

## Executed checks

- `node tests/headless/tcoach_floor_selection.mjs`: PASS. 32 routes from Exterior/F1/F2/F3 to native three-floor units, dirt references, office and a cart. Checks target floor, retained selection, switch-before-select order, same-floor behavior and byte-identical complete simulation state. The exact parent handler reproduces the rejected selection for both F1-to-F2 and F2-to-F1.
- `node tests/headless/tfloor_context.mjs`: PASS. Mixed one-/two-/three-storey buildings across Exterior/F1/F2/F3 and four rotations; visible lower-building context, active-floor-only selection and inspection, manual camera preservation, Exterior/F1 parity, rebuild stability and complete-state isolation.
- `node tests/headless/tthreefloor_save.mjs`: PASS. Native SST0/SST1 export/load, construction save checkpoints, atomic rejection and no repeated charges. Its imported three-floor gameplay suite also passes all 12 checks.
- `node tests/headless/topenhouse_qa.mjs`: PASS, seven checks.
- `node tests/headless/tgestures.mjs`: PASS, 12 checks.
- `node tests/headless/tunitnumbering.mjs`: PASS, nine groups.
- Syntax checks for the changed UI and new regression test, and `git diff --check`: PASS.

The UI regression uses real UI handlers with minimal DOM/renderer stubs and disposable native simulation state. The scene test uses real Three.js scene graphs with Canvas/GPU stubs. Physical iPhone, Safari pixels and GPU performance remain NOT TESTED. The earlier report's two pre-existing frozen-baseline assertion failures are not fixed by this narrowly scoped change or claimed to pass here.

## Protected state

Before implementation, live master was `f6e4c1eace1720dc703d8cd5758626b158b6aa03`, and the F2 repair branch remained at exact `4f2929a`. Accepted Site remained version 62 with update timestamp `2026-10-21T06:33:54.527842Z`. These protected targets are not modified. No Sites publication is performed; the existing review Site does not acquire this successor through a branch commit.
