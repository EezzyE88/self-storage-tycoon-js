# Career explanation / expanded-panel clearance successor

Prepared 2026-10-23. Status: focused source/handler checks PASS; rendered phone acceptance NOT TESTED. No deployment or merge.

Exact parent: `df7dd680abfc5e3791f52d71d22ceef70bbe9fb1`.
Branch: `candidate/career-panel-clearance-20261023`.
Build: `v62-career-panel-clearance-20261023`.

## Only behavior change

`#ui:has(.sheet.tall) .career-goal { display:none; }`

Any expanded production sheet hides the career explanation button. Because it is removed from layout, its 54px top margin also contributes no grid space. Closing or compacting the last expanded sheet restores the pre-existing visibility rules. The original bar inside the cash chip stays unchanged; the CSS targets only the separate explanation button. No JavaScript visibility state, save field or new panel is introduced.

The highest-tier explanation follows the same rule. Title/ineligible-mode hiding and the parent's camera-control hiding remain authoritative, so ending an expanded-panel condition cannot expose an explanation otherwise hidden. `display:none` also removes the explanation from focus/accessibility navigation while the panel occupies its space. Actual assistive-technology behavior has not been tested.

## Focused transition review

| Transition / condition | Source-derived behavior |
| --- | --- |
| Eligible company, ordinary map | Existing requirement text and Career action available. |
| Open tall Growth, Operate or Business sheet | Explanation hidden, grid row removed; existing bar remains. |
| Tall sheet → compact sheet | Explanation restored unless another existing visibility condition hides it. |
| Close tall sheet | Same restoration rule. |
| Tall sheet → another tall sheet | Explanation remains suppressed in the resulting panel state. |
| Camera controls remain expanded | Existing camera rule continues to hide it. |
| Title, ineligible property or no eligible career | Existing `hidden` attribute continues to hide it. |
| Keyboard and Finance/Career actions | Parent handlers unchanged; Enter/Space isolation and separate Finance action retained. |
| Pause | Parent panel and speed paths unchanged; no new speed dispatch. |

Production `UI.sheet()` was exercised for Operate, Business and Growth through compact → tall → compact; all produced the expected existing state classes. This validates the class signal consumed by the CSS, not computed visibility, layout or actual touch interaction.

## Executed checks and limitations

- `tcareer_hud.mjs`: PASS, 6 groups (requirements, tiers, eligibility, read-only updates, keyboard isolation, distinct Career/Finance handlers).
- `tpause_policy.mjs`: PASS, 13 existing policy groups, including panel closure and manual Pause preservation.
- `tcareer37.mjs`: PASS, 18 existing integration groups including raw/compressed portfolio saves and career calculations.
- Whitespace check: PASS.
- Exact diff check: `ui.js`, `careerhud.js`, `career.js`, simulation/main-loop/data/finance/numbering/save modules and existing tests remain byte-identical to the parent.
- 375×667 and 390×844 rendered layouts, actual hide/restore transitions, pointer targeting and native keyboard activation: NOT TESTED. Playwright is present; both its Chromium and WebKit executables are absent. No browser or alternative renderer was installed.
- Physical iPhone Safari, VoiceOver and WebGL: NOT TESTED for this successor. Parent or older-build acceptance is not successor evidence. No screenshots are claimed.

The source rule addresses the identified clearance conflict. Rendered acceptance remains outstanding, including whether the explanation is comfortable on the ordinary map and whether panel close/compact restoration is visually stable.

The original candidate, its report and tests are preserved. Master remains outside this branch. Accepted V62 preview, public review deployment, packages and normal saves were not accessed or changed. No simulation, economics, controls, prices, policies, progression, numbering or save-format changes are included. PR #2 and other proposals are excluded.
