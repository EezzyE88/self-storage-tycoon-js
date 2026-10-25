# Faster reserve waiting prototype

October 24, 2026, America/Los_Angeles.

Base: accepted master ee39e0986718ce33fb84018a2c108249f793e3f8. Branch: candidate/fast-reserve-wait-20261024. Prototype only; no owner acceptance, deployment or merge assigned. Lighting integration 70a4e31 and test-maintenance successor 3aaf045 remain separate.

The existing explicit investment wait now advances ordinary simulation minutes in cooperative bursts: at most 240 minutes and a six-millisecond budget checked between minutes. Each minute uses the production stepTicks path, including other properties, owner decisions, operating interruptions and reserve checks. No analytical income, changed coefficients, automatic purchase or saved controller state is introduced. The original seven-day limit and explicit Resume remain. Ordinary Pause/1x/2x/4x timing is unchanged outside an active wait.

The UI action is labelled Fast-forward to reserve and explains the automatic pause and absence of a purchase. Six milliseconds is a cooperative budget, not a measured guarantee: an individual simulation minute can exceed it on a slow device.

Validation: nine new native test groups cover full-state/RNG/economics parity, burst cap/budget, active and other-property owner decisions, reserve completion without purchase, manual Pause, production-frame integration and the original deadline. Ten existing scoped scripts passed: reserve waiting, continuity, action CSS, Pause policy, sandbox build Pause, buildability saves, three-floor saves, save recovery, financial trust and startup failure. Initial new-test failure was a missing BG_EVENTS binding in its VM fixture; retained separately and repaired without changing simulation.

Material limits: no rendered browser, physical Safari, responsiveness, heat or hardware performance result. No claim that older source-identity tests comparing main.js against an immutable historical implementation apply unchanged to this intentional main-loop feature. Economic/simulation/save implementation files remain unchanged; actual stepped state parity is checked at equal simulation time.

Next action: make this isolated prototype reviewable when publication is explicitly authorized; preserve existing previews and normal saves. Native test reports retain captured stdout/stderr within JSON as well as separate logs. This document records implementation scope, not broad release readiness.
