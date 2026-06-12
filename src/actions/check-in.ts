"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { checkInLogs, potCheckins } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { format, startOfWeek } from "date-fns";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function upsertCheckIn(
  date: string,
  fields: {
    stepsLogged?:  boolean;
    sleepLogged?:  boolean;
    weightLogged?: boolean;
    potLogged?:    boolean;
    dismissed?:    boolean;
  }
) {
  const existing = await db
    .select()
    .from(checkInLogs)
    .where(eq(checkInLogs.date, date))
    .limit(1)
    .then((r) => r[0] ?? null);

  if (existing) {
    await db
      .update(checkInLogs)
      .set({ ...fields, updatedAt: now() })
      .where(eq(checkInLogs.id, existing.id));
  } else {
    await db.insert(checkInLogs).values({
      id: uuid(),
      createdAt: now(),
      updatedAt: now(),
      date,
      stepsLogged:  fields.stepsLogged  ?? false,
      sleepLogged:  fields.sleepLogged  ?? false,
      weightLogged: fields.weightLogged ?? false,
      potLogged:    fields.potLogged    ?? false,
      dismissed:    fields.dismissed    ?? false,
    });
  }

  revalidatePath("/");
}

export async function logPotRemaining(remainingGbp: number, date?: string) {
  const logDate   = date ?? format(new Date(), "yyyy-MM-dd");
  const weekStart = format(
    startOfWeek(new Date(logDate + "T12:00:00"), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const existing = await db
    .select().from(potCheckins).where(eq(potCheckins.date, logDate)).limit(1).get();

  if (existing) {
    await db.update(potCheckins)
      .set({ remainingGbp, weekStart, updatedAt: now() })
      .where(eq(potCheckins.id, existing.id));
  } else {
    await db.insert(potCheckins).values({
      id: uuid(), createdAt: now(), updatedAt: now(),
      date: logDate, weekStart, remainingGbp,
    });
  }

  revalidatePath("/");
  revalidatePath("/finances");
}

export async function getPotCheckinsForWeeks(since: string) {
  return db.select().from(potCheckins).where(gte(potCheckins.date, since)).all();
}
