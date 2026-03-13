# QA Report — Entity 360 Drawer + Command Center (a985dc3)
**Date:** 2026-03-12  
**Commit reviewed:** a985dc3 (S1 Schema Switcher dep fix + progress.md with RALPH_DONE/FORGE_DONE signals)  
**Features tested:** Entity 360 Drawer, Analytics Command Center, Alerts page  
**Tester:** Probe (automated)  
**Verdict: ⚠️ PARTIAL PASS — 1 bug upgraded to confirmed, 1 new finding**

---

## ✅ PASS — Entity 360 Drawer (RALPH_DONE)

**Tested:** Click member row → drawer opens with URL sync  
**Result:** All sections render correctly:
- **Identity:** Type, ID, Borrower, Business, Status ✅
- **Key Attributes:** EIN, SSN, Bank Acct, Program, Loan Amount, Loan Date, Lender, Employees, Business Age ✅
- **Relationships:** Member of ring, Connected entities (same bank/SSN) ✅
- **Actions:** "View in Full Case" and "Export Details" buttons present ✅
- **EntityNotFound state:** Renders gracefully with "Entity not found in this ring" message ✅
- **URL sync:** `?entity_id=` param correctly controls drawer state ✅

---

## ❌ BUG-002 [HIGH] — Analytics charts render empty (no data)

**Page:** `/analytics`  
**Charts affected:**
1. "Exposure by Ring Type" — horizontal bar chart: category labels render, bars all stuck at $0M
2. "Rings Detected Per Week (6 months)" — line chart: axes and grid render, no data line visible

**Charts that DO work:** Investigation Pipeline funnel ✅, Geographic Distribution map ✅

**Diagnosis:** Recharts components mount successfully (axes/labels render) but the data series are not populating. Likely the data transformation for these two charts is returning empty arrays or wrong shape. Not a rendering/framework issue — data pipeline issue.

**Reproduction:** Navigate to `/analytics`, wait for page load — charts remain empty.

**Note:** This was flagged as WARNING in previous report (qa-report-s2). Now confirmed consistent across multiple loads — not a timing/loading issue.

---

## ✅ PASS — Alerts Page

**Page:** `/alerts`  
**Result:** 45 alerts load (18 critical, 27 high, 45 new), severity/status filters present, risk scores and tags render correctly.  
**Note:** Borrower IDs display as raw UUIDs — may be intentional pending entity name resolution.

---

## ⚠️ CARRY-OVER — BUG-001 (CRITICAL) still open

"Open Case" crash on Ring Detail (`ring-detail.tsx:1006`) — **not fixed yet**. EvidenceChecklistPanel and ReviewerPanel remain unreachable.

---

## Action Items

1. **Forge: fix BUG-001** — `audit_trail?.length ?? 0` + `notes?.length ?? 0` in ring-detail.tsx:1006
2. **Forge: fix BUG-002** — investigate data transformation for ExposureByRingType and WeeklyDetections charts in analytics page
3. Re-test S2 panels + analytics charts after fixes

