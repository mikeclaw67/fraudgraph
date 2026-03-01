/* FraudGraph — Analytics Command Center: leadership KPI dashboard */
"use client";

import { useMemo } from "react";
import { formatCurrency, cn } from "@/lib/utils";
import ExposureChart from "@/components/charts/ExposureChart";
import WeeklyDetectionsChart from "@/components/charts/WeeklyDetectionsChart";

/* ------------------------------------------------------------------ */
/*  Mock data — hardcoded                                             */
/* ------------------------------------------------------------------ */

const KPI = {
  totalRings: 347,
  totalExposure: 892_400_000,
  casesReferred: 64,
  avgDaysToTriage: 3.2,
};


const FUNNEL: { stage: string; count: number; color: string }[] = [
  { stage: "Detected",   count: 347, color: "#2196F3" },
  { stage: "Reviewed",   count: 281, color: "#43A047" },
  { stage: "Case Opened", count: 142, color: "#FFB300" },
  { stage: "Referred",   count: 64,  color: "#FFB300" },
  { stage: "Convicted",  count: 23,  color: "#E53935" },
];

/* US state top-10 heatmap data */
const STATE_DATA: { state: string; abbr: string; rings: number; exposure: number }[] = [
  { state: "Florida",        abbr: "FL", rings: 62,  exposure: 187_000_000 },
  { state: "Texas",          abbr: "TX", rings: 48,  exposure: 134_000_000 },
  { state: "California",     abbr: "CA", rings: 41,  exposure: 121_000_000 },
  { state: "New York",       abbr: "NY", rings: 37,  exposure: 98_000_000  },
  { state: "Georgia",        abbr: "GA", rings: 29,  exposure: 76_000_000  },
  { state: "Illinois",       abbr: "IL", rings: 24,  exposure: 62_000_000  },
  { state: "New Jersey",     abbr: "NJ", rings: 22,  exposure: 58_000_000  },
  { state: "Maryland",       abbr: "MD", rings: 19,  exposure: 44_000_000  },
  { state: "Pennsylvania",   abbr: "PA", rings: 17,  exposure: 39_000_000  },
  { state: "Ohio",           abbr: "OH", rings: 14,  exposure: 31_000_000  },
];

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const funnelMax = useMemo(() => FUNNEL[0].count, []);

  return (
    <div className="min-h-screen bg-bg-shell p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">
          Analytics Command Center
        </h1>
        <p className="mt-1 text-data text-text-secondary">
          Fraud ring detection performance &amp; investigation pipeline — PPP / EIDL Program
        </p>
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4 bg-border">
        <KPICard label="Total Rings Detected" value={KPI.totalRings.toLocaleString()} />
        <KPICard label="Total Exposure" value={formatCurrency(KPI.totalExposure)} highlight />
        <KPICard label="Cases Referred to DOJ" value={KPI.casesReferred.toLocaleString()} />
        <KPICard label="Avg Days to Triage" value={`${KPI.avgDaysToTriage}d`} />
      </div>

      {/* Main grid: 2 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Exposure by Ring Type — bar chart  */}
        <Panel title="Exposure by Ring Type">
          <ExposureChart />
        </Panel>

        {/* Detection Timeline — line chart  */}
        <Panel title="Rings Detected per Week (6 Months)">
          <WeeklyDetectionsChart />
        </Panel>

        {/* Pipeline Funnel */}
        <Panel title="Investigation Pipeline">
          <div className="space-y-3 py-2">
            {FUNNEL.map((stage) => (
              <div key={stage.stage} className="flex items-center gap-3">
                <span className="w-[100px] text-right text-data text-text-secondary shrink-0">
                  {stage.stage}
                </span>
                <div className="flex-1 h-7 bg-bg-shell relative">
                  <div
                    className="h-full absolute left-0 top-0 flex items-center pl-2"
                    style={{
                      width: `${(stage.count / funnelMax) * 100}%`,
                      backgroundColor: stage.color,
                      minWidth: 40,
                    }}
                  >
                    <span className="text-[11px] font-semibold text-white tabular-nums">
                      {stage.count.toLocaleString()}
                    </span>
                  </div>
                </div>
                <span className="w-[48px] text-right text-data text-text-muted tabular-nums shrink-0">
                  {((stage.count / funnelMax) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 text-data text-text-muted">
              <span>Overall Conviction Rate:</span>
              <span className="font-semibold text-text-primary">
                {((FUNNEL[4].count / FUNNEL[0].count) * 100).toFixed(1)}%
              </span>
              <span className="mx-2">|</span>
              <span>Referral Rate:</span>
              <span className="font-semibold text-text-primary">
                {((FUNNEL[3].count / FUNNEL[0].count) * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        </Panel>

        {/* State Map Placeholder */}
        <Panel title="Geographic Distribution">
          {/* Static US map SVG placeholder */}
          <div className="relative mb-4">
            <USMapPlaceholder />
          </div>
          {/* Top states table */}
          <div className="border-t border-border pt-3">
            <table className="w-full">
              <thead>
                <tr className="text-label">
                  <th className="text-left pb-2 font-medium">State</th>
                  <th className="text-right pb-2 font-medium">Rings</th>
                  <th className="text-right pb-2 font-medium">Exposure</th>
                </tr>
              </thead>
              <tbody>
                {STATE_DATA.slice(0, 5).map((s) => (
                  <tr key={s.abbr} className="border-t border-border/50">
                    <td className="py-1.5 text-data text-text-primary">{s.state}</td>
                    <td className="py-1.5 text-right text-data text-text-secondary tabular-nums">{s.rings}</td>
                    <td className="py-1.5 text-right text-data text-accent tabular-nums">{formatCurrency(s.exposure)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function KPICard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-bg-panel px-5 py-4">
      <div className="text-label mb-1">{label}</div>
      <div className={cn(
        "text-[22px] font-semibold tabular-nums",
        highlight ? "text-critical" : "text-text-primary"
      )}>
        {value}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label text-text-secondary font-semibold tracking-wider">
        {title}
      </h3>
      {children}
    </div>
  );
}

function USMapPlaceholder() {
  return (
    <svg viewBox="0 0 960 600" className="w-full h-auto" aria-label="US geographic heatmap placeholder">
      {/* Continental US outline — simplified */}
      <g fill="none" stroke="#37474F" strokeWidth={1}>
        {/* Background fill */}
        <rect x="0" y="0" width="960" height="600" fill="#263238" />
        {/* State outlines — highly simplified continental US shape */}
        <path d="M220,130 L280,120 L340,115 L400,110 L460,105 L520,100 L560,95 L600,100 L640,105 L680,110 L720,115 L760,125 L800,140 L830,160 L845,190 L850,220 L845,250 L830,280 L810,310 L790,340 L770,370 L750,390 L720,405 L690,415 L660,420 L630,430 L600,440 L570,445 L540,440 L500,430 L460,420 L420,410 L380,400 L340,395 L300,400 L260,410 L230,425 L210,440 L190,450 L170,440 L160,420 L155,395 L160,365 L170,335 L180,305 L185,275 L190,245 L195,215 L200,185 L205,155 Z"
              fill="#2C3539" stroke="#37474F" strokeWidth={1.5} />
      </g>
      {/* Hotspot dots for top states */}
      {[
        { x: 770, y: 380, r: 14, abbr: "FL" },
        { x: 500, y: 400, r: 12, abbr: "TX" },
        { x: 170, y: 300, r: 11, abbr: "CA" },
        { x: 800, y: 180, r: 10, abbr: "NY" },
        { x: 720, y: 340, r: 9,  abbr: "GA" },
        { x: 620, y: 240, r: 8,  abbr: "IL" },
        { x: 810, y: 195, r: 7,  abbr: "NJ" },
        { x: 790, y: 230, r: 7,  abbr: "MD" },
        { x: 770, y: 210, r: 6,  abbr: "PA" },
        { x: 700, y: 230, r: 6,  abbr: "OH" },
      ].map((dot) => (
        <g key={dot.abbr}>
          <circle cx={dot.x} cy={dot.y} r={dot.r} fill="#2196F3" opacity={0.6} />
          <circle cx={dot.x} cy={dot.y} r={dot.r * 0.5} fill="#2196F3" opacity={0.9} />
          <text x={dot.x} y={dot.y - dot.r - 4} textAnchor="middle" fill="#90A4AE" fontSize={10}>
            {dot.abbr}
          </text>
        </g>
      ))}
      {/* Legend */}
      <g transform="translate(40, 520)">
        <text fill="#546E7A" fontSize={10} fontWeight={600}>CONCENTRATION</text>
        <circle cx={0} cy={20} r={4} fill="#2196F3" opacity={0.5} />
        <text x={10} y={24} fill="#90A4AE" fontSize={10}>Low</text>
        <circle cx={60} cy={20} r={7} fill="#2196F3" opacity={0.7} />
        <text x={72} y={24} fill="#90A4AE" fontSize={10}>Med</text>
        <circle cx={120} cy={20} r={10} fill="#2196F3" opacity={0.9} />
        <text x={135} y={24} fill="#90A4AE" fontSize={10}>High</text>
      </g>
    </svg>
  );
}
