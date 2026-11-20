# FS-01 partial qualification

This is the private save-generation boundary candidate, based on exact legacy
`5ce4cfa76d3e1386ab4e3a9746b84bfe6c1313f3`. Maple geometry is unchanged. No
Proposal 2 layout/access, staffing or retail implementation is included.

Authorization covers isolated FS-01 implementation and qualification only.
No push, merge, deploy, spending, acceptance or HOLD change is authorized.

## Observed results

- `native.mjs`: 10 focused groups PASS using genuine current and retained legacy
  factories, production save/UI methods and disposable storage doubles.
- `preflight.cjs`: BLOCKED before loading the game. Installed Chromium aborts at
  `process_singleton_posix.cc:297`: `socket() failed: Operation not permitted (1)`.
  This is an environment/setup failure, not a rendered-game failure.
- Qualification stopped at that material blocker. No real IndexedDB, same-origin
  browser coexistence, two-tab fencing, phone layout, browser interruption,
  complete legacy-client recovery, physical Safari or full registered native gate
  PASS is claimed. Existing test files/manifest and their thresholds are unchanged.

The first focused run exposed a harness expectation error: UI view metadata is
extracted from the loaded Sim by the established loader. The test now compares
all simulation fields and separately asserts the restored view. Production code
was not changed for that harness correction.

## Reproduction in a capable environment

First create a separate immutable legacy checkout at the exact base. Never point
tests at a player's existing browser profile or real save server.

From the candidate checkout:

```sh
FS01_CONTROL_ROOT=/absolute/path/to/legacy node tests/fs01/native.mjs
```

The browser preflight uses an installed Playwright module and Chromium. Set
`FS01_PLAYWRIGHT` to that module's path, `FS01_CONTROL_ROOT` to the retained
legacy checkout, and `FS01_EVIDENCE` to a disposable output directory. It serves
the candidate/control privately and intercepts the legacy save endpoint without
contacting it. Its expected browser path is `/usr/bin/chromium`.

Do not repeat the known blocked launch in the same environment without evidence
of a material capability change. Do not weaken the game's WebGL/startup guard,
use normal storage, or present this candidate as qualified. A successful
preflight would enable the remaining qualification in the reconciled FS-01 plan;
it would not itself establish that qualification.
