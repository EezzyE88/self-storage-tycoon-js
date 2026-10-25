# B6 commissioning fixture repair — October 25, 2026

Branch: repair/commissioning-b6-20261025. Parent 775be34653873ef1eb24519b2526c5fa8f4111e7. Assessed repair: 90c8560 (full identity/tree in results.json).

Only tbugs B6 changed. B1–B5 and the manifest are unchanged. Two disposable Business Sandbox cases use the original construction coordinates and four-day plus 600-minute advancement sequence. Each requires exactly 13 units, a shared nonempty original order ID, no remaining order record, no missing readiness prerequisite and the correct pre-command states. The property must remain closed.

Ordinary Sandbox case: the existing automatic commissioning path must emit exactly one automatic event for 13 units; all units must already be operating before manual commissioning. Redundant manual commissioning must refuse with the existing message and leave the entire simulation state unchanged.

Active-lesson case: starts the real generic financing lesson through the existing lesson command, without overriding production methods. Automatic commissioning must remain disabled, the lesson active, no automatic commission events emitted and all 13 units ready before manual commissioning. Explicit commissioning by the retained order ID must succeed despite the pruned record and make all units operating. This retains the original order-ID fallback regression.

Only tbugs was selected and run once from a clean committed source export, using the existing manifest command, timeout and completion requirements plus unchanged gate export/run_entry/assess/verify_capture functions. PASS, exit 0, terminal ALL PASS. B1–B5 and both B6 cases passed; no newly exposed failure. Full logs, commands, source inventory and captured SHA256 values retained. No exported files changed. All prior original gate and isolated repair evidence directories were hash-verified unchanged; exact prior hashes retained.

Production code, economics, commissioning authority and normal saves unchanged. No other tests rerun. The full 95-entry gate has not been rerun or declared green. Native/disposable simulation evidence only; no browser or physical Safari acceptance. No push, merge or deployment.
