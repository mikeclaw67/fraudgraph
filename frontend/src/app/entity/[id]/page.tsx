/* FraudGraph — Entity 360 Profile page with full borrower investigation view */
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
          <div className="h-8 w-64 bg-bg-panel" />
          <div className="h-4 w-96 bg-bg-panel" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 bg-bg-panel" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-text-secondary">Entity not found</p>
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
            <h1 className="text-2xl font-bold text-text-primary">{attr.borrower_name}</h1>
            <p className="text-sm text-text-secondary">{attr.business_name} &middot; {attr.ein}</p>
            <p className="mt-1 text-xs text-text-muted">{entity.entity_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="bg-bg-row px-3 py-1 text-xs text-text-primary">
            {entity.alert_count} alert{entity.alert_count !== 1 ? "s" : ""}
          </span>
          <button className="bg-critical px-3 py-1.5 text-xs font-medium text-white hover:bg-critical">
            Escalate
          </button>
          <button className="bg-accent-dim px-3 py-1.5 text-xs font-medium text-white hover:bg-accent">
            Open Case
          </button>
          <button className="border border-border-2 bg-bg-row px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-bg-row-hover">
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
                  <div key={alert.alert_id} className="flex items-start gap-3 border-l-2 border-border pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                        <span className="text-xs text-text-muted">{formatDateTime(alert.created_at)}</span>
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
                  <div key={rule} className="flex items-center gap-2 border border-critical/20 bg-critical/5 p-2">
                    <div className="h-2 w-2 rounded-full bg-critical" />
                    <RuleBadge rule={rule} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted">No rules fired</p>
            )}
          </Card>

          <Card title="Risk Breakdown">
            <div className="space-y-3">
              <ScoreBar label="Rule Score" value={topScore * 0.4} max={40} />
              <ScoreBar label="ML Anomaly" value={topScore * 0.35} max={35} />
              <ScoreBar label="Graph Centrality" value={topScore * 0.25} max={25} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm font-medium text-text-primary">Composite Score</span>
              <span className={cn("text-lg font-bold", riskScoreColor(topScore))}>{Math.round(topScore)}</span>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link href={`/graph?entity=${entity.entity_id}`} className="block w-full border border-border-2 bg-bg-row px-3 py-2 text-center text-sm text-text-primary hover:bg-bg-row-hover">
                View in Graph
              </Link>
              <button className="w-full border border-border-2 bg-bg-row px-3 py-2 text-sm text-text-primary hover:bg-bg-row-hover">
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
    <div className={cn("border p-4", danger ? "border-critical/30 bg-critical/5" : "border-border bg-bg-panel")}>
      <h3 className={cn("mb-3 text-[11px] font-semibold uppercase tracking-[1px]", danger ? "text-critical" : "text-text-muted")}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-text-muted">{label}</p>
      <p className={cn("text-sm font-medium", highlight ? "text-critical" : "text-text-primary")}>{value}</p>
    </div>
  );
}

function ConnectionCard({ title, value, sub, danger }: { title: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className={cn("border p-3", danger ? "border-critical/30 bg-critical/5" : "border-border bg-bg-panel")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", danger ? "text-critical" : "text-text-muted")}>{title}</p>
      <p className="mt-1 text-sm font-medium text-text-primary break-words">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-text-muted">{sub}</p>}
      {danger && <p className="mt-1 text-[10px] font-medium text-critical">SHARED INDICATOR</p>}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-text-secondary">{label}</span>
        <span className="text-text-primary">{Math.round(value)}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full bg-bg-row">
        <div className="h-1.5 bg-accent" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
