/* Investigator Workload section.
   Shows team capacity, cases per investigator, utilization %, hiring signals. */
"use client";

import type { WorkloadResponse } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

interface Props {
  data: WorkloadResponse | null;
}

export default function WorkloadSection({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-bg-panel border border-border p-4 animate-pulse">
        <div className="h-4 bg-bg-shell w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <div key={i} className="h-8 bg-bg-shell" />)}
        </div>
      </div>
    );
  }

  const { investigators, teamCapacity } = data;
  const util = teamCapacity.utilizationPercent;
  const utilColor = util >= 90 ? "text-[#E53935]" : util >= 75 ? "text-[#FFB300]" : "text-[#43A047]";
  const utilLabel = util >= 90 ? "CRITICAL" : util >= 75 ? "NEAR FULL" : "HEALTHY";

  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label text-text-secondary font-semibold tracking-wider">
        INVESTIGATOR PRODUCTIVITY
      </h3>

      {/* Investigator table */}
      <table className="w-full mb-4">
        <thead>
          <tr className="text-label border-b border-border">
            <th className="text-left pb-2 font-medium">INVESTIGATOR</th>
            <th className="text-left pb-2 font-medium">ROLE</th>
            <th className="text-right pb-2 font-medium">CASES</th>
            <th className="text-right pb-2 font-medium">EXPOSURE</th>
            <th className="text-right pb-2 font-medium">ROI</th>
            <th className="text-right pb-2 font-medium">REFERRALS</th>
          </tr>
        </thead>
        <tbody>
          {investigators.map((inv) => (
            <tr key={inv.name} className="border-t border-border/50 h-8">
              <td className="text-data text-text-primary">{inv.name}</td>
              <td className="text-data text-text-secondary">{inv.role}</td>
              <td className="text-right text-data text-text-primary tabular-nums">{inv.openCases}</td>
              <td className="text-right text-data text-accent tabular-nums">{formatCurrency(inv.totalExposure)}</td>
              <td className="text-right text-data text-[#43A047] tabular-nums">{inv.estimatedRoi.toLocaleString()}x</td>
              <td className="text-right text-data text-text-secondary tabular-nums">{inv.caseReferrals}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Capacity bar */}
      <div className="pt-3 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-data text-text-secondary">
            Team Capacity: {teamCapacity.used}/{teamCapacity.max} cases
          </span>
          <span className={`text-label font-semibold ${utilColor}`}>
            {util.toFixed(0)}% — {utilLabel}
          </span>
        </div>
        <div className="h-3 bg-bg-shell w-full">
          <div
            className={`h-full ${util >= 90 ? "bg-[#E53935]" : util >= 75 ? "bg-[#FFB300]" : "bg-[#43A047]"}`}
            style={{ width: `${Math.min(util, 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}
