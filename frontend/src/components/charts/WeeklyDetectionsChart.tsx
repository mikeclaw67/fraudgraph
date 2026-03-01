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
    backgroundColor: "#1A1D27",
    border: "1px solid #2A2D3E",
    borderRadius: 0,
    color: "#E8EAF0",
    fontSize: 12,
  },
  labelStyle: { color: "#8B90A8" },
};

export default function WeeklyDetectionsChart() {
  return (
    <div className="w-full h-[280px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={WEEKLY_DETECTIONS} margin={{ left: 4, right: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2D3E" />
          <XAxis
            dataKey="week"
            stroke="#4A4F6A"
            tick={{ fontSize: 10, fill: "#8B90A8" }}
            interval={3}
          />
          <YAxis
            stroke="#4A4F6A"
            tick={{ fontSize: 11, fill: "#8B90A8" }}
          />
          <Tooltip {...tooltipStyle} />
          <Line
            type="monotone"
            dataKey="rings"
            stroke="#2A6EBB"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#2A6EBB", stroke: "#E8EAF0", strokeWidth: 1 }}
            name="Rings"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
