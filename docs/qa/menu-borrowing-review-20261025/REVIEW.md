# Menu borrowing interaction repair — October 25, 2026

Branch: repair/menu-borrowing-review-20261025. Parent f57239a42913ec2bcc5578f610b88ffb2980bb44. Assessed passing source: 4ece97b (full SHA/tree in attempt2/results.json).

Only the successful borrowing interaction in tmenu_touch changed. It still enters via the existing legacy command click, verifies the actual expansion review and confirmation control, asserts unchanged cash, zero debt, active financing lesson and no completion before confirmation, then clicks termLoanConfirm and verifies exactly one loan, a $10,000 cash increase and the original completed lesson outcome. Refusal, continue-without-borrowing and all other menu/touch tests remain byte-identical. Production code and manifest unchanged.

Attempt1 (af53e71) stopped in the new pre-confirmation assertion because lessonsDone is undefined before the first completed lesson. Attempt2 corrected only that assertion’s access to lessonsDone?.financing: absent completion state still must not report financing complete. The failure and logs remain retained. No production defect was exposed or repaired.

Only tmenu_touch was selected in each run, from clean committed exports, using the unchanged existing gate export/run_entry/assess/verify_capture functions and manifest completion/minimum markers. Attempt2 exit 0: ALL PASS: 8 menu/touch checks. This includes successful confirmation, refusal and continuing without borrowing. Captured log hashes verified. All exported files remained unchanged. Prior original gate, renderer attempts, performance, floor-context and first menu attempt evidence were hash-verified unchanged; exact hashes retained.

No other regression entry rerun. The complete 95-entry gate is not newly green. Native UI method/synthetic DOM evidence only; no rendered browser, physical touch or Safari acceptance. No push, merge or deployment; master, previews and saves untouched.
