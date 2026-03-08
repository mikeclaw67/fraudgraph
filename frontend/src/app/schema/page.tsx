/* FraudGraph — Schema Switcher: live domain switching across PPP, Medicaid, Procurement.
   S3: Added read-only Triage Configuration panel.
   Update when adding new fraud domains or changing schema display logic. */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SCHEMAS, type DomainSchema } from "@/lib/schemas";
import { TRIAGE_THRESHOLDS, TRIAGE_ASSIGNEES } from "@/lib/ring-data";

export default function SchemaPage() {
  const [active, setActive] = useState<DomainSchema>(SCHEMAS[0]);

  return (
    <div className="min-h-screen bg-bg-shell p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-text-primary tracking-tight">
          Schema Switcher
        </h1>
        <p className="mt-1 text-data text-text-secondary">
          One engine. Three fraud domains. Same detection — different config.
        </p>
      </div>

      {/* Domain Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {SCHEMAS.map((schema) => (
          <DomainCard
            key={schema.id}
            schema={schema}
            isActive={active.id === schema.id}
            onClick={() => setActive(schema)}
          />
        ))}
      </div>

      {/* Active Domain Detail */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Entity Types */}
        <Panel title="Entity Types">
          <div className="space-y-2">
            {active.entityTypes.map((et) => (
              <div
                key={et.name}
                className="flex items-center justify-between border-b border-border/50 py-2 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm">{et.icon}</span>
                  <span className="text-data text-text-primary">{et.name}</span>
                </div>
                <span className="text-data tabular-nums text-text-secondary">
                  {et.count.toLocaleString()} records
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-label mb-2">Relationship Types</div>
            <div className="flex flex-wrap gap-2">
              {active.relationshipTypes.map((rt) => (
                <span
                  key={rt}
                  className="bg-bg-shell px-2 py-0.5 text-[11px] uppercase tracking-wider text-text-muted"
                >
                  {rt}
                </span>
              ))}
            </div>
          </div>
        </Panel>

        {/* Ring Examples */}
        <Panel title="Detected Rings">
          <table className="w-full">
            <thead>
              <tr className="text-label">
                <th className="pb-2 text-left font-medium">ID</th>
                <th className="pb-2 text-left font-medium">Name</th>
                <th className="pb-2 text-right font-medium">Exposure</th>
                <th className="pb-2 text-right font-medium">Members</th>
              </tr>
            </thead>
            <tbody>
              {active.ringExamples.map((ring) => (
                <tr key={ring.id} className="border-t border-border/50">
                  <td className="py-2 text-data tabular-nums text-text-muted">{ring.id}</td>
                  <td className="py-2 text-data text-text-primary">{ring.name}</td>
                  <td className="py-2 text-right text-data tabular-nums text-accent">
                    {ring.exposure}
                  </td>
                  <td className="py-2 text-right text-data tabular-nums text-text-secondary">
                    {ring.members}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        {/* Smoking Gun */}
        <div className="lg:col-span-2">
          <div
            className="border-l-[3px] bg-bg-panel p-4"
            style={{ borderColor: active.color }}
          >
            <div className="mb-2 text-label" style={{ color: active.color }}>
              Smoking Gun — {active.name}
            </div>
            <p className="text-data leading-relaxed text-text-primary">
              {active.smokingGun}
            </p>
          </div>
        </div>

        {/* S3: Triage Configuration Panel */}
        <div className="lg:col-span-2">
          <Panel title="Triage Configuration">
            <p className="text-[11px] text-text-muted mb-4">
              Configured thresholds for this deployment. Read-only — contact admin to modify.
            </p>
            <table className="w-full">
              <thead>
                <tr className="text-label">
                  <th className="pb-2 text-left font-medium">TIER</th>
                  <th className="pb-2 text-left font-medium">CRITERIA</th>
                  <th className="pb-2 text-left font-medium">AUTO-ASSIGN</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-border/50">
                  <td className="py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-[#B71C1C] text-white">
                      CRITICAL
                    </span>
                  </td>
                  <td className="py-2.5 text-data text-text-primary">
                    Risk ≥ {TRIAGE_THRESHOLDS.CRITICAL.risk_min} <span className="text-text-muted">AND</span> Exposure ≥ ${(TRIAGE_THRESHOLDS.CRITICAL.exposure_min / 1_000_000).toFixed(1)}M
                  </td>
                  <td className="py-2.5 text-data text-text-secondary">
                    {TRIAGE_ASSIGNEES.CRITICAL}
                  </td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-[#E65100] text-[#FFE0B2]">
                      HIGH
                    </span>
                  </td>
                  <td className="py-2.5 text-data text-text-primary">
                    Risk ≥ {TRIAGE_THRESHOLDS.HIGH.risk_min} <span className="text-text-muted">OR</span> Exposure ≥ ${(TRIAGE_THRESHOLDS.HIGH.exposure_min / 1_000).toFixed(0)}K
                  </td>
                  <td className="py-2.5 text-data text-text-secondary">
                    {TRIAGE_ASSIGNEES.HIGH}
                  </td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-[#F57F17] text-[#FFF9C4]">
                      MEDIUM
                    </span>
                  </td>
                  <td className="py-2.5 text-data text-text-primary">
                    Risk ≥ {TRIAGE_THRESHOLDS.MEDIUM.risk_min}
                  </td>
                  <td className="py-2.5 text-data text-text-secondary">
                    {TRIAGE_ASSIGNEES.MEDIUM}
                  </td>
                </tr>
                <tr className="border-t border-border/50">
                  <td className="py-2.5">
                    <span className="inline-flex px-2 py-0.5 text-[10px] font-semibold tracking-wider bg-[#37474F] text-[#90A4AE]">
                      LOW
                    </span>
                  </td>
                  <td className="py-2.5 text-data text-text-primary">
                    All others
                  </td>
                  <td className="py-2.5 text-data text-text-muted">
                    Unassigned
                  </td>
                </tr>
              </tbody>
            </table>
          </Panel>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                    */
/* ------------------------------------------------------------------ */

function DomainCard({
  schema,
  isActive,
  onClick,
}: {
  schema: DomainSchema;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full border bg-bg-panel p-4 text-left transition-colors",
        isActive
          ? "border-accent bg-accent/5"
          : "border-border hover:border-border-2"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="h-2 w-2" style={{ backgroundColor: schema.color }} />
        <span className="text-sm font-semibold text-text-primary">{schema.name}</span>
      </div>
      <p className="mt-1 text-data text-text-secondary">{schema.subtitle}</p>
      <div className="mt-3 flex gap-4">
        <Stat label="Entities" value={schema.entityTypes.length.toString()} />
        <Stat label="Relations" value={schema.relationshipTypes.length.toString()} />
        <Stat label="Rings" value={schema.ringExamples.length.toString()} />
      </div>
    </button>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="text-sm font-semibold tabular-nums text-text-primary">{value}</div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-bg-panel border border-border p-4">
      <h3 className="mb-4 text-label font-semibold tracking-wider text-text-secondary">
        {title}
      </h3>
      {children}
    </div>
  );
}
