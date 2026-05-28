import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthNav } from "@/components/health/health-nav";
import { WorkoutCalendar } from "@/components/health/workout-calendar";
import { WorkoutWeekPlan } from "@/components/health/workout-week-plan";
import { getWorkouts, getWorkoutStreak } from "@/db/queries/workouts";
import { getWorkoutSchedule, getWorkoutsForRange } from "@/db/queries/workout-schedule";
import { getUserOptions } from "@/db/queries/user-options";
import { WorkoutDeleteButton } from "@/components/health/workout-actions";
import { getExercisesForWorkout } from "@/db/queries/workouts";
import { workoutBadgeColor } from "@/lib/workout-colors";
import { format, startOfWeek, addDays } from "date-fns";

export default async function WorkoutsPage() {
  const today     = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // 7 dates for current week (Mon–Sun)
  const weekDates = Array.from({ length: 7 }, (_, i) =>
    format(addDays(new Date(weekStart + "T00:00:00"), i), "yyyy-MM-dd")
  );
  const weekEnd = weekDates[6];

  const [allWorkouts, recentWorkouts, streak, workoutTypeOptions, schedule, weekCompletions] =
    await Promise.all([
      getWorkouts(365),
      getWorkouts(30),
      getWorkoutStreak(),
      getUserOptions("workout_type"),
      getWorkoutSchedule(),
      getWorkoutsForRange(weekStart, weekEnd),
    ]);

  const completedThisWeek = weekCompletions.filter((w) => w.completed).length;

  // Fetch exercises for recent workouts
  const workoutsWithExercises = await Promise.all(
    recentWorkouts.map(async (w) => ({
      ...w,
      exercises: await getExercisesForWorkout(w.id),
    }))
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workouts</h1>
          <p className="text-gray-500 mt-1">Your weekly plan</p>
        </div>
      </div>

      <HealthNav />

      {/* Weekly plan — tick off each day */}
      <WorkoutWeekPlan
        schedule={schedule}
        weekDates={weekDates}
        completions={weekCompletions}
        workoutTypes={workoutTypeOptions}
      />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm text-center p-4">
          <div className="text-2xl font-bold text-gray-900">{completedThisWeek}/{schedule.length || "—"}</div>
          <div className="text-xs text-gray-500 mt-0.5">this week</div>
        </Card>
        <Card className="rounded-xl shadow-sm text-center p-4">
          <div className="text-2xl font-bold text-gray-900">{streak}</div>
          <div className="text-xs text-gray-500 mt-0.5">day streak</div>
        </Card>
        <Card className="rounded-xl shadow-sm text-center p-4">
          <div className="text-2xl font-bold text-gray-900">{recentWorkouts.length}</div>
          <div className="text-xs text-gray-500 mt-0.5">last 30 days</div>
        </Card>
      </div>

      {/* Monthly calendar */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Monthly overview</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutCalendar allWorkouts={allWorkouts} workoutTypes={workoutTypeOptions} />
        </CardContent>
      </Card>

      {/* History */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">History</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workoutsWithExercises.length === 0 ? (
            <p className="text-sm text-gray-400 p-6">
              No workouts yet — set up your weekly plan above and start ticking off sessions!
            </p>
          ) : (
            <div className="divide-y divide-gray-50">
              {workoutsWithExercises.map((w) => {
                const typeLabel = workoutTypeOptions.find((o) => o.value === w.type)?.label ?? w.type.replace(/_/g, " ");
                return (
                  <div key={w.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge className={`text-xs capitalize ${workoutBadgeColor(w.type)}`}>
                          {typeLabel}
                        </Badge>
                        {w.durationMinutes && (
                          <span className="text-sm text-gray-500">{w.durationMinutes} min</span>
                        )}
                        {w.distanceKm && (
                          <span className="text-sm text-gray-500">{w.distanceKm} km</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{w.date}</span>
                        <WorkoutDeleteButton id={w.id} />
                      </div>
                    </div>
                    {w.notes && <p className="text-sm text-gray-600 mt-1">{w.notes}</p>}
                    {w.exercises.length > 0 && (
                      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                        {w.exercises.map((ex) => (
                          <div key={ex.id} className="text-xs text-gray-500 bg-gray-50 rounded px-2 py-1">
                            <span className="font-medium text-gray-700">{ex.name}</span>
                            {ex.sets && ` · ${ex.sets}×${ex.reps ?? "?"}`}
                            {ex.weightKg && ` @ ${ex.weightKg}kg`}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
