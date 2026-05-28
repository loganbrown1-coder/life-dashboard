import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { eq, isNull, ne, desc } from "drizzle-orm";

export async function getProjects() {
  return db.select().from(projects).orderBy(projects.status, projects.createdAt);
}

export async function getProjectsWithTasks() {
  const allProjects = await db.select().from(projects).orderBy(projects.status, projects.createdAt);
  const allTasks    = await db.select().from(tasks).orderBy(tasks.status, tasks.priority, tasks.dueDate);
  return allProjects.map((p) => ({
    ...p,
    tasks: allTasks.filter((t) => t.projectId === p.id),
  }));
}

export async function getProjectById(id: string) {
  return db.select().from(projects).where(eq(projects.id, id)).get();
}

export async function getProjectWithTasks(id: string) {
  const project = await getProjectById(id);
  if (!project) return null;
  const projectTasks = await db
    .select()
    .from(tasks)
    .where(eq(tasks.projectId, id))
    .orderBy(tasks.status, tasks.priority, tasks.dueDate);
  return { ...project, tasks: projectTasks };
}

export async function getStandaloneTasks() {
  return db
    .select()
    .from(tasks)
    .where(isNull(tasks.projectId))
    .orderBy(tasks.status, tasks.dueDate, tasks.priority);
}

export async function getAllActiveTasks() {
  return db
    .select()
    .from(tasks)
    .where(ne(tasks.status, "done"))
    .orderBy(tasks.dueDate, tasks.priority);
}
