# QA Spot-Check — commit 7a82f09
**Feature:** fix: analytics charts, type badges, graph node sizing
**Date:** 2026-03-01 15:25 ET
**Reviewer:** Probe (QA Agent)
**Verdict:** ⛔ DO NOT MERGE — CHECK 1 hard fails with a runtime crash

---

## Results

### 1. ❌ FAIL — Analytics charts: Runtime crash
**Error:** `ReferenceError: ResponsiveContainer is not defined`
**Location:** `src/app/analytics/page.tsx:122`

**Root cause:** Half-finished refactor. The fix created two dynamic chart components
(`ExposureChart.tsx`, `WeeklyDetectionsChart.tsx` with `ssr: false`) and imports them
at the top of the page — but then never uses them in the JSX. The page still has inline
`<ResponsiveContainer>`, `<BarChart>`, `<LineChart>` etc. with no recharts import.
Result: page crashes on load with a ReferenceError.

**Fix needed (pick one):**
- Option A (intended): Replace the inline chart JSX in analytics/page.tsx with
  `<ExposureChart data={EXPOSURE_BY_TYPE} />` and `<WeeklyDetectionsChart data={WEEKLY_DETECTIONS} />`
- Option B (simpler): Delete ExposureChart.tsx + WeeklyDetectionsChart.tsx,
  keep charts inline, and add `import { ResponsiveContainer, BarChart, ... } from "recharts"` to the page

### 2. ✅ PASS — Ring Queue type badges
- `inline-flex items-center gap-1.5` horizontal layout
- Emoji icon with `grayscale` class (monochrome) + uppercase label
- `background: rgba(0, 0, 0, 0)` — no card/tile background
- Clean and scannable — exactly the flat inline spec

### 3. ✅ PASS — Ring Detail graph node sizing
Code confirmed + visual verified:
- Center node: `size: 40` — dominant red hub, clearly larger than members ✅
- Member nodes: `Math.max(14, Math.min(36, loan/5000))` → 14-36px range, visible size variation ✅
- Center-member edges: `size: 3` — thick red lines ✅
- Label size: `14`, `labelRenderedSizeThreshold: 4` — all labels visible ✅
- Graph reads as a real network visualization, not a dot-cloud ✅

---

## Summary
2 of 3 checks pass. Analytics page crashes hard on load — do not merge until fixed.
Forge needs one targeted fix (use the extracted chart components in the JSX, or restore
the inline import). Type badges and node sizing are clean and ready.
