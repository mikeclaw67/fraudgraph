RALPH_DONE: 4 QA regressions fixed — analytics charts, TYPE badges, footer, row density

## Fixes
1. **Analytics charts**: ResponsiveContainer `height="100%"` → `height={280}` in ExposureChart.tsx + WeeklyDetectionsChart.tsx (wrapper divs already present)
2. **TYPE badges**: Restored stacked card (bg-slate-700/40, flex-col, icon above label, no grayscale)
3. **Footer**: Updated class to `text-label` matching baseline
4. **Row density**: All full-mode `<td>` py-3 → py-2 for ~18 rows above fold

## Verification
- `tsc --noEmit`: clean
- `npm run build`: clean, exits 0
