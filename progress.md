# FORGE_DONE: Visual polish complete

## Fixes applied (sprint-frontend):
- Bug 1: Analytics charts — wrapped ResponsiveContainer in explicit-height div to fix height-0 measurement during SSR. Both bar chart and line chart now render with visible colored data.
- Bug 2: Ring Queue TYPE column — removed bg-slate-700/40 card background and stacked layout. Now flat inline icon + uppercase label, no border-radius, no card.
- Bug 3: Ring Detail graph — center node 18→40, member nodes 6-16→14-36, labelSize 11→14, labelThreshold 6→4, edges proportionally thicker. Graph fills canvas with evidence, not dots in space.

## Verification:
- tsc --noEmit: clean
- npm run build: clean
- Screenshots: /tmp/screenshot-analytics.png, /tmp/screenshot-rings.png, /tmp/screenshot-ring-detail.png
