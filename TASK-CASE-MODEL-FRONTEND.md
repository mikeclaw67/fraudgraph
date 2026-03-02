# Frontend: Wire Case Model into Ring Detail

Ring Detail becomes Case Workspace. Same visual, different data underneath.

## Changes
1. On mount: GET /api/rings/{ringId}; if ring.case_id, GET /api/cases/{case_id}
2. If no case, show "Open Case" button; POST /api/rings/{ringId}/case to create
3. Once case loaded:
   - Header: Ring ID → Case ID, Ring Status → Case Status
   - All actions update case (AddNote, Refer, Dismiss)
   - Investigation findings auto-load into case
   - New: Case Timeline panel (shows action log)
4. Export button: GET /api/cases/{caseId}/referral-package → download ZIP

## Files
- frontend/src/app/rings/[id]/page.tsx — add case loading, Open Case button
- frontend/src/components/ring-detail.tsx — use case data, not ring status
- frontend/src/components/case-timeline.tsx — new component showing action log

## Done
tsc clean, build clean, commit
