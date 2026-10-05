# Committed compatibility fixtures

These fixtures remove all Git-history requirements from the complete headless suite.

- `legacy-layout-render.js`: byte-for-byte `js/render.js` from repository commit `f2f31b05519f831e5f13783de7fabe83afc4a4cf`, the parent of the framing change `da4c72a339345fa89a5375014daa2ae17158ef28`. The formerly referenced `54d432f` is absent from remote history and GitHub rejects that SHA. This available pre-change renderer replaces the unavailable identity; the >5% tighter-framing assertion and all footprint-containment assertions remain unchanged. No claim is made that it is byte-identical to the unavailable object.
- `candidate19-sim.js`: byte-for-byte `js/sim.js` from `da4c72a339345fa89a5375014daa2ae17158ef28`. The seven-day legacy state/RNG/economy parity assertion is unchanged.
- `candidate19-economy-hashes.json`: SHA-256 hashes from that same commit for data, finance and the two property factories. Save-slot source equality was removed because Candidate 22 explicitly repairs save UX; real legacy save loading and transactional slot tests replace it.
- `candidate21-three-floor-save.json`: generated in an untouched detached checkout of `b126ddcb8675dd71bd01ec546294175cdaa7d5b4` using its existing `tests/headless/tthreefloor.mjs` exported `full` fixture. Captures a commissioned F3 property, completed orders and existing legacy leases. Current load/migration verifies exact cash, objects and orders.

Renderer fixtures use GPU/canvas stubs. They verify scene construction and framing mathematics, not rendered screenshots or device performance.
