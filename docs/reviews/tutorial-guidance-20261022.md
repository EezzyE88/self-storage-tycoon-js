# Open House tutorial guidance repair — 2026-10-22

Status: automated checks PASS; rendered layout and physical iPhone Safari acceptance HOLD / NOT TESTED. No deployment or merge.

## Authority and isolation

- Repository: EezzyE88/self-storage-tycoon-js.
- Base: published numbering candidate `1339648652cf61bfce23a96a60cbb54a7006c32a`.
- Branch: `candidate/tutorial-guidance-20261022`.
- Public review `source-proof.json` fetched during this task still names 1339648 and parent 9700d9d. Its URL retains the older 23a68ba name.
- Master observed at `f6e4c1eace1720dc703d8cd5758626b158b6aa03`.
- Accepted V62 snapshot: `0385af259c35058da69ed7d6cbb29e2ab7619abb`.
- Separate unpublished F2 context candidate `4f2929ab85c3ae01f379e9115e19dae2831911ee` is not included or modified.

## Findings verified against the base

Claude's uploaded package contains 43 screenshots, reports, a driver and served-source evidence. All 51 manifest entries matched their checksums when inspected in this conversation. Its reported gameplay is external test evidence, not a locally repeated playthrough.

| Finding | Verification | Repair |
|---|---|---|
| Completion banner says Unit 107 | `showcase.js` reads raw BEATS title; `curBeat()` already translates card titles using the saved role reference | Extract and reuse the same read-only text translation for completion and next-part banner titles |
| Speed controls described as top right | Both tutorial strings disagree with the HUD and screenshots | Say top left in both strings |
| Flip doors named instead of Rotate | Expansion instruction disagrees with current action bar, shown in screenshot 015 | Name Rotate |
| Pointer overlaps build price | Screenshot 016 shows caption on price; existing blocker list omits the complete action bar | Measure actual caption, check complete panel/control surfaces, keep it within viewport, hide optional caption when neither side is clear; retain ring |
| Instructions truncated | Screenshot 015 visibly ends in ellipsis; `.how-line` uses three-line clamp | Remove clamp, wrap text, allow long instructions to scroll within 24dvh / 180px; remove collapsed-title ellipsis |
| Repair pin described as red | Current `.pin.repair` colour is orange `#d9731a` | Say orange |

The legacy 107/203 strings remain authored identifiers inside tutorial text; display translation resolves their actual saved unit numbers. Neither numbering nor authored object-role identity changes.

## Implementation boundary

Runtime changes are limited to `js/tutorial.js`, `js/showcase.js`, `js/ui.js` and `css/game.css`. No simulation, economics, dispatch, input handlers, placement, tutorial completion predicates, pause rules, progression, numbering allocation, save/load or renderer files changed. The ring retains its existing target and gesture suppression. Tutorial-card buttons need no redundant caption.

Not included: post-tutorial goals, leasing rates, clock behaviour, owner-request timing, request navigation, interruption state, F2 visibility or camera framing.

## Validation

Logs and command results: `docs/reviews/tutorial-guidance-20261022/`.

- `ttutorial_guidance.mjs`: six groups passed. Exercises production banner handler, live role-number substitution, unchanged state, caption geometry at 390×844 and 375×667, actual updateGuide method with DOM doubles, blocked captions, viewport edges, caption recovery and gesture suppression.
- `tblueprint.mjs`: 26 blueprint/recovery checks passed.
- `tunitnumbering.mjs`: nine numbering/migration groups passed.
- `tunitnumbering_vertical_legacy.mjs /absolute/9700d9d-checkout`: native parent construction-phase migrations passed. First invocation omitted its required path and failed before testing; corrected invocation passed. This was a harness invocation error, not a game defect.
- `tunitnumbering_parity.mjs /absolute/9700d9d-checkout`: parent gameplay and scenario parity passed, including the script's three-seed 30-day comparison.
- `tpause_policy.mjs`: 13 pause-policy checks passed.
- `tsandbox_build_pause.mjs`: placement/Confirm checks passed.
- `tbuildability_save.mjs`: production raw/compressed save restoration passed.
- `tsave_recovery.mjs`: 14 save-recovery checks passed.
- JavaScript syntax and git whitespace checks passed.

### Limits

Both requested dimensions were tested with rectangle calculations and DOM doubles. These do not establish CSS layout, touch scrolling or rendered readability. The prior managed-browser security-policy rejection remains in effect; no alternate browser path was used to bypass it. Rendered browser checks at both sizes, a full opening playthrough of this repaired candidate and physical iPhone Safari remain NOT TESTED.

Claude's previous Chromium session covers the unmodified base, not this repair. It does not become Safari evidence. No actual user save or browser storage was opened by this task.

## Remaining acceptance

Run the opening tutorial on this exact candidate in a supported browser at both dimensions. Check full instructions and scroll reachability; price, cash-after and Confirm visibility; completion banner number; guidance on Got it and Keep playing; portrait viewport edges and a font-load change. Then check physical iPhone Safari. Hold deployment/merge acceptance until those visual checks pass. Existing previews remain unchanged.
