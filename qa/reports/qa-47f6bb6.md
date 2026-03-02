# QA Report — commit 47f6bb6
**Build:** Merge branch 'sprint-frontend' — ring-first UI complete
**Date:** 2026-03-01 04:45 ET
**Reviewer:** Probe (QA Agent)
**Verdict:** ✅ PASS — All 8 checks green. Ready to ship.

---

## Check Results

### 1. ✅ Ring Queue — full render
- Sidebar: FraudGraph logo, FRAUD DETECTION subtitle, Ring Queue / Case Manager / Analytics nav, System Operational status
- Filter tabs: ALL / NEW / UNDER REVIEW / REFERRED / DISMISSED — full labels, all present
- KPI strip: TOTAL RINGS 20 · UNREVIEWED 9 · TOTAL EXPOSURE $66,925,000 · REFERRED TO DOJ 3
- Icon rail: ADDRESS FARM 🏠 / ACCOUNT CLUSTER 🏦 / EIN RECYCLER 🔢 / THRESHOLD GAMING 🎯 / STRAW COMPANY 👻
- Status heat-map badges: NEW (blue) / UNDER REVIEW (amber) / REFERRED (green) / DISMISSED (grey) — all distinct
- Risk score heat-map coloring active (91→94 red, lower amber)
- Table footer confirmed in DOM: "20 rings displayed · Sorted by total exposure descending"
- All 20 rows present (DOM query: 20 tbody tr elements)

### 2. ✅ Split-pane — open/close/popstate
- Row click → detail panel slides in, queue narrows, URL pushes to /rings/[id]
- Close button (labeled "Close") → panel collapses, URL snaps back to /rings ✅
- ESC key → panel closes, URL snaps back to /rings ✅
- window.history.back() → popstate fires, panel closes, URL returns to /rings ✅

### 3. ✅ Ring Detail embedded — graph height + KPI strip
- Graph height measured: 548px / panel height 783px = 0.70 exactly (70%) ✅
- KPI strip in header: ring_id · Members · Exposure · Risk · Status badge — all visible
- Action bar: Open Case / Export PNG / Evidence Package / Dismiss / Investigate — all present
- Member table: Business / Borrower / EIN / Loan Amount / Loan Date / Lender / Risk / Flags columns
- Sidebar panel: Smoking Gun, Property Record, Shared Indicators (Address 5x / Bank Acct 3x / SSN 2x), Ring Statistics, Detection Timeline

### 4. ✅ Run Investigation — wired, not a stub
- Clicking Investigate fires WebSocket connection to localhost:8000
- Error state displays correctly when backend not running: "WebSocket connection failed. Is the backend running on localhost:8000?"
- Retry button appears in action bar (changes from "Investigate" to "Retry" on error)
- Deterministic fallback is backend-side: investigator.py:133 fires when ANTHROPIC_API_KEY absent
- Frontend behavior is correct — not a stub

### 5. ✅ Export PNG — wired, not a stub
- Button enabled (not disabled), not a no-op placeholder
- 7 Sigma canvases present; canvas has rendered content (>30KB data URL — live graph)
- exportSigmaAsPNG() uses afterRender + synchronous drawImage pattern (correct for Sigma v3 WebGL)

### 6. ✅ Evidence Package — wired to window.print
- window.print() confirmed called via JS intercept test
- Print CSS in globals.css: hides nav/sidebar, shows [data-print-show] block
- Print-only content block: Ring ID, Type, Common Element, Exposure, Risk, Members, Status, Detected

### 7. ✅ npm run build — clean
- Next.js 16.1.6 (Turbopack): compiled successfully in 10.8s
- TypeScript: no errors
- All 9 routes generated: / · /_not-found · /alerts · /analytics · /cases · /entity/[id] · /graph · /rings · /rings/[id]
- Exit code: 0

### 8. ℹ️ Dev overlay — 3 pre-existing issues (not regressions)
All 3 ESLint issues in the overlay predate this sprint:
- cases/page.tsx:390 — Date.now() impure in event handler (react-hooks/purity)
- rings/page.tsx:55 — setIsMobile() in effect body (react-hooks/set-state-in-effect)
- cases/page.tsx:6 — unused 'EvidenceItem' import (@typescript-eslint/no-unused-vars)
None were introduced by the sprint-frontend merge. Not a regression.

---

## Summary
Sprint-frontend merge is clean. All ring-first UI features verified:
ring queue → split-pane → detail → investigation → export. Build passes, TypeScript clean, 70% graph ratio exact. Pre-existing ESLint warnings noted but do not block shipping.

**FINAL QA: PASS ✅**
