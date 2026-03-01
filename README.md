# FraudGraph

**Open-source fraud detection platform** — deterministic rules, ML anomaly scoring, and graph analytics for government fraud investigation. Architecturally equivalent to a Palantir AIP Tier 3 Agentic Application, built open and composable.

> Ontology-based entity resolution across 50K+ loan records. Six detection rules, Isolation Forest ML, Louvain community detection, and a LangGraph investigation agent (8 tools, WebSocket streaming) — the same design as Palantir AIP Agent Studio Tier 3: an agent embedded in an operator application with live Ontology context. All open, all inspectable.

> FraudGraph shows what comes out of an AIP Bootcamp for SBA fraud detection — the target state an agency investigator would have after Palantir's 3-5 day onboarding. Built on authentic Foundry Ontology patterns (Borrower → Business → BankAccount/Address, Escalate/Close/Reassign action types). No vendor lock-in.

<!-- ![FraudGraph Screenshot](docs/screenshot.png) -->

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Investigator UI                         │
│   Ring Queue · Ring Detail · Case Manager · Analytics       │
├─────────────────────────────────────────────────────────────┤
│                 WebSocket          REST API (FastAPI)        │
│              /investigate/ws    /alerts /entity /graph /cases│
├─────────────────────────────────────────────────────────────┤
│                  Investigation Agent (LangGraph)             │
│   8 tools · Claude Sonnet 4.5 · deterministic fallback      │
├─────────────────────────────────────────────────────────────┤
│                    Detection Engine                          │
│   6 Rules · Isolation Forest · Louvain · Composite Scorer   │
│   RiskScore = 0.4×rules + 0.35×ML + 0.25×graph             │
├───────────────┬───────────────┬─────────────────────────────┤
│  PostgreSQL   │    Neo4j      │          Redis              │
│  Records      │  Ontology     │   Queue + Cache             │
│  Alerts       │  7 node types │   Pub/Sub                   │
│  Cases        │  9 edge types │   Celery workers            │
└───────────────┴───────────────┴─────────────────────────────┘
```

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| API | FastAPI + Uvicorn | ≥0.109 |
| ORM | SQLAlchemy 2.0 (async) | ≥2.0.25 |
| Validation | Pydantic v2 | ≥2.5 |
| Graph DB | Neo4j Community + APOC | 5.x |
| Relational DB | PostgreSQL | 16 |
| Queue | Redis + Celery | 7.x / 5.3 |
| ML | scikit-learn (Isolation Forest) | ≥1.4 |
| Graph Analytics | NetworkX (Louvain) | ≥3.2 |
| Agent | LangGraph + langchain-anthropic | ≥1.0 / ≥0.3 |
| Runtime | Python | 3.12 |

## Quick Start

```bash
# Clone and start infrastructure
git clone https://github.com/mikeclaw67/fraudgraph.git
cd fraudgraph
docker compose up -d          # PostgreSQL, Neo4j, Redis, FastAPI

# Generate and seed data
pip install -r requirements.txt
python data/generate.py --count 5000 --output /tmp/fg_data.json --stats
python data/seed.py --input /tmp/fg_data.json

# Or import real SBA PPP data (public, 431MB CSV from data.sba.gov)
python data/ppp_importer.py --input public_150k_plus_240930.csv \
  --output /tmp/ppp_demo.json --demo-slice --limit 5000
python data/seed.py --input /tmp/ppp_demo.json
```

**Services:**

| Service | URL |
|---------|-----|
| FastAPI backend | http://localhost:8000 |
| API docs (Swagger) | http://localhost:8000/docs |
| Neo4j Browser | http://localhost:7474 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |

## Project Structure

```
fraudgraph/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── api/
│   │   ├── alerts.py            # Alert queue (paginated, filtered)
│   │   ├── entities.py          # Entity 360 profiles
│   │   ├── graph.py             # Sigma.js graph data
│   │   ├── cases.py             # Case management CRUD
│   │   └── investigate.py       # WebSocket investigation stream
│   ├── agent/
│   │   └── investigator.py      # LangGraph StateGraph — 8 tools
│   ├── agents/
│   │   └── investigator.py      # ReAct agent + deterministic fallback
│   ├── detection/
│   │   ├── rules.py             # 6 deterministic fraud rules
│   │   ├── scoring.py           # Composite risk scorer
│   │   └── alerts.py            # Alert generator + triage
│   ├── graph/
│   │   └── neo4j_client.py      # Async Neo4j ontology client
│   ├── db/
│   │   └── models.py            # SQLAlchemy 2.0 models (4 tables)
│   └── config/
│       └── settings.py          # Pydantic settings (12-factor)
├── data/
│   ├── generate.py              # 50K synthetic record generator
│   ├── ppp_importer.py          # Real SBA PPP CSV → FraudGraph JSON
│   └── seed.py                  # Neo4j + PostgreSQL bulk seeder
├── ml/
│   ├── isolation_forest.py      # Anomaly detection (3 features)
│   └── community.py             # Louvain community detection
├── tests/                       # 35 tests — rules, scoring, agent
├── docker-compose.yml           # Full stack: PG + Neo4j + Redis + API
├── Dockerfile                   # Python 3.12 production image
├── verify.sh                    # Syntax check + test runner
└── requirements.txt
```

## Detection Engine

### Three-Layer Scoring

Every record is scored by three independent systems. The composite formula:

```
RiskScore = 0.40 × rule_score + 0.35 × ml_score + 0.25 × graph_score
```

### Rules Engine — 6 Deterministic Rules

Stateless functions, instant execution, fully explainable output.

| Rule | Trigger | Severity |
|------|---------|----------|
| `ADDR_REUSE` | Address shared by >3 businesses | HIGH |
| `EIN_REUSE` | Same EIN on multiple businesses | CRITICAL |
| `STRAW_CO` | 0 employees + age <6mo + loan >$100K | HIGH |
| `THRESHOLD_GAME` | Amount in $145K–$149,999 band (SBA ceiling) | MEDIUM |
| `ACCOUNT_SHARE` | Bank routing shared by >2 businesses | HIGH |
| `NEW_EIN` | Business registered <30 days before application | MEDIUM |

### ML Layer — Isolation Forest

Anomaly detection on three numeric features: `employee_count`, `business_age_months`, `loan_amount`. Scores normalized to 0–100, contamination set at 5% to match synthetic fraud rate.

### Graph Layer — Louvain Community Detection

Builds a NetworkX graph (Borrower, Business, Address, BankAccount nodes) and runs Louvain community detection. Per-entity graph score:

```
graph_score = 0.6 × degree_centrality × 100 + 0.4 × min(100, community_size / 10 × 100)
```

Large, dense communities score higher — exactly the pattern that reveals fraud rings.

### Alert Triage

Scores above 15.0 generate alerts. Automatic triage recommendation:

| Condition | Action |
|-----------|--------|
| CRITICAL severity | ESCALATE |
| Score ≥ 70 | REVIEW_GRAPH |
| Score ≥ 40 | CROSS_REFERENCE |
| Score ≥ 20 | CHECK_DOCUMENTS |
| Score < 20 | AUTO_DISMISS |

## Investigation Agent

LangGraph-powered agent that autonomously investigates fraud alerts. Two implementations:

### Primary Agent (StateGraph — 8 Tools)

Uses `claude-sonnet-4-5` with enforced minimum 6 tool calls per investigation:

| Tool | Purpose |
|------|---------|
| `get_entity_profile` | Full borrower/provider profile |
| `get_entity_claims` | Claims with anomaly flags (deceased beneficiaries, impossible volume) |
| `get_entity_network` | Connected entities via shared identifiers |
| `get_anomaly_score` | ML score with peer group comparison |
| `get_referral_patterns` | Referral concentration / kickback detection |
| `search_fraud_patterns` | Semantic search across fraud taxonomy |
| `get_ring_detail` | Full ring metadata (members, exposure, pattern) |
| `escalate_alert` | Close the investigation loop |

### WebSocket Bridge (ReAct — Deterministic Fallback)

Production-safe endpoint at `WS /api/investigate/ws/{ring_id}`. When no API key is available, falls back to a deterministic 7-step investigation that produces structured results without LLM calls.

```json
{"step": 1, "type": "tool_call", "tool_name": "query_ring_members", "content": "..."}
{"step": 7, "type": "complete", "content": "{structured_result}"}
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/` | Service info |
| `GET` | `/health` | Health check |
| `GET` | `/api/config` | Active schema + detection thresholds |
| `GET` | `/api/alerts` | Paginated alert queue (filter: severity, status) |
| `GET` | `/api/alerts/{id}` | Alert detail |
| `GET` | `/api/entity/{id}` | Entity 360 profile (attributes, alerts, connections) |
| `GET` | `/api/entity` | Search entities (name, EIN, business) |
| `GET` | `/api/graph` | Graph nodes + edges (Sigma.js format) |
| `POST` | `/api/cases` | Create investigation case |
| `GET` | `/api/cases` | List cases (filter: status, priority) |
| `GET` | `/api/cases/{id}` | Case detail |
| `PATCH` | `/api/cases/{id}` | Update case (status, priority, assignment) |
| `WS` | `/api/investigate/ws/{ring_id}` | Investigation agent stream |

## Data Pipeline

**Synthetic generator** — 50K records with 5 fraud archetypes at ~5% fraud rate:

| Archetype | Pattern | Default Count |
|-----------|---------|---------------|
| Address Farm | 8 addresses × 50 businesses | 400 |
| EIN Recycler | 100 EINs × 3 businesses | 300 |
| Straw Company | 0 employees, <6mo, $100K+ | 500 |
| Network Cluster | 35 routing numbers × 10 businesses | 350 |
| Threshold Gamer | $145K–$149,999 loan band | 450 |

**PPP Importer** — transforms real SBA PPP CSV data (public domain, data.sba.gov) into FraudGraph format. Demo-slice mode extracts 5,000 records from 6 high-fraud states with guaranteed real fraud rings.

## Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Quick syntax + test check
./verify.sh
```

**35 tests across 3 suites:**

| Suite | Tests | Coverage |
|-------|-------|----------|
| `test_rules.py` | 21 | All 6 rules — positive/negative cases, batch detection |
| `test_scoring.py` | 14 | Composite formula, weight verification, clamping, round-trip |
| `test_agent_scenarios.py` | 6 | 5 fraud scenarios, structured output validation |

Agent tests require `ANTHROPIC_API_KEY` and are conditionally skipped without it.

## Configuration

All settings via environment variables with `FG_` prefix:

```bash
FG_POSTGRES_HOST=localhost          # PostgreSQL connection
FG_NEO4J_URI=bolt://localhost:7687  # Neo4j Bolt protocol
FG_REDIS_URL=redis://localhost:6379/0
FG_ACTIVE_SCHEMA=ppp_loans          # ppp_loans | medicaid | procurement
FG_WEIGHT_RULES=0.40                # Detection weight tuning
FG_WEIGHT_ML=0.35
FG_WEIGHT_GRAPH=0.25
```

## License

MIT

---

Built by [mikeclaw67](https://github.com/mikeclaw67)
