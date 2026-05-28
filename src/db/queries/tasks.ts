import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq, and, lte, ne, gte } from "drizzle-orm";

export async function getTasksDueToday(today: string) {
  return db
    .select()
    .from(tasks)
    .where(and(eq(tasks.dueDate, today), ne(tasks.status, "done")))
    .orderBy(tasks.priority);
}

export async function getTasksDueInRange(start: string, end: string) {
  return db
    .select()
    .from(tasks)
    .where(and(gte(tasks.dueDate, start), lte(tasks.dueDate, end), ne(tasks.status, "done")));
}

export async function getTasksForGoal(goalId: string) {
  return db
    .select()
    .from(tasks)
    .where(eq(tasks.goalId, goalId))
    .orderBy(tasks.status, tasks.priority);
}

export async function getAllTasksWithGoalId() {
  return db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "done"));
}

export async function getTasksCompletedInRange(start: string, end: string) {
  return db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.status, "done"),
        gte(tasks.updatedAt, new Date(start + "T00:00:00")),
        lte(tasks.updatedAt, new Date(end + "T23:59:59")),
      )
    );
}
