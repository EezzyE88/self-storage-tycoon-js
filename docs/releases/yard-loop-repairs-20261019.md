# Yard opportunity loop repairs

Base candidate: `81a773629c5c7e709060732a9d936267754dac9b`.
Local branch: `candidate/yard-loop-repairs-20261019`.
Build: `bplus-yard-loop-repairs-20261019`.

Status: local implementation and headless validation complete. No push, deployment or merge. Physical iPhone layout, touch behavior and enjoyment remain unvalidated. Desktop gameplay QA remains **NOT TESTED and parked**.

## Four reproduced defects

| Defect | Repair | Focused regression |
| --- | --- | --- |
| A proposal could face isolated pavement and fail service after commissioning. | Require vehicle frontage connected to the gate, both when scanning and requoting. Continue searching past disconnected candidates. | An isolated pavement patch is skipped; an alternative completes ordinary construction and commissioning and enters service. Quotation leaves simulation state unchanged. |
| Reservations appeared as occupied in the opportunity headline. | Count valid leases by actual commercial state; show occupied and reserved separately. | Signing all ready vacancies without moving in leaves physical occupancy unchanged in production markup. |
| Inspecting a ground-floor interior unit selected the exterior roof view. | Drive-up units select EXT; interior units select their actual floor, including F1. | Exercise the actual inspection click handler for drive-up, ground-floor interior and upper-floor interior units. |
| A second investment while another cohort was active was silently omitted. | Append independent investment groups while retaining original targets, signed leases and start time. Each group receives its own once-only occupancy acknowledgment. | Two overlapping ordinary builds remain tracked alongside original vacancies, independently finish, survive reload and avoid replay. Legacy tracking migrates; malformed optional groups do not reject the company. |

The player can inspect the correct space, distinguish a promise from an actual move-in, and see each investment produce an observable result. This supports a more dependable and rewarding operating loop; it does not establish enjoyment or guarantee financial return. Acknowledgments add no pause, money, demand or earned goal.

## Day 15 save comparison

Disposable copies of the supplied save were run to **Day 45, 11 AM**, exactly 30 game days. The paired baseline uses the verified preview simulation at `efb8349609daccf3ceecd0cc6a4fbdf5e6129ee3` and identical ordinary operating actions.

- Observation-only comparison: exact final gameplay state parity after excluding additive `yardLoop` metadata, including money, RNG, customers, staffing, leases and prices. End cash **$2,886.20**, **26/26 occupied**; the three original vacancies sign at **$118.75/month each**. One completion acknowledgment, no reload replay.
- Separate natural reinvestment policy: choose the first morning proposal that preserves the displayed bills/reserve buffer after existing lease-up. One **5x10**, **$620**, selected on **Day 37**, with **$257.71** buffer. Ordinary construction and commissioning lead to a natural signed lease and physical occupancy at **$118.75/month** before the cap. End cash **$2,501.19**. Prices, earned goals and zero debt preserved. This is one seeded outcome, not a profitability guarantee.
- Original input SHA256 remains `5b79939aec998abc3b0250fa0acbe1900d05c33a0f181dfb71f10f268031a282`. No Safari storage access or normal-save mutation.

## Checks passed

- `tyard_loop_repairs.mjs`, both recovered fixture and supplied Day 15 save: all four focused regression groups.
- `tyard_loop.mjs` with supplied save and `SST_YARD_BASE=/tmp/sst-playtest-capability`: exact 30-day baseline parity, all-speed production UI preview/Confirm/manual Pause, natural reinvestment.
- `tproperty_projects_save.mjs`: overlapping groups through real raw/compressed save-code paths at construction, commissioning and lease checkpoints; malformed optional metadata preserves company.
- Existing project UI, 12 project behavior groups with original-source economy parity, 13 rescue-operation groups, rescue-operation production saves, 13 pause-policy checks, sandbox build/pause cases and four Comeback production-save checkpoints.
- JavaScript syntax and git whitespace checks.

Focused edge tests use controlled fixtures to reproduce failures. They are separate from the natural-demand paired simulation and do not constitute physical-device acceptance. No economic coefficients, asking rents, earned goals, pause policy or normal-save storage logic changed.
