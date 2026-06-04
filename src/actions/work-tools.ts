"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { workTodos, workHabits, workHabitLogs, workFocus } from "@/db/schema";
import { eq, and } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }
function today(){ return new Date().toISOString().slice(0, 10); }

// ── Work to-dos ───────────────────────────────────────────────────────────────

export async function addWorkTodo(text: string) {
  if (!text.trim()) return;
  await db.insert(workTodos).values({ id: uuid(), createdAt: now(), updatedAt: now(), text: text.trim(), done: false, completedAt: null });
  revalidatePath("/opspot");
}

export async function toggleWorkTodo(id: string, done: boolean) {
  await db.update(workTodos).set({ done: !done, completedAt: !done ? now() : null, updatedAt: now() }).where(eq(workTodos.id, id));
  revalidatePath("/opspot");
}

export async function deleteWorkTodo(id: string) {
  await db.delete(workTodos).where(eq(workTodos.id, id));
  revalidatePath("/opspot");
}

export async function clearDoneWorkTodos() {
  await db.delete(workTodos).where(eq(workTodos.done, true));
  revalidatePath("/opspot");
}

// ── Work habits ───────────────────────────────────────────────────────────────

export async function addWorkHabit(title: string) {
  if (!title.trim()) return;
  const existing = await db.select().from(workHabits).all();
  await db.insert(workHabits).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    title: title.trim(), sortOrder: existing.length, active: true,
  });
  revalidatePath("/opspot");
}

export async function toggleWorkHabit(habitId: string, currentlyDone: boolean) {
  const date = today();
  if (currentlyDone) {
    await db.delete(workHabitLogs).where(and(eq(workHabitLogs.habitId, habitId), eq(workHabitLogs.date, date)));
  } else {
    await db.insert(workHabitLogs).values({ id: uuid(), createdAt: now(), updatedAt: now(), habitId, date, done: true });
  }
  revalidatePath("/opspot");
}

export async function deleteWorkHabit(id: string) {
  await db.delete(workHabits).where(eq(workHabits.id, id));
  revalidatePath("/opspot");
}

// ── Focus for today ───────────────────────────────────────────────────────────

export async function setWorkFocus(text: string) {
  const date = today();
  const existing = await db.select().from(workFocus).where(eq(workFocus.date, date)).limit(1).get();
  if (existing) {
    await db.update(workFocus).set({ text: text.trim(), updatedAt: now() }).where(eq(workFocus.date, date));
  } else {
    await db.insert(workFocus).values({ id: uuid(), createdAt: now(), updatedAt: now(), date, text: text.trim() });
  }
  revalidatePath("/opspot");
}
