# Borrowing review repair

Isolated branch: `candidate/borrowing-review-20261025`. Exact parent: `d84fb59171152e670a5d3d2940830310fd7cc1d9`. The commit containing this note identifies the local successor. It is not published or merged.

## Behavior

Expansion-loan options now open **Review expansion loan**. The review shows principal, existing annual rate and term, new monthly payment, first payment day, combined monthly term-loan payments, cash after borrowing and available cash after the existing bills/reserve projection. It explicitly says the 14-day reserve does not include this new loan's first payment, which is due 30 days after borrowing. Only **Confirm … loan** invokes the existing borrowing command. Back changes no debt or cash.

The bank request now presents **Review Draw …**. It opens the existing credit projection for that request's exact amount, including debt after draw, incremental interest and available cash after bills/reserve. It excludes unrelated construction quote context. The original request stays pending during review and after Back; it cannot repaint over its own review. Only **Confirm … draw** dispatches the original conversation response, resolving it once. **Not now** retains its existing behavior.

Both new paths recheck the current property, eligibility and reviewed figures on confirmation. A changed quote requires another review and tap. Removed or replaced bank responses cannot borrow from a stale review. Closing a borrowing modal clears its transient confirmation state; duplicate confirmations have no effect. Review uses the existing modal pause controller and retains manual Pause, prior speed and other pending panel/request pauses.

## Preservation

Only `js/ui.js` changes in production. Loan commands, terms, eligibility, credit limits, interest, debt schedules, economics, staff authority and simulation remain unchanged. No new save field or migration is added. The Office model, both Office presentation methods, waiting/served counts, reserved/completed distinctions, entrance repair, camera selection, build preview and pause controller methods remain exact parent bytes. Production finance, simulation, data, main/save implementations and CSS are also byte-identical. See [preservation.json](../qa/borrowing-review-20261025/preservation.json).

## Focused checks

All 129 checks/groups pass:

- New borrowing-review regression: 16 groups, using real UI handlers and parent/candidate commands on disposable seeded states. Includes all offered loan amounts, both rates, authoritative projections, Back, duplicate taps, changed quotes, ineligibility, original bank request resolution, unchanged construction funding and ordinary credit behavior, nested/manual Pause, property switches and exact parent financial-state parity after confirmation.
- Existing Pause: 13; Office: 9; request handling/windows: 53; entrance preview: 11; financial trust: 5; B+ finance: 21; production raw/compressed save/load: 1.
- UI/test syntax and `git diff --check`: PASS. Sixteen file/method preservation comparisons: PASS.

Commands and retained outputs: [evidence.json](../qa/borrowing-review-20261025/evidence.json). Two initial failures were disposable test-fixture setup errors (missing sandbox state and DOM dataset); their original logs are retained. No production repair was made in response to those fixture errors. Previous Office, entrance and browser QA evidence remains unchanged.

To rerun the new regression, create a detached checkout of the exact parent and run:

```sh
node tests/headless/tborrowing_review.mjs /path/to/exact-d84fb59-checkout
```

Real browser layout, touch input and physical Safari remain **NOT TESTED**. The native checks use DOM/renderer doubles and do not establish browser acceptance. No blocked browser route was retried. Remaining external QA: at 375×667 and 390×844, verify both reviews scroll to reachable Back/Confirm controls, bank Back returns to the pending request, review survives feed refresh, confirmations resolve once, camera stays put and manual Pause survives cancellation/confirmation. Earlier QA results are not passes for this successor.

No normal company save was accessed. No push, publication, deployment or merge; accepted master and prior branches are untouched.
