# ITERATION_DONE: EX-01/02 Export Graph + Evidence Package

## Commit: b8b60fe (sprint-frontend)
## Date: 2026-03-01 ~04:15 AM EST

---

## What changed:

### EX-01 — Export Graph as PNG ✅
- **New file:** `lib/exportGraph.ts` — `exportSigmaAsPNG()` utility
- Uses `afterRender` callback + synchronous `drawImage` to capture WebGL canvases
  (Sigma v3 has `preserveDrawingBuffer: false` — naive toDataURL returns blank)
- Layer compositing in render order: edges → edgeLabels → nodes → labels
- Dark background fill (#0F1117) for clean output
- Triggers browser download as `fraudgraph-ring-{ring_id}.png`
- `sigmaRef` typed as `any` to avoid Sigma's strict event union types

### EX-02 — Evidence Package (Print to PDF) ✅
- "Evidence Package" button triggers `window.print()`
- `@media print` CSS in globals.css hides nav/sidebar via `data-print-hide`
- Hidden evidence summary panel (`data-print-show`) renders in print view:
  Ring ID, Type, Common Element, Exposure, Risk Score, Members, Status, Date
- Sidebar tagged with `data-print-hide`

### Files Modified
| File | Action |
|---|---|
| `lib/exportGraph.ts` | Created — Sigma PNG export utility |
| `components/ring-detail.tsx` | Handlers, button wiring, print panel |
| `components/sidebar.tsx` | data-print-hide attribute |
| `app/globals.css` | @media print rules |

## Build: ✅ `npm run build` passes (Next.js 16.1.6, 0 errors)
