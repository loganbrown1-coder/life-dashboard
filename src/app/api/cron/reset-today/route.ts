import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { todos } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await db
    .update(todos)
    .set({ bucket: "general", updatedAt: new Date() })
    .where(eq(todos.bucket, "today"));

  return NextResponse.json({ ok: true, moved: result.rowsAffected ?? 0 });
}
