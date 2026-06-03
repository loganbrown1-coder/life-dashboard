"use client";

import { useState, useMemo, useEffect } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, Scale, Target, BarChart2, CalendarCheck } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { LogWeightForm } from "@/components/health/log-weight-form";

const TIMEFRAMES = [
  { label: "30d",  days: 30  },
  { label: "90d",  days: 90  },
  { label: "6m",   days: 182 },
  { label: "1y",   days: 365 },
  { label: "All",  days: 0   },
] as const;

type TF   = typeof TIMEFRAMES[number]["label"];
type Entry = { date: string; weightKg: number };

// ── Helpers ───────────────────────────────────────────────────────────────────

function rollingAvg(data: Entry[], window = 7): (Entry & { rolling: number })[] {
  return data.map((d, i) => {
    const slice = data.slice(Math.max(0, i - window + 1), i + 1);
    const avg   = slice.reduce((s, x) => s + x.weightKg, 0) / slice.length;
    return { ...d, rolling: parseFloat(avg.toFixed(2)) };
  });
}

function aggregateMonthly(data: Entry[]): { label: string; weightKg: number; date: string }[] {
  const months: Record<string, number[]> = {};
  for (const d of data) {
    const key = d.date.slice(0, 7);
    (months[key] ??= []).push(d.weightKg);
  }
  return Object.entries(months)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, vals]) => ({
      date: key + "-15",
      label: format(parseISO(key + "-01"), "MMM yy"),
      weightKg: parseFloat((vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(2)),
    }));
}

function linearRate(data: Entry[]): number | null {
  if (data.length < 2) return null;
  const first = data[0];
  const last  = data[data.length - 1];
  const days  = differenceInDays(parseISO(last.date), parseISO(first.date));
  if (days === 0) return null;
  return parseFloat(((last.weightKg - first.weightKg) / days * 7).toFixed(2));
}

function weeksToGoal(current: number, goal: number, ratePerWeek: number): number | null {
  if (ratePerWeek === 0) return null;
  const diff = goal - current;
  if (Math.sign(diff) !== Math.sign(ratePerWeek)) return null; // going wrong way
  return Math.ceil(diff / ratePerWeek);
}

function dateInWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return format(d, "d MMM yyyy");
}

// ── Main component ────────────────────────────────────────────────────────────

export function WeightDashboard({ allLogs }: { allLogs: Entry[] }) {
  const [tf, setTf]         = useState<TF>("90d");
  const [goalKg, setGoalKg] = useState<number | null>(null);
  const [goalInput, setGoalInput] = useState("");
  const [showGoalEdit, setShowGoalEdit] = useState(false);

  // Persist goal in localStorage
  useEffect(() => {
    const stored = localStorage.getItem("weight_goal_kg");
    if (stored) { setGoalKg(Number(stored)); setGoalInput(stored); }
  }, []);

  function saveGoal() {
    const val = parseFloat(goalInput);
    if (!val || val <= 0) return;
    setGoalKg(val);
    localStorage.setItem("weight_goal_kg", String(val));
    setShowGoalEdit(false);
  }

  const sorted = useMemo(() => [...allLogs].sort((a, b) => a.date.localeCompare(b.date)), [allLogs]);

  const periodData = useMemo(() => {
    const frame = TIMEFRAMES.find((t) => t.label === tf)!;
    if (frame.days === 0) return sorted;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - frame.days);
    return sorted.filter((d) => d.date >= cutoff.toISOString().slice(0, 10));
  }, [sorted, tf]);

  const latest  = sorted[sorted.length - 1] ?? null;
  const earliest = periodData[0] ?? null;

  const changeKg    = latest && earliest && latest.date !== earliest.date ? parseFloat((latest.weightKg - earliest.weightKg).toFixed(2)) : null;
  const ratePerWeek = linearRate(periodData);
  const logsInPeriod = periodData.length;

  const allTimeLow  = sorted.length ? sorted.reduce((b, d) => d.weightKg < b.weightKg ? d : b, sorted[0]) : null;
  const allTimeHigh = sorted.length ? sorted.reduce((b, d) => d.weightKg > b.weightKg ? d : b, sorted[0]) : null;

  // Chart — aggregate for 1y/All
  const useMonthly = tf === "1y" || tf === "All";
  const chartData = useMemo(() => {
    if (useMonthly) {
      return aggregateMonthly(periodData).map((d) => ({ ...d, rolling: d.weightKg }));
    }
    return rollingAvg(periodData);
  }, [periodData, useMonthly]);

  const yValues   = chartData.map((d) => d.weightKg);
  const goalValues = goalKg ? [goalKg] : [];
  const allY      = [...yValues, ...goalValues].filter(Boolean);
  const yMin      = allY.length ? Math.floor(Math.min(...allY) - 1) : 50;
  const yMax      = allY.length ? Math.ceil(Math.max(...allY) + 1) : 100;

  const weeksLeft  = goalKg && ratePerWeek && latest ? weeksToGoal(latest.weightKg, goalKg, ratePerWeek) : null;
  const goalDiff   = goalKg && latest ? parseFloat((latest.weightKg - goalKg).toFixed(1)) : null;

  if (sorted.length === 0) {
    return (
      <div className="rounded-xl border bg-white shadow-sm p-12 text-center text-gray-400 space-y-4">
        <p className="text-lg">No weight data yet</p>
        <p className="text-sm">Log your weight below or import from Apple Health</p>
        <div className="max-w-xs mx-auto"><LogWeightForm /></div>
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* Top row: current + goal */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        {/* Current weight badge */}
        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-bold text-gray-900 tabular-nums">{latest?.weightKg}</span>
          <span className="text-lg text-gray-400">kg</span>
          {latest && <span className="text-sm text-gray-400">as of {format(parseISO(latest.date), "d MMM yyyy")}</span>}
        </div>

        {/* Goal setter */}
        <div className="flex items-center gap-2">
          {goalKg && !showGoalEdit ? (
            <div className="flex items-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2">
              <Target className="w-4 h-4 text-teal-600" />
              <span className="text-sm font-medium text-teal-700">Goal: {goalKg} kg</span>
              {goalDiff !== null && (
                <span className={`text-xs font-medium ${goalDiff > 0 ? "text-amber-600" : "text-teal-600"}`}>
                  ({goalDiff > 0 ? `${goalDiff} to lose` : `${Math.abs(goalDiff)} below goal 🎉`})
                </span>
              )}
              <button onClick={() => setShowGoalEdit(true)} className="text-xs text-teal-500 hover:text-teal-700 underline ml-1">Edit</button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {showGoalEdit || !goalKg ? (
                <>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">kg</span>
                    <input
                      type="number"
                      step="0.1"
                      placeholder={goalKg ? String(goalKg) : "Goal weight"}
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveGoal(); }}
                      className="w-36 rounded-lg border border-gray-200 pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                  <button onClick={saveGoal} className="px-3 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium hover:bg-teal-600">
                    Set goal
                  </button>
                  {showGoalEdit && <button onClick={() => setShowGoalEdit(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>}
                </>
              ) : null}
            </div>
          )}
        </div>
      </div>

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
          label={`Change (${tf})`}
          value={changeKg !== null ? `${changeKg > 0 ? "+" : ""}${changeKg} kg` : "—"}
          sub={
            changeKg !== null
              ? changeKg < 0 ? "lost" : changeKg > 0 ? "gained" : "no change"
              : "not enough data"
          }
          colour={changeKg === null ? "text-gray-900" : changeKg < 0 ? "text-teal-600" : changeKg > 0 ? "text-amber-500" : "text-gray-500"}
          icon={changeKg === null ? <Minus className="w-4 h-4" /> : changeKg < 0 ? <TrendingDown className="w-4 h-4" /> : changeKg > 0 ? <TrendingUp className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
        />
        <StatCard
          label="Rate / week"
          value={ratePerWeek !== null ? `${ratePerWeek > 0 ? "+" : ""}${ratePerWeek} kg` : "—"}
          sub={ratePerWeek !== null
            ? ratePerWeek < 0 ? "losing per week" : ratePerWeek > 0 ? "gaining per week" : "stable"
            : "not enough data"}
          colour={ratePerWeek === null ? "text-gray-900" : ratePerWeek < 0 ? "text-teal-600" : ratePerWeek > 0 ? "text-amber-500" : "text-gray-500"}
          icon={<BarChart2 className="w-4 h-4" />}
        />
        <StatCard
          label="All-time low"
          value={allTimeLow ? `${allTimeLow.weightKg} kg` : "—"}
          sub={allTimeLow ? format(parseISO(allTimeLow.date), "d MMM yyyy") : ""}
          colour="text-teal-600"
          icon={<Scale className="w-4 h-4" />}
        />
        <StatCard
          label={`Logs (${tf})`}
          value={String(logsInPeriod)}
          sub={logsInPeriod > 0 && periodData.length > 0
            ? `every ~${Math.round((TIMEFRAMES.find(t => t.label === tf)?.days || logsInPeriod) / Math.max(1, logsInPeriod))} days`
            : "no logs"}
          colour={logsInPeriod >= 20 ? "text-teal-600" : "text-gray-900"}
          icon={<CalendarCheck className="w-4 h-4" />}
        />
      </div>

      {/* Chart */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">
          {useMonthly ? "Monthly average" : "Daily readings + 7-day avg"} — {tf === "All" ? "all time" : `last ${tf}`}
        </h2>

        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis
              dataKey={useMonthly ? "label" : "date"}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(v) => {
                if (useMonthly) return v;
                try { return format(parseISO(v), tf === "30d" ? "d MMM" : "d MMM"); } catch { return v; }
              }}
              interval={Math.max(0, Math.floor(chartData.length / 7) - 1)}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 10, fill: "#9ca3af" }}
              tickFormatter={(v) => `${v}kg`}
              width={44}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              formatter={(v, name) => [
                `${v} kg`,
                name === "weightKg" ? "Reading" : name === "rolling" ? "7-day avg" : "Avg",
              ]}
              labelFormatter={(l) => {
                try { return format(parseISO(String(l)), "d MMM yyyy"); } catch { return l; }
              }}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
            />
            {goalKg && (
              <ReferenceLine
                y={goalKg}
                stroke="#10b981"
                strokeDasharray="5 4"
                label={{ value: `Goal ${goalKg}kg`, fill: "#10b981", fontSize: 10, position: "right" }}
              />
            )}
            {/* Raw readings — small dots, faded */}
            {!useMonthly && (
              <Line
                type="monotone"
                dataKey="weightKg"
                stroke="#0d9488"
                strokeWidth={0}
                dot={{ r: 3, fill: "#0d9488", fillOpacity: 0.35, strokeWidth: 0 }}
                activeDot={{ r: 5 }}
                name="weightKg"
              />
            )}
            {/* Rolling average / monthly avg — main line */}
            <Line
              type="monotone"
              dataKey={useMonthly ? "weightKg" : "rolling"}
              stroke="#0d9488"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 5, fill: "#0d9488" }}
              name={useMonthly ? "weightKg" : "rolling"}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Insights */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Insights</h2>
        <div className="space-y-3">

          {/* Change narrative */}
          {changeKg !== null && (
            <InsightRow
              icon={changeKg < 0 ? "📉" : changeKg > 0 ? "📈" : "➡️"}
              text={
                changeKg < 0
                  ? `You've lost ${Math.abs(changeKg)} kg over the last ${tf} — great progress!`
                  : changeKg > 0
                  ? `You've gained ${changeKg} kg over the last ${tf}.`
                  : `Weight is stable over the last ${tf}.`
              }
              colour={changeKg <= 0 ? "text-teal-700" : "text-amber-700"}
            />
          )}

          {/* Rate projection */}
          {ratePerWeek !== null && Math.abs(ratePerWeek) >= 0.05 && (
            <InsightRow
              icon="⏱️"
              text={
                ratePerWeek < 0
                  ? `At your current rate of ${Math.abs(ratePerWeek)} kg/week, you're on track for consistent progress.`
                  : `You're gaining ${ratePerWeek} kg/week on average this period.`
              }
              colour="text-gray-700"
            />
          )}

          {/* Goal projection */}
          {weeksLeft !== null && weeksLeft > 0 && goalKg && (
            <InsightRow
              icon="🎯"
              text={`At this rate you'll reach your goal of ${goalKg} kg in ~${weeksLeft} weeks (around ${dateInWeeks(weeksLeft)}).`}
              colour="text-teal-700"
            />
          )}

          {/* Already at goal */}
          {goalDiff !== null && goalDiff <= 0 && (
            <InsightRow icon="🎉" text={`You've hit your goal weight of ${goalKg} kg!`} colour="text-teal-700" />
          )}

          {/* All-time low proximity */}
          {allTimeLow && latest && latest.weightKg > allTimeLow.weightKg && (
            <InsightRow
              icon="🏆"
              text={`You're ${(latest.weightKg - allTimeLow.weightKg).toFixed(1)} kg from your all-time low of ${allTimeLow.weightKg} kg (${format(parseISO(allTimeLow.date), "d MMM yyyy")}).`}
              colour="text-gray-700"
            />
          )}

          {allTimeLow && latest && latest.weightKg === allTimeLow.weightKg && (
            <InsightRow icon="🏅" text={`You're at your all-time low weight of ${allTimeLow.weightKg} kg!`} colour="text-teal-700" />
          )}

          {/* Logging consistency */}
          {logsInPeriod < 5 && (
            <InsightRow
              icon="📝"
              text="You have fewer than 5 logs this period — logging daily gives you more accurate trend data."
              colour="text-gray-500"
            />
          )}

          {/* All-time high */}
          {allTimeHigh && latest && allTimeHigh.weightKg > latest.weightKg && (
            <InsightRow
              icon="💪"
              text={`You're down ${(allTimeHigh.weightKg - latest.weightKg).toFixed(1)} kg from your all-time high of ${allTimeHigh.weightKg} kg.`}
              colour="text-gray-700"
            />
          )}
        </div>
      </div>

      {/* Log weight */}
      <div className="rounded-xl border bg-white shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-3">Log weight</h2>
        <LogWeightForm />
      </div>

      {/* Recent logs table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b">
          <h2 className="font-semibold text-gray-800">Recent logs</h2>
        </div>
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {[...sorted].reverse().slice(0, 30).map((l, i) => {
            const prev = [...sorted].reverse()[i + 1];
            const delta = prev ? parseFloat((l.weightKg - prev.weightKg).toFixed(2)) : null;
            return (
              <div key={l.date} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-sm text-gray-500">{format(parseISO(l.date), "d MMM yyyy")}</span>
                <div className="flex items-center gap-3">
                  {delta !== null && (
                    <span className={`text-xs tabular-nums ${delta < 0 ? "text-teal-500" : delta > 0 ? "text-amber-500" : "text-gray-400"}`}>
                      {delta > 0 ? "+" : ""}{delta} kg
                    </span>
                  )}
                  <span className="font-semibold text-gray-900 tabular-nums">{l.weightKg} kg</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

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
