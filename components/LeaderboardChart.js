"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

const RANK_COLORS = ["#FFC857", "#C9D1D9", "#E0956B"];
const CYCLE_COLORS = ["#FF5D8F", "#4EE1A0", "#5EC2FF"];

function colorForRank(rank) {
  if (rank <= 3) return RANK_COLORS[rank - 1];
  return CYCLE_COLORS[rank % CYCLE_COLORS.length];
}

export default function LeaderboardChart({ standings }) {
  const data = standings.map((s) => ({
    name: s.username,
    total: s.total,
    rank: s.rank,
  }));

  const height = Math.max(140, data.length * 42);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="name"
            width={84}
            tick={{ fill: "#a6a3d1", fontSize: 12, fontFamily: "var(--font-body)" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(255,255,255,0.04)" }}
            contentStyle={{
              background: "#2c2b52",
              border: "1px solid #3a3865",
              borderRadius: 10,
              color: "#f3f1ff",
            }}
            labelStyle={{ color: "#f3f1ff", fontWeight: 700 }}
          />
          <Bar dataKey="total" radius={[0, 8, 8, 0]} maxBarSize={22} isAnimationActive>
            {data.map((entry) => (
              <Cell key={entry.name} fill={colorForRank(entry.rank)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
