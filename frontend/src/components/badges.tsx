/* FraudGraph — Reusable badge components for severity and risk scores */

import { cn, severityBg, riskScoreBg, ruleDisplayName, statusDisplayName } from "@/lib/utils";
import type { Severity, AlertStatus } from "@/lib/types";

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold", severityBg(severity))}>
      {severity}
    </span>
  );
}

export function RiskScoreBadge({ score, size = "sm" }: { score: number; size?: "sm" | "lg" }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-bold tabular-nums",
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
    NEW: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    REVIEWING: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    ESCALATED: "bg-red-500/20 text-red-400 border-red-500/30",
    DISMISSED: "bg-slate-500/20 text-slate-400 border-slate-500/30",
    RESOLVED: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    OPEN: "bg-sky-500/20 text-sky-400 border-sky-500/30",
    IN_REVIEW: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  };
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", colors[status] || colors.NEW)}>
      {statusDisplayName(status)}
    </span>
  );
}

export function RuleBadge({ rule }: { rule: string }) {
  return (
    <span className="inline-flex items-center rounded-md border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
      {ruleDisplayName(rule)}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: string }) {
  return <SeverityBadge severity={priority as Severity} />;
}
