"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export type TodoCategory = "opspot" | "personal" | "nice-cubes" | "other";

export async function addTodo(text: string, category: TodoCategory = "personal") {
  if (!text.trim()) return;
  await db.insert(todos).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    text: text.trim(),
    category,
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

export async function updateTodo(id: string, text: string, category: TodoCategory) {
  if (!text.trim()) return;
  await db.update(todos).set({ text: text.trim(), category, updatedAt: now() }).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function deleteTodo(id: string) {
  await db.delete(todos).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function clearCompleted(category?: TodoCategory) {
  const conditions = category
    ? and(eq(todos.done, true), eq(todos.category, category))
    : eq(todos.done, true);
  const completed = await db.select().from(todos).where(conditions).all();
  for (const t of completed) {
    await db.delete(todos).where(eq(todos.id, t.id));
  }
  revalidatePath("/todo");
}
