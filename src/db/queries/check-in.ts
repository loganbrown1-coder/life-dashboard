import { db } from "@/db";
import { checkInLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getCheckInForDate(date: string) {
  return db
    .select()
    .from(checkInLogs)
    .where(eq(checkInLogs.date, date))
    .limit(1)
    .then((r) => r[0] ?? null);
}
