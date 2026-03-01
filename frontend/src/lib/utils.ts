/* FraudGraph — Shared utility functions */

import { clsx, type ClassValue } from "clsx";
import type { Severity } from "./types";

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function severityColor(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "text-red-400";
    case "HIGH": return "text-orange-400";
    case "MEDIUM": return "text-yellow-300";
    case "LOW": return "text-sky-400";
  }
}

export function severityBg(severity: Severity): string {
  switch (severity) {
    case "CRITICAL": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "HIGH": return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "MEDIUM": return "bg-yellow-500/20 text-yellow-300 border-yellow-500/30";
    case "LOW": return "bg-sky-500/20 text-sky-400 border-sky-500/30";
  }
}

export function riskScoreColor(score: number): string {
  if (score >= 80) return "text-red-400";
  if (score >= 60) return "text-orange-400";
  if (score >= 40) return "text-yellow-300";
  return "text-sky-400";
}

export function riskScoreBg(score: number): string {
  if (score >= 80) return "bg-red-500/20 text-red-400";
  if (score >= 60) return "bg-orange-500/20 text-orange-400";
  if (score >= 40) return "bg-yellow-500/20 text-yellow-300";
  return "bg-sky-500/20 text-sky-400";
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
