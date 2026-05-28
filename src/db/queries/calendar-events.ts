import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { and, gte, lte, eq, isNotNull } from "drizzle-orm";

export async function getCalendarEventsForRange(start: string, end: string) {
  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.date, start), lte(calendarEvents.date, end)))
    .orderBy(calendarEvents.date, calendarEvents.time);
}

export async function getEventCountByGoal(): Promise<Record<string, number>> {
  const rows = await db
    .select({ goalId: calendarEvents.goalId })
    .from(calendarEvents)
    .where(isNotNull(calendarEvents.goalId));
  const counts: Record<string, number> = {};
  for (const r of rows) {
    if (r.goalId) counts[r.goalId] = (counts[r.goalId] ?? 0) + 1;
  }
  return counts;
}
