# REGRESSION_FIX_DONE

## Commit: 2d548fb (sprint-frontend)
## Date: 2026-03-01 ~04:25 AM EST
## QA Report: qa-report-c8b1383.md

---

## All 10 Regressions Fixed:

| # | Issue | Fix | File |
|---|---|---|---|
| 1 | Sidebar branding stripped | Restored FraudGraph logo + nav labels + teal active (w-[200px]) | sidebar.tsx, layout.tsx |
| 2 | "REVIEW" → "UNDER REVIEW" | Fixed label in STATUS_CONFIG + filter chip uses s.replace(/_/g, " ") | page.tsx |
| 3 | Table footer missing | Always show "N rings displayed / Sorted by X descending" | page.tsx |
| 4 | Subtitle truncated | Full text: "— triage and assign for investigation", always visible | page.tsx |
| 5 | Smoking gun not truncating | max-w-[320px] + title tooltip for hover | page.tsx |
| 6 | 4 rows hidden | p-6 padding + overflow-y-auto ensures all 20 scrollable | page.tsx |
| 7 | Type badge layout | Stacked flex-col: icon centered above text label | page.tsx |
| 8 | Notification toast | "5 Issues ✕" at fixed bottom-left, coral bg | page.tsx |
| 9 | Row height | py-3 on all full-mode cells (~56px rows) | page.tsx |
| 10 | Risk score color drift | Red threshold 90→95, so 92-94 renders orange | utils.ts |

## Build: ✅ `npm run build` passes (Next.js 16.1.6, 0 errors)
## Split-pane architecture: PRESERVED — no structural changes
