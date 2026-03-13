# S8 Day 1 — Real Data Pipeline Dry-Run Results

**Date:** 2026-03-13  
**Status:** ✅ SUCCESS

---

## Summary

Real PPP fraud rings successfully detected from SBA public data.

| Metric | Value |
|--------|-------|
| SBA CSV downloaded | 431 MB (968,524 loans) |
| Demo slice created | 5,000 records |
| Rings detected | **50** |
| Total exposure | **$548,102,555.65** |
| Fraud signals | 1,170 records (23.4%) |

---

## Pipeline Steps Completed

1. **Download SBA CSV** ✅  
   - URL updated (original was stale)  
   - Correct URL: `data.sba.gov/.../c1275a03-c25c.../public_150k_plus_240930.csv`

2. **Run ppp_importer.py --demo-slice** ✅  
   - Fixed encoding issue (added `encoding='latin-1'`)
   - Output: 5,000 records (2,000 ring + 3,000 clean)
   - States: CA, FL, TX, GA, IL, NY

3. **Seed database** ✅  
   - Added `seed_real_ppp_data()` to seed_demo.py
   - Modified backend/main.py to use real data
   - In-memory store populated with 50 rings

4. **Verify Ring Queue** ✅  
   - 50 rings visible at http://localhost:8000/api/rings
   - Frontend accessible at http://localhost:3000/rings

---

## Sample Rings (Top 5 by Exposure)

| Ring ID | Address | Members | Exposure |
|---------|---------|---------|----------|
| ppp_ring_006 | 6120 Stoneridge Mall Rd Ste 300, Pleasanton CA | 7 | $27.6M |
| ppp_ring_007 | 3550 Mowry Ave, Fremont CA | 7 | $26.0M |
| ppp_ring_011 | 2339 11th Street, Encinitas CA | 6 | $24.0M |
| ppp_ring_038 | 5856 Corporate Ave Suite 200, Cypress CA | 3 | $23.3M |
| ppp_ring_001 | 2532 Dupont Dr, Irvine CA | 11 | $22.4M |

---

## Ring Detail: ppp_ring_001

**Address:** 2532 Dupont Dr, Irvine CA 92612  
**Members:** 11 businesses  
**Total Exposure:** $22,389,670.30  
**Risk Score:** 92 (CRITICAL)  
**Fired Rules:** ADDR_REUSE

**Member businesses (real SBA data):**
- TMR OPERATIONS, LLC — $4,456,175
- And 10 others at same address

---

## Rules Fired

- **ADDR_REUSE** — Primary detection rule for shared-address rings
- Fraud signals detected:
  - `over_ceiling`: 846 records (per-employee > $20,833)
  - `new_business`: 324 records (< 6 months old)

---

## Issues Encountered & Resolved

1. **Stale SBA URL** — Updated to current data.sba.gov endpoint
2. **UTF-8 decode error** — Added `encoding='latin-1'` to pd.read_csv()
3. **Docker not installed** — Backend runs locally via uvicorn; created in-memory seeding path

---

## Code Changes

1. `data/ppp_importer.py` — Added `encoding='latin-1'`
2. `data/seed_demo.py` — Added `seed_real_ppp_data()`, `build_rings_from_records()`
3. `backend/main.py` — Updated to use `seed_real_ppp_data()` at startup

---

## Next Steps (Day 2-3)

- [ ] CA ring seeding with specific ring patterns
- [ ] Multi-state schema labels
- [ ] SOL narrative in DEMO.md

---

**ITERATION_DONE**
