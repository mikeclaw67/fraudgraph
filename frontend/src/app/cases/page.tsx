/* FraudGraph — Case Manager with Kanban board and case detail modal */
"use client";

import { useState, useEffect, useMemo } from "react";
import { PriorityBadge, StatusBadge } from "@/components/badges";
import { formatDateTime, formatCurrency, cn, statusDisplayName } from "@/lib/utils";
import { getCases, updateCase } from "@/lib/api";
import { generateMockCases } from "@/lib/mock-data";
import type { Case, CaseStatus } from "@/lib/types";

const COLUMNS: { status: CaseStatus; label: string; color: string }[] = [
  { status: "OPEN", label: "Open", color: "border-sky-500" },
  { status: "IN_REVIEW", label: "In Review", color: "border-amber-500" },
  { status: "ESCALATED", label: "Escalated", color: "border-red-500" },
  { status: "RESOLVED", label: "Resolved", color: "border-emerald-500" },
];

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [noteText, setNoteText] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getCases();
        setCases(data.cases);
      } catch {
        setCases(generateMockCases(24));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const columns = useMemo(() => {
    const grouped: Record<CaseStatus, Case[]> = { OPEN: [], IN_REVIEW: [], ESCALATED: [], RESOLVED: [] };
    cases.forEach((c) => {
      if (grouped[c.status]) grouped[c.status].push(c);
    });
    return grouped;
  }, [cases]);

  const handleStatusChange = async (caseId: string, newStatus: CaseStatus) => {
    try {
      await updateCase(caseId, { status: newStatus });
    } catch { /* ignore API errors in demo */ }
    setCases((prev) =>
      prev.map((c) =>
        c.case_id === caseId
          ? {
              ...c,
              status: newStatus,
              updated_at: new Date().toISOString(),
              audit_trail: [
                ...c.audit_trail,
                { action: "STATUS_CHANGED", actor: "analyst", timestamp: new Date().toISOString(), details: `Status changed to ${newStatus}` },
              ],
            }
          : c
      )
    );
    if (selectedCase?.case_id === caseId) {
      setSelectedCase((prev) => prev ? { ...prev, status: newStatus } : null);
    }
  };

  const addNote = () => {
    if (!selectedCase || !noteText.trim()) return;
    const entry = {
      action: "NOTE_ADDED",
      actor: "analyst",
      timestamp: new Date().toISOString(),
      details: noteText.trim(),
    };
    setCases((prev) =>
      prev.map((c) =>
        c.case_id === selectedCase.case_id
          ? { ...c, audit_trail: [...c.audit_trail, entry] }
          : c
      )
    );
    setSelectedCase((prev) => prev ? { ...prev, audit_trail: [...prev.audit_trail, entry] } : null);
    setNoteText("");
  };

  const stats = useMemo(() => ({
    total: cases.length,
    open: columns.OPEN.length,
    inReview: columns.IN_REVIEW.length,
    escalated: columns.ESCALATED.length,
    resolved: columns.RESOLVED.length,
  }), [cases, columns]);

  return (
    <div className="flex h-screen flex-col">
      {/* Header */}
      <div className="border-b border-slate-700/50 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-100">Case Manager</h1>
            <p className="mt-1 text-sm text-slate-400">
              {stats.total} cases &middot; {stats.open} open &middot; {stats.escalated} escalated &middot; {stats.resolved} resolved
            </p>
          </div>
          <button className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500">
            New Case
          </button>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex flex-1 gap-4 overflow-x-auto p-6">
        {COLUMNS.map(({ status, label, color }) => (
          <div key={status} className="flex min-w-[280px] flex-1 flex-col">
            <div className={cn("mb-3 flex items-center gap-2 border-b-2 pb-2", color)}>
              <h2 className="text-sm font-semibold text-slate-200">{label}</h2>
              <span className="rounded-full bg-slate-800 px-2 py-0.5 text-xs text-slate-400">
                {columns[status].length}
              </span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto">
              {loading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-28 animate-pulse rounded-lg bg-slate-800" />
                ))
              ) : (
                columns[status].map((c) => (
                  <CaseCard key={c.case_id} caseData={c} onClick={() => setSelectedCase(c)} />
                ))
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Case Detail Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-700 p-5">
              <div>
                <h2 className="text-lg font-bold text-slate-100">{selectedCase.title}</h2>
                <p className="mt-1 text-sm text-slate-400">{selectedCase.case_id}</p>
              </div>
              <button onClick={() => setSelectedCase(null)} className="text-slate-400 hover:text-slate-200">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-5 p-5">
              {/* Meta */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-slate-500">Status</p>
                  <div className="mt-1 flex items-center gap-2">
                    <StatusBadge status={selectedCase.status} />
                    <select
                      value={selectedCase.status}
                      onChange={(e) => handleStatusChange(selectedCase.case_id, e.target.value as CaseStatus)}
                      className="rounded border border-slate-600 bg-slate-800 px-2 py-0.5 text-xs text-slate-300"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.status} value={c.status}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Priority</p>
                  <div className="mt-1"><PriorityBadge priority={selectedCase.priority} /></div>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Assigned To</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedCase.assigned_to || "Unassigned"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Total Exposure</p>
                  <p className="mt-1 text-sm font-semibold text-red-400">{formatCurrency(selectedCase.total_exposure)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Fraud Type</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedCase.fraud_type || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">Linked Alerts</p>
                  <p className="mt-1 text-sm text-slate-200">{selectedCase.alert_ids.length} alerts</p>
                </div>
              </div>

              {/* Description */}
              {selectedCase.description && (
                <div>
                  <p className="text-xs text-slate-500">Description</p>
                  <p className="mt-1 text-sm text-slate-300">{selectedCase.description}</p>
                </div>
              )}

              {/* Audit Trail */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Audit Trail</h3>
                <div className="space-y-2">
                  {selectedCase.audit_trail.map((entry, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-md border border-slate-700 bg-slate-800 p-3">
                      <div className="mt-0.5 h-2 w-2 rounded-full bg-sky-400" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-200">{statusDisplayName(entry.action)}</span>
                          <span className="text-xs text-slate-500">{entry.actor}</span>
                        </div>
                        <p className="text-xs text-slate-400">{entry.details}</p>
                        <p className="mt-0.5 text-[10px] text-slate-600">{formatDateTime(entry.timestamp)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes Editor */}
              <div>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Add Note</h3>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter investigation notes..."
                  className="w-full rounded-md border border-slate-600 bg-slate-800 p-3 text-sm text-slate-200 placeholder:text-slate-500 focus:border-sky-500 focus:outline-none"
                  rows={3}
                />
                <div className="mt-2 flex justify-end">
                  <button
                    onClick={addNote}
                    disabled={!noteText.trim()}
                    className="rounded-md bg-sky-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-sky-500 disabled:opacity-50"
                  >
                    Add Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CaseCard({ caseData, onClick }: { caseData: Case; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg border border-slate-700/50 bg-slate-900 p-3 text-left transition-colors hover:border-slate-600 hover:bg-slate-800/80"
    >
      <div className="flex items-start justify-between">
        <h3 className="text-sm font-medium text-slate-200 line-clamp-1">{caseData.title}</h3>
        <PriorityBadge priority={caseData.priority} />
      </div>
      <div className="mt-2 flex items-center gap-2">
        <span className="text-xs text-slate-500">{caseData.assigned_to || "Unassigned"}</span>
        <span className="text-xs text-slate-600">&middot;</span>
        <span className="text-xs text-slate-500">{caseData.alert_ids.length} alerts</span>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium text-red-400">{formatCurrency(caseData.total_exposure)}</span>
        <span className="text-[10px] text-slate-600">{formatDateTime(caseData.updated_at)}</span>
      </div>
    </button>
  );
}
