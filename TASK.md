# Task: Fix Analytics Charts — Recharts SSR Bug

Read CLAUDE.md first.

## Problem
The "Exposure by Ring Type" bar chart and "Rings Detected Per Week" line chart on /analytics render empty. ResponsiveContainer measures height=0 during SSR in Next.js. Wrapping in a div did not fix it.

## Correct Fix
All Recharts components must be dynamically imported with ssr:false. This is the only reliable fix.

In the analytics page file, for each chart component:
1. Create a separate client component file (e.g. `components/charts/ExposureChart.tsx`) with `'use client'` at top
2. Move the chart JSX into it
3. In the analytics page, import it via:
   `const ExposureChart = dynamic(() => import('@/components/charts/ExposureChart'), { ssr: false })`
4. Show a loading skeleton (a div with bg-slate-800 and animate-pulse) while the chart loads

Do this for both broken charts. Pipeline funnel and map are fine — do not touch them.

## Verify
After fix: screenshot /analytics and confirm both charts render colored bars/lines.
tsc --noEmit, fix all errors.
git add -A && git commit -m "fix: analytics charts — dynamic import ssr:false" && git push origin sprint-frontend
Write to progress.md: FORGE_DONE: Analytics charts fixed with dynamic import.
