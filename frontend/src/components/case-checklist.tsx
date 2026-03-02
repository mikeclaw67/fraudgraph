/* FraudGraph — Evidence Checklist + Review Panel for case investigation workflow.
   Gates referral: all required items must be COMPLETE before submit-for-review unlocks.
   After submit: reviewer can approve (→ REFERRED_TO_DOJ) or return with notes. */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { ChecklistItem, ReviewStatus } from "@/lib/types";

/* ── Standard checklist for offline/mock fallback ─────────────────────────── */

export const STANDARD_CHECKLIST: ChecklistItem[] = [
  { item_key: "IDENTITY_VERIFIED", label: "Identity verified (borrower / EIN / SSN cross-checked)", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "ENTITY_CONFIRMED", label: "Business entity confirmed (state registration reviewed)", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "BANK_CONFIRMED", label: "Bank account confirmed (routing + account # tied to record)", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "PAYROLL_REVIEWED", label: "Payroll records reviewed", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "EXPOSURE_CONFIRMED", label: "Exposure estimate confirmed", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "GRAPH_COMPLETE", label: "Graph analysis completed (ring connections documented)", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "RING_MEMBERS_ID", label: "Ring members identified (all connected entities listed)", required: true, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "AGENT_RUN", label: "Investigation agent run (AI findings logged)", required: false, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "PRECEDENT_MATCHED", label: "Legal precedent matched (comparable prosecution cited)", required: false, status: "PENDING", completed_by: null, completed_at: null, notes: null },
  { item_key: "SAR_DRAFTED", label: "SAR drafted (Suspicious Activity Report)", required: false, status: "PENDING", completed_by: null, completed_at: null, notes: null },
];

/* ── Evidence Checklist Panel ─────────────────────────────────────────────── */

interface ChecklistPanelProps {
  checklist: ChecklistItem[];
  reviewStatus: ReviewStatus;
  reviewer: string | null;
  reviewNotes: string | null;
  totalExposure: number;
  memberCount: number;
  riskScore: number;
  onToggleItem: (itemKey: string) => void;
  onSubmitReview: () => void;
  onApprove: () => void;
  onReturn: (notes: string) => void;
}

export function EvidenceChecklistPanel({
  checklist,
  reviewStatus,
  reviewer,
  reviewNotes,
  totalExposure,
  memberCount,
  riskScore,
  onToggleItem,
  onSubmitReview,
  onApprove,
  onReturn,
}: ChecklistPanelProps) {
  const [collapsed, setCollapsed] = useState(false);

  const completed = (checklist ?? []).filter((i) => i.status === "COMPLETE").length;
  const requiredItems = checklist.filter((i) => i.required);
  const requiredComplete = requiredItems.filter((i) => i.status === "COMPLETE").length;
  const allRequiredDone = requiredComplete === requiredItems.length;

  return (
    <div className="border-t border-[#37474F]">
      {/* Collapsible header */}
      <button
        onClick={() => setCollapsed((p) => !p)}
        className="flex w-full items-center justify-between bg-[#2C3539] px-4 py-2 text-left hover:bg-[#2F3D42] transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={cn("h-3 w-3 text-[#546E7A] transition-transform", !collapsed && "rotate-90")}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#ECEFF1]">
            Evidence Checklist
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] tabular-nums text-[#90A4AE]">
            {completed} / {checklist.length} complete
          </span>
          {allRequiredDone && (
            <span className="bg-[#43A047]/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[#43A047]">
              Ready
            </span>
          )}
        </div>
      </button>

      {!collapsed && (
        <div className="bg-[#263238] px-4 py-3 space-y-2">
          {/* Checklist items */}
          {checklist.map((item) => (
            <ChecklistRow
              key={item.item_key}
              item={item}
              disabled={reviewStatus === "UNDER_REVIEW" || reviewStatus === "APPROVED"}
              onToggle={() => onToggleItem(item.item_key)}
            />
          ))}

          {/* Progress bar */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#546E7A]">
                Required: {requiredComplete}/{requiredItems.length}
              </span>
              <span className="text-[10px] text-[#546E7A]">
                Total: {completed}/{checklist.length}
              </span>
            </div>
            <div className="h-1.5 w-full bg-[#1E292E]">
              <div
                className={cn("h-full transition-all", allRequiredDone ? "bg-[#43A047]" : "bg-[#2196F3]")}
                style={{ width: `${(completed / checklist.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Return notes (if case was returned) */}
          {reviewStatus === "RETURNED" && reviewNotes && (
            <div className="border border-[#FFB300]/30 bg-[#FFB300]/5 p-3 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <div className="h-2 w-2 bg-[#FFB300]" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#FFB300]">
                  Returned by Reviewer
                </span>
              </div>
              <p className="text-[11px] text-[#ECEFF1]">{reviewNotes}</p>
            </div>
          )}

          {/* Submit / Review section */}
          {reviewStatus === "NONE" || reviewStatus === "RETURNED" ? (
            <div className="pt-2">
              <button
                onClick={onSubmitReview}
                disabled={!allRequiredDone}
                className={cn(
                  "w-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-wider transition-colors",
                  allRequiredDone
                    ? "border-[#2196F3] bg-[#2196F3]/10 text-[#2196F3] hover:bg-[#2196F3]/20"
                    : "border-[#37474F] bg-[#1E292E] text-[#546E7A] cursor-not-allowed"
                )}
              >
                {allRequiredDone
                  ? "Submit for Review"
                  : `${requiredItems.length - requiredComplete} required items remaining`}
              </button>
            </div>
          ) : reviewStatus === "UNDER_REVIEW" ? (
            <ReviewerPanel
              reviewer={reviewer}
              totalExposure={totalExposure}
              memberCount={memberCount}
              riskScore={riskScore}
              requiredComplete={requiredComplete}
              requiredTotal={requiredItems.length}
              agentRun={checklist.find((i) => i.item_key === "AGENT_RUN")?.status === "COMPLETE"}
              onApprove={onApprove}
              onReturn={onReturn}
            />
          ) : reviewStatus === "APPROVED" ? (
            <div className="border border-[#43A047]/30 bg-[#43A047]/5 p-3 mt-2">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-[#43A047]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-[11px] font-semibold text-[#43A047]">
                  Approved & Referred to DOJ
                </span>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

/* ── Checklist Row ────────────────────────────────────────────────────────── */

function ChecklistRow({
  item,
  disabled,
  onToggle,
}: {
  item: ChecklistItem;
  disabled: boolean;
  onToggle: () => void;
}) {
  const isComplete = item.status === "COMPLETE";
  const isNA = item.status === "NA";

  return (
    <div
      className={cn(
        "flex items-start gap-3 border px-3 py-2 transition-colors",
        isComplete
          ? "border-[#43A047]/20 bg-[#43A047]/5"
          : isNA
          ? "border-[#37474F] bg-[#1E292E] opacity-50"
          : "border-[#37474F] bg-[#1E292E]"
      )}
    >
      <button
        onClick={onToggle}
        disabled={disabled}
        className={cn(
          "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center border transition-colors",
          isComplete
            ? "border-[#43A047] bg-[#43A047]"
            : "border-[#546E7A] bg-transparent hover:border-[#2196F3]",
          disabled && "cursor-not-allowed opacity-50"
        )}
      >
        {isComplete && (
          <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("text-[11px] leading-snug", isComplete ? "text-[#90A4AE]" : "text-[#ECEFF1]")}>
            {item.label}
          </span>
          {item.required && (
            <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-[#E53935]">REQ</span>
          )}
        </div>
        {isComplete && item.completed_by && (
          <span className="text-[9px] text-[#546E7A]">
            {item.completed_by}
            {item.completed_at && ` @ ${new Date(item.completed_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Reviewer Panel ───────────────────────────────────────────────────────── */

function ReviewerPanel({
  reviewer,
  totalExposure,
  memberCount,
  riskScore,
  requiredComplete,
  requiredTotal,
  agentRun,
  onApprove,
  onReturn,
}: {
  reviewer: string | null;
  totalExposure: number;
  memberCount: number;
  riskScore: number;
  requiredComplete: number;
  requiredTotal: number;
  agentRun: boolean;
  onApprove: () => void;
  onReturn: (notes: string) => void;
}) {
  const [returnNotes, setReturnNotes] = useState("");
  const [showReturnInput, setShowReturnInput] = useState(false);

  function handleReturn() {
    if (!returnNotes.trim()) return;
    onReturn(returnNotes.trim());
    setReturnNotes("");
    setShowReturnInput(false);
  }

  const formatExposure = (n: number) =>
    n >= 1_000_000
      ? `$${(n / 1_000_000).toFixed(1)}M`
      : `$${Math.round(n).toLocaleString()}`;

  return (
    <div className="border border-[#2196F3]/30 bg-[#2196F3]/5 p-3 mt-2 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 bg-[#2196F3]" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-[#2196F3]">
            Review Request
          </span>
        </div>
        <span className="text-[10px] text-[#546E7A]">Under Review</span>
      </div>

      {/* Reviewer + stats */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#546E7A]">Reviewer</span>
          <span className="font-semibold text-[#ECEFF1]">{reviewer || "Unassigned"}</span>
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-[#546E7A]">Checklist</span>
          <span className="font-semibold text-[#43A047]">{requiredComplete}/{requiredTotal} required</span>
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span className="text-[#546E7A]">
            Exposure: <span className="font-semibold text-[#ECEFF1]">{formatExposure(totalExposure)}</span>
          </span>
          <span className="text-[#546E7A]">
            Members: <span className="font-semibold text-[#ECEFF1]">{memberCount}</span>
          </span>
          <span className="text-[#546E7A]">
            Risk: <span className="font-semibold text-[#E53935]">{riskScore}</span>
          </span>
          <span className="text-[#546E7A]">
            Agent: <span className={cn("font-semibold", agentRun ? "text-[#43A047]" : "text-[#546E7A]")}>{agentRun ? "Yes" : "No"}</span>
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          onClick={onApprove}
          className="flex-1 border border-[#43A047] bg-[#43A047]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#43A047] hover:bg-[#43A047]/20 transition-colors"
        >
          Approve & Refer
        </button>
        <button
          onClick={() => setShowReturnInput((p) => !p)}
          className="flex-1 border border-[#FFB300] bg-[#FFB300]/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[#FFB300] hover:bg-[#FFB300]/20 transition-colors"
        >
          Return to Investigator
        </button>
      </div>

      {/* Return notes input */}
      {showReturnInput && (
        <div className="space-y-2">
          <textarea
            value={returnNotes}
            onChange={(e) => setReturnNotes(e.target.value)}
            placeholder="Explain why the case is being returned…"
            rows={3}
            className="w-full border border-[#37474F] bg-[#263238] p-2 text-[11px] text-[#ECEFF1] placeholder-[#546E7A] focus:border-[#FFB300] focus:outline-none"
          />
          <button
            onClick={handleReturn}
            disabled={!returnNotes.trim()}
            className="w-full border border-[#FFB300] bg-[#FFB300]/10 px-3 py-1.5 text-[10px] font-semibold text-[#FFB300] hover:bg-[#FFB300]/20 transition-colors disabled:opacity-40"
          >
            Submit Return
          </button>
        </div>
      )}
    </div>
  );
}
