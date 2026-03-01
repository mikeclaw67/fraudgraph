/* FraudGraph — Alert Queue page with filterable table, bulk actions, and real-time WebSocket updates.
   Update when adding new alert severity levels, statuses, or bulk action types. */
"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { SeverityBadge, RiskScoreBadge, StatusBadge, RuleBadge } from "@/components/badges";
import { formatDateTime } from "@/lib/utils";
import { getAlerts, connectAlertWebSocket } from "@/lib/api";
import { generateMockAlerts } from "@/lib/mock-data";
import type { Alert, Severity, AlertStatus } from "@/lib/types";

const SEVERITIES: (Severity | "ALL")[] = ["ALL", "CRITICAL", "HIGH", "MEDIUM", "LOW"];
const STATUSES: (AlertStatus | "ALL")[] = ["ALL", "NEW", "REVIEWING", "ESCALATED", "DISMISSED", "RESOLVED"];

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [severityFilter, setSeverityFilter] = useState<Severity | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<AlertStatus | "ALL">("ALL");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const loadAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getAlerts({ page, severity: severityFilter, status: statusFilter });
      setAlerts(data.alerts);
      setTotalPages(Math.ceil(data.pagination.total / data.pagination.page_size));
    } catch {
      // Fallback to mock data when backend is unavailable
      const mock = generateMockAlerts(100);
      let filtered = mock;
      if (severityFilter !== "ALL") filtered = filtered.filter((a) => a.severity === severityFilter);
      if (statusFilter !== "ALL") filtered = filtered.filter((a) => a.status === statusFilter);
      setAlerts(filtered.slice((page - 1) * 50, page * 50));
      setTotalPages(Math.ceil(filtered.length / 50));
    } finally {
      setLoading(false);
    }
  }, [page, severityFilter, statusFilter]);

  useEffect(() => { loadAlerts(); }, [loadAlerts]);

  // WebSocket for real-time updates
  useEffect(() => {
    const ws = connectAlertWebSocket((data) => {
      const newAlert = data as Alert;
      if (newAlert.alert_id) {
        setAlerts((prev) => [newAlert, ...prev.slice(0, 49)]);
      }
    });
    return () => { ws?.close(); };
  }, []);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === alerts.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(alerts.map((a) => a.alert_id)));
  };

  const stats = useMemo(() => {
    const critical = alerts.filter((a) => a.severity === "CRITICAL").length;
    const high = alerts.filter((a) => a.severity === "HIGH").length;
    const newCount = alerts.filter((a) => a.status === "NEW").length;
    return { critical, high, newCount, total: alerts.length };
  }, [alerts]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#ECEFF1]">Alert Queue</h1>
          <p className="mt-1 text-sm text-[#90A4AE]">
            {stats.total} alerts &middot; {stats.critical} critical &middot; {stats.high} high &middot; {stats.newCount} new
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 animate-pulse rounded-full bg-[#43A047]" />
          <span className="text-xs text-[#546E7A]">Live</span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3 border border-[#37474F] bg-[#2C3539] p-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#90A4AE]">Severity</label>
          <select
            value={severityFilter}
            onChange={(e) => { setSeverityFilter(e.target.value as Severity | "ALL"); setPage(1); }}
            className="border border-[#455A64] bg-[#2C3539] px-2 py-1 text-sm text-[#ECEFF1] focus:border-[#2196F3] focus:outline-none"
          >
            {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#90A4AE]">Status</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as AlertStatus | "ALL"); setPage(1); }}
            className="border border-[#455A64] bg-[#2C3539] px-2 py-1 text-sm text-[#ECEFF1] focus:border-[#2196F3] focus:outline-none"
          >
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-[#90A4AE]">{selectedIds.size} selected</span>
            <button className="bg-[#2196F3] px-3 py-1 text-xs font-medium text-white hover:bg-[#2196F3]/80">Assign</button>
            <button className="bg-[#37474F] px-3 py-1 text-xs font-medium text-[#ECEFF1] hover:bg-[#455A64]">Dismiss</button>
            <button className="bg-[#E53935] px-3 py-1 text-xs font-medium text-white hover:bg-[#E53935]/80">Escalate</button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden border border-[#37474F] bg-[#2C3539]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#37474F] text-left text-[11px] uppercase font-semibold tracking-[1px] text-[#78909C] bg-[#2C3539]">
              <th className="px-3 py-1.5">
                <input
                  type="checkbox"
                  checked={selectedIds.size === alerts.length && alerts.length > 0}
                  onChange={toggleAll}
                  className="h-4 w-4 border-[#455A64] bg-[#2C3539]"
                />
              </th>
              <th className="px-3 py-1.5">Borrower</th>
              <th className="px-3 py-1.5">Alert Type</th>
              <th className="px-3 py-1.5">Risk Score</th>
              <th className="px-3 py-1.5">Severity</th>
              <th className="px-3 py-1.5">Status</th>
              <th className="px-3 py-1.5">Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <tr key={i} className="border-b border-[#37474F] h-[32px]">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <td key={j} className="px-3">
                      <div className="h-4 animate-pulse bg-[#2C3539]" />
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              alerts.map((alert) => (
                <tr
                  key={alert.alert_id}
                  className="border-b border-[#37474F] transition-colors hover:bg-[#2F3D42] h-[32px]"
                >
                  <td className="px-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(alert.alert_id)}
                      onChange={() => toggleSelect(alert.alert_id)}
                      className="h-4 w-4 border-[#455A64] bg-[#2C3539]"
                    />
                  </td>
                  <td className="px-3">
                    <Link
                      href={`/entity/${alert.entity_id}`}
                      className="text-[12px] font-medium text-[#2196F3] hover:text-[#90CAF9] hover:underline"
                    >
                      {alert.entity_id}
                    </Link>
                  </td>
                  <td className="px-3">
                    <div className="flex flex-wrap gap-1">
                      {alert.fired_rules.map((r) => <RuleBadge key={r} rule={r} />)}
                    </div>
                  </td>
                  <td className="px-3"><RiskScoreBadge score={alert.risk_score} /></td>
                  <td className="px-3"><SeverityBadge severity={alert.severity} /></td>
                  <td className="px-3"><StatusBadge status={alert.status} /></td>
                  <td className="px-3 text-[12px] text-[#90A4AE]">{formatDateTime(alert.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-[#90A4AE]">Page {page} of {totalPages}</p>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="border border-[#37474F] bg-[#2C3539] px-3 py-1 text-sm text-[#90A4AE] hover:bg-[#37474F] disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="border border-[#37474F] bg-[#2C3539] px-3 py-1 text-sm text-[#90A4AE] hover:bg-[#37474F] disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
