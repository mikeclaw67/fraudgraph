/* FraudGraph — Ring Detail page with smoking gun callout, member table, borrower 360, and evidence graph */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { RiskScoreBadge, StatusBadge } from "@/components/badges";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { FraudRing, RingMember, RingType } from "@/lib/types";

/* ── Mock ring data for ring-001 ─────────────────────────────────────────── */

const RING_TYPE_LABELS: Record<RingType, string> = {
  ADDRESS_FARM: "Address Farm",
  ACCOUNT_CLUSTER: "Account Cluster",
  EIN_RECYCLER: "EIN Recycler",
  STRAW_COMPANY: "Straw Company",
  THRESHOLD_GAMING: "Threshold Gaming",
};

function generateMockRing(id: string): FraudRing {
  const members: RingMember[] = [
    {
      member_id: "borrower_00142",
      business_name: "Brightpath Services LLC",
      ein: "84-3291057",
      borrower_name: "Marcus Chen",
      loan_amount: 148700,
      loan_date: "2020-06-14",
      lender: "JPMorgan Chase",
      status: "FUNDED",
      risk_score: 91,
      notes: null,
      red_flags: ["Zero employees at filing", "Business age < 3 months", "Near threshold amount"],
      ssn_last4: "4821",
      bank_account_last4: "7703",
      program: "PPP",
      employee_count: 0,
      business_age_months: 2,
      all_businesses: ["Brightpath Services LLC", "Brightpath Consulting Inc"],
    },
    {
      member_id: "borrower_00319",
      business_name: "Cascade Industries Corp",
      ein: "84-5520183",
      borrower_name: "Diana Reeves",
      loan_amount: 147200,
      loan_date: "2020-06-18",
      lender: "Bank of America",
      status: "FUNDED",
      risk_score: 87,
      notes: "Same SSN last4 as borrower_00142 — likely related",
      red_flags: ["Zero employees at filing", "Business age < 6 months"],
      ssn_last4: "4821",
      bank_account_last4: "3390",
      program: "PPP",
      employee_count: 0,
      business_age_months: 4,
      all_businesses: ["Cascade Industries Corp"],
    },
    {
      member_id: "borrower_00487",
      business_name: "Delta Solutions Group",
      ein: "84-6017294",
      borrower_name: "Robert Kline",
      loan_amount: 143500,
      loan_date: "2020-07-02",
      lender: "Wells Fargo",
      status: "FUNDED",
      risk_score: 84,
      notes: null,
      red_flags: ["Zero employees at filing", "Multiple applications from same address"],
      ssn_last4: "9152",
      bank_account_last4: "7703",
      program: "PPP",
      employee_count: 0,
      business_age_months: 1,
      all_businesses: ["Delta Solutions Group", "Delta Advisory LLC"],
    },
    {
      member_id: "borrower_00521",
      business_name: "Evergreen Holdings Inc",
      ein: "84-7823401",
      borrower_name: "Sarah Mitchell",
      loan_amount: 149900,
      loan_date: "2020-06-22",
      lender: "Citibank",
      status: "FUNDED",
      risk_score: 93,
      notes: "Highest risk — $149,900 just below $150K threshold",
      red_flags: ["Threshold gaming ($149,900)", "Zero employees", "Business age < 2 months", "Same address as 3 others"],
      ssn_last4: "6307",
      bank_account_last4: "7703",
      program: "PPP",
      employee_count: 0,
      business_age_months: 1,
      all_businesses: ["Evergreen Holdings Inc", "Evergreen Capital LLC", "EG Staffing Corp"],
    },
    {
      member_id: "borrower_00688",
      business_name: "Frontier Tech Services",
      ein: "84-9034518",
      borrower_name: "James Ortega",
      loan_amount: 146300,
      loan_date: "2020-07-10",
      lender: "US Bank",
      status: "FUNDED",
      risk_score: 79,
      notes: null,
      red_flags: ["Zero employees at filing", "Same address as 4 others"],
      ssn_last4: "2748",
      bank_account_last4: "5512",
      program: "PPP",
      employee_count: 0,
      business_age_months: 3,
      all_businesses: ["Frontier Tech Services"],
    },
  ];

  return {
    ring_id: id,
    ring_type: "ADDRESS_FARM",
    common_element: "1847 W Commerce St, Unit 204, Milwaukee WI 53204",
    common_element_detail:
      "Commercial mail receiving agency (CMRA). UPS Store #4182. 340 sqft unit leased to \"MKE Business Services\" since Jan 2020. No physical office space — mailbox-only facility. Property owner: Lakeside Commercial REIT.",
    members,
    member_count: members.length,
    total_exposure: members.reduce((s, m) => s + m.loan_amount, 0),
    avg_risk_score: Math.round(members.reduce((s, m) => s + m.risk_score, 0) / members.length),
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-11-14T09:23:17Z",
    updated_at: "2025-11-14T09:23:17Z",
  };
}

/* ── Page Component ──────────────────────────────────────────────────────── */

export default function RingDetailPage() {
  const params = useParams<{ id: string }>();
  const [ring, setRing] = useState<FraudRing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<RingMember | null>(null);
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const sigmaRef = useRef<unknown>(null);

  useEffect(() => {
    setLoading(true);
    // Simulate API fetch — fall back to mock
    const timer = setTimeout(() => {
      setRing(generateMockRing(params.id));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [params.id]);

  // Initialize notes from ring data
  useEffect(() => {
    if (!ring) return;
    const notes: Record<string, string> = {};
    ring.members.forEach((m) => {
      if (m.notes) notes[m.member_id] = m.notes;
    });
    setMemberNotes(notes);
  }, [ring]);

  /* ── Sigma.js evidence graph ─────────────────────────────────────────── */

  const initGraph = useCallback(async () => {
    if (!graphContainerRef.current || !ring) return;

    if (sigmaRef.current) {
      try { (sigmaRef.current as { kill: () => void }).kill(); } catch { /* noop */ }
      sigmaRef.current = null;
    }

    try {
      const { default: Graph } = await import("graphology");
      const { default: Sigma } = await import("sigma");
      const { default: forceAtlas2 } = await import("graphology-layout-forceatlas2");

      const graph = new Graph();

      // Central shared-element node
      const centerNodeId = "shared_element";
      graph.addNode(centerNodeId, {
        label: ring.common_element.split(",")[0],
        size: 18,
        color: "#C94B4B",
        x: 0,
        y: 0,
        nodeType: "SharedElement",
      });

      // Member nodes arranged in a circle around center
      const angleStep = (2 * Math.PI) / ring.members.length;
      ring.members.forEach((member, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const radius = 40;
        const loanScale = Math.max(6, Math.min(16, member.loan_amount / 12000));
        graph.addNode(member.member_id, {
          label: member.business_name,
          size: loanScale,
          color: member.risk_score >= 90 ? "#C94B4B" : member.risk_score >= 80 ? "#D4733A" : "#2A6EBB",
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          nodeType: "Member",
        });

        graph.addEdge(member.member_id, centerNodeId, {
          type: "line",
          color: "#C94B4B",
          size: 2,
        });

        // Add cross-links for shared bank accounts
        ring.members.forEach((other) => {
          if (
            other.member_id > member.member_id &&
            other.bank_account_last4 === member.bank_account_last4
          ) {
            try {
              graph.addEdge(member.member_id, other.member_id, {
                type: "line",
                color: "#4A4F6A",
                size: 1,
              });
            } catch { /* ignore duplicate */ }
          }
        });
      });

      // Light layout pass to refine positions
      forceAtlas2.assign(graph, { iterations: 50, settings: { gravity: 3, scalingRatio: 4 } });

      const sigma = new Sigma(graph, graphContainerRef.current, {
        renderEdgeLabels: false,
        defaultEdgeColor: "#334155",
        labelColor: { color: "#e2e8f0" },
        labelSize: 11,
        labelRenderedSizeThreshold: 6,
      });

      sigma.on("clickNode", ({ node }: { node: string }) => {
        const member = ring.members.find((m) => m.member_id === node);
        if (member) setSelectedMember(member);
      });

      sigmaRef.current = sigma;
    } catch (err) {
      console.error("Sigma graph init failed:", err);
    }
  }, [ring]);

  useEffect(() => { initGraph(); }, [initGraph]);
  useEffect(() => {
    return () => {
      if (sigmaRef.current) {
        try { (sigmaRef.current as { kill: () => void }).kill(); } catch { /* noop */ }
      }
    };
  }, []);

  /* ── Loading / empty states ──────────────────────────────────────────── */

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[#1A1D27]" />
          <div className="h-4 w-96 bg-[#1A1D27]" />
          <div className="flex gap-4">
            <div className="h-60 w-[280px] bg-[#1A1D27]" />
            <div className="h-60 flex-1 bg-[#1A1D27]" />
          </div>
        </div>
      </div>
    );
  }

  if (!ring) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-[#8B90A8]">Ring not found</p>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="flex h-[calc(100vh-0px)] flex-col overflow-hidden">
      {/* Header bar */}
      <div className="flex items-center justify-between border-b border-[#2A2D3E] bg-[#1A1D27] px-6 py-3">
        <div className="flex items-center gap-4">
          <Link href="/alerts" className="text-xs text-[#8B90A8] hover:text-[#E8EAF0]">&larr; Back</Link>
          <div className="h-4 w-px bg-[#2A2D3E]" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-[#E8EAF0]">{RING_TYPE_LABELS[ring.ring_type]} Ring</h1>
              <StatusBadge status={ring.status} />
            </div>
            <p className="text-xs text-[#8B90A8]">
              {ring.ring_id} &middot; {ring.member_count} members &middot; {formatCurrency(ring.total_exposure)} exposure &middot; Detected {formatDate(ring.detected_at)}
            </p>
          </div>
        </div>
        <RiskScoreBadge score={ring.avg_risk_score} size="lg" />
      </div>

      {/* Main content area */}
      <div className="flex min-h-0 flex-1">
        {/* LEFT — Smoking Gun Panel (280px) */}
        <div className="w-[280px] shrink-0 overflow-y-auto border-r border-[#2A2D3E] bg-[#0F1117] p-4">
          <div className="border-2 border-[#C94B4B] bg-[#C94B4B]/5 p-4">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2.5 w-2.5 bg-[#C94B4B]" />
              <span className="text-label text-[#C94B4B]">Smoking Gun</span>
            </div>

            <p className="text-label mb-1">Shared Element</p>
            <p className="text-data font-semibold text-[#E8EAF0]">{ring.common_element}</p>

            <div className="my-3 h-px bg-[#2A2D3E]" />

            <p className="text-label mb-1">Ring Type</p>
            <p className="text-data text-[#E8EAF0]">{RING_TYPE_LABELS[ring.ring_type]}</p>

            <div className="my-3 h-px bg-[#2A2D3E]" />

            <p className="text-label mb-1">Property Record</p>
            <p className="text-data leading-relaxed text-[#8B90A8]">{ring.common_element_detail}</p>

            <div className="my-3 h-px bg-[#2A2D3E]" />

            <p className="text-label mb-1">Ring Statistics</p>
            <div className="space-y-1.5">
              <StatRow label="Members" value={String(ring.member_count)} />
              <StatRow label="Total Exposure" value={formatCurrency(ring.total_exposure)} danger />
              <StatRow label="Avg Risk Score" value={String(ring.avg_risk_score)} danger={ring.avg_risk_score >= 80} />
              <StatRow label="Status" value={ring.status} />
              <StatRow label="Assigned" value={ring.assigned_to || "Unassigned"} />
            </div>
          </div>

          {/* Shared indicators breakdown */}
          <div className="mt-4 border border-[#2A2D3E] bg-[#1A1D27] p-4">
            <p className="text-label mb-2">Shared Indicators</p>
            <div className="space-y-2">
              <IndicatorRow
                label="Address"
                value={ring.common_element.split(",")[0]}
                count={ring.member_count}
              />
              <IndicatorRow
                label="Bank Acct"
                value="****7703"
                count={ring.members.filter((m) => m.bank_account_last4 === "7703").length}
              />
              <IndicatorRow
                label="SSN"
                value="****4821"
                count={ring.members.filter((m) => m.ssn_last4 === "4821").length}
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="mt-4 border border-[#2A2D3E] bg-[#1A1D27] p-4">
            <p className="text-label mb-2">Detection Timeline</p>
            <div className="space-y-2">
              <TimelineEntry time="Nov 14, 09:23" text="Ring detected by Louvain community algorithm" />
              <TimelineEntry time="Nov 14, 09:23" text="5 members linked via shared address" />
              <TimelineEntry time="Nov 14, 09:24" text="Risk scoring complete — avg 86.8" />
              <TimelineEntry time="Nov 14, 09:24" text="Alert generated — awaiting triage" />
            </div>
          </div>
        </div>

        {/* CENTER + RIGHT panels */}
        <div className="flex min-w-0 flex-1 flex-col">
          {/* CENTER — Ring members table + graph */}
          <div className="flex min-h-0 flex-1">
            <div className={cn("flex min-w-0 flex-1 flex-col overflow-hidden transition-all", selectedMember ? "mr-0" : "mr-0")}>
              {/* Table */}
              <div className="shrink-0 overflow-x-auto border-b border-[#2A2D3E]">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#2A2D3E] bg-[#1A1D27] text-left">
                      <th className="p-3 text-label">Business</th>
                      <th className="p-3 text-label">Borrower</th>
                      <th className="p-3 text-label">EIN</th>
                      <th className="p-3 text-label">Loan Amount</th>
                      <th className="p-3 text-label">Loan Date</th>
                      <th className="p-3 text-label">Lender</th>
                      <th className="p-3 text-label">Risk</th>
                      <th className="p-3 text-label">Flags</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ring.members.map((member) => (
                      <tr
                        key={member.member_id}
                        onClick={() => setSelectedMember(member)}
                        className={cn(
                          "cursor-pointer border-b border-[#2A2D3E] transition-colors",
                          selectedMember?.member_id === member.member_id
                            ? "bg-[#1C2B4A]"
                            : "bg-[#1E2130] hover:bg-[#252840]"
                        )}
                      >
                        <td className="p-3">
                          <span className="text-data font-medium text-[#E8EAF0]">{member.business_name}</span>
                        </td>
                        <td className="p-3 text-data text-[#8B90A8]">{member.borrower_name}</td>
                        <td className="p-3 font-mono text-data text-[#8B90A8]">{member.ein}</td>
                        <td className="p-3">
                          <span className={cn("text-data font-medium", member.loan_amount >= 145000 ? "text-[#C94B4B]" : "text-[#E8EAF0]")}>
                            {formatCurrency(member.loan_amount)}
                          </span>
                        </td>
                        <td className="p-3 text-data text-[#8B90A8]">{formatDate(member.loan_date)}</td>
                        <td className="p-3 text-data text-[#8B90A8]">{member.lender}</td>
                        <td className="p-3"><RiskScoreBadge score={member.risk_score} /></td>
                        <td className="p-3">
                          <span className="text-data text-[#C94B4B]">{member.red_flags.length}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Evidence graph */}
              <div className="relative min-h-0 flex-1">
                <div className="absolute left-4 top-3 z-10 border border-[#2A2D3E] bg-[#1A1D27]/95 px-3 py-2 backdrop-blur">
                  <p className="text-label">Evidence Graph</p>
                  <p className="text-[10px] text-[#4A4F6A]">{ring.member_count} members &middot; Click node to inspect</p>
                </div>
                {/* Legend */}
                <div className="absolute bottom-3 left-4 z-10 border border-[#2A2D3E] bg-[#1A1D27]/95 px-3 py-2 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3" style={{ backgroundColor: "#C94B4B" }} />
                      <span className="text-[10px] text-[#8B90A8]">Shared Element</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3" style={{ backgroundColor: "#2A6EBB" }} />
                      <span className="text-[10px] text-[#8B90A8]">Member</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-3 w-3" style={{ backgroundColor: "#D4733A" }} />
                      <span className="text-[10px] text-[#8B90A8]">High Risk</span>
                    </div>
                  </div>
                </div>
                <div ref={graphContainerRef} className="h-full w-full bg-[#0F1117]" />
              </div>
            </div>

            {/* RIGHT — Borrower 360 slide-in panel (360px) */}
            <div
              className={cn(
                "h-full w-[360px] shrink-0 overflow-y-auto border-l border-[#2A2D3E] bg-[#1A1D27] transition-all duration-300",
                selectedMember ? "translate-x-0 opacity-100" : "hidden"
              )}
            >
              {selectedMember && (
                <Borrower360
                  member={selectedMember}
                  notes={memberNotes[selectedMember.member_id] || ""}
                  onNotesChange={(val) =>
                    setMemberNotes((prev) => ({ ...prev, [selectedMember.member_id]: val }))
                  }
                  onClose={() => setSelectedMember(null)}
                />
              )}
            </div>
          </div>

          {/* BOTTOM — Action bar */}
          <div className="flex items-center justify-between border-t border-[#2A2D3E] bg-[#1A1D27] px-6 py-3">
            <div className="flex items-center gap-2">
              <Link
                href={`/cases?ring=${ring.ring_id}`}
                className="border border-[#2A6EBB] bg-[#2A6EBB]/10 px-4 py-2 text-xs font-semibold text-[#2A6EBB] hover:bg-[#2A6EBB]/20"
              >
                Open Full Case
              </Link>
              <button className="border border-[#2A2D3E] bg-[#1E2130] px-4 py-2 text-xs font-medium text-[#8B90A8] hover:bg-[#252840] hover:text-[#E8EAF0]">
                Export Evidence Package
              </button>
              <button className="border border-[#2A2D3E] bg-[#1E2130] px-4 py-2 text-xs font-medium text-[#8B90A8] hover:bg-[#252840] hover:text-[#E8EAF0]">
                Dismiss Ring
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-[#4A4F6A]">
              <span>Ring {ring.ring_id}</span>
              <span>&middot;</span>
              <span>{RING_TYPE_LABELS[ring.ring_type]}</span>
              <span>&middot;</span>
              <span>Last updated {formatDate(ring.updated_at)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Borrower 360 Side Panel ─────────────────────────────────────────────── */

function Borrower360({
  member,
  notes,
  onNotesChange,
  onClose,
}: {
  member: RingMember;
  notes: string;
  onNotesChange: (val: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col">
      {/* Panel header */}
      <div className="flex items-center justify-between border-b border-[#2A2D3E] px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-[#E8EAF0]">{member.borrower_name}</p>
          <p className="text-[10px] text-[#4A4F6A]">{member.member_id}</p>
        </div>
        <button onClick={onClose} className="text-[#4A4F6A] hover:text-[#E8EAF0]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Risk score header */}
        <div className="flex items-center gap-3">
          <RiskScoreBadge score={member.risk_score} size="lg" />
          <div>
            <p className="text-sm font-semibold text-[#E8EAF0]">{member.business_name}</p>
            <p className="text-xs text-[#8B90A8]">{member.program} &middot; EIN {member.ein}</p>
          </div>
        </div>

        {/* Loan details */}
        <PanelSection title="Loan Details">
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <PanelField label="Amount" value={formatCurrency(member.loan_amount)} danger={member.loan_amount >= 145000} />
            <PanelField label="Program" value={member.program} />
            <PanelField label="Date" value={formatDate(member.loan_date)} />
            <PanelField label="Lender" value={member.lender} />
            <PanelField label="Status" value={member.status} />
            <PanelField label="Employees" value={String(member.employee_count)} danger={member.employee_count === 0} />
            <PanelField label="Business Age" value={`${member.business_age_months}mo`} danger={member.business_age_months < 6} />
            <PanelField label="SSN Last 4" value={`****${member.ssn_last4}`} />
            <PanelField label="Bank Acct" value={`****${member.bank_account_last4}`} />
          </div>
        </PanelSection>

        {/* Other businesses */}
        {member.all_businesses.length > 1 && (
          <PanelSection title="Other Businesses">
            <div className="space-y-1">
              {member.all_businesses.map((biz) => (
                <div key={biz} className={cn("text-data", biz === member.business_name ? "text-[#4A4F6A]" : "text-[#E8EAF0]")}>
                  {biz}
                  {biz === member.business_name && <span className="ml-1 text-[10px] text-[#4A4F6A]">(current)</span>}
                </div>
              ))}
            </div>
          </PanelSection>
        )}

        {/* Risk flags */}
        <PanelSection title="Risk Flags" danger>
          <div className="space-y-1.5">
            {member.red_flags.map((flag) => (
              <div key={flag} className="flex items-start gap-2 border border-[#C94B4B]/20 bg-[#C94B4B]/5 px-2 py-1.5">
                <div className="mt-1 h-1.5 w-1.5 shrink-0 bg-[#C94B4B]" />
                <span className="text-data text-[#C94B4B]">{flag}</span>
              </div>
            ))}
          </div>
        </PanelSection>

        {/* Notes field */}
        <PanelSection title="Investigator Notes">
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="Add notes about this borrower..."
            rows={4}
            className="w-full border border-[#2A2D3E] bg-[#0F1117] p-2 text-data text-[#E8EAF0] placeholder-[#4A4F6A] focus:border-[#2A6EBB] focus:outline-none"
          />
        </PanelSection>
      </div>

      {/* Panel footer actions */}
      <div className="border-t border-[#2A2D3E] p-4 space-y-2">
        <Link
          href={`/entity/${member.member_id}`}
          className="block w-full border border-[#2A6EBB] bg-[#2A6EBB]/10 px-3 py-2 text-center text-xs font-semibold text-[#2A6EBB] hover:bg-[#2A6EBB]/20"
        >
          Open Full Entity Profile
        </Link>
        <button className="w-full border border-[#2A2D3E] bg-[#1E2130] px-3 py-2 text-xs text-[#8B90A8] hover:bg-[#252840]">
          Flag for SAR Filing
        </button>
      </div>
    </div>
  );
}

/* ── Shared sub-components ───────────────────────────────────────────────── */

function PanelSection({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn("border p-3", danger ? "border-[#C94B4B]/30 bg-[#C94B4B]/5" : "border-[#2A2D3E] bg-[#0F1117]")}>
      <p className={cn("text-label mb-2", danger ? "text-[#C94B4B]" : "")}>{title}</p>
      {children}
    </div>
  );
}

function PanelField({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#4A4F6A]">{label}</p>
      <p className={cn("text-data font-medium", danger ? "text-[#C94B4B]" : "text-[#E8EAF0]")}>{value}</p>
    </div>
  );
}

function StatRow({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-[#4A4F6A]">{label}</span>
      <span className={cn("text-data font-medium", danger ? "text-[#C94B4B]" : "text-[#E8EAF0]")}>{value}</span>
    </div>
  );
}

function IndicatorRow({ label, value, count }: { label: string; value: string; count: number }) {
  return (
    <div className="flex items-center justify-between border-b border-[#2A2D3E] pb-2 last:border-0 last:pb-0">
      <div>
        <p className="text-[10px] text-[#4A4F6A]">{label}</p>
        <p className="text-data text-[#C94B4B]">{value}</p>
      </div>
      <span className="text-data font-bold text-[#C94B4B]">{count}x</span>
    </div>
  );
}

function TimelineEntry({ time, text }: { time: string; text: string }) {
  return (
    <div className="flex gap-2 border-l-2 border-[#2A2D3E] pl-2">
      <div>
        <p className="text-[10px] text-[#4A4F6A]">{time}</p>
        <p className="text-data text-[#8B90A8]">{text}</p>
      </div>
    </div>
  );
}
