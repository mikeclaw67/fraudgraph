/* FraudGraph — Ring Queue: primary triage view for fraud ring investigations */
"use client";

import Link from "next/link";
import { useState, useMemo } from "react";
import { FRAUD_RINGS } from "@/lib/ring-data";
import { formatCurrency, formatDate, cn, getRiskColor } from "@/lib/utils";
import type { RingType, RingStatus } from "@/lib/types";

const RING_TYPE_CONFIG: Record<RingType, { icon: string; label: string; bg: string }> = {
  ADDRESS_FARM: { icon: "\u{1F3E0}", label: "ADDRESS FARM", bg: "bg-slate-700/40 text-slate-300" },
  ACCOUNT_CLUSTER: { icon: "\u{1F3E6}", label: "ACCOUNT CLUSTER", bg: "bg-slate-700/40 text-slate-300" },
  EIN_RECYCLER: { icon: "\u{1F522}", label: "EIN RECYCLER", bg: "bg-slate-700/40 text-slate-300" },
  STRAW_COMPANY: { icon: "\u{1F47B}", label: "STRAW COMPANY", bg: "bg-slate-700/40 text-slate-300" },
  THRESHOLD_GAMING: { icon: "\u{1F3AF}", label: "THRESHOLD GAMING", bg: "bg-slate-700/40 text-slate-300" },
};

const STATUS_CONFIG: Record<RingStatus, { label: string; bg: string }> = {
  NEW: { label: "NEW", bg: "bg-sky-500/20 text-sky-400 border border-sky-500/30" },
  UNDER_REVIEW: { label: "UNDER REVIEW", bg: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  REFERRED: { label: "REFERRED", bg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  DISMISSED: { label: "DISMISSED", bg: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
};

type SortField = "total_exposure" | "avg_risk_score" | "member_count" | "detected_at";
type SortDir = "asc" | "desc";

export default function RingQueuePage() {
  const [sortField, setSortField] = useState<SortField>("total_exposure");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<RingStatus | "ALL">("ALL");

  const filtered = useMemo(() => {
    let rings = [...FRAUD_RINGS];
    if (statusFilter !== "ALL") {
      rings = rings.filter((r) => r.status === statusFilter);
    }
    rings.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return rings;
  }, [sortField, sortDir, statusFilter]);

  const totalRings = FRAUD_RINGS.length;
  const unreviewed = FRAUD_RINGS.filter((r) => r.status === "NEW").length;
  const totalExposure = FRAUD_RINGS.reduce((sum, r) => sum + r.total_exposure, 0);
  const referredToDoj = FRAUD_RINGS.filter((r) => r.status === "REFERRED").length;

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  }

  function sortIndicator(field: SortField) {
    if (sortField !== field) return null;
    return <span className="ml-1 text-accent">{sortDir === "desc" ? "\u25BC" : "\u25B2"}</span>;
  }

  return (
    <div className="min-h-screen bg-bg-shell p-6">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-text-primary tracking-wide">RING QUEUE</h1>
          <p className="text-[11px] text-text-muted mt-0.5">Detected fraud rings sorted by dollar exposure — triage and assign for investigation</p>
        </div>
        <div className="flex items-center gap-2">
          {(["ALL", "NEW", "UNDER_REVIEW", "REFERRED", "DISMISSED"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider border transition-colors",
                statusFilter === s
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-bg-panel text-text-muted border-border hover:text-text-secondary"
              )}
            >
              {s === "ALL" ? "ALL" : s.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-4 gap-px bg-border">
        <StatCard label="TOTAL RINGS" value={String(totalRings)} />
        <StatCard label="UNREVIEWED" value={String(unreviewed)} highlight />
        <StatCard label="TOTAL EXPOSURE" value={formatCurrency(totalExposure)} />
        <StatCard label="REFERRED TO DOJ" value={String(referredToDoj)} />
      </div>

      {/* Table */}
      <div className="border border-border bg-bg-panel">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-label px-3 py-2.5 text-left font-medium">TYPE</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">SMOKING GUN</th>
              <th
                className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                onClick={() => toggleSort("member_count")}
              >
                MEMBERS{sortIndicator("member_count")}
              </th>
              <th
                className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                onClick={() => toggleSort("total_exposure")}
              >
                EXPOSURE{sortIndicator("total_exposure")}
              </th>
              <th
                className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                onClick={() => toggleSort("avg_risk_score")}
              >
                RISK{sortIndicator("avg_risk_score")}
              </th>
              <th className="text-label px-3 py-2.5 text-left font-medium">STATUS</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">INVESTIGATOR</th>
              <th
                className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                onClick={() => toggleSort("detected_at")}
              >
                DETECTED{sortIndicator("detected_at")}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ring) => {
              const typeConfig = RING_TYPE_CONFIG[ring.ring_type];
              const statusConfig = STATUS_CONFIG[ring.status];
              return (
                <Link
                  key={ring.ring_id}
                  href={`/rings/${ring.ring_id}`}
                  className="contents"
                >
                  <tr className="border-b border-border bg-bg-row hover:bg-bg-row-hover cursor-pointer transition-colors group">
                    {/* Type badge */}
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-wide", typeConfig.bg)}>
                        <span>{typeConfig.icon}</span>
                        {typeConfig.label}
                      </span>
                    </td>

                    {/* Smoking gun */}
                    <td className="px-3 py-2">
                      <span className="text-data text-smoking-gun font-medium truncate block">
                        {ring.common_element}
                      </span>
                    </td>

                    {/* Members */}
                    <td className="px-3 py-2 text-right">
                      <span className="text-data text-text-primary tabular-nums">{ring.member_count}</span>
                    </td>

                    {/* Exposure */}
                    <td className="px-3 py-2 text-right">
                      <span className="text-data text-text-primary tabular-nums font-medium">
                        {formatCurrency(ring.total_exposure)}
                      </span>
                    </td>

                    {/* Risk score */}
                    <td className="px-3 py-2 text-right">
                      <span className={cn(
                        "text-data tabular-nums font-bold",
                        getRiskColor(ring.avg_risk_score)
                      )}>
                        {ring.avg_risk_score}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="px-3 py-2">
                      <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider", statusConfig.bg)}>
                        {statusConfig.label}
                      </span>
                    </td>

                    {/* Investigator */}
                    <td className="px-3 py-2">
                      <span className="text-data text-text-secondary">
                        {ring.assigned_to || <span className="text-text-muted">&mdash;</span>}
                      </span>
                    </td>

                    {/* Detected */}
                    <td className="px-3 py-2 text-right">
                      <span className="text-data text-text-secondary tabular-nums">
                        {formatDate(ring.detected_at)}
                      </span>
                    </td>
                  </tr>
                </Link>
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-[11px] text-text-muted">
            {filtered.length} ring{filtered.length !== 1 ? "s" : ""} displayed
          </span>
          <span className="text-[11px] text-text-muted">
            Sorted by {sortField.replace(/_/g, " ")} {sortDir === "desc" ? "descending" : "ascending"}
          </span>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-bg-panel px-4 py-3">
      <div className="text-label mb-1">{label}</div>
      <div className={cn("text-[20px] font-semibold tabular-nums", highlight ? "text-critical" : "text-text-primary")}>
        {value}
      </div>
    </div>
  );
}
