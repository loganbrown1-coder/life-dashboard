import { db } from "@/db";
import { notes } from "@/db/schema";
import { desc } from "drizzle-orm";
import { NotesClient } from "@/components/notes/notes-client";

export default async function NotesPage() {
  const allNotes = await db.select().from(notes).orderBy(desc(notes.updatedAt)).all();

  return (
    <NotesClient notes={allNotes.map((n) => ({
      id:        n.id,
      title:     n.title,
      section:   n.section,
      content:   n.content,
      pinnedAt:  n.pinnedAt ?? null,
      createdAt: n.createdAt,
      updatedAt: n.updatedAt,
    }))} />
  );
}
