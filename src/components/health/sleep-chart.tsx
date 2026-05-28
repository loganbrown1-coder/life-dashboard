"use client";

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts";
import { format, parseISO } from "date-fns";

type Props = {
  data: Array<{ date: string; hours: number }>;
};

export function SleepChart({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={(d) => format(parseISO(d), "d MMM")}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[0, 12]}
          tickFormatter={(v) => `${v}h`}
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip
          formatter={(v) => [`${v}h`, "Sleep"]}
          labelFormatter={(d) => format(parseISO(d as string), "EEE d MMM")}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        {/* 8-hour target line */}
        <ReferenceLine y={8} stroke="#6366f1" strokeDasharray="4 3" strokeWidth={1.5} label={{ value: "8h", position: "right", fontSize: 10, fill: "#6366f1" }} />
        <Bar dataKey="hours" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
