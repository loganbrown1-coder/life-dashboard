"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goals, habits, habitLogs, savingsGoals } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

// ── Goals ─────────────────────────────────────────────────────────────────────

const GoalSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  category:    z.enum(["life","career","relationships","travel","learning","other"]),
  targetDate:  z.string().optional(),
  status:      z.enum(["active","done","paused","abandoned"]).default("active"),
  progressPct: z.coerce.number().int().min(0).max(100).default(0),
});

export async function addGoal(
  data: z.infer<typeof GoalSchema>,
  createLinkedSavings?: { name: string; targetAmountGbp: number }
) {
  const p = GoalSchema.parse(data);
  const goalId = uuid();
  let linkedSavingsGoalId: string | null = null;

  if (createLinkedSavings) {
    const savingsId = uuid();
    await db.insert(savingsGoals).values({
      id: savingsId, createdAt: now(), updatedAt: now(),
      name: createLinkedSavings.name,
      targetAmountGbp: createLinkedSavings.targetAmountGbp,
      currentAmountGbp: 0,
      linkedLifeGoalId: goalId,
    });
    linkedSavingsGoalId = savingsId;
  }

  await db.insert(goals).values({
    id: goalId, createdAt: now(), updatedAt: now(),
    ...p,
    targetDate: p.targetDate ?? null,
    description: p.description ?? null,
    linkedSavingsGoalId,
  });

  revalidatePath("/goals");
}

export async function updateGoalProgress(id: string, progressPct: number) {
  await db.update(goals).set({ progressPct, updatedAt: now() }).where(eq(goals.id, id));
  revalidatePath("/goals");
}

export async function updateGoal(id: string, data: z.infer<typeof GoalSchema>) {
  const p = GoalSchema.parse(data);
  await db.update(goals).set({ ...p, targetDate: p.targetDate ?? null, description: p.description ?? null, updatedAt: now() }).where(eq(goals.id, id));
  revalidatePath("/goals");
}

export async function deleteGoal(id: string) {
  await db.delete(goals).where(eq(goals.id, id));
  revalidatePath("/goals");
}

// ── Habits ────────────────────────────────────────────────────────────────────

export async function addHabit(data: { title: string; description?: string; frequency: "daily" | "nx_per_week"; targetPerWeek?: number }) {
  await db.insert(habits).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    title: data.title,
    description: data.description ?? null,
    frequency: data.frequency,
    targetPerWeek: data.targetPerWeek ?? null,
    active: true,
  });
  revalidatePath("/goals");
}

export async function toggleHabitLog(habitId: string, date: string) {
  const existing = await db
    .select()
    .from(habitLogs)
    .where(and(eq(habitLogs.habitId, habitId), eq(habitLogs.date, date)))
    .limit(1)
    .get();

  if (existing) {
    await db.update(habitLogs)
      .set({ completed: !existing.completed, updatedAt: now() })
      .where(eq(habitLogs.id, existing.id));
  } else {
    await db.insert(habitLogs).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      habitId, date, completed: true,
    });
  }
  revalidatePath("/goals");
}

export async function deleteHabit(id: string) {
  await db.update(habits).set({ active: false, updatedAt: now() }).where(eq(habits.id, id));
  revalidatePath("/goals");
}
