/* FraudGraph — Reusable badge components for severity, status, risk scores, and rules.
   Update when adding new badge variants or changing the Palantir color palette. */

import { cn, severityBg, riskScoreBg, ruleDisplayName, statusDisplayName } from "@/lib/utils";
import type { Severity, AlertStatus } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center border px-2 py-0.5 text-[10px] uppercase font-semibold tracking-[0.5px]", severityBg(severity))}>
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

export function StatusBadge({ status }: { status: AlertStatus | string }) {
  const colors: Record<string, string> = {
    NEW: "bg-[#1565C0] text-[#90CAF9]",
    REVIEWING: "bg-[#E65100] text-[#FFE0B2]",
    UNDER_REVIEW: "bg-[#E65100] text-[#FFE0B2]",
    ESCALATED: "bg-[#4A148C] text-[#E1BEE7]",
    CASE_OPENED: "bg-[#4A148C] text-[#E1BEE7]",
    DISMISSED: "bg-[#37474F] text-[#90A4AE]",
    RESOLVED: "bg-[#1B5E20] text-[#C8E6C9]",
    REFERRED: "bg-[#1B5E20] text-[#C8E6C9]",
    OPEN: "bg-[#1565C0] text-[#90CAF9]",
    IN_REVIEW: "bg-[#E65100] text-[#FFE0B2]",
  };
  return (
    <span className={cn("inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-semibold tracking-[0.5px]", colors[status] || colors.NEW)}>
      {statusDisplayName(status)}
    </span>
  );
}

export function RuleBadge({ rule }: { rule: string }) {
  return (
    <span className="inline-flex items-center border border-[#455A64] bg-[#2C3539] px-2 py-0.5 text-[10px] uppercase font-semibold tracking-[0.5px] text-[#90A4AE]">
      {ruleDisplayName(rule)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <SeverityBadge severity={priority as Severity} />;
}
