import { db } from "@/db";
import { userOptions } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export type UserOption = { id: string; value: string; label: string; orderIndex: number };

export async function getUserOptions(type: string): Promise<UserOption[]> {
  return db
    .select({ id: userOptions.id, value: userOptions.value, label: userOptions.label, orderIndex: userOptions.orderIndex })
    .from(userOptions)
    .where(eq(userOptions.type, type))
    .orderBy(asc(userOptions.orderIndex));
}
