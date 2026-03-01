# Task: Case Manager page (/cases)

Read CLAUDE.md first.

Delete the existing /cases page and rebuild it ring-first:
- Status tabs: ALL | OPEN | UNDER REVIEW | REFERRED TO DOJ | CLOSED
- Table: Case ID | Ring Type | Members | Exposure | Investigator | Days Open | Status | DOJ Status
- Click a row: expand inline to show evidence checklist + notes + referral status
- Colors: bg #0F1117, panels #1A1D27, accent #2A6EBB, critical #C94B4B
- Zero rounded corners
- Mock data: 10 realistic PPP fraud cases

tsc --noEmit after writing. Fix all type errors before committing.
git add -A && git commit -m "feat: Case Manager page" && git push origin sprint-frontend
Write ITERATION_DONE: Case Manager to progress.md
