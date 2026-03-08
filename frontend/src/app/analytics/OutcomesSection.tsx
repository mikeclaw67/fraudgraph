/* Outcomes & ROI — Congressional metrics section.
   Shows convictions, recovery forecast, ROI ratio, referral rate. */
"use client";

import type { OutcomesResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: OutcomesResponse | null;
}

export default function OutcomesSection({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-bg-panel border border-border p-4 animate-pulse">
        <div className="h-4 bg-bg-shell w-48 mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 bg-bg-shell" />)}
        </div>
      </div>
    );
  }

  const cards: { label: string; value: string; sub?: string; accent?: boolean }[] = [
    {
      label: "CONVICTIONS (EST.)",
      value: data.convictions.toLocaleString(),
      sub: `${(data.convictionRate * 100).toFixed(0)}% conviction rate`,
    },
    {
      label: "EXPECTED RECOVERIES",
      value: formatCurrency(data.expectedRecoveries),
      sub: `${(data.assumptions.recoveryRate * 100).toFixed(0)}% of referred exposure`,
      accent: true,
    },
    {
      label: "RETURN ON INVESTIGATION",
      value: `${data.roi.toFixed(1)}x`,
      sub: `vs ${formatCurrency(data.investigationCost)} cost`,
      accent: true,
    },
    {
      label: "REFERRAL RATE",
      value: `${(data.referralRate * 100).toFixed(1)}%`,
      sub: "referred / detected",
    },
    {
      label: "COST PER CASE",
      value: formatCurrency(data.costPerCase),
      sub: "budget / open cases",
    },
    {
      label: "AVG DAYS TO REFERRAL",
      value: `${data.avgDaysToReferral}d`,
      sub: "creation → DOJ referral",
    },
  ];

  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label text-text-secondary font-semibold tracking-wider">
        OUTCOMES & ROI — 6-MONTH ROLLING
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-px bg-border">
        {cards.map((c) => (
          <div key={c.label} className="bg-bg-panel px-3 py-3">
            <div className="text-[10px] uppercase tracking-wider text-text-muted mb-1">{c.label}</div>
            <div className={`text-lg font-semibold tabular-nums ${c.accent ? "text-[#43A047]" : "text-text-primary"}`}>
              {c.value}
            </div>
            {c.sub && <div className="text-[10px] text-text-muted mt-0.5">{c.sub}</div>}
          </div>
        ))}
      </div>
      <div className="mt-3 pt-2 border-t border-border/50 text-[10px] text-text-muted">
        Assumptions: {(data.assumptions.recoveryRate * 100).toFixed(0)}% recovery rate on exposed amount
        &middot; {(data.assumptions.convictionRate * 100).toFixed(0)}% conviction rate on referred cases
        &middot; {formatCurrency(data.assumptions.annualPerInvestigatorCost)}/yr per investigator fully-loaded
      </div>
    </div>
  );
}
