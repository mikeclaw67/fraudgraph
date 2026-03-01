# FraudGraph — Implementation Plan
## "Palantir Foundry for Government Fraud Detection"

## The Product
Three-layer Palantir stack reimagined open-source:
1. Data Layer (Foundry) — ontology-based entity graph, multi-source ingestion
2. Detection Layer (AIP) — rule engine + ML + graph scoring
3. Investigator UI (Workshop/Case Manager) — alert queue, 360 profiles, graph viz, case workflow

## Stack
Backend: Python 3.14 + FastAPI + Neo4j + PostgreSQL + Redis + Celery
ML: PyTorch Geometric (GAT) + Isolation Forest + XGBoost + NetworkX (Louvain)
Frontend: Next.js 15 + Tailwind + shadcn/ui + Sigma.js + Recharts
Data: Faker + custom generators — 50K records, 5 fraud archetypes, ~5% fraud rate
Infra: Docker Compose (single command run), Vercel + Railway deploy

## Fraud Archetypes
1. Address Farm — 100+ applications from same address
2. EIN Recycler — same EIN across multiple businesses
3. Straw Company — 0 employees, age < 6mo, max loan
4. Network Cluster — same bank account routing across 20+ businesses
5. Threshold Gamer — amounts clustered just below $150K review threshold

## Ontology
Borrower → Business → LoanApplication → BankAccount
         → Address
         → Alert → Case
Link types: SHARED_ADDRESS, SHARED_ACCOUNT (the smoking guns)

## Detection
Layer 1: 6 deterministic rules (instant)
Layer 2: Isolation Forest (fast baseline) + GAT (deep graph patterns)
Layer 3: RiskScore = 0.4*rules + 0.35*ml + 0.25*graph_centrality

## UI Pages
1. Alert Queue — risk-sorted, real-time WebSocket, bulk triage
2. Entity 360 — 360 profile per borrower, red flags, timeline
3. Graph Explorer — Sigma.js full-screen fraud network visualization
4. Case Manager — Kanban, investigator workflow, audit trail
5. Analytics — detection stats, model performance, schema switcher

## Generalization
Config-driven schema swap: PPP Loans → Medicaid Claims → Procurement Contracts
Same pipeline, different ontology config — this is the Foundry pattern

## Build Order
Sprint 1: Data generation + DB schemas + FastAPI skeleton
Sprint 2: Detection engine (rules + scoring + alerts)
Sprint 3: REST API + WebSocket
Sprint 4: Frontend (all 5 pages)
Sprint 5: GAT model + Louvain + generalization + deploy
