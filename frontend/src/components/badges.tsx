/* FraudGraph -- Reusable badge components with Palantir-parity token colors.
   Update when status values change or new badge types are added. */

import { cn, severityBg, riskScoreBg, ruleDisplayName, statusDisplayName } from "@/lib/utils";
import type { Severity, AlertStatus } from "@/lib/types";

/** Shared badge base: 10px uppercase, weight 600, 0.5px letter-spacing, tight padding */
const BADGE_BASE = "inline-flex items-center border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.5px]";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn(BADGE_BASE, severityBg(severity))}>
      {severity}
    </span>
  );
}

export function RiskScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center font-bold tabular-nums",
        riskScoreBg(score),
        size === "lg" ? "h-14 w-14 text-xl" : "h-8 min-w-[2rem] px-1.5 text-sm"
      )}
    >
      {Math.round(score)}
    </span>
  );
}

/** Status badge with exact Palantir token colors per status */
export function StatusBadge({ status }: { status: AlertStatus | string }) {
  const colors: Record<string, string> = {
    NEW: "bg-[#1565C0] text-[#90CAF9] border-[#1565C0]",
    UNDER_REVIEW: "bg-[#E65100] text-[#FFE0B2] border-[#E65100]",
    CASE_OPENED: "bg-[#4A148C] text-[#E1BEE7] border-[#4A148C]",
    REFERRED: "bg-[#1B5E20] text-[#C8E6C9] border-[#1B5E20]",
    DISMISSED: "bg-[#37474F] text-[#90A4AE] border-[#37474F]",
    REVIEWING: "bg-[#E65100] text-[#FFE0B2] border-[#E65100]",
    ESCALATED: "bg-critical/20 text-critical border-critical/30",
    RESOLVED: "bg-success/20 text-success border-success/30",
    OPEN: "bg-[#1565C0] text-[#90CAF9] border-[#1565C0]",
    IN_REVIEW: "bg-[#E65100] text-[#FFE0B2] border-[#E65100]",
    DETECTED: "bg-[#1565C0] text-[#90CAF9] border-[#1565C0]",
    CLOSED: "bg-[#37474F] text-[#90A4AE] border-[#37474F]",
    REFERRED_TO_DOJ: "bg-[#1B5E20] text-[#C8E6C9] border-[#1B5E20]",
  };
  return (
    <span className={cn(BADGE_BASE, colors[status] || colors.NEW)}>
      {statusDisplayName(status)}
    </span>
  );
}

export function RuleBadge({ rule }: { rule: string }) {
  return (
    <span className={cn(BADGE_BASE, "border-border-2 bg-bg-panel text-text-secondary")}>
      {ruleDisplayName(rule)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <SeverityBadge severity={priority as Severity} />;
}
