"use client";

import { useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

type Entry = { date: string; weightKg: number };

const RANGES = [
  { label: "30d",  days: 30  },
  { label: "90d",  days: 90  },
  { label: "365d", days: 365 },
  { label: "All",  days: 9999 },
];

export function WeightChart({ data }: { data: Entry[] }) {
  const [range, setRange] = useState(30);

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - range);

  const filtered = range === 9999
    ? data
    : data.filter((d) => d.date >= cutoff.toISOString().split("T")[0]);

  // Compute y-axis domain with some padding
  const values = filtered.map((d) => d.weightKg);
  const min = values.length ? Math.floor(Math.min(...values) - 1) : 0;
  const max = values.length ? Math.ceil(Math.max(...values) + 1) : 100;

  return (
    <div>
      <div className="flex gap-1 mb-4">
        {RANGES.map((r) => (
          <button
            key={r.label}
            onClick={() => setRange(r.days)}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              range === r.days
                ? "bg-[#0d9488] text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="h-48 flex items-center justify-center text-sm text-gray-400">
          No weight logs in this range yet
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={filtered} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v) => {
                const d = new Date(v);
                return `${d.getDate()}/${d.getMonth() + 1}`;
              }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[min, max]}
              tick={{ fontSize: 11, fill: "#9ca3af" }}
              tickFormatter={(v) => `${v}kg`}
              width={48}
            />
            <Tooltip
              formatter={(v) => [`${v} kg`, "Weight"]}
              labelFormatter={(l) => l}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
            />
            <Line
              type="monotone"
              dataKey="weightKg"
              stroke="#0d9488"
              strokeWidth={2}
              dot={filtered.length < 60}
              activeDot={{ r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
