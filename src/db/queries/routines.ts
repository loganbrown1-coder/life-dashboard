import { db } from "@/db";
import { routines, routineItems, routineLogs } from "@/db/schema";
import { eq, and, inArray } from "drizzle-orm";

export async function getAllRoutines() {
  return db.select().from(routines).orderBy(routines.displayOrder);
}

export async function getRoutineWithItems(routineId: string) {
  const routine = await db.select().from(routines).where(eq(routines.id, routineId)).get();
  if (!routine) return null;
  const items = await db
    .select()
    .from(routineItems)
    .where(and(eq(routineItems.routineId, routineId), eq(routineItems.active, true)))
    .orderBy(routineItems.displayOrder);
  return { ...routine, items };
}

export async function getRoutinesWithItems() {
  const allRoutines = await db.select().from(routines).orderBy(routines.displayOrder);
  const allItems = await db
    .select()
    .from(routineItems)
    .where(eq(routineItems.active, true))
    .orderBy(routineItems.displayOrder);

  return allRoutines.map((r) => ({
    ...r,
    items: allItems.filter((i) => i.routineId === r.id),
  }));
}

export async function getRoutineLogsForDate(date: string) {
  // Get all routine item IDs first
  const allItems = await db.select({ id: routineItems.id }).from(routineItems);
  if (allItems.length === 0) return [];
  const ids = allItems.map((i) => i.id);
  return db
    .select()
    .from(routineLogs)
    .where(and(inArray(routineLogs.routineItemId, ids), eq(routineLogs.date, date)));
}
