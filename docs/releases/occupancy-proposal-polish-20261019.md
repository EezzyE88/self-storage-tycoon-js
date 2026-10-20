# Occupancy celebration and iPhone proposal readability

Base game candidate: `515ff533f50411502e02c363039399a6097eb0df`.
Local branch: `candidate/occupancy-proposal-polish-20261019`.
Build: `bplus-occupancy-proposal-polish-20261019`.

Status: local candidate only. No push, deployment or merge. The existing Safari preview still serves the prior candidate. Physical iPhone acceptance of these repairs is pending. Desktop gameplay QA remains **NOT TESTED and parked**.

## Repairs

The full-property showcase used `Sim.occupancy()`, which counts leases including reservations, and checked signing and move-out events without checking move-in completion. It could announce 26/26 occupied while the accurate yard tracker showed 25 occupied and one reservation.

The showcase now reads the same valid-lease, physical-state inventory used by the yard tracker. It checks the existing `movedin` event, celebrates only when every operating unit is physically occupied, and labels that milestone “Fully occupied.” Initial attachment and subsequent property attachment seed the in-memory observation from actual occupancy, preventing a reload replay. Full reservations receive the non-pausing coach label “Fully leased · Move-ins pending”; the existing lease toast also continues to disclose the reservation. No additional pre-move-in celebration or pause was added. The existing celebration pause and manual Pause behavior remain intact.

Proposal cards now use a scoped vertical layout. Observed demand/date range, build cost, added daily operating costs, asking rent, and cash after build/bills/reserve are separate labeled lines. An insufficient reserve receives a separate deferral note. The ordinary preview action, quoted values and all purchasing rules are unchanged. The button wraps within its card and retains its existing minimum touch height. This fixes the inline concatenation seen on iPhone; physical readability and scrolling still need acceptance.

## Validation

- `toccupancy_proposal_polish.mjs`: the full production showcase installer/event wrapper runs with explicit DOM and graphics stubs. Comeback Yard and Business sandbox each pass at Pause, 1×, 2× and 4×: all vacancies signed/reserved without a false celebration or new pause; natural scheduled move-ins produce exactly one physical-occupancy celebration; a repeated event does not change state; existing speed restoration and a manual Pause are retained; attaching a loaded full property does not replay. An empty property never celebrates.
- Proposal checks use controlled demand and budget fixtures. Real production markup preserves separate fields, negative/positive reserve messages, the unchanged preview action and read-only quotation/rendering. Scoped CSS contracts verify block separation, spacing and button/text wrapping. These are not a rendered Safari layout test.
- Previous four yard-loop regression groups pass against a disposable copy of the supplied Day 15 save.
- Production raw/compressed project saves, Comeback save checkpoints, 13 pause-policy checks, sandbox build/pause cases and layout-hierarchy checks pass.
- The supplied Day 15 save runs through Day 45, 11 AM against an unmodified local export of preview source `efb8349609daccf3ceecd0cc6a4fbdf5e6129ee3`. Exact final gameplay state parity remains after excluding additive observation metadata: **$2,886.20**, three tracked leases and occupancies, **$356.25/month** tracked rent. The separate natural-investment policy still selects a $620 5×10 on Day 37 with $257.71 reserve buffer, commissions normally and achieves a $118.75/month occupied contract; end cash **$2,501.19**. One seeded outcome does not prove profitability or enjoyment.
- JavaScript syntax and git whitespace checks pass. No simulation, economic, traffic, pricing, goals, save-storage or pause-controller source changed.
- Original uploaded save SHA256 remains `5b79939aec998abc3b0250fa0acbe1900d05c33a0f181dfb71f10f268031a282`. No access to Safari storage or normal save.

## One pacing recommendation — not implemented

Add an explicit **Wait for next useful change** action. It uses the existing 4× speed and ordinary minute-by-minute simulation, then pauses at the first owner decision, tracked lease/move-in, commissionable construction, or selected investment reaching a nonnegative bills/reserve buffer. End after at most seven game days if none occurs; show what changed. Pause/Stop interrupts immediately, property switches/loads cancel the wait, and no panel or decision dismissal restarts it. It never buys, hires, alters prices, advances past a blocking request or skips financial processing.

This reduces monitoring during quiet periods while leaving the player's decisions and their consequences intact. It does not fix slow capital accumulation or promise a faster economic progression. Before implementation, validate identical state/RNG outcomes for equal simulated minutes, stop boundaries and manual Pause priority. No waiting control, acceleration change or new save field is present in this candidate.

## Sandbox traffic and visual feedback — separate work

Eddie reports roughly 10–20 vehicles on a normal workday and 25–40 on a busy day. Treat these as his operating reference, not a universal industry limit.

The current simulation schedules a routine visit with probability `1 / 1.8` per eligible occupied tenant each day, excluding leaving tenants and overlocked units. For 86 eligible tenants, that is about **48 expected routine visits/day**, before prospects, move-ins and move-outs. Online inquiries do not create vehicles. The crowd cap can move some routine visits off-screen. No separate decorative street-traffic generator was identified in the inspected paths. This source reading explains a plausible cause; it is not a measured count from the uploaded sandbox save.

Reducing those visits would also affect carts, customer experience, dirt, wear and staffing pressure. It therefore needs a distinct measured balance review rather than hiding simulated cars or imposing a cosmetic vehicle cap. Neither visit probability nor vehicle rendering was changed here.

The sandbox screenshots also show visually overlapping vehicles around loading/frontage and continuing limitations in model detail. Still images cannot establish the cause of those overlaps or assess movement timing. Retain this feedback for a separate vehicle-spacing and animation review with the actual sandbox save; no new art or animation acceptance is claimed.
