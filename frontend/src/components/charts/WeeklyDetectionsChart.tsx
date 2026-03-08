/* FraudGraph — Weekly ring detections line chart.
   Accepts data from analytics API; falls back to empty state. */
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

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

interface WeeklyDetectionsChartProps {
  data?: { week: string; count: number }[];
}

export default function WeeklyDetectionsChart({ data }: WeeklyDetectionsChartProps) {
  const chartData = data?.map((d) => ({
    week: new Date(d.week).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    rings: d.count,
  })) ?? [];

  if (chartData.length === 0) {
    return <div className="w-full h-[280px] flex items-center justify-center text-data text-text-muted">Loading...</div>;
  }

  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData} margin={{ left: 4, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#37474F" />
          <XAxis
            dataKey="week"
            stroke="#546E7A"
            tick={{ fontSize: 10, fill: "#90A4AE" }}
            interval={Math.max(0, Math.floor(chartData.length / 4) - 1)}
          />
          <YAxis
            stroke="#546E7A"
            tick={{ fontSize: 11, fill: "#90A4AE" }}
          />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="rings"
            stroke="#2196F3"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#2196F3", stroke: "#ECEFF1", strokeWidth: 1 }}
            name="Rings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
