"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { goalSteps } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function addGoalStep(goalId: string, title: string, dueDate?: string) {
  const existing = await db.select({ position: goalSteps.position })
    .from(goalSteps)
    .where(eq(goalSteps.goalId, goalId))
    .all();
  const maxPos = existing.length > 0 ? Math.max(...existing.map((r) => r.position)) : -1;

  await db.insert(goalSteps).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    goalId,
    title: title.trim(),
    done: false,
    dueDate: dueDate || null,
    position: maxPos + 1,
  });
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
}

export async function toggleGoalStep(stepId: string, goalId: string, currentDone: boolean) {
  await db.update(goalSteps)
    .set({ done: !currentDone, updatedAt: now() })
    .where(eq(goalSteps.id, stepId));
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
}

export async function deleteGoalStep(stepId: string, goalId: string) {
  await db.delete(goalSteps).where(eq(goalSteps.id, stepId));
  revalidatePath(`/goals/${goalId}`);
  revalidatePath("/goals");
}

export async function updateGoalStep(stepId: string, goalId: string, title: string, dueDate?: string) {
  await db.update(goalSteps)
    .set({ title: title.trim(), dueDate: dueDate || null, updatedAt: now() })
    .where(eq(goalSteps.id, stepId));
  revalidatePath(`/goals/${goalId}`);
}
