/* FraudGraph — Analytics Command Center: leadership KPI dashboard.
   Wired to real ring/case data via /api/analytics/* endpoints. */
"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { formatCurrency, cn } from "@/lib/utils";
import {
  getAnalyticsDashboard,
  getAnalyticsOutcomes,
  getAnalyticsFraudDistribution,
  getAnalyticsWorkload,
  getAnalyticsCaseAging,
} from "@/lib/api";
import type {
  DashboardResponse,
  OutcomesResponse,
  FraudDistributionResponse,
  WorkloadResponse,
  CaseAgingResponse,
  GeoEntry,
} from "@/lib/types";
import OutcomesSection from "./OutcomesSection";
import FraudDistributionSection from "./FraudDistributionSection";
import WorkloadSection from "./WorkloadSection";
import CaseAgingSection from "./CaseAgingSection";

const ExposureChart = dynamic(() => import("@/components/charts/ExposureChart"), {
  ssr: false,
  loading: () => <div className="w-full h-[280px] bg-[#2C3539] animate-pulse" />,
});

const WeeklyDetectionsChart = dynamic(() => import("@/components/charts/WeeklyDetectionsChart"), {
  ssr: false,
  loading: () => <div className="w-full h-[280px] bg-[#2C3539] animate-pulse" />,
});

/* ------------------------------------------------------------------ */
/*  Page component                                                    */
/* ------------------------------------------------------------------ */

export default function AnalyticsPage() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomesResponse | null>(null);
  const [fraudDist, setFraudDist] = useState<FraudDistributionResponse | null>(null);
  const [workload, setWorkload] = useState<WorkloadResponse | null>(null);
  const [caseAging, setCaseAging] = useState<CaseAgingResponse | null>(null);

  useEffect(() => {
    getAnalyticsDashboard().then(setDashboard).catch(() => {});
    getAnalyticsOutcomes().then(setOutcomes).catch(() => {});
    getAnalyticsFraudDistribution().then(setFraudDist).catch(() => {});
    getAnalyticsWorkload().then(setWorkload).catch(() => {});
    getAnalyticsCaseAging().then(setCaseAging).catch(() => {});
  }, []);

  const kpi = dashboard?.kpi;
  const funnel = dashboard?.pipelineFunnel;
  const funnelMax = funnel?.detected ?? 1;

  const funnelData = useMemo(() => {
    if (!funnel) return [];
    return [
      { stage: "Detected", count: funnel.detected, color: "#2196F3" },
      { stage: "Reviewed", count: funnel.reviewed, color: "#43A047" },
      { stage: "Case Opened", count: funnel.caseOpened, color: "#FFB300" },
      { stage: "Referred", count: funnel.referred, color: "#E53935" },
    ];
  }, [funnel]);

  // Geographic: top 10 states sorted by exposure
  const stateData = useMemo(() => {
    if (!dashboard?.geographicDistribution) return [];
    return Object.entries(dashboard.geographicDistribution)
      .map(([abbr, data]: [string, GeoEntry]) => ({ abbr, ...data }))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 10);
  }, [dashboard]);

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

      {/* Outcomes & ROI — hero section */}
      <div className="mb-6">
        <OutcomesSection data={outcomes} />
      </div>

      {/* KPI Row */}
      <div className="mb-6 grid grid-cols-1 gap-px sm:grid-cols-2 lg:grid-cols-4 bg-border">
        <KPICard label="Total Rings Detected" value={kpi ? kpi.totalRingsDetected.toLocaleString() : "—"} />
        <KPICard label="Total Exposure" value={kpi ? formatCurrency(kpi.totalExposure) : "—"} highlight />
        <KPICard label="Cases Referred to DOJ" value={kpi ? kpi.casesReferred.toLocaleString() : "—"} />
        <KPICard label="Avg Days to Triage" value={kpi ? `${kpi.avgDaysToTriage}d` : "—"} />
      </div>

      {/* Fraud Distribution + Workload row */}
      <div className="mb-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FraudDistributionSection data={fraudDist} />
        <WorkloadSection data={workload} />
      </div>

      {/* Case Aging */}
      <div className="mb-6">
        <CaseAgingSection data={caseAging} />
      </div>

      {/* Charts grid: 2 columns */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Exposure by Ring Type */}
        <Panel title="Exposure by Ring Type">
          <ExposureChart data={dashboard?.exposureByType} />
        </Panel>

        {/* Detection Timeline */}
        <Panel title="Rings Detected per Week (8 Weeks)">
          <WeeklyDetectionsChart data={dashboard?.weeklyDetections} />
        </Panel>

        {/* Pipeline Funnel */}
        <Panel title="Investigation Pipeline">
          {funnelData.length > 0 ? (
            <>
              <div className="space-y-3 py-2">
                {funnelData.map((stage) => (
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
              {funnel && (
                <div className="mt-3 pt-3 border-t border-border">
                  <div className="flex items-center gap-2 text-data text-text-muted">
                    <span>Referral Rate:</span>
                    <span className="font-semibold text-text-primary">
                      {((funnel.referred / funnel.detected) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-data text-text-muted">Loading...</div>
          )}
        </Panel>

        {/* Geographic Distribution */}
        <Panel title="Geographic Distribution">
          {stateData.length > 0 ? (
            <div>
              <table className="w-full">
                <thead>
                  <tr className="text-label">
                    <th className="text-left pb-2 font-medium">STATE</th>
                    <th className="text-right pb-2 font-medium">RINGS</th>
                    <th className="text-right pb-2 font-medium">EXPOSURE</th>
                  </tr>
                </thead>
                <tbody>
                  {stateData.map((s) => (
                    <tr key={s.abbr} className="border-t border-border/50 h-8">
                      <td className="text-data text-text-primary">{s.abbr}</td>
                      <td className="text-right text-data text-text-secondary tabular-nums">{s.rings}</td>
                      <td className="text-right text-data text-accent tabular-nums">{formatCurrency(s.exposure)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-data text-text-muted">Loading...</div>
          )}
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
