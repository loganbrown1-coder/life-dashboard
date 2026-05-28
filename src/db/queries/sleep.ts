import { db } from "@/db";
import { sleepLogs } from "@/db/schema";
import { desc, gte } from "drizzle-orm";
import { format, subDays } from "date-fns";

export async function getSleepLogs(days = 30) {
  const since = format(subDays(new Date(), days), "yyyy-MM-dd");
  return db
    .select()
    .from(sleepLogs)
    .where(gte(sleepLogs.date, since))
    .orderBy(sleepLogs.date)
    .all();
}

export async function getLastNightSleep() {
  return db
    .select()
    .from(sleepLogs)
    .orderBy(desc(sleepLogs.date))
    .limit(1)
    .get() ?? null;
}

export async function getAverageSleep(days = 7) {
  const logs = await getSleepLogs(days);
  if (!logs.length) return null;
  const avg = logs.reduce((s, l) => s + l.durationMinutes, 0) / logs.length;
  return Math.round(avg); // minutes
}

export async function getSleepLogsForRange(start: string, end: string) {
  const { and, lte } = await import("drizzle-orm");
  return db
    .select()
    .from(sleepLogs)
    .where(and(gte(sleepLogs.date, start), lte(sleepLogs.date, end)))
    .orderBy(sleepLogs.date)
    .all();
}
