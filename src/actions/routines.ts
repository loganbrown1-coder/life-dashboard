"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { routineLogs, supplementLogs, routineItems } from "@/db/schema";
import { eq, and, max, gte, lte } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function addRoutineItem(routineId: string, label: string) {
  const result = await db
    .select({ maxOrder: max(routineItems.displayOrder) })
    .from(routineItems)
    .where(eq(routineItems.routineId, routineId))
    .get();
  const nextOrder = (result?.maxOrder ?? 0) + 1;
  await db.insert(routineItems).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    routineId, label, displayOrder: nextOrder, active: true,
    linkedSupplementId: null, linkedHabitId: null,
  });
  revalidatePath("/");
}

export async function removeRoutineItem(itemId: string) {
  await db.delete(routineItems).where(eq(routineItems.id, itemId));
  revalidatePath("/");
}

export async function toggleRoutineItem(itemId: string, date: string, completed: boolean) {
  // Upsert: check if log exists
  const existing = await db
    .select()
    .from(routineLogs)
    .where(and(eq(routineLogs.routineItemId, itemId), eq(routineLogs.date, date)))
    .limit(1)
    .get();

  if (existing) {
    await db
      .update(routineLogs)
      .set({ completed, updatedAt: now() })
      .where(eq(routineLogs.id, existing.id));
  } else {
    await db.insert(routineLogs).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      routineItemId: itemId,
      date,
      completed,
    });
  }

  // If completing and the item has a linked supplement, log it
  if (completed) {
    const item = await db
      .select()
      .from(routineItems)
      .where(eq(routineItems.id, itemId))
      .limit(1)
      .get();

    if (item?.linkedSupplementId) {
      // Only check for a log on the specific date being toggled (not all-time)
      const dayStart = new Date(`${date}T00:00:00`);
      const dayEnd   = new Date(`${date}T23:59:59`);
      const alreadyLogged = await db
        .select()
        .from(supplementLogs)
        .where(
          and(
            eq(supplementLogs.supplementId, item.linkedSupplementId),
            gte(supplementLogs.takenAt, dayStart),
            lte(supplementLogs.takenAt, dayEnd),
          )
        )
        .limit(1)
        .get();
      if (!alreadyLogged) {
        await db.insert(supplementLogs).values({
          id: uuid(), createdAt: now(), updatedAt: now(),
          supplementId: item.linkedSupplementId,
          takenAt: new Date(`${date}T08:00:00`), // log as 8am on that date
        });
      }
    }
  }

  revalidatePath("/");
}
