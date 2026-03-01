/* FraudGraph — Case Manager: ring-first investigation case table with inline expansion */
"use client";

import { useState, useMemo } from "react";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { RingType, CaseStatus, InvestigationCase, EvidenceItem, CaseNote } from "@/lib/types";

/* ── Ring type badge config (matches Ring Queue) ────────────────────── */

const RING_TYPE_CONFIG: Record<RingType, { icon: string; label: string; bg: string }> = {
  ADDRESS_FARM: { icon: "\u{1F3E0}", label: "ADDRESS FARM", bg: "bg-violet-500/15 text-violet-400" },
  ACCOUNT_CLUSTER: { icon: "\u{1F3E6}", label: "ACCOUNT CLUSTER", bg: "bg-blue-500/15 text-blue-400" },
  EIN_RECYCLER: { icon: "\u{1F522}", label: "EIN RECYCLER", bg: "bg-amber-500/15 text-amber-400" },
  STRAW_COMPANY: { icon: "\u{1F47B}", label: "STRAW COMPANY", bg: "bg-red-500/15 text-red-400" },
  THRESHOLD_GAMING: { icon: "\u{1F3AF}", label: "THRESHOLD GAMING", bg: "bg-emerald-500/15 text-emerald-400" },
};

/* ── Status tab config ──────────────────────────────────────────────── */

const STATUS_TABS: { value: CaseStatus | "ALL"; label: string }[] = [
  { value: "ALL", label: "ALL" },
  { value: "OPEN", label: "OPEN" },
  { value: "UNDER_REVIEW", label: "UNDER REVIEW" },
  { value: "REFERRED_TO_DOJ", label: "REFERRED TO DOJ" },
  { value: "CLOSED", label: "CLOSED" },
];

const STATUS_BADGE: Record<CaseStatus, { label: string; bg: string }> = {
  OPEN: { label: "OPEN", bg: "bg-sky-500/20 text-sky-400 border border-sky-500/30" },
  UNDER_REVIEW: { label: "UNDER REVIEW", bg: "bg-amber-500/20 text-amber-400 border border-amber-500/30" },
  REFERRED_TO_DOJ: { label: "REFERRED TO DOJ", bg: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" },
  CLOSED: { label: "CLOSED", bg: "bg-slate-500/20 text-slate-400 border border-slate-500/30" },
};

const DOJ_STATUS_COLOR: Record<string, string> = {
  "Pending Review": "text-amber-400",
  "Under Investigation": "text-sky-400",
  "Charges Filed": "text-critical",
  "Declined": "text-text-muted",
  "Conviction": "text-emerald-400",
};

/* ── Mock data: 10 realistic PPP fraud cases ────────────────────────── */

function daysOpen(created: string): number {
  return Math.floor((Date.now() - new Date(created).getTime()) / 86_400_000);
}

const MOCK_CASES: InvestigationCase[] = [
  {
    case_id: "CASE-2024-0017",
    ring_type: "ADDRESS_FARM",
    ring_ids: ["RING-AF-001", "RING-AF-009"],
    common_element: "1847 Oakmont Dr, Suite 200, Houston TX",
    member_count: 12,
    total_exposure: 2_340_000,
    investigator: "J. Morrison",
    status: "REFERRED_TO_DOJ",
    doj_status: "Charges Filed",
    last_updated: "2025-02-18T14:30:00Z",
    created_at: "2024-08-12T09:00:00Z",
    notes: [
      { id: "n1", author: "J. Morrison", timestamp: "2025-01-10T10:15:00Z", content: "Property records confirm single-family residence. All 12 businesses list identical suite number that does not exist." },
      { id: "n2", author: "S. Abernathy", timestamp: "2025-02-01T11:30:00Z", content: "Cross-referenced with USPS — address flagged for high mail volume. Forwarding set up to PO Box in Dallas." },
    ],
    evidence_checklist: [
      { id: "e1", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e2", label: "IRS Form 941 mismatch confirmed", checked: true, auto_populated: true },
      { id: "e3", label: "Property records reviewed", checked: true, auto_populated: false },
      { id: "e4", label: "Bank statements subpoenaed", checked: true, auto_populated: false },
      { id: "e5", label: "SAR filed with FinCEN", checked: true, auto_populated: false },
      { id: "e6", label: "Witness interviews completed", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-08-12T09:00:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "K. Pham", timestamp: "2024-08-13T08:20:00Z", details: "Assigned to J. Morrison" },
      { action: "REFERRED_TO_DOJ", actor: "J. Morrison", timestamp: "2025-01-15T16:00:00Z", details: "Referred to DOJ Southern District of Texas" },
    ],
  },
  {
    case_id: "CASE-2024-0023",
    ring_type: "STRAW_COMPANY",
    ring_ids: ["RING-SC-003"],
    common_element: "Apex Digital LLC / Nova Partners Group",
    member_count: 6,
    total_exposure: 890_000,
    investigator: "K. Pham",
    status: "UNDER_REVIEW",
    doj_status: null,
    last_updated: "2025-02-25T10:45:00Z",
    created_at: "2024-10-05T14:30:00Z",
    notes: [
      { id: "n3", author: "K. Pham", timestamp: "2025-02-20T09:00:00Z", content: "All 6 entities incorporated within 14-day window. Same registered agent. Zero employees on all Form 941s." },
    ],
    evidence_checklist: [
      { id: "e7", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e8", label: "Secretary of State filings reviewed", checked: true, auto_populated: false },
      { id: "e9", label: "Form 941 records requested from IRS", checked: true, auto_populated: false },
      { id: "e10", label: "Bank statements subpoenaed", checked: false, auto_populated: false },
      { id: "e11", label: "SAR filed with FinCEN", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-10-05T14:30:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "R. Delgado", timestamp: "2024-10-06T09:15:00Z", details: "Assigned to K. Pham" },
    ],
  },
  {
    case_id: "CASE-2024-0031",
    ring_type: "ACCOUNT_CLUSTER",
    ring_ids: ["RING-AC-002", "RING-AC-007"],
    common_element: "Chase ****4819 / Wells Fargo ****7723",
    member_count: 9,
    total_exposure: 1_670_000,
    investigator: "R. Delgado",
    status: "OPEN",
    doj_status: null,
    last_updated: "2025-02-28T16:10:00Z",
    created_at: "2025-01-20T11:00:00Z",
    notes: [],
    evidence_checklist: [
      { id: "e12", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e13", label: "Bank account ownership verified", checked: false, auto_populated: false },
      { id: "e14", label: "Transaction flow analysis completed", checked: false, auto_populated: false },
      { id: "e15", label: "SAR filed with FinCEN", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2025-01-20T11:00:00Z", details: "Auto-generated from ring detection" },
    ],
  },
  {
    case_id: "CASE-2024-0038",
    ring_type: "EIN_RECYCLER",
    ring_ids: ["RING-ER-005"],
    common_element: "EIN 84-3291047 used across 7 entities",
    member_count: 7,
    total_exposure: 1_045_000,
    investigator: "S. Abernathy",
    status: "REFERRED_TO_DOJ",
    doj_status: "Under Investigation",
    last_updated: "2025-02-22T13:20:00Z",
    created_at: "2024-09-18T10:00:00Z",
    notes: [
      { id: "n4", author: "S. Abernathy", timestamp: "2025-01-05T14:30:00Z", content: "IRS confirms EIN was originally issued to defunct entity in 2019. Subsequent filings are fraudulent reuse." },
      { id: "n5", author: "S. Abernathy", timestamp: "2025-02-10T09:45:00Z", content: "AUSA confirms active investigation. Grand jury subpoenas issued for bank records." },
    ],
    evidence_checklist: [
      { id: "e16", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e17", label: "IRS EIN verification completed", checked: true, auto_populated: true },
      { id: "e18", label: "Form 941 mismatch confirmed", checked: true, auto_populated: false },
      { id: "e19", label: "Bank statements subpoenaed", checked: true, auto_populated: false },
      { id: "e20", label: "SAR filed with FinCEN", checked: true, auto_populated: false },
      { id: "e21", label: "Grand jury subpoena issued", checked: true, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-09-18T10:00:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "K. Pham", timestamp: "2024-09-19T08:30:00Z", details: "Assigned to S. Abernathy" },
      { action: "REFERRED_TO_DOJ", actor: "S. Abernathy", timestamp: "2025-01-20T14:00:00Z", details: "Referred to DOJ District of New Jersey" },
    ],
  },
  {
    case_id: "CASE-2024-0042",
    ring_type: "THRESHOLD_GAMING",
    ring_ids: ["RING-TG-004"],
    common_element: "8 loans at $148,500\u2013$149,900 range",
    member_count: 8,
    total_exposure: 1_192_000,
    investigator: "T. Washington",
    status: "UNDER_REVIEW",
    doj_status: null,
    last_updated: "2025-02-27T11:30:00Z",
    created_at: "2024-11-01T09:00:00Z",
    notes: [
      { id: "n6", author: "T. Washington", timestamp: "2025-02-15T10:00:00Z", content: "All 8 applications submitted within 72-hour window. Amounts cluster within 1% of $150K threshold. Statistical anomaly confirmed." },
    ],
    evidence_checklist: [
      { id: "e22", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e23", label: "Loan amount clustering analysis", checked: true, auto_populated: true },
      { id: "e24", label: "Submission timing analysis", checked: true, auto_populated: false },
      { id: "e25", label: "Payroll documentation requested", checked: false, auto_populated: false },
      { id: "e26", label: "SAR filed with FinCEN", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-11-01T09:00:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "J. Morrison", timestamp: "2024-11-02T10:30:00Z", details: "Assigned to T. Washington" },
    ],
  },
  {
    case_id: "CASE-2025-0003",
    ring_type: "ADDRESS_FARM",
    ring_ids: ["RING-AF-012"],
    common_element: "3200 N Central Ave, Phoenix AZ 85012",
    member_count: 5,
    total_exposure: 725_000,
    investigator: null,
    status: "OPEN",
    doj_status: null,
    last_updated: "2025-02-26T08:00:00Z",
    created_at: "2025-02-15T14:00:00Z",
    notes: [],
    evidence_checklist: [
      { id: "e27", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e28", label: "Property records reviewed", checked: false, auto_populated: false },
      { id: "e29", label: "Bank statements subpoenaed", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2025-02-15T14:00:00Z", details: "Auto-generated from ring detection" },
    ],
  },
  {
    case_id: "CASE-2024-0019",
    ring_type: "STRAW_COMPANY",
    ring_ids: ["RING-SC-001", "RING-SC-006"],
    common_element: "Meridian Holdings Corp shell network",
    member_count: 14,
    total_exposure: 3_150_000,
    investigator: "M. Kowalski",
    status: "REFERRED_TO_DOJ",
    doj_status: "Conviction",
    last_updated: "2025-02-10T09:00:00Z",
    created_at: "2024-06-22T11:30:00Z",
    notes: [
      { id: "n7", author: "M. Kowalski", timestamp: "2024-12-01T10:00:00Z", content: "Lead defendant pled guilty to wire fraud and money laundering. Cooperating with prosecution on remaining defendants." },
      { id: "n8", author: "A. Friedman", timestamp: "2025-01-15T14:00:00Z", content: "Sentencing scheduled for March 2025. Restitution order expected for full $3.15M." },
    ],
    evidence_checklist: [
      { id: "e30", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e31", label: "Secretary of State filings reviewed", checked: true, auto_populated: false },
      { id: "e32", label: "Form 941 records obtained", checked: true, auto_populated: false },
      { id: "e33", label: "Bank statements obtained", checked: true, auto_populated: false },
      { id: "e34", label: "SAR filed with FinCEN", checked: true, auto_populated: false },
      { id: "e35", label: "Grand jury subpoena issued", checked: true, auto_populated: false },
      { id: "e36", label: "Arrest warrants executed", checked: true, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-06-22T11:30:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "R. Delgado", timestamp: "2024-06-23T08:00:00Z", details: "Assigned to M. Kowalski" },
      { action: "REFERRED_TO_DOJ", actor: "M. Kowalski", timestamp: "2024-09-01T14:30:00Z", details: "Referred to DOJ Central District of California" },
    ],
  },
  {
    case_id: "CASE-2025-0008",
    ring_type: "ACCOUNT_CLUSTER",
    ring_ids: ["RING-AC-011"],
    common_element: "BofA ****3356 \u2014 6 deposits in 48hrs",
    member_count: 6,
    total_exposure: 870_000,
    investigator: "A. Friedman",
    status: "UNDER_REVIEW",
    doj_status: null,
    last_updated: "2025-02-28T14:00:00Z",
    created_at: "2025-02-01T10:00:00Z",
    notes: [
      { id: "n9", author: "A. Friedman", timestamp: "2025-02-20T16:00:00Z", content: "BofA compliance officer confirmed rapid sequential deposits. Account opened 22 days before first PPP deposit." },
    ],
    evidence_checklist: [
      { id: "e37", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e38", label: "Bank account ownership verified", checked: true, auto_populated: false },
      { id: "e39", label: "Transaction flow analysis completed", checked: false, auto_populated: false },
      { id: "e40", label: "SAR filed with FinCEN", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2025-02-01T10:00:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "K. Pham", timestamp: "2025-02-02T09:00:00Z", details: "Assigned to A. Friedman" },
    ],
  },
  {
    case_id: "CASE-2024-0045",
    ring_type: "EIN_RECYCLER",
    ring_ids: ["RING-ER-008"],
    common_element: "EIN 91-1847362 \u2014 defunct corp reuse",
    member_count: 4,
    total_exposure: 580_000,
    investigator: "J. Morrison",
    status: "CLOSED",
    doj_status: "Declined",
    last_updated: "2025-01-30T12:00:00Z",
    created_at: "2024-07-10T09:30:00Z",
    notes: [
      { id: "n10", author: "J. Morrison", timestamp: "2025-01-25T11:00:00Z", content: "AUSA declined prosecution — insufficient evidence to prove knowing reuse. Administrative recovery initiated through SBA." },
    ],
    evidence_checklist: [
      { id: "e41", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e42", label: "IRS EIN verification completed", checked: true, auto_populated: true },
      { id: "e43", label: "Bank statements obtained", checked: true, auto_populated: false },
      { id: "e44", label: "SAR filed with FinCEN", checked: true, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2024-07-10T09:30:00Z", details: "Auto-generated from ring detection" },
      { action: "ASSIGNED", actor: "K. Pham", timestamp: "2024-07-11T08:00:00Z", details: "Assigned to J. Morrison" },
      { action: "REFERRED_TO_DOJ", actor: "J. Morrison", timestamp: "2024-10-15T14:00:00Z", details: "Referred to DOJ Western District of Washington" },
      { action: "CLOSED", actor: "J. Morrison", timestamp: "2025-01-30T12:00:00Z", details: "DOJ declined — closed for administrative recovery" },
    ],
  },
  {
    case_id: "CASE-2025-0011",
    ring_type: "THRESHOLD_GAMING",
    ring_ids: ["RING-TG-010"],
    common_element: "5 loans at exactly $149,500",
    member_count: 5,
    total_exposure: 747_500,
    investigator: null,
    status: "OPEN",
    doj_status: null,
    last_updated: "2025-02-28T09:00:00Z",
    created_at: "2025-02-22T15:00:00Z",
    notes: [],
    evidence_checklist: [
      { id: "e45", label: "SBA Form 2483 copies obtained", checked: true, auto_populated: true },
      { id: "e46", label: "Loan amount clustering analysis", checked: true, auto_populated: true },
      { id: "e47", label: "Submission timing analysis", checked: false, auto_populated: false },
    ],
    audit_trail: [
      { action: "CASE_OPENED", actor: "system", timestamp: "2025-02-22T15:00:00Z", details: "Auto-generated from ring detection" },
    ],
  },
];

/* ── Sort config ────────────────────────────────────────────────────── */

type SortField = "total_exposure" | "member_count" | "created_at";
type SortDir = "asc" | "desc";

/* ── Page component ─────────────────────────────────────────────────── */

export default function CaseManagerPage() {
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "ALL">("ALL");
  const [sortField, setSortField] = useState<SortField>("total_exposure");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [cases, setCases] = useState<InvestigationCase[]>(MOCK_CASES);
  const [noteInputs, setNoteInputs] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let list = [...cases];
    if (statusFilter !== "ALL") {
      list = list.filter((c) => c.status === statusFilter);
    }
    list.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return list;
  }, [cases, statusFilter, sortField, sortDir]);

  const stats = useMemo(() => ({
    total: cases.length,
    open: cases.filter((c) => c.status === "OPEN").length,
    underReview: cases.filter((c) => c.status === "UNDER_REVIEW").length,
    referred: cases.filter((c) => c.status === "REFERRED_TO_DOJ").length,
    totalExposure: cases.reduce((sum, c) => sum + c.total_exposure, 0),
  }), [cases]);

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

  function toggleChecklist(caseId: string, itemId: string) {
    setCases((prev) =>
      prev.map((c) =>
        c.case_id === caseId
          ? {
              ...c,
              evidence_checklist: c.evidence_checklist.map((e) =>
                e.id === itemId ? { ...e, checked: !e.checked } : e
              ),
            }
          : c
      )
    );
  }

  function addNote(caseId: string) {
    const text = noteInputs[caseId]?.trim();
    if (!text) return;
    const note: CaseNote = {
      id: `n-${Date.now()}`,
      author: "analyst",
      timestamp: new Date().toISOString(),
      content: text,
    };
    setCases((prev) =>
      prev.map((c) =>
        c.case_id === caseId ? { ...c, notes: [...c.notes, note] } : c
      )
    );
    setNoteInputs((prev) => ({ ...prev, [caseId]: "" }));
  }

  return (
    <div className="min-h-screen bg-bg-shell p-6">
      {/* Header */}
      <div className="mb-5 flex items-end justify-between">
        <div>
          <h1 className="text-[15px] font-semibold text-text-primary tracking-wide">CASE MANAGER</h1>
          <p className="text-[11px] text-text-muted mt-0.5">Investigation cases linked to fraud rings — track evidence, notes, and DOJ referral status</p>
        </div>
        <div className="flex items-center gap-2">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setStatusFilter(tab.value)}
              className={cn(
                "px-2.5 py-1 text-[11px] font-medium uppercase tracking-wider border transition-colors",
                statusFilter === tab.value
                  ? "bg-accent/20 text-accent border-accent/40"
                  : "bg-bg-panel text-text-muted border-border hover:text-text-secondary"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats bar */}
      <div className="mb-4 grid grid-cols-5 gap-px bg-border">
        <StatCard label="TOTAL CASES" value={String(stats.total)} />
        <StatCard label="OPEN" value={String(stats.open)} highlight />
        <StatCard label="UNDER REVIEW" value={String(stats.underReview)} />
        <StatCard label="REFERRED TO DOJ" value={String(stats.referred)} />
        <StatCard label="TOTAL EXPOSURE" value={formatCurrency(stats.totalExposure)} />
      </div>

      {/* Table */}
      <div className="border border-border bg-bg-panel">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-label px-3 py-2.5 text-left font-medium w-8" />
              <th className="text-label px-3 py-2.5 text-left font-medium">CASE ID</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">RING TYPE</th>
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
              <th className="text-label px-3 py-2.5 text-left font-medium">INVESTIGATOR</th>
              <th
                className="text-label px-3 py-2.5 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                onClick={() => toggleSort("created_at")}
              >
                DAYS OPEN{sortIndicator("created_at")}
              </th>
              <th className="text-label px-3 py-2.5 text-left font-medium">STATUS</th>
              <th className="text-label px-3 py-2.5 text-left font-medium">DOJ STATUS</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const typeConfig = RING_TYPE_CONFIG[c.ring_type];
              const statusConfig = STATUS_BADGE[c.status];
              const isExpanded = expandedId === c.case_id;
              const days = daysOpen(c.created_at);
              return (
                <CaseRowGroup
                  key={c.case_id}
                  caseData={c}
                  typeConfig={typeConfig}
                  statusConfig={statusConfig}
                  days={days}
                  isExpanded={isExpanded}
                  onToggle={() => setExpandedId(isExpanded ? null : c.case_id)}
                  onChecklistToggle={(itemId) => toggleChecklist(c.case_id, itemId)}
                  noteInput={noteInputs[c.case_id] || ""}
                  onNoteInputChange={(val) => setNoteInputs((prev) => ({ ...prev, [c.case_id]: val }))}
                  onAddNote={() => addNote(c.case_id)}
                />
              );
            })}
          </tbody>
        </table>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-border px-3 py-2">
          <span className="text-[11px] text-text-muted">
            {filtered.length} case{filtered.length !== 1 ? "s" : ""} displayed
          </span>
          <span className="text-[11px] text-text-muted">
            Sorted by {sortField.replace(/_/g, " ")} {sortDir === "desc" ? "descending" : "ascending"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Row + inline expansion ─────────────────────────────────────────── */

function CaseRowGroup({
  caseData,
  typeConfig,
  statusConfig,
  days,
  isExpanded,
  onToggle,
  onChecklistToggle,
  noteInput,
  onNoteInputChange,
  onAddNote,
}: {
  caseData: InvestigationCase;
  typeConfig: { icon: string; label: string; bg: string };
  statusConfig: { label: string; bg: string };
  days: number;
  isExpanded: boolean;
  onToggle: () => void;
  onChecklistToggle: (itemId: string) => void;
  noteInput: string;
  onNoteInputChange: (val: string) => void;
  onAddNote: () => void;
}) {
  const dojColor = caseData.doj_status ? (DOJ_STATUS_COLOR[caseData.doj_status] || "text-text-secondary") : "";
  return (
    <>
      <tr
        onClick={onToggle}
        className={cn(
          "border-b border-border cursor-pointer transition-colors",
          isExpanded ? "bg-bg-selected" : "bg-bg-row hover:bg-bg-row-hover"
        )}
      >
        {/* Expand arrow */}
        <td className="px-3 py-2 text-center">
          <span className={cn("text-[10px] text-text-muted transition-transform inline-block", isExpanded && "rotate-90")}>
            &#9654;
          </span>
        </td>

        {/* Case ID */}
        <td className="px-3 py-2">
          <span className="text-data text-accent font-medium">{caseData.case_id}</span>
        </td>

        {/* Ring Type */}
        <td className="px-3 py-2">
          <span className={cn("inline-flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-semibold tracking-wide", typeConfig.bg)}>
            <span>{typeConfig.icon}</span>
            {typeConfig.label}
          </span>
        </td>

        {/* Members */}
        <td className="px-3 py-2 text-right">
          <span className="text-data text-text-primary tabular-nums">{caseData.member_count}</span>
        </td>

        {/* Exposure */}
        <td className="px-3 py-2 text-right">
          <span className="text-data text-text-primary tabular-nums font-medium">
            {formatCurrency(caseData.total_exposure)}
          </span>
        </td>

        {/* Investigator */}
        <td className="px-3 py-2">
          <span className="text-data text-text-secondary">
            {caseData.investigator || <span className="text-text-muted">&mdash;</span>}
          </span>
        </td>

        {/* Days Open */}
        <td className="px-3 py-2 text-right">
          <span className={cn(
            "text-data tabular-nums font-medium",
            days > 180 ? "text-critical" : days > 90 ? "text-high" : "text-text-primary"
          )}>
            {days}
          </span>
        </td>

        {/* Status */}
        <td className="px-3 py-2">
          <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider", statusConfig.bg)}>
            {statusConfig.label}
          </span>
        </td>

        {/* DOJ Status */}
        <td className="px-3 py-2">
          {caseData.doj_status ? (
            <span className={cn("text-data font-medium", dojColor)}>
              {caseData.doj_status}
            </span>
          ) : (
            <span className="text-data text-text-muted">&mdash;</span>
          )}
        </td>
      </tr>

      {/* Inline expansion */}
      {isExpanded && (
        <tr className="bg-bg-selected">
          <td colSpan={9} className="px-6 py-4 border-b border-border">
            <InlineExpansion
              caseData={caseData}
              onChecklistToggle={onChecklistToggle}
              noteInput={noteInput}
              onNoteInputChange={onNoteInputChange}
              onAddNote={onAddNote}
            />
          </td>
        </tr>
      )}
    </>
  );
}

/* ── Inline expansion panel ─────────────────────────────────────────── */

function InlineExpansion({
  caseData,
  onChecklistToggle,
  noteInput,
  onNoteInputChange,
  onAddNote,
}: {
  caseData: InvestigationCase;
  onChecklistToggle: (itemId: string) => void;
  noteInput: string;
  onNoteInputChange: (val: string) => void;
  onAddNote: () => void;
}) {
  const checkedCount = caseData.evidence_checklist.filter((e) => e.checked).length;
  const totalCount = caseData.evidence_checklist.length;

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Evidence Checklist */}
      <div className="border border-border bg-bg-panel p-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-label font-semibold">EVIDENCE CHECKLIST</h4>
          <span className="text-[11px] text-text-muted tabular-nums">{checkedCount}/{totalCount}</span>
        </div>
        <div className="space-y-2">
          {caseData.evidence_checklist.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-2.5 cursor-pointer group"
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="checkbox"
                checked={item.checked}
                onChange={() => onChecklistToggle(item.id)}
                className="mt-0.5 h-3.5 w-3.5 appearance-none border border-border bg-bg-row checked:bg-accent checked:border-accent cursor-pointer flex-shrink-0 relative
                  checked:after:content-['✓'] checked:after:absolute checked:after:inset-0 checked:after:flex checked:after:items-center checked:after:justify-center checked:after:text-[10px] checked:after:text-white checked:after:font-bold"
              />
              <span className={cn(
                "text-[12px] leading-tight",
                item.checked ? "text-text-secondary line-through" : "text-text-primary"
              )}>
                {item.label}
                {item.auto_populated && (
                  <span className="ml-1.5 text-[9px] text-accent/60 uppercase tracking-wider">auto</span>
                )}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Investigation Notes */}
      <div className="border border-border bg-bg-panel p-4">
        <h4 className="text-label font-semibold mb-3">INVESTIGATION NOTES</h4>
        <div className="space-y-2 mb-3 max-h-[200px] overflow-y-auto">
          {caseData.notes.length === 0 ? (
            <p className="text-[11px] text-text-muted italic">No notes yet</p>
          ) : (
            caseData.notes.map((note) => (
              <div key={note.id} className="border border-border bg-bg-row p-2.5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-accent">{note.author}</span>
                  <span className="text-[10px] text-text-muted">{formatDate(note.timestamp)}</span>
                </div>
                <p className="text-[12px] text-text-secondary leading-relaxed">{note.content}</p>
              </div>
            ))
          )}
        </div>
        <div onClick={(e) => e.stopPropagation()}>
          <textarea
            value={noteInput}
            onChange={(e) => onNoteInputChange(e.target.value)}
            placeholder="Add investigation note..."
            className="w-full border border-border bg-bg-row p-2 text-[12px] text-text-primary placeholder:text-text-muted focus:border-accent focus:outline-none resize-none"
            rows={2}
          />
          <div className="mt-1.5 flex justify-end">
            <button
              onClick={onAddNote}
              disabled={!noteInput.trim()}
              className="px-3 py-1 text-[11px] font-medium bg-accent text-white hover:bg-accent/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              Add Note
            </button>
          </div>
        </div>
      </div>

      {/* Referral Status */}
      <div className="border border-border bg-bg-panel p-4">
        <h4 className="text-label font-semibold mb-3">REFERRAL STATUS</h4>
        <div className="space-y-3">
          <div>
            <span className="text-label text-[10px]">CASE STATUS</span>
            <div className="mt-1">
              <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider", STATUS_BADGE[caseData.status].bg)}>
                {STATUS_BADGE[caseData.status].label}
              </span>
            </div>
          </div>
          <div>
            <span className="text-label text-[10px]">DOJ STATUS</span>
            <p className={cn(
              "mt-1 text-[13px] font-medium",
              caseData.doj_status ? (DOJ_STATUS_COLOR[caseData.doj_status] || "text-text-secondary") : "text-text-muted"
            )}>
              {caseData.doj_status || "Not referred"}
            </p>
          </div>
          <div>
            <span className="text-label text-[10px]">COMMON ELEMENT</span>
            <p className="mt-1 text-[12px] text-smoking-gun font-medium leading-snug">{caseData.common_element}</p>
          </div>
          <div>
            <span className="text-label text-[10px]">LINKED RINGS</span>
            <div className="mt-1 flex flex-wrap gap-1">
              {caseData.ring_ids.map((rid) => (
                <span key={rid} className="px-1.5 py-0.5 text-[10px] font-mono bg-bg-row border border-border text-text-secondary">
                  {rid}
                </span>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <span className="text-label text-[10px]">OPENED</span>
              <p className="mt-0.5 text-[12px] text-text-secondary tabular-nums">{formatDate(caseData.created_at)}</p>
            </div>
            <div>
              <span className="text-label text-[10px]">LAST UPDATED</span>
              <p className="mt-0.5 text-[12px] text-text-secondary tabular-nums">{formatDate(caseData.last_updated)}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────── */

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
