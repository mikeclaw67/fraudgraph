# Ring Detail Visual QA — Probe Report
Date: 2026-03-01

## Verdict: Case summary page, not an operational environment.

## Critical finding (single biggest problem):
The Evidence Graph (Sigma.js network visualization) — THE reason this product exists — 
is BELOW THE FOLD. It should dominate 60-70% of the viewport. Instead it's a footnote.
Palantir's spatial canvas is the page. Ours is hidden.

## Top 3 structural problems:
1. Layout is linear/report-style. Should be layered: KPI bar (top) → Graph canvas (70%) → context panels
2. Smoking gun card is a prose paragraph. Should be structured key-value chips (red flags as tags)
3. Actions (Open Case / Export / Dismiss) buried at bottom. Primary action should be persistent and contextual

## Color/design problems:
- 5+ accent colors with no semantic system (Palantir: 2-3 max, strict meaning)
- Risk score badges all look same color at a glance (79 vs 93 barely distinguishable)
- Rounded elements everywhere (badges, cards) — should be sharp

## Sent to Pixel for prioritization.
