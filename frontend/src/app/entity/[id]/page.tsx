/* FraudGraph — Entity 360 Profile page with full borrower investigation view.
   Update when adding new entity data fields, risk components, or action buttons. */
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { SeverityBadge, RiskScoreBadge, StatusBadge, RuleBadge } from "@/components/badges";
import { formatCurrency, formatDate, formatDateTime, cn, riskScoreColor } from "@/lib/utils";
import { getEntity } from "@/lib/api";
import { generateMockEntity } from "@/lib/mock-data";
import type { Entity } from "@/lib/types";

export default function EntityPage() {
  const params = useParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await getEntity(params.id);
        setEntity(data.entity);
      } catch {
        setEntity(generateMockEntity(params.id));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [params.id]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-64 bg-[#2C3539]" />
          <div className="h-4 w-96 bg-[#2C3539]" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-[#2C3539]" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-[#90A4AE]">Entity not found</p>
      </div>
    );
  }

  const { attributes: rawAttr, alerts, connections } = entity;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const attr = rawAttr as Record<string, any>;
  const topScore = alerts.length > 0 ? Math.max(...alerts.map((a) => a.risk_score)) : 0;
  const allRules = [...new Set(alerts.flatMap((a) => a.fired_rules))];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <RiskScoreBadge score={topScore} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-[#ECEFF1]">{attr.borrower_name}</h1>
            <p className="text-sm text-[#90A4AE]">{attr.business_name} &middot; {attr.ein}</p>
            <p className="text-sm text-[#78909C]">{attr.business_address}, {attr.business_city} {attr.business_state} {attr.business_zip}</p>
            <p className="mt-1 text-xs text-[#546E7A]">{entity.entity_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-[#2C3539] px-3 py-1 text-xs text-[#90A4AE]">
            {entity.alert_count} alert{entity.alert_count !== 1 ? "s" : ""}
          </span>
          <button className="bg-[#E53935] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#E53935]/80">
            Escalate
          </button>
          <button className="bg-[#2196F3] px-3 py-1.5 text-xs font-medium text-white hover:bg-[#2196F3]/80">
            Open Case
          </button>
          <button className="border border-[#455A64] bg-[#2C3539] px-3 py-1.5 text-xs font-medium text-[#90A4AE] hover:bg-[#37474F]">
            Dismiss
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column — Details */}
        <div className="space-y-4 lg:col-span-2">
          {/* Loan Application Card */}
          <Card title="Loan Application">
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              <Field label="Program" value={attr.loan_program} />
              <Field label="Amount" value={formatCurrency(attr.loan_amount)} highlight={attr.loan_amount > 145000} />
              <Field label="Date" value={formatDate(attr.loan_date)} />
              <Field label="Lender" value={attr.lender_name} />
              <Field label="Industry" value={attr.industry} />
              <Field label="NAICS" value={attr.naics_code} />
              <Field label="Employees" value={String(attr.employee_count)} highlight={attr.employee_count === 0} />
              <Field label="Business Age" value={`${attr.business_age_months} months`} highlight={attr.business_age_months < 6} />
              <Field label="State" value={attr.business_state || "N/A"} highlight={["CA", "FL", "TX"].includes(attr.business_state)} />
            </div>
          </Card>

          {/* Connections Cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ConnectionCard title="Linked Business" value={attr.business_name} sub={`EIN: ${connections.business_ein}`} />
            <ConnectionCard title="Shared Address" value={connections.address} danger />
            <ConnectionCard title="Shared Bank Account" value={`Routing: ${connections.bank_routing}`} danger />
          </div>

          {/* Timeline */}
          <Card title="Alert Timeline">
            <div className="space-y-3">
              {alerts
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((alert) => (
                  <div key={alert.alert_id} className="flex items-start gap-3 border-l-2 border-[#37474F] pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                        <span className="text-xs text-[#546E7A]">{formatDateTime(alert.created_at)}</span>
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1">
                        {alert.fired_rules.map((r) => <RuleBadge key={r} rule={r} />)}
                      </div>
                    </div>
                    <RiskScoreBadge score={alert.risk_score} />
                  </div>
                ))}
            </div>
          </Card>
        </div>

        {/* Right Column — Red Flags */}
        <div className="space-y-4">
          <Card title="Red Flags" danger>
            {allRules.length > 0 ? (
              <div className="space-y-3">
                {allRules.map((rule) => (
                  <div key={rule} className="flex items-center gap-2 border border-[#E53935]/20 bg-[#E53935]/5 p-2">
                    <div className="h-2 w-2 rounded-full bg-[#E53935]" />
                    <RuleBadge rule={rule} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#546E7A]">No rules fired</p>
            )}
          </Card>

          <Card title="Risk Breakdown">
            <div className="space-y-3">
              <ScoreBar label="Rule Score" value={topScore * 0.4} max={40} />
              <ScoreBar label="ML Anomaly" value={topScore * 0.35} max={35} />
              <ScoreBar label="Graph Centrality" value={topScore * 0.25} max={25} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-[#37474F] pt-3">
              <span className="text-sm font-medium text-[#90A4AE]">Composite Score</span>
              <span className={cn("text-lg font-bold", riskScoreColor(topScore))}>{Math.round(topScore)}</span>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link href={`/graph?entity=${entity.entity_id}`} className="block w-full border border-[#455A64] bg-[#2C3539] px-3 py-2 text-center text-sm text-[#90A4AE] hover:bg-[#37474F]">
                View in Graph
              </Link>
              <button className="w-full border border-[#455A64] bg-[#2C3539] px-3 py-2 text-sm text-[#90A4AE] hover:bg-[#37474F]">
                Export Report
              </button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Card({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
  return (
    <div className={cn("border p-4", danger ? "border-[#E53935]/30 bg-[#E53935]/5" : "border-[#37474F] bg-[#2C3539]")}>
      <h3 className={cn("mb-3 text-sm font-semibold uppercase tracking-wider", danger ? "text-[#E53935]" : "text-[#90A4AE]")}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[#546E7A]">{label}</p>
      <p className={cn("text-sm font-medium", highlight ? "text-[#E53935]" : "text-[#ECEFF1]")}>{value}</p>
    </div>
  );
}

function ConnectionCard({ title, value, sub, danger }: { title: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className={cn("border p-3", danger ? "border-[#E53935]/30 bg-[#E53935]/5" : "border-[#37474F] bg-[#2C3539]")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", danger ? "text-[#E53935]" : "text-[#546E7A]")}>{title}</p>
      <p className="mt-1 text-sm font-medium text-[#ECEFF1] break-words">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[#546E7A]">{sub}</p>}
      {danger && <p className="mt-1 text-[10px] font-medium text-[#E53935]">SHARED INDICATOR</p>}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#90A4AE]">{label}</span>
        <span className="text-[#90A4AE]">{Math.round(value)}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-[#2C3539]">
        <div className="h-1.5 bg-[#2196F3]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
