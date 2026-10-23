# Rotate hint and short-screen review — 2026-10-23

Isolated successor of `58d11b1e3498165865553805282c91bcbd6bde51` (`v62-open-house-integrated-20261022`). Build name `v62-open-house-rotate-review-20261023`. Not merged, not deployed. Master, the original candidates and accepted V62 are untouched.

## Scope

Only the two defects confirmed in the 58d11b1 review:

1. **Invalid-placement hint.** During the lesson's expansion step, the action bar said "Try Flip doors or move the row beside the aisle." The control is Rotate. It now says "Tap Rotate or move the row beside the aisle." (`js/ui.js`, one string, plus a `tut-hint` class).
2. **Cramped review at 375×667.** The review body between the title row and the price row was 31 px tall, so "Cash after build" needed scrolling. With an invalid placement it was 0 px, so neither the reason nor the Rotate hint was on screen.

## Change

CSS only, inside `@media (max-width:700px) and (min-height:521px) and (max-height:740px)` (short portrait phones; 390×844 and taller are outside it):

- Price, Rotate and Confirm share one row (the price block has a 96 px minimum and its detail text wraps). Extra buttons such as Climate still wrap to a second row.
- Review body order: lesson hint, then validity status, then money facts, then the reminders (yellow-edge note, payback details, refund note). This is visual order only; the markup is unchanged.
- Slightly tighter title row and status padding; review notes at 13 px / 1.35.
- While a placement is under review, the lesson card's long how-to scrolls inside four lines (64 px). Before a placement exists (the instruction check in T4) it keeps its existing 160 px limit.

The 150 px yard budget that keeps the placement visible above the action bar is unchanged.

Unchanged: simulation, economics, placement rules, controls and their handlers, unit numbering, saves, banner policy (`js/showcase.js`), and every layout at 390×844.

The Builder's handbook entry for drive-up units still says "use Flip doors if needed" (`js/handbook.js`). It is not the invalid-placement hint and was left out of scope.

## Corrected acceptance checklist

The 58d11b1 checklist row T2 asked for a visible "Part 2 of 8 complete" banner. The source deliberately keeps celebrations off screen while the tutorial is on (`bannerBlocked()` includes `tut.on`; a queued banner waiting more than 20 s is dropped). This behaviour was also present in 1339648. T2 is therefore split:

| Row | Requirement | How it is checked |
|---|---|---|
| T2a Numbering | The completion text and later cards use the live unit number (for example "Turn over Unit 1007", "Part 2 of 8"). | `ttutorial_guidance.mjs` production banner handler; DOM content of `#celebrate`; the next card and inspector agree. |
| T2b Banner policy | While the tutorial is on, the completion banner is **not** shown and does not hold time. After the tutorial ends, banners show normally. | `#celebrate` never gains `on` while `tut.on`; speed is not held by a waiting banner. A visible banner during the tutorial is a failure of policy, not a pass. |

Other rows for this successor:

| Row | Requirement |
|---|---|
| W1 | Invalid lesson placement: hint names Rotate, never "Flip doors"; Confirm stays disabled. |
| W2 | At 375×667 the hint is fully visible without scrolling. |
| R1 | At 375×667, valid review: status line and "Cash after build … Available after bills & reserve: $…" fully visible without scrolling; price and Confirm visible; the rest of the review reachable by scrolling. |
| R2 | 390×844 review geometry is identical to 58d11b1. |
| R3 | Other action-bar reviews at 375×667 (drive-up, interior with Climate, aisle) keep every button on screen with no horizontal overflow. |
| C1 | Confirm still builds the same units for the same cost. |

Evidence for these rows is in the project files under `reports/rotate_review/`.
