/* FraudGraph — Ring Queue with split-pane detail view.
   Left panel: ring queue table (35% when detail open, full-width when closed).
   Right panel: Ring Detail component slides in from right on row click.
   Direct /rings/[id] URL renders full-page detail (handled by [id]/page.tsx). */
"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { RingDetailContent } from "@/components/ring-detail";
import { FRAUD_RINGS } from "@/lib/ring-data";
import { formatCurrency, formatDate, cn, getRiskColor } from "@/lib/utils";
import type { RingType, RingStatus } from "@/lib/types";

type DismissReason = "DUPLICATE" | "INSUFFICIENT_EVIDENCE" | "FALSE_POSITIVE" | "OUT_OF_JURISDICTION";

const DISMISS_REASONS: { code: DismissReason; label: string }[] = [
  { code: "DUPLICATE", label: "Duplicate" },
  { code: "INSUFFICIENT_EVIDENCE", label: "Insufficient Evidence" },
  { code: "FALSE_POSITIVE", label: "False Positive" },
  { code: "OUT_OF_JURISDICTION", label: "Out of Jurisdiction" },
];

const RING_TYPE_ICONS: Record<RingType, string> = {
  ADDRESS_FARM: "\u{1F3E0}",
  ACCOUNT_CLUSTER: "\u{1F3E6}",
  EIN_RECYCLER: "\u{1F522}",
  STRAW_COMPANY: "\u{1F47B}",
  THRESHOLD_GAMING: "\u{1F3AF}",
};

const STATUS_CONFIG: Record<RingStatus, { label: string; bg: string }> = {
  NEW: { label: "NEW", bg: "bg-[#1565C0] text-[#90CAF9]" },
  DETECTED: { label: "DETECTED", bg: "bg-[#1565C0] text-[#90CAF9]" },
  UNDER_REVIEW: { label: "UNDER REVIEW", bg: "bg-[#E65100] text-[#FFE0B2]" },
  CASE_OPENED: { label: "CASE", bg: "bg-[#4A148C] text-[#E1BEE7]" },
  REFERRED: { label: "REFERRED", bg: "bg-[#1B5E20] text-[#C8E6C9]" },
  CLOSED: { label: "CLOSED", bg: "bg-[#37474F] text-[#90A4AE]" },
  DISMISSED: { label: "DISMISSED", bg: "bg-[#37474F] text-[#90A4AE]" },
};

const RING_TYPE_LABELS: Record<RingType, string> = {
  ADDRESS_FARM: "ADDRESS FARM",
  ACCOUNT_CLUSTER: "ACCOUNT CLUSTER",
  EIN_RECYCLER: "EIN RECYCLER",
  STRAW_COMPANY: "STRAW COMPANY",
  THRESHOLD_GAMING: "THRESHOLD GAMING",
};

type SortField = "total_exposure" | "avg_risk_score" | "member_count" | "detected_at";
type SortDir = "asc" | "desc";

export default function RingQueuePage() {
  const router = useRouter();
  const [selectedRingId, setSelectedRingId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>("total_exposure");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<RingStatus | "ALL">("ALL");
  const [isMobile, setIsMobile] = useState(false);
  const [detailKey, setDetailKey] = useState(0);

  /* ── State machine: ring status + investigator overrides ──────────── */
  const [ringStatuses, setRingStatuses] = useState<Record<string, RingStatus>>(() => {
    const init: Record<string, RingStatus> = {};
    FRAUD_RINGS.forEach(r => { init[r.ring_id] = r.status; });
    return init;
  });
  const [ringInvestigators, setRingInvestigators] = useState<Record<string, string | null>>(() => {
    const init: Record<string, string | null> = {};
    FRAUD_RINGS.forEach(r => { init[r.ring_id] = r.assigned_to; });
    return init;
  });
  const [hoveredRingId, setHoveredRingId] = useState<string | null>(null);
  const [dismissDropdownId, setDismissDropdownId] = useState<string | null>(null);
  const dismissRef = useRef<HTMLDivElement>(null);

  /* ── Close dismiss dropdown on outside click ─────────────────────── */
  useEffect(() => {
    if (!dismissDropdownId) return;
    const handler = (e: MouseEvent) => {
      if (dismissRef.current && !dismissRef.current.contains(e.target as Node)) {
        setDismissDropdownId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [dismissDropdownId]);

  /* ── Actions ───────────────────────────────────────────────────────── */
  function openCase(ringId: string) {
    setRingStatuses(prev => ({ ...prev, [ringId]: "UNDER_REVIEW" }));
    setRingInvestigators(prev => ({ ...prev, [ringId]: "You" }));
  }

  function referRing(ringId: string) {
    if (ringStatuses[ringId] !== "UNDER_REVIEW") return;
    setRingStatuses(prev => ({ ...prev, [ringId]: "REFERRED" }));
  }

  function dismissRing(ringId: string, _reason: DismissReason) {
    setRingStatuses(prev => ({ ...prev, [ringId]: "DISMISSED" }));
    setDismissDropdownId(null);
  }

  /* ── Responsive: detect mobile ─────────────────────────────────────── */
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── URL management via History API ────────────────────────────────── */
  const openDetail = useCallback((ringId: string) => {
    if (isMobile) {
      router.push(`/rings/${ringId}`);
      return;
    }
    setDetailKey(k => k + 1);
    setSelectedRingId(ringId);
    window.history.pushState({ ringId }, "", `/rings/${ringId}`);
  }, [isMobile, router]);

  const closeDetail = useCallback(() => {
    setSelectedRingId(null);
    window.history.pushState(null, "", "/rings");
  }, []);

  /* ── Back button handling ──────────────────────────────────────────── */
  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/rings\/(.+)$/);
      if (match) {
        setDetailKey(k => k + 1);
        setSelectedRingId(match[1]);
      } else {
        setSelectedRingId(null);
      }
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  /* ── ESC key closes panel ──────────────────────────────────────────── */
  useEffect(() => {
    if (!selectedRingId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetail();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedRingId, closeDetail]);

  /* ── Sort & filter (uses local state for status) ───────────────────── */
  const filtered = useMemo(() => {
    let rings = FRAUD_RINGS.map(r => ({
      ...r,
      status: ringStatuses[r.ring_id] ?? r.status,
      assigned_to: ringInvestigators[r.ring_id] ?? r.assigned_to,
    }));
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
  }, [sortField, sortDir, statusFilter, ringStatuses, ringInvestigators]);

  const statuses = Object.values(ringStatuses);
  const totalRings = FRAUD_RINGS.length;
  const unreviewed = statuses.filter((s) => s === "NEW").length;
  const totalExposure = FRAUD_RINGS.reduce((sum, r) => sum + r.total_exposure, 0);
  const referredToDoj = statuses.filter((s) => s === "REFERRED").length;

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

  const isOpen = !!selectedRingId;

  /* ── Render ─────────────────────────────────────────────────────────── */
  return (
    <div className="flex h-screen overflow-hidden bg-bg-shell">

      {/* ── Left Panel: Queue ─────────────────────────────────────────── */}
      <div
        className={cn(
          "h-full shrink-0 overflow-y-auto transition-[width] duration-200 ease-in-out",
          isOpen ? "w-[35%] min-w-[420px] border-r border-border" : "w-full"
        )}
      >
        <div className="p-6">
          {/* Header */}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h1 className="text-[15px] font-semibold text-text-primary tracking-wide">RING QUEUE</h1>
              <p className="text-[11px] text-text-muted mt-0.5">Detected fraud rings sorted by dollar exposure — triage and assign for investigation</p>
            </div>
            <div className="flex items-center gap-1.5">
              {(["ALL", "NEW", "UNDER_REVIEW", "REFERRED", "DISMISSED"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={cn(
                    "px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider border transition-colors",
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

          {/* Stats bar — hidden when split-pane open */}
          {!isOpen && (
            <div className="mb-4 grid grid-cols-4 gap-px bg-border">
              <StatCard label="TOTAL RINGS" value={String(totalRings)} />
              <StatCard label="UNREVIEWED" value={String(unreviewed)} highlight />
              <StatCard label="TOTAL EXPOSURE" value={formatCurrency(totalExposure)} />
              <StatCard label="REFERRED TO DOJ" value={String(referredToDoj)} />
            </div>
          )}

          {/* Table */}
          <div className="border border-border bg-bg-panel">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  {isOpen ? (
                    <>
                      <th className="text-label px-2 py-2 text-left font-medium w-8">TYPE</th>
                      <th
                        className="text-label px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                        onClick={() => toggleSort("avg_risk_score")}
                      >
                        RISK{sortIndicator("avg_risk_score")}
                      </th>
                      <th
                        className="text-label px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                        onClick={() => toggleSort("total_exposure")}
                      >
                        EXPOSURE{sortIndicator("total_exposure")}
                      </th>
                      <th
                        className="text-label px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                        onClick={() => toggleSort("member_count")}
                      >
                        #MBR{sortIndicator("member_count")}
                      </th>
                      <th className="text-label px-2 py-2 text-left font-medium">STATUS</th>
                      <th
                        className="text-label px-2 py-2 text-right font-medium cursor-pointer select-none hover:text-text-secondary"
                        onClick={() => toggleSort("detected_at")}
                      >
                        DATE{sortIndicator("detected_at")}
                      </th>
                      <th className="w-0" />
                    </>
                  ) : (
                    <>
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
                      <th className="w-0" />
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filtered.map((ring) => {
                  const status = ring.status;
                  const statusCfg = STATUS_CONFIG[status];
                  const isSelected = ring.ring_id === selectedRingId;
                  const isHovered = ring.ring_id === hoveredRingId;
                  const isDismissed = status === "DISMISSED";
                  const hasActions = isHovered && !isDismissed && status !== "REFERRED" && status !== "CLOSED";

                  return (
                    <tr
                      key={ring.ring_id}
                      onClick={() => openDetail(ring.ring_id)}
                      onMouseEnter={() => setHoveredRingId(ring.ring_id)}
                      onMouseLeave={() => { setHoveredRingId(null); setDismissDropdownId(null); }}
                      className={cn(
                        "border-b border-border cursor-pointer transition-colors",
                        isDismissed && "opacity-40",
                        isSelected
                          ? "bg-bg-selected border-l-2 border-l-accent"
                          : "bg-bg-row hover:bg-bg-row-hover"
                      )}
                    >
                      {isOpen ? (
                        <>
                          <td className="px-2 py-2 text-center">
                            <span className="text-sm" title={RING_TYPE_LABELS[ring.ring_type]}>
                              {RING_TYPE_ICONS[ring.ring_type]}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={cn("text-data tabular-nums font-bold", getRiskColor(ring.avg_risk_score))}>
                              {ring.avg_risk_score}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="text-data text-text-primary tabular-nums">
                              {formatCurrency(ring.total_exposure)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="text-data text-text-primary tabular-nums">{ring.member_count}</span>
                          </td>
                          <td className="px-2 py-2">
                            <span className={cn("inline-flex px-1.5 py-0.5 text-[9px] font-semibold tracking-wider", statusCfg.bg)}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className="text-data text-text-secondary tabular-nums text-[10px]">
                              {formatDate(ring.detected_at)}
                            </span>
                          </td>
                          <td className="relative px-0 py-0 w-0 overflow-visible">
                            {hasActions && (
                              <InlineActions
                                status={status}
                                ringId={ring.ring_id}
                                dismissDropdownId={dismissDropdownId}
                                dismissRef={dismissRef}
                                onOpenCase={openCase}
                                onRefer={referRing}
                                onDismiss={dismissRing}
                                onToggleDismiss={setDismissDropdownId}
                              />
                            )}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-3 py-2">
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide bg-[#37474F]/40 text-[#90A4AE] leading-none">
                              <span className="text-xs">{RING_TYPE_ICONS[ring.ring_type]}</span>
                              {RING_TYPE_LABELS[ring.ring_type]}
                            </span>
                          </td>
                          <td className="px-3 py-2 max-w-[320px]">
                            <span
                              className={cn(
                                "text-data text-smoking-gun font-medium truncate block",
                                isDismissed && "line-through"
                              )}
                              title={ring.common_element}
                            >
                              {ring.common_element}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-data text-text-primary tabular-nums">{ring.member_count}</span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-data text-text-primary tabular-nums font-medium">
                              {formatCurrency(ring.total_exposure)}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className={cn("text-data tabular-nums font-bold", getRiskColor(ring.avg_risk_score))}>
                              {ring.avg_risk_score}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className={cn("inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider", statusCfg.bg)}>
                              {statusCfg.label}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <span className="text-data text-text-secondary">
                              {ring.assigned_to || <span className="text-text-muted">&mdash;</span>}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-right">
                            <span className="text-data text-text-secondary tabular-nums">
                              {formatDate(ring.detected_at)}
                            </span>
                          </td>
                          <td className="relative px-0 py-0 w-0 overflow-visible">
                            {hasActions && (
                              <InlineActions
                                status={status}
                                ringId={ring.ring_id}
                                dismissDropdownId={dismissDropdownId}
                                dismissRef={dismissRef}
                                onOpenCase={openCase}
                                onRefer={referRing}
                                onDismiss={dismissRing}
                                onToggleDismiss={setDismissDropdownId}
                              />
                            )}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Footer */}
            <div className="flex items-center justify-between border-t border-border px-3 py-2">
              <span className="text-label text-text-muted">
                {filtered.length} ring{filtered.length !== 1 ? "s" : ""} displayed
              </span>
              <span className="text-label text-text-muted">
                Sorted by {sortField.replace(/_/g, " ")} {sortDir === "desc" ? "descending" : "ascending"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Notification Toast (bottom-left) ─────────────────────────── */}
      <div className="fixed bottom-4 left-[64px] z-50 flex items-center gap-2 bg-[#E53935] px-3 py-1.5 text-white text-xs font-semibold shadow-lg">
        <span>5 Issues</span>
        <button className="ml-1 text-white/70 hover:text-white">&times;</button>
      </div>

      {/* ── Right Panel: Ring Detail (slide-in) ───────────────────────── */}
      <div
        className={cn(
          "h-full transition-[width,opacity] duration-200 ease-in-out overflow-hidden",
          isOpen ? "flex-1 opacity-100" : "w-0 opacity-0"
        )}
      >
        {selectedRingId && (
          <RingDetailContent
            key={detailKey}
            ringId={selectedRingId}
            onClose={closeDetail}
            embedded
          />
        )}
      </div>
    </div>
  );
}

/* ── Inline Action Buttons (hover overlay) ─────────────────────────── */
function InlineActions({
  status,
  ringId,
  dismissDropdownId,
  dismissRef,
  onOpenCase,
  onRefer,
  onDismiss,
  onToggleDismiss,
}: {
  status: RingStatus;
  ringId: string;
  dismissDropdownId: string | null;
  dismissRef: React.RefObject<HTMLDivElement | null>;
  onOpenCase: (id: string) => void;
  onRefer: (id: string) => void;
  onDismiss: (id: string, reason: DismissReason) => void;
  onToggleDismiss: (id: string | null) => void;
}) {
  const isNew = status === "NEW" || status === "DETECTED";
  const isUnderReview = status === "UNDER_REVIEW" || status === "CASE_OPENED";
  const showDropdown = dismissDropdownId === ringId;

  return (
    <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-1 pr-2 z-10">
      {isNew && (
        <button
          onClick={(e) => { e.stopPropagation(); onOpenCase(ringId); }}
          className="h-[22px] px-2 text-[11px] font-semibold uppercase tracking-wider bg-accent text-white hover:bg-accent/80 transition-colors whitespace-nowrap"
        >
          Open Case
        </button>
      )}

      {isNew && (
        <button
          disabled
          className="h-[22px] px-2 text-[11px] font-semibold uppercase tracking-wider bg-bg-panel text-text-muted border border-border cursor-not-allowed whitespace-nowrap opacity-50"
        >
          Refer
        </button>
      )}

      {isUnderReview && (
        <button
          onClick={(e) => { e.stopPropagation(); onRefer(ringId); }}
          className="h-[22px] px-2 text-[11px] font-semibold uppercase tracking-wider bg-[#1B5E20] text-[#C8E6C9] hover:bg-[#2E7D32] transition-colors whitespace-nowrap"
        >
          Refer
        </button>
      )}

      <div className="relative" ref={showDropdown ? dismissRef : undefined}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleDismiss(showDropdown ? null : ringId);
          }}
          className="h-[22px] px-2 text-[11px] font-semibold uppercase tracking-wider bg-bg-panel text-text-secondary border border-border hover:text-text-primary hover:border-text-muted transition-colors whitespace-nowrap"
        >
          Dismiss &#x25BE;
        </button>

        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-bg-panel border border-border shadow-lg z-50">
            {DISMISS_REASONS.map((reason) => (
              <button
                key={reason.code}
                onClick={(e) => { e.stopPropagation(); onDismiss(ringId, reason.code); }}
                className="w-full text-left px-3 py-1.5 text-[11px] uppercase tracking-wider text-text-secondary hover:bg-bg-row-hover hover:text-text-primary transition-colors"
              >
                {reason.label}
              </button>
            ))}
          </div>
        )}
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
