RALPH_DONE: Risk score breakdown panel — sub-scores + fired rule chips in Ring Detail.

## Changes
- `types.ts`: Added `RiskBreakdown` interface, optional `riskBreakdown` on `FraudRing`
- `ring-data.ts`: Added `riskBreakdown` data to first 5 rings (ring_001–ring_005) with realistic sub-scores and fired rules
- `ring-detail.tsx`: Added `riskBreakdown` to `generateMockRing()`, built `ScoreBreakdown` component with 3 rows (Rules 40% / ML 35% / Graph 25%), progress bars (#14B8A6 teal), fired rule chips, ML label, and degree-N hub. Placed between member table and context panels. Gracefully renders nothing when `riskBreakdown` is undefined.

## Verification
- `tsc --noEmit`: clean
- `npm run build`: clean, exits 0
- Rings without riskBreakdown: panel simply doesn't render (no crash)
