import { db } from "@/db";
import { sideHustles, hustleRevenue, hustleTimeLogs } from "@/db/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

export async function getHustles() {
  return db.select().from(sideHustles).where(eq(sideHustles.active, true)).orderBy(sideHustles.createdAt);
}

export async function getHustleById(id: string) {
  return db.select().from(sideHustles).where(eq(sideHustles.id, id)).get();
}

export async function getRevenueForHustle(hustleId: string, from?: string, to?: string) {
  const conditions = [eq(hustleRevenue.hustleId, hustleId)];
  if (from) conditions.push(gte(hustleRevenue.date, from));
  if (to)   conditions.push(lte(hustleRevenue.date, to));
  return db.select().from(hustleRevenue).where(and(...conditions)).orderBy(desc(hustleRevenue.date));
}

export async function getTimeLogsForHustle(hustleId: string, from?: string, to?: string) {
  const conditions = [eq(hustleTimeLogs.hustleId, hustleId)];
  if (from) conditions.push(gte(hustleTimeLogs.date, from));
  if (to)   conditions.push(lte(hustleTimeLogs.date, to));
  return db.select().from(hustleTimeLogs).where(and(...conditions)).orderBy(desc(hustleTimeLogs.date));
}

export async function getRevenueInRange(from: string, to: string) {
  return db
    .select()
    .from(hustleRevenue)
    .where(and(gte(hustleRevenue.date, from), lte(hustleRevenue.date, to)));
}

export async function getTimeLogsInRange(from: string, to: string) {
  return db
    .select()
    .from(hustleTimeLogs)
    .where(and(gte(hustleTimeLogs.date, from), lte(hustleTimeLogs.date, to)));
}
