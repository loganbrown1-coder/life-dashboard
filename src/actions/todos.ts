"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export type TodoCategory = "opspot" | "personal" | "nice-cubes" | "other";
export type TodoBucket   = "today" | "general";

export async function addTodo(text: string, category: TodoCategory = "personal", bucket: TodoBucket = "general") {
  if (!text.trim()) return;
  await db.insert(todos).values({
    id: uuid(),
    createdAt: now(),
    updatedAt: now(),
    text: text.trim(),
    category,
    bucket,
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

export async function updateTodo(id: string, text: string, category: TodoCategory, bucket: TodoBucket) {
  if (!text.trim()) return;
  await db.update(todos).set({ text: text.trim(), category, bucket, updatedAt: now() }).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function deleteTodo(id: string) {
  await db.delete(todos).where(eq(todos.id, id));
  revalidatePath("/todo");
}

export async function clearCompleted(category?: TodoCategory, bucket?: TodoBucket) {
  const clauses: ReturnType<typeof eq>[] = [eq(todos.done, true)];
  if (category) clauses.push(eq(todos.category, category));
  if (bucket)   clauses.push(eq(todos.bucket, bucket));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const condition = clauses.length === 1 ? clauses[0] : and(...(clauses as any));
  const completed = await db.select().from(todos).where(condition).all();
  for (const t of completed) {
    await db.delete(todos).where(eq(todos.id, t.id));
  }
  revalidatePath("/todo");
}
