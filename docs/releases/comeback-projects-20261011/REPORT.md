# Bounded Comeback projects — implementation candidate

Base: EezzyE88/self-storage-tycoon-js @ 1e4e13c157e250a2732556c81f3233a947e5ed58.
Branch: candidate/comeback-projects-20261011. Build: bplus-comeback-projects-20261011.
Status: implementation and automated validation complete; publication and physical acceptance are separate states.

The authored, restored and acknowledged Comeback Yard offers two standard 5×10s versus one 10×10 at the original extension footprint. Live planner, demand, vacancies, incremental costs and reserve quotes are used. The preview can switch alternatives; returning from Growth retains project identity. Existing Confirm is the only purchase. Changed manual placement becomes an ordinary untracked build and is labeled accordingly. Active tutorials/lessons and other scenarios do not receive these projects.

Ordinary order IDs and created object IDs drive Building → Ready to commission → In service. Progress appears in Operate/Growth and the existing map coach when more urgent operational advice does not take precedence. Completion emits one stored-history-backed acknowledgement and a six-second footprint highlight without moving the camera. The first real project-unit lease gets its own acknowledgement: contracted rent is customer use, not proof of profitability. Requested View project/View improvement frames and inspects actual objects.

After the expansion is in service, the second optional project covers the existing apron and four loading cells: (18,13)–(21,15), current base cost $1,680, nine game hours, no additional modeled daily operating cost. Its canopy preview includes roof/posts. Existing rain/parking logic supplies the customer protection effect. No artificial weather, shopper demand, cash, subsidy, profit reward or coefficient changes.

Previously developed extension footprints are preserved, not claimed as project achievements; a complete existing in-service extension can proceed to the canopy. Changed/occupied footprints and already covered loading areas are not overwritten. Partial developments remain intact and ordinary building stays available. No generic placement scanner or acquisition features were added.

One optional per-property propertyProjects v1 field contains one active project and at most two completed entries, including first-lease metadata. Legacy saves remain without invented history. Normalization removes invalid optional tracking without invalidating the company; absent targets stop tracking, never award success. Existing serialization, storage keys, manual/autosave behavior, refund rules and save-code envelopes are preserved. Construction/commissioning and normal first-month rent own all money movement.

## Validation

- tproperty_projects.mjs: 12 groups — both paths, partial commissioning, once-only completion/first lease, canopy coverage, stale/changed placement rejection, cancellation/refunds, missing targets, existing developments, invalid optional metadata, and exact original-source gameplay/cash/RNG parity for both unit choices followed by the canopy.
- tproperty_projects_ui.mjs: eight actual production preview/Confirm runs (Pause/1x/2x/4x × both choices), preview switching, Growth → Return to placement identity, explicit manual Pause and zero-spend discard. DOM surfaces are stubs: no browser geometry or physical tap-reach claim.
- tproperty_projects_save.mjs: real production raw/compressed prepare/load, three repeats each for construction, commissioning, first lease and both completed projects; no repeated completion/lease events. Legacy and malformed optional metadata load safely. VM values are compared semantically across realms, not by object key order/prototypes.
- Existing reporting: all 13 groups, including three 30-day state/event/RNG comparisons; reporting save-code checks passed.
- Retained staff-first, sandbox build-pause and 13 pause-policy checks passed.
- Syntax and git diff whitespace checks passed.

Fixture starts with a generated seed4401 Comeback operated through normal Owner routine-job assignments and non-command request replies for20 days. No funding/economy injection. No fixture was placed in normal browser storage and no user save was read or written.

The tests initially needed harness corrections for canopy completing without commissioning, refund return shape, UI getter mocks and VM prototype/key-order differences; those were harness errors, not gameplay changes.

Managed browser QA was skipped because the required control-browser capability is unavailable. No preview server, alternate browser or mock screenshot was substituted. Rendering, physical touch reach, readability and enjoyment remain pending iPhone acceptance.

## Short physical scope

For a fresh first-choice test, use a new Comeback in Private Safari so normal company storage is separate. Restore and acknowledge the yard, compare both previews, choose either normally, confirm while manually paused, finish and commission, check the opening acknowledgement and Save → reload → Continue. Review the optional canopy when funds permit. A first lease need not happen immediately and is not required to complete construction. An already expanded company can show the canopy directly; do not demolish existing work to obtain the initial choice.

No master merge; original working-yard and Maple restoration are preserved separately. Publication must identify the resulting Git candidate, separately from the Site wrapper commit.
