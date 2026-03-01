# FraudGraph — Claude Code Instructions

## What This Is
Production-quality reimplementation of Palantir's government fraud detection platform.
Target: impress a current Palantir engineer. Real product, not a demo.

## NON-NEGOTIABLE: Git After Every Meaningful Change
After completing ANY page, feature, or fix:
```bash
git add -A
git commit -m "feat: <what you built and why>"
git push origin $(git branch --show-current)
```
GitHub must always reflect current state. Never finish work without pushing.
Remote: https://github.com/mikeclaw67/fraudgraph.git

## Architecture
- Backend: Python 3.12 + FastAPI + Neo4j + PostgreSQL + Redis
- ML: PyTorch Geometric (GAT) + Isolation Forest + NetworkX (Louvain)
- Frontend: Next.js 15 + Tailwind + Sigma.js (WebGL graph)
- Data: 50K synthetic PPP/EIDL loan records, 5 fraud archetypes

## Verify
After every change: `cd /Users/mikeclaw/Projects/fraudgraph && bash verify.sh`
Frontend: `cd frontend && npm run build` must pass before committing.

## Done Signal
1. git add -A && git commit -m "feat: ..." && git push
2. Write RALPH_DONE to progress.md
3. openclaw system event --text "done" --mode now
