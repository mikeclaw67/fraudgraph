/* FraudGraph — Ring Queue: primary triage view with row-level actions */
"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { FRAUD_RINGS } from "@/lib/ring-data";
import { formatCurrency, formatDate, cn, getRiskColor } from "@/lib/utils";
import type { FraudRing, RingType, RingStatus } from "@/lib/types";

/* ── Config ──────────────────────────────────────────────────────────────── */

const RING_TYPE_CONFIG: Record<RingType, { icon: string; label: string; bg: string }> = {
  ADDRESS_FARM: { icon: "\u{1F3E0}", label: "ADDRESS FARM", bg: "bg-slate-700/40 text-slate-300" },
  ACCOUNT_CLUSTER: { icon: "\u{1F3E6}", label: "ACCOUNT CLUSTER", bg: "bg-slate-700/40 text-slate-300" },
  EIN_RECYCLER: { icon: "\u{1F522}", label: "EIN RECYCLER", bg: "bg-slate-700/40 text-slate-300" },
  STRAW_COMPANY: { icon: "\u{1F47B}", label: "STRAW COMPANY", bg: "bg-slate-700/40 text-slate-300" },
  THRESHOLD_GAMING: { icon: "\u{1F3AF}", label: "THRESHOLD GAMING", bg: "bg-slate-700/40 text-slate-300" },
};

const STATUS_CONFIG: Record<string, { label: string; bg: string }> = {
  NEW: { label: "NEW", bg: "bg-sky-500/20 text-sky-400 border border-sky-500/30" },
  DETECTED: { label: "DETECTED", bg: "bg-sky-500/20 text-sky-400 border border-sky-500/30" },
  UNDER_REVIEW: { label: "UNDER REVIEW", bg: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  CASE_OPENED: { label: "CASE OPENED", bg: "bg-blue-500/20 text-blue-400 border border-blue-500/30" },
  REFERRED: { label: "REFERRED", bg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  CLOSED: { label: "CLOSED", bg: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
  DISMISSED: { label: "DISMISSED", bg: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
};

const TERMINAL_STATES = new Set(["REFERRED", "CLOSED", "DISMISSED"]);

type ActionDef = { label: string; action: string; needsInput?: "reason" | "investigator_id" };

function getActionsForStatus(status: string): ActionDef[] {
  if (TERMINAL_STATES.has(status)) return [];
  switch (status) {
    case "NEW":
    case "DETECTED":
      return [
        { label: "REVIEW", action: "review" },
        { label: "DISMISS", action: "dismiss", needsInput: "reason" },
      ];
    case "UNDER_REVIEW":
      return [
        { label: "OPEN CASE", action: "open-case" },
        { label: "ASSIGN", action: "assign", needsInput: "investigator_id" },
        { label: "DISMISS", action: "dismiss", needsInput: "reason" },
      ];
    case "CASE_OPENED":
      return [
        { label: "REFER TO DOJ", action: "refer" },
        { label: "ASSIGN", action: "assign", needsInput: "investigator_id" },
        { label: "DISMISS", action: "dismiss", needsInput: "reason" },
      ];
    default:
      return [];
  }
}

const ACTION_RESULT_STATUS: Record<string, string> = {
  review: "UNDER_REVIEW",
  "open-case": "CASE_OPENED",
  dismiss: "DISMISSED",
  refer: "REFERRED",
};

type SortField = "total_exposure" | "avg_risk_score" | "member_count" | "detected_at";
type SortDir = "asc" | "desc";

/* ── Page ────────────────────────────────────────────────────────────────── */

export default function RingQueuePage() {
  const [sortField, setSortField] = useState<SortField>("total_exposure");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<RingStatus | "ALL">("ALL");
  const [overrides, setOverrides] = useState<Record<string, { status?: string; assigned_to?: string }>>({});

  const applyOverride = useCallback((ringId: string, patch: { status?: string; assigned_to?: string }) => {
    setOverrides((prev) => ({ ...prev, [ringId]: { ...prev[ringId], ...patch } }));
  }, []);

  const revertOverride = useCallback((ringId: string) => {
    setOverrides((prev) => {
      const next = { ...prev };
      delete next[ringId];
      return next;
    });
  }, []);

  const filtered = useMemo(() => {
    let rings = [...FRAUD_RINGS];
    if (statusFilter !== "ALL") {
      rings = rings.filter((r) => {
        const eff = overrides[r.ring_id]?.status ?? r.status;
        return eff === statusFilter;
      });
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
  }, [sortField, sortDir, statusFilter, overrides]);

  const totalRings = FRAUD_RINGS.length;
  const unreviewed = FRAUD_RINGS.filter((r) => (overrides[r.ring_id]?.status ?? r.status) === "NEW").length;
  const totalExposure = FRAUD_RINGS.reduce((sum, r) => sum + r.total_exposure, 0);
  const referredToDoj = FRAUD_RINGS.filter((r) => (overrides[r.ring_id]?.status ?? r.status) === "REFERRED").length;

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
          <p className="text-[11px] text-text-muted mt-0.5">Detected fraud rings sorted by dollar exposure &mdash; triage and assign for investigation</p>
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
              <th className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary" onClick={() => toggleSort("member_count")}>MEMBERS{sortIndicator("member_count")}</th>
              <th className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary" onClick={() => toggleSort("total_exposure")}>EXPOSURE{sortIndicator("total_exposure")}</th>
              <th className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary" onClick={() => toggleSort("avg_risk_score")}>RISK{sortIndicator("avg_risk_score")}</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">STATUS</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">ACTIONS</th>
              <th className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary" onClick={() => toggleSort("detected_at")}>DETECTED{sortIndicator("detected_at")}</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((ring) => (
              <RingRow
                key={ring.ring_id}
                ring={ring}
                statusOverride={overrides[ring.ring_id]?.status}
                assignOverride={overrides[ring.ring_id]?.assigned_to}
                onOptimistic={applyOverride}
                onRevert={revertOverride}
              />
            ))}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-[11px] text-text-muted">{filtered.length} ring{filtered.length !== 1 ? "s" : ""} displayed</span>
          <span className="text-[11px] text-text-muted">Sorted by {sortField.replace(/_/g, " ")} {sortDir === "desc" ? "descending" : "ascending"}</span>
        </div>
      </div>
    </div>
  );
}

/* ── Ring Row ────────────────────────────────────────────────────────────── */

function RingRow({
  ring,
  statusOverride,
  assignOverride,
  onOptimistic,
  onRevert,
}: {
  ring: FraudRing;
  statusOverride?: string;
  assignOverride?: string;
  onOptimistic: (id: string, patch: { status?: string; assigned_to?: string }) => void;
  onRevert: (id: string) => void;
}) {
  const router = useRouter();
  const [inputMode, setInputMode] = useState<"reason" | "investigator_id" | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const effectiveStatus = statusOverride ?? ring.status;
  const effectiveAssigned = assignOverride ?? ring.assigned_to;
  const statusConfig = STATUS_CONFIG[effectiveStatus] ?? STATUS_CONFIG.NEW;
  const typeConfig = RING_TYPE_CONFIG[ring.ring_type];
  const actions = getActionsForStatus(effectiveStatus);
  const isTerminal = TERMINAL_STATES.has(effectiveStatus);

  async function fireAction(action: string, body?: Record<string, string>) {
    const prevStatus = effectiveStatus;
    const nextStatus = ACTION_RESULT_STATUS[action];

    // Optimistic update
    if (nextStatus) {
      onOptimistic(ring.ring_id, { status: nextStatus });
    }
    if (action === "assign" && body?.investigator_id) {
      onOptimistic(ring.ring_id, { assigned_to: body.investigator_id });
    }

    setInputMode(null);
    setInputValue("");
    setPendingAction(null);

    try {
      const res = await fetch(`/api/rings/${ring.ring_id}/actions/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) {
        throw new Error(`${res.status}: ${(await res.json().catch(() => ({}))).detail ?? "Action failed"}`);
      }
    } catch (err: unknown) {
      // Revert on error
      onRevert(ring.ring_id);
      const msg = err instanceof Error ? err.message : "Action failed";
      setError(msg);
      setTimeout(() => setError(null), 4000);
    }
  }

  function handleActionClick(e: React.MouseEvent, actionDef: ActionDef) {
    e.stopPropagation();
    if (actionDef.needsInput) {
      setInputMode(actionDef.needsInput);
      setPendingAction(actionDef.action);
      setInputValue("");
    } else {
      fireAction(actionDef.action);
    }
  }

  function handleInputSubmit(e: React.FormEvent | React.KeyboardEvent) {
    e.stopPropagation();
    if ("key" in e && e.key !== "Enter") return;
    if ("preventDefault" in e) e.preventDefault();
    if (!inputValue.trim() || !pendingAction) return;

    const body: Record<string, string> = {};
    if (inputMode === "reason") body.reason = inputValue.trim();
    if (inputMode === "investigator_id") body.investigator_id = inputValue.trim();
    fireAction(pendingAction, body);
  }

  function cancelInput(e: React.MouseEvent) {
    e.stopPropagation();
    setInputMode(null);
    setPendingAction(null);
    setInputValue("");
  }

  return (
    <tr
      onClick={() => router.push(`/rings/${ring.ring_id}`)}
      className="border-b border-border bg-bg-row hover:bg-bg-row-hover cursor-pointer transition-colors group relative"
    >
      {/* Type badge */}
      <td className="px-3 py-2">
        <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-wide", typeConfig.bg)}>
          <span>{typeConfig.icon}</span>
          {typeConfig.label}
        </span>
      </td>

      {/* Smoking gun */}
      <td className="px-3 py-2">
        <span className="text-data text-smoking-gun font-medium truncate block">{ring.common_element}</span>
      </td>

      {/* Members */}
      <td className="px-3 py-2 text-right">
        <span className="text-data text-text-primary tabular-nums">{ring.member_count}</span>
      </td>

      {/* Exposure */}
      <td className="px-3 py-2 text-right">
        <span className="text-data text-text-primary tabular-nums font-medium">{formatCurrency(ring.total_exposure)}</span>
      </td>

      {/* Risk score */}
      <td className="px-3 py-2 text-right">
        <span className={cn("text-data tabular-nums font-bold", getRiskColor(ring.avg_risk_score))}>{ring.avg_risk_score}</span>
      </td>

      {/* Status badge */}
      <td className="px-3 py-2">
        <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider", statusConfig.bg)}>
          {statusConfig.label}
        </span>
      </td>

      {/* Actions column */}
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        {error && (
          <span className="text-[10px] text-[#C94B4B] font-medium">{error}</span>
        )}

        {!error && inputMode && (
          <form onSubmit={handleInputSubmit} className="flex items-center gap-1">
            <input
              autoFocus
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") cancelInput(e as unknown as React.MouseEvent); }}
              placeholder={inputMode === "reason" ? "Dismiss reason..." : "Investigator ID..."}
              className="h-6 w-28 border border-border bg-[#0F1117] px-1.5 text-[10px] text-text-primary placeholder-text-muted focus:border-accent focus:outline-none"
              onClick={(e) => e.stopPropagation()}
            />
            <button
              type="submit"
              className="h-6 border border-border bg-[#1A1D27] px-2 text-[10px] font-semibold uppercase text-text-secondary hover:text-text-primary"
            >
              OK
            </button>
            <button
              type="button"
              onClick={cancelInput}
              className="h-6 px-1 text-[10px] text-text-muted hover:text-text-primary"
            >
              &times;
            </button>
          </form>
        )}

        {!error && !inputMode && !isTerminal && actions.length > 0 && (
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150 ease-in-out">
            {actions.map((a) => (
              <button
                key={a.action}
                onClick={(e) => handleActionClick(e, a)}
                className="h-6 bg-[#1A1D27] px-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary border border-border hover:text-text-primary hover:border-text-muted transition-colors"
              >
                {a.label}
              </button>
            ))}
          </div>
        )}
      </td>

      {/* Detected */}
      <td className="px-3 py-2 text-right">
        <span className="text-data text-text-secondary tabular-nums">{formatDate(ring.detected_at)}</span>
      </td>
    </tr>
  );
}

/* ── Stat Card ───────────────────────────────────────────────────────────── */

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-bg-panel px-4 py-3">
      <div className="text-label mb-1">{label}</div>
      <div className={cn("text-[20px] font-semibold tabular-nums", highlight ? "text-critical" : "text-text-primary")}>{value}</div>
    </div>
  );
}
