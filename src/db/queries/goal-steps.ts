import { db } from "@/db";
import { goalSteps, goals, savingsGoals } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function getGoalById(id: string) {
  return db.select().from(goals).where(eq(goals.id, id)).get();
}

export async function getGoalWithSavings(id: string) {
  const goal = await db.select().from(goals).where(eq(goals.id, id)).get();
  if (!goal) return null;
  let savings = null;
  if (goal.linkedSavingsGoalId) {
    savings = await db.select().from(savingsGoals).where(eq(savingsGoals.id, goal.linkedSavingsGoalId)).get();
  }
  return { goal, savings };
}

export async function getGoalSteps(goalId: string) {
  return db
    .select()
    .from(goalSteps)
    .where(eq(goalSteps.goalId, goalId))
    .orderBy(goalSteps.position, goalSteps.createdAt);
}

export async function getStepCountsByGoal(goalIds: string[]): Promise<Record<string, { total: number; done: number }>> {
  if (goalIds.length === 0) return {};
  const rows = await db
    .select()
    .from(goalSteps)
    .where(inArray(goalSteps.goalId, goalIds));
  const result: Record<string, { total: number; done: number }> = {};
  for (const r of rows) {
    if (!result[r.goalId]) result[r.goalId] = { total: 0, done: 0 };
    result[r.goalId].total++;
    if (r.done) result[r.goalId].done++;
  }
  return result;
}
