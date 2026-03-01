RALPH_DONE: Analytics charts fix — removed dynamic() wrapper, direct imports

Root cause: dynamic() with ssr:false broke Recharts ResponsiveContainer DOM measurement during async chunk load. Page is already "use client" so dynamic import was unnecessary.

Fix: Replaced dynamic() with direct imports for ExposureChart and WeeklyDetectionsChart in analytics/page.tsx. No other files touched.
