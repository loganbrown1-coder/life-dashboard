"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subMonths, startOfMonth, endOfMonth } from "date-fns";

type RevenueRow = {
  date: string;
  amount: number;
  currency: string;
};

type RateMap = Record<string, number>;

function toGbp(amount: number, currency: string, rates: RateMap) {
  if (currency === "GBP") return amount;
  return amount * (rates[currency] ?? 1);
}

export function RevenueChart({ revenue, rates }: { revenue: RevenueRow[]; rates: RateMap }) {
  const now = new Date();
  const months = Array.from({ length: 12 }, (_, i) => {
    const d = subMonths(now, 11 - i);
    return {
      label: format(d, "MMM yy"),
      from:  format(startOfMonth(d), "yyyy-MM-dd"),
      to:    format(endOfMonth(d),   "yyyy-MM-dd"),
    };
  });

  const data = months.map(({ label, from, to }) => {
    const total = revenue
      .filter((r) => r.date >= from && r.date <= to)
      .reduce((sum, r) => sum + toGbp(r.amount, r.currency, rates), 0);
    return { label, total: parseFloat(total.toFixed(2)) };
  });

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `£${v}`} />
        <Tooltip formatter={(v) => [`£${Number(v).toFixed(2)}`, "Revenue"]} />
        <Bar dataKey="total" fill="#0d9488" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
