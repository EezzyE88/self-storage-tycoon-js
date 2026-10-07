# Candidate 29 — group identical climate notices

Base: Candidate 28 9c166b50ab61d2a77a82fd0e4044f5527d2b37b7, verified directly in GitHub and the existing Safari preview's source-proof. Live master before editing: 055d2a871945c565c3affbda89ecd46be7a4cfac; preserved.

User reports Candidate 27's request flow works correctly, and approved Candidate 28's softer audio after physical-iPhone listening. Both are preserved. Candidate 29 requires its own physical-iPhone visual acceptance.

## Reproduction and fix

Before editing, a new test injected identical “I need climate control.” reports with different requested sizes into the real UI.addBubble method. It failed with two visible bubbles instead of one, reproducing the screenshot-reported symptom.

Only UI visual grouping changed. Climate notices now share a display key across requested sizes and reported locations, while different text, severity and explicitly recorded availability causes keep separate keys. Legacy notices also group correctly. The original report stays bound to the grouped bubble for help; the feedback sheet retains all detailed records and product-specific guidance. Climate notices use the existing real-time routine-notice cooldown.

Repeated arrivals increment the display count without extending the 4.5-second bubble lifetime. After expiry, the existing 12-second cooldown applies on phones. Save/reload resets transient bubble display/cooldown state while preserving demand and recorded history.

## Validation

9/9 relevant scripts passed: 10 new climate display checks; availability; complaint guidance, capacity and hardening; feedback touch arbitration; 53 request/pause checks; 33 soft-audio checks; 24-second clock checks. The final climate suite was rerun after strengthening its unchanged-state assertion.

The demand-burst fixture sets 4x, generates eight real climate rejections across two requested sizes, verifies one grouped bubble, eight preserved history entries and lost-demand counts, unchanged cash, historical report targets and customer identities. It compares the complete simulation state with an identical control receiving the same demand without any bubble rendering. Other checks cover separate local faults, separate recorded causes/severity, legacy reports, original help binding, real bubble expiry, cooldown and JSON save/reload.

No changes to sim.js, audio.js, economy, finance, save modules, CSS or request logic. Only ui.js, build metadata and test/release evidence differ from Candidate 28.

## Limits and next acceptance

These tests exercise real UI handlers and simulation through DOM fixtures; they are not physical-iPhone layout/touch evidence. Browser QA is unavailable because the supported managed control-browser skill is absent. The original screenshot is reproduction evidence for the prior build, not acceptance of Candidate 29.

On iPhone Safari, refresh and play at 4x through repeated climate requests. Confirm one “I need climate control.” bubble with a repeat count, tap it to inspect product-specific guidance, and verify that distinct other complaints remain visible. No merge is authorized.
