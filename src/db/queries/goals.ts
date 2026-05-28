import { db } from "@/db";
import { goals, habits, habitLogs } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function getGoals() {
  return db.select().from(goals).orderBy(goals.status, goals.createdAt);
}

export async function getActiveGoals() {
  return db.select().from(goals).where(eq(goals.status, "active")).orderBy(goals.createdAt);
}

export async function getActiveHabits() {
  return db.select().from(habits).where(eq(habits.active, true)).orderBy(habits.createdAt);
}

export async function getHabitLogsForRange(start: string, end: string) {
  return db
    .select()
    .from(habitLogs)
    .where(and(gte(habitLogs.date, start), lte(habitLogs.date, end)));
}
