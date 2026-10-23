# Career explanation / camera clearance successor

Prepared 2026-10-23. Status: source checks PASS; rendered phone acceptance NOT TESTED. No deployment or merge.

Exact parent: `16c74b4788976813984196a9524abb790e9192a7`.
Branch: `candidate/career-camera-clearance-20261023`.
Build: `v62-career-camera-clearance-20261023`.

## Confirmed issue and scope

Eddie supplied Claude's `REPORT_md 2.pdf` and crop `IMG_3801.png`. Claude reported an overlap at both 375×667 and 390×844 on exact parent 16c74b4: the closed camera-options button covered the rightmost part of the career explanation. The crop shows the final property count obscured. Claude's environment was isolated Chromium with SwiftShader and fallback fonts; this was not physical Safari or loaded-Satoshi evidence. Its long-cents case was an injected presentation fixture, not evidence of earned company progress. The report's referenced raw logs/screenshots beyond the supplied crop were not available for independent inspection here.

The sole behavior change reserves 52px on the right of the career explanation at widths ≤410px and heights ≥521px. Those are the existing conditions where camera controls stack into the explanation's row. The reservation accommodates the existing 44px camera target plus an 8px gap. It changes the button's width, not just text padding, so the controls also have separate intended hit areas. Camera positioning and sizing are unchanged.

Existing `white-space:normal`, `overflow-wrap:anywhere`, automatic height and full requirement strings remain unchanged. No rounding, abbreviation, line clamp, ellipsis, new max-height or clipping is introduced. The existing measured HUD height can increase as text wraps. Expanded-panel hiding and camera-controls-open hiding are retained exactly. Wider layouts and short landscape do not receive the new width reservation.

With zero horizontal safe-area insets, CSS arithmetic predicts the career right edge at 315px on a 375px viewport, before the camera's reported left edge of 323px; at 390px those edges are 330px and 338px. These are source-derived expectations based on the parent report, not successor browser measurements.

## Executed checks

| Check | Result |
| --- | --- |
| `tcareer_hud.mjs` | PASS, 6 groups: actual limiting requirements, cents, tiers, eligibility, read-only updates, keyboard isolation and separate Career/Finance routing. |
| `tpause_policy.mjs` | PASS, 13 existing policy checks including manual Pause and panel closure. |
| `tcareer37.mjs` | PASS, 18 existing career/progression/portfolio-save groups. |
| Reported long-cents presentation case | PASS at the production presentation-helper level: `Next: Storage magnate` and `Rent roll $36,749.99/$37,500/mo · Eligible properties 3/4`. Input fixture remained unchanged. |
| Exact preservation diff | UI handlers, presentation helper, career calculation, main loop, simulation, economics/data, numbering and save implementations and existing tests are byte-identical to parent. |
| Whitespace | PASS. |
| Rendered 375×667 and 390×844 | NOT TESTED. Playwright is available but its Chromium and WebKit executables are both absent. No browser was installed. |
| Physical Safari, VoiceOver, loaded Satoshi/General Sans, native touch/keyboard and successor WebGL | NOT TESTED. |

The long-cents check used three fabricated eligible portfolio inputs at earned tier 4 with rent rolls 12,000, 12,000 and 12,749.99. Existing `portfolioCareer` and `careerGoalPresentation` produced the string above without mutating those inputs. This verifies exact text production, not visual wrapping, company progression or gameplay pacing. The same source case is the target for both requested phone sizes; no claim of a viewport-specific render is made.

## Focused rendered acceptance still outstanding

At 375×667 and 390×844 in a disposable isolated context:

1. Render the exact long-cents string above, explicitly labeled INJECTED presentation evidence. Verify the entire `3/4` and money amounts remain visible, wrap naturally and do not overlap camera controls, advice or other targets. Do not replace them with rounded or shortened values to pass.
2. Measure career/camera bounds and hit-test their targets. Tap each to confirm separate Career and camera actions; cash must still open Finance.
3. Verify expanded Growth/Operate/Business hides the explanation; compact/close restores it. Camera controls open should still hide it and closing should restore it.
4. Verify Enter/Space and accessible-name behavior, paused open/close and the existing running-speed restore policy. These were externally reported PASS on the parent, not rendered successor results.
5. Label fonts and renderer actually used; keep physical Safari and VoiceOver NOT TESTED unless directly exercised.

The original candidates, packages and their reports remain intact. Master, accepted V62 preview, public review Site and normal saves are outside this candidate and untouched. PR #2, other director proposals and the parked milestone-wait feature remain excluded.
