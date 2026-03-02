/**
 * FraudGraph — Referral package ZIP export.
 * Bundles graph PNG, findings JSON, and standalone evidence HTML into a ZIP.
 */

import JSZip from "jszip";
import type { FraudRing, RingType } from "@/lib/types";

/* ── Investigation findings shape (mirrors ring-detail.tsx) ────────────── */

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

/* ── Ring type display labels ──────────────────────────────────────────── */

const RING_TYPE_LABELS: Record<RingType, string> = {
  ADDRESS_FARM: "Address Farm",
  ACCOUNT_CLUSTER: "Account Cluster",
  EIN_RECYCLER: "EIN Recycler",
  STRAW_COMPANY: "Straw Company",
  THRESHOLD_GAMING: "Threshold Gaming",
};

/* ── Helpers ───────────────────────────────────────────────────────────── */

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/* ── findings.json builder ─────────────────────────────────────────────── */

function buildFindingsJSON(ring: FraudRing, findings: InvFindings | null): string {
  return JSON.stringify(
    {
      ring_id: ring.ring_id,
      ring_name: `${RING_TYPE_LABELS[ring.ring_type]} — ${ring.common_element_detail}`,
      risk_tier: findings?.risk_tier ?? "UNASSESSED",
      estimated_fraud_amount: findings?.estimated_fraud_amount ?? ring.total_exposure,
      key_findings: findings?.key_findings?.map((f) => f.finding) ?? [],
      recommended_action: findings?.recommended_action ?? "Pending investigation",
      evidence_citations: findings?.evidence_citations ?? [],
      exported_at: new Date().toISOString(),
    },
    null,
    2,
  );
}

/* ── evidence_report.html builder ──────────────────────────────────────── */

function buildEvidenceHTML(ring: FraudRing, findings: InvFindings | null, pngDataUrl: string): string {
  const riskTier = findings?.risk_tier ?? "UNASSESSED";
  const execSummary = findings?.executive_summary ?? "Investigation not yet run.";
  const keyFindings = findings?.key_findings ?? [];
  const recommendedAction = findings?.recommended_action ?? "Pending investigation";
  const citations = findings?.evidence_citations ?? [];
  const fraudAmount = findings?.estimated_fraud_amount ?? ring.total_exposure;

  const findingsHTML = keyFindings.length > 0
    ? keyFindings.map((f) =>
        `<li>
          <strong>${escapeHtml(f.finding)}</strong>
          ${f.severity ? `<span class="badge badge-${f.severity.toLowerCase()}">${escapeHtml(f.severity)}</span>` : ""}
          ${f.data_source ? `<br><small>Source: ${escapeHtml(f.data_source)}</small>` : ""}
        </li>`
      ).join("\n")
    : "<li>No findings recorded.</li>";

  const citationsHTML = citations.length > 0
    ? citations.map((c) => `<li>${escapeHtml(c)}</li>`).join("\n")
    : "<li>No citations recorded.</li>";

  const memberRows = ring.members.map((m) =>
    `<tr>
      <td>${escapeHtml(m.business_name)}</td>
      <td>${escapeHtml(m.borrower_name)}</td>
      <td>${escapeHtml(m.ein)}</td>
      <td>${formatUSD(m.loan_amount)}</td>
      <td>${m.risk_score}</td>
      <td>${m.red_flags.map((f) => escapeHtml(f)).join(", ")}</td>
    </tr>`
  ).join("\n");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>FraudGraph Evidence Report — ${escapeHtml(ring.ring_id)}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; background: #f8f9fa; color: #1a1a1a; padding: 40px; line-height: 1.5; }
  .header { background: #263238; color: #eceff1; padding: 24px 32px; margin: -40px -40px 32px; }
  .header h1 { font-family: 'Barlow Condensed', system-ui, sans-serif; font-size: 24px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
  .header .meta { font-size: 13px; color: #90a4ae; margin-top: 8px; }
  .section { margin-bottom: 28px; }
  .section h2 { font-size: 15px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; color: #263238; border-bottom: 2px solid #263238; padding-bottom: 4px; margin-bottom: 12px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px; }
  .kpi { background: #fff; border: 1px solid #ddd; padding: 12px 16px; }
  .kpi .label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #607d8b; }
  .kpi .value { font-size: 20px; font-weight: 700; color: #263238; }
  ul { padding-left: 20px; }
  li { margin-bottom: 6px; font-size: 14px; }
  .badge { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; color: #fff; margin-left: 6px; }
  .badge-critical { background: #e53935; }
  .badge-high { background: #ef6c00; }
  .badge-medium { background: #f9a825; color: #1a1a1a; }
  .badge-low { background: #4caf50; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { background: #263238; color: #eceff1; text-align: left; padding: 8px 12px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
  td { padding: 8px 12px; border-bottom: 1px solid #e0e0e0; }
  tr:nth-child(even) { background: #f5f5f5; }
  .graph-img { max-width: 100%; border: 1px solid #ddd; margin-top: 8px; }
  .footer { margin-top: 40px; font-size: 11px; color: #90a4ae; border-top: 1px solid #ddd; padding-top: 12px; }
</style>
</head>
<body>
  <div class="header">
    <h1>FraudGraph Evidence Report</h1>
    <div class="meta">Ring ${escapeHtml(ring.ring_id)} &middot; ${escapeHtml(RING_TYPE_LABELS[ring.ring_type])} &middot; Exported ${todayISO()}</div>
  </div>

  <div class="kpi-grid">
    <div class="kpi"><div class="label">Ring Type</div><div class="value">${escapeHtml(RING_TYPE_LABELS[ring.ring_type])}</div></div>
    <div class="kpi"><div class="label">Risk Tier</div><div class="value">${escapeHtml(riskTier)}</div></div>
    <div class="kpi"><div class="label">Estimated Fraud</div><div class="value">${formatUSD(fraudAmount)}</div></div>
    <div class="kpi"><div class="label">Members</div><div class="value">${ring.member_count}</div></div>
  </div>

  <div class="section">
    <h2>Executive Summary</h2>
    <p>${escapeHtml(execSummary)}</p>
  </div>

  <div class="section">
    <h2>Key Findings</h2>
    <ul>${findingsHTML}</ul>
  </div>

  <div class="section">
    <h2>Recommended Action</h2>
    <p>${escapeHtml(recommendedAction)}</p>
  </div>

  <div class="section">
    <h2>Ring Members</h2>
    <table>
      <thead><tr><th>Business</th><th>Borrower</th><th>EIN</th><th>Loan Amount</th><th>Risk</th><th>Red Flags</th></tr></thead>
      <tbody>${memberRows}</tbody>
    </table>
  </div>

  <div class="section">
    <h2>Evidence Graph</h2>
    <img class="graph-img" src="${pngDataUrl}" alt="Fraud ring evidence graph">
  </div>

  <div class="section">
    <h2>Evidence Citations</h2>
    <ul>${citationsHTML}</ul>
  </div>

  <div class="footer">
    Generated by FraudGraph &middot; ${new Date().toISOString()} &middot; CONFIDENTIAL — LAW ENFORCEMENT SENSITIVE
  </div>
</body>
</html>`;
}

/* ── Main export function ──────────────────────────────────────────────── */

export async function exportReferralPackage(
  ring: FraudRing,
  findings: InvFindings | null,
  pngDataUrl: string,
): Promise<void> {
  const zip = new JSZip();

  // graph.png — strip data URL prefix to get raw base64
  const base64 = pngDataUrl.replace(/^data:image\/png;base64,/, "");
  zip.file("graph.png", base64, { base64: true });

  // findings.json
  zip.file("findings.json", buildFindingsJSON(ring, findings));

  // evidence_report.html
  zip.file("evidence_report.html", buildEvidenceHTML(ring, findings, pngDataUrl));

  // Generate and trigger download
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `fraudgraph-${ring.ring_id}-referral-${todayISO()}.zip`;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
