"use server";

import { db } from "@/db";
import { workoutSchedule, workouts } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const DAY_NAMES = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Save a full weekly schedule — replaces all existing entries */
export async function saveWorkoutSchedule(
  entries: { dayOfWeek: number; workoutType: string }[]
) {
  const now = new Date();
  // Delete all existing schedule entries
  await db.delete(workoutSchedule);
  // Insert the new ones (skip "rest" / empty days)
  for (const entry of entries) {
    if (!entry.workoutType || entry.workoutType === "rest") continue;
    await db.insert(workoutSchedule).values({
      id: randomUUID(),
      dayOfWeek: entry.dayOfWeek,
      workoutType: entry.workoutType,
      active: true,
      createdAt: now,
      updatedAt: now,
    });
  }
  revalidatePath("/health/workouts");
  revalidatePath("/calendar");
}

/** Toggle a day's workout as done/undone. */
export async function toggleWorkoutDay(date: string, workoutType: string) {
  // Check if a completed workout already exists for this date
  const existing = await db
    .select()
    .from(workouts)
    .where(and(eq(workouts.date, date), eq(workouts.completed, true)))
    .limit(1);

  const now = new Date();

  if (existing.length > 0) {
    // Already marked done — delete it (toggle off)
    await db.delete(workouts).where(eq(workouts.id, existing[0].id));
  } else {
    // Mark as done
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
