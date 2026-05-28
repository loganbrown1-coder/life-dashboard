"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

// ── Projects ──────────────────────────────────────────────────────────────────

const ProjectSchema = z.object({
  title:       z.string().min(1),
  description: z.string().optional(),
  status:      z.enum(["active","paused","done"]).default("active"),
  deadline:    z.string().optional(),
  colour:      z.string().default("#0d9488"),
});

export async function addProject(data: z.infer<typeof ProjectSchema>) {
  const p = ProjectSchema.parse(data);
  await db.insert(projects).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    ...p,
    description: p.description ?? null,
    deadline: p.deadline ?? null,
  });
  revalidatePath("/projects");
}

export async function updateProject(id: string, data: z.infer<typeof ProjectSchema>) {
  const p = ProjectSchema.parse(data);
  await db.update(projects).set({ ...p, description: p.description ?? null, deadline: p.deadline ?? null, updatedAt: now() }).where(eq(projects.id, id));
  revalidatePath("/projects");
  revalidatePath(`/projects/${id}`);
}

export async function deleteProject(id: string) {
  await db.delete(projects).where(eq(projects.id, id));
  revalidatePath("/projects");
}

export async function setProjectStatus(id: string, status: "active" | "paused" | "done") {
  await db.update(projects).set({ status, updatedAt: now() }).where(eq(projects.id, id));
  revalidatePath("/projects");
}

// ── Tasks ─────────────────────────────────────────────────────────────────────

const TaskSchema = z.object({
  title:     z.string().min(1),
  notes:     z.string().optional(),
  status:    z.enum(["todo","doing","done"]).default("todo"),
  priority:  z.enum(["low","med","high"]).default("med"),
  dueDate:   z.string().optional(),
  projectId: z.string().optional(),
});

export async function addTask(data: z.infer<typeof TaskSchema>) {
  const p = TaskSchema.parse(data);
  await db.insert(tasks).values({
    id: uuid(), createdAt: now(), updatedAt: now(),
    ...p,
    notes: p.notes ?? null,
    dueDate: p.dueDate ?? null,
    projectId: p.projectId ?? null,
  });
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function updateTaskStatus(id: string, status: "todo" | "doing" | "done") {
  await db.update(tasks).set({ status, updatedAt: now() }).where(eq(tasks.id, id));
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function deleteTask(id: string) {
  await db.delete(tasks).where(eq(tasks.id, id));
  revalidatePath("/projects");
  revalidatePath("/");
  revalidatePath("/calendar");
}

export async function linkTaskToGoal(taskId: string, goalId: string | null) {
  await db
    .update(tasks)
    .set({ goalId, updatedAt: now() })
    .where(eq(tasks.id, taskId));
  revalidatePath("/goals");
  revalidatePath("/projects");
}
