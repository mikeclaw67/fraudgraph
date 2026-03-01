# Task: Analytics page (/analytics)

Read CLAUDE.md first.

Rebuild /analytics as a leadership command center:
- Top KPI row: Total Rings Detected | Total Exposure | Cases Referred to DOJ | Avg Days to Triage
- Exposure by ring type (bar chart, Recharts) — ADDRESS FARM / ACCOUNT CLUSTER / EIN RECYCLER / STRAW COMPANY / THRESHOLD GAMING
- Detection timeline (line chart) — rings detected per week over 6 months
- Pipeline funnel: Detected → Reviewed → Case Opened → Referred → Convicted
- State map placeholder (US choropleth — static SVG is fine)
- Colors: bg #0F1117, panels #1A1D27, accent #2A6EBB, zero rounded corners
- All mock data hardcoded

tsc --noEmit, fix all type errors, then:
git add -A && git commit -m "feat: Analytics command center" && git push origin sprint-frontend
Write ITERATION_DONE: Analytics to progress.md
