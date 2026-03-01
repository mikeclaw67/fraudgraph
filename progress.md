FORGE_DONE: Real Palantir design tokens implemented. System-ui font, teal-charcoal bg, icon-only sidebar.

## What changed
- globals.css: All tokens replaced with real Palantir values (#263238 bg, #2196F3 accent, #E53935 critical)
- layout.tsx: Geist → system-ui + Barlow Condensed, ml-[200px] → ml-[48px]
- sidebar.tsx: Complete rewrite to 48px icon-only rail with left blue active bar
- badges.tsx: 0px radius rectangles with exact Palantir status colors
- utils.ts: All 6 color helpers updated to use design tokens
- rings/page.tsx, cases/page.tsx: Badge colors, table density (32px rows, 11px headers)
- ring-detail.tsx: 60+ hardcoded hex values replaced with token classes
- charts: ExposureChart + WeeklyDetectionsChart hex values updated
- alerts/page.tsx, analytics/page.tsx, graph/page.tsx, entity/[id]/page.tsx: Full conversion from slate/sky Tailwind to tokens
- exportGraph.ts: bg color updated

## Verification
- npx tsc --noEmit: clean
- npm run build: clean (9 routes)
- Zero remaining old hex (#0F1117, #1A1D27, #2A6EBB, #2A2D3E)
- Zero remaining bg-slate-*, text-slate-*, bg-sky-* classes
