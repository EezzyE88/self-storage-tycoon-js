# Committed regression baselines

These files are byte-exact copies of earlier source so the headless suite runs from a fresh (even shallow) clone with no Git history lookups.

| File | Source | Used by |
| --- | --- | --- |
| `render-pre-layout-hierarchy.js` | `f2f31b0:js/render.js` (renderer immediately before the candidate-18 framing fix `da4c72a`) | `tests/headless/tlayout_hierarchy.mjs` |
| `candidate19/*.js` | `da4c72a339345fa89a5375014daa2ae17158ef28:js/*.js` (candidate 19, the legacy baseline) | `tests/headless/tthreefloor_parity.mjs` |

Do not edit them; they are reference behavior, not game code.
