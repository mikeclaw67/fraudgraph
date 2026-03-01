"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const EXPOSURE_BY_TYPE: { type: string; label: string; exposure: number; color: string }[] = [
  { type: "ADDRESS_FARM",     label: "Address Farm",     exposure: 312_000_000, color: "#C94B4B" },
  { type: "ACCOUNT_CLUSTER",  label: "Account Cluster",  exposure: 224_000_000, color: "#D4733A" },
  { type: "EIN_RECYCLER",     label: "EIN Recycler",     exposure: 178_000_000, color: "#C9A227" },
  { type: "STRAW_COMPANY",    label: "Straw Company",    exposure: 112_000_000, color: "#3E8E57" },
  { type: "THRESHOLD_GAMING", label: "Threshold Gaming", exposure: 66_400_000,  color: "#2A6EBB" },
];

const tooltipStyle = {
  contentStyle: {
    backgroundColor: "#1A1D27",
    border: "1px solid #2A2D3E",
    borderRadius: 0,
    color: "#E8EAF0",
    fontSize: 12,
  },
  labelStyle: { color: "#8B90A8" },
};

export default function ExposureChart() {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={EXPOSURE_BY_TYPE} layout="vertical" margin={{ left: 4, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" horizontal={false} />
          <XAxis
            type="number"
            stroke="#4A4F6A"
            tick={{ fontSize: 11, fill: "#8B90A8" }}
            tickFormatter={(v: number) => `$${(v / 1_000_000).toFixed(0)}M`}
          />
          <YAxis
            dataKey="label"
            type="category"
            stroke="#4A4F6A"
            tick={{ fontSize: 11, fill: "#8B90A8" }}
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
