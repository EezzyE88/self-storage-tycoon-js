# Property acquisition review candidate

Date: October 25, 2026 (America/Los_Angeles).

Implementation source: `6066ff380fa842a9abde3138cea1e702c016bacc`.
Parent: `74a6322b218ec0b5ad3c5577691dd266f59bdabe`.
Branch: `repair/acquisition-review-20261025`.
Status: implemented locally; focused native checks pass; not owner-accepted or browser-accepted.

## Result

Growth acquisition buttons now open a review. The dialog identifies the selected offer and purchasing property, total price, included $5,000 opening working cash and cash left at the purchasing property. Back uses the existing modal close/pause path and spends nothing. Confirm rechecks the current offer, available cash, portfolio limit and property/company identity. Changed terms refresh the review without buying. The pending review is consumed before calling the original acquisition engine, so repeat confirmation cannot buy twice.

Only `js/ui.js` changed in production. The existing `main.js` acquisition engine, prices, ledger, portfolio initialization, simulation, CSS and save implementation remain byte-identical. The UI's preexisting $5,000 disclosure is shared between Growth and the review; regression tests compare it with actual engine credit to the acquired property. No new saved state or economic coefficients.

## Focused validation

- Acquisition review: 14 test groups pass.
- Existing borrowing reviews: 16 test groups pass, compared with exact parent UI/engine.
- Existing Pause policy: 13 checks pass.
- Existing career/portfolio/save suite: 18 groups pass, including acquisitions, transfers and raw/compressed portfolio save round trips.
- Total: 61 passing groups/checks across four scripts. These counts are not a full-gate entry count.
- JavaScript syntax and `git diff --check` pass.
- Confirmed purchases across every offer and Pause/1x/2x/4x match the parent's complete saved acquisition state, ledger, portfolio and clocks. Other cases cover Back, repeat confirmation with ample funds, changed quotes, lost affordability, removed offers, portfolio limit, property changes, nested pauses, manual Pause and markup escaping.

The initial custom harness omitted `cloud` from its VM context and stopped before assertions. Its corrected context and intermediate passing run are retained. The final acquisition log alone establishes the final implementation's acquisition checks.

## Preservation and limits

All 1,574 preexisting source files other than the intentionally changed UI match the retained exact-parent hashes. All 192 files in the recovered native gate remain unchanged. The original 95/95 native PASS belongs to original `f9315b9`, with a tree matching parent `74a6322b`; it is preserved, not claimed for this successor. The full gate was not rerun.

Rendered browser layout, phone touch behavior and physical Safari remain NOT TESTED. Earlier environment blockers remain unresolved; no repeated browser attempts were made. Other findings in the attached playtest are deferred.

Live refs verified before implementation: default master and PR base at `e30430dccb23ae0bbf89789bf17635427a70e4f4`; PR #4 head `74a6322b218ec0b5ad3c5577691dd266f59bdabe`, open/draft/unmerged. No push, merge, deployment or Site changes. Existing normal saves were not opened or altered.

## Next execution unit

In a supported Chromium/WebGL environment, test review, Back, successful purchase, duplicate taps, affordability changes and manual Pause at 375×667 and 390×844 against this exact implementation. Preserve the outstanding automatic-opening/Office acceptance scope separately. Keep physical Safari NOT TESTED unless run on a real device.
