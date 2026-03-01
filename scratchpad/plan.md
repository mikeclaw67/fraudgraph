# Palantir Visual Parity — Implementation Plan

## Source of Truth
`/Users/mikeclaw/Projects/fraudgraph/qa/reference/PALANTIR_DESIGN_TOKENS.md`

## Token Mapping (Old → New)

### CSS Variables (globals.css @theme inline block)
| Token | Old Value | New Value |
|---|---|---|
| --color-bg-shell | #0F1117 | #263238 |
| --color-bg-panel | #1A1D27 | #2C3539 |
| --color-bg-sidebar | (new) | #1A1F23 |
| --color-bg-topbar | (new) | #37474F |
| --color-bg-input | (new) | #1E292E |
| --color-bg-row | #1E2130 | #2C3539 |
| --color-bg-row-hover | #252840 | #2F3D42 |
| --color-bg-selected | #1C2B4A | #1E3A4A |
| --color-border | #2A2D3E | #37474F |
| --color-border-2 | (new) | #455A64 |
| --color-text-primary | #E8EAF0 | #ECEFF1 |
| --color-text-secondary | #8B90A8 | #90A4AE |
| --color-text-muted | #4A4F6A | #546E7A |
| --color-text-disabled | (new) | #546E7A |
| --color-accent | #2A6EBB | #2196F3 |
| --color-accent-dim | (new) | #1565C0 |
| --color-critical | #C94B4B | #E53935 |
| --color-high | #D4733A | #FFB300 |
| --color-medium | #C9A227 | #FFB300 |
| --color-low | #3E8E57 | #43A047 |
| --color-smoking-gun | #C94B4B | #E53935 |
| --font-sans | var(--font-geist-sans) | system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif |
| --font-display | (new) | 'Barlow Condensed', 'Barlow', system-ui, sans-serif |
| --font-mono | var(--font-geist-mono) | 'SF Mono', 'Fira Code', monospace |

### Badge Colors (new tokens)
| Status | Background | Text |
|---|---|---|
| NEW | #1565C0 | #90CAF9 |
| UNDER_REVIEW | #E65100 | #FFE0B2 |
| CASE_OPENED | #4A148C | #E1BEE7 |
| REFERRED | #1B5E20 | #C8E6C9 |
| DISMISSED | #37474F | #90A4AE |

---

## Work Tracks (3 Parallel Worktrees)

### Track A: Foundation Layer (globals.css + layout.tsx + sidebar.tsx)
**Files:**
1. `frontend/src/app/globals.css` — Replace ALL token values in @theme inline block. Add new tokens. Add table/badge base styles.
2. `frontend/src/app/layout.tsx` — Remove Geist font imports. Add Barlow Condensed from Google Fonts. Change body classes from `bg-slate-950 text-slate-100` to `bg-bg-shell text-text-primary`. Change `ml-[200px]` to `ml-[48px]`.
3. `frontend/src/components/sidebar.tsx` — Complete rewrite to icon-only 48px rail. Remove all text labels. Use --bg-sidebar (#1A1F23). Active item: 3px left blue bar. Icons 18px, #78909C inactive, #4A9FD9 active. Border-right: 1px solid #2E3B40.
4. `frontend/src/lib/utils.ts` — Update all 6 color helper functions to use new token values.
5. `frontend/src/components/badges.tsx` — Rewrite all badge configs to use exact Palantir badge colors from token file. 0px radius, 10px uppercase, 600 weight, 0.5px letter-spacing.

### Track B: Core Investigation Pages (rings + cases + ring-detail)
**Files:**
1. `frontend/src/app/rings/page.tsx` — Replace STATUS_CONFIG with new badge colors. Replace all `bg-slate-*`/`text-slate-*` with token classes. Replace raw hex `bg-[#C94B4B]` with `bg-critical`. Table headers: 11px uppercase, 600 weight, 1px letter-spacing. Row height 32px.
2. `frontend/src/app/cases/page.tsx` — Replace STATUS_BADGE, RING_TYPE_CONFIG, DOJ_STATUS_COLOR with token values. Same table styling.
3. `frontend/src/components/ring-detail.tsx` — The big one. Replace ALL 60+ hardcoded hex values:
   - `[#0F1117]` → `bg-shell` → now #263238
   - `[#1A1D27]` → `bg-panel` → now #2C3539
   - `[#2A2D3E]` → `border` → now #37474F
   - `[#2A6EBB]` → `accent` → now #2196F3
   - `[#C94B4B]` → `critical` → now #E53935
   - `[#8B90A8]` → `text-secondary` → now #90A4AE
   - `[#4A4F6A]` → `text-muted` → now #546E7A
   - `[#E8EAF0]` → `text-primary` → now #ECEFF1
   - `[#1E2130]` → `bg-row` → now #2C3539
   - `[#252840]` → `bg-row-hover` → now #2F3D42
   - `[#1C2B4A]` → `bg-selected` → now #1E3A4A
   - `[#D4733A]` → `high` → now #FFB300 (or keep as orange)
   - `[#0A0C12]` → use `bg-sidebar` (#1A1F23)
   - `[#7B5EA7]`/`[#C4A9F0]` → map to a new `--color-info: #7B5EA7` token
   - `[#2A9B6B]` → map to `--color-success: #43A047`
   - `[#334155]` → use border token
   - Sigma graph background: #263238 (bg-shell)
   - Sigma edge color: #37474F (border)
   - All colors must use Tailwind token classes (bg-bg-panel, text-accent, etc.) NOT raw hex
4. `frontend/src/components/charts/ExposureChart.tsx` — Update all hex in tooltip styles and chart colors to new token values.
5. `frontend/src/components/charts/WeeklyDetectionsChart.tsx` — Same as above.

### Track C: Secondary Pages (alerts + analytics + graph + entity)
**Files:**
1. `frontend/src/app/alerts/page.tsx` — Full conversion from Tailwind slate/sky classes to design tokens. Every `bg-slate-*` → `bg-bg-*` token. Every `text-slate-*` → `text-text-*` token. `bg-sky-*` → `bg-accent`.
2. `frontend/src/app/analytics/page.tsx` — Replace FUNNEL hex colors. Replace SVG hardcoded fills. Loading skeletons: `bg-slate-800` → `bg-bg-panel`. All inline hex in USMapPlaceholder SVG.
3. `frontend/src/app/graph/page.tsx` — Replace all slate/sky classes. Update Sigma JS color strings. Node type legend colors.
4. `frontend/src/app/entity/[id]/page.tsx` — Full conversion from Tailwind slate/sky/red to design tokens. Card, Field, ConnectionCard, ScoreBar components.

---

## Acceptance Criteria
1. `cd frontend && npx tsc --noEmit` — zero errors
2. `cd frontend && npm run build` — zero errors
3. All 4 primary pages (/rings, /rings/[id], /cases, /analytics) use new tokens
4. All secondary pages (/alerts, /graph, /entity/[id]) use new tokens
5. Sidebar is icon-only, 48px wide, #1A1F23 background
6. No hardcoded `bg-slate-*`, `text-slate-*`, `bg-sky-*` classes remain
7. No raw hex `[#0F1117]`, `[#1A1D27]`, `[#2A6EBB]`, `[#2A2D3E]` remain
8. Font is system-ui for data, Barlow Condensed for headings
9. All badges are 0px radius rectangles with exact Palantir colors
10. Tables: 32px rows, 12px font, 11px uppercase headers
