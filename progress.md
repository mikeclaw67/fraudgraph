# ITERATION_DONE: Sprint2-RingDetail

## Commit: bac80a9 (sprint-frontend)
## Date: 2026-03-01 ~02:40 AM EST

---

## Gate Question Answers

### 1. Sigma.js canvas resize
Sigma.js v2+ accepts a container DOM element in its constructor: `new Sigma(graph, containerElement, options)`. It uses an internal ResizeObserver to track the container dimensions — the canvas responds to CSS container sizing automatically. **No explicit pixel width/height props needed.** The current implementation just uses `<div ref={graphContainerRef} className="h-full w-full" />` and Sigma fills it. This means RD-01 layout restructuring is pure CSS — no ResizeObserver wrapper needed.

### 2. Smoking gun data schema
The smoking gun field on the FraudRing object consists of:
- `common_element: string` — raw text (e.g., "123 Main St, Milwaukee WI 53202")
- `common_element_detail: string` — prose paragraph

Both are **raw text strings, NOT structured JSON** with typed red-flag fields. Per-member `red_flags: string[]` exists but that's per-member, not ring-level structured smoking gun data.

**RD-03 verdict: SKIPPED.** Cannot convert prose to structured chips without a data schema change. Flagged to PM.

---

## What changed:

### RD-01 — Restructure Layout ✅
- KPI strip (56px): ← Back, ring type badge, ring ID, members, exposure, risk score (heat-mapped via `getRiskColor()`), status badge
- Evidence graph: `max(420px, 62vh)`, full width, dominant above-fold
- Verified: graph fully visible at 1440×900 without scrolling (56px KPI + 558px graph = 614px total, within 900px viewport)
- Below-fold: member table (full width) + 3-column context grid (smoking gun, indicators, timeline)
- Borrower360: fixed right-side overlay with backdrop dismiss
- Sigma.js: uses CSS container sizing, no code change needed

### RD-02 — Persistent Actions ✅
- Open Case, Export, Dismiss, Run Investigation in KPI strip top-right
- Always visible without scrolling
- Bottom action bar removed entirely
- Investigation button retains all 4 states (idle/running/complete/error)

### RD-03 — Smoking Gun Chips ❌ SKIPPED
- Data is text blob, not structured JSON
- **Flagged to PM: need structured red-flag schema on FraudRing to implement**

### Bundle ✅
- `getRiskColor()` applied to KPI strip risk score + member table risk column
- No new accent colors introduced

## Build: ✅ `npm run build` passes (Next.js 16.1.6, 0 errors)
