# ITERATION_DONE: DS-02 Docker Compose Polish

## Commit: fa650f8 (main)
## Date: 2026-03-01 ~04:30 AM EST

---

## What was added:

### docker-compose.yml (updated)
- **frontend** service: Next.js on port 3000, builds from fraudgraph-frontend/frontend/Dockerfile, depends on backend
- **seed** service: reuses backend Dockerfile, runs `python data/seed_demo.py`, depends on postgres+neo4j healthy, `restart: no`
- ANTHROPIC_API_KEY uses `${ANTHROPIC_API_KEY:-}` for graceful missing-key

### Frontend Dockerfile (new)
- `fraudgraph-frontend/frontend/Dockerfile`
- node:20-alpine, npm ci, npm run build, npm start on port 3000

### .env.example (new)
- All config vars documented with descriptions
- ANTHROPIC_API_KEY noted as optional (deterministic fallback)

### Makefile (new)
| Target | Action |
|---|---|
| `make demo` | Full one-command start: infra → seed → backend + frontend |
| `make up` | Start all services |
| `make down` | Stop all services |
| `make seed` | Re-seed demo data |
| `make logs` | Tail backend + frontend logs |
| `make clean` | Stop + remove all data volumes |

### Validation
- YAML parses correctly (6 services, 4 volumes)
- All services: postgres, neo4j, redis, backend, frontend, seed
- Docker not installed on build host (Mac mini) — compose config validated via Python YAML parser

## Build: ✅ Committed and pushed to main
