# FraudGraph — Claude Code Instructions

## What This Is
A production-quality reimplementation of Palantir's government fraud detection platform.
Target: impress a current Palantir engineer. It must feel like a real product.

## Architecture
- Backend: Python 3.12 + FastAPI + Neo4j + PostgreSQL + Redis
- ML: PyTorch Geometric (GAT) + Isolation Forest + NetworkX (Louvain)
- Frontend: Next.js 15 + Tailwind + shadcn/ui + Sigma.js
- Data: 50K synthetic PPP/EIDL loan records, 5 seeded fraud archetypes

## Build Order
1. data/generate.py → data/seed.py (generate + load 50K records)
2. backend/ (FastAPI + Neo4j + PostgreSQL + Redis)
3. backend/detection/ (rules + scoring + alerts)
4. backend/api/ (REST endpoints + WebSocket)
5. frontend/ (Next.js, all 5 pages)
6. ml/ (GAT model + Louvain)

## Verify Your Work
After every significant change:
```bash
cd /Users/mikeclaw/Projects/fraudgraph && bash verify.sh
```

## Code Style
- Every file gets a semantic header comment
- Python: type hints everywhere, docstrings on public functions
- Tests in tests/ for all detection logic
- No shortcuts — this is production quality

## Done Signal
When fully complete, write "RALPH_DONE" as the first line of progress.md
Then run: openclaw system event --text "FraudGraph Sprint done" --mode now
