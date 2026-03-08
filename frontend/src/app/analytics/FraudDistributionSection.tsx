/* Fraud Type & Severity Distribution section.
   Shows exposure by domain (PPP/Medicaid/Procurement) + severity tiers. */
"use client";

import type { FraudDistributionResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "text-[#E53935]",
  HIGH: "text-[#FFB300]",
  MEDIUM: "text-[#FFB300]",
  LOW: "text-[#43A047]",
};

const SEVERITY_BG: Record<string, string> = {
  CRITICAL: "bg-[#E53935]/15",
  HIGH: "bg-[#FFB300]/15",
  MEDIUM: "bg-[#FFB300]/10",
  LOW: "bg-[#43A047]/10",
};

interface Props {
  data: FraudDistributionResponse | null;
}

export default function FraudDistributionSection({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-bg-panel border border-border p-4 animate-pulse">
        <div className="h-4 bg-bg-shell w-48 mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-bg-shell" />)}
        </div>
      </div>
    );
  }

  const totalExposure = Object.values(data.byType).reduce((s, d) => s + d.exposure, 0);

  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label text-text-secondary font-semibold tracking-wider">
        FRAUD TYPE & SEVERITY DISTRIBUTION
      </h3>

      {/* By Domain */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">BY DOMAIN</div>
        <div className="space-y-2">
          {Object.entries(data.byType)
            .sort(([, a], [, b]) => b.exposure - a.exposure)
            .map(([domain, info]) => {
              const pct = totalExposure > 0 ? (info.exposure / totalExposure) * 100 : 0;
              return (
                <div key={domain} className="flex items-center gap-3">
                  <span className="w-[90px] text-data text-text-primary shrink-0">{domain}</span>
                  <div className="flex-1 h-5 bg-bg-shell relative">
                    <div
                      className="h-full bg-accent absolute left-0 top-0"
                      style={{ width: `${pct}%`, minWidth: 2 }}
                    />
                  </div>
                  <span className="w-[80px] text-right text-data text-accent tabular-nums shrink-0">
                    {formatCurrency(info.exposure)}
                  </span>
                  <span className="w-[48px] text-right text-data text-text-muted tabular-nums shrink-0">
                    {pct.toFixed(1)}%
                  </span>
                  <span className="w-[60px] text-right text-data text-text-secondary tabular-nums shrink-0">
                    {info.rings} rings
                  </span>
                </div>
              );
            })}
        </div>
      </div>

      {/* By Severity */}
      <div className="pt-3 border-t border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">BY SEVERITY TIER</div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((tier) => {
            const entry = data.bySeverity[tier];
            if (!entry) return null;
            return (
              <div key={tier} className={`px-3 py-2 ${SEVERITY_BG[tier]}`}>
                <div className={`text-label font-semibold ${SEVERITY_COLORS[tier]}`}>{tier}</div>
                <div className="text-[15px] font-semibold text-text-primary tabular-nums mt-1">
                  {formatCurrency(entry.exposure)}
                </div>
                <div className="text-[10px] text-text-muted">{entry.rings} rings</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
