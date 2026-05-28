import { db } from "@/db";
import { workoutSchedule, workouts } from "@/db/schema";
import { eq, and, gte, lte } from "drizzle-orm";

export async function getWorkoutSchedule() {
  return db
    .select()
    .from(workoutSchedule)
    .where(eq(workoutSchedule.active, true))
    .orderBy(workoutSchedule.dayOfWeek);
}

export async function getWorkoutsForRange(start: string, end: string) {
  return db
    .select()
    .from(workouts)
    .where(and(gte(workouts.date, start), lte(workouts.date, end)))
    .orderBy(workouts.date);
}
