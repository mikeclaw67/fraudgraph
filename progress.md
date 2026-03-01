# FraudGraph Frontend — Ring-First Redesign
Status: IN PROGRESS

Sprint 4 (alert-queue design) is committed. Now rebuilding with ring-first architecture per REDESIGN.md.

## Completed
- Ring Queue page (/rings) — full-width sortable table, 20 hardcoded fraud rings, stats bar, type badges, status filters
- Sidebar updated: Ring Queue is now primary nav item
- Root redirect points to /rings
- Fixed pre-existing type errors in alerts, cases, entity pages
- npm run build passes clean

ITERATION_DONE: Ring Queue
ITERATION_DONE: Case Manager
ITERATION_DONE: Analytics
ITERATION_DONE: Ring Detail investigation panel

FORGE_DONE: Wired investigation agent into Ring Detail UI.

Summary:
- Added "Run Investigation" button (purple, with spinner/checkmark/retry states) to the Ring Detail action bar
- Clicking opens a WebSocket to ws://localhost:8000/api/investigate/ws/{ring_id}?entity_id={highest_risk_member}
- Streams LangGraph agent steps live into a 340px dark panel (bg #0A0C12) that expands above the action bar
- Timeline: tool_call steps (purple left border + dot) and finding steps (blue), auto-scrolls as steps arrive
- On "complete" event: parses the JSON findings payload and renders structured results:
  - Risk tier badge with color coding (CRITICAL=red, HIGH=orange, MEDIUM=yellow, LOW=green)
  - Estimated fraud amount in a red callout box
  - Executive summary prose
  - Key findings list with severity color dots and data_source citations
  - Evidence citations list
- Layout splits into left (420px timeline) + right (findings) when complete
- Error state: shows red "connection failed" message with retry button
- Close (×) button collapses panel and cleans up WebSocket
- npm run build passes clean. Committed ec9aad1, pushed to sprint-frontend.
