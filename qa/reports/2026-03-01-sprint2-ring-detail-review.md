# QA Report — Sprint 2 Ring Detail
**Commit:** bac80a9
**Viewport:** 1440 × 900px
**Ring tested:** ring_002 (Address Farm, Risk 87)
**Date:** 2026-03-01 02:43 EST
**Tester:** Probe

---

## Overall Verdict: ✅ ALL 3 CHECKS PASS

---

## Check 1: Evidence Graph Above Fold — ✅ PASS

**Requirement:** Graph fully visible without scrolling at 1440×900. KPI strip ≤64px. Graph ~60–70% of viewport height.

**Measured values (via getBoundingClientRect):**

| Metric | Requirement | Actual | Pass? |
|---|---|---|---|
| KPI strip height | ≤ 64px | **56px** (`h-14 shrink-0`) | ✅ |
| Graph top edge | Below KPI strip | 56px (immediately below strip) | ✅ |
| Graph bottom edge | ≤ 900px (above fold) | **614px** | ✅ |
| Graph height | ~60–70% of 900px (540–630px) | **558px (62%)** | ✅ |
| Fully visible without scroll | true | **true** (`bottom: 614 < vh: 900`) | ✅ |

KPI strip class: `flex h-14 shrink-0 items-center justify-between border-b border-[#2A2D3E] bg-[#1A1D27] px-4`
Graph canvas: `top=56, bottom=614, height=558px`

---

## Check 2: Persistent Actions in KPI Strip, Bottom Bar Gone — ✅ PASS

**Requirement:** Open Case, Export, Dismiss, Run Investigation visible in KPI strip. Bottom action bar removed.

### Actions in KPI strip:

| Button | Top (px) | Bottom (px) | Above fold? |
|---|---|---|---|
| Open Case | 12 | 43 | ✅ |
| Export | 12 | 43 | ✅ |
| Dismiss | 12 | 43 | ✅ |
| Investigate | 12 | 43 | ✅ |

All 4 actions sit at `top: 12–43px` — firmly inside the 56px KPI strip. ✅

### Bottom action bar:

Queried all `[class*="bottom"]`, `[class*="action-bar"]`, `[class*="footer"]` elements. Only match:

```
class: "absolute bottom-3 left-4 z-10 border border-[#2A2D3E] bg-[#1A1D27]/95 px-3 py-2 backdrop-blur"
text:  "Shared ElementMemberHigh Risk"
top:   569px
```

This is the **Evidence Graph legend overlay** (node type key), not an action bar. No "Open Case", "Export", "Dismiss" found below y=600. ✅

**Bottom action bar: gone.** ✅

---

## Check 3: Heat-mapped Risk Score in KPI Strip — ✅ PASS

**Requirement:** Risk score in KPI strip uses getRiskColor() heat-map. Correct color band for displayed score.

**ring_002 risk score: 87 (band: 75–89 → orange)**

| Element location | Score | Class | Computed color | Correct band? |
|---|---|---|---|---|
| KPI strip (top: 20px) | 87 | `font-bold tabular-nums text-orange-400` | `lab(70.04 42.52 75.82)` | ✅ orange (75–89) |
| Member table row 1 | 91 | `text-data font-bold tabular-nums text-red-400` | `lab(63.71 60.75 31.31)` | ✅ red (90+) |
| Member table row 2 | 87 | `text-data font-bold tabular-nums text-orange-400` | same orange | ✅ |

KPI strip score (87) is `text-orange-400` — visually distinct from `text-red-400` (90+ scores). ✅

The heat-map tiers match Sprint 1's implementation:
- 90+: `text-red-400`
- 75–89: `text-orange-400`
- (Lower tiers unverifiable — no rings with score < 75 in dataset)

### Minor observation (non-blocking):
One element at top=1274px (below fold, in the smoking gun/detail section) uses a custom hardcoded color `text-[#C94B4B]` (rgb 201,75,75) instead of the standard `text-red-400` class. This is in scrolled content and does not affect the KPI strip check. Flag for Forge to standardize if consistent color tokens matter.

---

## RD-03 (Smoking Gun Chips)
Per spec: **skipped**. Raw prose text expected. Not flagged.

---

## Screenshots
- Viewport (1440×900, no scroll): `qa/screenshots/sprint2-rd-viewport-{ts}.png`
- Full page: `qa/screenshots/sprint2-rd-fullpage-{ts}.png`

---

## Carry-forward Items (not Sprint 2 scope)
- 🔴 Next.js dev error overlay still present (now showing "1 Issue" — reduced from 5)
- 🔴 Investigation backend at `localhost:8000` still not reachable (WebSocket connection fails on "Investigate")
