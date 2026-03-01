# QA Report — Sprint 1 UI Visual Credibility Fixes
**Commit:** 14cc318
**Viewport:** 1440 × 900px
**Date:** 2026-03-01 02:32 EST
**Tester:** Probe

---

## Overall Verdict: ✅ ALL 4 CHECKS PASS

---

## Check 1: Type Badges — ✅ PASS

**Requirement:** Neutral/monochrome background. No orange, green, or purple. Text: neutral on neutral.

**Result:** All 5 badge types verified via computed CSS:

| Badge | Background class | Text class |
|---|---|---|
| ADDRESS FARM | `bg-slate-700/40` | `text-slate-300` |
| ACCOUNT CLUSTER | `bg-slate-700/40` | `text-slate-300` |
| EIN RECYCLER | `bg-slate-700/40` | `text-slate-300` |
| THRESHOLD GAMING | `bg-slate-700/40` | `text-slate-300` |
| STRAW COMPANY | `bg-slate-700/40` | `text-slate-300` |

**Computed background:** `oklab(0.371997 -0.00968689 -0.0429107 / 0.4)` — dark neutral slate, 40% opacity. Zero hue. ✅
**Computed text:** `lab(84.7652 -1.94535 -7.93337)` — light neutral slate-300. ✅
No orange, green, or purple in any badge type. Emoji icons in badges render in color (inherent to Unicode), but badge pill itself is fully neutral. ✅

---

## Check 2: Risk Score Heat-map — ✅ PASS

**Requirement:** <50 green, 50–74 amber, 75–89 orange, 90+ red. Score 96 visually more alarming than 76.

**Result:** Verified via computed CSS on all 20 rows:

| Tier | Scores in dataset | CSS class applied | Correct? |
|---|---|---|---|
| 90+ (red) | 91, 94, 90, 92, 93, 91, 96, 95 | `text-red-400` | ✅ |
| 75–89 (orange) | 87, 89, 88, 87, 86, 85, 84, 83, 88, 79, 82, 76 | `text-orange-400` | ✅ |
| 50–74 (amber) | *(no scores in this range in dataset)* | — | ⚠️ unverifiable |
| <50 (green) | *(no scores in this range in dataset)* | — | ⚠️ unverifiable |

**Score 96 vs 76:** 96 → `text-red-400`; 76 → `text-orange-400`. Visually distinct. ✅

**Note:** Dataset has no scores below 75. Amber and green tiers exist in code but could not be exercised. Consider adding a test ring with risk score < 74 to verify lower tiers render correctly.

---

## Check 3: Sidebar Icon Rail — ✅ PASS

**Requirement:** ~48px wide, icons only (no text labels), hover reveals label, logo = mark only, active state = subtle left border or muted bg (NOT teal fill).

**Result:**

| Criterion | Expected | Actual | Pass? |
|---|---|---|---|
| Width | ~48px | `48px` (`w-12` / `width: 48px`) | ✅ |
| No text labels | Icons only | Links contain only `<img>` elements, no text nodes | ✅ |
| Hover reveals label | Tooltip or expand | `title` attribute present: "Ring Queue", "Case Manager", "Analytics" — native browser tooltip on hover | ✅ |
| Logo mark only | No wordmark | `<img>` element only, no text siblings | ✅ |
| Active state | Left border or muted bg, NOT teal fill | Active: `bg-slate-800/60 border-l-2 border-slate-400` (dark muted bg + 2px left border, slate color) | ✅ |
| Active = NOT teal | Not teal fill | Background is `oklab(0.278... / 0.6)` — dark neutral, no teal. Border is `slate-400` — neutral gray-blue, not teal | ✅ |
| Inactive hover | Subtle | `hover:bg-slate-800/40 hover:text-slate-300` — subtle bg reveal only | ✅ |

**Minor note:** Hover tooltip is via native HTML `title` attribute (browser-default tooltip rendering). Functional, but not a custom-styled tooltip. Acceptable per spec ("tooltip or expand").

---

## Check 4: Smoking Gun Column Not Truncated at 1440px — ✅ PASS

**Requirement:** SMOKING GUN column text not truncated at 1440px viewport.

**Result:** Verified via `scrollWidth === clientWidth` on all 20 rows.

| Row | Text | Truncated? |
|---|---|---|
| All 20 rows | Various (longest: "555 Market St Ste 200, San Francisco CA 94105") | `false` (scrollW = clientW = 390px) |

**All 20 rows: truncated = false.** ✅

Note: CSS does include `text-overflow: ellipsis` and `overflow: hidden` — this is safe and graceful. At 1440px the column is wide enough (390px rendered) that no content clips. Ellipsis would only fire if the viewport narrowed significantly.

---

## Screenshot
`qa/screenshots/sprint1-1440px-{timestamp}.png`

---

## Open Items (not part of this sprint's spec)
- ⚠️ Risk tiers for scores <75 unverifiable — no test data in that range
- 🔴 Next.js dev error toast ("5 Issues") still visible bottom-left — not a Sprint 1 item but a credibility risk for demos
- 🔴 Investigation backend at `localhost:8000` still not running (from prior QA)
