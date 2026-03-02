/* FraudGraph — Schema Switcher: live domain switching across PPP, Medicaid, Procurement.
   Update when adding new fraud domains or changing schema display logic. */
"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { SCHEMAS, type DomainSchema } from "@/lib/schemas";

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
