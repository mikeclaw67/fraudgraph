# FraudGraph

**Palantir-class fraud detection platform** — ontology-based entity resolution, deterministic rules, ML scoring, and graph analytics for government fraud investigation.

Built to demonstrate how Palantir Foundry's fraud detection capabilities can be reimplemented as an open, composable system. Same patterns, no vendor lock-in.

## Architecture

```
┌──────────────────────────────────────────────────────────┐
│                    Investigator UI                        │
│  Alert Queue │ Entity 360 │ Graph Explorer │ Case Mgr    │
├──────────────────────────────────────────────────────────┤
│                     REST API (FastAPI)                    │
│  /api/alerts │ /api/entity/:id │ /api/graph │ /api/cases │
├──────────────────────────────────────────────────────────┤
│                   Detection Engine                        │
│  6 Rules │ Isolation Forest │ Louvain │ Composite Scorer  │
│  RiskScore = 0.4×rules + 0.35×ML + 0.25×graph           │
├──────────────┬───────────────┬───────────────────────────┤
│  PostgreSQL  │    Neo4j      │         Redis             │
│  Records +   │  Ontology     │   Queue + Cache           │
│  Alerts +    │  Graph        │   Pub/Sub                 │
│  Cases       │  Traversal    │                           │
└──────────────┴───────────────┴───────────────────────────┘
```

### Three-Layer Detection

1. **Rules Engine** — 6 deterministic fraud rules (instant, explainable)
   - `ADDR_REUSE`: Address shared by >3 businesses → HIGH
   - `EIN_REUSE`: Same EIN on multiple businesses → CRITICAL
   - `STRAW_CO`: 0 employees + young + high loan → HIGH
   - `THRESHOLD_GAME`: Amount clustered near $150K SBA threshold → MEDIUM
   - `ACCOUNT_SHARE`: Bank routing shared by >2 businesses → HIGH
   - `NEW_EIN`: EIN registered <30 days before application → MEDIUM

2. **ML Layer** — Isolation Forest anomaly detection (baseline), GAT model (planned)

3. **Graph Layer** — Louvain community detection + centrality scoring via Neo4j

### Fraud Archetypes (Data Generator)

50,000 synthetic PPP/EIDL loan records with ~5% fraud rate across 5 patterns:

| Archetype | Count | Pattern |
|-----------|-------|---------|
| Address Farm | 400 | 8 addresses × 50 businesses each |
| EIN Recycler | 300 | 100 EINs × 3 businesses each |
| Straw Company | 500 | 0 employees, <6mo old, $100K-$149K loans |
| Network Cluster | 350 | 35 routing numbers × 10 businesses each |
| Threshold Gamer | 450 | Amounts in $145K-$149,999 band |

### Generalization (Foundry Pattern)

Config-driven schema swap — same detection pipeline, different ontology:
- **PPP Loans** (default): COVID-era SBA loan fraud
- **Medicaid Claims**: Healthcare provider fraud
- **Procurement**: Government contract fraud

## Quick Start

### With Docker (recommended)

```bash
docker compose up -d
```

Services:
- FastAPI backend: http://localhost:8000
- Neo4j Browser: http://localhost:7474
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Generate test data
python data/generate.py --count 1000 --output /tmp/test_data.json --stats

# Run the API server
uvicorn backend.main:app --reload --port 8000

# Run tests
python -m pytest tests/ -v
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Service info |
| GET | `/health` | Health check |
| GET | `/api/config` | Active schema + thresholds |
| GET | `/api/alerts` | Paginated alert queue (filter: severity, status) |
| GET | `/api/alerts/:id` | Single alert detail |
| GET | `/api/entity/:id` | Entity 360 profile |
| GET | `/api/entity` | Search entities |
| GET | `/api/graph` | Graph nodes + edges (Sigma.js format) |
| POST | `/api/cases` | Create investigation case |
| GET | `/api/cases` | List cases |
| GET | `/api/cases/:id` | Case detail |
| PATCH | `/api/cases/:id` | Update case |

## Project Structure

```
fraudgraph/
├── backend/
│   ├── main.py              # FastAPI app, CORS, health
│   ├── api/                  # REST endpoints
│   │   ├── alerts.py         # Alert queue (paginated, filtered)
│   │   ├── entities.py       # Entity 360 profiles
│   │   ├── graph.py          # Sigma.js graph data
│   │   └── cases.py          # Case management
│   ├── detection/            # Fraud detection engine
│   │   ├── rules.py          # 6 deterministic rules
│   │   ├── scoring.py        # Composite risk scorer
│   │   └── alerts.py         # Alert generator
│   ├── graph/
│   │   └── neo4j_client.py   # Neo4j ontology operations
│   ├── db/
│   │   └── models.py         # SQLAlchemy models
│   ├── queue/
│   │   └── redis_client.py   # Redis + Celery config
│   └── config/
│       ├── settings.py       # Pydantic settings (12-factor)
│       └── schemas/           # Fraud schema configs (PPP, Medicaid, Procurement)
├── data/
│   ├── generate.py           # 50K record generator
│   └── seed.py               # Neo4j + PostgreSQL seeder
├── ml/
│   ├── isolation_forest.py   # Anomaly detection
│   └── community.py          # Louvain community detection
├── tests/
│   ├── test_rules.py         # Rule engine tests
│   └── test_scoring.py       # Scorer tests
├── docker-compose.yml
├── Dockerfile
└── requirements.txt
```

## Configuration

All configuration via environment variables with `FG_` prefix:

```bash
FG_POSTGRES_HOST=localhost
FG_NEO4J_URI=bolt://localhost:7687
FG_REDIS_URL=redis://localhost:6379/0
FG_ACTIVE_SCHEMA=ppp_loans          # Switch: ppp_loans | medicaid | procurement
FG_WEIGHT_RULES=0.40                # Detection weight tuning
FG_WEIGHT_ML=0.35
FG_WEIGHT_GRAPH=0.25
```
