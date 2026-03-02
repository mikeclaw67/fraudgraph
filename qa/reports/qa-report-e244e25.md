# QA Report — Commit e244e25
**Date:** 2026-03-01  
**Reviewer:** Probe (QA Agent)  
**Commit:** `e244e25` — fix: analytics charts — dynamic import ssr:false  
**Previous reviewed:** `b8b60fe`  
**Verdict:** ❌ FAIL

---

## Analytics Page — CRITICAL FAILURES

The `ssr:false` dynamic import fix **did NOT fully resolve** the chart rendering issue.

### ❌ BROKEN: "Exposure by Ring Type" (Horizontal Bar Chart)
- Axes and labels render correctly
- **All bars are completely missing** — the chart area is blank
- The Bar series component is not mounting/rendering

### ❌ BROKEN: "Rings Detected Per Week" (Line/Area Chart)
- Axes and date labels render correctly  
- **No line, no area fill, no data points** — chart area is empty
- The Line/Area series component is not mounting/rendering

### ✅ Working charts:
- KPI stat cards (top row)
- Investigation Pipeline (horizontal funnel)
- Geographic Distribution (bubble map + state table)

**Root cause hypothesis:** Recharts `ResponsiveContainer` or chart series components are failing to hydrate after dynamic import. The container mounts but the data bindings or child components aren't rendering. Need to investigate how data is passed to the Recharts BarChart/LineChart after dynamic import — likely a useEffect/state timing issue.

---

## Ring Queue Page — REGRESSIONS vs Baseline

### P0 Regressions (Blocking)

**1. TYPE column — Color badge chips removed**
- Baseline had colored rounded chips (teal for Address Farm, orange for EIN Recycler, etc.)
- Current: Plain uppercase white text — all ring types look identical
- Impact: Major readability regression for fast triage

**2. Table footer missing**
- Baseline showed: "20 rings displayed | Sorted by total exposure descending"
- Current: Footer completely absent
- Impact: Users lose count confirmation and sort state awareness

### P1 Regressions

**3. Row height increased — data density reduced**
- Baseline fit ~20 rows; current fits ~14 rows above fold

**4. Table appears to cut off before all 20 rings visible**

### Design Gaps vs Palantir Reference (pre-existing)
- KPI cards missing trend/delta sub-metrics
- No inline row actions (Assign / Open / Dismiss)
- No detail/split panel on row selection

---

## Summary

| Page | Status | Critical Issues |
|------|--------|-----------------|
| Analytics | FAIL | 2 charts empty (BarChart + LineChart not rendering data) |
| Ring Queue | PARTIAL FAIL | TYPE badges regressed, footer missing, density reduced |

---

## Required Actions for Forge

1. **Analytics:** Fix Recharts BarChart + LineChart hydration post dynamic-import — data series not rendering despite axes loading
2. **Ring Queue:** Restore TYPE column colored badge chips
3. **Ring Queue:** Restore table footer
4. **Ring Queue:** Reduce row padding to restore ~20 rows above fold
