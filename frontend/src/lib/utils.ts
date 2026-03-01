/* FraudGraph — Shared utility functions for formatting, color mapping, and display names.
   Update when adding new severity levels, risk thresholds, or rule types. */

import { clsx, type ClassValue } from "clsx";
import type { Severity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "text-[#E53935]";
    case "HIGH": return "text-[#FFB300]";
    case "MEDIUM": return "text-[#FFB300]";
    case "LOW": return "text-[#43A047]";
  }
}

export function severityBg(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "bg-[#E53935]/20 text-[#E53935] border-[#E53935]/30";
    case "HIGH": return "bg-[#FFB300]/20 text-[#FFB300] border-[#FFB300]/30";
    case "MEDIUM": return "bg-[#FFB300]/20 text-[#FFB300] border-[#FFB300]/30";
    case "LOW": return "bg-[#43A047]/20 text-[#43A047] border-[#43A047]/30";
  }
}

export function riskScoreColor(score: number): string {
  if (score >= 80) return "text-[#E53935]";
  if (score >= 60) return "text-[#FFB300]";
  if (score >= 40) return "text-[#FFB300]";
  return "text-[#43A047]";
}

export function riskScoreBg(score: number): string {
  if (score >= 80) return "bg-[#E53935]/20 text-[#E53935]";
  if (score >= 60) return "bg-[#FFB300]/20 text-[#FFB300]";
  if (score >= 40) return "bg-[#FFB300]/20 text-[#FFB300]";
  return "bg-[#43A047]/20 text-[#43A047]";
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

/** Heat-map risk score color — single source of truth for threshold logic.
 *  0-49: muted green | 50-74: yellow-amber | 75-94: orange | 95-100: red */
export function getRiskColor(score: number): string {
  if (score >= 95) return "text-[#E53935]";
  if (score >= 75) return "text-[#FFB300]";
  if (score >= 50) return "text-[#FFB300]";
  return "text-[#43A047]";
}

/** Background variant of heat-map risk color for cells/badges */
export function getRiskBg(score: number): string {
  if (score >= 95) return "bg-[#E53935]/15 text-[#E53935]";
  if (score >= 75) return "bg-[#FFB300]/15 text-[#FFB300]";
  if (score >= 50) return "bg-[#FFB300]/15 text-[#FFB300]";
  return "bg-[#43A047]/15 text-[#43A047]";
}
