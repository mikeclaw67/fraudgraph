/* FraudGraph — Weekly ring detections line chart (26-week rolling window).
   Update when changing the time window or color palette. */
"use client";

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

function buildWeeklyDetections() {
  const weeks: { week: string; rings: number }[] = [];
  const base = new Date(2025, 8, 1);
  for (let i = 0; i < 26; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i * 7);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const rings = Math.round(9 + 6 * Math.sin(i * 0.5) + 2 * Math.cos(i * 1.1));
    weeks.push({ week: label, rings });
  }
  return weeks;
}

const WEEKLY_DETECTIONS = buildWeeklyDetections();

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

export default function WeeklyDetectionsChart() {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={WEEKLY_DETECTIONS} margin={{ left: 4, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#37474F" />
          <XAxis
            dataKey="week"
            stroke="#546E7A"
            tick={{ fontSize: 10, fill: "#90A4AE" }}
            interval={3}
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
