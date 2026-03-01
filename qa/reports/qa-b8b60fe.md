# QA Report — commit b8b60fe
**Feature:** Ring Detail — Export Graph as PNG + Evidence Package print  
**Date:** 2026-03-01 04:20 ET  
**Reviewer:** Probe (QA Agent)  
**Verdict:** ⚠️ CONDITIONAL PASS — 1 ESLint error must be fixed before PR merge

---

## Test Results

### ✅ Ring Queue (`/rings`)
- Renders correctly: 20 rings, 9 unreviewed, $66.9M exposure, 3 DOJ referrals
- Status filter tabs (ALL / NEW / REVIEW / REFERRED / DISMISSED) present
- Table sorted by exposure descending — correct

### ✅ Ring Detail (`/rings/ring_001`)
- Full-page detail loads via direct URL
- Evidence graph renders: 5 nodes, hub-and-spoke layout, labels visible
- Member table below fold: Business, Borrower, EIN, Loan Amount, Lender, Risk, Flags — all present
- Sidebar: Smoking Gun, Property Record, Shared Indicators, Ring Statistics, Detection Timeline — all populated

### ✅ Export PNG Button
- Button visible in header bar
- exportSigmaAsPNG() uses correct Sigma.js v3 pattern (afterRender + synchronous drawImage)
- LAYER_ORDER composited on dark background; canvas has live rendered content (41KB vs 22KB empty)
- Standard <a download> trigger — correct for browser context

### ✅ Evidence Package Button
- window.print() confirmed called on click (verified via JS intercept)
- Print CSS in globals.css: hides nav/sidebar, shows [data-print-show] block
- Print-only content block: Ring ID, Type, Common Element, Exposure, Risk, Members, Status, Detected
- White background / black text — appropriate for print/PDF

---

## Bugs

### BUG-01 — ESLint Error: Ref accessed during render [HIGH - block merge]
File: src/app/rings/page.tsx:382
Rule: react-hooks/refs — Cannot access refs during render

  key={detailKeyRef.current}   ← ESLint error; shows as "1 Issue" in Next.js dev overlay

Impact: Not React-safe in concurrent/strict mode. Functionally works today.
Fix: Replace detailKeyRef with useState<number>; call setDetailKey(k => k + 1) in openDetail and onPopState.

### BUG-02 — Unused variable `score` in mock-data.ts [LOW]
File: src/lib/mock-data.ts:69
Rule: @typescript-eslint/no-unused-vars
Fix: Remove or use the variable.

---

## Screenshots
- Ring Detail baseline: qa/screenshots/ring-detail-b8b60fe-1772356953.png

---

## Summary
Export PNG and Evidence Package are correctly implemented. No functional regressions.
BUG-01 (ref during render) should be fixed before merge. BUG-02 is cosmetic.
