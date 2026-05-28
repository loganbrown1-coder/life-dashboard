import { db } from "@/db";
import { supplements, supplementLogs } from "@/db/schema";
import { eq, gte, and, desc } from "drizzle-orm";

export async function getActiveSupplements() {
  return db
    .select()
    .from(supplements)
    .where(eq(supplements.active, true))
    .orderBy(supplements.name);
}

export async function getAllSupplements() {
  return db.select().from(supplements).orderBy(supplements.name);
}

// Get logs for last N days — used for adherence chart
export async function getSupplementLogsLast30Days() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  return db
    .select()
    .from(supplementLogs)
    .where(gte(supplementLogs.takenAt, cutoff))
    .orderBy(desc(supplementLogs.takenAt));
}

// Has a supplement been logged today already?
export async function isTakenToday(supplementId: string): Promise<boolean> {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const row = await db
    .select()
    .from(supplementLogs)
    .where(
      and(
        eq(supplementLogs.supplementId, supplementId),
        gte(supplementLogs.takenAt, todayStart)
      )
    )
    .limit(1)
    .get();
  return !!row;
}

// Adherence % for the last 7 days: taken / (active supplements × 7)
export async function getWeeklyAdherence(): Promise<number> {
  const activeList = await getActiveSupplements();
  if (activeList.length === 0) return 0;

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 6);
  cutoff.setHours(0, 0, 0, 0);

  const logs = await db
    .select()
    .from(supplementLogs)
    .where(gte(supplementLogs.takenAt, cutoff));

  const possible = activeList.length * 7;
  return possible > 0 ? Math.round((logs.length / possible) * 100) : 0;
}
