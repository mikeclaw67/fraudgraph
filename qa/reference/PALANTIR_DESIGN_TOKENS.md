# Real Palantir Design Tokens
# Extracted from 3 real Palantir video demos, 79 frames analyzed
# Date: 2026-03-01

## CRITICAL CORRECTIONS (what we got wrong)

### Background — WE HAD THIS WRONG
Our current: #0F1117 — generic GitHub dark, looks like SaaS dark mode
Real Palantir: #263238 — DESATURATED TEAL-CHARCOAL (blue-steel)
This is the single most impactful change. Changes the entire feeling from "dark SaaS" to "operational command center."

--bg-primary:   #263238   /* main app background */
--bg-panel:     #2C3539   /* panels, cards */
--bg-sidebar:   #1A1F23   /* sidebar — near-black blue undertone */
--bg-topbar:    #37474F   /* tab bar, top chrome */
--bg-input:     #1E292E   /* inputs, dropdowns */
--bg-hover:     #2F3D42   /* row hover */
--bg-selected:  #1E3A4A   /* selected row */

### Typography — WE HAD THIS WRONG
Our current: Inter (generic SaaS font — makes it look like Linear/Notion)
Real Palantir data: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui
Real Palantir headlines: Barlow Condensed (or Inter Tight as fallback)
Density comes from SIZE + SPACING, not font choice.

font-data:    system-ui, -apple-system, sans-serif
font-display: "Barlow Condensed", "Barlow", system-ui, sans-serif
size-cell:    12px
size-label:   11px, uppercase, letter-spacing: 0.5px
size-header:  11px, uppercase, weight: 600, letter-spacing: 1px
size-heading: 14px, weight: 500

### Accent Blue — WE HAD THIS WRONG
Our current: #2A6EBB (too dim, looks corporate)
Real Palantir: #2196F3 / #4A9FD9 (brighter, more saturated, more authoritative)

--accent:       #2196F3
--accent-dim:   #1565C0
--critical:     #E53935
--warning:      #FFB300
--success:      #43A047
--text-1:       #ECEFF1  /* primary — cool white */
--text-2:       #90A4AE  /* secondary — blue-gray */
--text-3:       #546E7A  /* disabled */
--border-1:     #37474F  /* subtle dividers */
--border-2:     #455A64  /* panel borders */

## What stays the same
--radius: 0px — confirmed correct, enforce everywhere without exception
Status dots only: 50%

## Sidebar (confirmed from real screenshots)
Width: 48px — icon rail ONLY, NO text labels, ever
Background: #1A1F23
Icons: 18px, #78909C inactive, #4A9FD9 active
Active: 3px left blue bar + icon highlight
Border-right: 1px solid #2E3B40

## Tables
Row height: 32px
Padding: 0 12px
Font: 12px system-ui
Header: 11px uppercase, weight 600, letter-spacing: 1px, color #78909C
Header bg: #2C3539
Row border: 1px solid #37474F horizontal only
Hover: #2F3D42

## Badges
Shape: 0px radius (rectangles, NOT pills)
Padding: 2px 8px
Font: 10px uppercase, weight 600, letter-spacing: 0.5px
NEW:          bg #1565C0 text #90CAF9
UNDER REVIEW: bg #E65100 text #FFE0B2
CASE OPENED:  bg #4A148C text #E1BEE7
REFERRED:     bg #1B5E20 text #C8E6C9
DISMISSED:    bg #37474F text #90A4AE
