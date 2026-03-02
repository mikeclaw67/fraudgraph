# FraudGraph Sprint Board

Updated: 2026-03-02 08:40 EST  
⚠️ **CRITICAL BLOCKER:** Backend service not running — see BLOCKER.md

---

## 🔴 CRITICAL — Infrastructure Blocker

**Backend Docker Compose stack is DOWN** (port 8000 free, no service running)

**Fix:** `make demo` from repo root (one-line command)

**Impact:** Blocking 3 features from shipping (F-34, P1, S2)

**Timeline after fix:** ~15 min to retest all 3 and merge to main

---

## Ready to Ship (Code Complete, Waiting for Backend)

| Feature | Commit | Code Status | QA Status | Blocker |
|---------|--------|------------|-----------|---------|
| **F-34: WebSocket Unblock** | 8ee4b4f | ✅ Merged | Pending retest | Backend ↓ |
| **P1: Procurement Schema** | 2d3b077 | ✅ Pushed | Pending retest | Backend ↓ |
| **S2: Case Investigation Workflow** | 414472c | ✅ Complete | ✅ PASS | Backend ↓ |

---

## 📋 Sprint Summary

**Built This Cycle:**
- ✅ F-34: WebSocket backend connectivity + sidebar nav labels + row affordances
- ✅ F-37: Graph PNG export + referral package ZIP
- ✅ S1: Schema Switcher (PPP/Medicaid/Procurement)
- ✅ F-36: Entity 360 Drawer
- ✅ S2: Case Investigation Workflow (evidence checklist + review loop)
- ✅ P1: Procurement Schema (Person node + IT rings + seed data)

**Ready to Merge:** All above (6 stories)  
**Blocked on:** Backend service startup

---

## ✅ Core Product Complete

Ring Queue → Ring Detail → Investigation (WebSocket) → Export (ZIP) → Schema Switch (Procurement)  
+ Case management + Evidence checklist + Referral workflow

**Everything is code-ready. Just waiting for infrastructure.**

---

## Next Action

**URGENT:** Someone with Docker access, please run:
```bash
cd /Users/mikeclaw/Projects/fraudgraph
make demo
```

Then notify: "Backend up on localhost:8000" → Probe will retest all 3 features → merge → ship.
