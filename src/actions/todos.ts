"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function addTodo(text: string) {
  if (!text.trim()) return;
  await db.insert(todos).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    text: text.trim(),
    done: false,
    completedAt: null,
  });
  revalidatePath("/todo");
}

export async function toggleTodo(id: string, currentDone: boolean) {
  await db.update(todos).set({
    done: !currentDone,
    completedAt: !currentDone ? now() : null,
    updatedAt: now(),
  }).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function deleteTodo(id: string) {
  await db.delete(todos).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function clearCompleted() {
  const completed = await db.select().from(todos).where(eq(todos.done, true)).all();
  for (const t of completed) {
    await db.delete(todos).where(eq(todos.id, t.id));
  }
  revalidatePath("/todo");
}
