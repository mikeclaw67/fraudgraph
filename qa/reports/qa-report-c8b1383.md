# QA Report — commit c8b1383
**Date:** 2026-03-01T09:04 UTC  
**Reviewer:** Probe (QA Agent)  
**Page tested:** http://localhost:3000/rings  
**Screenshot:** /Users/mikeclaw/Projects/fraudgraph/qa/screenshots/ring-queue-1772355930.png  
**Verdict:** ❌ FAIL

---

## Regressions vs Baseline (Priority)

1. **Sidebar branding stripped** — "FraudGraph / FRAUD DETECTION PLATFORM" header + labeled nav items ("Ring Queue", "Case Manager", "Analytics") completely gone. Only unlabeled icons remain. Active-state teal accent also absent.

2. **"UNDER REVIEW" label regressed to "REVIEW"** — Both status badges in table rows and the filter chip. Breaks label parity with baseline.

3. **Type badge layout broken** — Baseline: tall two-line stacked pill (icon above text). Current: single-line compact horizontal pill. Reduced scannability, breaks visual consistency.

4. **Table footer missing** — Baseline shows "20 rings displayed / Sorted by total exposure descending." Current build has no footer, no row count, no sort indicator.

5. **Notification toast missing** — Baseline has a red "5 Issues ✕" badge bottom-left. Current build: absent.

6. **Page subtitle truncated** — Baseline: "…sorted by dollar exposure — triage and assign for investigation." Current: drops "— triage and assign for investigation."

7. **Smoking gun column no longer truncates** — Full addresses break column proportions.

8. **Only ~16/20 rows visible** — No pagination or "load more" affordance. 4 rings hidden below fold.

9. **Row height decreased** — Tighter density, harder to scan.

10. **Risk score color drift** — High scores (92–94) appear more red-shifted than baseline amber. Verify palette.

---

## Design Gaps vs Palantir Reference (Known Outstanding)

These are pre-existing gaps, not new regressions, but worth tracking:
- No top horizontal nav bar
- KPI cards lack borders and trend subtitles
- No row-selection detail/flyout panel
- No filter legends, edit mode, or footer attribution

---

## Next Steps

- Forge must fix regressions #1–10 before this commit can ship to Pixel
- Status: **needs-fix**
