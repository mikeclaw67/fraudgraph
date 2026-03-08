/* FraudGraph — Exposure by ring type horizontal bar chart.
   Accepts data from analytics API; falls back to empty state. */
"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const TYPE_LABELS: Record<string, string> = {
  ADDRESS_FARM: "Address Farm",
  ACCOUNT_CLUSTER: "Account Cluster",
  EIN_RECYCLER: "EIN Recycler",
  STRAW_COMPANY: "Straw Company",
  THRESHOLD_GAMING: "Threshold Gaming",
};

const TYPE_COLORS: Record<string, string> = {
  ADDRESS_FARM: "#E53935",
  ACCOUNT_CLUSTER: "#FFB300",
  EIN_RECYCLER: "#FFB300",
  STRAW_COMPANY: "#43A047",
  THRESHOLD_GAMING: "#2196F3",
};

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

interface ExposureChartProps {
  data?: Record<string, number>;
}

export default function ExposureChart({ data }: ExposureChartProps) {
  const chartData = data
    ? Object.entries(data)
        .map(([type, exposure]) => ({
          type,
          label: TYPE_LABELS[type] || type,
          exposure,
          color: TYPE_COLORS[type] || "#2196F3",
        }))
        .sort((a, b) => b.exposure - a.exposure)
    : [];

  if (chartData.length === 0) {
    return <div className="w-full h-[280px] flex items-center justify-center text-data text-text-muted">Loading...</div>;
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={chartData} layout="vertical" margin={{ left: 4, right: 24 }}>
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
            {chartData.map((entry) => (
              <Cell key={entry.type} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
