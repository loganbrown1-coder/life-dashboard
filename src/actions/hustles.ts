"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { sideHustles, hustleRevenue, hustleTimeLogs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

// ── Hustles ───────────────────────────────────────────────────────────────────

const HustleSchema = z.object({
  name:        z.string().min(1),
  description: z.string().optional(),
  colour:      z.string().default("#0d9488"),
});

export async function addHustle(data: z.infer<typeof HustleSchema>) {
  const p = HustleSchema.parse(data);
  await db.insert(sideHustles).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    ...p,
    description: p.description ?? null,
    active: true,
  });
  revalidatePath("/hustles");
}

export async function updateHustle(id: string, data: z.infer<typeof HustleSchema>) {
  const p = HustleSchema.parse(data);
  await db.update(sideHustles).set({ ...p, description: p.description ?? null, updatedAt: now() }).where(eq(sideHustles.id, id));
  revalidatePath("/hustles");
  revalidatePath(`/hustles/${id}`);
}

export async function deleteHustle(id: string) {
  await db.update(sideHustles).set({ active: false, updatedAt: now() }).where(eq(sideHustles.id, id));
  revalidatePath("/hustles");
}

// ── Revenue ───────────────────────────────────────────────────────────────────

export async function logRevenue(data: {
  hustleId: string;
  date: string;
  amount: number;
  currency: string;
  source?: string;
  notes?: string;
}) {
  await db.insert(hustleRevenue).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    hustleId: data.hustleId,
    date: data.date,
    amount: data.amount,
    currency: data.currency,
    source: data.source ?? null,
    notes: data.notes ?? null,
  });
  revalidatePath("/hustles");
  revalidatePath(`/hustles/${data.hustleId}`);
}

export async function deleteRevenue(id: string, hustleId: string) {
  await db.delete(hustleRevenue).where(eq(hustleRevenue.id, id));
  revalidatePath("/hustles");
  revalidatePath(`/hustles/${hustleId}`);
}

// ── Time logs ─────────────────────────────────────────────────────────────────

export async function logTime(data: {
  hustleId: string;
  date: string;
  minutes: number;
  description?: string;
}) {
  await db.insert(hustleTimeLogs).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    hustleId: data.hustleId,
    date: data.date,
    minutes: data.minutes,
    description: data.description ?? null,
  });
  revalidatePath("/hustles");
  revalidatePath(`/hustles/${data.hustleId}`);
}

export async function deleteTimeLog(id: string, hustleId: string) {
  await db.delete(hustleTimeLogs).where(eq(hustleTimeLogs.id, id));
  revalidatePath("/hustles");
  revalidatePath(`/hustles/${hustleId}`);
}
