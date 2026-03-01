# CLAUDE.md — FraudGraph Backend

## What This Is
FastAPI + Python fraud detection backend. Palantir-quality code.
Stack: FastAPI + SQLAlchemy async + PostgreSQL + Neo4j + LangGraph

## Git (Non-Negotiable)
After EVERY meaningful change:
git add -A && git commit -m "feat: <what + why>" && git push origin $(git branch --show-current)

## Before Writing Any Code
1. Run: python3 -m py_compile <file> on any file you plan to edit
2. Read existing API routes — don't duplicate endpoints
3. Check: does this task need a DB migration?

## After Every File Write
Run: python3 -m py_compile <that file>
Fix ALL syntax errors immediately.

## Tests Must Pass
cd /Users/mikeclaw/Projects/fraudgraph && source .venv/bin/activate && pytest tests/ -q
All 35+ tests must pass before committing. No regressions.

## Code Style
- Type hints on every function — no untyped code
- Semantic header comment on every file (first line, explains purpose)
- Async all the way — no blocking calls in route handlers
- Error responses: return {error: str, details: str} not bare exceptions

## Done Signal
1. pytest passes — all tests green
2. python3 -m py_compile on all changed files — no syntax errors  
3. git add -A && git commit && git push
4. Write SPRINT_DONE / ITERATION_DONE to progress.md
5. openclaw system event --text "Done: <summary>" --mode now
