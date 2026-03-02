# FraudGraph Demo — Quick Reference (2 min)

You know the flow. Here are the commands.

---

## Start (3 Steps)

```bash
# 1. Start everything (backend + frontend + infra)
make demo

# 2. Wait ~10 seconds for backend to boot and seed demo data

# 3. Open the UI
open http://localhost:3000
```

Backend API docs: http://localhost:8000/docs

### Alternative: local dev (no Docker)

```bash
docker compose up -d postgres neo4j redis
uvicorn backend.main:app --reload --port 8000 &
cd frontend && npm run dev
```

## 1. Health + Config

```bash
curl -s http://localhost:8000/health | python3 -m json.tool
curl -s http://localhost:8000/api/config | python3 -m json.tool
```

## 2. Tests (optional)

```bash
python -m pytest tests/ -v --tb=short
```

## 3. Investigation Stream (THE MOMENT)

```bash
wscat -c "ws://localhost:8000/api/investigate/ws/RING-002"
```

Watch 8 events stream: 4 tool calls, 3 findings, 1 complete.
Final output: risk_tier CRITICAL, $735K fraud, 94% confidence, REFER_TO_DOJ.

## 4. Create Case

```bash
curl -s -X POST http://localhost:8000/api/cases \
  -H "Content-Type: application/json" \
  -d '{
    "title": "RING-002 Shell Cluster — REFER TO DOJ",
    "description": "Organized PPP fraud: 5 shells at CMRA, zero employees, $735K fraud.",
    "priority": "CRITICAL",
    "assigned_to": "Senior Investigator",
    "fraud_type": "SHELL_CLUSTER",
    "alert_ids": ["RING-002"],
    "total_exposure": 1485000
  }' | python3 -m json.tool
```

## 5. Verify Case

```bash
curl -s http://localhost:8000/api/cases | python3 -m json.tool
```

## 6. Show 8-Tool Agent (optional)

```bash
grep "^def " backend/agent/investigator.py | head -8
```

Tools: get_entity_profile, get_entity_claims, get_entity_network, get_anomaly_score, get_referral_patterns, search_fraud_patterns, get_ring_detail, escalate_alert.

---

## Key Numbers

- 6 detection rules, 3-layer scoring (rules 40% + ML 35% + graph 25%)
- 8 agent tools, anti-early-stopping (min 6 calls)
- 35+ tests, 50K-record generator, 3 fraud schemas
- RING-002: Shell Cluster, 10 members, $1.48M exposure

## If Something Breaks

| Problem | Fix |
|---------|-----|
| wscat missing | `npm i -g wscat` |
| Port 8000 busy | `lsof -i :8000` and kill |
| Backend won't start | `pip install -r requirements.txt` |
| WebSocket refused | Check: `curl http://localhost:8000/health` |
