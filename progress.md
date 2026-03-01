FORGE_DONE: Analytics charts fixed with dynamic import ssr:false

## Implementation
- Created `components/charts/ExposureChart.tsx` (client component, 'use client')
- Created `components/charts/WeeklyDetectionsChart.tsx` (client component, 'use client')
- Analytics page dynamically imports both with `ssr: false` + loading skeleton
- ResponsiveContainer height set to 280px (fixed, avoids SSR height=0 bug)
- Follow-up QA fix: chart height, TYPE badges, footer, row density (commit 23deea4)

## Verification
- `tsc --noEmit`: clean
- `npm run build`: clean, all 9 routes generated
- Committed on sprint-frontend branch
