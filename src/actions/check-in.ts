"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { checkInLogs } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function upsertCheckIn(
  date: string,
  fields: {
    stepsLogged?: boolean;
    sleepLogged?: boolean;
    spendLogged?: boolean;
    dismissed?: boolean;
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
      stepsLogged: fields.stepsLogged ?? false,
      sleepLogged: fields.sleepLogged ?? false,
      spendLogged: fields.spendLogged ?? false,
      dismissed: fields.dismissed ?? false,
    });
  }

  revalidatePath("/");
}
