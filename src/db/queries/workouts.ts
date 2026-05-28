import { db } from "@/db";
import { workouts, workoutExercises } from "@/db/schema";
import { desc, eq, gte, lte, and } from "drizzle-orm";

export type WorkoutType = typeof workouts.$inferSelect["type"];

export async function getWorkouts(limit = 30) {
  return db
    .select()
    .from(workouts)
    .orderBy(desc(workouts.date))
    .limit(limit);
}

export async function getWorkoutsForMonth(year: number, month: number) {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end = `${year}-${String(month).padStart(2, "0")}-31`;
  return db
    .select()
    .from(workouts)
    .where(and(gte(workouts.date, start), lte(workouts.date, end)))
    .orderBy(workouts.date);
}

export async function getWorkoutsThisWeek(weekStart: string, weekEnd: string) {
  return db
    .select()
    .from(workouts)
    .where(and(gte(workouts.date, weekStart), lte(workouts.date, weekEnd)));
}

export async function getWorkoutWithExercises(id: string) {
  const workout = await db.select().from(workouts).where(eq(workouts.id, id)).get();
  if (!workout) return null;
  const exercises = await db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, id))
    .orderBy(workoutExercises.orderIndex);
  return { ...workout, exercises };
}

export async function getExercisesForWorkout(workoutId: string) {
  return db
    .select()
    .from(workoutExercises)
    .where(eq(workoutExercises.workoutId, workoutId))
    .orderBy(workoutExercises.orderIndex);
}

// Returns streak: consecutive days with at least one completed workout, counting back from today
export async function getWorkoutStreak(): Promise<number> {
  const rows = await db
    .select({ date: workouts.date })
    .from(workouts)
    .where(eq(workouts.completed, true))
    .orderBy(desc(workouts.date));

  const dates = [...new Set(rows.map((r) => r.date))];
  if (dates.length === 0) return 0;

  let streak = 0;
  const today = new Date();

  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(today.getDate() - i);
    const expectedStr = expected.toISOString().split("T")[0];
    if (dates[i] === expectedStr) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}
