"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";

type Props = {
  data: { category: string; total: number }[];
};

const COLORS = [
  "#0d9488", "#f59e0b", "#3b82f6", "#ef4444", "#8b5cf6",
  "#10b981", "#f97316", "#6366f1", "#ec4899", "#14b8a6",
];

export function SpendingDonut({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-gray-400">
        No spending data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          dataKey="total"
          nameKey="category"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={2}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, ""]} />
        <Legend
          formatter={(value) => <span className="text-xs text-gray-600">{value}</span>}
          iconSize={8}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
