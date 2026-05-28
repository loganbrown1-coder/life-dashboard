"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { userOptions } from "@/db/schema";
import { eq, and, max } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now() { return new Date(); }

export async function addUserOption(type: string, value: string, label: string) {
  // Find highest order_index for this type
  const [{ maxOrder }] = await db
    .select({ maxOrder: max(userOptions.orderIndex) })
    .from(userOptions)
    .where(eq(userOptions.type, type));

  await db.insert(userOptions).values({
    id: uuid(),
    type,
    value: value.trim(),
    label: label.trim(),
    orderIndex: (maxOrder ?? -1) + 1,
    createdAt: now(),
    updatedAt: now(),
  });
  revalidatePath("/settings");
}

export async function deleteUserOption(id: string) {
  await db.delete(userOptions).where(eq(userOptions.id, id));
  revalidatePath("/settings");
}

export async function renameUserOption(id: string, label: string) {
  await db.update(userOptions).set({ label: label.trim(), updatedAt: now() }).where(eq(userOptions.id, id));
  revalidatePath("/settings");
}
