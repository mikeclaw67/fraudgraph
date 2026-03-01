/* FraudGraph — Exposure by ring type horizontal bar chart.
   Update when adding new ring types or changing the color palette. */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const EXPOSURE_BY_TYPE: { type: string; label: string; exposure: number; color: string }[] = [
  { type: "ADDRESS_FARM",     label: "Address Farm",     exposure: 312_000_000, color: "#E53935" },
  { type: "ACCOUNT_CLUSTER",  label: "Account Cluster",  exposure: 224_000_000, color: "#FFB300" },
  { type: "EIN_RECYCLER",     label: "EIN Recycler",     exposure: 178_000_000, color: "#FFB300" },
  { type: "STRAW_COMPANY",    label: "Straw Company",    exposure: 112_000_000, color: "#43A047" },
  { type: "THRESHOLD_GAMING", label: "Threshold Gaming", exposure: 66_400_000,  color: "#2196F3" },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#2C3539",
    border: "1px solid #37474F",
    borderRadius: 0,
    color: "#ECEFF1",
    fontSize: 12,
  },
  labelStyle: { color: "#90A4AE" },
};

export default function ExposureChart() {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={EXPOSURE_BY_TYPE} layout="vertical" margin={{ left: 4, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#37474F" horizontal={false} />
          <XAxis
            type="number"
            stroke="#546E7A"
            tick={{ fontSize: 11, fill: "#90A4AE" }}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`}
          />
          <YAxis
            dataKey="label"
            type="category"
            stroke="#546E7A"
            tick={{ fontSize: 11, fill: "#90A4AE" }}
            width={110}
          />
          <Tooltip
            {...tooltipStyle}
            formatter={(value: number | undefined) => [formatCurrency(value ?? 0), "Exposure"]}
          />
          <Bar dataKey="exposure" barSize={20}>
            {EXPOSURE_BY_TYPE.map((entry) => (
              <Cell key={entry.type} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
