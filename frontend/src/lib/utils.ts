/* FraudGraph -- Shared utility functions: classname merging, color helpers, formatters.
   Update when design tokens change or new severity/risk mappings are needed. */

import { clsx, type ClassValue } from "clsx";
import type { Severity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Severity text color using design token classes */
export function severityColor(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "text-critical";
    case "HIGH": return "text-high";
    case "MEDIUM": return "text-medium";
    case "LOW": return "text-low";
  }
}

/** Severity badge background + text + border using design token classes */
export function severityBg(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "bg-critical/20 text-critical border-critical/30";
    case "HIGH": return "bg-high/20 text-high border-high/30";
    case "MEDIUM": return "bg-medium/20 text-medium border-medium/30";
    case "LOW": return "bg-low/20 text-low border-low/30";
  }
}

/** Risk score text color -- threshold-based using design tokens */
export function riskScoreColor(score: number): string {
  if (score >= 80) return "text-critical";
  if (score >= 60) return "text-high";
  if (score >= 40) return "text-medium";
  return "text-low";
}

/** Risk score badge background using design tokens */
export function riskScoreBg(score: number): string {
  if (score >= 80) return "bg-critical/20 text-critical";
  if (score >= 60) return "bg-high/20 text-high";
  if (score >= 40) return "bg-medium/20 text-medium";
  return "bg-low/20 text-low";
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(amount);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit",
  });
}

export function ruleDisplayName(rule: string): string {
  const names: Record<string, string> = {
    ADDR_REUSE: "Address Reuse",
    EIN_REUSE: "EIN Recycling",
    STRAW_CO: "Straw Company",
    THRESHOLD_GAME: "Threshold Gaming",
    ACCOUNT_SHARE: "Shared Bank Account",
    NEW_EIN: "New EIN",
  };
  return names[rule] || rule;
}

export function statusDisplayName(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Heat-map risk score color -- single source of truth for threshold logic.
 *  0-49: low green | 50-74: medium amber | 75-94: high | 95-100: critical red */
export function getRiskColor(score: number): string {
  if (score >= 95) return "text-critical";
  if (score >= 75) return "text-high";
  if (score >= 50) return "text-medium";
  return "text-low";
}

/** Background variant of heat-map risk color for cells/badges */
export function getRiskBg(score: number): string {
  if (score >= 95) return "bg-critical/15 text-critical";
  if (score >= 75) return "bg-high/15 text-high";
  if (score >= 50) return "bg-medium/15 text-medium";
  return "bg-low/15 text-low";
}
