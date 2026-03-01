# Sprint 5: Real SBA PPP Data Pipeline

## Context
Scout found real SBA PPP loan data (public domain, data.sba.gov).
Full research + transform code in:
/Users/mikeclaw/.openclaw/workspace/vault/research/findings/2026-02-28-sba-ppp-live-data-sprint5.md

Read that file first — it has the CSV schema, transform code, Cypher queries, all of it.

## Tasks (in order)

### S5-1: data/ppp_importer.py
- SBA CSV -> internal JSON transform (code in findings file, paste it in directly)
- Demo slice extraction: pulls 5K rows guaranteed to contain real fraud rings
- CLI: python data/ppp_importer.py --input public_150k_plus_240930.csv --output data/ppp_demo.json --demo-slice

### S5-2: scripts/load_real_data.sh
- Downloads $150K+ CSV from data.sba.gov (curl, resumable)
- Runs ppp_importer.py to generate demo slice
- Runs seed.py to load into PostgreSQL + Neo4j
- One command: bash scripts/load_real_data.sh

### S5-3: backend/graph/ring_queries.py
- Real Cypher ring detection queries (in findings file)
- Functions: detect_address_rings(), detect_lender_rings(), detect_ceiling_violations()
- Returns ring objects matching the FraudRing schema

### S5-4: Wire /api/rings to Neo4j
- Replace mock ring data in backend/api/rings.py
- Use ring_queries.py against live Neo4j
- Return real rings sorted by exposure

### S5-5: git add -A && git commit -m "feat: Sprint 5 — real SBA PPP data pipeline" && git push origin main

## Done Signal
Write RALPH_DONE to progress.md, then push to GitHub.
