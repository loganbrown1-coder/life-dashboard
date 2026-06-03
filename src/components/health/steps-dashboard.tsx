"use client";

import { useState, useMemo } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell, LineChart, Line,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Flame, Target, Trophy, Calendar } from "lucide-react";
import { format, parseISO, getDay, startOfWeek, addDays } from "date-fns";
import { LogStepsForm } from "@/components/health/log-steps-form";

const GOAL = 10_000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const TIMEFRAMES = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "1y",  days: 365 },
  { label: "All", days: 0 },
] as const;

type Entry = { date: string; stepCount: number };
type TF = typeof TIMEFRAMES[number]["label"];

// ── Helpers ───────────────────────────────────────────────────────────────────

function barColour(v: number) {
  if (v >= GOAL)  return "#0d9488";
  if (v >= 5000)  return "#f59e0b";
  return "#f87171";
}

function aggregateWeekly(data: Entry[]): { label: string; stepCount: number }[] {
  const weeks: Record<string, number[]> = {};
  for (const d of data) {
    const monday = format(startOfWeek(parseISO(d.date), { weekStartsOn: 1 }), "yyyy-MM-dd");
    (weeks[monday] ??= []).push(d.stepCount);
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, vals]) => ({
      label: format(parseISO(date), "d MMM"),
      stepCount: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
}

function aggregateMonthly(data: Entry[]): { label: string; stepCount: number }[] {
  const months: Record<string, number[]> = {};
  for (const d of data) {
    const key = d.date.slice(0, 7); // "YYYY-MM"
    (months[key] ??= []).push(d.stepCount);
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      label: format(parseISO(key + "-01"), "MMM yy"),
      stepCount: Math.round(vals.reduce((s, v) => s + v, 0) / vals.length),
    }));
}

function longestStreak(data: Entry[], threshold = GOAL): number {
  let best = 0, cur = 0;
  for (const d of [...data].sort((a, b) => a.date.localeCompare(b.date))) {
    if (d.stepCount >= threshold) { cur++; best = Math.max(best, cur); }
    else cur = 0;
  }
  return best;
}

function currentStreak(data: Entry[], threshold = GOAL): number {
  const sorted = [...data].sort((a, b) => b.date.localeCompare(a.date));
  let streak = 0;
  for (const d of sorted) {
    if (d.stepCount >= threshold) streak++;
    else break;
  }
  return streak;
}

function avg(data: Entry[]) {
  if (!data.length) return 0;
  return data.reduce((s, d) => s + d.stepCount, 0) / data.length;
}

function dayOfWeekAvgs(data: Entry[]): { day: string; avg: number }[] {
  const buckets: number[][] = Array.from({ length: 7 }, () => []);
  for (const d of data) {
    const dow = getDay(parseISO(d.date)); // 0=Sun
    buckets[dow].push(d.stepCount);
  }
  return DAY_NAMES.map((day, i) => ({
    day,
    avg: buckets[i].length ? Math.round(buckets[i].reduce((s, v) => s + v, 0) / buckets[i].length) : 0,
  }));
}

// ── Main component ────────────────────────────────────────────────────────────

export function StepsDashboard({ allSteps, todaySteps }: { allSteps: Entry[]; todaySteps: number }) {
  const [tf, setTf] = useState<TF>("30d");

  const sorted = useMemo(() => [...allSteps].sort((a, b) => a.date.localeCompare(b.date)), [allSteps]);

  const periodData = useMemo(() => {
    const frame = TIMEFRAMES.find((t) => t.label === tf)!;
    if (frame.days === 0) return sorted;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - frame.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    return sorted.filter((d) => d.date >= cutoffStr);
  }, [sorted, tf]);

  const prevData = useMemo(() => {
    const frame = TIMEFRAMES.find((t) => t.label === tf)!;
    if (frame.days === 0 || !periodData.length) return [];
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - frame.days);
    const prevCutoff = new Date(cutoff);
    prevCutoff.setDate(prevCutoff.getDate() - frame.days);
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const prevStr   = prevCutoff.toISOString().slice(0, 10);
    return sorted.filter((d) => d.date >= prevStr && d.date < cutoffStr);
  }, [sorted, tf, periodData]);

  // Stats
  const periodAvg    = Math.round(avg(periodData));
  const prevAvg      = Math.round(avg(prevData));
  const trendPct     = prevAvg > 0 ? Math.round(((periodAvg - prevAvg) / prevAvg) * 100) : null;
  const goalHitDays  = periodData.filter((d) => d.stepCount >= GOAL).length;
  const goalHitPct   = periodData.length > 0 ? Math.round((goalHitDays / periodData.length) * 100) : 0;
  const bestDay      = sorted.length ? sorted.reduce((best, d) => d.stepCount > best.stepCount ? d : best, sorted[0]) : null;
  const curStreak    = currentStreak(sorted);
  const bestStreak   = longestStreak(sorted);
  const dowAvgs      = useMemo(() => dayOfWeekAvgs(periodData), [periodData]);
  const bestDow      = dowAvgs.reduce((b, d) => d.avg > b.avg ? d : b, dowAvgs[0]);

  // Chart data — aggregate for longer timeframes
  const chartData = useMemo(() => {
    if (tf === "1y" || tf === "All") return aggregateMonthly(periodData);
    if (tf === "90d") return aggregateWeekly(periodData);
    return periodData.map((d) => ({
      label: format(parseISO(d.date), tf === "7d" ? "EEE d" : "d MMM"),
      stepCount: d.stepCount,
      date: d.date,
    }));
  }, [periodData, tf]);

  const isAggregated = tf === "1y" || tf === "All" || tf === "90d";

  if (allSteps.length === 0) {
    return (
      <div className="rounded-xl border bg-white shadow-sm p-12 text-center text-gray-400">
        <p className="mb-2 text-lg">No steps data yet</p>
        <p className="text-sm">Import from Apple Health or log manually below</p>
        <div className="mt-6 max-w-xs mx-auto"><LogStepsForm /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Timeframe tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TIMEFRAMES.map(({ label }) => (
          <button
            key={label}
            onClick={() => setTf(label)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tf === label ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Today"
          value={todaySteps > 0 ? todaySteps.toLocaleString() : "—"}
          sub={todaySteps >= GOAL ? "Goal hit 🎯" : todaySteps > 0 ? `${(GOAL - todaySteps).toLocaleString()} to go` : "not logged"}
          colour={todaySteps >= GOAL ? "text-teal-600" : "text-gray-900"}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          label={`Avg (${tf})`}
          value={periodAvg > 0 ? periodAvg.toLocaleString() : "—"}
          sub={
            trendPct !== null
              ? trendPct > 0
                ? `↑ ${trendPct}% vs prev period`
                : trendPct < 0
                ? `↓ ${Math.abs(trendPct)}% vs prev period`
                : "Same as prev period"
              : ""
          }
          colour={trendPct !== null && trendPct > 0 ? "text-teal-600" : trendPct !== null && trendPct < 0 ? "text-red-500" : "text-gray-900"}
          icon={trendPct !== null && trendPct > 0 ? <TrendingUp className="w-4 h-4" /> : trendPct !== null && trendPct < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        />
        <StatCard
          label="Goal days"
          value={`${goalHitDays}/${periodData.length}`}
          sub={`${goalHitPct}% of days ≥ 10k`}
          colour={goalHitPct >= 70 ? "text-teal-600" : goalHitPct >= 40 ? "text-amber-500" : "text-red-500"}
          icon={<Calendar className="w-4 h-4" />}
        />
        <StatCard
          label="Streak"
          value={curStreak > 0 ? `${curStreak}d` : "—"}
          sub={bestStreak > 0 ? `Best: ${bestStreak} days` : "No streak yet"}
          colour={curStreak >= 7 ? "text-teal-600" : curStreak >= 3 ? "text-amber-500" : "text-gray-900"}
          icon={<Flame className="w-4 h-4" />}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-800">
            {isAggregated ? "Avg steps" : "Daily steps"} — {tf === "All" ? "all time" : `last ${tf}`}
          </h2>
          {bestDay && (
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              Best: {bestDay.stepCount.toLocaleString()} on {format(parseISO(bestDay.date), "d MMM yy")}
            </span>
          )}
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              interval={Math.max(0, Math.floor(chartData.length / 8) - 1)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
              width={32}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v) => [Number(v).toLocaleString(), isAggregated ? "Avg steps" : "Steps"]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
              cursor={{ fill: "#f9fafb" }}
            />
            {!isAggregated && (
              <ReferenceLine y={GOAL} stroke="#f59e0b" strokeDasharray="4 4"
                label={{ value: "10k goal", fill: "#f59e0b", fontSize: 10, position: "right" }}
              />
            )}
            <Bar dataKey="stepCount" radius={[3, 3, 0, 0]} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={barColour(entry.stepCount)} fillOpacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Legend */}
        <div className="flex items-center gap-4 mt-2 justify-center">
          {[["#f87171","< 5k"],["#f59e0b","5k–10k"],["#0d9488","≥ 10k goal"]].map(([c, l]) => (
            <span key={l} className="flex items-center gap-1 text-xs text-gray-400">
              <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: c }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Day of week + insight row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* Day of week breakdown */}
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Best day of the week</h2>
          <div className="space-y-2">
            {dowAvgs.map(({ day, avg: dayAvg }) => {
              const pct = Math.min(100, (dayAvg / (Math.max(...dowAvgs.map(d => d.avg)) || 1)) * 100);
              return (
                <div key={day} className="flex items-center gap-3">
                  <span className="text-xs text-gray-500 w-8">{day}</span>
                  <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${pct}%`,
                        backgroundColor: day === bestDow.day ? "#0d9488" : "#94a3b8",
                      }}
                    />
                  </div>
                  <span className={`text-xs tabular-nums w-12 text-right font-medium ${
                    day === bestDow.day ? "text-teal-600" : "text-gray-500"
                  }`}>
                    {dayAvg > 0 ? `${(dayAvg / 1000).toFixed(1)}k` : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Insights card */}
        <div className="rounded-xl border bg-white shadow-sm p-5">
          <h2 className="font-semibold text-gray-800 mb-4">Insights</h2>
          <div className="space-y-3">
            {/* Trend */}
            {trendPct !== null && (
              <InsightRow
                icon={trendPct >= 0 ? "📈" : "📉"}
                text={
                  trendPct > 0
                    ? `You're averaging ${trendPct}% more steps than the previous ${tf} period — keep it up!`
                    : trendPct < 0
                    ? `Steps are down ${Math.abs(trendPct)}% compared to the previous ${tf} period.`
                    : `Your average is exactly the same as the previous ${tf} period.`
                }
                colour={trendPct >= 0 ? "text-teal-700" : "text-red-600"}
              />
            )}
            {/* Goal hit rate */}
            <InsightRow
              icon={goalHitPct >= 70 ? "🎯" : goalHitPct >= 40 ? "⚡" : "💪"}
              text={
                goalHitPct >= 70
                  ? `You hit 10k on ${goalHitPct}% of days this period — excellent consistency!`
                  : goalHitPct >= 40
                  ? `You hit 10k on ${goalHitPct}% of days. Aim for 70%+ to build a strong habit.`
                  : `You hit 10k on ${goalHitPct}% of days. Try for 1 more goal day per week.`
              }
              colour={goalHitPct >= 70 ? "text-teal-700" : goalHitPct >= 40 ? "text-amber-700" : "text-gray-700"}
            />
            {/* Best day of week */}
            {bestDow.avg > 0 && (
              <InsightRow
                icon="📅"
                text={`${bestDow.day} is your most active day of the week with ${bestDow.avg.toLocaleString()} avg steps.`}
                colour="text-gray-700"
              />
            )}
            {/* Streak */}
            {curStreak >= 3 && (
              <InsightRow
                icon="🔥"
                text={`You're on a ${curStreak}-day streak of hitting 10k! Best ever: ${bestStreak} days.`}
                colour="text-orange-600"
              />
            )}
            {/* Best day */}
            {bestDay && (
              <InsightRow
                icon="🏆"
                text={`All-time best: ${bestDay.stepCount.toLocaleString()} steps on ${format(parseISO(bestDay.date), "d MMMM yyyy")}.`}
                colour="text-gray-700"
              />
            )}
          </div>
        </div>
      </div>

      {/* Log steps */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Log steps manually</h2>
        <LogStepsForm />
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, colour, icon }: {
  label: string; value: string; sub: string; colour: string; icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-white shadow-sm p-4">
      <div className={`flex items-center gap-1.5 text-xs mb-1 ${colour}`}>{icon} {label}</div>
      <p className={`text-2xl font-bold tabular-nums ${colour}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5 leading-snug">{sub}</p>}
    </div>
  );
}

function InsightRow({ icon, text, colour }: { icon: string; text: string; colour: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-base shrink-0 mt-0.5">{icon}</span>
      <p className={`text-sm leading-snug ${colour}`}>{text}</p>
    </div>
  );
}
