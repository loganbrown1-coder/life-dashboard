import { Dumbbell, Footprints, Moon, PiggyBank, CheckSquare, Scale } from "lucide-react";

type Props = {
  weekWorkoutCount: number;
  weekStepsTotal: number;
  avgSleepMinutes: number | null;  // null if no sleep logged
  weeklySpend: number;
  tasksCompleted: number;
  weightDelta: number | null;
  latestWeight: number | null;
};

function fmtSleep(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function WeeklyReview({
  weekWorkoutCount,
  weekStepsTotal,
  avgSleepMinutes,
  weeklySpend,
  tasksCompleted,
  weightDelta,
  latestWeight,
}: Props) {
  return (
    <section className="rounded-xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📋</span>
        <h2 className="text-base font-semibold text-gray-900">Week in Review</h2>
        <span className="text-xs text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full font-medium ml-auto">Sunday</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <StatCard
          icon={<Dumbbell className="w-4 h-4 text-orange-500" />}
          label="Workouts"
          value={`${weekWorkoutCount}`}
          sub={weekWorkoutCount >= 4 ? "💪 great week" : weekWorkoutCount >= 2 ? "decent" : "room to improve"}
          highlight={weekWorkoutCount >= 4}
        />

        <StatCard
          icon={<Footprints className="w-4 h-4 text-green-500" />}
          label="Steps"
          value={weekStepsTotal > 0 ? weekStepsTotal.toLocaleString() : "—"}
          sub="this week"
        />

        <StatCard
          icon={<Moon className="w-4 h-4 text-indigo-500" />}
          label="Avg Sleep"
          value={avgSleepMinutes ? fmtSleep(Math.round(avgSleepMinutes)) : "—"}
          sub={avgSleepMinutes
            ? avgSleepMinutes >= 420
              ? "✓ 7h+ target"
              : "below target"
            : "none logged"}
          highlight={!!avgSleepMinutes && avgSleepMinutes >= 420}
        />

        <StatCard
          icon={<PiggyBank className="w-4 h-4 text-amber-500" />}
          label="Spent"
          value={weeklySpend > 0 ? `£${weeklySpend.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"}
          sub="this week"
        />

        <StatCard
          icon={<CheckSquare className="w-4 h-4 text-purple-500" />}
          label="Tasks done"
          value={`${tasksCompleted}`}
          sub="completed"
        />

        <StatCard
          icon={<Scale className="w-4 h-4 text-blue-500" />}
          label="Weight"
          value={latestWeight ? `${latestWeight} kg` : "—"}
          sub={weightDelta !== null
            ? `${weightDelta > 0 ? "+" : ""}${weightDelta} kg vs last week`
            : "no data"}
          highlight={weightDelta !== null && weightDelta <= 0}
        />
      </div>
    </section>
  );
}

function StatCard({
  icon, label, value, sub, highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-white border border-indigo-100" : "bg-white/60 border border-transparent"}`}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
    </div>
  );
}
