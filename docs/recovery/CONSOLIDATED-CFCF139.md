# Exact consolidated history recovery

Original tip: cfcf139a14f7d901052b114e316ad7026181ddc2.
Exact source tree: a32cf8b8a90e6fb189da4e623303ca9810965e34.
GitHub source-equivalent snapshot: 820edc9b5382d2985e99abb808cfebfcbc108331 (different commit identity).

consolidated-cfcf139.bundle retains original commits through cfcf139. Requires existing fef20fca0405d6f20dfd2bab05e41c5e4160acee and b7092e08d89fcd882c5d2d82db6ac1eb7631af42; both are in the preserved remote integration ancestry. Bundle bytes 1441331; SHA256 f0054cb667065b3dbeb589119ea2e282cce4e7a2f973d359a13c0f030b0e86e2; Git blob 22798123d555d38834c82fa0bc51f49ce5ec20af.

In a separate clone containing prerequisites, run git bundle verify docs/recovery/consolidated-cfcf139.bundle, then git fetch docs/recovery/consolidated-cfcf139.bundle refs/heads/repair/rejected-payback-cutoff-20261025:refs/heads/recovered/consolidated-cfcf139. Verify recovered tip and tree before use. No force update or reset needed.

This recovery branch adds this bundle/record over the exact snapshot tree and is not itself the exact cfcf139 tree. The separate snapshot/consolidated-cfcf139-20261025 branch is the exact source-equivalent snapshot. Native gate: 95/95 PASS assessed at 0d5dd499ffa6edd720d6e8d7cc4ee5460ee1395c; later changes are records. Browser/Safari acceptance, signed-out public delivery and Claude/Perplexity access remain outstanding. No merge or deployment.
