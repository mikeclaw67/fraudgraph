/* FraudGraph — Ring Detail: operational investigation workspace.
   Layout: KPI strip → Evidence Graph (dominant) → context panels below fold.
   Live AI investigation streams LangGraph agent steps via WebSocket. */
"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/badges";
import { formatCurrency, formatDate, cn, getRiskColor } from "@/lib/utils";
import { exportSigmaAsPNG } from "@/lib/exportGraph";
import type { FraudRing, RingMember, RingType, RiskBreakdown } from "@/lib/types";

/* ── Investigation types ─────────────────────────────────────────────────── */

type InvStatus = "idle" | "running" | "complete" | "error";

interface InvStep {
  step: number;
  type: "tool_call" | "finding" | "complete" | "error";
  tool_name?: string;
  content: string;
}

interface KeyFinding {
  finding: string;
  severity?: string;
  data_source?: string;
}

interface InvFindings {
  risk_tier: string;
  executive_summary: string;
  key_findings: KeyFinding[];
  estimated_fraud_amount: number;
  recommended_action: string;
  evidence_citations?: string[];
  confidence?: number;
}

/* ── Mock ring data ──────────────────────────────────────────────────────── */

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
      'Commercial mail receiving agency (CMRA). UPS Store #4182. 340 sqft unit leased to "MKE Business Services" since Jan 2020. No physical office space — mailbox-only facility. Property owner: Lakeside Commercial REIT.',
    members,
    member_count: members.length,
    total_exposure: members.reduce((s, m) => s + m.loan_amount, 0),
    avg_risk_score: Math.round(members.reduce((s, m) => s + m.risk_score, 0) / members.length),
    status: "NEW",
    assigned_to: null,
    detected_at: "2025-11-14T09:23:17Z",
    updated_at: "2025-11-14T09:23:17Z",
    riskBreakdown: {
      rules: 88,
      ml: 78,
      graph: 74,
      firedRules: ["ADDR_REUSE", "STRAW_CO", "ACCOUNT_SHARE"],
      mlLabel: "Isolation Forest anomaly",
    },
  };
}

/* ── Page Component ──────────────────────────────────────────────────────── */

export function RingDetailContent({ ringId, onClose, embedded }: { ringId: string; onClose?: () => void; embedded?: boolean }) {
  const [ring, setRing] = useState<FraudRing | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState<RingMember | null>(null);
  const [memberNotes, setMemberNotes] = useState<Record<string, string>>({});
  const graphContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sigmaRef = useRef<any>(null);

  /* ── Investigation state ─────────────────────────────────────────────── */
  const [invStatus, setInvStatus] = useState<InvStatus>("idle");
  const [invSteps, setInvSteps] = useState<InvStep[]>([]);
  const [invFindings, setInvFindings] = useState<InvFindings | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const invStatusRef = useRef<InvStatus>("idle");

  function setInvStatusBoth(s: InvStatus) {
    invStatusRef.current = s;
    setInvStatus(s);
  }

  function startInvestigation() {
    if (!ring || invStatus === "running") return;

    setInvStatusBoth("running");
    setInvSteps([]);
    setInvFindings(null);

    const sorted = [...ring.members].sort((a, b) => b.risk_score - a.risk_score);
    const alertId = ring.ring_id;
    const entityId = sorted[0]?.member_id ?? ring.ring_id;
    const wsUrl = `ws://localhost:8000/api/investigate/ws/${alertId}?entity_id=${entityId}`;

    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data as string) as InvStep;
        setInvSteps((prev) => [...prev, data]);

        if (data.type === "complete") {
          let findings: InvFindings | null = null;
          try {
            let raw = data.content;
            if (raw.includes("```json")) {
              raw = raw.split("```json")[1].split("```")[0].trim();
            } else if (raw.includes("{")) {
              const start = raw.indexOf("{");
              const end = raw.lastIndexOf("}") + 1;
              raw = raw.slice(start, end);
            }
            findings = JSON.parse(raw) as InvFindings;
          } catch {
            /* leave null — will show raw content fallback */
          }
          setInvFindings(findings);
          setInvStatusBoth("complete");
        } else if (data.type === "error") {
          setInvStatusBoth("error");
        }
      } catch {
        /* ignore parse errors */
      }
    };

    ws.onerror = () => setInvStatusBoth("error");
    ws.onclose = () => {
      if (invStatusRef.current === "running") setInvStatusBoth("error");
    };
  }

  function closeInvestigation() {
    wsRef.current?.close();
    setInvStatusBoth("idle");
    setInvSteps([]);
    setInvFindings(null);
  }

  function handleExportGraph() {
    if (!sigmaRef.current || !ring) return;
    exportSigmaAsPNG(
      sigmaRef.current,
      `fraudgraph-ring-${ring.ring_id}.png`,
      "#0F1117"
    );
  }

  function handleExportEvidence() {
    window.print();
  }

  /* Cleanup WS on unmount */
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setRing(generateMockRing(ringId));
      setLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [ringId]);

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
      try {
        sigmaRef.current.kill();
      } catch {
        /* noop */
      }
      sigmaRef.current = null;
    }

    try {
      const { default: Graph } = await import("graphology");
      const { default: Sigma } = await import("sigma");
      const { default: forceAtlas2 } = await import("graphology-layout-forceatlas2");

      const graph = new Graph();

      const centerNodeId = "shared_element";
      graph.addNode(centerNodeId, {
        label: ring.common_element.split(",")[0],
        size: 40,
        color: "#C94B4B",
        x: 0,
        y: 0,
        nodeType: "SharedElement",
      });

      const angleStep = (2 * Math.PI) / ring.members.length;
      ring.members.forEach((member, i) => {
        const angle = angleStep * i - Math.PI / 2;
        const radius = 40;
        const loanScale = Math.max(14, Math.min(36, member.loan_amount / 5000));
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
          size: 3,
        });

        ring.members.forEach((other) => {
          if (other.member_id > member.member_id && other.bank_account_last4 === member.bank_account_last4) {
            try {
              graph.addEdge(member.member_id, other.member_id, {
                type: "line",
                color: "#4A4F6A",
                size: 2,
              });
            } catch {
              /* ignore duplicate */
            }
          }
        });
      });

      forceAtlas2.assign(graph, { iterations: 50, settings: { gravity: 3, scalingRatio: 4 } });

      const sigma = new Sigma(graph, graphContainerRef.current, {
        renderEdgeLabels: false,
        defaultEdgeColor: "#334155",
        labelColor: { color: "#e2e8f0" },
        labelSize: 14,
        labelRenderedSizeThreshold: 4,
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

  useEffect(() => {
    initGraph();
  }, [initGraph]);

  useEffect(() => {
    return () => {
      if (sigmaRef.current) {
        try {
          sigmaRef.current.kill();
        } catch {
          /* noop */
        }
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
          <div className="h-[60vh] w-full bg-[#1A1D27]" />
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

  /* ── Render — Workspace Layout ─────────────────────────────────────── */

  return (
    <div className={cn("flex flex-col overflow-hidden", embedded ? "h-full" : "h-screen")}>

      {/* ── KPI Strip (RD-01 + RD-02) ─────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-[#2A2D3E] bg-[#1A1D27] px-4">
        {/* Left: nav + identity */}
        <div className="flex items-center gap-3">
          {!embedded && (<><Link href="/rings" className="text-xs text-[#4A4F6A] hover:text-[#E8EAF0] transition-colors">&larr; Rings</Link><div className="h-4 w-px bg-[#2A2D3E]" /></>)}
          <span className="bg-slate-700/40 px-2 py-0.5 text-[11px] font-semibold text-slate-300 tracking-wide">
            {RING_TYPE_LABELS[ring.ring_type].toUpperCase()}
          </span>
          <span className="font-mono text-xs text-[#8B90A8]">{ring.ring_id}</span>
          <div className="h-4 w-px bg-[#2A2D3E]" />

          {/* Key metrics */}
          <div className="flex items-center gap-4 text-xs">
            <span className="text-[#8B90A8]">
              <span className="text-[#4A4F6A] mr-1">Members</span>
              <span className="font-semibold text-[#E8EAF0] tabular-nums">{ring.member_count}</span>
            </span>
            <span className="text-[#8B90A8]">
              <span className="text-[#4A4F6A] mr-1">Exposure</span>
              <span className="font-semibold text-[#E8EAF0] tabular-nums">{formatCurrency(ring.total_exposure)}</span>
            </span>
            <span className="text-[#8B90A8]">
              <span className="text-[#4A4F6A] mr-1">Risk</span>
              <span className={cn("font-bold tabular-nums", getRiskColor(ring.avg_risk_score))}>{ring.avg_risk_score}</span>
            </span>
          </div>
          <StatusBadge status={ring.status} />
        </div>

        {/* Right: persistent actions (RD-02) */}
        <div className="flex items-center gap-2">
          <Link
            href={`/cases?ring=${ring.ring_id}`}
            className="border border-[#2A6EBB] bg-[#2A6EBB]/10 px-3 py-1.5 text-[11px] font-semibold text-[#2A6EBB] hover:bg-[#2A6EBB]/20 transition-colors"
          >
            Open Case
          </Link>
          <button onClick={handleExportGraph} className="border border-[#2A2D3E] bg-[#1E2130] px-3 py-1.5 text-[11px] font-medium text-[#8B90A8] hover:bg-[#252840] hover:text-[#E8EAF0] transition-colors">
            Export PNG
          </button>
          <button onClick={handleExportEvidence} className="border border-[#2A2D3E] bg-[#1E2130] px-3 py-1.5 text-[11px] font-medium text-[#8B90A8] hover:bg-[#252840] hover:text-[#E8EAF0] transition-colors">
            Evidence Package
          </button>
          <button className="border border-[#2A2D3E] bg-[#1E2130] px-3 py-1.5 text-[11px] font-medium text-[#8B90A8] hover:bg-[#252840] hover:text-[#E8EAF0] transition-colors">
            Dismiss
          </button>
          <button
            onClick={startInvestigation}
            disabled={invStatus === "running"}
            className={cn(
              "flex items-center gap-1.5 border px-3 py-1.5 text-[11px] font-semibold transition-colors",
              invStatus === "running"
                ? "cursor-not-allowed border-[#4A4F6A] bg-[#1A1D27] text-[#4A4F6A]"
                : invStatus === "complete"
                ? "border-[#2A9B6B] bg-[#2A9B6B]/10 text-[#2A9B6B] hover:bg-[#2A9B6B]/20"
                : invStatus === "error"
                ? "border-[#C94B4B] bg-[#C94B4B]/10 text-[#C94B4B] hover:bg-[#C94B4B]/20"
                : "border-[#7B5EA7] bg-[#7B5EA7]/10 text-[#C4A9F0] hover:bg-[#7B5EA7]/20"
            )}
          >
            {invStatus === "running" ? (
              <>
                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Investigating…
              </>
            ) : invStatus === "complete" ? (
              "Re-run"
            ) : invStatus === "error" ? (
              "Retry"
            ) : (
              <>
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
                  />
                </svg>
                Investigate
              </>
            )}
          </button>
          {onClose && (

            <button onClick={onClose} className="ml-1 flex h-7 w-7 items-center justify-center border border-[#2A2D3E] text-[#4A4F6A] hover:bg-[#252840] hover:text-[#E8EAF0] transition-colors" title="Close">

              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>

            </button>

          )}

        </div>
      </header>

      {/* ── Main scrollable content ───────────────────────────────────── */}
      <div className={cn("flex-1", embedded ? "flex flex-col min-h-0" : "overflow-y-auto")}>

        {/* ── Evidence Graph (RD-01: 62vh, dominant) ──────────────────── */}
        <div className="relative" style={{ height: embedded ? "70%" : "max(420px, 62vh)" }}>
          <div className="absolute left-4 top-3 z-10 border border-[#2A2D3E] bg-[#1A1D27]/95 px-3 py-2 backdrop-blur">
            <p className="text-label">Evidence Graph</p>
            <p className="text-[10px] text-[#4A4F6A]">{ring.member_count} members &middot; Click node to inspect</p>
          </div>
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

        <div className={embedded ? "flex-1 min-h-0 overflow-y-auto" : ""}>

        {/* ── Investigation Panel (conditional) ───────────────────────── */}
        {invStatus !== "idle" && (
          <div className="h-[340px] shrink-0 border-t border-[#2A2D3E]">
            <InvestigationPanel status={invStatus} steps={invSteps} findings={invFindings} onClose={closeInvestigation} />
          </div>
        )}

        {/* ── Evidence Summary (print only) ────────────────────────── */}
        <div data-print-show className="hidden print:block border-t border-[#2A2D3E] bg-white p-8 text-black">
          <h2 className="text-xl font-bold mb-4">FraudGraph Evidence Package</h2>
          <div className="grid grid-cols-2 gap-2 text-sm mb-4">
            <p><strong>Ring ID:</strong> {ring.ring_id}</p>
            <p><strong>Type:</strong> {RING_TYPE_LABELS[ring.ring_type]}</p>
            <p><strong>Common Element:</strong> {ring.common_element}</p>
            <p><strong>Total Exposure:</strong> {formatCurrency(ring.total_exposure)}</p>
            <p><strong>Avg Risk Score:</strong> {ring.avg_risk_score}</p>
            <p><strong>Members:</strong> {ring.member_count}</p>
            <p><strong>Status:</strong> {ring.status}</p>
            <p><strong>Detected:</strong> {formatDate(ring.detected_at)}</p>
          </div>
          <p className="text-xs text-gray-500">Generated by FraudGraph — SBA OIG Fraud Detection Platform</p>
        </div>



        {/* ── Member Table (below fold) ───────────────────────────────── */}
        <div className="border-t border-[#2A2D3E]">
          <div className="flex items-center justify-between border-b border-[#2A2D3E] bg-[#1A1D27] px-4 py-2">
            <p className="text-label">Ring Members</p>
            <p className="text-[10px] text-[#4A4F6A]">{ring.member_count} entities</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#2A2D3E] bg-[#1A1D27] text-left">
                  <th className="p-3 text-label">Business</th>
                  <th className="p-3 text-label">Borrower</th>
                  <th className="p-3 text-label">EIN</th>
                  <th className="p-3 text-label text-right">Loan Amount</th>
                  <th className="p-3 text-label">Loan Date</th>
                  <th className="p-3 text-label">Lender</th>
                  <th className="p-3 text-label text-right">Risk</th>
                  <th className="p-3 text-label text-right">Flags</th>
                </tr>
              </thead>
              <tbody>
                {ring.members.map((member) => (
                  <tr
                    key={member.member_id}
                    onClick={() => setSelectedMember(member)}
                    className={cn(
                      "cursor-pointer border-b border-[#2A2D3E] transition-colors",
                      selectedMember?.member_id === member.member_id ? "bg-[#1C2B4A]" : "bg-[#1E2130] hover:bg-[#252840]"
                    )}
                  >
                    <td className="p-3">
                      <span className="text-data font-medium text-[#E8EAF0]">{member.business_name}</span>
                    </td>
                    <td className="p-3 text-data text-[#8B90A8]">{member.borrower_name}</td>
                    <td className="p-3 font-mono text-data text-[#8B90A8]">{member.ein}</td>
                    <td className="p-3 text-right">
                      <span className={cn("text-data font-medium tabular-nums", member.loan_amount >= 145000 ? "text-[#C94B4B]" : "text-[#E8EAF0]")}>
                        {formatCurrency(member.loan_amount)}
                      </span>
                    </td>
                    <td className="p-3 text-data text-[#8B90A8]">{formatDate(member.loan_date)}</td>
                    <td className="p-3 text-data text-[#8B90A8]">{member.lender}</td>
                    <td className="p-3 text-right">
                      <span className={cn("text-data font-bold tabular-nums", getRiskColor(member.risk_score))}>{member.risk_score}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-data text-[#C94B4B]">{member.red_flags.length}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Score Breakdown (between member table and context panels) ── */}
        {ring.riskBreakdown && (
          <ScoreBreakdown breakdown={ring.riskBreakdown} memberCount={ring.member_count} />
        )}

        {/* ── Context Panels (3-col grid below fold) ──────────────────── */}
        <div className="grid grid-cols-3 gap-px border-t border-[#2A2D3E] bg-[#2A2D3E]">
          {/* Smoking Gun */}
          <div className="bg-[#0F1117] p-4">
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
            </div>
          </div>

          {/* Shared Indicators */}
          <div className="bg-[#0F1117] p-4">
            <div className="border border-[#2A2D3E] bg-[#1A1D27] p-4 h-full">
              <p className="text-label mb-3">Shared Indicators</p>
              <div className="space-y-3">
                <IndicatorRow label="Address" value={ring.common_element.split(",")[0]} count={ring.member_count} />
                <IndicatorRow label="Bank Acct" value="****7703" count={ring.members.filter((m) => m.bank_account_last4 === "7703").length} />
                <IndicatorRow label="SSN" value="****4821" count={ring.members.filter((m) => m.ssn_last4 === "4821").length} />
              </div>
              <div className="my-4 h-px bg-[#2A2D3E]" />
              <p className="text-label mb-2">Ring Statistics</p>
              <div className="space-y-1.5">
                <StatRow label="Total Exposure" value={formatCurrency(ring.total_exposure)} danger />
                <StatRow label="Avg Risk Score" value={String(ring.avg_risk_score)} danger={ring.avg_risk_score >= 80} />
                <StatRow label="Status" value={ring.status} />
                <StatRow label="Assigned" value={ring.assigned_to || "Unassigned"} />
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-[#0F1117] p-4">
            <div className="border border-[#2A2D3E] bg-[#1A1D27] p-4 h-full">
              <p className="text-label mb-3">Detection Timeline</p>
              <div className="space-y-3">
                <TimelineEntry time="Nov 14, 09:23" text="Ring detected by Louvain community algorithm" />
                <TimelineEntry time="Nov 14, 09:23" text="5 members linked via shared address" />
                <TimelineEntry time="Nov 14, 09:24" text="Risk scoring complete — avg 86.8" />
                <TimelineEntry time="Nov 14, 09:24" text="Alert generated — awaiting triage" />
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* ── Borrower 360 slide-over (fixed right overlay) ─────────────── */}
      {selectedMember && (
        <div className="fixed right-0 top-0 z-50 flex h-screen">
          <div className="w-8 cursor-pointer bg-black/30 backdrop-blur-sm" onClick={() => setSelectedMember(null)} />
          <div className="w-[360px] border-l border-[#2A2D3E] bg-[#1A1D27] shadow-2xl">
            <Borrower360
              member={selectedMember}
              notes={memberNotes[selectedMember.member_id] || ""}
              onNotesChange={(val) => setMemberNotes((prev) => ({ ...prev, [selectedMember.member_id]: val }))}
              onClose={() => setSelectedMember(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Investigation Panel ─────────────────────────────────────────────────── */

function InvestigationPanel({
  status,
  steps,
  findings,
  onClose,
}: {
  status: InvStatus;
  steps: InvStep[];
  findings: InvFindings | null;
  onClose: () => void;
}) {
  const stepsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = stepsRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [steps]);

  const visibleSteps = steps.filter((s) => s.type !== "complete");
  const showFindings = status === "complete";

  return (
    <div className="flex h-full bg-[#0A0C12]">
      {/* Steps / timeline column */}
      <div className={cn("flex flex-col overflow-hidden border-r border-[#2A2D3E]", showFindings && findings ? "w-[420px] shrink-0" : "flex-1")}>
        {/* Panel header */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#2A2D3E] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            {status === "running" && (
              <svg className="h-3.5 w-3.5 animate-spin text-[#7B5EA7]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            {status === "complete" && (
              <div className="flex h-3.5 w-3.5 items-center justify-center bg-[#2A9B6B]">
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === "error" && <div className="h-3.5 w-3.5 bg-[#C94B4B]" />}
            <span className="text-xs font-semibold text-[#E8EAF0]">AI Investigation</span>
            <span className="text-[10px] text-[#4A4F6A]">
              {status === "running" && "Running…"}
              {status === "complete" && `${visibleSteps.length} steps complete`}
              {status === "error" && "Connection failed"}
            </span>
          </div>
          <button onClick={onClose} className="text-[#4A4F6A] hover:text-[#E8EAF0]">
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Step timeline */}
        <div ref={stepsRef} className="flex-1 overflow-y-auto p-3 space-y-1">
          {visibleSteps.length === 0 && status === "running" && (
            <div className="flex items-center gap-2 py-4 text-[#4A4F6A]">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-[11px]">Connecting to investigation agent…</span>
            </div>
          )}
          {visibleSteps.map((s, i) => (
            <InvStepItem key={i} step={s} />
          ))}
          {status === "error" && (
            <div className="flex items-start gap-2 border border-[#C94B4B]/30 bg-[#C94B4B]/5 p-2">
              <div className="mt-0.5 h-2 w-2 shrink-0 bg-[#C94B4B]" />
              <span className="text-[11px] text-[#C94B4B]">
                WebSocket connection failed. Is the backend running on localhost:8000?
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Findings column — visible when complete */}
      {showFindings && (
        <div className="flex-1 overflow-y-auto">
          {findings ? (
            <FindingsPanel findings={findings} />
          ) : (
            <div className="p-4">
              <p className="text-label mb-2">Investigation Complete</p>
              <pre className="whitespace-pre-wrap text-[11px] text-[#8B90A8]">{steps.find((s) => s.type === "complete")?.content}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Step item ───────────────────────────────────────────────────────────── */

function InvStepItem({ step }: { step: InvStep }) {
  const isToolCall = step.type === "tool_call";

  return (
    <div className={cn("flex items-start gap-2 border-l-2 py-1 pl-2", isToolCall ? "border-[#7B5EA7]" : "border-[#2A6EBB]")}>
      <div className="mt-1.5 shrink-0">
        {isToolCall ? <div className="h-1.5 w-1.5 bg-[#7B5EA7]" /> : <div className="h-1.5 w-1.5 bg-[#2A6EBB]" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[9px] font-semibold uppercase tracking-wider", isToolCall ? "text-[#7B5EA7]" : "text-[#2A6EBB]")}>
            {isToolCall ? (step.tool_name ?? "tool") : "finding"}
          </span>
          <span className="text-[9px] text-[#4A4F6A]">step {step.step}</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#8B90A8]">{step.content}</p>
      </div>
    </div>
  );
}

/* ── Structured Findings Panel ───────────────────────────────────────────── */

const TIER_COLORS: Record<string, string> = {
  CRITICAL: "text-[#C94B4B] border-[#C94B4B] bg-[#C94B4B]/10",
  HIGH: "text-[#D4733A] border-[#D4733A] bg-[#D4733A]/10",
  MEDIUM: "text-[#D4B83A] border-[#D4B83A] bg-[#D4B83A]/10",
  LOW: "text-[#2A9B6B] border-[#2A9B6B] bg-[#2A9B6B]/10",
};

const ACTION_COLORS: Record<string, string> = {
  ESCALATE_TO_DOJ: "text-[#C94B4B]",
  REFER_TO_DOJ: "text-[#C94B4B]",
  ESCALATE_TO_SENIOR: "text-[#D4733A]",
  FURTHER_INVESTIGATION: "text-[#D4B83A]",
  OPEN_CASE: "text-[#D4733A]",
  DISMISS: "text-[#2A9B6B]",
};

const SEVERITY_DOT: Record<string, string> = {
  CRITICAL: "bg-[#C94B4B]",
  HIGH: "bg-[#D4733A]",
  MEDIUM: "bg-[#D4B83A]",
  LOW: "bg-[#2A9B6B]",
};

function FindingsPanel({ findings }: { findings: InvFindings }) {
  const tierStyle = TIER_COLORS[findings.risk_tier] ?? "text-[#8B90A8] border-[#2A2D3E] bg-[#1A1D27]";
  const actionColor = ACTION_COLORS[findings.recommended_action] ?? "text-[#8B90A8]";

  return (
    <div className="p-4 space-y-4">
      {/* Risk tier + action row */}
      <div className="flex items-start justify-between gap-4">
        <div className={cn("border px-3 py-1.5 text-sm font-bold", tierStyle)}>{findings.risk_tier}</div>
        <div className="text-right">
          <p className="text-[10px] text-[#4A4F6A]">Recommended Action</p>
          <p className={cn("text-xs font-semibold", actionColor)}>{findings.recommended_action.replace(/_/g, " ")}</p>
        </div>
      </div>

      {/* Estimated amount */}
      {findings.estimated_fraud_amount > 0 && (
        <div className="border border-[#C94B4B]/30 bg-[#C94B4B]/5 px-3 py-2">
          <p className="text-[10px] text-[#4A4F6A]">Estimated Fraud Amount</p>
          <p className="text-lg font-bold text-[#C94B4B]">{formatCurrency(findings.estimated_fraud_amount)}</p>
        </div>
      )}

      {/* Executive summary */}
      <div className="border border-[#2A2D3E] bg-[#1A1D27] p-3">
        <p className="text-label mb-1.5">Executive Summary</p>
        <p className="text-[12px] leading-relaxed text-[#C4C8DC]">{findings.executive_summary}</p>
      </div>

      {/* Key findings */}
      {findings.key_findings && findings.key_findings.length > 0 && (
        <div className="border border-[#2A2D3E] bg-[#1A1D27] p-3">
          <p className="text-label mb-2">Key Findings</p>
          <div className="space-y-2">
            {findings.key_findings.map((kf, i) => {
              const sev = (kf.severity ?? "").toUpperCase();
              const dotColor = SEVERITY_DOT[sev] ?? "bg-[#4A4F6A]";
              return (
                <div key={i} className="flex items-start gap-2">
                  <div className={cn("mt-1.5 h-1.5 w-1.5 shrink-0", dotColor)} />
                  <div>
                    <p className="text-[11px] leading-snug text-[#C4C8DC]">{kf.finding}</p>
                    {kf.data_source && <p className="mt-0.5 font-mono text-[9px] text-[#4A4F6A]">{kf.data_source}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Evidence citations */}
      {findings.evidence_citations && findings.evidence_citations.length > 0 && (
        <div className="border border-[#2A2D3E] bg-[#1A1D27] p-3">
          <p className="text-label mb-2">Evidence Citations</p>
          <div className="space-y-1">
            {findings.evidence_citations.map((cite, i) => (
              <div key={i} className="flex items-start gap-1.5">
                <span className="shrink-0 font-mono text-[9px] text-[#4A4F6A]">[{i + 1}]</span>
                <span className="text-[11px] text-[#8B90A8]">{cite}</span>
              </div>
            ))}
          </div>
        </div>
      )}
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
        <div className="flex items-center gap-3">
          <span className={cn("flex h-14 w-14 items-center justify-center text-xl font-bold tabular-nums", getRiskColor(member.risk_score), "bg-slate-800")}>
            {member.risk_score}
          </span>
          <div>
            <p className="text-sm font-semibold text-[#E8EAF0]">{member.business_name}</p>
            <p className="text-xs text-[#8B90A8]">
              {member.program} &middot; EIN {member.ein}
            </p>
          </div>
        </div>

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

/* ── Score Breakdown Panel ────────────────────────────────────────────────── */

const SCORE_ROWS: { key: "rules" | "ml" | "graph"; label: string; weight: string }[] = [
  { key: "rules", label: "Rules", weight: "40%" },
  { key: "ml", label: "ML", weight: "35%" },
  { key: "graph", label: "Graph", weight: "25%" },
];

function ScoreBreakdown({ breakdown, memberCount }: { breakdown: RiskBreakdown; memberCount: number }) {
  const composite = Math.round(
    breakdown.rules * 0.4 + breakdown.ml * 0.35 + breakdown.graph * 0.25
  );
  const severity =
    composite >= 90 ? "CRITICAL" : composite >= 75 ? "HIGH" : composite >= 50 ? "MEDIUM" : "LOW";
  const severityColor =
    composite >= 90
      ? "text-[#C94B4B]"
      : composite >= 75
      ? "text-[#D4733A]"
      : composite >= 50
      ? "text-[#D4B83A]"
      : "text-[#2A9B6B]";

  return (
    <div className="border-t border-[#2A2D3E]">
      <div className="bg-[#0F1117] p-4">
        <div className="border border-[#2A2D3E] bg-[#1A1D27] p-4">
          {/* Header */}
          <div className="mb-4 flex items-center gap-3">
            <span className="text-label">Risk Score</span>
            <span className={cn("text-lg font-bold tabular-nums", severityColor)}>{composite}</span>
            <span className={cn("text-[10px] font-semibold tracking-wider", severityColor)}>{severity}</span>
          </div>

          {/* Divider */}
          <div className="mb-3 h-px bg-[#2A2D3E]" />

          {/* Rows */}
          <div className="space-y-2.5">
            {SCORE_ROWS.map((row) => {
              const score = breakdown[row.key];
              return (
                <div key={row.key} className="flex items-center gap-3">
                  {/* Label + weight */}
                  <span className="w-12 shrink-0 text-[11px] font-semibold text-[#E8EAF0]">{row.label}</span>
                  <span className="w-8 shrink-0 text-[10px] tabular-nums text-[#4A4F6A]">{row.weight}</span>

                  {/* Progress bar */}
                  <div className="h-2 w-28 shrink-0 bg-slate-800">
                    <div
                      className="h-full bg-[#14B8A6]"
                      style={{ width: `${score}%` }}
                    />
                  </div>

                  {/* Sub-score */}
                  <span className="w-8 shrink-0 text-[11px] font-bold tabular-nums text-[#E8EAF0]">{score}</span>

                  {/* Context: chips for rules, label for ML, hub for graph */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.key === "rules" &&
                      breakdown.firedRules.map((rule) => (
                        <span
                          key={rule}
                          className="border border-[#C94B4B]/30 bg-[#C94B4B]/5 px-1.5 py-0.5 text-[9px] font-semibold text-[#C94B4B]"
                        >
                          {rule}
                        </span>
                      ))}
                    {row.key === "ml" && (
                      <span className="text-[10px] text-[#8B90A8]">{breakdown.mlLabel}</span>
                    )}
                    {row.key === "graph" && (
                      <span className="text-[10px] text-[#8B90A8]">
                        Degree-{memberCount - 1} hub
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
