"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { tasks } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function addTask(data: {
  title: string;
  dueDate?: string;
  priority?: "low" | "med" | "high";
  notes?: string;
}) {
  await db.insert(tasks).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    title: data.title,
    dueDate: data.dueDate || null,
    priority: data.priority ?? "med",
    notes: data.notes || null,
    status: "todo",
  });
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function completeTask(id: string) {
  await db.update(tasks).set({ status: "done", updatedAt: now() }).where(eq(tasks.id, id));
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/goals");
  revalidatePath("/projects");
}
