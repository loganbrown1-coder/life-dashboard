import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthNav } from "@/components/health/health-nav";
import { WorkoutWeekPlan } from "@/components/health/workout-week-plan";
import { getWorkoutsThisWeek, getWorkoutStreak, getWorkouts } from "@/db/queries/workouts";
import { getWorkoutSchedule, getWorkoutsForRange } from "@/db/queries/workout-schedule";
import { getUserOptions } from "@/db/queries/user-options";
import { getLatestWeight, getWeightNDaysAgo } from "@/db/queries/weight";
import { getTodaySteps, getLast30DaysSteps } from "@/db/queries/steps";
import { getWeeklyAdherence } from "@/db/queries/supplements";
import { getLastNightSleep, getAverageSleep } from "@/db/queries/sleep";
import { Dumbbell, Scale, Footprints, Pill, Moon, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";

const WORKOUT_COLOURS: Record<string, string> = {
  push:           "bg-blue-100 text-blue-700",
  pull:           "bg-purple-100 text-purple-700",
  legs:           "bg-red-100 text-red-700",
  core:           "bg-orange-100 text-orange-700",
  arms_shoulders: "bg-cyan-100 text-cyan-700",
  run:            "bg-green-100 text-green-700",
  swim:           "bg-teal-100 text-teal-700",
  walk:           "bg-gray-100 text-gray-600",
  stretch:        "bg-yellow-100 text-yellow-700",
  rest:           "bg-gray-50 text-gray-400",
  other:          "bg-gray-100 text-gray-600",
};

function Delta({ value }: { value: number | null }) {
  if (value === null) return <span className="text-gray-400 text-xs">no prior data</span>;
  if (Math.abs(value) < 0.05)
    return <span className="flex items-center gap-0.5 text-gray-500 text-xs"><Minus className="w-3 h-3" /> unchanged</span>;
  const up = value > 0;
  return (
    <span className={`flex items-center gap-0.5 text-xs ${up ? "text-[#f59e0b]" : "text-[#10b981]"}`}>
      {up ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {up ? "+" : ""}{value.toFixed(1)} kg
    </span>
  );
}

export default async function HealthPage() {
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(today,   { weekStartsOn: 1 }), "yyyy-MM-dd");

  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart + "T00:00:00"), i), "yyyy-MM-dd")
  );

  const [weekWorkouts, streak, latestWeight, weight7ago, todaySteps, stepsLast30, adherencePct, recentWorkouts, lastNightSleep, avgSleep7, schedule, weekCompletions, workoutTypeOptions] =
    await Promise.all([
      getWorkoutsThisWeek(weekStart, weekEnd),
      getWorkoutStreak(),
      getLatestWeight(),
      getWeightNDaysAgo(7),
      getTodaySteps(),
      getLast30DaysSteps(),
      getWeeklyAdherence(),
      getWorkouts(7),
      getLastNightSleep(),
      getAverageSleep(7),
      getWorkoutSchedule(),
      getWorkoutsForRange(weekStart, weekEnd),
      getUserOptions("workout_type"),
    ]);

  const completedThisWeek = weekWorkouts.filter((w) => w.completed).length;
  const weeklyTarget = 6;

  const last7Steps = stepsLast30.slice(-7);
  const avgSteps7 = last7Steps.length
    ? Math.round(last7Steps.reduce((s, r) => s + r.stepCount, 0) / last7Steps.length)
    : 0;

  const weightDelta =
    latestWeight && weight7ago ? latestWeight.weightKg - weight7ago.weightKg : null;

  return (
    <div>
      <div className="mb-2">
        <h1 className="text-2xl font-semibold text-gray-900">Health</h1>
        <p className="text-gray-500 mt-1">
          Week of {format(startOfWeek(today, { weekStartsOn: 1 }), "d MMM yyyy")}
        </p>
      </div>

      <HealthNav />

      <WorkoutWeekPlan
        schedule={schedule}
        weekDates={weekDates}
        completions={weekCompletions}
        workoutTypes={workoutTypeOptions}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Dumbbell className="w-4 h-4 text-[#0d9488]" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Workouts</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">
              {completedThisWeek}<span className="text-sm text-gray-400 font-normal"> / {weeklyTarget}</span>
            </div>
            <div className="text-xs text-gray-500 mt-0.5">{streak} day streak</div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-[#0d9488] rounded-full" style={{ width: `${Math.min(100, (completedThisWeek / weeklyTarget) * 100)}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-[#0d9488]" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Weight</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">
              {latestWeight ? `${latestWeight.weightKg} kg` : "—"}
            </div>
            <Delta value={weightDelta} />
            <div className="text-xs text-gray-400 mt-0.5">
              {latestWeight ? `logged ${latestWeight.date}` : "no logs yet"}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Footprints className="w-4 h-4 text-[#0d9488]" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Steps</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">
              {todaySteps > 0 ? todaySteps.toLocaleString() : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              today · avg {avgSteps7 > 0 ? avgSteps7.toLocaleString() : "—"} / 7d
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Pill className="w-4 h-4 text-[#0d9488]" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Supplements</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">{adherencePct}%</div>
            <div className="text-xs text-gray-500 mt-0.5">adherence this week</div>
            <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${adherencePct}%`,
                  backgroundColor: adherencePct >= 80 ? "#10b981" : adherencePct >= 50 ? "#f59e0b" : "#ef4444",
                }}
              />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-xl shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-indigo-500" />
              <CardTitle className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sleep</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-2xl font-bold text-gray-900">
              {lastNightSleep
                ? `${Math.floor(lastNightSleep.durationMinutes / 60)}h${lastNightSleep.durationMinutes % 60 > 0 ? ` ${lastNightSleep.durationMinutes % 60}m` : ""}`
                : "—"}
            </div>
            <div className="text-xs text-gray-500 mt-0.5">
              {avgSleep7
                ? `avg ${(avgSleep7 / 60).toFixed(1)}h / 7d`
                : "last night"}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentWorkouts.length === 0 ? (
            <p className="text-sm text-gray-400">
              No workouts logged yet —{" "}
              <a href="/health/workouts" className="text-[#0d9488] underline">log your first workout</a>.
            </p>
          ) : (
            <div className="space-y-2">
              {recentWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <Badge className={`text-xs capitalize ${WORKOUT_COLOURS[w.type] ?? ""}`}>
                      {w.type.replace("_", " ")}
                    </Badge>
                    <span className="text-sm text-gray-700">{w.notes ?? "—"}</span>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">{w.date}</div>
                    {w.durationMinutes && <div className="text-xs text-gray-400">{w.durationMinutes} min</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
