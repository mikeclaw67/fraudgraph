# F-34 Unblock — WebSocket Backend + Critical UX Gaps

Status: Probe QA found core blocker + design gaps.

## 🔴 BLOCKER (Before Merge)
WebSocket backend not running on localhost:8000. Probe testing shows:
- UI panel renders cleanly (good sign)
- "Investigate" button works
- Connection fails with "Is the backend running on localhost:8000?"

**Action:** Ensure FastAPI agent server starts when make demo runs. Forge, add WS startup to docker-compose.yml or Makefile, document in DEMO_QUICK.md.

---

## 🟡 CRITICAL DESIGN GAPS (Before Merge)

Probe flagged 2 UX-critical gaps vs Palantir reference:

### #3 Row-level Action Affordances
**Problem:** Investigators can't see how to interact with rings. Ring Queue rows look passive (no visual hints that they're clickable/actionable).
**Palantir pattern:** Icon buttons or subtle background on hover to signal "click to open" and "inline actions available"
**Fix:** 
- Make row background slightly highlight on hover
- Add small action buttons (eye icon for view, pencil for edit/assign, more menu for status change)
- OR clarify via card-style layout that rows are interactive

### #6 Sidebar Nav Icons Unlabeled
**Problem:** New investigators see sidebar icons with no text labels. Usability failure.
**Palantir pattern:** Icon + text label, or collapsed-to-icon with tooltip on hover
**Fix:** Add text labels next to sidebar icons (Ring Queue, Cases, Analytics, Schema Switcher, etc.)

---

## 🟢 POLISH (Iterate Post-Merge)

Probe also flagged:
- #1 KPI cards: add trend arrows or "aging" context (e.g. "Detected 3 days ago")
- #2 Typography: hierarchy muddy — clean up spacing/sizing
- #5 Risk score placement: should be visual anchor, not subordinate to blue link
- #7 Advanced filters: risk range, type, date, exposure threshold

These are important but don't block F-34 merge. Backlog for S2.

---

## Done Condition
1. ✅ Backend WS server confirmed running on localhost:8000 with make demo
2. ✅ Row hover state + action affordances visible on Ring Queue
3. ✅ Sidebar nav icons have text labels
4. ✅ Probe retest: F-34 streaming works end-to-end
5. ✅ Build passes, zero regressions
6. ✅ Merge to main

Then git commit -m "feat: F-34 WebSocket unblock + critical UX (affordances + nav labels)" && git push origin main
