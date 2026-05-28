import { db } from "@/db";
import { weightLogs } from "@/db/schema";
import { desc, gte } from "drizzle-orm";

export async function getWeightLogs(limit = 90) {
  return db
    .select()
    .from(weightLogs)
    .orderBy(desc(weightLogs.date))
    .limit(limit);
}

export async function getAllWeightLogs() {
  return db.select().from(weightLogs).orderBy(weightLogs.date);
}

export async function getLatestWeight() {
  return db
    .select()
    .from(weightLogs)
    .orderBy(desc(weightLogs.date))
    .limit(1)
    .get();
}

// Returns the weight log closest to N days ago, or null
export async function getWeightNDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const cutoff = d.toISOString().split("T")[0];
  return db
    .select()
    .from(weightLogs)
    .where(gte(weightLogs.date, cutoff))
    .orderBy(weightLogs.date)
    .limit(1)
    .get();
}
