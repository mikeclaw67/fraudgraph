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
          <div className="h-8 w-64 rounded bg-slate-800" />
          <div className="h-4 w-96 rounded bg-slate-800" />
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-lg bg-slate-800" />)}
          </div>
        </div>
      </div>
    );
  }

  if (!entity) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-slate-400">Entity not found</p>
      </div>
    );
  }

  const { attributes: attr, alerts, connections } = entity;
  const topScore = alerts.length > 0 ? Math.max(...alerts.map((a) => a.risk_score)) : 0;
  const allRules = [...new Set(alerts.flatMap((a) => a.fired_rules))];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div className="flex items-start gap-4">
          <RiskScoreBadge score={topScore} size="lg" />
          <div>
            <h1 className="text-2xl font-bold text-slate-100">{attr.borrower_name}</h1>
            <p className="text-sm text-slate-400">{attr.business_name} &middot; {attr.ein}</p>
            <p className="mt-1 text-xs text-slate-500">{entity.entity_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-300">
            {entity.alert_count} alert{entity.alert_count !== 1 ? "s" : ""}
          </span>
          <button className="rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-500">
            Escalate
          </button>
          <button className="rounded-md bg-sky-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-sky-500">
            Open Case
          </button>
          <button className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700">
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
                  <div key={alert.alert_id} className="flex items-start gap-3 border-l-2 border-slate-700 pl-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <SeverityBadge severity={alert.severity} />
                        <StatusBadge status={alert.status} />
                        <span className="text-xs text-slate-500">{formatDateTime(alert.created_at)}</span>
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
                  <div key={rule} className="flex items-center gap-2 rounded-md border border-red-500/20 bg-red-500/5 p-2">
                    <div className="h-2 w-2 rounded-full bg-red-400" />
                    <RuleBadge rule={rule} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500">No rules fired</p>
            )}
          </Card>

          <Card title="Risk Breakdown">
            <div className="space-y-3">
              <ScoreBar label="Rule Score" value={topScore * 0.4} max={40} />
              <ScoreBar label="ML Anomaly" value={topScore * 0.35} max={35} />
              <ScoreBar label="Graph Centrality" value={topScore * 0.25} max={25} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-slate-700 pt-3">
              <span className="text-sm font-medium text-slate-300">Composite Score</span>
              <span className={cn("text-lg font-bold", riskScoreColor(topScore))}>{Math.round(topScore)}</span>
            </div>
          </Card>

          <Card title="Quick Actions">
            <div className="space-y-2">
              <Link href={`/graph?entity=${entity.entity_id}`} className="block w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-center text-sm text-slate-300 hover:bg-slate-700">
                View in Graph
              </Link>
              <button className="w-full rounded-md border border-slate-600 bg-slate-800 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700">
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
    <div className={cn("rounded-lg border p-4", danger ? "border-red-500/30 bg-red-500/5" : "border-slate-700/50 bg-slate-900")}>
      <h3 className={cn("mb-3 text-sm font-semibold uppercase tracking-wider", danger ? "text-red-400" : "text-slate-400")}>{title}</h3>
      {children}
    </div>
  );
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={cn("text-sm font-medium", highlight ? "text-red-400" : "text-slate-200")}>{value}</p>
    </div>
  );
}

function ConnectionCard({ title, value, sub, danger }: { title: string; value: string; sub?: string; danger?: boolean }) {
  return (
    <div className={cn("rounded-lg border p-3", danger ? "border-red-500/30 bg-red-500/5" : "border-slate-700/50 bg-slate-900")}>
      <p className={cn("text-xs font-semibold uppercase tracking-wider", danger ? "text-red-400" : "text-slate-500")}>{title}</p>
      <p className="mt-1 text-sm font-medium text-slate-200 break-words">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-slate-500">{sub}</p>}
      {danger && <p className="mt-1 text-[10px] font-medium text-red-400">SHARED INDICATOR</p>}
    </div>
  );
}

function ScoreBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">{label}</span>
        <span className="text-slate-300">{Math.round(value)}/{max}</span>
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-slate-800">
        <div className="h-1.5 rounded-full bg-sky-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
