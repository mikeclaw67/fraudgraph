/* Case Aging / Bottleneck Analysis section.
   Shows time-bucket table + top aged cases with reasons. */
"use client";

import type { CaseAgingResponse, AgingBucket } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

const SEVERITY_ICONS: Record<string, string> = {
  on_track: "\u2705",   // green check
  watch: "\u26A0\uFE0F",    // warning
  escalate: "\uD83D\uDD34",  // red circle
  blocker: "\uD83D\uDD34",   // red circle
};

interface Props {
  data: CaseAgingResponse | null;
}

function BucketRow({ label, bucket }: { label: string; bucket: AgingBucket }) {
  return (
    <tr className="border-t border-border/50 h-8">
      <td className="text-data text-text-primary">{label}</td>
      <td className="text-right text-data text-text-primary tabular-nums">{bucket.count}</td>
      <td className="text-data text-text-secondary">
        {SEVERITY_ICONS[bucket.severity] || ""} {bucket.severity === "on_track" ? "On track" : bucket.severity === "watch" ? "Watch" : bucket.severity === "escalate" ? "Escalate" : "BLOCKER"}
      </td>
      {bucket.totalExposure ? (
        <td className="text-right text-data text-[#E53935] tabular-nums">{formatCurrency(bucket.totalExposure)}</td>
      ) : (
        <td />
      )}
    </tr>
  );
}

export default function CaseAgingSection({ data }: Props) {
  if (!data) {
    return (
      <div className="bg-bg-panel border border-border p-4 animate-pulse">
        <div className="h-4 bg-bg-shell w-48 mb-4" />
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-bg-shell" />)}
        </div>
      </div>
    );
  }

  const openBuckets = data.byStatus.OPEN;
  const reviewBuckets = data.byStatus.UNDER_REVIEW;

  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label text-text-secondary font-semibold tracking-wider">
        CASE PIPELINE AGING
      </h3>

      {/* OPEN cases aging */}
      <div className="mb-4">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">OPEN CASES</div>
        <table className="w-full">
          <thead>
            <tr className="text-label border-b border-border">
              <th className="text-left pb-1 font-medium">AGE</th>
              <th className="text-right pb-1 font-medium">COUNT</th>
              <th className="text-left pb-1 font-medium pl-2">STATUS</th>
              <th className="text-right pb-1 font-medium">EXPOSURE</th>
            </tr>
          </thead>
          <tbody>
            <BucketRow label="< 7 days" bucket={openBuckets.under_7} />
            <BucketRow label="7 – 30 days" bucket={openBuckets["7_to_30"]} />
            <BucketRow label="30 – 60 days" bucket={openBuckets["30_to_60"]} />
            <BucketRow label="60+ days" bucket={openBuckets.over_60} />
          </tbody>
        </table>
      </div>

      {/* UNDER_REVIEW cases aging */}
      <div className="mb-4 pt-3 border-t border-border/50">
        <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">UNDER REVIEW</div>
        <table className="w-full">
          <thead>
            <tr className="text-label border-b border-border">
              <th className="text-left pb-1 font-medium">AGE</th>
              <th className="text-right pb-1 font-medium">COUNT</th>
              <th className="text-left pb-1 font-medium pl-2">STATUS</th>
              <th className="text-right pb-1 font-medium">EXPOSURE</th>
            </tr>
          </thead>
          <tbody>
            <BucketRow label="< 7 days" bucket={reviewBuckets.under_7} />
            <BucketRow label="7 – 14 days" bucket={reviewBuckets["7_to_14"]} />
            <BucketRow label="14+ days" bucket={reviewBuckets.over_14} />
          </tbody>
        </table>
      </div>

      {/* Top Blockers */}
      {data.topBlockers.length > 0 && (
        <div className="pt-3 border-t border-border">
          <div className="text-[10px] uppercase tracking-wider text-text-muted mb-2">TOP BLOCKERS</div>
          <div className="space-y-2">
            {data.topBlockers.map((b, i) => (
              <div key={b.caseId} className="flex items-start gap-2 bg-[#E53935]/5 px-3 py-2 border border-[#E53935]/20">
                <span className="text-data text-text-muted shrink-0">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  <div className="text-data text-text-primary font-medium truncate">
                    {b.caseId}: {b.title}
                  </div>
                  <div className="text-[10px] text-text-muted mt-0.5">
                    {formatCurrency(b.exposure)} exposure &middot; {b.daysAged} days &middot; {b.reason}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
