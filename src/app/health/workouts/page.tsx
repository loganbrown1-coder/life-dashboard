import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { HealthNav } from "@/components/health/health-nav";
import { LogWorkoutDialog } from "@/components/health/log-workout-dialog";
import { WorkoutCalendar } from "@/components/health/workout-calendar";
import { getWorkouts, getWorkoutStreak, getWorkoutsThisWeek, getExercisesForWorkout } from "@/db/queries/workouts";
import { getUserOptions } from "@/db/queries/user-options";
import { WorkoutDeleteButton } from "@/components/health/workout-actions";
import { format, startOfWeek, endOfWeek } from "date-fns";

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

export default async function WorkoutsPage() {
  const today = new Date();
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekEnd   = format(endOfWeek(today,   { weekStartsOn: 1 }), "yyyy-MM-dd");

  // Load all workouts for the calendar (client-side filters by month)
  const [allWorkouts, recentWorkouts, weekWorkouts, streak, workoutTypeOptions] = await Promise.all([
    getWorkouts(365),
    getWorkouts(30),
    getWorkoutsThisWeek(weekStart, weekEnd),
    getWorkoutStreak(),
    getUserOptions("workout_type"),
  ]);

  const completedThisWeek = weekWorkouts.filter((w) => w.completed).length;
  const weeklyTarget = 6;

  // Fetch exercises for the recent workouts
  const workoutsWithExercises = await Promise.all(
    recentWorkouts.map(async (w) => {
      const exercises = await getExercisesForWorkout(w.id);
      return { ...w, exercises };
    })
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Workouts</h1>
          <p className="text-gray-500 mt-1">Track your training</p>
        </div>
        <LogWorkoutDialog workoutTypes={workoutTypeOptions} />
      </div>

      <HealthNav />

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="rounded-xl shadow-sm text-center p-4">
          <div className="text-2xl font-bold text-gray-900">{completedThisWeek}/{weeklyTarget}</div>
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

      {/* Calendar */}
      <Card className="rounded-xl shadow-sm mb-6">
        <CardHeader>
          <CardTitle className="text-base">Monthly Overview</CardTitle>
        </CardHeader>
        <CardContent>
          <WorkoutCalendar allWorkouts={allWorkouts} />
        </CardContent>
      </Card>

      {/* Recent workouts list */}
      <Card className="rounded-xl shadow-sm">
        <CardHeader>
          <CardTitle className="text-base">Recent Workouts (last 30)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {workoutsWithExercises.length === 0 ? (
            <p className="text-sm text-gray-400 p-6">No workouts yet. Hit "Log workout" to get started!</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {workoutsWithExercises.map((w) => (
                <div key={w.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-xs capitalize ${WORKOUT_COLOURS[w.type] ?? ""}`}>
                        {w.type.replace(/_/g, " ")}
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
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
