import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { and, gte, lte, eq } from "drizzle-orm";

export async function getCalendarEventsForRange(start: string, end: string) {
  return db
    .select()
    .from(calendarEvents)
    .where(and(gte(calendarEvents.date, start), lte(calendarEvents.date, end)))
    .orderBy(calendarEvents.date, calendarEvents.time);
}
