"use client";

import { ResponsiveContainer, LineChart, Line, Tooltip } from "recharts";

type Props = {
  data: { date: string; weightKg: number }[];
};

export function WeightSparkline({ data }: Props) {
  if (data.length < 2) {
    return (
      <div className="h-16 flex items-center justify-center text-xs text-gray-400">
        Not enough data yet
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={64}>
      <LineChart data={data}>
        <Line
          type="monotone"
          dataKey="weightKg"
          stroke="#0d9488"
          strokeWidth={2}
          dot={false}
        />
        <Tooltip
          formatter={(v) => [`${v} kg`, "Weight"]}
          labelFormatter={(label) => label}
          contentStyle={{ fontSize: 11, padding: "4px 8px", borderRadius: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
