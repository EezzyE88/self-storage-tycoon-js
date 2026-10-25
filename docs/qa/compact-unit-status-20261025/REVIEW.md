# Compact unit status repair October 25 2026

Source: 5317162be0543c95a7154464967008890d75c9fa; tree d68bc81306183747a74ce42564f2b786e696a011. Branch repair/compact-unit-status-20261025. Acquisition source: 6066ff380fa842a9abde3138cea1e702c016bacc; immediate parent 57b141d is its evidence-only checkpoint.

Local candidate, not owner/browser accepted. Five focused regression groups PASS. Only dockSummary in js/ui.js changes production behavior: built -> Built · not ready; ready -> Opening automatically; other statuses retain original mapping. Simulation, acquisition behavior, Pause, save schema and existing evidence unchanged. The actual P02 fixture distinguishes blocked 85 from eligible 86 and verifies normal automatic opening of 86 while 85 remains blocked. Syntax and diff checks PASS.

The earlier external results ZIP remains unchanged; its 24 reported passes apply to 6066ff3. All 192 retained native-gate files hash-verify unchanged. The full native gate was not rerun. No repeated browser attempts; existing environment limitation remains. No push, merge, deployment or Site changes.

Next action: execute only P02_RECHECK.md at 375x667 and 390x844 using the prepared exact-source package. Browser/physical Safari NOT TESTED for this successor. Other UI findings and pause-modal design remain deferred.
