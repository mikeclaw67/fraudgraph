/* FraudGraph — Case Timeline: shows audit trail / action log for an investigation case.
   Used inside the ring detail workspace when a case is attached. */
"use client";

import { cn } from "@/lib/utils";
import type { AuditEntry, CaseNote } from "@/lib/types";

const ACTION_ICONS: Record<string, { color: string; label: string }> = {
  CASE_OPENED: { color: "bg-[#2196F3]", label: "Case Opened" },
  STATUS_CHANGE: { color: "bg-[#FFB300]", label: "Status Change" },
  NOTE_ADDED: { color: "bg-[#90A4AE]", label: "Note Added" },
  REFERRED_TO_DOJ: { color: "bg-[#E53935]", label: "Referred to DOJ" },
  EVIDENCE_ADDED: { color: "bg-[#43A047]", label: "Evidence Added" },
  DISMISSED: { color: "bg-[#546E7A]", label: "Dismissed" },
  ASSIGNED: { color: "bg-[#7B5EA7]", label: "Assigned" },
};

function formatTimestamp(ts: string): string {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActionMeta(action: string): { color: string; label: string } {
  return ACTION_ICONS[action] ?? { color: "bg-[#546E7A]", label: action.replace(/_/g, " ") };
}

export function CaseTimeline({
  auditTrail,
  notes,
}: {
  auditTrail: AuditEntry[];
  notes: CaseNote[];
}) {
  /* Merge audit entries and notes into a single sorted timeline */
  const items: {
    type: "audit" | "note";
    timestamp: string;
    actor: string;
    action: string;
    detail: string;
  }[] = [];

  for (const entry of auditTrail) {
    items.push({
      type: "audit",
      timestamp: entry.timestamp,
      actor: entry.actor,
      action: entry.action,
      detail: entry.details,
    });
  }

  for (const note of notes) {
    items.push({
      type: "note",
      timestamp: note.timestamp,
      actor: note.author,
      action: "NOTE_ADDED",
      detail: note.content,
    });
  }

  /* Sort newest-first */
  items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-6">
        <span className="text-[11px] text-[#546E7A]">No case activity yet</span>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {items.map((item, i) => {
        const meta = getActionMeta(item.action);
        return (
          <div
            key={`${item.timestamp}-${i}`}
            className="flex items-start gap-2 border-l-2 border-[#37474F] py-1.5 pl-3"
          >
            <div className={cn("mt-1 h-2 w-2 shrink-0", meta.color)} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[#90A4AE]">
                  {meta.label}
                </span>
                <span className="text-[9px] text-[#546E7A]">{item.actor}</span>
                <span className="text-[9px] text-[#546E7A]">&middot;</span>
                <span className="text-[9px] text-[#546E7A]">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-[#90A4AE]">{item.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
