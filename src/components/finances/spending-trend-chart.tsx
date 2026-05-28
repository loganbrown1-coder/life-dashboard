"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { format, parseISO } from "date-fns";

type MonthData = {
  month: string;      // "2025-01"
  income: number;
  expenses: number;
  net: number;
};

function fmtMonth(m: string) {
  try { return format(parseISO(m + "-01"), "MMM"); } catch { return m; }
}

export function SpendingTrendChart({ data }: { data: MonthData[] }) {
  if (!data.length) return null;

  const chartData = data.map((d) => ({
    month: fmtMonth(d.month),
    Income: +d.income.toFixed(0),
    Spent: +d.expenses.toFixed(0),
    Net: +d.net.toFixed(0),
  }));

  const hasAnyData = data.some((d) => d.income > 0 || d.expenses > 0);
  if (!hasAnyData) {
    return (
      <p className="text-sm text-gray-400 py-6 text-center">No transactions yet to show trend.</p>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: -10, bottom: 0 }} barGap={2}>
        <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `£${(v / 1000).toFixed(0)}k`} />
        <Tooltip
          formatter={(value) => [`£${Number(value ?? 0).toLocaleString()}`]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <ReferenceLine y={0} stroke="#e5e7eb" />
        <Bar dataKey="Income"  fill="#10b981" radius={[3,3,0,0]} maxBarSize={28} />
        <Bar dataKey="Spent"   fill="#f87171" radius={[3,3,0,0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
