"use server";

import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { z } from "zod";

const schema = z.object({
  date:   z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  title:  z.string().min(1).max(100),
  type:   z.enum(["social", "appointment", "travel", "other"]),
  notes:  z.string().optional(),
  time:   z.string().optional(),
  colour: z.string().optional(),
  goalId: z.string().optional(),
});

export async function addCalendarEvent(data: z.infer<typeof schema>) {
  const parsed = schema.parse(data);
  const now    = new Date();
  await db.insert(calendarEvents).values({
    id:        randomUUID(),
    date:      parsed.date,
    title:     parsed.title,
    type:      parsed.type,
    notes:     parsed.notes ?? null,
    time:      parsed.time ?? null,
    colour:    parsed.colour ?? "#6366f1",
    goalId:    parsed.goalId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  revalidatePath("/calendar");
  revalidatePath("/goals");
}

export async function deleteCalendarEvent(id: string) {
  await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  revalidatePath("/calendar");
}
