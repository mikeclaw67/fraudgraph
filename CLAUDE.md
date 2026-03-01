# FraudGraph — Claude Code Instructions

## What This Is
Production-quality reimplementation of Palantir's government fraud detection platform.
Target: impress a current Palantir engineer. Real product, not a demo.

## NON-NEGOTIABLE: Verification Loop (Cursor-style iteration)
After writing ANY frontend file, immediately run:
```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
If there are TypeScript errors: FIX THEM BEFORE MOVING ON. Do not leave type errors.
Repeat until `tsc --noEmit` produces zero output.
Only then run `npm run build` as final confirmation.
This is the difference between 90% working code and 100% working code.

## NON-NEGOTIABLE: Git After Every Meaningful Change
```bash
git add -A && git commit -m "feat: <what and why>" && git push origin $(git branch --show-current)
```
GitHub must always reflect current state. Remote: https://github.com/mikeclaw67/fraudgraph.git

## Exploration Before Writing
Before writing any new component or page:
1. Read the existing types in frontend/src/lib/types.ts
2. Read the existing utils in frontend/src/lib/utils.ts  
3. Read one existing page to understand the pattern
Then write. Not before.

## Architecture
- Frontend: Next.js 15, Tailwind CSS, TypeScript, Sigma.js (graph viz), Recharts
- Backend: FastAPI, Neo4j, PostgreSQL, Redis
- Design: bg #0F1117, panels #1A1D27, accent #2A6EBB, critical #C94B4B, zero border-radius

## Done Signal
1. tsc --noEmit passes with zero errors
2. npm run build passes
3. git add -A && git commit && git push
4. Write RALPH_DONE to progress.md
