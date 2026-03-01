# Frontend: Case Model Integration

Ring Detail becomes Case Workspace.

On mount: GET /api/rings/{id}; if has case_id, GET /api/cases/{id}
If no case: show "Open Case" button → POST /api/rings/{id}/case
Load case data, use case status not ring status
All actions update case (AddNote, Refer, Dismiss)
New: Case Timeline component (action log)
Export button: GET /api/cases/{id}/referral-package → ZIP

Files: update rings/[id]/page.tsx, ring-detail.tsx, new case-timeline.tsx

Done: tsc clean, build clean, commit
