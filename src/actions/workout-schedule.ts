"use server";

import { db } from "@/db";
import { workoutSchedule, workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

type Slot = "morning" | "afternoon";

/** Save a full weekly schedule — replaces all existing entries */
export async function saveWorkoutSchedule(
  entries: { dayOfWeek: number; workoutType: string; slot: Slot }[]
) {
  const now = new Date();
  await db.delete(workoutSchedule);
  for (const entry of entries) {
    if (!entry.workoutType || entry.workoutType === "rest") continue;
    await db.insert(workoutSchedule).values({
      id: randomUUID(),
      dayOfWeek: entry.dayOfWeek,
      workoutType: entry.workoutType,
      slot: entry.slot,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  revalidatePath("/health/workouts");
  revalidatePath("/calendar");
  revalidatePath("/");
}

/** Toggle a specific workout type on a date as done/undone. */
export async function toggleWorkoutDay(date: string, workoutType: string) {
  const existing = await db
    .select()
    .from(workouts)
    .where(
      and(
        eq(workouts.date, date),
        eq(workouts.type, workoutType),
        eq(workouts.completed, true)
      )
    )
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    await db.delete(workouts).where(eq(workouts.id, existing[0].id));
  } else {
    await db.insert(workouts).values({
      id: randomUUID(),
      date,
      type: workoutType,
      completed: true,
      planned: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  revalidatePath("/health/workouts");
  revalidatePath("/health");
  revalidatePath("/calendar");
  revalidatePath("/");
}
