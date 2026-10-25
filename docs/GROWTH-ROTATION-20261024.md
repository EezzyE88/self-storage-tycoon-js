# Growth-return rotation repair

Exact parent: `1774b0fddbefb0491bf220603fdf8a99bcb197fe`.
Branch: `candidate/unit-upgrade-growth-rotation-20261024`.

Only one production line changes: `returnGrowthProposal()` restores `buildRotation` from saved `args.rotation` after `pickTool()` resets it and before requoting. The nullish fallback preserves explicit rotation 0 and the existing behavior for older proposals without rotation. Upgrade selections and exclusions retain the preceding repair.

## Verification

New `tgrowth_rotation_roundtrip.mjs` fails all four explicit-rotation groups on unchanged parent code. It passes after the fix: 32 combinations (four rotations × four lighting modes × cameras off/on), each with two Growth round trips. It compares unit footprints, door directions, interior/outside fixture records, suggestion positions and coverage, deselections, counts, costs, duration and quote stamps. Cash, simulation time, orders, manual Pause, closed-property state and the serialized simulation state remain unchanged by navigation. A proposal without a stored rotation also passes unchanged.

Three affected existing scripts pass: `tunit_upgrade_review_fixes.mjs` (previous three fixes), `tsandbox_reserve_fast.mjs` and `tpause_policy.mjs`. Syntax validation passes for `js/ui.js`. Parent failure output, four successful script outputs, output hashes and new-test hash are retained in `docs/qa/growth-rotation-20261024/evidence.json`.

All other production files, previous tests and evidence remain unchanged from the parent. Prices, maintenance, coverage, power, commissioning, explicit property opening, simulation stepping and save code are not modified. Master, earlier candidates and the published Site are preserved. No deployment or merge.

Verification is native UI-method testing only; no browser, touch-layout, WebGL or physical-iPhone/Safari acceptance is claimed. No full-game test gate was repeated.
