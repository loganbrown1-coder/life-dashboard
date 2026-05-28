"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subWeeks, startOfWeek, endOfWeek } from "date-fns";

type TimeLog = {
  date: string;
  minutes: number;
};

export function TimeChart({ logs }: { logs: TimeLog[] }) {
  const now = new Date();
  const weeks = Array.from({ length: 12 }, (_, i) => {
    const weekStart = startOfWeek(subWeeks(now, 11 - i), { weekStartsOn: 1 });
    const weekEnd   = endOfWeek(subWeeks(now, 11 - i),   { weekStartsOn: 1 });
    return {
      label: format(weekStart, "d MMM"),
      from:  format(weekStart, "yyyy-MM-dd"),
      to:    format(weekEnd,   "yyyy-MM-dd"),
    };
  });

  const data = weeks.map(({ label, from, to }) => {
    const totalMins = logs
      .filter((l) => l.date >= from && l.date <= to)
      .reduce((sum, l) => sum + l.minutes, 0);
    return { label, hours: parseFloat((totalMins / 60).toFixed(1)) };
  });

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
        <Tooltip formatter={(v) => [`${v}h`, "Hours"]} />
        <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
