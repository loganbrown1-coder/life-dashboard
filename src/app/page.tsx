import { Greeting } from "@/components/home/greeting";
import { MorningCheckIn } from "@/components/home/morning-checkin";
import { RoutineChecklist } from "@/components/home/routine-checklist";
import { QuickActions } from "@/components/home/quick-actions";
import { WeightSparkline } from "@/components/home/weight-sparkline";
import { WeeklyReview } from "@/components/home/weekly-review";
import { getRoutinesWithItems, getRoutineLogsForDate } from "@/db/queries/routines";
import { getTasksDueToday, getTasksCompletedInRange } from "@/db/queries/tasks";
import { getMealPlansWithMeals } from "@/db/queries/food";
import { getWorkoutsThisWeek } from "@/db/queries/workouts";
import { getWeightLogs } from "@/db/queries/weight";
import { getTodaySteps, getLast30DaysSteps } from "@/db/queries/steps";
import { getSavingsGoals, getTransactionsForRange } from "@/db/queries/finances";
import { getSleepLogsForRange } from "@/db/queries/sleep";
import { getCheckInForDate } from "@/db/queries/check-in";
import { getActiveSupplementsWithTodayStatus } from "@/db/queries/supplements";
import { getWorkoutSchedule, getWorkoutsForRange } from "@/db/queries/workout-schedule";
import { getUserOptions } from "@/db/queries/user-options";
import { SupplementChecklist } from "@/components/home/supplement-checklist";
import { WorkoutWeekPlan } from "@/components/health/workout-week-plan";
import { completeTask } from "@/actions/tasks";
import { db } from "@/db";
import { accounts } from "@/db/schema";
import { format, startOfWeek, addDays } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Dumbbell, CheckSquare, Footprints, ChevronRight, PiggyBank } from "lucide-react";
import Link from "next/link";

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack",
};
const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;

const PRIORITY_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-700",
  med:  "bg-amber-100 text-amber-700",
  low:  "bg-gray-100 text-gray-500",
};

export default async function HomePage() {
  const today     = format(new Date(), "yyyy-MM-dd");
  const hour      = new Date().getHours();
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(addDays(new Date(weekStart + "T00:00:00"), 6), "yyyy-MM-dd");
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart + "T00:00:00"), i), "yyyy-MM-dd")
  );

  const isSunday = new Date().getDay() === 0;

  const [
    routinesWithItems,
    todayLogs,
    todayTasks,
    todayPlans,
    weekWorkouts,
    recentWeights,
    todaySteps,
    last30Steps,
    allAccounts,
    savingsGoals,
    checkIn,
    weekSleepLogs,
    weekTxns,
    weekTasksDone,
    supplementsWithStatus,
    workoutSchedule,
    weekWorkoutCompletions,
    workoutTypeOptions,
  ] = await Promise.all([
    getRoutinesWithItems(),
    getRoutineLogsForDate(today),
    getTasksDueToday(today),
    getMealPlansWithMeals(today, today),
    getWorkoutsThisWeek(weekStart, weekEnd),
    getWeightLogs(30),
    getTodaySteps(),
    getLast30DaysSteps(),
    db.select().from(accounts),
    getSavingsGoals(),
    getCheckInForDate(today),
    getSleepLogsForRange(weekStart, weekEnd),
    getTransactionsForRange(weekStart, weekEnd),
    getTasksCompletedInRange(weekStart, weekEnd),
    getActiveSupplementsWithTodayStatus(),
    getWorkoutSchedule(),
    getWorkoutsForRange(weekStart, weekEnd),
    getUserOptions("workout_type"),
  ]);

  const morningRoutine = routinesWithItems.find((r) => r.timeOfDay === "morning");
  const eveningRoutine = routinesWithItems.find((r) => r.timeOfDay === "evening");
  const planMap = Object.fromEntries(todayPlans.map((p) => [p.mealSlot, p]));
  const todayWorkout = weekWorkouts.find((w) => w.date === today);

  // Week stats
  const weekWorkoutCount = weekWorkouts.filter((w) => w.completed).length;
  const weekStepsTotal   = last30Steps.slice(-7).reduce((s, d) => s + d.stepCount, 0);

  const latestWeight  = recentWeights[recentWeights.length - 1]?.weightKg ?? null;
  const weekAgoWeight = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    return recentWeights.filter((w) => new Date(w.date) <= cutoff).at(-1)?.weightKg ?? null;
  })();
  const weightDelta = latestWeight && weekAgoWeight ? +(latestWeight - weekAgoWeight).toFixed(1) : null;

  const allItems  = [...(morningRoutine?.items ?? []), ...(eveningRoutine?.items ?? [])];
  const doneToday = allItems.filter((i) => todayLogs.find((l) => l.routineItemId === i.id && l.completed)).length;
  const routineCompletionPct = allItems.length ? Math.round((doneToday / allItems.length) * 100) : 0;

  const pastNoon   = hour >= 12;
  const pastFivePm = hour >= 17;

  // Weekly review stats (only computed if Sunday)
  const avgSleepMinutes = weekSleepLogs.length
    ? Math.round(weekSleepLogs.reduce((s, l) => s + l.durationMinutes, 0) / weekSleepLogs.length)
    : null;
  const weeklySpend = weekTxns
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amountInBaseCurrency, 0);

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Greeting */}
      <Greeting />

      {/* Weekly review — only on Sundays */}
      {isSunday && (
        <WeeklyReview
          weekWorkoutCount={weekWorkoutCount}
          weekStepsTotal={weekStepsTotal}
          avgSleepMinutes={avgSleepMinutes}
          weeklySpend={weeklySpend}
          tasksCompleted={weekTasksDone.length}
          weightDelta={weightDelta}
          latestWeight={latestWeight}
        />
      )}

      {/* Morning check-in */}
      <MorningCheckIn checkInDismissed={checkIn?.dismissed ?? false} today={today} />

      {/* Weekly workout plan */}
      {workoutSchedule.length > 0 && (
        <WorkoutWeekPlan
          schedule={workoutSchedule}
          weekDates={weekDates}
          completions={weekWorkoutCompletions}
          workoutTypes={workoutTypeOptions}
        />
      )}

      {/* Today */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">Today</h2>
        <div className="space-y-3">

          {/* Morning routine */}
          {morningRoutine && morningRoutine.items.length > 0 && (
            <RoutineChecklist
              routineId={morningRoutine.id}
              label="Morning routine"
              items={morningRoutine.items}
              logs={todayLogs}
              date={today}
              collapsedByDefault={pastNoon}
            />
          )}

          {/* Supplement checklist */}
          <SupplementChecklist supplements={supplementsWithStatus} />

          {/* Today's meals */}
          <div className="rounded-xl border bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Meals</h3>
              <Link href={`/food/plan?week=${weekStart}`} className="text-xs text-[#0d9488] hover:underline">
                Edit plan
              </Link>
            </div>
            {todayWorkout && (
              <div className="mb-2 text-xs text-orange-600 bg-orange-50 rounded-lg px-2 py-1 inline-block capitalize">
                {todayWorkout.type.replace("_", " ")} day
              </div>
            )}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {SLOTS.map((slot) => {
                const plan = planMap[slot];
                return (
                  <div
                    key={slot}
                    className={`rounded-lg p-2 text-xs ${
                      plan
                        ? plan.eaten
                          ? "bg-green-50 border border-green-100"
                          : "bg-gray-50 border border-gray-100"
                        : "border border-dashed border-gray-200"
                    }`}
                  >
                    <p className="font-semibold text-gray-400 uppercase tracking-wide text-[10px] mb-0.5">
                      {SLOT_LABELS[slot]}
                    </p>
                    {plan ? (
                      <p className={`font-medium leading-snug ${plan.eaten ? "text-green-700 line-through" : "text-gray-800"}`}>
                        {plan.meal?.name ?? "—"}
                      </p>
                    ) : (
                      <p className="text-gray-300">Not planned</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tasks due today */}
          {todayTasks.length > 0 && (
            <div className="rounded-xl border bg-white p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-2">Tasks due today</h3>
              <div className="space-y-1.5">
                {todayTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <form
                      action={async () => {
                        "use server";
                        await completeTask(task.id);
                      }}
                    >
                      <button
                        type="submit"
                        className="flex-shrink-0 w-5 h-5 rounded border-2 border-gray-300 hover:border-[#0d9488] transition-colors"
                        title="Mark done"
                      />
                    </form>
                    <span className="text-sm text-gray-700 flex-1">{task.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLORS[task.priority]}`}>
                      {task.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Evening routine */}
          {eveningRoutine && eveningRoutine.items.length > 0 && (
            <RoutineChecklist
              routineId={eveningRoutine.id}
              label="Evening routine"
              items={eveningRoutine.items}
              logs={todayLogs}
              date={today}
              collapsedByDefault={false}
              dimmed={!pastFivePm}
            />
          )}
        </div>
      </section>

      {/* This Week */}
      <section>
        <h2 className="text-base font-semibold text-gray-900 mb-3">This Week</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Dumbbell className="w-3 h-3" /> Workouts
              </p>
              <p className="text-2xl font-bold text-gray-900">{weekWorkoutCount}</p>
              <p className="text-xs text-gray-400">this week</p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1">⚖️ Weight</p>
              <p className="text-2xl font-bold text-gray-900">
                {latestWeight ? `${latestWeight} kg` : "—"}
              </p>
              {weightDelta !== null && (
                <p className={`text-xs font-medium ${weightDelta > 0 ? "text-amber-500" : weightDelta < 0 ? "text-green-600" : "text-gray-400"}`}>
                  {weightDelta > 0 ? "+" : ""}{weightDelta} kg vs last week
                </p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Footprints className="w-3 h-3" /> Steps today
              </p>
              <p className="text-2xl font-bold text-gray-900">
                {todaySteps ? todaySteps.toLocaleString() : "—"}
              </p>
              <p className="text-xs text-gray-400">
                {weekStepsTotal > 0 ? `${weekStepsTotal.toLocaleString()} this week` : "none logged"}
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                <CheckSquare className="w-3 h-3" /> Routine
              </p>
              <p className="text-2xl font-bold text-gray-900">{routineCompletionPct}%</p>
              <p className="text-xs text-gray-400">today ({doneToday}/{allItems.length})</p>
            </CardContent>
          </Card>
        </div>

        {recentWeights.length >= 2 && (
          <Card className="rounded-xl shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-gray-600">Weight — last 30 days</p>
                <Link href="/health/weight" className="text-xs text-[#0d9488] hover:underline flex items-center gap-0.5">
                  Full chart <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <WeightSparkline data={recentWeights.map((w) => ({ date: w.date, weightKg: w.weightKg }))} />
            </CardContent>
          </Card>
        )}
      </section>

      {/* Savings Goals */}
      {savingsGoals.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-gray-900 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-purple-400" /> Savings goals
            </h2>
            <Link href="/finances/savings" className="text-xs text-[#0d9488] hover:underline flex items-center gap-0.5">
              Manage <ChevronRight className="w-3 h-3" />
            </Link>
          </div>
          <div className="space-y-3">
            {savingsGoals.map((g) => {
              const pct = g.targetAmountGbp > 0
                ? Math.min(100, Math.round((g.currentAmountGbp / g.targetAmountGbp) * 100))
                : 0;
              const remaining = Math.max(0, g.targetAmountGbp - g.currentAmountGbp);
              return (
                <div key={g.id} className="rounded-xl border bg-white p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-gray-800">{g.name}</p>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900 tabular-nums">
                        £{g.currentAmountGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        <span className="text-xs font-normal text-gray-400"> / £{g.targetAmountGbp.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </p>
                    </div>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? "#10b981" : "#8b5cf6" }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <p className="text-xs text-purple-600 font-medium">{pct}% saved</p>
                    {pct < 100 && <p className="text-xs text-gray-400">£{remaining.toLocaleString(undefined, { maximumFractionDigits: 0 })} to go</p>}
                    {pct >= 100 && <p className="text-xs text-green-600 font-medium">🎉 Goal reached!</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Quick Actions */}
      <section>
        <QuickActions accounts={allAccounts} />
      </section>
    </div>
  );
}
