/* FraudGraph — Analytics dashboard with charts, overview cards, and schema switcher */
"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from "recharts";
import { useAppStore, SCHEMA_LABELS } from "@/lib/store";
import { formatCurrency, cn } from "@/lib/utils";

export default function AnalyticsPage() {
  const { schema, setSchema } = useAppStore();
  const labels = SCHEMA_LABELS[schema];

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d");

  const overviewCards = useMemo(() => [
    { label: "Total Alerts", value: "2,847", change: "+12.3%", up: true, color: "text-sky-400" },
    { label: "Detection Rate", value: "94.2%", change: "+2.1%", up: true, color: "text-emerald-400" },
    { label: "Avg Risk Score", value: "62.4", change: "-3.8%", up: false, color: "text-amber-400" },
    { label: "Cases Resolved", value: "189", change: "+8.7%", up: true, color: "text-violet-400" },
  ], []);

  const alertsByType = useMemo(() => [
    { name: "Address\nReuse", count: 487, fill: "#f97316" },
    { name: "EIN\nRecycling", count: 312, fill: "#ef4444" },
    { name: "Straw\nCompany", count: 245, fill: "#eab308" },
    { name: "Threshold\nGaming", count: 198, fill: "#8b5cf6" },
    { name: "Shared\nAccount", count: 156, fill: "#06b6d4" },
    { name: "New\nEIN", count: 89, fill: "#10b981" },
  ], []);

  const riskDistribution = useMemo(() => [
    { range: "0-20", count: 892, fill: "#38bdf8" },
    { range: "20-40", count: 634, fill: "#38bdf8" },
    { range: "40-60", count: 478, fill: "#facc15" },
    { range: "60-80", count: 356, fill: "#f97316" },
    { range: "80-100", count: 487, fill: "#ef4444" },
  ], []);

  const detectionsOverTime = useMemo(() => {
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    return Array.from({ length: days }, (_, i) => ({
      date: new Date(Date.now() - (days - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      alerts: Math.floor(40 + Math.random() * 60 + Math.sin(i / 5) * 20),
      resolved: Math.floor(30 + Math.random() * 40 + Math.sin(i / 5) * 15),
    }));
  }, [timeRange]);

  const severityBreakdown = useMemo(() => [
    { name: "Critical", value: 487, color: "#ef4444" },
    { name: "High", value: 834, color: "#f97316" },
    { name: "Medium", value: 912, color: "#facc15" },
    { name: "Low", value: 614, color: "#38bdf8" },
  ], []);

  const tooltipStyle = {
    contentStyle: { backgroundColor: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0" },
    labelStyle: { color: "#94a3b8" },
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">Detection performance and fraud intelligence — {labels.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Time Range */}
          <div className="flex rounded-lg border border-slate-700 bg-slate-800">
            {(["7d", "30d", "90d"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeRange(t)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium",
                  timeRange === t ? "bg-sky-600 text-white" : "text-slate-400 hover:text-slate-200"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          {/* Schema Switcher */}
          <select
            value={schema}
            onChange={(e) => setSchema(e.target.value as typeof schema)}
            className="rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm text-slate-200 focus:border-sky-500 focus:outline-none"
          >
            {Object.entries(SCHEMA_LABELS).map(([key, { name }]) => (
              <option key={key} value={key}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {overviewCards.map((card) => (
          <div key={card.label} className="rounded-lg border border-slate-700/50 bg-slate-900 p-4">
            <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{card.label}</p>
            <div className="mt-2 flex items-end justify-between">
              <span className={cn("text-2xl font-bold", card.color)}>{card.value}</span>
              <span className={cn("text-xs font-medium", card.up ? "text-emerald-400" : "text-red-400")}>
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Detections Over Time */}
        <ChartCard title="Detections Over Time">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={detectionsOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 11 }} interval={timeRange === "7d" ? 0 : timeRange === "30d" ? 4 : 14} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Line type="monotone" dataKey="alerts" stroke="#38bdf8" strokeWidth={2} dot={false} name="Alerts" />
              <Line type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} dot={false} name="Resolved" />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Alerts by Type */}
        <ChartCard title={`${labels.entity} Alerts by Type`}>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={alertsByType} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <XAxis type="number" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" stroke="#64748b" tick={{ fontSize: 10 }} width={70} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {alertsByType.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Risk Distribution */}
        <ChartCard title="Risk Score Distribution">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={riskDistribution}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="range" stroke="#64748b" tick={{ fontSize: 11 }} />
              <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip {...tooltipStyle} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {riskDistribution.map((entry, i) => (
                  <Cell key={i} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Severity Breakdown */}
        <ChartCard title="Severity Breakdown">
          <ResponsiveContainer width="100%" height={280}>
            <PieChart>
              <Pie
                data={severityBreakdown}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={4}
                dataKey="value"
              >
                {severityBreakdown.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip {...tooltipStyle} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Schema Demo Banner */}
      <div className="mt-6 rounded-lg border border-sky-500/30 bg-sky-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20">
            <svg className="h-5 w-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-sky-400">Schema-Agnostic Detection</h3>
            <p className="text-xs text-slate-400">
              Switch between {Object.values(SCHEMA_LABELS).map(l => l.name).join(", ")} — same pipeline, different ontology.
              This is the Foundry pattern: config-driven schema swap.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-700/50 bg-slate-900 p-4">
      <h3 className="mb-4 text-sm font-semibold text-slate-300">{title}</h3>
      {children}
    </div>
  );
}
