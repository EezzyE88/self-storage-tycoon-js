# Targeted payback diagnosis — October 25, 2026

Exact sources: b89d711c9a89ce49229fae5888c1d94b7b1666d4 (lighting parent) and 6e278d65d5ed5de6a5bf24e5daa36df857f0dda6 (lighting feature).

Both original tbplus_payback.mjs files match the current original benchmark byte-for-byte. The diagnostic preserves the complete original plans/run operator and selects only complete6 seed 4401; it reports rather than changes the original >18-month requirement. Both ran once in complete immutable Git exports with unchanged production source. Export inventories, archive hashes, diagnostic/original hashes, Node version, exit codes and logs are in results.json. Only diagnostic script addition to each disposable export; no tracked source or benchmark expectation changed. Operator stops at each run’s own payback, as originally implemented. No equal-horizon causal breakdown is claimed.

| Measure | b89d711 | 6e278d6 |
|---|---:|---:|
| Investment | $16,046 | $15,746 |
| Payback game day | 611 | 566 |
| Months after Day 31 commitment | 19.33 | 17.83 |
| Rent collected | $28,722 | $27,222 |
| Incremental expenses | $6,789 | $6,081 |
| Attributed vendors | $5,850 | $5,200 |
| Net contribution | $16,083 | $15,941 |
| Final added units leased | 6 | 6 |
| Blocked samples / exhausted-owner days | 0 / 0 | 0 / 0 |
| Original >18-month condition | met | violated |

The intentional lighting feature explains the threshold crossing at this commit boundary: 45 game days faster, crossing from 19.33 to 17.83 months. Two lights cost $150 less each, exactly explaining the $300 investment reduction. Reduced light upkeep and slower wear are intentional, but the separate contributions of operating costs, repair timing, RNG trajectory and shorter run duration have not been isolated. In particular, the $708 expense and $650 vendor differences are cumulative totals at different endpoints, not equal-period savings. The post-change result exactly matches the original integration’s retained complete6/4401 result.

This confirms an outdated absolute benchmark relative to changed economics; it does not independently authorize a replacement threshold or prove all financial accounting correct. Retain the failure until the benchmark’s design requirement is explicitly resolved. Do not tune production economy or loosen expectations to manufacture a pass. Existing retained results show six-unit packages remain slower than ten-unit packages, but that is a separate possible design criterion, not an adopted change.

Only the two requested diagnostic cases executed; no full benchmark or 95-entry gate rerun. No normal saves, previews or deployments used. No push, merge or deployment. Prior evidence remains in place. This is native simulation evidence only, not browser/physical Safari acceptance.
