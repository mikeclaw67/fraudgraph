# Task: Rebuild FraudGraph Frontend — Ring-First Architecture

## Read first:
- /Users/mikeclaw/Projects/fraudgraph-frontend/REDESIGN.md (full spec)
- /Users/mikeclaw/Projects/fraudgraph/PRODUCT_SPEC.md (product context)
- /Users/mikeclaw/Projects/fraudgraph-frontend/CLAUDE.md (project context)

## What to build:
A government fraud investigation platform with 4 pages:
1. Ring Queue — triage table sorted by dollar exposure, with ring type badges and smoking gun preview
2. Ring Detail — smoking gun callout box, member table, Sigma.js evidence graph, case actions
3. Active Cases — case management with status tabs, evidence checklists
4. Analytics — aggregate stats for agency leadership

## Visual design (non-negotiable):
- Background: #0F1117, Panels: #1A1D27, Accent: #2A6EBB, Critical: #C94B4B
- NO rounded corners (border-radius 0-2px max), NO gradients, NO shadows
- Dense tabular layout, 12px data text, 11px uppercase labels
- This is a government investigation tool, not a SaaS app

## Tech stack:
- Next.js 15 (app router), Tailwind CSS, TypeScript
- Sigma.js for graph visualization (already in package.json)
- Recharts for analytics charts

## Start small — build Ring Queue page first, verify it works, then move to Ring Detail.
## Write progress to progress.md after each page. Write RALPH_DONE when all 4 pages are done.
## Run: cd /Users/mikeclaw/Projects/fraudgraph-frontend/frontend && npm run build to verify.
