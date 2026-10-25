# Unit-upgrade review repairs

Exact parent: `6e278d65d5ed5de6a5bf24e5daa36df857f0dda6`.
Branch: `candidate/unit-upgrade-review-fixes-20261024`.

Only the three reviewed findings are repaired:

1. Lighting and camera control changes retain fixture exclusions in both construction and retrofit review. Off/on changes do not silently repurchase deselected fixtures. Starting a new selection retains its existing default-reset behavior.
2. Return from Growth restores the saved lighting mode, camera selection and a copied exclusion list before requoting. No purchase or time advance is performed by returning.
3. Construction planning reevaluates existing working mounted light/camera coverage with the proposed unit footprints as blockers. Existing standalone coverage keeps its original radius, region, floor and light-condition rules. Retrofit geometry is unchanged and continues to use current derived maps. New suggestions, coverage notices and the reviewed quote therefore no longer count a mounted sightline that the new unit would obstruct.

Production changes are limited to `js/ui.js` and `js/unitupgrades.js`. Prices, wear, repair actions/outcomes, power priorities, simulation stepping, property opening, save serialization and standalone coverage code are unchanged from the parent. No new features, deployment or merge.

## Verification

The new `tunit_upgrade_review_fixes.mjs` failed four affected groups on unchanged parent production code (construction deselection, retrofit deselection, Growth restore, obstructed existing coverage); its unchanged-coverage control passed. The repaired source passes all five groups. The Growth assertion was then strengthened to verify exclusion arrays are not aliased to the actual saved proposal; no failing assertion was removed.

Six focused scripts pass:

- `tunit_upgrade_review_fixes.mjs`: three findings, both deselection contexts, no-purchase review boundaries, manual Pause and closed-property preservation in the exercised paths, actual Growth navigation, shadowed vs unobstructed mounted coverage and unchanged standalone behavior.
- `tunit_upgrades.mjs`: existing upgrade purchase/refund, retrofit, security, maintenance, power, readiness, UI/Pause and save checks.
- `tunit_upgrade_render_save.mjs`: existing Three.js CPU preview geometry, private illumination, production save validation and attachment ownership.
- `tsandbox_reserve_fast.mjs`: affected Sandbox review/reserve controls and clock behavior.
- `tpause_policy.mjs`: existing manual Pause protections.
- `tautomatic_opening.mjs`: existing readiness and explicit property-opening protections.

Retained parent failure output and successful stdout/stderr with verified SHA-256 hashes are in `docs/qa/unit-upgrade-review-fixes-20261024/evidence.json`. Existing tests and prior evidence are unchanged. Syntax checks passed for the two changed production modules.

These are native simulation/UI-method and CPU geometry checks, not browser, touch-layout, WebGL or physical-iPhone/Safari acceptance. No unchanged full-game test gate was repeated. The published Site remains untouched.
