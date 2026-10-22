# Floor-based unit numbering candidate

Status: implemented isolated candidate; no deployment or merge; physical iPhone and rendered-browser acceptance NOT TESTED.

Repository: EezzyE88/self-storage-tycoon-js. Parent: `9700d9d4475555e1a4907d1702cb8d81d31ded55` (repaired Open House). Master verified unchanged at `f6e4c1eace1720dc703d8cd5758626b158b6aa03` before branch publication.

## Behavior

F1 uses 1001–1999, F2 2001–2999, F3 3001–3999, F4 4001–4999 and F5 5001–5999. The allocator supports all five ranges; this change does not increase the existing three-floor construction release limit. Drive-up and interior units, across buildings, share each property's floor sequence. Separate properties have independent sequences.

Numbers are allocated monotonically, not recycled after demolition/cancellation. Vertical packages reserve their numbers when committed. Ordinary building, splitting and vertical packages refuse insufficient number capacity before charging or allocating simulation IDs. Migration rejects properties/orders that cannot fit within 999 assigned/reserved slots per floor; it does not partially apply a company load.

Splitting retains the established simulation lifecycle: two newly identified children replace the vacant parent; the first inherits the parent's display number, the second gets a fresh number. Number migration itself never recreates units or changes internal IDs.

## Migration and references

`unitNumbering.version = 1` records per-floor next numbers and an ID-based legacy number map. Legacy units sort by actual floor, previous number and internal ID. Existing generated names change; custom names remain. Subsequent loads validate assignments without renumbering. Internal references, tenant/lease relationships, task progress, wages/capacity, construction phases and financial amounts are preserved. Migration consumes no RNG or game minutes and emits no new gameplay event.

Authored Maple keeps the same unit and tenant identities: its ground-floor units become 1001–1023, the original turnover unit becomes 1007 and the original interior move-out tutorial target becomes 1012. Tutorial roles are stored as IDs; displayed instructions resolve the current number. Comeback starts select the same six physical spaces by creation order rather than display-number range. Legacy Comeback targets retain IDs/footprints/progress, with current display numbers; missing spaces retain a reserved label.

Active ID-linked task/request text is updated by exact Unit-number tokens. Financial ledger text, completed auction records and historical logs remain historical; Menu and Save code provide a Previous unit numbers lookup. Export names identify floor numbering and UI copy explains that upgraded saves require a compatible build. Original exports are not changed. Backward loading an upgraded export into accepted V62 is not supported or verified.

Each portfolio property migrates through its Sim constructor within the existing prepareLoad transaction; all properties must succeed before applyLoad. Acquisitions use the updated authored constructor and maintain their own numbering.

## Changed scope

Runtime: new `js/unitnumbering.js`; `sim.js`, `maple.js`, `scenarios.js`, `vertical.js`, `tutorial.js`, `main.js`, `ui.js`, `version.js`. Current pause/walk/Candidate-22 test fixtures use roles or new floor numbers. Historical fixtures remain unchanged. No rendering, cutaway, F2 visibility, traffic, pricing or economy coefficients were changed.

## Verification

- Focused run: 26 scripts PASS, 1 pre-existing failure. Commands, exit codes and logs are in `docs/releases/floor-unit-numbering-20261022/`.
- `tunitnumbering.mjs`: nine groups PASS, including all starts, five ranges, active Owner work, stable IDs/relationships, custom names, exact linked text, historical money text, repeated SST0/SST1 migration, atomic portfolio rejection, split/exhaustion, reservations, acquisition and overflow. Latest log includes added active-work and missing-reservation checks.
- `tunitnumbering_parity.mjs`: actual unchanged parent versus new start versus migrated parent; exact daily gameplay-state parity for seeds 7, 99 and 9711 over 30 days each. Only numbering metadata, numeric display fields and Unit-number text are excluded. All four actual parent scenario starts/migrations also match. The run output was observed; its concise result is recorded separately rather than presenting a reconstructed raw log.
- `tunitnumbering_vertical_legacy.mjs`: actual native parent expansion states at all five phases import using production compressed save/decode/prepareLoad, finish through normal construction, retain existing IDs/leases/cash and re-export/load with stable numbers. PASS.
- Bounded fuzz: 30 days, one seed across ten modes; 5,244 actions, 1,296 accepted, NO ISSUES.
- Parent and candidate both fail the same Candidate-22 floor-chooser assertion: expected `Building 12 · 1 completed floor`, current UI renders `Building 1` with the floor count in a separate small element. This test's earlier numbering/identity/pause checks pass; the entire suite is not reported as passing. Parent and candidate logs retained. The unrelated UI/assertion was not changed.
- Existing three-floor save/construction, financial trust, Owner repair, traffic/delegation saves, scenario, sandbox, pause, import/recovery, placement and Open House CPU checks passed. These do not establish rendered WebGL, iPhone touch/label fit or Safari Continue acceptance.

Reproduce parent comparisons with a separate checkout of exact parent `9700d9d`:

```
node tests/headless/tunitnumbering.mjs
node tests/headless/tunitnumbering_parity.mjs /absolute/path/to/parent
node tests/headless/tunitnumbering_vertical_legacy.mjs /absolute/path/to/parent
```

## Remaining acceptance

After separately authorized private deployment, use disposable data: check four-digit map labels and unit cards agree on F1/F2/F3; open tutorial and work/request references; build one unit, then export/reload/Continue and verify stable numbers, money and paused state. F4/F5 allocator support is CPU-tested; their construction remains governed by the unchanged release limit. F2 missing-building repair remains a separate task. No normal save or browser game session was opened during implementation.
