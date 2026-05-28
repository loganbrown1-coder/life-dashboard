"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

type Entry = { date: string; stepCount: number };

export function StepsChart({ data }: { data: Entry[] }) {
  const goal = 10000;

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={(v) => {
            const d = new Date(v);
            return `${d.getDate()}/${d.getMonth() + 1}`;
          }}
          interval={Math.floor(data.length / 6)}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9ca3af" }}
          tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
          width={36}
        />
        <Tooltip
          formatter={(v) => [Number(v).toLocaleString(), "Steps"]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <ReferenceLine y={goal} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "10k", fill: "#f59e0b", fontSize: 11 }} />
        <Bar
          dataKey="stepCount"
          fill="#0d9488"
          radius={[3, 3, 0, 0]}
          maxBarSize={20}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
