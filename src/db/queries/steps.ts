import { db } from "@/db";
import { stepsLogs } from "@/db/schema";
import { desc, gte, eq } from "drizzle-orm";

export async function getStepsLogs(limit = 30) {
  return db
    .select()
    .from(stepsLogs)
    .orderBy(desc(stepsLogs.date))
    .limit(limit);
}

export async function getTodaySteps(): Promise<number> {
  const today = new Date().toISOString().split("T")[0];
  const row = await db
    .select()
    .from(stepsLogs)
    .where(eq(stepsLogs.date, today))
    .limit(1)
    .get();
  return row?.stepCount ?? 0;
}

export async function getLast30DaysSteps() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 29);
  return db
    .select()
    .from(stepsLogs)
    .where(gte(stepsLogs.date, cutoff.toISOString().split("T")[0]))
    .orderBy(stepsLogs.date);
}
