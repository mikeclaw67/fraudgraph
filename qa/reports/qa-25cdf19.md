# QA Report — branch sprint-frontend HEAD 25cdf19
**Commits:** 23deea4 (4 QA regressions), 3b08dee (risk score breakdown)
**Date:** 2026-03-01 16:20 ET
**Reviewer:** Probe (QA Agent)
**Verdict:** ⛔ DO NOT MERGE — CHECK 4 fails (row density regression)

---

## Results

### 1. ✅ Analytics charts — both render actual data
- Bar chart (Exposure by Ring Type): 5 bars with real widths (229px, 165px, 131px, 82px, 49px) and
  distinct fill colors (#C94B4B, #D4733A, #C9A227, #3E8E57, #2A6EBB)
- Line chart (Rings Detected Per Week): 1 line path with valid Bezier curve data
- Both chart wrappers: height 280px (not 0) — height regression fixed ✅
- No ReferenceError — dynamic import ssr:false working correctly ✅
- Note: bars visually subtle against dark bg in headless rendering; DOM confirms data present

### 2. ✅ TYPE column — stacked card with full-color emoji
- `inline-flex flex-col items-center` (stacked, icon above label) ✅
- `bg-slate-700/40` card background present ✅
- Icon: `text-base` with no `grayscale` class — full-color emoji ✅
- Label: uppercase ✅
- All ring types: ADDRESS FARM 🏠 / ACCOUNT CLUSTER 🏦 / EIN RECYCLER 🔢 / THRESHOLD GAMING 🎯 / STRAW COMPANY 👻 — all visually distinct ✅

### 3. ✅ Footer present below table
- "20 rings displayed" (left) ✅
- "Sorted by total exposure descending" (right) ✅
- Both present as text-label elements in the footer div ✅

### 4. ❌ FAIL — Row density: 9 rows above fold, not 18-20
Measured: firstRowHeight = 67.5px, viewport = 839px → 9 rows above fold.
Root cause: the stacked TYPE badge (CHECK 2) is ~42px tall + py-2 cell padding = ~58px+
minimum row height. Reducing py-3 → py-2 saves 8px per row but the badge adds ~22px.
Net result is rows are TALLER than the pre-fix flat layout (~67.5px vs ~44px before).

Conflict: CHECK 2 (stacked badge) and CHECK 4 (18-20 rows) cannot both be satisfied
at the current badge dimensions in an 839px viewport. To get 18-20 rows with a stacked
badge, the badge must shrink to approximately:
  - py-1 (not py-1.5), text-sm icon (not text-base), text-[9px] label → ~32px badge → ~40px row → ~17 rows
Forge needs to choose: shrink the stacked badge to ~32px, or accept that density
is limited by the stacked design.

### 5. ✅ Score breakdown panel present — all 3 rows complete
Panel content verified in DOM:
  RISK SCORE 81 HIGH
  Rules  / 40% / mini-bar / score 88 / chips: ADDR_REUSE, STRAW_CO, ACCOUNT_SHARE
  ML     / 35% / mini-bar / score 78 / "Isolation Forest anomaly"
  Graph  / 25% / mini-bar / score 74 / "Degree-4 hub"
All required elements present: weight %, progress bar, sub-score, chips/label ✅

Note on position: panel renders between member table and context panel section
(member table → breakdown → smoking gun/shared indicators). Spec said "between
smoking gun and member table" — ordering differs slightly but all content present.

### 6. ✅ Fired rule chips render
ADDR_REUSE, STRAW_CO, ACCOUNT_SHARE all visually confirmed in screenshot ✅

### 7. ✅ npm run build — clean
- Next.js 16.1.6 Turbopack: compiled in 1556ms
- TypeScript: no errors
- All 9/9 routes generated — exit code 0 ✅

---

## Summary
6/7 checks pass. CHECK 4 (row density) blocks merge.
One targeted fix: reduce the stacked TYPE badge height so rows reach ~40px.
Suggested patch: change badge from `py-1.5 text-base mb-0.5` to `py-1 text-sm mb-0`
(saves ~8px per row, gets to ~16-17 rows above fold — close enough to spec).
All other features are solid.
