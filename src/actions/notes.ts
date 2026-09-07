"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { eq } from "drizzle-orm";

function uuid() { return crypto.randomUUID(); }
function now()  { return new Date(); }

export async function createNote(title: string, section: string) {
  const id = uuid();
  await db.insert(notes).values({
    id, createdAt: now(), updatedAt: now(),
    title: title.trim() || "Untitled",
    section: section.trim() || "Personal",
    content: "",
    pinnedAt: null,
  });
  revalidatePath("/notes");
  return id;
}

export async function updateNote(id: string, fields: { title?: string; section?: string; content?: string }) {
  await db.update(notes).set({ ...fields, updatedAt: now() }).where(eq(notes.id, id));
  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  await db.delete(notes).where(eq(notes.id, id));
  revalidatePath("/notes");
}

export async function pinNote(id: string, pinned: boolean) {
  await db.update(notes).set({ pinnedAt: pinned ? now() : null, updatedAt: now() }).where(eq(notes.id, id));
  revalidatePath("/notes");
}
