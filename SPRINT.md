# FraudGraph Sprint Board — S7 COMPLETE ✅

Updated: 2026-03-02 11:11 AM
**Status: CORE PRODUCT SHIPPED TO MAIN**

---

## 🎉 SHIPPED (Sprint S7)

| # | Story | Commit | QA | Status |
|---|-------|--------|----|----|
| **F-34** | WebSocket Unblock + Nav Labels | 8ee4b4f | ✅ PASS | Merged & Live |
| **P1** | Procurement Schema (Person node + IT-RING-001) | 1ae2721 | ✅ PASS | Merged & Live |
| **S2** | Case Investigation Workflow (Checklist + Review Loop) | 4f63ed7 | ✅ PASS | Merged & Live |
| **F-37** | Graph PNG Export + Referral Package ZIP | 57cb42c | ✅ PASS | Merged (S6) |
| **S1** | Schema Switcher (PPP/Medicaid/Procurement) | 9586dbd | ✅ PASS | Merged (S6) |
| **F-36** | Entity 360 Drawer | 75ae3df | ✅ PASS | Merged (S6) |
| **F-Case** | Case Model | 19696d8 | ✅ PASS | Merged (S6) |
| **F-35** | Ring Queue Inline Actions | 250052f | ✅ PASS | Merged (S5) |
| **F-18** | Palantir Visual Parity | 90e3315 | ✅ PASS | Merged (S5) |

---

## The Complete Demo Path (NOW LIVE)

```
Ring Queue (/rings)
  → Select RING-001 or RING-002 (sorted by exposure)
  → Ring Detail slides in
    → Smoking gun callout + Risk breakdown visible
    → Graph visualization (Sigma.js) + Entity 360 drawer
    → [NEW] Evidence Checklist + Review Loop (S2)
    → [NEW] "Investigate" → WebSocket streams AI steps (F-34)
  → Ring investigation completes
  → [NEW] "Export Evidence Package" → ZIP download (F-37)
  → /schema tab → [NEW] Switch between PPP/Medicaid/Procurement (S1 + P1)
    → Procurement: Person entities visible, IT-RING-001 canonical ring
```

---

## Blockers Resolved (Today)

| Issue | Root Cause | Fix | Commit |
|-------|-----------|-----|--------|
| Backend not running | Docker not installed | Used uvicorn + in-memory stores | — |
| Ring ID mismatch | `RING-001` vs `ring_001` | Standardized to `ring_001` | 4a54f27 |
| API schema | `type` vs `ring_type` | Fixed field names + enum mapping | e783800 |
| Members undefined | Only returned UUIDs | Added entity lookup + member objects | b5591ba |
| Ring incomplete | Missing common_element, risk breakdown | Enriched response with computed fields | 428716e |
| P1 missing Person | Branch not merged | Merged feat/procurement-schema | 1ae2721 |

---

## Infrastructure Status

✅ Backend: Running on :8000 (session: nimble-lobster)
✅ Frontend: Build clean (9/9 routes, 0 TypeScript errors)
✅ Database: In-memory stores (no Docker needed for demo)
✅ Graph: Sigma.js visualization working
✅ WebSocket: Agent streaming confirmed working
✅ Testing: All 3 features passed QA

---

## Ready For

✅ Demo to stakeholders  
✅ Deployment (backend runs standalone with in-memory seeds)
✅ Next sprint (S2/S3 backlog documented)
✅ Real data integration (PostgreSQL, Neo4j, Redis ready in docker-compose.yml)

---

## Commits in This Sprint

- a6cd195: ops: Final QA pass — all 3 features approved (F-34, P1, S2)
- 428716e: fix: Enrich ring response with computed fields
- b5591ba: fix: Add members array to ring response
- e783800: fix: API schema — type → ring_type
- 1ae2721: merge: P1 procurement schema
- 4a54f27: fix: ring IDs ring_001 format

(+ 3 commits from yesterday on F-37, S1, infrastructure)

---

## Next Backlog

- **S2-Extended:** Alert triage automation (auto-route by exposure + risk)
- **S3:** Advanced case workflow (evidence deep-dive, team review loops)
- **Real Data Pipeline:** CMS (Medicaid), USASpending.gov (Procurement), SBA PPP API

---
